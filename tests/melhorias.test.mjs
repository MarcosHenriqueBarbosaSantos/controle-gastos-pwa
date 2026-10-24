// Testes das melhorias da v72: pílula do limite, fila "Para revisar" e desenho de cada categoria.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { estadoDoLimite, paraRevisar, iconeDaCategoria, ICONES_CATEGORIA, juntaPrefsDoCasal, comumDoCasal } from "../js/calc.js";

const HOJE = "2026-10-20";
let n = 0;
const L = (data, descricao, valor, categoria = "Outros", tipo = "Despesa", extra = {}) => ({ id: `l${++n}`, data, descricao, valor, categoria, tipo, forma: "Pix", ...extra });

test("limite: dentro, perto (80% ou mais) e estourou, com o que ainda cabe", () => {
  assert.deepEqual(estadoDoLimite({ gasto: 320, limite: 800, pct: 40, passou: 0 }), { nivel: "ok", sobra: 480 });
  assert.deepEqual(estadoDoLimite({ gasto: 640, limite: 800, pct: 80, passou: 0 }), { nivel: "perto", sobra: 160 });
  assert.deepEqual(estadoDoLimite({ gasto: 800, limite: 800, pct: 100, passou: 0 }), { nivel: "perto", sobra: 0 });
  assert.deepEqual(estadoDoLimite({ gasto: 860, limite: 800, pct: 108, passou: 60 }), { nivel: "estourou", sobra: 0 });
});

test("para revisar: só 'Outros' dos últimos 60 dias, do mais recente para o mais antigo", () => {
  const st = { lancamentos: [
    L("2026-10-18", "Pix sem nome", 50), L("2026-10-10", "Uber", 30, "Transporte"), L("2026-09-01", "Boleto", 120, "Outros"),
    L("2026-10-19", "Freela", 300, "outros", "Receita"), L("2026-10-19", "Reserva", 100, "Outros", "Reserva"),
    L("2026-07-01", "Antigo", 10), L("2026-10-25", "Futuro", 10),
  ] };
  const r = paraRevisar(st, HOJE);
  assert.deepEqual(r.itens.map((x) => x.descricao), ["Freela", "Pix sem nome", "Boleto"]);   // sem guardado, sem antigo, sem futuro; "outros" em minúscula conta
  assert.equal(r.total, 3); assert.equal(r.soma, 470);
});

test("para revisar: o que a pessoa marcou como certo sai da fila", () => {
  const a = L("2026-10-18", "A", 50), b = L("2026-10-17", "B", 70);
  const r = paraRevisar({ lancamentos: [a, b] }, HOJE, { revisados: [a.id] });
  assert.deepEqual(r.itens.map((x) => x.descricao), ["B"]);
  assert.deepEqual(paraRevisar({ lancamentos: [a, b] }, HOJE, { revisados: [a.id, b.id] }), { itens: [], total: 0, soma: 0 });
  assert.deepEqual(paraRevisar({}, HOJE), { itens: [], total: 0, soma: 0 });
});

test("para revisar: no mesmo dia, o de maior valor vem primeiro; a janela de dias muda o corte", () => {
  const st = { lancamentos: [L("2026-10-18", "Pequeno", 5), L("2026-10-18", "Grande", 500), L("2026-10-01", "Do começo", 40)] };
  assert.deepEqual(paraRevisar(st, HOJE).itens.map((x) => x.descricao), ["Grande", "Pequeno", "Do começo"]);
  assert.deepEqual(paraRevisar(st, HOJE, { dias: 5 }).itens.map((x) => x.descricao), ["Grande", "Pequeno"]);
});

test("desenho padrão vem do nome da categoria", () => {
  const esperado = { Mercado: "carrinho", Alimentação: "talher", Transporte: "carro", Moradia: "casa", "Contas da casa": "raio", "Parcelas e financiamentos": "cartao",
    Educação: "capelo", Saúde: "saude", Beleza: "tesoura", Lazer: "tv", Roupas: "camiseta", Outros: "pontos", Streaming: "tv", Spotify: "musica", Viagem: "aviao", "Algo inventado": "pontos", "": "pontos" };
  for (const [nome, icone] of Object.entries(esperado)) assert.equal(iconeDaCategoria(nome), icone, nome);
  assert.equal(iconeDaCategoria(null), "pontos"); assert.equal(iconeDaCategoria(undefined), "pontos");
});

