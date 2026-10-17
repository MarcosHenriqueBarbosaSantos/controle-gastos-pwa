// Testes das ferramentas extras: desempenho, calculadoras, desafio, resumo do ano, subcategorias, outra moeda, mensagem do banco, CSV e PDF.
import test from "node:test";
import assert from "node:assert/strict";
import { desempenhoDoMes, rendimentoDeGuardar, quantoGuardarPorMes, parcelaComJuros, jurosCompostos, ferias, decimoTerceiro, criaDesafio, valorDaSemana, totalDoDesafio,
  andamentoDoDesafio, resumoDoAno, valorEmReais, textoDaMoeda, entendeMensagemBanco, csvDoAno, relatorioEmLinhas, pdfDeLinhas, paiDaCategoria, filhoDaCategoria, nomeDeSub, agrupaPorPai, moeda } from "../js/extras.js";

const L = (data, categoria, valor, tipo = "Despesa", forma = "Pix", descricao = "") => ({ id: data + categoria + valor, data, descricao, tipo, categoria, forma, valor });
const fixo = (id, tipo, descricao, dia, valor) => ({ id, tipo, descricao, categoria: tipo === "Receita" ? "Salário" : "Moradia", dia, valor, forma: tipo === "Receita" ? "" : "Boleto", desde: "2026-01-01", ate: null });
const base = (lanc = []) => ({ lancamentos: lanc, fixos: [fixo("r", "Receita", "Salário", 5, 3000), fixo("a", "Despesa", "Aluguel", 10, 1000)], pagos: [], faturas: [], cartoes: [] });
const HOJE = "2026-10-20";

test("moeda: sempre com espaço comum e sinal na frente", () => {
  assert.equal(moeda(1234.5), "R$ 1.234,50");
  assert.equal(moeda(-10), "- R$ 10,00");
  assert.equal(moeda(0), "R$ 0,00");
});

test("subcategorias: pai, filho e soma na categoria de cima", () => {
  assert.equal(nomeDeSub("Mercado", " Feira "), "Mercado › Feira");
  assert.equal(paiDaCategoria("Mercado › Feira"), "Mercado"); assert.equal(paiDaCategoria("Lazer"), "Lazer");
  assert.equal(filhoDaCategoria("Mercado › Feira"), "Feira"); assert.equal(filhoDaCategoria("Lazer"), "");
  assert.deepEqual(agrupaPorPai([["Mercado › Feira", 10], ["Lazer", 30], ["Mercado", 5.5]]), [["Lazer", 30], ["Mercado", 15.5]]);
});

test("desempenho: compara com o mês anterior em frases", () => {
  const st = base([L("2026-09-05", "Mercado", 400), L("2026-09-08", "Lazer", 100), L("2026-10-05", "Mercado", 200), L("2026-10-10", "Lazer", 300)]);
  const f = desempenhoDoMes(st, "2026-10", HOJE);
  assert.ok(f.length >= 2 && f.length <= 5);
  assert.ok(f.some((x) => x.tom === "good" && /50% menos com Mercado do que em setembro/.test(x.texto)), JSON.stringify(f));
  assert.ok(f.some((x) => x.tom === "warn" && /200% mais com Lazer/.test(x.texto)), JSON.stringify(f));
  assert.deepEqual(desempenhoDoMes(st, "2026-12", HOJE), []);
});

test("desempenho: categoria sem gasto no mês não vira \"100% menos\"", () => {
  const st = base([L("2026-09-05", "Mercado", 400), L("2026-09-08", "Lazer", 100), L("2026-10-05", "Lazer", 100)]);
  const f = desempenhoDoMes(st, "2026-10", HOJE);
  assert.ok(f.some((x) => /ainda não gastou com Mercado/.test(x.texto)), JSON.stringify(f));
  assert.ok(f.every((x) => !/100% menos/.test(x.texto)));
  assert.ok(f.some((x) => /fica R\$|fica -|fica \- /.test(x.texto) || /prevista para o mês \(.*\) fica/.test(x.texto) || !/ficou/.test(x.texto)));
});

test("desempenho: sem mês anterior não inventa comparação", () => {
  const f = desempenhoDoMes({ ...base([L("2026-10-05", "Mercado", 200)]), fixos: [] }, "2026-10", HOJE);
  assert.ok(f.every((x) => !/que o de/.test(x.texto)));
});

