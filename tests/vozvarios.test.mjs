// Várias coisas numa fala só: "mercado 50, farmácia 30 e uber 20".
import test from "node:test";
import assert from "node:assert/strict";
import { entendeVarios, entendeFala, MAX_ITENS_FALA } from "../js/voz.js";

const HOJE = "2026-11-04";
const resumo = (f) => entendeVarios(f, HOJE)?.itens.map((x) => [x.descricao, x.valor]);

test("vários itens: valor depois ou antes da descrição, separados por vírgula ou 'e'", () => {
  assert.deepEqual(resumo("mercado 50, farmácia 30 e uber 20"), [["Mercado", 50], ["Farmácia", 30], ["Uber", 20]]);
  assert.deepEqual(resumo("gastei 50 no mercado e 30 na farmácia"), [["Mercado", 50], ["Farmácia", 30]]);
  assert.deepEqual(resumo("mercado cinquenta, padaria dez e gasolina cem"), [["Mercado", 50], ["Padaria", 10], ["Gasolina", 100]]);
  assert.deepEqual(resumo("mercado 50 depois farmácia 30"), [["Mercado", 50], ["Farmácia", 30]]);
});

test("vários itens: milhar e centavos não quebram o valor", () => {
  assert.deepEqual(resumo("mercado 1.250,50 e farmácia 30"), [["Mercado", 1250.5], ["Farmácia", 30]]);
  assert.equal(entendeVarios("gastei 32 reais e 50 centavos no mercado", HOJE), null);   // é um item só
});

test("vários itens: data e forma ditas no fim (ou no começo) valem para todos", () => {
  const a = entendeVarios("gastei 50 no mercado e 30 na farmácia ontem no débito", HOJE).itens;
  assert.deepEqual(a.map((x) => [x.forma, x.data]), [["Débito", "2026-11-03"], ["Débito", "2026-11-03"]]);
  const b = entendeVarios("hoje gastei vinte de uber e quinze de almoço no débito", HOJE).itens;
  assert.deepEqual(b.map((x) => [x.descricao, x.forma, x.data]), [["Uber", "Débito", HOJE], ["Almoço", "Débito", HOJE]]);
  // cada item mantém a sua forma quando disse a própria
  const c = entendeVarios("mercado 50 no pix e farmácia 30 no débito", HOJE).itens;
  assert.deepEqual(c.map((x) => x.forma), ["Pix", "Débito"]);
});

test("vários itens: entrada e gasto na mesma fala", () => {
  const r = entendeVarios("recebi 100 e gastei 50", HOJE).itens;
  assert.deepEqual(r.map((x) => [x.tipo, x.valor]), [["Receita", 100], ["Despesa", 50]]);
});

test("vários itens: volta null quando não dá para ter certeza (um item só, pedaço sem valor, parcelas, guardar)", () => {
  assert.equal(entendeVarios("gastei 50 no mercado", HOJE), null);
  assert.equal(entendeVarios("mercado e farmácia 80", HOJE), null);               // um pedaço sem valor: solto demais
  assert.equal(entendeVarios("tv em 3 vezes 900 e mercado 50", HOJE), null);        // parcelas: caminho de um item só
  assert.equal(entendeVarios("guardei 100 e gastei 50", HOJE), null);
  assert.equal(entendeVarios("", HOJE), null);
});

test("vários itens: no máximo " + MAX_ITENS_FALA + " de uma vez", () => {
  const fala = Array.from({ length: 12 }, (_, i) => `item${i} ${i + 1}`).join(", ");
  assert.equal(entendeVarios(fala, HOJE).itens.length, MAX_ITENS_FALA);
});

test("vários itens: sem vírgula nem 'e' (como o reconhecimento de fala entrega), corta junto de cada valor", () => {
  assert.deepEqual(resumo("mercado 50 farmácia 30"), [["Mercado", 50], ["Farmácia", 30]]);
  assert.deepEqual(resumo("luz cento e oitenta água sessenta e cinco internet noventa e nove"), [["Luz", 180], ["Água", 65], ["Internet", 99]]);
  assert.deepEqual(resumo("gastei 50 no mercado 30 na farmácia"), [["Mercado", 50], ["Farmácia", 30]]);   // começa pelo valor: o valor abre o item
  const f = entendeVarios("mercado 50 farmácia 30 ontem no débito", HOJE).itens;
  assert.deepEqual(f.map((x) => [x.forma, x.data]), [["Débito", "2026-11-03"], ["Débito", "2026-11-03"]]);
  assert.deepEqual(resumo("mercado 1.250,50 farmácia 30"), [["Mercado", 1250.5], ["Farmácia", 30]]);
});

test("vários itens: números por extenso junto da vírgula e frases com data não são cortados errado", () => {
  assert.deepEqual(resumo("mercado cento e vinte, farmácia trinta e cinco"), [["Mercado", 120], ["Farmácia", 35]]);
  assert.deepEqual(resumo("paguei 1200 de aluguel e 300 de condomínio no dia 5").map((x) => x[1]), [1200, 300]);
  assert.equal(entendeVarios("gastei 32 reais e 50 centavos no mercado", HOJE), null);
});

test("contas em meses diferentes: cada uma vai para o mês que foi dito", () => {
  const datas = (f) => entendeVarios(f, HOJE).itens.map((x) => [x.descricao, x.valor, x.data]);
  assert.deepEqual(datas("luz 180 em dezembro, internet 99 em janeiro"), [["Luz", 180, "2026-12-04"], ["Internet", 99, "2027-01-04"]]);
  assert.deepEqual(datas("luz 180 dia 10 de dezembro e internet 99 dia 15 de janeiro"), [["Luz", 180, "2026-12-10"], ["Internet", 99, "2027-01-15"]]);
  assert.deepEqual(datas("luz 180 dezembro internet 99 janeiro"), [["Luz", 180, "2026-12-04"], ["Internet", 99, "2027-01-04"]]);   // sem separador: o mês fica com o item que vem antes
  assert.deepEqual(datas("condomínio 360 para março e água 70 para abril"), [["Condomínio", 360, "2027-03-04"], ["Água", 70, "2027-04-04"]]);
});

test("mês dito num item só: futuro sem verbo no passado, o mais recente com 'paguei'; Marco não é março", () => {
  const um = (f) => { const r = entendeFala(f, HOJE); return [r.descricao, r.valor, r.data]; };
  assert.deepEqual(um("luz 180 em dezembro"), ["Luz", 180, "2026-12-04"]);
  assert.deepEqual(um("paguei 100 de luz em outubro"), ["Luz", 100, "2026-10-04"]);
  assert.deepEqual(um("luz 180 no mês que vem"), ["Luz", 180, "2026-12-04"]);
  assert.deepEqual(um("aluguel 1200 dia 5 de dezembro"), ["Aluguel", 1200, "2026-12-05"]);
  assert.deepEqual(um("paguei 50 pro marco"), ["Marco", 50, undefined]);
});
