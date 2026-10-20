// Testes da exportação do extrato do mês e do cartão, e do que depende de um cartão ao apagá-lo.
import test from "node:test";
import assert from "node:assert/strict";
import { dependentesDoCartao } from "../js/calc.js";
import { linhasDoMes, linhasDoCartao, csvDoMes, csvDoCartao, tabelaDoCartao, extratoDoMesEmLinhas, cartaoEmLinhas, pdfDeLinhas, CAB_EXTRATO } from "../js/extras.js";

const HOJE = "2026-10-20";
const roxo = { id: "k1", nome: "Cartão roxo", fechamento: 1, vencimento: 8, ativo: true };
const azul = { id: "k2", nome: "Cartão azul", fechamento: 10, vencimento: 17, ativo: true };
let n = 0;
const L = (data, descricao, valor, extra = {}) => ({ id: `l${++n}`, data, descricao, valor, tipo: "Despesa", categoria: "Mercado", forma: "Pix", parcelas: 1, ...extra });
const noCartao = (cartao, data, descricao, valor, parcelas = 1) => L(data, descricao, valor, { forma: "Cartão de crédito", cartao_id: cartao.id, parcelas, categoria: "Lazer" });
const st = (extra = {}) => ({
  lancamentos: [L("2026-10-05", "Mercado do mês", 500), noCartao(roxo, "2026-09-12", "Show", 140), noCartao(roxo, "2026-09-20", "Tênis", 300, 3), noCartao(azul, "2026-10-02", "Livro", 60),
    L("2026-10-01", "Salário", 4000, { tipo: "Receita", categoria: "Salário", forma: "" }), L("2026-09-30", "Do mês passado", 10)],
  fixos: [{ id: "f1", tipo: "Despesa", descricao: "Aluguel", categoria: "Moradia", dia: 10, valor: 1100, forma: "Boleto", desde: "2026-01-01", ate: null }],
  pagos: [], faturas: [], cartoes: [roxo, azul], ...extra,
});

test("extrato do mês: lançamentos, fixos e as faturas que vencem, em ordem de data", () => {
  const l = linhasDoMes(st(), "2026-10");
  assert.deepEqual(l.map((x) => x.descricao), ["Salário", "Livro", "Mercado do mês", "Fatura Cartão roxo", "Aluguel", "Fatura Cartão azul"]);   // a compra de 02/10 no azul cai na fatura que vence em 17/10
  const datas = l.map((x) => x.data); assert.deepEqual(datas, [...datas].sort());
  assert.ok(l.some((x) => x.descricao === "Aluguel" && x.origem === "Fixo"));
  assert.ok(!l.some((x) => x.descricao === "Do mês passado"));   // só o mês pedido
  const f = l.find((x) => x.tipo === "Fatura");
  assert.equal(f.descricao, "Fatura Cartão roxo"); assert.equal(f.data, "2026-10-08"); assert.equal(f.forma, "Em aberto"); assert.equal(f.origem, "Vencimento");
  assert.equal(f.valor, 140 + 100);   // show + 1ª parcela do tênis (300 em 3x)
});

test("extrato do mês: a fatura paga aparece como Paga", () => {
  const s = st({ faturas: [{ id: "r1", cartao_id: "k1", vencimento: "2026-10-08", valor: 240, status: "Paga", valor_fixo: false }] });
  assert.equal(linhasDoMes(s, "2026-10").find((x) => x.tipo === "Fatura").forma, "Paga");
});

test("extrato do mês sem nada devolve só o cabeçalho no CSV", () => {
  const csv = csvDoMes({ lancamentos: [], fixos: [], pagos: [], faturas: [], cartoes: [] }, "2026-10");
  assert.equal(csv, "﻿" + CAB_EXTRATO.join(";") + "\r\n");
});

test("CSV do mês: BOM, ponto e vírgula, datas e valores no padrão brasileiro e fórmulas neutralizadas", () => {
  const s = st({ lancamentos: [L("2026-10-05", "=SOMA(A1)", 12.5), L("2026-10-06", 'Pão "quente"; bom', 3)] });
  const csv = csvDoMes(s, "2026-10"), linhas = csv.split("\r\n");
  assert.ok(csv.startsWith("﻿Data;Tipo;"));
  assert.ok(linhas.some((x) => x.startsWith("05/10/2026;Despesa;Mercado;'=SOMA(A1);Pix;12,50;")));
  assert.ok(linhas.some((x) => x.includes('"Pão ""quente""; bom"')));
});

