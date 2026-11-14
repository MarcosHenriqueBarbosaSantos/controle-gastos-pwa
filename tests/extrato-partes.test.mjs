import test from "node:test";
import assert from "node:assert/strict";
import { naParteDoExtrato, totaisDoExtrato } from "../js/extras.js";

const itens = [
  { tipo: "Despesa", valor: 50, user_id: "eu" },
  { tipo: "Despesa", valor: 30, user_id: "ju" },
  { tipo: "Receita", valor: 1000, user_id: "eu" },
  { auto: true, tipo: "Despesa", valor: 570, descricao: "Aluguel" },
  { auto: true, tipo: "Receita", valor: 2000, descricao: "Salário" },
];

test("cada parte do Extrato pega só o que é dela", () => {
  assert.deepEqual(itens.filter((x) => naParteDoExtrato(x, "meus", "ju")).map((x) => x.valor), [50]);
  assert.deepEqual(itens.filter((x) => naParteDoExtrato(x, "outro", "ju")).map((x) => x.valor), [30]);
  assert.deepEqual(itens.filter((x) => naParteDoExtrato(x, "fixas", "ju")).map((x) => x.valor), [570]);
  assert.equal(itens.filter((x) => naParteDoExtrato(x, "", "ju")).length, itens.length);
});

test("sem casal, Meus gastos são todos os gastos lançados", () => {
  assert.deepEqual(totaisDoExtrato(itens), { meus: 80, outro: 0, fixas: 570 });
  assert.deepEqual(totaisDoExtrato(itens, "ju"), { meus: 50, outro: 30, fixas: 570 });
});
