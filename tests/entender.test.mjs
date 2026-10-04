// Testes do que ajuda a pessoa a entender o mês: a régua do dinheiro, o quanto dá para gastar por dia,
// a sequência de dias anotados, a comparação com o mês anterior e os limites por categoria.
import test from "node:test";
import assert from "node:assert/strict";
import { RETIRADA, calcMes, raioX, livrePorDia, sequenciaDeDias, gastoDoDia, comparaComMesAnterior, usoDosLimites, round2 } from "../js/calc.js";

const HOJE = "2026-10-04";
const L = (data, descricao, tipo, categoria, forma, valor, extra = {}) => ({ id: data + descricao, data, descricao, tipo, categoria, forma, valor, ...extra });
const base = () => ({
  lancamentos: [L("2026-10-01", "Padaria", "Despesa", "Alimentação", "Pix", 18.5), L("2026-10-02", "Mercado", "Despesa", "Mercado", "Débito", 578.2), L("2026-10-03", "Farmácia", "Despesa", "Saúde", "Pix", 42.9),
    L("2026-09-02", "Mercado", "Despesa", "Mercado", "Débito", 300), L("2026-09-04", "Feira", "Despesa", "Mercado", "Dinheiro", 80), L("2026-09-20", "Tênis", "Despesa", "Roupas", "Pix", 200)],
  fixos: [{ id: "f1", tipo: "Despesa", descricao: "Aluguel", categoria: "Moradia", dia: 10, valor: 1100, forma: "Boleto", desde: "2026-01-01", ate: null },
    { id: "r1", tipo: "Receita", descricao: "Salário", categoria: "Salário", dia: 5, valor: 3900, forma: "", desde: "2026-01-01", ate: null }],
  pagos: [], faturas: [{ id: "c1", cartao: "Loja", vencimento: "2026-10-12", valor: 300.9, status: "Aberta" }], cartoes: [],
});

test("régua do mês: as partes mais a sobra dão exatamente o que entra", () => {
  const c = calcMes(base(), "2026-10", HOJE), r = raioX(c);
  assert.deepEqual(r.partes.map((p) => [p.k, p.valor]), [["fixos", 1100], ["dia", 639.6], ["faturas", 300.9]]);
  assert.equal(r.entra, 3900); assert.equal(r.saidas, 2040.5); assert.equal(r.sobra, 1859.5); assert.equal(r.sobra, c.saldo);
  assert.equal(round2(r.partes.reduce((t, p) => t + p.valor, 0) + r.sobra), r.entra);
  assert.ok(Math.abs(r.partes.reduce((t, p) => t + p.pct, 0) + r.sobraPct - 100) < 1e-9, "a régua fecha em 100%");
  assert.equal(r.limitePct, null);
});

test("régua do mês: dinheiro guardado é uma parte; retirar mais do que guardou conta como entrada", () => {
  const st = base(); st.lancamentos.push(L("2026-10-02", "Reserva", "Reserva", "Reserva de emergência", "", 500));
  let c = calcMes(st, "2026-10", HOJE), r = raioX(c);
  assert.deepEqual(r.partes.at(-1), { k: "guardado", nome: "Guardado", valor: 500, pct: (500 / 3900) * 100 }); assert.equal(r.sobra, 1359.5); assert.equal(r.sobra, c.saldo);
  st.lancamentos.push(L("2026-10-03", "Retirada", "Reserva", "Reserva de emergência", RETIRADA, 800));
  c = calcMes(st, "2026-10", HOJE); r = raioX(c);
  assert.equal(c.res, -300); assert.equal(r.entra, 4200); assert.ok(!r.partes.some((p) => p.k === "guardado")); assert.equal(r.sobra, c.saldo);
});

test("régua do mês: quando sai mais do que entra, marca onde o dinheiro acaba", () => {
  const st = base(); st.lancamentos.push(L("2026-10-03", "Conserto do carro", "Despesa", "Transporte", "Pix", 2500));
  const c = calcMes(st, "2026-10", HOJE), r = raioX(c);
  assert.equal(r.sobra, -640.5); assert.equal(r.sobra, c.saldo); assert.equal(r.sobraPct, 0);
  assert.ok(Math.abs(r.limitePct - (3900 / 4540.5) * 100) < 1e-9); assert.ok(Math.abs(r.partes.reduce((t, p) => t + p.pct, 0) - 100) < 1e-9);
});

