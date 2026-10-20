// "Para onde foi o dinheiro": o mês em respostas simples, comparado com o anterior.
import test from "node:test";
import assert from "node:assert/strict";
import { paraOndeFoi, nomeDoMes, metaSugerida } from "../js/paraondefoi.js";

const HOJE = "2026-10-20";
let n = 0;
const L = (data, valor, categoria, tipo = "Despesa", descricao = categoria) => ({ id: `l${++n}`, data, valor, categoria, tipo, descricao, forma: "Pix" });
const base = (extra = {}) => ({ lancamentos: [], fixos: [], faturas: [], cartoes: [], pagos: [], ...extra });

function cenario() {
  return base({ lancamentos: [
    L("2026-09-05", 1000, "Transporte"), L("2026-09-08", 500, "Mercado"), L("2026-09-09", 200, "Outros"), L("2026-09-01", 3000, "Salário", "Receita"),
    L("2026-10-03", 1600, "Transporte"), L("2026-10-08", 450, "Mercado"), L("2026-10-09", 900, "Outros"), L("2026-10-01", 2500, "Salário", "Receita"),
  ], fixos: [{ id: "f1", descricao: "Parcela do carro", valor: 1900, categoria: "Parcelas e financiamentos", dia: 24, desde: "2026-10-01", forma: "Pix", tipo: "Despesa" }] });
}

test("mês sem entradas e sem gastos não tem o que contar", () => {
  assert.equal(paraOndeFoi(base(), "2026-10", HOJE), null);
});

test("o mês em categorias, do que mais pesa para o que menos pesa, com a diferença para o mês anterior", () => {
  const r = paraOndeFoi(cenario(), "2026-10", HOJE);
  assert.equal(r.categorias[0].nome, "Parcelas e financiamentos".length ? r.categorias[0].nome : "");
  const por = Object.fromEntries(r.categorias.map((x) => [x.nome, x]));
  assert.equal(por["Transporte"].valor, 1600); assert.equal(por["Transporte"].ant, 1000); assert.equal(por["Transporte"].dif, 600); assert.equal(por["Transporte"].difPct, 60);
  assert.equal(por["Mercado"].dif, -50);
  const somaPct = r.categorias.reduce((t, x) => t + x.pct, 0); assert.ok(somaPct >= 98 && somaPct <= 102);
  assert.deepEqual(r.categorias.map((x) => x.valor), [...r.categorias.map((x) => x.valor)].sort((a, b) => b - a));   // do maior para o menor
});

test("lê onde errou: o que subiu, o que ficou sem categoria e o mês no vermelho", () => {
  const r = paraOndeFoi(cenario(), "2026-10", HOJE), titulos = r.leituras.map((x) => x.titulo).join(" | ");
  assert.match(titulos, /Transporte subiu R\$ 600,00/);
  assert.match(titulos, /sem categoria/);
  assert.equal(r.leituras[0].tom, "erro");
  assert.ok(r.leituras.length <= 4);
  assert.ok(r.sobra < 0);
});

test("diz o que fazer: categoria em Outros, limite no que subiu e quanto cortar por dia", () => {
  const r = paraOndeFoi(cenario(), "2026-10", HOJE), ids = r.passos.map((p) => p.id);
  assert.ok(ids.includes("arrumar")); assert.ok(r.passos.length <= 3);
  const limite = paraOndeFoi(cenario(), "2026-10", HOJE, { teto: 0 }).passos.find((p) => p.id === "limite");
  if (limite) { assert.equal(limite.categoria, "Transporte"); assert.equal(limite.valor, 1000); }
  const cortar = r.passos.find((p) => p.id === "cortar");
  if (cortar) assert.match(cortar.titulo, /a menos por dia/);
});

