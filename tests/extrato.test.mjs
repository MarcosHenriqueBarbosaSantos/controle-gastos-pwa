// Testes da importação do extrato do cartão (CSV, OFX e planilha).
// Os arquivos de tests/fixtures/extratos imitam o que os bancos exportam; os nomes e valores são inventados.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { leExtrato, leLinhas, leData, decodifica, separaCsv, separaParcela, faturaProvavel, dataNaFatura, comChaves, chaveDoItem, ehExtrato, ehPlanilha } from "../js/extrato.js";
import { guessCat } from "../js/excel.js";
import { mesDaFatura } from "../js/calc.js";

const HOJE = "2026-10-04";
const abre = (nome) => leExtrato({ texto: decodifica(readFileSync(new URL("./fixtures/extratos/" + nome, import.meta.url))), hoje: HOJE });
const resumo = (l) => l.map((x) => [x.data, x.descricao, x.valor, `${x.parcela}/${x.de}`]);
const CARTAO = { id: "abcdef12-3456", fechamento: 1, vencimento: 8 };   // fecha dia 1, vence dia 8

test("CSV do Nubank: compras positivas, pagamento e estorno ficam de fora", () => {
  const r = abre("nubank.csv");
  assert.equal(r.formato, "csv"); assert.equal(r.compras.length, 8);
  assert.deepEqual(resumo(r.compras).slice(0, 4), [["2026-09-02", "Mercado Extra", 312.45, "1/1"], ["2026-09-05", "Posto Shell", 180, "1/1"], ["2026-09-11", "Netflix.com", 55.9, "1/1"], ["2026-09-14", "Magazine Luiza", 129.9, "3/10"]]);
  assert.deepEqual(r.pagamentos.map((x) => x.valor), [1105.9]);
  assert.deepEqual(r.estornos.map((x) => [x.descricao, x.valor]), [["Estorno de Loja Virtual", 40]]);
  assert.ok(r.compras.some((x) => x.descricao === "Farmacia Sao Joao, Centro"), "vírgula dentro de aspas não quebra a coluna");
});

test("CSV com ponto e vírgula, linhas antes do título, R$ e vírgula nos centavos (Inter)", () => {
  const r = abre("inter.csv");
  assert.deepEqual(resumo(r.compras), [["2026-09-02", "SUPERMERCADO BOM PRECO", 245.3, "1/1"], ["2026-09-06", "UBER *TRIP", 23.9, "1/1"], ["2026-09-12", "LOJAS RENNER", 79.98, "2/5"], ["2026-09-25", "SMART FIT", 1119.9, "1/1"]]);
  assert.deepEqual(r.pagamentos.map((x) => x.valor), [1250]); assert.equal(r.compras[0].catBanco, "SUPERMERCADO");
});

test("CSV com coluna de parcela e valor em dólar ao lado (C6): usa o valor em reais", () => {
  const r = abre("c6.csv");
  assert.deepEqual(resumo(r.compras), [["2026-09-03", "IFOOD *IFOOD", 64.9, "1/1"], ["2026-09-07", "AMAZON BR", 89.91, "4/12"], ["2026-09-19", "OPENAI *CHATGPT", 112.4, "1/1"]]);
  assert.deepEqual(r.pagamentos.map((x) => x.valor), [950]);
  assert.ok(!r.compras.some((x) => /RAFAEL/.test(x.descricao)), "o nome impresso no cartão não é a descrição");
});

test("arquivo sem linha de título: acha as colunas pelo conteúdo", () => {
  assert.deepEqual(resumo(abre("sem-titulo.txt").compras), [["2026-09-03", "Cinema Center", 48, "1/1"], ["2026-09-09", "Livraria Leitura", 92.7, "1/1"], ["2026-09-21", "Posto Ipiranga", 150, "1/1"]]);
});

test("OFX: compra é o valor negativo, acentos no padrão antigo do Windows e código do banco em cada compra", () => {
  const r = abre("cartao.ofx");
  assert.equal(r.formato, "ofx");
  assert.deepEqual(resumo(r.compras), [["2026-09-02", "Mercado São José", 312.45, "1/1"], ["2026-09-14", "Eletrônicos Ponto", 129.9, "2/6"], ["2026-09-20", "Farmácia Pague Menos", 86.12, "1/1"]]);
  assert.deepEqual(r.pagamentos.map((x) => x.valor), [1105.9]); assert.equal(r.compras[0].id, "66f1a2b3-0001");
});

test("planilha (linhas já abertas): data como número do Excel e valor como número", () => {
  const r = leExtrato({ linhas: [["Fatura do cartão", null, null], ["data", "lançamento", "valor"], [46267, "Padaria", 18.5], ["03/09/2026", "Mercado", 250], [null, "Total", 268.5]], hoje: HOJE });
  assert.equal(r.formato, "planilha");
  assert.deepEqual(resumo(r.compras), [["2026-09-02", "Padaria", 18.5, "1/1"], ["2026-09-03", "Mercado", 250, "1/1"]]);
});

