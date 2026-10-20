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

const diasEntre = (a, b) => Math.abs((new Date(a) - new Date(b)) / 86400000);

/**
 * Entre os movimentos de um arquivo que vai ser importado, quais já estão lançados (de outra importação, de outro formato do mesmo extrato
 * ou à mão): mesmo tipo, mesmo valor e a data com até 2 dias de diferença. Cada lançamento que já existe vale por um movimento só: dois Pix de
 * R$ 20 no mesmo dia, com um já lançado, deixam um de fora e um como novo. Vale o mais perto na data.
 * @param {{chave:string, tipo:string, valor:number, data:string}[]} movimentos  o que veio do arquivo (sem os que já têm a mesma chave)
 * @param {object[]} lancamentos  o que já está no app (sem os que têm a chave de um movimento deste arquivo)
 * @returns {Set<string>} as chaves dos movimentos que parecem já lançados
 */
export function movimentosJaLancados(movimentos, lancamentos, { dias = 2 } = {}) {
  const pool = (lancamentos || []).filter((x) => x.tipo === "Receita" || x.tipo === "Despesa").map((x) => ({ x, usado: false }));
  const achados = new Set();
  for (const m of [...(movimentos || [])].sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0))) {
    let melhor = null, dist = Infinity;
    for (const p of pool) {
      if (p.usado || p.x.tipo !== m.tipo || Math.abs(Number(p.x.valor) - m.valor) >= 0.005) continue;
      const d = diasEntre(p.x.data, m.data); if (d <= dias && d < dist) { melhor = p; dist = d; }
    }
    if (melhor) { melhor.usado = true; achados.add(m.chave); }
  }
  return achados;
}

/**
 * Lançamentos que ficaram em dobro por importar o mesmo extrato de dois jeitos (CSV e PDF, ou dois arquivos que se cruzam): mesmo tipo,
 * valor e dia, com mais de um deles vindo de importação. `igual` marca o que tem o mesmo nome (a cópia quase certa); o resto pode ser
 * dois gastos de verdade iguais, e quem decide é a pessoa.
 * @returns {{chave:string, tipo:string, valor:number, data:string, manter:object, copias:object[], igual:boolean}[]}
 */
export function repetidosDeImportacao(lancamentos) {
  const grupos = new Map();
  for (const x of lancamentos || []) {
    if ((x.tipo !== "Receita" && x.tipo !== "Despesa") || !x.import_key) continue;
    const k = `${x.tipo}|${x.data}|${round2(Number(x.valor))}`;
    grupos.set(k, [...(grupos.get(k) || []), x]);
  }
  const out = [];
  for (const [chave, l] of grupos) {
    if (l.length < 2) continue;
    const ord = [...l].sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || "")) || String(a.id).localeCompare(String(b.id)));
    const [manter, ...copias] = ord, nome = (x) => norm(nomeDoLancamento(x.descricao));
    out.push({ chave, tipo: manter.tipo, valor: round2(Number(manter.valor)), data: manter.data, manter, copias, igual: copias.every((c) => nome(c) === nome(manter) || nome(c).includes(nome(manter)) || nome(manter).includes(nome(c))) });
  }
  return out.sort((a, b) => (a.data < b.data ? 1 : -1));
}
