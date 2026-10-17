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

import { custoDoVeiculo, totalDaLista, totalPorCategoria } from "../js/extras.js";
test("veículo: o que sai do bolso e o que perde de valor", () => {
  const r = custoDoVeiculo({ valor: 60000, desvalPct: 10, kmMes: 1000, consumo: 10, precoLitro: 6, ipvaAno: 2400, seguroAno: 3600, licAno: 180, manutAno: 2400, outrosMes: 200, parcela: 900, restantes: 20 });
  const v = (k) => r.partes.find((p) => p.k === k).valor;
  assert.equal(v("comb"), 600); assert.equal(v("ipva"), 200); assert.equal(v("seguro"), 300); assert.equal(v("lic"), 15); assert.equal(v("manut"), 200);
  assert.equal(v("desval"), 500); assert.equal(r.bolso, 2415); assert.equal(r.total, 2915); assert.equal(r.desval, 500);
  assert.equal(r.porKm, 2.92); assert.equal(r.porKmBolso, 2.42); assert.equal(r.faltaFinanciamento, 18000); assert.equal(r.porAno, 34980);
  assert.equal(r.partes.reduce((t, p) => t + p.pct, 0) >= 99, true);
});
test("veículo: sem dados não inventa conta; sem km não dá custo por km", () => {
  assert.equal(custoDoVeiculo({}), null); assert.equal(custoDoVeiculo(null), null);
  const r = custoDoVeiculo({ ipvaAno: 1200 }); assert.equal(r.total, 100); assert.equal(r.porKm, null);
});
test("mercado: total e divisão por categoria", () => {
  const it = [{ preco: 10, qtd: 3 }, { preco: 5.5 }, { preco: 20, qtd: 1, cat: "Limpeza" }, { preco: 0 }, { preco: "x" }];
  assert.equal(totalDaLista(it), 55.5); assert.equal(totalDaLista([]), 0);
  assert.deepEqual(totalPorCategoria(it), [["Mercado", 35.5], ["Limpeza", 20]]);
});



test("custoDaCasa soma tudo, divide o anual por 12 e calcula o peso na renda", async () => {
  const { custoDaCasa, pesoDaCasa, dicaDoDia, DICAS } = await import("../js/extras.js");
  assert.equal(custoDaCasa({}), null);
  const r = custoDaCasa({ aluguel: 1500, condominio: 300, iptuAno: 1200, luz: 150, agua: 80, internet: 120, moradores: 2, area: 50 });
  assert.equal(r.total, 2250); assert.equal(r.fixos, 1900); assert.equal(r.consumo, 350);
  assert.equal(r.partes[0].k, "moradia"); assert.equal(r.porPessoa, 1125); assert.equal(r.porM2, 45);
  assert.equal(r.porAno, 27000);
  assert.deepEqual(pesoDaCasa(2250, 5000), { pct: 45, nivel: "alto", teto30: 1500 });
  assert.equal(pesoDaCasa(1000, 5000).nivel, "ok"); assert.equal(pesoDaCasa(0, 5000), null);
  assert.equal(custoDaCasa({ financia: 900 }).partes[0].nome, "Parcela do financiamento");
  assert.equal(dicaDoDia("2026-10-17").titulo, dicaDoDia("2026-10-17").titulo);
  assert.notEqual(dicaDoDia("2026-10-17").titulo, dicaDoDia("2026-10-18").titulo);
  assert.ok(DICAS.length >= 30 && DICAS.every((d) => d.titulo && d.texto));
  assert.ok(dicaDoDia("lixo"));
});

