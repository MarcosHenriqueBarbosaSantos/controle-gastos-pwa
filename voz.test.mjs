// Lançar por voz: o que a frase falada vira (js/voz.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { entendeFala, extensoParaNumero } from "../js/voz.js";

const H = "2026-10-08";
const ok = (fala, esperado) => { const r = entendeFala(fala, H); for (const [k, v] of Object.entries(esperado)) assert.deepEqual(r[k], v, `${fala} → ${k}`); return r; };

test("números por extenso viram algarismos, sem estragar 'um tênis'", () => {
  assert.equal(extensoParaNumero("trinta e dois reais"), "32 reais");
  assert.equal(extensoParaNumero("dois mil e quinhentos"), "2500");
  assert.equal(extensoParaNumero("mil e duzentos no aluguel"), "1200 no aluguel");
  assert.equal(extensoParaNumero("comprei um tênis de cento e vinte"), "comprei um tênis de 120");
  assert.equal(extensoParaNumero("vinte e um reais"), "21 reais");
  assert.equal(extensoParaNumero("trinta e dois reais e cinquenta centavos"), "32 reais e 50 centavos");
});

test("o exemplo: gastei 32 no mercado no débito", () => {
  const r = ok("gastei 32 no mercado no débito", { valor: 32, descricao: "Mercado", forma: "Débito", tipo: "Despesa" });
  assert.equal(r.data, undefined, "sem data falada, a tela mantém a de hoje");
});

test("valores com centavos, milhar e por extenso", () => {
  ok("almoço 38,90 no cartão", { valor: 38.9, descricao: "Almoço", forma: "Cartão de crédito" });
  ok("paguei R$ 1.250,00 de aluguel no boleto", { valor: 1250, descricao: "Aluguel", forma: "Boleto" });
  ok("uber 25 reais e 50 centavos", { valor: 25.5, descricao: "Uber" });
  ok("gastei trinta e dois reais na padaria", { valor: 32, descricao: "Padaria" });
  ok("farmácia 2 mil", { valor: 2000, descricao: "Farmácia" });
  ok("conta de luz 180 no pix", { valor: 180, descricao: "Conta de luz", forma: "Pix" });
});

test("data falada: ontem, anteontem e 'dia 5' (dia que não chegou é do mês passado)", () => {
  ok("paguei 150 de luz no pix ontem", { valor: 150, descricao: "Luz", forma: "Pix", data: "2026-10-07" });
  ok("mercado 200 anteontem", { data: "2026-10-06", descricao: "Mercado" });
  ok("gasolina 100 no dia 5", { data: "2026-10-05", descricao: "Gasolina", valor: 100 });
  ok("gasolina 100 no dia 20", { data: "2026-09-20" });
});

test("parcelas viram compra no cartão, e o número das parcelas não vira o valor", () => {
  ok("comprei um tênis de 300 em 3 vezes no cartão", { valor: 300, descricao: "Tênis", parcelas: 3, forma: "Cartão de crédito" });
  ok("geladeira 2400 em dez vezes", { valor: 2400, parcelas: 10, forma: "Cartão de crédito", descricao: "Geladeira" });
});

test("entrada, guardar e retirar", () => {
  ok("recebi 500 do freela", { tipo: "Receita", valor: 500, descricao: "Freela" });
  ok("caiu o salário de 3900", { tipo: "Receita", valor: 3900 });
  const g = ok("guardei 200 na reserva de emergência", { tipo: "Reserva", valor: 200 });
  assert.equal(g.retirada, undefined);
  ok("tirei 100 da reserva", { tipo: "Reserva", retirada: true, valor: 100 });
});

test("sem valor: devolve o que der, e a tela pede o valor", () => {
  const r = ok("mercado", { descricao: "Mercado" });
  assert.equal(r.valor, undefined);
  assert.equal(entendeFala("", H).descricao, undefined);
});

test("voz: números compostos e centavos falados", () => {
  const h = "2026-10-08";
  assert.equal(entendeFala("gastei trinta e dois e cinquenta no mercado", h).valor, 32.5);
  assert.equal(entendeFala("paguei cento e vinte e cinco na farmácia", h).valor, 125);
  assert.equal(entendeFala("dois mil e quinhentos de aluguel", h).valor, 2500);
  assert.equal(entendeFala("gastei 100 reais e 5 centavos", h).valor, 100.05);
  assert.equal(entendeFala("gastei 32,5 no uber", h).valor, 32.5);
  assert.equal(entendeFala("gastei vinte e um no café", h).valor, 21);
});

test("voz: 'dia 31' falado em mês seguinte a um mês de 30 dias fica no último dia", () => {
  assert.equal(entendeFala("gastei 50 dia 31", "2026-10-08").data, "2026-09-30");
  assert.equal(entendeFala("gastei 50 dia 30", "2026-03-05").data, "2026-02-28");
  assert.equal(entendeFala("gastei 50 dia 31", "2026-01-05").data, "2025-12-31");
  assert.equal(entendeFala("gastei 50 dia 3", "2026-10-08").data, "2026-10-03");
});