test("desenho escolhido vale mais que o padrão; subcategoria herda o da categoria de cima", () => {
  assert.equal(iconeDaCategoria("Mercado", { Mercado: "sacola" }), "sacola");
  assert.equal(iconeDaCategoria("Mercado › Feira", { Mercado: "sacola" }), "sacola");
  assert.equal(iconeDaCategoria("Mercado › Feira", { "Mercado › Feira": "bola", Mercado: "sacola" }), "bola");
  assert.equal(iconeDaCategoria("Mercado › Feira"), "carrinho");
  assert.equal(iconeDaCategoria("Mercado", { Mercado: "desenho-que-nao-existe" }), "carrinho");   // escolha inválida é ignorada
  assert.equal(iconeDaCategoria("Mercado", null), "carrinho");
});

test("todo desenho oferecido existe de fato no app", () => {
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  const faltam = ICONES_CATEGORIA.filter((i) => !new RegExp(`\\n\\s+${i}:\\s*"`).test(app));
  assert.deepEqual(faltam, []);
  assert.equal(new Set(ICONES_CATEGORIA).size, ICONES_CATEGORIA.length);
});

test("conta de casal: desenhos e conferidos valem para os dois", () => {
  const prefs = { iconesCat: { Mercado: "sacola" }, revisados: ["a", "b"], avisos: { email: true } };
  assert.deepEqual(comumDoCasal(prefs), { revisados: ["a", "b"], iconesCat: { Mercado: "sacola" } });
  const j = juntaPrefsDoCasal({ revisados: ["b", "c"], iconesCat: { Mercado: "sacola" } }, { revisados: ["a", "b"], iconesCat: { Lazer: "bola" } });
  assert.deepEqual(j.revisados.sort(), ["a", "b", "c"]);
  assert.deepEqual(j.iconesCat, { Mercado: "sacola" });   // vale o de quem convidou, como as outras preferências
  const muitos = Array.from({ length: 400 }, (_, i) => `id${i}`);
  assert.equal(juntaPrefsDoCasal({ revisados: muitos }, {}).revisados.length, 300);
});

import { desempenhoDoMes } from "../js/extras.js";

test("meu desempenho: 'Outros' não é comemorado nem lamentado, só vira um chamado para dar categoria", () => {
  const D = (data, valor, categoria) => ({ id: `d${++n}`, data, valor, categoria, tipo: "Despesa", descricao: categoria, forma: "Pix" });
  const st = { fixos: [], faturas: [], pagos: [], cartoes: [], lancamentos: [
    D("2026-09-05", 5000, "Outros"), D("2026-09-06", 300, "Mercado"), { ...D("2026-09-01", 8000, "Salário"), tipo: "Receita" },
    D("2026-10-05", 800, "Outros"), D("2026-10-06", 500, "Mercado"), { ...D("2026-10-01", 8000, "Salário"), tipo: "Receita" } ] };
  const textos = desempenhoDoMes(st, "2026-10", "2026-10-20").map((x) => x.texto).join(" | ");
  assert.doesNotMatch(textos, /menos com Outros|mais com Outros/);
  assert.match(textos, /Mercado/);
});

import { itemNaLista } from "../js/extras.js";
test("itemNaLista acha o mesmo item sem ligar para maiúscula, acento ou espaço", () => {
  const l = [{ nome: "Feijão  Preto" }, { nome: "Arroz" }];
  assert.equal(itemNaLista(l, " feijao preto "), l[0]);
  assert.equal(itemNaLista(l, "ARROZ"), l[1]);
  assert.equal(itemNaLista(l, "Macarrão"), null);
  assert.equal(itemNaLista(l, "   "), null);
  assert.equal(itemNaLista(undefined, "Arroz"), null);
});
