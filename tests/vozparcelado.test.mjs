// Frases reais de compra parcelada no cartão, com o cartão dito pelo nome ("no cartão da minha mãe").
import test from "node:test";
import assert from "node:assert/strict";
import { entendeFala, entendeVarios, entendeMeses } from "../js/voz.js";

const HOJE = "2026-11-04";
const lido = (f) => { const r = entendeFala(f, HOJE); return { valor: r.valor, descricao: r.descricao, forma: r.forma, parcelas: r.parcelas, data: r.data, cartao: r.cartaoCitado }; };

test("frase do Marcos: rastreador de 470 em 5 vezes no cartão de crédito", () => {
  assert.deepEqual(lido("Eu tenho rastro de 470 parcelado em 5 vezes no meu cartão de crédito"),
    { valor: 470, descricao: "Rastro", forma: "Cartão de crédito", parcelas: 5, data: undefined, cartao: undefined });
});

test("frase do Marcos: mecânico 4.870 ontem, 5 vezes no cartão da minha mãe", () => {
  assert.deepEqual(lido("Ontem gastei no mecânico com a manutenção 4.870 e vou parcelar em 5 vezes no cartão da minha mãe"),
    { valor: 4870, descricao: "Mecânico com a manutenção", forma: "Cartão de crédito", parcelas: 5, data: "2026-11-03", cartao: "mae" });
});

test("frases parecidas: valor, descrição, parcelas, data e o cartão pelo nome", () => {
  assert.deepEqual(lido("Comprei um pneu de 1.200 em 4 vezes no cartão roxo"), { valor: 1200, descricao: "Pneu", forma: "Cartão de crédito", parcelas: 4, data: undefined, cartao: "roxo" });
  assert.deepEqual(lido("Paguei o seguro do carro 2.400 parcelado em 10 vezes no cartão do meu marido"), { valor: 2400, descricao: "Seguro do carro", forma: "Cartão de crédito", parcelas: 10, data: undefined, cartao: "marido" });
  assert.deepEqual(lido("Gastei 350 na oficina ontem e parcelei em 3 vezes no cartão nubank"), { valor: 350, descricao: "Oficina", forma: "Cartão de crédito", parcelas: 3, data: "2026-11-03", cartao: "nubank" });
  assert.deepEqual(lido("Anteontem comprei uma geladeira de 3.200 parcelada em 12 vezes no cartão da minha esposa"), { valor: 3200, descricao: "Geladeira", forma: "Cartão de crédito", parcelas: 12, data: "2026-11-02", cartao: "esposa" });
  assert.deepEqual(lido("Gastei 4.870 no mecânico ontem em 5 vezes no cartão da mãe"), { valor: 4870, descricao: "Mecânico", forma: "Cartão de crédito", parcelas: 5, data: "2026-11-03", cartao: "mae" });
});

test("'cartão de crédito' e 'cartão de débito' não viram nome de cartão", () => {
  const a = lido("Comprei um celular de 2.500 em 10 vezes no cartão de crédito");
  assert.deepEqual([a.forma, a.cartao, a.parcelas], ["Cartão de crédito", undefined, 10]);
  const b = lido("Ontem abasteci 150 de gasolina no cartão de débito");
  assert.deepEqual([b.forma, b.cartao, b.descricao], ["Débito", undefined, "Gasolina"]);
});

test("compra parcelada de um item só não é separada em vários itens nem vira fatura", () => {
  for (const f of ["Eu tenho rastro de 470 parcelado em 5 vezes no meu cartão de crédito", "Ontem gastei no mecânico com a manutenção 4.870 e vou parcelar em 5 vezes no cartão da minha mãe"]) {
    assert.equal(entendeVarios(f, HOJE), null);
    assert.equal(entendeMeses(f, HOJE), null);
  }
});