test("arquivo que não é extrato não devolve nada", () => {
  for (const texto of ["", "nome;telefone\nAna;11 99999-0000", "isto é só um texto"]) assert.deepEqual(leExtrato({ texto, hoje: HOJE }).compras, []);
  assert.deepEqual(leLinhas([], HOJE), []);
});

test("parcela: reconhece os jeitos mais comuns e limpa a descrição", () => {
  assert.deepEqual(separaParcela("Magazine Luiza - Parcela 3/10"), { descricao: "Magazine Luiza", parcela: 3, de: 10 });
  assert.deepEqual(separaParcela("LOJA X (2/6)"), { descricao: "LOJA X", parcela: 2, de: 6 });
  assert.deepEqual(separaParcela("CASAS BAHIA 03/12"), { descricao: "CASAS BAHIA", parcela: 3, de: 12 });
  assert.deepEqual(separaParcela("Loja Y PARC 1 DE 4"), { descricao: "Loja Y", parcela: 1, de: 4 });
  assert.deepEqual(separaParcela("Amazon", "4/12"), { descricao: "Amazon", parcela: 4, de: 12 });
  assert.deepEqual(separaParcela("Amazon", "Única"), { descricao: "Amazon", parcela: 1, de: 1 });
  assert.deepEqual(separaParcela("Posto 24/7 Centro"), { descricao: "Posto 24/7 Centro", parcela: 1, de: 1 });   // 24/7 no meio do nome não é parcela
  assert.deepEqual(separaParcela("Bar 13/05"), { descricao: "Bar 13/05", parcela: 1, de: 1 });                     // 13 de 5 não existe
});

test("datas: vários formatos, e sem ano fica no passado mais próximo", () => {
  assert.equal(leData("2026-09-02", HOJE), "2026-09-02"); assert.equal(leData("02/09/2026", HOJE), "2026-09-02"); assert.equal(leData("02/09/26", HOJE), "2026-09-02");
  assert.equal(leData("02 SET", HOJE), "2026-09-02"); assert.equal(leData("2 de setembro de 2026", HOJE), "2026-09-02"); assert.equal(leData("02/09", HOJE), "2026-09-02");
  assert.equal(leData("28/12", "2027-01-03"), "2026-12-28"); assert.equal(leData("31/02/2026", HOJE), null); assert.equal(leData("Total", HOJE), null);
});

test("separaCsv: descobre o separador e respeita aspas", () => {
  assert.deepEqual(separaCsv('a;b;c\n1;"x; y";3\n'), [["a", "b", "c"], ["1", "x; y", "3"]]);
  assert.deepEqual(separaCsv('a,b\n"diz ""oi""",2'), [["a", "b"], ['diz "oi"', "2"]]);
  assert.deepEqual(separaCsv("﻿a\tb\r\n1\t2\r\n\r\n"), [["a", "b"], ["1", "2"]]);
});

test("fatura provável: a do mês em que as compras caem pelo fechamento do cartão", () => {
  const r = abre("nubank.csv");
  assert.equal(faturaProvavel(CARTAO, r.compras, HOJE), "2026-10");   // compras de setembro, fecha dia 1, vence dia 8 de outubro
  assert.equal(faturaProvavel(CARTAO, [], HOJE), mesDaFatura(CARTAO, HOJE));
});

test("data na fatura: mantém a data que já cai na fatura e puxa para dentro a que cairia em outra", () => {
  assert.equal(dataNaFatura(CARTAO, "2026-10", "2026-09-14"), "2026-09-14");
  assert.equal(dataNaFatura(CARTAO, "2026-10", "2026-06-14"), "2026-09-01");   // parcela de uma compra de junho
  assert.equal(dataNaFatura(CARTAO, "2026-10", "2026-10-01"), "2026-09-30");   // o banco fechou um dia depois do cadastrado
  for (const d of ["2026-09-14", "2026-06-14", "2026-10-01"]) assert.equal(mesDaFatura(CARTAO, dataNaFatura(CARTAO, "2026-10", d)), "2026-10");
});

test("chaves: a mesma compra tem sempre a mesma chave, e duas compras iguais no mesmo dia têm chaves diferentes", () => {
  const a = comChaves(CARTAO.id, abre("nubank.csv").compras), b = comChaves(CARTAO.id, abre("nubank.csv").compras);
  assert.deepEqual(a.map((x) => x.chave), b.map((x) => x.chave));
  assert.equal(new Set(a.map((x) => x.chave)).size, a.length);
  const padarias = a.filter((x) => x.descricao === "Padaria Doce Pao"); assert.equal(padarias.length, 2); assert.notEqual(padarias[0].chave, padarias[1].chave);
  assert.notEqual(chaveDoItem("outro-cartao", a[0]), a[0].chave);
  const ofx = comChaves(CARTAO.id, abre("cartao.ofx").compras); assert.ok(ofx[0].chave.endsWith("id:66f1a2b3-0001"));
});