test("calculadoras: rendimento, quanto guardar, parcela com juros, juros compostos", () => {
  assert.deepEqual(rendimentoDeGuardar({ porMes: 100, meses: 12, taxaAnual: 0 }), { total: 1200, aportado: 1200, rendimento: 0 });
  const r = rendimentoDeGuardar({ porMes: 100, inicial: 1000, meses: 12, taxaAnual: 12 });
  assert.ok(r.total > 2200 && r.rendimento > 0 && r.aportado === 2200);
  assert.equal(rendimentoDeGuardar({ porMes: -1, meses: 12 }), null);
  assert.equal(rendimentoDeGuardar({ porMes: 100, meses: 0 }), null);
  assert.deepEqual(quantoGuardarPorMes({ alvo: 1200, meses: 12 }), { porMes: 100, jaBasta: false });
  const q = quantoGuardarPorMes({ alvo: 12000, meses: 12, taxaAnual: 10 });
  assert.ok(q.porMes < 1000 && q.porMes > 900);
  assert.equal(quantoGuardarPorMes({ alvo: 100, meses: 6, inicial: 500 }).jaBasta, true);
  assert.deepEqual(parcelaComJuros({ valor: 1200, parcelas: 12, taxaMes: 0 }), { parcela: 100, total: 1200, juros: 0 });
  const p = parcelaComJuros({ valor: 1000, parcelas: 10, taxaMes: 2 });
  assert.equal(p.parcela, 111.33); assert.ok(p.juros > 100);
  assert.deepEqual(jurosCompostos({ capital: 1000, taxaMes: 1, meses: 2 }), { montante: 1020.1, juros: 20.1 });
  assert.equal(jurosCompostos({ capital: 0, taxaMes: 1, meses: 2 }), null);
});

test("férias e 13º em valor bruto", () => {
  assert.deepEqual(ferias({ salario: 3000 }), { dias: 30, base: 3000, terco: 1000, abono: 0, total: 4000 });
  assert.deepEqual(ferias({ salario: 3000, dias: 30, vender: true }), { dias: 20, base: 2000, terco: 666.67, abono: 1333.33, total: 4000 });
  assert.equal(ferias({ salario: 3000, dias: 2 }), null);
  assert.deepEqual(decimoTerceiro({ salario: 3000, meses: 6 }), { total: 1500, primeira: 750, segunda: 750 });
  assert.equal(decimoTerceiro({ salario: 3000, meses: 13 }), null);
});

test("desafio: valores das semanas, total e andamento", () => {
  const d = criaDesafio({ caixinha: "Viagem", modo: "crescente", base: 1, semanas: 52, inicio: "2026-10-05" });
  assert.equal(d.nome, "Desafio de economia");
  assert.equal(valorDaSemana(d, 1), 1); assert.equal(valorDaSemana(d, 52), 52); assert.equal(valorDaSemana(d, 53), 0);
  assert.equal(totalDoDesafio(d), 1378);
  assert.equal(valorDaSemana({ ...d, modo: "decrescente" }, 1), 52); assert.equal(valorDaSemana({ ...d, modo: "fixo", base: 10 }, 30), 10);
  let a = andamentoDoDesafio(d, "2026-10-04"); assert.deepEqual([a.comecou, a.atual, a.proxima], [false, 0, 1]);
  a = andamentoDoDesafio(d, "2026-10-20");   // 15 dias depois: semana 3
  assert.deepEqual([a.atual, a.atrasadas, a.proxima, a.valorProxima, a.daSemanaAtual], [3, [1, 2], 1, 1, true]);
  d.feitas = [1, 2, 3, 3, 99];
  a = andamentoDoDesafio(d, "2026-10-20");
  assert.deepEqual([a.feitas, a.guardado, a.falta, a.atrasadas, a.proxima, a.daSemanaAtual, a.fim], [[1, 2, 3], 6, 1372, [], 4, false, "2027-10-03"]);
  assert.equal(criaDesafio({ caixinha: "", base: 1, inicio: "2026-10-05" }), null);
  assert.equal(criaDesafio({ caixinha: "A", base: 0, inicio: "2026-10-05" }), null);
  assert.equal(criaDesafio({ caixinha: "A", base: 1, semanas: 2, inicio: "2026-10-05" }), null);
  assert.equal(criaDesafio({ caixinha: "A", base: 1, modo: "x", inicio: "2026-10-05" }), null);
});

test("resumo do ano: meses, totais, melhor e pior mês e categorias com subcategoria somada", () => {
  const st = base([L("2026-09-05", "Mercado › Feira", 100), L("2026-09-06", "Mercado", 50), L("2026-10-05", "Lazer", 500)]);
  const r = resumoDoAno(st, "2026", HOJE);
  assert.equal(r.meses.length, 12); assert.ok(r.meses[11].fase === "futuro" && !r.meses[11].tem);
  assert.ok(r.mesesComDados >= 2);
  assert.equal(r.categorias.find((c) => c.nome === "Mercado").valor, 150);
  assert.ok(r.melhor && r.pior && r.melhor.sobra >= r.pior.sobra);
  assert.equal(r.custo, r.meses.filter((x) => x.tem).reduce((t, x) => t + x.custo, 0));
});

test("outra moeda: converte com a cotação informada", () => {
  assert.equal(valorEmReais(20, 5.4), 108); assert.equal(valorEmReais(0, 5), null); assert.equal(valorEmReais(10, -1), null);
  assert.equal(textoDaMoeda("USD", 20), "US$ 20,00"); assert.equal(textoDaMoeda("EUR", 1234.5), "€ 1.234,50"); assert.equal(textoDaMoeda("XXX", 3), "XXX 3,00");
});

