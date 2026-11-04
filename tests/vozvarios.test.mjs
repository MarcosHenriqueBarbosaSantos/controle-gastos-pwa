// Várias coisas numa fala só: "mercado 50, farmácia 30 e uber 20".
import test from "node:test";
import assert from "node:assert/strict";
import { entendeVarios, MAX_ITENS_FALA } from "../js/voz.js";

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
