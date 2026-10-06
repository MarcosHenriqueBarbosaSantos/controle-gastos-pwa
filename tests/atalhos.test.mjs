// Testes dos atalhos do dia a dia: busca, mais usados, categoria aprendida, meses lado a lado e comparação por categoria.
import test from "node:test";
import assert from "node:assert/strict";
import { buscaLancamentos, maisUsados, categoriaAprendida, ultimosMeses, comparaCategorias, calcMes } from "../js/calc.js";

let n = 0;
const L = (data, descricao, valor, categoria = "Outros", forma = "Pix", tipo = "Despesa", extra = {}) => ({ id: "l" + ++n, data, descricao, valor, categoria, forma, tipo, import_key: null, created_at: data + "T12:00:00Z", ...extra });
const st = (lancamentos, fixos = []) => ({ lancamentos, fixos, pagos: [], faturas: [], cartoes: [] });

const BASE = [
  L("2026-10-05", "Farmácia São João", 47.3, "Saúde"), L("2026-10-04", "Mercado Zaffari", 473.66, "Mercado", "Dinheiro"), L("2026-10-03", "Almoço", 32.5, "Alimentação"),
  L("2026-09-20", "Farmacia Popular", 18, "Saúde", "Débito"), L("2026-09-12", "Almoço", 32.5, "Alimentação"), L("2026-09-05", "Salário", 3900, "Salário", "", "Receita"),
  L("2026-08-30", "Reserva do mês", 300, "Reserva de emergência", "", "Reserva"),
];

test("busca: acha em qualquer mês, sem ligar para acento e maiúscula, do mais recente para o mais antigo", () => {
  const r = buscaLancamentos(BASE, "farmacia");
  assert.deepEqual(r.itens.map((x) => x.descricao), ["Farmácia São João", "Farmacia Popular"]);
  assert.equal(r.total, 2); assert.equal(r.soma, 65.3);
  assert.equal(buscaLancamentos(BASE, "  ALMOÇO ").total, 2);
});

test("busca: por categoria, forma de pagamento, tipo, valor e mais de uma palavra", () => {
  assert.deepEqual(buscaLancamentos(BASE, "saude").itens.map((x) => x.valor), [47.3, 18]);
  assert.deepEqual(buscaLancamentos(BASE, "dinheiro").itens.map((x) => x.descricao), ["Mercado Zaffari"]);
  assert.deepEqual(buscaLancamentos(BASE, "entrada").itens.map((x) => x.descricao), ["Salário"]);
  assert.deepEqual(buscaLancamentos(BASE, "32,50").itens.map((x) => x.data), ["2026-10-03", "2026-09-12"]);
  assert.equal(buscaLancamentos(BASE, "32").total, 2, "valor sem os centavos");
  assert.equal(buscaLancamentos(BASE, "473.66").total, 1, "ponto no lugar da vírgula");
  assert.deepEqual(buscaLancamentos(BASE, "farmacia debito").itens.map((x) => x.descricao), ["Farmacia Popular"], "todas as palavras precisam bater");
  assert.equal(buscaLancamentos([...BASE, L("2026-10-06", "TV", 320)], "32").total, 2, "32 não acha 320,00");
  assert.equal(buscaLancamentos(BASE, "32,5").total, 2);
});

test("busca: vazio não acha nada, a soma conta só os gastos e o limite corta a lista sem mudar o total", () => {
  assert.deepEqual(buscaLancamentos(BASE, "   "), { itens: [], total: 0, soma: 0 });
  assert.equal(buscaLancamentos(BASE, "xyz").total, 0);
  assert.equal(buscaLancamentos(BASE, "salario").soma, 0);
  const muitos = Array.from({ length: 30 }, (_, i) => L(`2026-10-${String(i + 1).padStart(2, "0")}`, "Café", 5));
  const r = buscaLancamentos(muitos, "cafe", 10);
  assert.equal(r.itens.length, 10); assert.equal(r.total, 30); assert.equal(r.soma, 150); assert.equal(r.itens[0].data, "2026-10-30");
});

test("mais usados: só o que se repetiu, com o valor mais comum, do mais frequente para o menos", () => {
  const l = [L("2026-10-01", "Almoço", 25), L("2026-10-02", "almoco", 25), L("2026-10-03", "Almoço", 30, "Alimentação", "Débito"), L("2026-09-20", "Ônibus", 5, "Transporte", "Dinheiro"), L("2026-10-04", "Ônibus", 5, "Transporte", "Dinheiro"),
    L("2026-10-05", "Presente", 95), L("2026-10-05", "Salário", 3900, "Salário", "", "Receita"), L("2026-10-05", "Salário", 3900, "Salário", "", "Receita")];
  assert.deepEqual(maisUsados(l, "2026-10-06"), [{ descricao: "Almoço", categoria: "Alimentação", forma: "Débito", valor: 25, vezes: 3 }, { descricao: "Ônibus", categoria: "Transporte", forma: "Dinheiro", valor: 5, vezes: 2 }]);
});