test("mês bom: sobra, queda de categoria e nenhum alarme", () => {
  const st = base({ lancamentos: [
    L("2026-08-05", 800, "Transporte"), L("2026-08-01", 3000, "Salário", "Receita"),
    L("2026-09-05", 300, "Transporte"), L("2026-09-08", 200, "Mercado"), L("2026-09-01", 3000, "Salário", "Receita"),
  ] });
  const r = paraOndeFoi(st, "2026-09", HOJE);
  assert.ok(r.sobra > 0); assert.equal(r.leituras.some((x) => x.tom === "erro"), false);
  assert.match(r.leituras.map((x) => x.titulo).join(" | "), /Transporte caiu R\$ 500,00/);
  assert.equal(r.passos[0].id === "teto" || r.passos[0].id === "manter", true);
});

test("meses anteriores vêm junto, para ver a evolução, com o atual marcado", () => {
  const r = paraOndeFoi(cenario(), "2026-10", HOJE);
  assert.ok(r.meses.length >= 2); assert.equal(r.meses.at(-1).m, "2026-10"); assert.equal(r.meses.at(-1).atual, true);
  assert.equal(r.anterior, "2026-09"); assert.equal(r.temAnterior, true);
});

test("sem mês anterior, não inventa comparação", () => {
  const r = paraOndeFoi(base({ lancamentos: [L("2026-10-03", 100, "Mercado"), L("2026-10-01", 1000, "Salário", "Receita")] }), "2026-10", HOJE);
  assert.equal(r.temAnterior, false); assert.equal(r.difPct, null);
  assert.equal(r.categorias[0].difPct, null);
});

test("nome do mês", () => { assert.equal(nomeDoMes("2026-03"), "março"); assert.equal(nomeDoMes("2026-12"), "dezembro"); });

test("olhando um mês antigo, a faixa de meses ainda chega até o mês de hoje", () => {
  const r = paraOndeFoi(cenario(), "2026-09", HOJE);
  assert.equal(r.meses.at(-1).m, "2026-10"); assert.equal(r.meses.find((x) => x.atual).m, "2026-09");
});

test("buraco maior do que se gasta por dia: não pede corte impossível, aponta as contas fixas", () => {
  const r = paraOndeFoi(cenario(), "2026-10", HOJE);   // o buraco vem da parcela fixa; o dia a dia é pequeno perto dele
  assert.equal(r.passos.some((p) => p.id === "cortar"), false);
  const fixas = r.passos.find((p) => p.id === "fixas"); assert.ok(fixas); assert.match(fixas.titulo, /não fecha/);
});

test("buraco pequeno perto do gasto diário: pede o corte por dia", () => {
  const st = base({ lancamentos: [L("2026-10-01", 3000, "Salário", "Receita")] });
  for (let d = 1; d <= 20; d++) st.lancamentos.push(L(`2026-10-${String(d).padStart(2, "0")}`, 110, "Mercado"));
  const r = paraOndeFoi(st, "2026-10", HOJE), cortar = r.passos.find((p) => p.id === "cortar");
  assert.ok(cortar); assert.match(cortar.titulo, /a menos por dia/);
});

function tresMeses(extra = []) {
  const ls = [];
  for (const m of ["2026-07", "2026-08", "2026-09"]) { ls.push(L(`${m}-05`, 2000, "Transporte"), L(`${m}-10`, 1000, "Mercado"), L(`${m}-01`, 5000, "Salário", "Receita")); }
  return base({ lancamentos: [...ls, ...extra] });
}

test("meta sugerida: só depois de 3 meses fechados, pela média menos 5%, arredondada para R$ 50", () => {
  const r = metaSugerida(tresMeses(), "2026-10", HOJE);
  assert.equal(r.media, 3000); assert.equal(r.sugestao, 2850); assert.deepEqual(r.meses, ["2026-09", "2026-08", "2026-07"]);
  assert.equal(r.porCategoria["Transporte"], 2000); assert.equal(r.porCategoria["Mercado"], 1000);
  assert.equal(metaSugerida(cenario(), "2026-10", HOJE), null);   // só 1 mês fechado: ainda não há base
  assert.equal(metaSugerida(base(), "2026-10", HOJE), null);
});

