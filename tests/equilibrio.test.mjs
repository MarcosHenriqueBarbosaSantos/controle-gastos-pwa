// Pôr o mês em ordem: mês virado, contas em atraso e o plano para sobrar dinheiro.
import test from "node:test";
import assert from "node:assert/strict";
import { saldoAcumulado, saldoAnterior, contasEmAtraso, planoDoMes, contasQueNaoFecham, quandoOsDinheiroAcaba } from "../js/calc.js";

const L = (id, data, tipo, valor, extra = {}) => ({ id, data, tipo, categoria: tipo === "Receita" ? "Salário" : tipo === "Reserva" ? "Reserva" : "Mercado", forma: "Pix", valor, descricao: "x", ...extra });
const base = () => ({ lancamentos: [], fixos: [], pagos: [], faturas: [], cartoes: [] });

test("mês virado: o saldo dele não passa para os meses seguintes", () => {
  const st = base();
  st.lancamentos.push(L("a", "2026-08-05", "Receita", 3000), L("b", "2026-08-10", "Despesa", 1000));   // ago: +2000
  st.lancamentos.push(L("c", "2026-09-05", "Receita", 1000), L("d", "2026-09-10", "Despesa", 4000));   // set: -3000
  st.lancamentos.push(L("e", "2026-10-05", "Receita", 2000));                                         // out: +2000
  assert.equal(saldoAnterior(st, "2026-10", "2026-10-20"), -1000);
  assert.equal(saldoAnterior(st, "2026-10", "2026-10-20", null, ["2026-09"]), 2000);
  assert.equal(saldoAcumulado(st, "2026-10", "2026-10-20"), 1000);
  assert.equal(saldoAcumulado(st, "2026-10", "2026-10-20", { viradas: ["2026-09"] }), 4000);
  // o próprio mês virado também não conta no acumulado dele
  assert.equal(saldoAcumulado(st, "2026-09", "2026-10-20", { viradas: ["2026-09"] }), 2000);
  // sem virar nada, o resultado é o de sempre
  assert.equal(saldoAcumulado(st, "2026-09", "2026-10-20"), -1000);
});

test("contas em atraso: fixas não pagas e faturas em aberto que já venceram", () => {
  const st = base();
  st.fixos.push({ id: "f1", tipo: "Despesa", descricao: "Aluguel", categoria: "Moradia", dia: 5, valor: 1000, forma: "Pix", desde: "2026-08-01", ate: null });
  st.pagos.push({ fixo_id: "f1", mes: "2026-08-01" });                                              // agosto pago
  st.faturas.push({ id: "t1", cartao_id: null, cartao: "Nu", vencimento: "2026-09-10", valor: 300, status: "Aberta" });
  st.faturas.push({ id: "t2", cartao_id: null, cartao: "Nu", vencimento: "2026-08-10", valor: 200, status: "Paga" });
  const r = contasEmAtraso(st, "2026-10-20");
  assert.deepEqual(r.itens.map((i) => [i.titulo, i.mes, i.valor]), [["Aluguel", "2026-09", 1000], ["Fatura Nu", "2026-09", 300], ["Aluguel", "2026-10", 1000]]);
  assert.equal(r.total, 2300);
  assert.deepEqual(r.porMes.map((x) => [x.mes, x.n, x.total]), [["2026-09", 2, 1300], ["2026-10", 1, 1000]]);
  assert.ok(r.itens.every((i) => i.dias < 0));
  // a partir de outubro, setembro some da conta
  assert.equal(contasEmAtraso(st, "2026-10-20", "2026-10").total, 1000);
  // conta que vence hoje ou depois ainda não é atraso
  assert.equal(contasEmAtraso(st, "2026-10-05").itens.filter((i) => i.mes === "2026-10").length, 0);
});