test("tipos de arquivo aceitos", () => {
  for (const n of ["fatura.csv", "Extrato.OFX", "cartao.xlsx", "x.xls", "y.txt"]) assert.equal(ehExtrato({ name: n, type: "" }), true, n);
  assert.equal(ehExtrato({ name: "foto.png", type: "image/png" }), false); assert.equal(ehExtrato({ name: "fatura.pdf", type: "application/pdf" }), false);
  assert.equal(ehPlanilha({ name: "cartao.xlsx" }), true); assert.equal(ehPlanilha({ name: "fatura.csv" }), false);
});

test("palpite de categoria pelos nomes comuns de extrato", () => {
  const casos = { "IFOOD *IFOOD": "Alimentação", "UBER *TRIP": "Transporte", "UBER *EATS": "Alimentação", "MERCADOLIVRE*LOJA": "Outros", "Mercado Extra": "Mercado", "POSTO SHELL BR": "Transporte",
    "Netflix.com": "Lazer", "PAG*Drogasil": "Saúde", "LOJAS RENNER": "Roupas", "IOF de compra internacional": "Parcelas e financiamentos", "Biofresh Cosmeticos": "Outros", "Luzia Modas": "Outros", "Conta de luz": "Contas da casa" };
  for (const [d, c] of Object.entries(casos)) assert.equal(guessCat(d, "Despesa"), c, d);
});

/* ---------- OFX do Nubank (mesmo formato do arquivo exportado pelo app do banco; dados inventados) ---------- */
import { infoDoOfx, nomeDoBanco, vencimentoDoNome } from "../js/extrato.js";
const NU = "Nubank_2026-10-14.ofx";
const abreNu = () => leExtrato({ texto: decodifica(readFileSync(new URL("./fixtures/extratos/" + NU, import.meta.url))), hoje: HOJE, nome: NU });

test("OFX do Nubank: compras, parcelas e pagamentos", () => {
  const r = abreNu();
  assert.deepEqual(resumo(r.compras), [["2026-10-02", "Uber - NuPay", 31.8, "1/1"], ["2026-09-21", "Padaria Bom Dia", 48.5, "1/1"], ["2026-09-07", "Auto Center Silva", 150, "3/3"],
    ["2026-09-07", "Loja Bela Moda", 80, "2/3"], ["2026-09-07", "Renegociação de pendências (14/Agosto)", 420.33, "2/12"]]);
  assert.deepEqual(r.pagamentos.map((x) => x.valor), [100, 700]); assert.equal(r.estornos.length, 0);
  assert.ok(r.compras.every((x) => x.id.startsWith("00000000-")));
});

test("OFX do Nubank: banco, período da fatura e vencimento tirado do nome do arquivo", () => {
  assert.deepEqual(abreNu().info, { banco: "Nubank", inicio: "2026-09-07", fecha: "2026-10-07", vencimento: "2026-10-14" });
  assert.equal(vencimentoDoNome("Nubank_2026-10-14_copia", "2026-10-07"), "2026-10-14");
  assert.equal(vencimentoDoNome("extrato-2026-01-05.ofx", "2026-10-07"), null);   // data longe do fechamento não é o vencimento
  assert.equal(vencimentoDoNome("Nubank_2026-10-14.ofx", null), null);
  assert.equal(nomeDoBanco("NU PAGAMENTOS S.A."), "Nubank"); assert.equal(nomeDoBanco("BANCO ITAUCARD S.A."), "Itaú"); assert.equal(nomeDoBanco("COOPERATIVA VALE S.A."), "Cooperativa Vale"); assert.equal(nomeDoBanco(""), "");
  assert.deepEqual(infoDoOfx("<OFX>sem nada"), { banco: "", inicio: null, fecha: null });
});

test("a fatura vem do arquivo, mesmo que os dias cadastrados no cartão estejam diferentes", () => {
  const r = abreNu(), certo = { id: "nu", fechamento: 7, vencimento: 14 }, errado = { id: "x", fechamento: 1, vencimento: 8 };
  assert.equal(faturaProvavel(certo, r.compras, HOJE, r.info), "2026-10");
  assert.equal(faturaProvavel(errado, r.compras, HOJE, r.info), "2026-10");
  assert.equal(faturaProvavel(errado, r.compras, HOJE, { ...r.info, vencimento: null }), "2026-10");   // fecha dia 7, vence dia 8: mesmo mês
  assert.equal(faturaProvavel({ id: "y", fechamento: 28, vencimento: 5 }, r.compras, HOJE, { ...r.info, vencimento: null }), "2026-11");   // vence dia 5: mês seguinte ao fechamento
  // Com o cartão certo, todas as compras do arquivo já caem na fatura de outubro com a própria data.
  for (const c of r.compras) { assert.equal(dataNaFatura(certo, "2026-10", c.data), c.data); assert.equal(mesDaFatura(certo, c.data), "2026-10"); }
});

test("categorias do extrato do Nubank", () => {
  assert.equal(guessCat("Uber - NuPay", "Despesa"), "Transporte");
  assert.equal(guessCat("Renegociação de pendências (14/Agosto)", "Despesa"), "Parcelas e financiamentos");
});
