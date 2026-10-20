// Arrumar lançamentos: o que já foi lançado e atrapalha as contas (transferências entre contas da pessoa, Pix como cartão, "Outros").
import test from "node:test";
import assert from "node:assert/strict";
import { entreMinhasContas, pixComoCartao, gruposEmOutros, nomeDoLancamento } from "../js/arrumar.js";
import { ehMeuNome } from "../js/conta.js";

const L = (o) => ({ id: String(Math.random()), tipo: "Despesa", categoria: "Outros", forma: "Pix", valor: 10, data: "2026-10-01", ...o });
const NOME = "Maria Souza Lima";

test("reconhece o próprio nome inteiro ou cortado pelo banco, mas só com nome e sobrenome informados", () => {
  assert.equal(ehMeuNome("Maria Souza Lima", NOME), true);
  assert.equal(ehMeuNome("MARIA S", NOME), true);
  assert.equal(ehMeuNome("Maria", NOME), true);       // cortado: é o começo do nome
  assert.equal(ehMeuNome("Mari", NOME), false);        // curto demais para valer
  assert.equal(ehMeuNome("Maria Oliveira", NOME), false);
  assert.equal(ehMeuNome("Maria", "Maria"), false);    // sem sobrenome em "meu nome": não arrisca
  assert.equal(ehMeuNome("", NOME), false);
});

test("transferências entre as minhas contas: acha entradas e saídas, inclusive com o texto grande do banco", () => {
  const ls = [
    L({ descricao: "Maria", tipo: "Receita", valor: 100 }),
    L({ descricao: "MARIA", valor: 40 }),
    L({ descricao: "Transferência enviada pelo Pix - Maria Souza Lima - •••.305.298-•• - ITAÚ UNIBANCO S.A. (0341) Agência: 7781", valor: 11.61, forma: "Cartão de crédito" }),
    L({ descricao: "Mariana", valor: 5 }),
    L({ descricao: "Uber Do", tipo: "Receita", valor: 300 }),
    L({ descricao: "Maria", tipo: "Reserva", valor: 50 }),
  ];
  const r = entreMinhasContas(ls, NOME);
  assert.equal(r.itens.length, 3); assert.equal(r.entradas, 100); assert.equal(r.saidas, 51.61);
  assert.equal(entreMinhasContas(ls, "").itens.length, 0);   // sem nome, não mexe em nada
});

test("Pix e débito da conta lançados como cartão: nome curto e sem cartão; Pix no crédito fica", () => {
  const C = "Cartão de crédito";
  const ls = [
    L({ forma: C, descricao: "Transferência enviada pelo Pix - AUTO POSTO PARQUE VIANA LTDA - 11.392.521/0001-58 - CIELO IP S.A. (0362)" }),
    L({ forma: C, descricao: "Compra no débito - BARUERI" }),
    L({ forma: C, descricao: "Pix no Crédito - AUTO POSTO SAO FRANCISCO LTDA" }),
    L({ forma: C, descricao: "Perfumaria Goya Ltda" }),
    L({ forma: "Pix", descricao: "Transferência enviada pelo Pix - Fulano" }),
    L({ forma: C, tipo: "Receita", descricao: "Transferência recebida pelo Pix - Fulano" }),
  ];
  const r = pixComoCartao(ls);
  assert.equal(r.length, 2);
  assert.deepEqual([r[0].forma, r[0].descricao], ["Pix", "Auto Posto Parque Viana"]);
  assert.deepEqual([r[1].forma, r[1].descricao], ["Débito", "Compra no débito em Barueri"]);
});

test("nomeDoLancamento tira o texto do banco e deixa só o nome", () => {
  assert.equal(nomeDoLancamento("Transferência recebida pelo Pix - Fulano de Tal - 000 - BANCO"), "Fulano de Tal");
  assert.equal(nomeDoLancamento("Uber Do"), "Uber Do");
});

test("o que ficou em Outros, junto por nome e do que mais pesa para o que menos pesa", () => {
  const ls = [
    L({ descricao: "Júlia G", valor: 300 }), L({ descricao: "JÚLIA G", valor: 200 }), L({ descricao: "Júlia G", valor: 100 }),
    L({ descricao: "Uber Do", tipo: "Receita", valor: 250 }), L({ descricao: "Uber Do", tipo: "Receita", valor: 250 }),
    L({ descricao: "Padaria", valor: 20 }),                                   // uma vez só: não vale um grupo
    L({ descricao: "Posto", categoria: "Transporte", valor: 90 }), L({ descricao: "Posto", categoria: "Transporte", valor: 90 }),
  ];
  const g = gruposEmOutros(ls);
  assert.deepEqual(g.map((x) => [x.nome, x.tipo, x.n, x.total]), [["Júlia G", "Despesa", 3, 600], ["Uber Do", "Receita", 2, 500]]);
  assert.equal(g[0].ids.length, 3);
  assert.equal(gruposEmOutros(ls, { minimo: 1 }).length, 3);
});