test("plano do mês: diz quanto cortar por dia, ou que só cortar não resolve", () => {
  const st = base();
  st.lancamentos.push(L("r", "2026-10-01", "Receita", 3000));
  // 20 dias, R$ 100 por dia no dia a dia: R$ 2000 gastos
  for (let d = 1; d <= 20; d++) st.lancamentos.push(L("g" + d, `2026-10-${String(d).padStart(2, "0")}`, "Despesa", 100));
  st.fixos.push({ id: "f1", tipo: "Despesa", descricao: "Aluguel", categoria: "Moradia", dia: 5, valor: 1500, forma: "Pix", desde: "2026-10-01", ate: null });
  const p = planoDoMes(st, "2026-10", "2026-10-20");
  assert.equal(p.entradas, 3000); assert.equal(p.saldoDoMes, -500);
  assert.equal(p.diasRestantes, 11); assert.equal(p.mediaDia, 100);
  assert.ok(p.previsto < p.saldoDoMes);                       // gastar mais 11 dias piora
  assert.equal(p.soCortarResolve, false);                      // 11 dias × R$ 100 = R$ 1100 de corte máximo; falta mais que isso
  assert.ok(p.faltaEntrar > 0);
  assert.equal(p.corteMaximo, 1100);
  // com uma entrada extra a conta fecha só cortando
  st.lancamentos.push(L("x", "2026-10-02", "Receita", 1000));
  const q = planoDoMes(st, "2026-10", "2026-10-20");
  assert.equal(q.soCortarResolve, true); assert.ok(q.porDiaParaFechar > 0 && q.porDiaParaFechar < q.mediaDia + 1);
});

test("reserva: quantos dias ela cobre", () => {
  const st = base();
  st.lancamentos.push(L("r1", "2026-08-01", "Receita", 3000), L("g1", "2026-08-10", "Despesa", 3100));       // ago custo 3100 (100/dia)
  st.lancamentos.push(L("r2", "2026-09-01", "Receita", 3000), L("g2", "2026-09-10", "Despesa", 3000));       // set custo 3000 (100/dia)
  st.lancamentos.push(L("s1", "2026-09-15", "Reserva", 1000));
  st.lancamentos.push(L("o1", "2026-10-02", "Despesa", 50));
  const p = planoDoMes(st, "2026-10", "2026-10-05");
  assert.equal(p.reserva, 1000);
  assert.ok(p.diasDeReserva >= 9 && p.diasDeReserva <= 11, String(p.diasDeReserva));   // ~R$ 100 por dia → ~10 dias
  assert.equal(planoDoMes(base(), "2026-10", "2026-10-05").diasDeReserva, 0);
});

import { opcoesDeRecomeco } from "../js/calc.js";
test("recomeço: opções de 1, 3 e 6 meses e a sugerida que cabe", () => {
  const o = opcoesDeRecomeco(2340, 800);
  assert.deepEqual(o.map((x) => x.meses), [1, 3, 6]);
  assert.deepEqual(o.map((x) => x.porMes), [2340, 780, 390]);
  assert.deepEqual(o.map((x) => x.cabe), [false, true, true]);
  assert.deepEqual(o.map((x) => x.sugerida), [false, true, false]);
  assert.equal(o[1].porDia, 26);
  // sem sobra nenhuma, a mais longa é a sugerida e nada "cabe"
  const z = opcoesDeRecomeco(2340, 0);
  assert.ok(z.every((x) => !x.cabe)); assert.equal(z.at(-1).sugerida, true);
  assert.deepEqual(opcoesDeRecomeco(0, 500), []);
});

