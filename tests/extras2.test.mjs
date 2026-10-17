// Testes do segundo pacote: conquistas, acerto do casal, limite com rolagem, dividir compra e cópia de segurança.
import test from "node:test";
import assert from "node:assert/strict";
import { maiorSequencia, conquistas, novasConquistas, acertoDoCasal, rolagemDosLimites, conferirDivisao, montaBackup, leBackup, faltaRestaurar } from "../js/extras.js";
import { usoDosLimites, calcMes } from "../js/calc.js";

const L = (data, categoria, valor, tipo = "Despesa", extra = {}) => ({ id: data + categoria + valor + (extra.k || ""), data, descricao: "", tipo, categoria, forma: "Pix", valor, ...extra });
const base = (lanc = [], extra = {}) => ({ lancamentos: lanc, fixos: [], pagos: [], faturas: [], cartoes: [], ...extra });
const HOJE = "2026-10-20";
const U1 = "11111111-1111-4111-8111-111111111111", U2 = "22222222-2222-4222-8222-222222222222", U3 = "33333333-3333-4333-8333-333333333333";

test("maior sequência: conta dias seguidos, incluindo 'não gastei nada'", () => {
  const st = base([L("2026-10-01", "Mercado", 5), L("2026-10-02", "Mercado", 5), L("2026-10-04", "Mercado", 5)]);
  assert.equal(maiorSequencia(st), 2);
  assert.equal(maiorSequencia(st, ["2026-10-03"]), 4);
  assert.equal(maiorSequencia(base()), 0);
});

test("conquistas: nada ganho sem dados, e só as novas aparecem", () => {
  const vazio = conquistas(base(), HOJE);
  assert.ok(vazio.length >= 12 && vazio.every((c) => !c.feita));
  const st = base([L("2026-10-01", "Mercado", 5), L("2026-10-02", "Reserva", 50, "Reserva", { k: "r" })]);
  const l = conquistas(st, HOJE), ids = l.filter((c) => c.feita).map((c) => c.id);
  assert.ok(ids.includes("primeiro") && ids.includes("guardou"));
  assert.ok(!ids.includes("lanc10"));
  assert.deepEqual(novasConquistas(l, ["primeiro"]).map((c) => c.id), ["guardou"]);
  assert.equal(l.find((c) => c.id === "lanc10").n, 2);
});

test("acerto do casal: quem pagou mais recebe a diferença", () => {
  const l = [L("2026-10-02", "Mercado", 300, "Despesa", { user_id: U1, k: "a" }), L("2026-10-03", "Lazer", 100, "Despesa", { user_id: U2, k: "b" })];
  const a = acertoDoCasal(l, "2026-10", U1);
  assert.equal(a.total, 400); assert.equal(a.saldo, 100); assert.equal(a.quem, "outro"); assert.equal(a.valor, 100);
  const b = acertoDoCasal(l, "2026-10", U2);
  assert.equal(b.quem, "eu"); assert.equal(b.valor, 100);
  const c = acertoDoCasal(l, "2026-10", U1, 75);
  assert.equal(c.deveEu, 300); assert.equal(c.quem, null);
  assert.equal(acertoDoCasal([], "2026-10", U1).quem, null);
});

test("limite com rolagem: o que sobrou no mês passado soma, sem passar do limite", () => {
  const st = base([L("2026-09-05", "Mercado", 300), L("2026-09-06", "Lazer", 500), L("2026-09-07", "Salário", 3000, "Receita", { k: "s" })]);
  const r = rolagemDosLimites(st, "2026-10", HOJE, { Mercado: 500, Lazer: 400, Saúde: 200 });
  assert.deepEqual(r, { Mercado: 200, Saúde: 200 });
  assert.deepEqual(rolagemDosLimites(st, "2026-09", HOJE, { Mercado: 500 }), {});
  const c = calcMes(st, "2026-10", HOJE);
  const u = usoDosLimites(c, { Mercado: 500 }, r);
  assert.equal(u[0].limite, 700); assert.equal(u[0].extra, 200);
  assert.equal(usoDosLimites(c, { Mercado: 500 })[0].extra, undefined);
});

test("dividir compra: só fecha quando as partes somam o total", () => {
  assert.equal(conferirDivisao(100, [{ categoria: "Mercado", valor: 60 }, { categoria: "Casa", valor: 40 }]).certo, true);
  const f = conferirDivisao(100, [{ categoria: "Mercado", valor: 60 }, { categoria: "Casa", valor: 30 }]);
  assert.equal(f.certo, false); assert.equal(f.falta, 10);
  assert.equal(conferirDivisao(100, [{ categoria: "Mercado", valor: 100 }]).certo, false);
  assert.equal(conferirDivisao(0.3, [{ categoria: "A", valor: 0.1 }, { categoria: "B", valor: 0.2 }]).certo, true);
});

test("backup: ida e volta, e só volta o que falta", () => {
  const dados = { lancamentos: [{ id: U1, data: "2026-10-01", descricao: "x", tipo: "Despesa", categoria: "Mercado", forma: "Pix", valor: 10, user_id: "naoVai" }, { id: U2, data: "2026-10-02", descricao: "", tipo: "Despesa", categoria: "Lazer", forma: "Pix", valor: 20 }],
    fixos: [], faturas: [], cartoes: [], pagos: [] };
  const b = montaBackup(dados, { renda: 1 }, "61", "2026-10-20T10:00:00Z");
  assert.equal(b.dados.lancamentos[0].user_id, undefined);
  const lido = leBackup(JSON.stringify(b));
  assert.equal(lido.ok, true); assert.equal(lido.dados.lancamentos.length, 2); assert.equal(lido.criadoEm, "2026-10-20");
  const falta = faltaRestaurar(lido.dados, { lancamentos: [{ id: U1 }], fixos: [], pagos: [] });
  assert.deepEqual(falta.lancamentos.map((x) => x.id), [U2]);
});