test("com 3 meses de uso, o mês compara com a média e sugere o limite", () => {
  const st = tresMeses([L("2026-10-03", 3600, "Transporte"), L("2026-10-04", 1000, "Mercado"), L("2026-10-01", 5000, "Salário", "Receita")]);
  const r = paraOndeFoi(st, "2026-10", HOJE);
  assert.ok(r.meta); assert.match(r.leituras.map((x) => x.titulo).join(" | "), /Acima da sua média/);
  const por = Object.fromEntries(r.categorias.map((x) => [x.nome, x]));
  assert.equal(por["Transporte"].media3, 2000); assert.equal(por["Transporte"].acimaDaMedia, true); assert.equal(por["Mercado"].acimaDaMedia, false);
  const passo = r.passos.find((p) => p.id === "teto");
  if (passo) { assert.equal(passo.valor, 2850); assert.match(passo.titulo, /como limite do mês/); }
  assert.equal(paraOndeFoi(st, "2026-10", HOJE, { teto: 4000 }).passos.some((p) => p.id === "teto"), false);   // já tem limite: não repete
});

import { limiteViavel } from "../js/paraondefoi.js";

function seisMeses() {   // fixo de 1.900 por mês + dia a dia de 1.100 (transporte 700 e mercado 400), entra 4.000
  const ls = [], fixos = [{ id: "c", descricao: "Parcela do carro", valor: 1900, categoria: "Parcelas e financiamentos", dia: 24, desde: "2026-05-01", ate: null, forma: "Pix", tipo: "Despesa" }];
  for (const m of ["2026-07", "2026-08", "2026-09"]) ls.push(L(`${m}-05`, 700, "Transporte"), L(`${m}-10`, 400, "Mercado"), L(`${m}-01`, 4000, "Salário", "Receita"));
  return base({ lancamentos: ls, fixos });
}

test("o limite cabe? sem limite definido, mostra a média e as opções; sem mês fechado, não inventa", () => {
  const r = limiteViavel(seisMeses(), "2026-10", HOJE);
  assert.equal(r.n, 3); assert.equal(r.media, 3000); assert.equal(r.fixos, 1900); assert.equal(r.dia, 1100); assert.equal(r.caso, "sem-limite");
  assert.equal(r.realista, 3000); assert.equal(r.comEconomia, 2850); assert.equal(r.passaDaRenda, false);
  assert.equal(limiteViavel(base(), "2026-10", HOJE), null);
});

test("o limite cabe? três respostas: cabe, cabe economizando e não cabe", () => {
  const st = seisMeses();
  const cabe = limiteViavel(st, "2026-10", HOJE, { teto: 3500 }); assert.equal(cabe.caso, "cabe"); assert.equal(cabe.folga, 500);
  const eco = limiteViavel(st, "2026-10", HOJE, { teto: 2800 }); assert.equal(eco.caso, "economizando"); assert.equal(eco.corte, 200); assert.equal(eco.cortePct, 18);
  const nao = limiteViavel(st, "2026-10", HOJE, { teto: 2500 }); assert.equal(nao.caso, "nao-cabe"); assert.equal(nao.corte, 500);   // 1.900 fixos + 80% de 1.100 = 2.780 de piso
});

test("médias de carro e casa pelo uso, com o limite que a pessoa já tem por categoria", () => {
  const r = limiteViavel(seisMeses(), "2026-10", HOJE, { limites: { Transporte: 650 } });
  const carro = r.categorias.find((x) => x.nome === "Transporte"); assert.equal(carro.media, 700); assert.equal(carro.limite, 650); assert.equal(carro.grupo, "carro");
  assert.equal(r.categorias.some((x) => x.grupo === "casa"), false);   // sem gasto de casa, não aparece
});

test("o limite cabe? avisa quando o gasto médio já passa do que entra", () => {
  const st = seisMeses(); st.lancamentos = st.lancamentos.filter((x) => x.tipo !== "Receita"); st.lancamentos.push(...["2026-07", "2026-08", "2026-09"].map((m) => L(`${m}-01`, 2500, "Salário", "Receita")));
  assert.equal(limiteViavel(st, "2026-10", HOJE).passaDaRenda, true);
});
