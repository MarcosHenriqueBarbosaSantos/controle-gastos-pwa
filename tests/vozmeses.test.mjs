// A fatura do cartão em vários meses numa fala só: "1.000 esse mês e 600 nos outros meses até abril".
import test from "node:test";
import assert from "node:assert/strict";
import { entendeMeses, MESES_SEM_FIM } from "../js/voz.js";

const HOJE = "2026-11-04";
const lista = (f) => entendeMeses(f, HOJE)?.meses.map((x) => `${x.mes}:${x.valor}`);

test("meses: 'esse mês' e 'nos outros meses até abril'", () => {
  assert.deepEqual(lista("cartão roxo esse mês mil e duzentos e nos outros meses seiscentos até abril"),
    ["2026-11:1200", "2026-12:600", "2027-01:600", "2027-02:600", "2027-03:600", "2027-04:600"]);
});

test("meses: valor e mês pelo nome, com intervalo 'de dezembro a abril'", () => {
  assert.deepEqual(lista("cartão 1000 em novembro e 600 de dezembro a abril"),
    ["2026-11:1000", "2026-12:600", "2027-01:600", "2027-02:600", "2027-03:600", "2027-04:600"]);
});

test("meses: um valor para cada mês, sem 'e' nem vírgula (como o reconhecimento de fala entrega)", () => {
  assert.deepEqual(lista("fatura novembro 1200 dezembro 800 janeiro 650"), ["2026-11:1200", "2026-12:800", "2027-01:650"]);
  assert.deepEqual(lista("fatura do cartão 1500 em janeiro"), ["2027-01:1500"]);
});

test("meses: 'nos próximos 5 meses' e 'por 6 meses'", () => {
  assert.deepEqual(lista("cartão esse mês 1000 e nos próximos 5 meses 600"), ["2026-11:1000", "2026-12:600", "2027-01:600", "2027-02:600", "2027-03:600", "2027-04:600"]);
  assert.equal(lista("cartão 600 por 6 meses").length, 6);
});

test("meses: sem dizer até quando, assume " + MESES_SEM_FIM + " meses e avisa", () => {
  const r = entendeMeses("cartão esse mês 1000 e nos outros meses 600", HOJE);
  assert.equal(r.fimAssumido, true);
  assert.equal(r.meses.length, 1 + MESES_SEM_FIM);
  assert.equal(entendeMeses("cartão 1000 em novembro e 600 de dezembro a abril", HOJE).fimAssumido, false);
});

test("meses: o ano vem certo (mês que já passou este ano é do ano que vem)", () => {
  assert.deepEqual(lista("cartão 700 em outubro"), ["2027-10:700"]);
  assert.deepEqual(lista("cartão 700 em novembro"), ["2026-11:700"]);
});

test("meses: não confunde com gasto comum nem com pagar a fatura", () => {
  assert.equal(entendeMeses("gastei 50 no mercado", HOJE), null);
  assert.equal(entendeMeses("paguei 100 da fatura do cartão", HOJE), null);   // sem dizer o mês: é um lançamento só
  assert.equal(entendeMeses("", HOJE), null);
});

test("meses: compra no cartão com um mês dito é um gasto, não a fatura", () => {
  assert.equal(entendeMeses("gastei 50 no mercado no cartão em janeiro", HOJE), null);
  assert.equal(entendeMeses("mercado 80 no cartão em dezembro", HOJE), null);
  assert.equal(entendeMeses("paguei 50 de uber no cartão em janeiro", HOJE), null);
  assert.deepEqual(lista("cartão 1500 em janeiro"), ["2027-01:1500"]);
  assert.deepEqual(lista("fatura 1500 em janeiro"), ["2027-01:1500"]);
});
