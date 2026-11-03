import { test } from "node:test";
import assert from "node:assert/strict";
import { usoDoLimite, proximaFatura } from "../js/calc.js";

// Cartão que fecha dia 3 e vence dia 10. Hoje é 02/11/2026: a fatura aberta fecha amanhã e vence em 10/11.
const roxo = { id: "k", nome: "Roxo", fechamento: 3, vencimento: 10 };
const compra = (id, data, valor, parcelas = 1) => ({ id, data, descricao: id, tipo: "Despesa", categoria: "Outros", forma: "Cartão de crédito", cartao_id: "k", parcelas, valor });
const estado = (extra = {}) => ({ pagos: [], cartoes: [roxo], faturas: [],
  lancamentos: [compra("velha", "2026-09-10", 200), compra("geladeira", "2026-10-20", 900, 3), compra("pao", "2026-11-02", 100)],
  fixos: [{ id: "s", tipo: "Despesa", descricao: "Streaming", categoria: "Lazer", dia: 15, valor: 50, forma: "Cartão de crédito", cartao_id: "k", desde: "2026-09-01", ate: null }], ...extra });

test("limite: a fatura aberta e as parcelas que ainda vão vir ocupam o limite", () => {
  // aberta (novembro): parcela 1 da geladeira 300 + pão 100 + streaming de outubro 50 = 450; parcelas de dezembro e janeiro: 600
  assert.deepEqual(usoDoLimite(estado(), roxo, 3000, "2026-11-02"), { limite: 3000, usado: 1050, livre: 1950, pct: 35 });
});

test("limite: fatura marcada como paga libera o limite; fatura vencida e esquecida não conta", () => {
  const paga = { id: "f", cartao_id: "k", cartao: "Roxo", vencimento: "2026-11-10", valor: 450, status: "Paga", valor_fixo: false };
  assert.equal(usoDoLimite(estado({ faturas: [paga] }), roxo, 3000, "2026-11-02").usado, 600);
  // a compra de setembro venceu em 10/10 sem ser marcada como paga: aparece como atrasada, e não no limite
  assert.equal(usoDoLimite(estado(), roxo, 3000, "2026-11-02").usado, 1050);
});

test("limite: sem limite cadastrado não há conta, e passar do limite dá livre negativo", () => {
  assert.equal(usoDoLimite(estado(), roxo, 0, "2026-11-02"), null);
  assert.equal(usoDoLimite(estado(), roxo, "", "2026-11-02"), null);
  assert.deepEqual(usoDoLimite(estado(), roxo, 1000, "2026-11-02"), { limite: 1000, usado: 1050, livre: -50, pct: 105 });
});

test("próxima fatura: quando fecha, quanto falta e quanto soma", () => {
  assert.deepEqual(proximaFatura(estado(), roxo, "2026-11-02"), { mes: "2026-11", fecha: "2026-11-03", dias: 1, vencimento: "2026-11-10", valor: 450, paga: false });
  // no dia do fechamento, a fatura aberta já é a de dezembro
  const dez = proximaFatura(estado(), roxo, "2026-11-03");
  assert.deepEqual([dez.mes, dez.fecha, dez.dias, dez.valor], ["2026-12", "2026-12-03", 30, 350]);
});
