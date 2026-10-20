// "Arrumar lançamentos": acha, no que já foi lançado, o que atrapalha as contas e propõe o conserto.
// Funções puras, sem tela e sem banco (testadas em tests/arrumar.test.mjs). A tela fica em app.js.

import { round2, CARTAO } from "./calc.js";
import { norm } from "./excel.js";
import { ehMeuNome, arrumaNome } from "./conta.js";

/**
 * Transferências entre as contas da própria pessoa: contam como entrada e como gasto ao mesmo tempo e inflam os dois lados.
 * Vale o nome inteiro no texto ("Marcos Henrique Barbosa Santos") ou o começo do nome cortado pelo banco ("Marcos").
 * Só olha entradas e gastos; o que foi guardado não entra.
 */
export function entreMinhasContas(lancamentos, meuNome) {
  const itens = (lancamentos || []).filter((x) => (x.tipo === "Receita" || x.tipo === "Despesa") && ehMeuNome(nomeDoLancamento(x.descricao), meuNome));
  const soma = (t) => round2(itens.filter((x) => x.tipo === t).reduce((s, x) => s + Number(x.valor), 0));
  return { itens, entradas: soma("Receita"), saidas: soma("Despesa") };
}

/** Do texto que o banco escreve ("Transferência enviada pelo Pix - Fulano - 000.111.222-33 - NU PAGAMENTOS ...") fica só o nome. */
export function nomeDoLancamento(descricao) {
  const t = String(descricao ?? "").trim(), p = t.split(" - ").map((s) => s.trim());
  return /^transferencia (enviada|recebida)/.test(norm(p[0])) && p[1] ? p[1] : t;
}

/**
 * Pix e compras no débito da conta que entraram como compra de cartão (o extrato da conta foi importado pela tela do cartão):
 * ficam sem cartão e com o nome curto. "Pix no Crédito" é cartão de verdade e fica como está.
 * @returns {{id:string, de:object, forma:string, descricao:string}[]}
 */
export function pixComoCartao(lancamentos) {
  const out = [];
  for (const x of lancamentos || []) {
    if (x.tipo !== "Despesa" || x.forma !== CARTAO) continue;
    const t = String(x.descricao ?? ""), n = norm(t);
    if (/^pix no credito|cartao de credito/.test(n)) continue;
    if (/^transferencia enviada/.test(n)) out.push({ id: x.id, de: x, forma: "Pix", descricao: arrumaNome(nomeDoLancamento(t)) });
    else if (/^compra no debito/.test(n)) out.push({ id: x.id, de: x, forma: "Débito", descricao: `Compra no débito em ${arrumaNome(t.split(" - ").slice(1).join(" - ") || t)}` });
  }
  return out;
}

/**
 * O que ficou em "Outros", junto por nome: um nome que se repete (a Uber, uma pessoa, um posto) muda de categoria de uma vez.
 * @returns {{chave:string, nome:string, tipo:string, n:number, total:number, ids:string[]}[]} do que mais pesa para o que menos pesa
 */
export function gruposEmOutros(lancamentos, { minimo = 2 } = {}) {
  const mapa = new Map();
  for (const x of lancamentos || []) {
    if (x.categoria !== "Outros" || (x.tipo !== "Receita" && x.tipo !== "Despesa")) continue;
    const nome = arrumaNome(nomeDoLancamento(x.descricao)) || "(sem nome)", chave = `${x.tipo}|${norm(nome)}`;
    const g = mapa.get(chave) || { chave, nome, tipo: x.tipo, n: 0, total: 0, ids: [] };
    g.n++; g.total = round2(g.total + Number(x.valor)); g.ids.push(x.id); mapa.set(chave, g);
  }
  return [...mapa.values()].filter((g) => g.n >= minimo).sort((a, b) => b.total - a.total);
}
