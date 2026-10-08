// Lançamentos e fixos repetidos (conta de casal): o app pergunta antes de lançar e avisa o que já está repetido.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mesmoLancamento, mesmoFixo, lancamentoRepetido, fixoRepetido, repetidosDoMes, descricaoParecida, chaveDoPar } from "../js/calc.js";

const EU = "u-eu", ELA = "u-julia";
const L = (id, data, descricao, valor, extra = {}) => ({ id, data, descricao, valor, tipo: "Despesa", categoria: "Outros", forma: "Pix", user_id: EU, ...extra });
const F = (id, descricao, valor, extra = {}) => ({ id, descricao, valor, tipo: "Despesa", categoria: "Casa", dia: 10, desde: "2026-01-01", ate: null, user_id: EU, ...extra });

test("descrição parecida: igual, começo igual ou palavra em comum", () => {
  assert.ok(descricaoParecida("Conta de luz", "luz conta"));
  assert.ok(descricaoParecida("Aluguel", "aluguel apto"));
  assert.ok(descricaoParecida("Mercado Zaffari", "Zaffari"));
  assert.ok(!descricaoParecida("Uber", "Farmácia"));
  assert.ok(!descricaoParecida("", "Uber"));
});

test("lançamento: a mesma conta lançada pelas duas pessoas, com até 2 dias de diferença", () => {
  const meu = L("a", "2026-10-10", "Luz", 180.5, { categoria: "Casa" }), dela = L("b", "2026-10-11", "Conta da Enel", 180.5, { categoria: "Casa", user_id: ELA });
  assert.ok(mesmoLancamento(meu, dela));
  assert.ok(!mesmoLancamento(meu, { ...dela, data: "2026-10-14" }), "longe demais na data");
  assert.ok(!mesmoLancamento(meu, { ...dela, valor: 181 }), "valor diferente");
  assert.ok(!mesmoLancamento(meu, { ...dela, tipo: "Receita" }), "tipo diferente");
});

test("lançamento: da mesma pessoa, só no mesmo dia; o café de todo dia não vira aviso", () => {
  assert.ok(!mesmoLancamento(L("a", "2026-10-10", "Café", 6), L("b", "2026-10-11", "Café", 6)));
  assert.ok(mesmoLancamento(L("a", "2026-10-10", "Café", 6), L("b", "2026-10-10", "café", 6)), "o mesmo, no mesmo dia: pode ser o toque repetido");
  assert.ok(!mesmoLancamento(L("a", "2026-10-10", "Café", 6, { categoria: "Alimentação" }), L("b", "2026-10-10", "Pão", 6, { categoria: "Mercado" })), "valor pequeno igual por coincidência");
  assert.ok(mesmoLancamento(L("a", "2026-10-10", "Pix", 300), L("b", "2026-10-10", "Transferência", 300)), "valor alto igual no mesmo dia");
});

test("lançamento repetido: devolve o mais próximo na data", () => {
  const l = [L("a", "2026-10-08", "Luz", 180, { user_id: ELA }), L("b", "2026-10-10", "Luz", 180, { user_id: ELA }), L("c", "2026-10-10", "Água", 90)];
  assert.equal(lancamentoRepetido(l, { ...L("n", "2026-10-10", "Luz", 180), id: undefined }).id, "b");
  assert.equal(lancamentoRepetido(l, L("n", "2026-10-10", "Gás", 120)), null);
});

test("fixo: mesmo valor no mesmo dia do mês (o caso do Vale Salário e do Adiantamento), ou descrição parecida", () => {
  const vale = F("v", "Vale Salário", 750, { tipo: "Receita", categoria: "Salário", dia: 20 });
  const adi = F("a", "Adiantamento Julia", 750, { tipo: "Receita", categoria: "Adiantamento", dia: 20, user_id: ELA });
  assert.ok(mesmoFixo(vale, adi));
  assert.ok(!mesmoFixo(vale, { ...adi, dia: 5 }), "outro dia e outra descrição");
  assert.ok(mesmoFixo(F("x", "Internet", 99.9, { dia: 15 }), F("y", "internet vivo", 99.9, { dia: 3 })), "descrição parecida vale mesmo em outro dia");
  assert.ok(!mesmoFixo(vale, { ...adi, desde: "2025-01-01", ate: "2025-12-01" }), "um acabou antes de o outro começar");
  const uber = F("u1", "Uber mínimo", 1200, { tipo: "Receita", repete: "semanal", dia_semana: 1 });
  assert.ok(mesmoFixo(uber, { ...uber, id: "u2", descricao: "Corridas" }), "semanal no mesmo dia da semana");
  assert.ok(!mesmoFixo(uber, { ...uber, id: "u2", descricao: "Corridas", dia_semana: 3 }));
  assert.equal(fixoRepetido([vale], { ...adi, id: undefined }).id, "v");
});

test("aviso do início: pares do mês, cada item em um par, sem os marcados como não repetidos e sem importados", () => {
  const st = {
    fixos: [F("v", "Vale Salário", 750, { tipo: "Receita", dia: 20 }), F("a", "Adiantamento", 750, { tipo: "Receita", dia: 20, user_id: ELA }), F("x", "Aluguel", 1100)],
    lancamentos: [L("1", "2026-10-10", "Luz", 180), L("2", "2026-10-11", "Luz", 180, { user_id: ELA }), L("3", "2026-10-11", "Luz", 180, { user_id: ELA }),
      L("4", "2026-10-12", "IFOOD", 40, { import_key: "k1" }), L("5", "2026-10-12", "IFOOD", 40, { import_key: "k2" }), L("6", "2026-09-10", "Luz", 180, { user_id: ELA })],
  };
  const r = repetidosDoMes(st, "2026-10");
  assert.deepEqual(r.map((p) => [p.tipo, p.a.id, p.b.id]), [["fixo", "v", "a"], ["lancamento", "1", "2"]]);
  assert.deepEqual(repetidosDoMes(st, "2026-10", [chaveDoPar("fixo", { id: "a" }, { id: "v" })]).map((p) => p.tipo), ["lancamento"], "a chave vale nas duas ordens");
});