import { faturasSemValor, proximosVencimentos } from "../js/calc.js";
test("cartão cadastrado sem compras aparece nos vencimentos para informar o valor", () => {
  const st = base();
  st.cartoes.push({ id: "k1", nome: "Nubank", fechamento: 20, vencimento: 27, ativo: true }, { id: "k2", nome: "Antigo", fechamento: 1, vencimento: 8, ativo: false });
  const r = faturasSemValor(st, "2026-10-22");
  assert.deepEqual(r.map((x) => [x.titulo, x.data, x.dias, x.semValor]), [["Fatura Nubank", "2026-10-27", 5, true]]);   // cartão inativo não entra; o do mês que vem fica fora dos 30 dias
  // com compra lançada, a fatura é a de verdade e o aviso "sem valor" some
  st.lancamentos.push({ id: "c1", data: "2026-10-05", tipo: "Despesa", categoria: "Lazer", forma: "Cartão de crédito", cartao_id: "k1", parcelas: 1, valor: 120, descricao: "x" });
  assert.equal(faturasSemValor(st, "2026-10-22").filter((x) => x.mes === "2026-10").length, 0);
  assert.ok(proximosVencimentos(st, "2026-10-22").some((x) => x.tipo === "fatura" && x.valor === 120));
  // fatura já paga no mês: não aparece de novo
  const st2 = base(); st2.cartoes.push({ id: "k1", nome: "Nubank", fechamento: 20, vencimento: 27, ativo: true });
  st2.faturas.push({ id: "f", cartao_id: "k1", cartao: "Nubank", vencimento: "2026-10-27", valor: 300, status: "Paga", valor_fixo: true });
  assert.equal(faturasSemValor(st2, "2026-10-22").filter((x) => x.mes === "2026-10").length, 0);
});

test("contas que não fecham: mostra quais contas faltam cobrir, com e sem o gasto que a pessoa vai lançar", () => {
  const st = base();
  st.lancamentos.push(L("a", "2026-10-05", "Receita", 3000), L("b", "2026-10-10", "Despesa", 1000));
  st.fixos.push({ id: "f1", tipo: "Despesa", descricao: "Aluguel", categoria: "Moradia", dia: 25, valor: 1000, forma: "Pix", desde: "2026-01-01", ate: null });
  st.faturas.push({ id: "t1", cartao_id: null, cartao: "Nu", vencimento: "2026-10-28", valor: 800, status: "Aberta" });
  const a = contasQueNaoFecham(st, "2026-10-20");
  assert.equal(a.caixa, 2000);
  assert.deepEqual(a.itens.map((x) => x.titulo), ["Aluguel", "Fatura Nu"]);
  assert.equal(a.naoFecham.length, 0);
  const b = contasQueNaoFecham(st, "2026-10-20", 500);
  assert.equal(b.caixa, 1500);
  assert.deepEqual(b.naoFecham.map((x) => [x.titulo, x.falta]), [["Fatura Nu", 300]]);
  assert.equal(b.totalQueFalta, 300);
  const c = contasQueNaoFecham(st, "2026-10-20", 2500);   // nada cobre: as duas ficam de fora (a primeira em parte)
  assert.equal(c.naoFecham.length, 2);
  // conta já paga não entra
  st.pagos.push({ fixo_id: "f1", mes: "2026-10-01" });
  assert.deepEqual(contasQueNaoFecham(st, "2026-10-20").itens.map((x) => x.titulo), ["Fatura Nu"]);
});

test("quando o dinheiro acaba: anda dia a dia com as contas, as entradas e a média do dia a dia", () => {
  const st = base();
  st.lancamentos.push(L("a", "2026-10-02", "Receita", 3000), L("b", "2026-10-05", "Despesa", 1000), L("c", "2026-10-10", "Despesa", 1000));
  st.fixos.push({ id: "f1", tipo: "Despesa", descricao: "Aluguel", categoria: "Moradia", dia: 25, valor: 800, forma: "Pix", desde: "2026-01-01", ate: null });
  // hoje dia 20: tem R$ 1.000 na mão (3000 - 2000); média do dia a dia = 2000/20 = 100; aluguel dia 25
  const r = quandoOsDinheiroAcaba(st, "2026-10-20");
  assert.equal(r.saldoHoje, 1000);
  assert.equal(r.mediaDia, 100);
  assert.equal(r.diaZero, "2026-10-25");      // 1000 - 5x100 (dias 21 a 25) - 800 de aluguel = -300 no dia 25
  assert.equal(r.diasAteZero, 5);
  assert.equal(r.minimo.saldo, -300 - 100 * 6);  // até o dia 31 continua gastando a média
});
