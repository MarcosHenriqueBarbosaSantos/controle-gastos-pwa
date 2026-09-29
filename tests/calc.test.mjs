// Testes das regras de cálculo e da importação. Rode com: node --test
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMoney, addM, dim, fixosDoMes, calcMes, catMap, custoAcumulado } from "../js/calc.js";
import { cellToISO, importKey, parseWorkbook, guessCat } from "../js/excel.js";

test("parseMoney entende formatos brasileiros", () => {
  assert.equal(parseMoney("1.234,56"), 1234.56);
  assert.equal(parseMoney("R$ 25,90"), 25.9);
  assert.equal(parseMoney("1.200"), 1200);
  assert.equal(parseMoney("45.9"), 45.9);
  assert.equal(parseMoney(300), 300);
  assert.ok(Number.isNaN(parseMoney("")));
});

test("aritmética de meses", () => {
  assert.equal(addM("2026-12", 1), "2027-01");
  assert.equal(addM("2026-01", -1), "2025-12");
  assert.equal(dim("2028-02"), 29);
  assert.equal(dim("2026-02"), 28);
});

const base = () => ({
  lancamentos: [
    { id: "1", data: "2026-03-05", descricao: "Salário", tipo: "Receita", categoria: "Salário", forma: "", valor: 1600 },
    { id: "2", data: "2026-03-05", descricao: "Beleza", tipo: "Despesa", categoria: "Beleza", forma: "Pix", valor: 350 },
    { id: "3", data: "2026-03-24", descricao: "Carro", tipo: "Despesa", categoria: "Carro", forma: "Cartão de crédito", valor: 6300 },
    { id: "4", data: "2026-03-28", descricao: "Reserva", tipo: "Reserva", categoria: "Reserva de emergência", forma: "", valor: 100 },
  ],
  fixos: [
    { id: "f1", descricao: "Condomínio", categoria: "Moradia", dia: 15, valor: 350, desde: "2026-03-01", ate: null },
    { id: "f2", descricao: "Academia", categoria: "Saúde", dia: 10, valor: 90, desde: "2026-01-01", ate: "2026-02-01" },
  ],
  pagos: [{ fixo_id: "f1", mes: "2026-03-01" }],
  faturas: [{ id: "c1", cartao: "X", vencimento: "2026-04-10", valor: 800, status: "Aberta" }],
});

test("fixos só contam entre desde e até", () => {
  const f = base().fixos;
  assert.deepEqual(fixosDoMes(f, "2026-02").map((x) => x.id), ["f2"]);
  assert.deepEqual(fixosDoMes(f, "2026-03").map((x) => x.id), ["f1"]);
  assert.deepEqual(fixosDoMes(f, "2025-12").map((x) => x.id), []);
});

test("custo, saldo e cartão de um mês fechado", () => {
  const c = calcMes(base(), "2026-03", "2026-09-29");
  assert.equal(c.fase, "passado");
  assert.equal(c.vari, 6650);
  assert.equal(c.fxT, 350);
  assert.equal(c.custo, 7000);
  assert.equal(c.saldo, 1600 - 7000 - 100);
  assert.equal(c.fxPend, 0);
  assert.equal(c.ccAberto, 800);
  assert.equal(c.comprasCartao, 6300);
  assert.equal(c.proj, c.custo);
});

test("projeção do mês atual usa a média diária", () => {
  const c = calcMes(base(), "2026-03", "2026-03-10"); // 10 de 31 dias
  assert.equal(c.fase, "atual");
  assert.equal(c.proj, Math.round(((6650 / 10) * 31 + 350) * 100) / 100);
});

test("categorias somam dia a dia e fixos", () => {
  const c = calcMes(base(), "2026-03", "2026-09-29");
  assert.deepEqual(catMap(c), [["Carro", 6300], ["Beleza", 350], ["Moradia", 350]]);
  const { cum } = custoAcumulado(c);
  assert.equal(cum[14], 350);   // só beleza até o dia 14
  assert.equal(cum[15], 700);   // + condomínio no dia 15
  assert.equal(cum[31], 7000);
});

test("datas do Excel", () => {
  assert.equal(cellToISO(46086), "2026-03-05");
  assert.equal(cellToISO("05/03/2026"), "2026-03-05");
  assert.equal(cellToISO("2026-03-05"), "2026-03-05");
  assert.equal(cellToISO(""), null);
});

test("chave de importação ignora maiúsculas e acentos na descrição", () => {
  const a = { data: "2026-03-05", descricao: "Salário", tipo: "Receita", valor: 1600 };
  assert.equal(importKey(a), importKey({ ...a, descricao: "salario" }));
  assert.notEqual(importKey(a), importKey({ ...a, valor: 1601 }));
});

// SheetJS falso: cada aba já é a lista de linhas
const fakeXLSX = { utils: { sheet_to_json: (ws) => ws } };

test("lê o modelo com Gasto/Entrada e ignora a linha de total", () => {
  const wb = { SheetNames: ["Lançamentos", "Gastos Fixos", "Cartões"], Sheets: {
    "Lançamentos": [["Lançamentos"], [], [], ["Data", "Descrição", "Tipo", "Categoria", "Forma de pagamento", "Valor (R$)"],
      [46086, "Salário", "Entrada", "Salário", null, 1600], ["20/03/2026", "Mercado", "Gasto", "", "Pix", "85,50"], [null, null, null, null, null, null]],
    "Gastos Fixos": [["Descrição", "Categoria", "Dia do vencimento", "Valor mensal (R$)", "Ativo?", "Forma de pagamento", "Jan", "Fev", "Mar"],
      ["Condomínio", "Moradia", 15, 350, "Sim", "Boleto", null, "Pago", "Pago"], ["Total dos fixos", null, null, 350, null, null]],
    "Cartões": [["Cartão", "Vencimento", "Valor da fatura (R$)", "Status"], ["Nubank", "10/04/2026", 800, "Aberta"]],
  } };
  const r = parseWorkbook(fakeXLSX, wb);
  assert.equal(r.formato, "modelo");
  assert.equal(r.lancamentos.length, 2);
  assert.equal(r.lancamentos[0].tipo, "Receita");
  assert.equal(r.lancamentos[1].categoria, "Mercado");
  assert.equal(r.lancamentos[1].valor, 85.5);
  assert.equal(r.fixos.length, 1);
  assert.deepEqual(r.fixos[0].mesesPagos, [2, 3]);
  assert.equal(r.faturas[0].vencimento, "2026-04-10");
});

test("lê a planilha antiga (DIA | RECEITA/DESPESA | VALOR)", () => {
  const row = (b, c, j) => { const r = Array(12).fill(null); r[1] = b; r[2] = c; r[9] = j; return r; };
  const wb = { SheetNames: ["Gerenciamento mensal"], Sheets: { "Gerenciamento mensal": [
    row("DIA", "RECEITA/DESPESA", "VALOR"), row(46086, "salario julia", 1600), row(null, "beleza", -350), row(46096, "CONDOMINIO", -350)] } };
  const r = parseWorkbook(fakeXLSX, wb);
  assert.equal(r.formato, "antigo");
  assert.deepEqual(r.lancamentos.map((x) => [x.data, x.tipo, x.categoria, x.valor]), [
    ["2026-03-05", "Receita", "Salário", 1600], ["2026-03-05", "Despesa", "Beleza", 350], ["2026-03-15", "Despesa", "Moradia", 350]]);
  assert.equal(guessCat("Parcela Caixa", "Despesa"), "Parcelas e financiamentos");
});