test("mais usados: ignora o que é antigo, parcelado, importado do extrato ou sem descrição, e respeita o limite", () => {
  const l = [L("2026-05-01", "Velho", 10), L("2026-05-02", "Velho", 10), L("2026-10-01", "Tênis", 100, "Roupas", "Cartão de crédito", "Despesa", { parcelas: 3 }), L("2026-10-02", "Tênis", 100, "Roupas", "Cartão de crédito", "Despesa", { parcelas: 3 }),
    L("2026-10-01", "IFOOD", 40, "Alimentação", "Cartão de crédito", "Despesa", { import_key: "a" }), L("2026-10-02", "IFOOD", 40, "Alimentação", "Cartão de crédito", "Despesa", { import_key: "b" }), L("2026-10-01", "", 7), L("2026-10-02", "", 7)];
  assert.deepEqual(maisUsados(l, "2026-10-06"), []);
  const varios = ["A", "B", "C", "D", "E"].flatMap((d) => [L("2026-10-01", d, 1), L("2026-10-02", d, 1)]);
  assert.equal(maisUsados(varios, "2026-10-06").length, 4); assert.equal(maisUsados(varios, "2026-10-06", 2).length, 2);
  assert.equal(maisUsados([L("2026-10-01", "X", 10), L("2026-10-02", "X", 20)], "2026-10-06")[0].valor, 20, "no empate, o valor mais recente");
});

test("categoria aprendida: vale a última escolha da pessoa para aquela descrição", () => {
  const l = [L("2026-09-01", "Zaffari", 100, "Outros"), L("2026-10-01", "ZAFFARI", 120, "Mercado"), L("2026-10-02", "Tênis (2/3)", 119.9, "Roupas"), L("2026-10-03", "Mercado Zaffari Centro", 80, "Mercado"), L("2026-10-04", "Freela", 500, "Renda extra", "", "Receita")];
  assert.equal(categoriaAprendida(l, "zaffari"), "Mercado", "a correção mais recente vence");
  assert.equal(categoriaAprendida(l, "Tênis"), "Roupas", "a marca da parcela não atrapalha");
  assert.equal(categoriaAprendida(l, "Mercado Zaffari"), "Mercado", "começa com as mesmas duas palavras");
  assert.equal(categoriaAprendida(l, "Mercado Extra"), "", "só a primeira palavra igual não basta");
  assert.equal(categoriaAprendida(l, "Freela", "Receita"), "Renda extra"); assert.equal(categoriaAprendida(l, "Freela"), "", "cada tipo tem o seu histórico");
  assert.equal(categoriaAprendida(l, "Padaria nova"), ""); assert.equal(categoriaAprendida(l, "ab"), ""); assert.equal(categoriaAprendida(l, ""), "");
});

test("últimos meses: entradas, custo e sobra de cada mês, só a partir do primeiro com dados", () => {
  const s = st([L("2026-08-10", "Mercado", 500), L("2026-08-05", "Salário", 3000, "Salário", "", "Receita"), L("2026-09-10", "Mercado", 700), L("2026-09-05", "Salário", 3000, "Salário", "", "Receita"), L("2026-10-03", "Mercado", 200), L("2026-10-05", "Salário", 3000, "Salário", "", "Receita")]);
  const u = ultimosMeses(s, "2026-10", "2026-10-06");
  assert.deepEqual(u.map((x) => [x.m, x.rec, x.custo, x.sobra, x.fase]), [["2026-08", 3000, 500, 2500, "passado"], ["2026-09", 3000, 700, 2300, "passado"], ["2026-10", 3000, 200, 2800, "atual"]]);
  assert.equal(ultimosMeses(s, "2026-10", "2026-10-06", 2).length, 2);
  assert.deepEqual(ultimosMeses(st([]), "2026-10", "2026-10-06"), []);
  assert.equal(ultimosMeses(s, "2027-03", "2026-10-06").length, 6, "olhando um mês futuro, a janela anda junto");
});

test("comparação por categoria: no mês atual, compara até o mesmo dia do mês anterior", () => {
  const s = st([L("2026-09-03", "Mercado", 100, "Mercado"), L("2026-09-20", "Mercado", 400, "Mercado"), L("2026-09-02", "Uber", 50, "Transporte"), L("2026-09-04", "Cinema", 40, "Lazer"),
    L("2026-10-02", "Mercado", 220, "Mercado"), L("2026-10-03", "Uber", 52, "Transporte"), L("2026-10-04", "Tênis", 300, "Roupas")]);
  const r = comparaCategorias(s, calcMes(s, "2026-10", "2026-10-06"), "2026-10");
  assert.equal(r.mes, "2026-09"); assert.equal(r.ate, 6);
  assert.deepEqual(r.por, { Mercado: { antes: 100, agora: 220, dif: 120 }, Lazer: { antes: 40, agora: 0, dif: -40 } }, "Transporte mudou pouco e Roupas não existia: ficam de fora");
});

test("comparação por categoria: mês passado compara o mês inteiro; sem base ou mês futuro, não compara", () => {
  const s = st([L("2026-08-25", "Mercado", 300, "Mercado"), L("2026-09-03", "Mercado", 100, "Mercado"), L("2026-09-20", "Mercado", 400, "Mercado"), L("2026-09-21", "Tênis", 200, "Roupas", "Cartão de crédito")]);
  const r = comparaCategorias(s, calcMes(s, "2026-09", "2026-10-06"), "2026-09");
  assert.equal(r.ate, null); assert.deepEqual(r.por, { Mercado: { antes: 300, agora: 500, dif: 200 } }, "compra no cartão não entra: ela pesa no mês da fatura");
  assert.equal(comparaCategorias(s, calcMes(s, "2026-08", "2026-10-06"), "2026-08"), null, "julho não tem gastos");
  assert.equal(comparaCategorias(s, calcMes(s, "2026-11", "2026-10-06"), "2026-11"), null);
});