test("régua do mês: mês sem nada não quebra", () => {
  const r = raioX(calcMes({ lancamentos: [], fixos: [], pagos: [], faturas: [], cartoes: [] }, "2026-10", HOJE));
  assert.deepEqual(r, { partes: [], entra: 0, saidas: 0, sobra: 0, sobraPct: 0, limitePct: null });
});

test("pode gastar por dia: a sobra dividida pelos dias que faltam, contando hoje", () => {
  const c = calcMes(base(), "2026-10", HOJE);
  assert.deepEqual(livrePorDia(c), { restam: 28, valor: round2(1859.5 / 28) });   // de 04 a 31 de outubro
  assert.equal(livrePorDia(calcMes(base(), "2026-10", "2026-10-31")).restam, 1);
  assert.equal(livrePorDia(calcMes(base(), "2026-09", HOJE)), null);              // mês passado
  assert.equal(livrePorDia(calcMes(base(), "2026-11", HOJE)), null);              // mês futuro
  const st = base(); st.lancamentos.push(L("2026-10-03", "Conserto", "Despesa", "Transporte", "Pix", 2500));
  assert.equal(livrePorDia(calcMes(st, "2026-10", HOJE)).valor, 0);               // no vermelho: não sobra nada por dia
});

test("sequência de dias anotados", () => {
  const st = base();
  assert.deepEqual(sequenciaDeDias(st, HOJE), { dias: 3, feitoHoje: false });           // 01, 02 e 03; hoje (04) ainda não
  assert.deepEqual(sequenciaDeDias(st, HOJE, ["2026-10-04"]), { dias: 4, feitoHoje: true });   // marcou "não gastei nada" hoje
  assert.deepEqual(sequenciaDeDias(st, "2026-10-06"), { dias: 0, feitoHoje: false });   // pulou o dia 04 e o 05
  assert.deepEqual(sequenciaDeDias(st, "2026-10-05", ["2026-10-04"]), { dias: 4, feitoHoje: false });
  assert.deepEqual(sequenciaDeDias({ lancamentos: [] }, HOJE), { dias: 0, feitoHoje: false });
  st.lancamentos.push(L("2026-10-04", "Café", "Despesa", "Alimentação", "Pix", 7), L("2026-09-30", "Uber", "Despesa", "Transporte", "Pix", 20));
  assert.deepEqual(sequenciaDeDias(st, HOJE), { dias: 5, feitoHoje: true });            // atravessa a virada do mês
});

test("gasto do dia soma só os gastos daquele dia", () => {
  const st = base(); st.lancamentos.push(L("2026-10-03", "Almoço", "Despesa", "Alimentação", "Cartão de crédito", 30), L("2026-10-03", "Pix recebido", "Receita", "Outros", "", 100));
  assert.deepEqual(gastoDoDia(st, "2026-10-03"), { total: 72.9, n: 2 }); assert.deepEqual(gastoDoDia(st, "2026-10-04"), { total: 0, n: 0 });
});

test("comparação com o mês anterior: mesmo trecho do mês, só o dia a dia", () => {
  const c = calcMes(base(), "2026-10", HOJE), r = comparaComMesAnterior(base(), c, "2026-10");
  assert.deepEqual(r, { antes: 380, agora: 639.6, dif: 259.6, mes: "2026-09" });   // setembro até o dia 4: 300 + 80 (o tênis do dia 20 fica de fora)
  const semAntes = base(); semAntes.lancamentos = semAntes.lancamentos.filter((x) => x.data >= "2026-10-01");
  assert.equal(comparaComMesAnterior(semAntes, calcMes(semAntes, "2026-10", HOJE), "2026-10"), null);
  assert.equal(comparaComMesAnterior(base(), calcMes(base(), "2026-09", HOJE), "2026-09"), null);   // só no mês atual
});

test("limites por categoria: quanto foi usado e quanto passou", () => {
  const c = calcMes(base(), "2026-10", HOJE);
  assert.deepEqual(usoDosLimites(c, { Mercado: 500, Saúde: 100, Lazer: 200, Roupas: 0 }), [
    { cat: "Mercado", gasto: 578.2, limite: 500, pct: 116, passou: 78.2 }, { cat: "Saúde", gasto: 42.9, limite: 100, pct: 43, passou: 0 }, { cat: "Lazer", gasto: 0, limite: 200, pct: 0, passou: 0 }]);
  assert.deepEqual(usoDosLimites(c, {}), []); assert.deepEqual(usoDosLimites(c, null), []);
});
