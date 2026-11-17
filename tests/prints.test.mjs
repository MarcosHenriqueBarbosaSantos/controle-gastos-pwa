import test from "node:test";
import assert from "node:assert/strict";
import { linhasDasPalavras, leituraDoPrintDeGanhos, diaDoPrint, appDoTexto, colunasDoPrint, lancamentosDosPrints } from "../js/prints.js";

/** Monta palavras de uma "tela": cada item [texto, x, y, altura]. A largura de cada palavra é proporcional ao texto. */
const tela = (itens) => linhasDasPalavras(itens.flatMap(([t, x, y, h]) => { let cx = x; return t.split(" ").map((w) => { const p = { t: w, x0: cx, y0: y, x1: cx + w.length * h * 0.55, y1: y + h }; cx = p.x1 + h * 0.3; return p; }); }));
const APPS = ["uber", "99", "indrive", "particular", "outros"];

test("palavras viram linhas de cima para baixo", () => {
  const l = tela([["Ganhos líquidos", 10, 100, 20], ["R$129,03", 10, 40, 50]]);
  assert.deepEqual(l.map((x) => x.t), ["R$129,03", "Ganhos líquidos"]);
});

test("tela de ganhos do dia: valor grande, dia com ano, km e pedidos em cima do rótulo", () => {
  const l = tela([["21:12 dom., 15 de nov.", 10, 2, 14], ["Dia Semana Mês", 120, 60, 18], ["11 de nov. de 2026", 150, 110, 18], ["R$129,03", 120, 150, 54], ["Ganhos líquidos", 170, 220, 16],
    ["Plano de renda diária R$193", 20, 270, 18], ["4", 90, 340, 20], ["61,7 km", 210, 340, 20], ["R$2,09", 380, 340, 20], ["Pedidos", 60, 370, 16], ["Quilometragem", 190, 370, 16], ["Por km", 370, 370, 16]]);
  const r = leituraDoPrintDeGanhos(l, { apps: APPS, hoje: "2026-11-15", alturaTela: 1000 });
  assert.deepEqual([r.valor, r.data, r.km, r.viagens, r.confianca], [129.03, "2026-11-11", 61.7, 4, "alta"]);
});

test("meta, saldo, bônus e o preço dinâmico do mapa não viram ganho", () => {
  const l = tela([["Renda de hoje", 10, 100, 16], ["R$49,70 Objetivo: R$193,00", 10, 130, 44], ["R$ 13,98 Saldo da carteira", 10, 220, 20], ["+R$ 13,50", 300, 400, 30]]);
  const r = leituraDoPrintDeGanhos(l, { apps: APPS, hoje: "2026-11-15", alturaTela: 1000 });
  assert.equal(r.valor, 49.7); assert.equal(r.confianca, "alta");
  assert.equal(leituraDoPrintDeGanhos(tela([["+R$ 13,50", 10, 100, 30], ["+R$ 7,25", 10, 200, 30]]), { hoje: "2026-11-15" }), null);
});

test("dia: ignora a barra de status e a faixa de uma semana; sem ano, usa o ano certo", () => {
  assert.equal(diaDoPrint(tela([["dom., 15 de nov.", 10, 2, 14]]), "2026-11-15", 1000), null);
  assert.equal(diaDoPrint(tela([["5 de out. - 12 de out.", 10, 80, 18]]), "2026-11-15", 1000), null);
  assert.equal(diaDoPrint(tela([["11 de nov", 10, 300, 22]]), "2026-11-15", 1000), "2026-11-11");
  assert.equal(diaDoPrint(tela([["28 de dez", 10, 300, 22]]), "2026-01-03", 1000), "2025-12-28");
  assert.equal(diaDoPrint(tela([["10/11/2026", 10, 300, 22]]), "2026-11-15", 1000), "2026-11-10");
  assert.equal(diaDoPrint(tela([["20 de nov. de 2026", 10, 300, 22]]), "2026-11-15", 1000), null);   // dia que ainda não chegou
});

test("app pelo nome ou por sinais da tela", () => {
  assert.equal(appDoTexto("Taxa99 (esta semana)", APPS), "99");
  assert.equal(appDoTexto("Ganhos de hoje no inDrive", APPS), "indrive");
  assert.equal(appDoTexto("Página inicial Descubra Ganhos Caixa de entrada Menu", APPS), "uber");
  assert.equal(appDoTexto("Plano de renda diária", APPS), null);
});

test("print de tablet com três apps lado a lado vira três pedaços; celular fica inteiro", () => {
  const W = 300, H = 100, lum = new Uint8ClampedArray(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) lum[y * W + x] = (x * 7 + y * 13) % 255;   // "conteúdo" com variação
  for (const d of [99, 199]) for (let y = 0; y < H; y++) for (let x = d; x < d + 4; x++) lum[y * W + x] = 10;   // divisórias lisas
  const p = colunasDoPrint(lum, W, H);
  assert.equal(p.length, 3); assert.ok(Math.abs(p[1].x0 - 101) <= 2 && Math.abs(p[1].x1 - 201) <= 2);
  assert.deepEqual(colunasDoPrint(new Uint8ClampedArray(100 * 200), 100, 200), [{ x0: 0, x1: 100 }]);
});

test("as leituras viram um lançamento por dia, sem repetir o que já foi lançado", () => {
  const L = [
    { usar: true, data: "2026-11-11", app: "uber", valor: 61.18, km: 40, viagens: 3 },
    { usar: true, data: "2026-11-11", app: "99", valor: 129.03, km: 61.7, viagens: 4 },
    { usar: true, data: "2026-11-11", app: "99", valor: 129.03, km: 0 },          // o mesmo print duas vezes: não soma
    { usar: true, data: "2026-11-10", app: "uber", valor: 80 },
    { usar: false, data: "2026-11-09", app: "uber", valor: 50 },                    // desmarcado
    { usar: true, data: "2026-11-08", app: "uber", valor: 70 },                     // já lançado
  ];
  const r = lancamentosDosPrints(L, (dia, app) => (dia === "2026-11-08" && app === "uber" ? 70 : 0));
  assert.deepEqual(r.dias.map((d) => [d.dia, d.apps, d.viagens]), [["2026-11-10", { uber: 80 }, 0], ["2026-11-11", { uber: 61.18, "99": 129.03 }, 7]]);
  assert.equal(r.dias[1].km, 101.7);
  assert.equal(r.repetidos.length, 1);
});

test("leitura sem app (app em que não ganhou nada) fica de fora e não impede as outras", () => {
  const r = lancamentosDosPrints([
    { usar: true, data: "2026-11-11", app: "uber", valor: 61.18 },
    { usar: true, data: "2026-11-11", app: null, valor: 48.44 },     // o leitor pegou um número de um app sem ganho
  ]);
  assert.deepEqual(r.dias.map((d) => [d.dia, d.apps]), [["2026-11-11", { uber: 61.18 }]]);
});