test("lista de mercado: estimativa, preço lembrado, média dos lançamentos e carrinho", async () => {
  const { chaveDoItem, precoDoItem, estimativaDaLista, ticketMedioMercado, compraDoCarrinho, textoDaLista } = await import("../js/extras.js");
  assert.equal(chaveDoItem("  Açúcar  Refinado "), "acucar refinado");
  const precos = { arroz: 25 };
  const it = [{ id: "1", nome: "Arroz", qtd: 2 }, { id: "2", nome: "Leite", qtd: 1, preco: 5 }, { id: "3", nome: "Feijão", qtd: 1 }];
  assert.deepEqual(precoDoItem(it[0], precos), { valor: 25, de: "ultimo" }); assert.equal(precoDoItem(it[2], precos).de, "nenhum");
  const e = estimativaDaLista(it, precos, 300);
  assert.equal(e.estimado, 55); assert.equal(e.semPreco, 1); assert.equal(e.pelaMedia, 0); assert.equal(e.total, 3);
  const e0 = estimativaDaLista([{ id: "9", nome: "Pão" }], {}, 300);
  assert.equal(e0.estimado, 0); assert.equal(e0.pelaMedia, 300);
  it[1].pego = true; it[0].pego = true;
  const e2 = estimativaDaLista(it, precos); assert.equal(e2.noCarrinho, 55); assert.equal(e2.pegos, 2); assert.equal(e2.faltaPegar, 0);
  const l = [{ tipo: "Despesa", categoria: "Mercado", valor: 200, data: "2026-10-01" }, { tipo: "Despesa", categoria: "Mercado", valor: 100, data: "2026-09-15" },
    { tipo: "Despesa", categoria: "Lazer", valor: 999, data: "2026-10-01" }, { tipo: "Despesa", categoria: "Mercado", valor: 50, data: "2025-01-01" }];
  const t = ticketMedioMercado(l, "2026-10-10"); assert.equal(t.media, 150); assert.equal(t.n, 2); assert.ok(t.porMes > 0);
  assert.deepEqual(ticketMedioMercado([], "2026-10-10"), { media: 0, n: 0, porMes: 0 });
  it[1].cat = "Limpeza"; it[1].preco = 10;
  assert.deepEqual(compraDoCarrinho(it, precos), { total: 60, partes: [["Mercado", 50], ["Limpeza", 10]] });
  assert.equal(textoDaLista(it), "Lista de mercado:\n• Feijão");
  assert.equal(textoDaLista([]), "");
});

test("juntaLista: vale a mudança mais nova e item apagado não volta", async () => {
  const { juntaLista } = await import("../js/extras.js");
  const agora = 1_000_000_000_000;
  const a = { itens: [{ id: "1", nome: "Arroz", t: agora - 100 }, { id: "2", nome: "Leite", pego: true, t: agora - 10 }], apagados: [] };
  const b = { itens: [{ id: "2", nome: "Leite", pego: false, t: agora - 50 }, { id: "3", nome: "Pão", t: agora - 5 }, { id: "1", nome: "Arroz", t: agora - 200 }], apagados: [{ id: "1", t: agora - 20 }] };
  const j = juntaLista(a, b, agora);
  assert.deepEqual(j.itens.map((x) => x.id).sort(), ["2", "3"]);   // 1 foi apagado depois da última mudança
  assert.equal(j.itens.find((x) => x.id === "2").pego, true);      // a marca mais nova ganha
  assert.equal(j.apagados.length, 1);
  const volta = juntaLista({ itens: [{ id: "1", nome: "Arroz", t: agora }] , apagados: []}, b, agora);
  assert.ok(volta.itens.some((x) => x.id === "1"));                // editado depois de apagado: volta
  assert.equal(juntaLista(null, null, agora).itens.length, 0);
});

test("revisaoDoMes: números do mês, o que subiu e a sugestão de guardar", async () => {
  const { revisaoDoMes } = await import("../js/extras.js");
  const st = { lancamentos: [
    { id: "1", tipo: "Receita", categoria: "Salário", valor: 3000, data: "2026-09-05", forma: "" },
    { id: "2", tipo: "Despesa", categoria: "Mercado", valor: 600, data: "2026-09-10", forma: "Pix" },
    { id: "3", tipo: "Despesa", categoria: "Lazer", valor: 300, data: "2026-09-12", forma: "Pix" },
    { id: "4", tipo: "Receita", categoria: "Salário", valor: 3000, data: "2026-08-05", forma: "" },
    { id: "5", tipo: "Despesa", categoria: "Mercado", valor: 400, data: "2026-08-10", forma: "Pix" } ], fixos: [], cartoes: [], faturas: [], pagos: [] };
  const r = revisaoDoMes(st, "2026-09", "2026-10-10", { Mercado: 500 });
  assert.equal(r.rec, 3000); assert.equal(r.custo, 900); assert.equal(r.sobra, 2100); assert.equal(r.custoAnt, 400); assert.equal(r.variacao, 125);
  assert.equal(r.top[0].cat, "Mercado"); assert.equal(r.subiu[0].cat, "Mercado"); assert.equal(r.subiu[0].dif, 200);
  assert.equal(r.passaram[0].cat, "Mercado"); assert.equal(r.guardar, 300);
  assert.equal(revisaoDoMes(st, "2027-01", "2026-10-10"), null);
  const pobre = revisaoDoMes({ ...st, lancamentos: [{ id: "9", tipo: "Receita", categoria: "Salário", valor: 1000, data: "2026-09-05", forma: "" }, { id: "8", tipo: "Despesa", categoria: "Mercado", valor: 960, data: "2026-09-06", forma: "Pix" }] }, "2026-09", "2026-10-10");
  assert.equal(pobre.guardar, 40);
});
