// Testes das regras de cálculo e da importação. Rode com: node --test
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMoney, addM, dim, fixosDoMes, calcMes, catMap, custoAcumulado, comprasCartaoPorCategoria } from "../js/calc.js";
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
  assert.equal(c.vari, 350);            // só o que foi pago fora do cartão
  assert.equal(c.comprasCartao, 6300);  // o carro foi no cartão: não entra no custo de março
  assert.equal(c.fxT, 350);
  assert.equal(c.fatT, 0);
  assert.equal(c.custo, 700);
  assert.equal(c.saldo, 1600 - 700 - 100);
  assert.equal(c.fxPend, 0);
  assert.equal(c.ccAberto, 800);
  assert.equal(c.proj, c.custo);
});

test("a fatura entra no custo do mês em que vence", () => {
  const abr = calcMes(base(), "2026-04", "2026-09-29");   // fatura de 800 vence em 10/04
  assert.equal(abr.fatT, 800);
  assert.equal(abr.fatAberta, 800);
  assert.equal(abr.custo, 350 + 800);                     // condomínio + fatura
  assert.deepEqual(catMap(abr), [["Faturas de cartão", 800], ["Moradia", 350]]);
  const { cum } = custoAcumulado(abr);
  assert.equal(cum[9], 0); assert.equal(cum[10], 800); assert.equal(cum[15], 1150);
});

test("fixo no cartão não entra no custo direto, só pela fatura", () => {
  const st = base();
  st.fixos.push({ id: "f3", descricao: "Streaming", categoria: "Lazer", dia: 5, valor: 40, forma: "Cartão de crédito", desde: "2026-03-01", ate: null });
  const c = calcMes(st, "2026-03", "2026-09-29");
  assert.equal(c.fxT, 390);
  assert.equal(c.fxCartao, 40);
  assert.equal(c.custo, 700);
  assert.deepEqual(comprasCartaoPorCategoria(c), [["Carro", 6300], ["Lazer", 40]]);
});

test("projeção do mês atual com poucos lançamentos não extrapola", () => {
  const c = calcMes(base(), "2026-03", "2026-03-10"); // 10 de 31 dias
  assert.equal(c.fase, "atual");
  assert.equal(c.proj, 350 + 350);   // só um gasto lançado: pouco dado para projetar, fica no que já saiu + fixos
});