test("mensagem do banco: compra no cartão", () => {
  const f = entendeMensagemBanco("Compra aprovada no cartão final 1234 de R$ 32,50 em MERCADO SANTA LUZIA hoje às 10:30", HOJE);
  assert.deepEqual([f.valor, f.tipo, f.forma, f.descricao, f.data], [32.5, "Despesa", "Cartão de crédito", "Mercado Santa Luzia", HOJE]);
});
test("mensagem do banco: Pix enviado e Pix recebido", () => {
  let f = entendeMensagemBanco("Pix enviado: você pagou R$ 50,00 para JOAO DA SILVA", HOJE);
  assert.deepEqual([f.valor, f.tipo, f.forma, f.descricao], [50, "Despesa", "Pix", "Joao da Silva"]);
  f = entendeMensagemBanco("Você recebeu um Pix de MARIA SOUZA no valor de R$ 1.200,00", HOJE);
  assert.deepEqual([f.valor, f.tipo, f.forma, f.descricao], [1200, "Receita", "Pix", "Maria Souza"]);
});
test("mensagem do banco: débito com data e compra parcelada", () => {
  let f = entendeMensagemBanco("Compra no débito de R$ 20,00 aprovada em PADARIA PAO QUENTE 12/10", HOJE);
  assert.deepEqual([f.valor, f.forma, f.descricao, f.data], [20, "Débito", "Padaria Pao Quente", "2026-10-12"]);
  f = entendeMensagemBanco("Compra aprovada R$ 300,00 em 3x em LOJA CENTRAL", HOJE);
  assert.deepEqual([f.valor, f.parcelas, f.forma, f.descricao], [300, 3, "Cartão de crédito", "Loja Central"]);
  f = entendeMensagemBanco("Compra de R$ 15,90 em IFOOD 28/12", HOJE);   // dezembro ainda não chegou: é do ano passado
  assert.equal(f.data, "2025-12-28");
});
test("mensagem do banco: sem valor ou texto estranho não inventa nada", () => {
  const f = entendeMensagemBanco("Seu extrato está disponível no app", HOJE);
  assert.equal(f.valor, undefined); assert.equal(f.tipo, "Despesa");
  assert.equal(entendeMensagemBanco("", HOJE).valor, undefined);
  assert.equal(entendeMensagemBanco("Transferência de R$ 10,00 em 31/02", HOJE).data, undefined);
});

test("CSV: separador ponto e vírgula, vírgula decimal, aspas e proteção contra fórmula", () => {
  const st = base([L("2026-10-05", "Mercado", 12.5, "Despesa", "Pix", 'Feira; "boa"'), L("2026-10-06", "Lazer", 30, "Despesa", "Pix", "=SOMA(A1)"), L("2025-01-01", "X", 1)]);
  const csv = csvDoAno(st, "2026");
  assert.ok(csv.startsWith("﻿Data;Tipo;Categoria;Descrição;Forma de pagamento;Valor;Origem\r\n"));
  assert.ok(csv.includes('05/10/2026;Despesa;Mercado;"Feira; ""boa""";Pix;12,50;Lançamento'));
  assert.ok(csv.includes("'=SOMA(A1)"));
  assert.ok(!csv.includes("01/01/2025"));
  assert.ok(csv.includes("Aluguel") && csv.includes("Salário") && csv.includes(";Fixo"));
});

test("PDF: cabeçalho, páginas, tabela de endereços e acentos", () => {
  const st = base([L("2026-10-05", "Mercado", 12.5, "Despesa", "Pix", "Pão (grande) \\ café — ok")]);
  const linhas = relatorioEmLinhas(st, "2026", HOJE);
  assert.ok(linhas[0].t.startsWith("Meus Gastos - Relatório de 2026"));
  const bytes = pdfDeLinhas(linhas), txt = Buffer.from(bytes).toString("latin1");
  assert.ok(txt.startsWith("%PDF-1.4") && txt.trimEnd().endsWith("%%EOF"));
  assert.ok(txt.includes("Pão \\(grande\\) \\\\ café - ok"));
  // cada entrada do xref aponta para "N 0 obj"
  const start = Number(txt.match(/startxref\n(\d+)/)[1]), tabela = txt.slice(start).split("\n").slice(3).filter((l) => /^\d{10} 00000 n/.test(l));
  assert.ok(tabela.length >= 5);
  tabela.forEach((l, i) => assert.ok(txt.slice(Number(l.slice(0, 10))).startsWith(`${i + 1} 0 obj`)));
  // muitas linhas viram mais de uma página
  const longo = pdfDeLinhas(Array.from({ length: 150 }, (_, i) => ({ t: "linha " + i })));
  assert.equal((Buffer.from(longo).toString("latin1").match(/\/Type \/Page /g) || []).length, 3);
});
