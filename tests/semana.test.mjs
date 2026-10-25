import test from "node:test";
import assert from "node:assert/strict";
import { linhaDaSemana } from "../js/semana.js";

const L = [
  { id: "a", data: "2026-10-24", descricao: "Padaria", categoria: "Alimentação", tipo: "Despesa", valor: 25 },
  { id: "b", data: "2026-10-23", descricao: "Uber", categoria: "Salário", tipo: "Receita", valor: 85 },
  { id: "c", data: "2026-10-20", descricao: "Mercado", categoria: "Mercado", tipo: "Despesa", valor: 180 },
  { id: "d", data: "2026-10-17", descricao: "Fora da semana", categoria: "Lazer", tipo: "Despesa", valor: 10 },
  { id: "e", data: "2026-10-24", descricao: "", categoria: "Saúde", tipo: "Despesa", valor: 0 },
  { id: "f", data: "2026-10-25", descricao: "Amanhã", categoria: "Lazer", tipo: "Despesa", valor: 5 },
];

test("pega só os últimos 7 dias, do mais novo ao mais antigo, sem valor zero nem dia futuro", () => {
  const r = linhaDaSemana(L, "2026-10-24");
  assert.deepEqual(r.map((x) => x.id), ["a", "b", "c"]);
});

test("rótulos: hoje, ontem e dia da semana", () => {
  const r = linhaDaSemana(L, "2026-10-24");
  assert.deepEqual(r.map((x) => x.rotulo), ["hoje", "ontem", "ter"]);
});

test("respeita o máximo e aceita lista vazia", () => {
  assert.equal(linhaDaSemana(L, "2026-10-24", { max: 2 }).length, 2);
  assert.deepEqual(linhaDaSemana([], "2026-10-24"), []);
  assert.deepEqual(linhaDaSemana(undefined, "2026-10-24"), []);
});

test("sem descrição usa a categoria", () => {
  const r = linhaDaSemana([{ id: "x", data: "2026-10-24", descricao: "", categoria: "Saúde", tipo: "Despesa", valor: 9 }], "2026-10-24");
  assert.equal(r[0].descricao, "Saúde");
});
