// Testes dos atalhos do dia a dia: busca, mais usados, categoria aprendida, meses lado a lado e comparação por categoria.
import test from "node:test";
import assert from "node:assert/strict";
import { buscaLancamentos, maisUsados, categoriaAprendida, ultimoParecido, descricoesParecidas, ultimosMeses, comparaCategorias, calcMes } from "../js/calc.js";

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

test("último parecido: devolve o lançamento inteiro, para repetir categoria, forma e cartão", () => {
  const l = [L("2026-09-01", "Mercado do mês", 500, "Mercado", "Pix"), L("2026-10-01", "mercado do mes", 520, "Mercado", "Cartão de crédito", "Despesa", { cartao_id: "k1" })];
  const u = ultimoParecido(l, "Mercado do mês");
  assert.equal(u.forma, "Cartão de crédito"); assert.equal(u.cartao_id, "k1"); assert.equal(u.categoria, "Mercado");
  assert.equal(ultimoParecido(l, "Me"), null); assert.equal(ultimoParecido(l, "Padaria"), null);
});

test("descrições parecidas: completa pelo começo de qualquer palavra, com o que foi feito da última vez", () => {
  const l = [L("2026-10-01", "Supermercado Dia", 90, "Mercado", "Débito"), L("2026-10-03", "Supermercado Dia", 95, "Mercado", "Cartão de crédito", "Despesa", { cartao_id: "k1" }),
    L("2026-10-02", "Pão de Açúcar Super", 60, "Mercado", "Pix"), L("2026-10-04", "Suco", 8, "Alimentação", "Dinheiro"), L("2026-10-05", "Tênis (2/3)", 119.9, "Roupas"),
    L("2026-10-05", "Supino aula", 50, "Saúde", "Pix", "Receita")];
  const r = descricoesParecidas(l, "su", "Despesa", "2026-10-06");
  assert.deepEqual(r.map((x) => x.descricao), ["Supermercado Dia", "Suco", "Pão de Açúcar Super"], "primeiro o que começa com o texto e mais se repete; cada tipo tem o seu");
  assert.deepEqual(r[0], { descricao: "Supermercado Dia", categoria: "Mercado", forma: "Cartão de crédito", cartao_id: "k1", vezes: 2 });
  assert.deepEqual(descricoesParecidas(l, "ten", "Despesa", "2026-10-06").map((x) => x.descricao), ["Tênis"], "sem acento e sem a marca da parcela");
  assert.deepEqual(descricoesParecidas(l, "suco", "Despesa", "2026-10-06"), [], "o que já foi digitado inteiro não é sugerido");
  assert.deepEqual(descricoesParecidas(l, "s", "Despesa", "2026-10-06"), [], "uma letra só ainda não sugere");
  assert.equal(descricoesParecidas(l, "su", "Despesa", "2026-10-06", 1).length, 1);
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

/* ---------- calendário de vencimentos ---------- */
import { calendarioDoMes } from "../js/calc.js";
test("calendário: contas e entradas de cada dia, com a situação de cada conta", () => {
  const fixos = [
    { id: "f1", tipo: "Despesa", descricao: "Aluguel", categoria: "Moradia", dia: 10, valor: 1100, forma: "Boleto", desde: "2026-01-01", ate: null },
    { id: "f2", tipo: "Despesa", descricao: "Internet", categoria: "Contas da casa", dia: 3, valor: 99.9, forma: "Débito", desde: "2026-01-01", ate: null },
    { id: "f3", tipo: "Despesa", descricao: "Luz", categoria: "Contas da casa", dia: 6, valor: 150, forma: "Boleto", desde: "2026-01-01", ate: null },
    { id: "f4", tipo: "Despesa", descricao: "Celular", categoria: "Contas da casa", dia: 12, valor: 55, forma: "Cartão de crédito", desde: "2026-01-01", ate: null },
    { id: "f5", tipo: "Despesa", descricao: "Seguro", categoria: "Outros", dia: 31, valor: 80, forma: "Boleto", desde: "2026-01-01", ate: null },
    { id: "s1", tipo: "Receita", descricao: "Salário", categoria: "Salário", dia: 5, valor: 3900, forma: "", desde: "2026-01-01", ate: null },
  ];
  const s = { lancamentos: [], fixos, pagos: [{ fixo_id: "f2", mes: "2026-10-01" }], cartoes: [],
    faturas: [{ id: "c1", cartao: "Roxo", vencimento: "2026-10-08", valor: 300.9, status: "Aberta" }, { id: "c2", cartao: "Azul", vencimento: "2026-10-03", valor: 50, status: "Paga" }] };
  const cal = calendarioDoMes(s, "2026-10", "2026-10-06");
  assert.equal(cal.dias.length, 31); assert.equal(cal.vazios, 4, "1º de outubro de 2026 é uma quinta-feira");
  const d = (n) => cal.dias[n - 1];
  assert.deepEqual(d(3).contas.map((x) => [x.titulo, x.situacao]), [["Fatura Azul", "paga"], ["Internet", "paga"]]); assert.equal(d(3).aPagar, 0); assert.equal(d(3).situacao, "paga");
  assert.deepEqual([d(6).contas[0].titulo, d(6).situacao, d(6).aPagar], ["Luz", "hoje", 150]);
  assert.deepEqual([d(8).contas[0].titulo, d(8).situacao], ["Fatura Roxo", "a vencer"]);
  assert.deepEqual(d(5).entradas, [{ titulo: "Salário", valor: 3900 }]); assert.equal(d(5).contas.length, 0); assert.equal(d(5).situacao, "");
  assert.equal(d(12).contas.length, 0, "fixo no cartão não aparece: ele é pago junto com a fatura");
  assert.equal(d(31).contas[0].titulo, "Seguro");
  assert.deepEqual([cal.aPagar, cal.pago, cal.entra], [1630.9, 149.9, 3900]);
  // um dia depois, a luz que não foi marcada vira atrasada
  assert.equal(calendarioDoMes(s, "2026-10", "2026-10-07").dias[5].situacao, "atrasada");
  // mês curto: o dia 31 cai no último dia
  assert.equal(calendarioDoMes(s, "2026-11", "2026-10-06").dias[29].contas[0].titulo, "Seguro");
  assert.equal(calendarioDoMes({ lancamentos: [], fixos: [], pagos: [], faturas: [], cartoes: [] }, "2026-10", "2026-10-06").aPagar, 0);
});