test("cartão, fatura do mês: cada parcela com o valor dela, e o total", () => {
  const l = linhasDoCartao(st(), "k1", "2026-10");
  assert.deepEqual(l.map((x) => [x.descricao, x.parcela, x.valor]), [["Show", "", 140], ["Tênis", "1/3", 100]]);
  const t = tabelaDoCartao(st(), "k1", "2026-10");
  assert.deepEqual(t.at(-1), ["", "Total", "", "", "240,00", ""]);
  assert.equal(t[1][3], "1/3");
});

test("cartão, todas as compras: valor total e 'em 3x', só desse cartão", () => {
  const l = linhasDoCartao(st(), "k1");
  assert.deepEqual(l.map((x) => [x.descricao, x.parcela, x.valor]), [["Show", "", 140], ["Tênis", "em 3x", 300]]);
  assert.deepEqual(linhasDoCartao(st(), "k2").map((x) => x.descricao), ["Livro"]);
  assert.deepEqual(linhasDoCartao(st(), "nao-existe"), []);
  assert.deepEqual(linhasDoCartao(st(), "nao-existe", "2026-10"), []);
});

test("CSV do cartão: cabeçalho, itens e a linha de total", () => {
  const csv = csvDoCartao(st(), "k1", "2026-10").split("\r\n");
  assert.equal(csv[0], "﻿Data;Descrição;Categoria;Parcela;Valor;Origem");
  assert.equal(csv[1], "12/09/2026;Show;Lazer;;140,00;Compra");
  assert.equal(csv.at(-2), ";Total;;;240,00;");
});

test("conta fixa no cartão entra na fatura com a origem 'Conta fixa'", () => {
  const s = st({ fixos: [{ id: "f2", tipo: "Despesa", descricao: "Celular", categoria: "Contas da casa", dia: 12, valor: 55, forma: "Cartão de crédito", cartao_id: "k1", desde: "2026-01-01", ate: null }] });
  const l = linhasDoCartao(s, "k1", "2026-10");
  assert.ok(l.some((x) => x.descricao === "Celular" && x.origem === "Conta fixa" && x.valor === 55));
});

test("PDF: o extrato do mês e o do cartão viram um arquivo PDF de verdade", () => {
  const a = extratoDoMesEmLinhas(st(), "2026-10", HOJE), b = cartaoEmLinhas(st(), "k1", "Cartão roxo", "2026-10", HOJE), c = cartaoEmLinhas(st(), "k1", "Cartão roxo", "", HOJE);
  assert.match(a[0].t, /Extrato de outubro de 2026/); assert.ok(a.some((x) => /Faturas que vencem no mês/.test(x.t)));
  assert.match(b[0].t, /Fatura que vence em outubro de 2026/); assert.match(c[0].t, /Todas as compras/);
  assert.ok(b.at(-1).t.includes("R$ 240,00")); assert.ok(b.at(-1).t.includes("2 itens"));
  for (const linhas of [a, b, c]) {
    const bytes = pdfDeLinhas(linhas), cab = String.fromCharCode(...bytes.slice(0, 5));
    assert.equal(cab, "%PDF-");
  }
});

test("o que depende de um cartão: compras, contas fixas, registros de fatura e o total gasto", () => {
  const s = st({ faturas: [{ id: "r1", cartao_id: "k1", vencimento: "2026-10-08", valor: 240, status: "Paga" }, { id: "r2", cartao_id: null, vencimento: "2026-10-10", valor: 80, status: "Aberta" }],
    fixos: [{ id: "f2", tipo: "Despesa", descricao: "Celular", valor: 55, forma: "Cartão de crédito", cartao_id: "k1", desde: "2026-01-01", ate: null }] });
  const d = dependentesDoCartao(s, "k1");
  assert.equal(d.compras.length, 2); assert.equal(d.fixos.length, 1); assert.equal(d.faturas.length, 1); assert.equal(d.total, 440);
  const v = dependentesDoCartao(s, "k-sem-nada");
  assert.deepEqual([v.compras.length, v.fixos.length, v.faturas.length, v.total], [0, 0, 0, 0]);
  assert.deepEqual(dependentesDoCartao({}, "k1").compras, []);
});
