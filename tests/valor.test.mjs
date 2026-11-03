import { test } from "node:test";
import assert from "node:assert/strict";
import { valorForaDoComum } from "../js/calc.js";

const L = (data, valor, categoria = "Mercado") => ({ tipo: "Despesa", data, valor, categoria });
const hist = [L("2026-09-02", 578.2), L("2026-09-20", 120), L("2026-10-02", 95.5), L("2026-10-05", 1100, "Moradia")];

test("valor comum: não avisa", () => {
  assert.equal(valorForaDoComum(hist, L("2026-10-10", 38.9), "2026-10-10", "38,90"), null);
  assert.equal(valorForaDoComum(hist, L("2026-10-10", 950), "2026-10-10", "950"), null);
});
test("3890 sem vírgula no mercado: avisa e sugere 38,90", () => {
  assert.deepEqual(valorForaDoComum(hist, L("2026-10-10", 3890), "2026-10-10", "3890"), { maior: 578.2, sugestao: 38.9 });
});
test("valor alto digitado com vírgula: avisa sem sugestão", () => {
  assert.deepEqual(valorForaDoComum(hist, L("2026-10-10", 5000), "2026-10-10", "5.000,00"), { maior: 578.2, sugestao: null });
});
test("até 5 vezes o maior gasto da categoria: não avisa", () => {
  assert.equal(valorForaDoComum(hist, L("2026-10-10", 2800), "2026-10-10", "2800"), null);
});
test("entradas e guardado não são conferidos", () => {
  assert.equal(valorForaDoComum(hist, { ...L("2026-10-10", 99999), tipo: "Receita" }, "2026-10-10", "99999"), null);
});
test("conta nova, sem histórico: só avisa a partir de 10 mil", () => {
  assert.equal(valorForaDoComum([], L("2026-10-10", 5000), "2026-10-10", "5000"), null);
  assert.deepEqual(valorForaDoComum([], L("2026-10-10", 15000), "2026-10-10", "15000"), { maior: 0, sugestao: null });
});
test("histórico com mais de 6 meses não conta", () => {
  const velho = [L("2025-01-01", 9000), L("2026-09-02", 50), L("2026-09-03", 60), L("2026-09-04", 70)];
  assert.ok(valorForaDoComum(velho, L("2026-10-10", 4000), "2026-10-10", "4000"));
});

import { formaMaisUsada } from "../js/calc.js";
const G = (data, forma) => ({ tipo: "Despesa", data, valor: 10, forma, categoria: "Mercado" });
test("forma mais usada nos últimos 90 dias", () => {
  const l = [G("2026-10-01", "Débito"), G("2026-10-02", "Débito"), G("2026-10-03", "Pix"), G("2026-09-20", "Débito"), G("2026-05-01", "Pix"), G("2026-05-02", "Pix"), G("2026-05-03", "Pix")];
  assert.equal(formaMaisUsada(l, "2026-10-10"), "Débito");
});
test("sem histórico suficiente: null", () => {
  assert.equal(formaMaisUsada([G("2026-10-01", "Débito")], "2026-10-10"), null);
});
test("empate: a que vem primeiro na lista", () => {
  const l = [G("2026-10-01", "Débito"), G("2026-10-02", "Pix"), G("2026-10-03", "Débito"), G("2026-10-04", "Pix")];
  assert.equal(formaMaisUsada(l, "2026-10-10"), "Pix");
});

import { formaDaCategoria } from "../js/calc.js";
const GC = (data, forma, categoria) => ({ tipo: "Despesa", data, valor: 10, forma, categoria });
test("forma da categoria: a que domina nela (60% ou mais)", () => {
  const l = [GC("2026-10-01", "Cartão de crédito", "Mercado"), GC("2026-10-02", "Cartão de crédito", "Mercado"), GC("2026-10-03", "Pix", "Mercado"), GC("2026-10-04", "Pix", "Transporte")];
  assert.equal(formaDaCategoria(l, "Mercado", "2026-10-10"), "Cartão de crédito");
});
test("forma da categoria: sem 3 gastos, sem domínio ou fora dos 180 dias, devolve null", () => {
  assert.equal(formaDaCategoria([GC("2026-10-01", "Pix", "Mercado"), GC("2026-10-02", "Pix", "Mercado")], "Mercado", "2026-10-10"), null);
  const meio = [GC("2026-10-01", "Pix", "Mercado"), GC("2026-10-02", "Débito", "Mercado"), GC("2026-10-03", "Dinheiro", "Mercado")];
  assert.equal(formaDaCategoria(meio, "Mercado", "2026-10-10"), null);
  const velho = [GC("2026-01-01", "Pix", "Mercado"), GC("2026-01-02", "Pix", "Mercado"), GC("2026-01-03", "Pix", "Mercado")];
  assert.equal(formaDaCategoria(velho, "Mercado", "2026-10-10"), null);
});

import { ultimoDaCategoria } from "../js/calc.js";
test("último da categoria: o mais recente até hoje, com os dias desde então", () => {
  const l = [GC("2026-10-01", "Pix", "Mercado"), { ...GC("2026-10-08", "Pix", "Mercado"), valor: 87.3 }, { ...GC("2026-10-20", "Pix", "Mercado"), valor: 5 }, GC("2026-10-09", "Pix", "Lazer")];
  const u = ultimoDaCategoria(l, "Mercado", "Despesa", "2026-10-10");
  assert.deepEqual([u.valor, u.data, u.dias], [87.3, "2026-10-08", 2]);
  assert.equal(ultimoDaCategoria(l, "Saúde", "Despesa", "2026-10-10"), null);
  assert.equal(ultimoDaCategoria(l, "Mercado", "Receita", "2026-10-10"), null);
});

import { gastoAteODia } from "../js/calc.js";
test("gasto até o dia: soma só gastos do mês até o dia pedido", () => {
  const l = [GC("2026-10-02", "Pix", "Mercado"), GC("2026-10-05", "Pix", "Mercado"), GC("2026-10-06", "Pix", "Mercado"), GC("2026-11-03", "Pix", "Mercado"), { ...GC("2026-10-03", "Pix", "Mercado"), tipo: "Receita" }];
  assert.equal(gastoAteODia(l, "2026-10", 5), 20);
  assert.equal(gastoAteODia(l, "2026-11", 2), 0);
});