test("categorias somam dia a dia e fixos", () => {
  const c = calcMes(base(), "2026-03", "2026-09-29");
  assert.deepEqual(catMap(c), [["Beleza", 350], ["Moradia", 350]]);
  const { cum } = custoAcumulado(c);
  assert.equal(cum[14], 350);   // só beleza até o dia 14
  assert.equal(cum[15], 700);   // + condomínio no dia 15
  assert.equal(cum[31], 700);   // o carro, no cartão, não entra
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

import { categoriasIniciais, primeiroMes, saldoAnterior, reservaAcumulada, guardadoPorDestino, RETIRADA, CATS_PADRAO } from "../js/calc.js";

test("guardado: guardar tira do saldo, retirar devolve, e o total fica separado por destino", () => {
  const st = base();   // março: 100 na Reserva de emergência
  st.lancamentos.push({ id: "5", data: "2026-04-10", descricao: "Emergência", tipo: "Reserva", categoria: "Reserva de emergência", forma: RETIRADA, valor: 60 });
  st.lancamentos.push({ id: "6", data: "2026-04-05", descricao: "Salário", tipo: "Receita", categoria: "Salário", forma: "", valor: 1000 });
  st.lancamentos.push({ id: "7", data: "2026-04-06", descricao: "Tesouro", tipo: "Reserva", categoria: "Investimentos", forma: "", valor: 200 });
  const mar = calcMes(st, "2026-03", "2026-09-29"), abr = calcMes(st, "2026-04", "2026-09-29");
  assert.equal(mar.res, 100);
  assert.equal(abr.res, 140);                          // guardou 200, retirou 60
  assert.equal(abr.saldo, 1000 - 350 - 800 - 140);     // entrada − fixo − fatura − guardado líquido
  assert.equal(reservaAcumulada(st, "2026-03"), 100);
  assert.equal(reservaAcumulada(st, "2026-04"), 240);
  assert.equal(reservaAcumulada(st, "2026-02"), 0);
  assert.deepEqual(guardadoPorDestino(st, "2026-04"), [["Investimentos", 200], ["Reserva de emergência", 40]]);
});

test("saldo que passa de um mês para o outro", () => {
  const st = base();
  assert.equal(primeiroMes(st), "2026-01");            // fixo f2 começa em janeiro
  const jan = calcMes(st, "2026-01", "2026-09-29").saldo, fev = calcMes(st, "2026-02", "2026-09-29").saldo;
  assert.equal(jan, -90); assert.equal(fev, -90);
  assert.equal(saldoAnterior(st, "2026-03", "2026-09-29"), -180);
  assert.equal(saldoAnterior(st, "2026-04", "2026-09-29"), -180 + (1600 - 700 - 100));
  assert.equal(saldoAnterior(st, "2026-04", "2026-09-29", "2026-04"), 0);   // começa a contar em abril
  assert.equal(saldoAnterior(st, "2026-01", "2026-09-29"), 0);
  assert.equal(saldoAnterior({ lancamentos: [], fixos: [], pagos: [], faturas: [] }, "2026-03", "2026-09-29"), 0);
});

test("categorias iniciais incluem as que a pessoa já usou", () => {
  const c = categoriasIniciais(base());
  assert.ok(c.Despesa.includes("Carro"));
  assert.ok(c.Despesa.includes("Mercado"));
  assert.equal(c.Despesa.filter((x) => x === "Beleza").length, 1);
  assert.deepEqual(c.Receita, CATS_PADRAO.Receita);
  assert.deepEqual(c.Reserva, CATS_PADRAO.Reserva);
});

import { proximosVencimentos, diasEntre } from "../js/calc.js";

test("próximos vencimentos: faturas em aberto e fixos não pagos, com dias até vencer", () => {
  assert.equal(diasEntre("2026-03-28", "2026-04-07"), 10);
  const st = base();                               // condomínio dia 15 (pago em março), fatura 800 em 10/04
  const v = proximosVencimentos(st, "2026-03-31", 30);
  assert.deepEqual(v.map((x) => [x.titulo, x.data, x.dias, x.valor]), [
    ["Fatura X", "2026-04-10", 10, 800],
    ["Condomínio", "2026-04-15", 15, 350],        // março já foi pago; aparece o de abril
  ]);
  st.faturas[0].status = "Paga";
  assert.deepEqual(proximosVencimentos(st, "2026-03-31").map((x) => x.titulo), ["Condomínio"]);
  // fixo de março não pago aparece como atrasado
  st.pagos = [];
  const a = proximosVencimentos(st, "2026-03-20", 10);
  assert.deepEqual(a.map((x) => [x.titulo, x.dias]), [["Condomínio", -5]]);
});

import { projetaDiaADia } from "../js/calc.js";

test("previsão: compra pontual grande não é repetida; com histórico, mistura com a média", () => {
  const g = (data, valor) => ({ id: data + valor, data, descricao: "", tipo: "Despesa", categoria: "Outros", forma: "Pix", valor });
  const out = () => st.lancamentos.filter((x) => x.data.startsWith("2026-10"));
  const st = { lancamentos: [g("2026-10-01", 20), g("2026-10-02", 600), g("2026-10-03", 40)], fixos: [], pagos: [], faturas: [] };
  // poucos dados (3 dias, 3 gastos): não projeta além do que já saiu
  assert.equal(projetaDiaADia(st, "2026-10", out(), 3, 31), 660);
  assert.equal(calcMes(st, "2026-10", "2026-10-03").proj, 660);
  // dia 6, com 6 gastos: rotina de 20+40+30+25+35 = 150 em 6 dias; os 600 não se repetem
  st.lancamentos.push(g("2026-10-04", 30), g("2026-10-05", 25), g("2026-10-06", 35));
  assert.equal(Math.round(projetaDiaADia(st, "2026-10", out(), 6, 31)), 750 + Math.round((150 / 6) * 25));
  assert.equal(calcMes(st, "2026-10", "2026-10-06").proj, 1375);
  // com histórico de 900 em setembro: no dia 6 de 31 pesa mais o histórico
  st.lancamentos.push(g("2026-09-10", 900));
  const w = 6 / 31, esperado = w * (750 / 6) * 31 + (1 - w) * 900;
  assert.ok(Math.abs(projetaDiaADia(st, "2026-10", out(), 6, 31) - esperado) < 0.01);
  // nunca abaixo do que já foi gasto
  st.lancamentos.push(g("2026-10-06", 5000));
  assert.ok(projetaDiaADia(st, "2026-10", out(), 6, 31) >= 5750);
});

test("entradas fixas entram sozinhas todo mês e não se misturam com os gastos fixos", () => {
  const st = base();
  st.fixos.push({ id: "r1", tipo: "Receita", descricao: "Salário", categoria: "Salário", dia: 30, valor: 3000, forma: "", desde: "2026-04-01", ate: null });
  const mar = calcMes(st, "2026-03", "2026-09-29"), abr = calcMes(st, "2026-04", "2026-09-29");
  assert.equal(mar.rec, 1600);                       // ainda não tinha a entrada fixa
  assert.equal(abr.frT, 3000);
  assert.equal(abr.rec, 3000);
  assert.equal(abr.fxT, 350);                        // gastos fixos não mudam
  assert.equal(abr.saldo, 3000 - (350 + 800));
  assert.equal(abr.frAReceber, 0);                   // mês fechado: já recebeu
  const hoje = calcMes(st, "2026-09", "2026-09-29");
  assert.equal(hoje.frAReceber, 3000);               // dia 30 ainda não chegou
  assert.equal(calcMes(st, "2026-09", "2026-09-30").frAReceber, 0);
  assert.equal(calcMes(st, "2026-11", "2026-09-29").frAReceber, 3000);
  assert.equal(calcMes(st, "2027-02", "2027-02-28").frAReceber, 0);   // dia 30 em fevereiro conta no último dia
  assert.ok(!proximosVencimentos(st, "2026-09-29", 30).some((x) => x.titulo === "Salário"));
  assert.ok(categoriasIniciais(st).Receita.includes("Salário"));
});

import { ocorrencias, diaDaSemana } from "../js/calc.js";

test("fixo semanal: uma ocorrência em cada dia da semana escolhido, a partir do início", () => {
  assert.equal(diaDaSemana("2026-10-02"), 5);         // sexta-feira
  const st = { lancamentos: [], pagos: [], faturas: [], fixos: [
    { id: "u", tipo: "Despesa", repete: "semanal", dia_semana: 5, descricao: "Uber", categoria: "Transporte", dia: 1, valor: 30, forma: "Pix", desde: "2026-10-09", ate: null },
    { id: "a", tipo: "Despesa", descricao: "Aluguel", categoria: "Moradia", dia: 10, valor: 1000, forma: "Boleto", desde: "2026-10-01", ate: null },
  ] };
  // sextas de outubro/2026: 02, 09, 16, 23, 30 — começa em 09, então 4 vezes
  assert.deepEqual(ocorrencias(st.fixos, "2026-10").filter((o) => o.id === "u").map((o) => o.data), ["2026-10-09", "2026-10-16", "2026-10-23", "2026-10-30"]);
  // novembro/2026 tem 4 sextas: 06, 13, 20, 27
  assert.equal(ocorrencias(st.fixos, "2026-11").filter((o) => o.id === "u").length, 4);
  assert.equal(ocorrencias(st.fixos, "2026-09").length, 0);
  const c = calcMes(st, "2026-10", "2026-10-12");
  assert.equal(c.fxT, 1000 + 4 * 30);
  assert.equal(c.custo, 1120);
  assert.deepEqual(catMap(c), [["Moradia", 1000], ["Transporte", 120]]);
  const { cum } = custoAcumulado(c);
  assert.equal(cum[8], 0); assert.equal(cum[9], 30); assert.equal(cum[10], 1030); assert.equal(cum[31], 1120);
  // pagar uma sexta não paga as outras
  st.pagos.push({ fixo_id: "u", mes: "2026-10-09" });
  assert.equal(calcMes(st, "2026-10", "2026-10-12").fxPend, 1000 + 3 * 30);
  const v = proximosVencimentos(st, "2026-10-12", 10);
  assert.deepEqual(v.map((x) => [x.titulo, x.data, x.dias]), [["Aluguel", "2026-10-10", -2], ["Uber", "2026-10-16", 4]]);
  assert.equal(v[1].chave, "2026-10-16");
  // encerrado no fim de outubro
  st.fixos[0].ate = "2026-10-01";
  assert.equal(ocorrencias(st.fixos, "2026-11").filter((o) => o.id === "u").length, 0);
});

import { avisosDeHoje } from "../js/calc.js";

test("avisos do dia: contas atrasadas ou até 3 dias, e alerta de saldo", () => {
  const g = (data, valor, tipo = "Despesa") => ({ id: data + valor, data, descricao: "", tipo, categoria: "Outros", forma: "Pix", valor });
  const st = { lancamentos: [g("2026-10-01", 3000, "Receita"), g("2026-10-02", 100)], pagos: [], faturas: [
      { id: "c1", cartao: "Roxo", vencimento: "2026-10-05", valor: 299, status: "Aberta" },
      { id: "c2", cartao: "Azul", vencimento: "2026-10-20", valor: 500, status: "Aberta" },
      { id: "c0", cartao: "Velha", vencimento: "2026-09-10", valor: 80, status: "Aberta" }],
    fixos: [{ id: "a", tipo: "Despesa", descricao: "Aluguel", categoria: "Moradia", dia: 1, valor: 1000, forma: "Boleto", desde: "2026-10-01", ate: null }] };
  const a = avisosDeHoje(st, "2026-10-03");
  assert.deepEqual(a.contas.map((x) => [x.titulo, x.dias]), [["Fatura Velha", -23], ["Aluguel", -2], ["Fatura Roxo", 2]]);
  assert.equal(a.atrasadas, 2);
  assert.equal(a.totalContas, 80 + 1000 + 299);
  assert.equal(a.saldo, null);                                   // 3000 de entrada cobre o mês
  // pagou o aluguel: sai dos avisos
  st.pagos.push({ fixo_id: "a", mes: "2026-10-01" });
  assert.deepEqual(avisosDeHoje(st, "2026-10-03").contas.map((x) => x.titulo), ["Fatura Velha", "Fatura Roxo"]);
  // gastou mais do que entrou: alerta vermelho
  st.lancamentos.push(g("2026-10-03", 2500));
  const b = avisosDeHoje(st, "2026-10-03");
  assert.equal(b.saldo.tipo, "vermelho"); assert.equal(b.saldo.nivel, "bad");
  assert.equal(b.saldo.valor, 100 + 2500 + 1000 + 299 + 500 - 3000);
  // sem nenhum dado, nenhum aviso
  assert.deepEqual(avisosDeHoje({ lancamentos: [], fixos: [], pagos: [], faturas: [] }, "2026-10-03"), { contas: [], atrasadas: 0, totalContas: 0, saldo: null });
});

test("aviso de previsão: ainda no azul, mas o ritmo leva ao vermelho", () => {
  const g = (data, valor, tipo = "Despesa") => ({ id: data + valor, data, descricao: "", tipo, categoria: "Outros", forma: "Pix", valor });
  const st = { lancamentos: [g("2026-10-01", 1500, "Receita"), g("2026-10-01", 100), g("2026-10-02", 110), g("2026-10-03", 90)], fixos: [], pagos: [], faturas: [] };
  assert.equal(avisosDeHoje(st, "2026-10-03").saldo, null);      // 3 dias é pouco para prever: sem alarme
  st.lancamentos.push(g("2026-10-04", 100), g("2026-10-05", 105), g("2026-10-06", 95));
  const a = avisosDeHoje(st, "2026-10-06");                      // 100 por dia → 3.100 no mês, contra 1.500
  assert.equal(a.saldo.tipo, "previsao"); assert.equal(a.saldo.nivel, "warn");
  assert.equal(a.saldo.valor, 1600);
});