test("backup: arquivo estranho ou com lixo não entra", () => {
  assert.equal(leBackup("nada").ok, false);
  assert.equal(leBackup(JSON.stringify({ app: "outro" })).ok, false);
  const ruim = { app: "meus-gastos", formato: 1, dados: { lancamentos: [
    { id: "nao-uuid", data: "2026-10-01", tipo: "Despesa", categoria: "A", valor: 1 },
    { id: U1, data: "2026-10-01", tipo: "Despesa", categoria: "A", valor: -5 },
    { id: U2, data: "ontem", tipo: "Despesa", categoria: "A", valor: 5 },
    { id: U3, data: "2026-10-01", tipo: "Despesa", categoria: "A", valor: 5, user_id: "x", import_key: "k", extra: "<script>" }] } };
  const r = leBackup(JSON.stringify(ruim));
  assert.equal(r.descartados, 3); assert.equal(r.dados.lancamentos.length, 1);
  assert.deepEqual(Object.keys(r.dados.lancamentos[0]).sort(), ["categoria", "data", "id", "import_key", "tipo", "valor"]);
  assert.equal(r.dados.lancamentos[0].user_id, undefined);
});

test("backup: pagos só voltam se o fixo existe e ainda não estão marcados", () => {
  const b = { cartoes: [], fixos: [{ id: U1 }], lancamentos: [], faturas: [], pagos: [{ fixo_id: U1, mes: "2026-09-01" }, { fixo_id: U2, mes: "2026-09-01" }, { fixo_id: U1, mes: "2026-08-01" }] };
  const f = faltaRestaurar(b, { fixos: [], pagos: [{ fixo_id: U1, mes: "2026-08-01" }] });
  assert.deepEqual(f.pagos, [{ fixo_id: U1, mes: "2026-09-01" }]);
});

import { ajustesRestauraveis } from "../js/extras.js";
test("ajustes da cópia: só entra o que a pessoa ainda não tem", () => {
  const g = { limites: { Mercado: 500 }, metas: { Viagem: { valor: 1000 } }, teto: 3000, saldoInicial: 0, saldoDesde: "2026-01", desafios: [1], categorias: null, hack: { x: 1 } };
  assert.deepEqual(ajustesRestauraveis(g, {}), { limites: { Mercado: 500 }, metas: { Viagem: { valor: 1000 } }, teto: 3000, saldoDesde: "2026-01" });
  assert.deepEqual(ajustesRestauraveis(g, { limites: { Lazer: 1 }, teto: 100, saldoDesde: "2025-01", metas: {} }), { metas: { Viagem: { valor: 1000 } } });
  assert.deepEqual(ajustesRestauraveis(null, {}), {});
});

import { JA_TINHA, RETIRADA, guardadoPorDestino, andamentoDaMeta, parabensDaMeta } from "../js/calc.js";
test("já tinha guardado: soma na caixinha, mas não tira do saldo do mês", () => {
  const st = base([L("2026-10-05", "Salário", 3000, "Receita", { k: "s" }), L("2026-10-06", "Viagem", 800, "Reserva", { forma: JA_TINHA, k: "j" })]);
  const c = calcMes(st, "2026-10", HOJE);
  assert.equal(c.res, 0); assert.equal(c.saldo, 3000);
  assert.deepEqual(guardadoPorDestino(st, "2026-10"), [["Viagem", 800]]);
  const a = andamentoDaMeta(st, "Viagem", { valor: 2000 }, HOJE);
  assert.equal(a.guardado, 800); assert.equal(a.noMes, 0); assert.equal(a.ritmo, 0); assert.equal(a.pct, 40);
  // guardar de verdade depois conta normal, e retirar tira do total
  const st2 = base([...st.lancamentos, L("2026-10-10", "Viagem", 200, "Reserva", { forma: "", k: "g" }), L("2026-10-12", "Viagem", 100, "Reserva", { forma: RETIRADA, k: "r" })]);
  const c2 = calcMes(st2, "2026-10", HOJE), a2 = andamentoDaMeta(st2, "Viagem", { valor: 2000 }, HOJE);
  assert.equal(c2.res, 100); assert.equal(a2.guardado, 900); assert.equal(a2.noMes, 100);
});
test("já tinha guardado não gera parabéns de 'você guardou ontem'", () => {
  const st = base([L("2026-10-09", "Viagem", 1500, "Reserva", { forma: JA_TINHA, k: "j" })]);
  assert.equal(parabensDaMeta(st, { Viagem: { valor: 2000 } }, "2026-10-10"), null);
});

import { avaliaConta } from "../js/extras.js";
test("conta no valor: soma, subtrai, multiplica e divide", () => {
  assert.equal(avaliaConta("12+8,50"), 20.5);
  assert.equal(avaliaConta("45x2"), 90);
  assert.equal(avaliaConta("45 × 2 + 10"), 100);
  assert.equal(avaliaConta("100/4"), 25);
  assert.equal(avaliaConta("1.200,50-200"), 1000.5);
  assert.equal(avaliaConta("10+20*3"), 70);
  assert.equal(avaliaConta("100÷3"), 33.33);
});
test("conta no valor: o que não é conta devolve null", () => {
  for (const t of ["", "12", "1.234,56", "12+", "+12", "12++3", "abc", "10/0", "5-10", "12+a", "2*3-6", "R$ 15"]) assert.equal(avaliaConta(t), null, t);
});
