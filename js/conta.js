// Extrato da conta (Nubank e parecidos): Pix, compras no débito e entradas, em CSV.
// Funções puras, sem tela e sem banco (testadas em tests/conta.test.mjs). A tela que mostra a lista para conferir fica em app.js.
// Aqui o sinal é o da conta: negativo é dinheiro que saiu, positivo é dinheiro que entrou. É o contrário do extrato do cartão.

import { round2 } from "./calc.js";
import { norm, guessCat } from "./excel.js";
import { separaCsv, leData } from "./extrato.js";

/** Número de um texto de valor: aceita 1234.56, 1.234,56 e -50,00. */
function numero(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : NaN;
  let s = String(v ?? "").replace(/r\$|\s| /gi, "");
  if (!/\d/.test(s)) return NaN;
  const neg = /^-|^−|^\(.*\)$/.test(s);
  s = s.replace(/[()−+-]/g, "");
  const virg = s.lastIndexOf(","), ponto = s.lastIndexOf(".");
  s = virg > ponto ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? (neg ? -n : n) : NaN;
}

/** "AUTO POSTO SAO FRANCISCO LTDA" → "Auto Posto Sao Francisco". Tira o sufixo de empresa e deixa só a inicial em maiúscula. */
export const arrumaNome = (s) => String(s ?? "").replace(/\s+/g, " ").trim().replace(/[\s,.-]+(ltda|eireli|epp|me|s\/?a|s\.a\.?)\.?$/i, "").toLowerCase().replace(/(^|[\s(\-/])(\p{L})/gu, (_m, a, b) => a + b.toUpperCase()).replace(/ (E|De|Da|Do|Das|Dos) /g, (m) => m.toLowerCase());

/**
 * O nome é o da própria pessoa? Vale o nome inteiro (todas as palavras de meuNome no texto) ou o começo do nome cortado pelo banco ("Marcos").
 * Precisa de nome e sobrenome em meuNome, para não tratar qualquer "Maria" como a própria pessoa.
 */
export function ehMeuNome(nome, meuNome) {
  const meu = norm(meuNome).split(" ").filter((p) => p.length > 1), q = norm(nome);
  return meu.length >= 2 && q.length > 0 && (meu.every((p) => q.includes(p)) || (q.length >= 5 && norm(meuNome).startsWith(q)));
}

/** Tipos de movimento que só aparecem em extrato de conta: servem para reconhecer o arquivo. */
const MOVIMENTO = /^(transferencia (enviada|recebida)( pelo pix)?|compra no debito|pagamento de fatura|valor adicionado na conta por cartao de credito|pix)\b/;

function colunas(linhas) {
  for (let i = 0; i < Math.min(linhas.length, 15); i++) {
    const cab = linhas[i].map(norm);
    const d = cab.findIndex((c) => /^data\b/.test(c)), v = cab.findIndex((c) => /^valor\b/.test(c)), t = cab.findIndex((c) => /^descri/.test(c));
    if (d >= 0 && v >= 0 && t >= 0) return { ini: i + 1, d, v, t, id: cab.findIndex((c) => /^identificador\b|^id$/.test(c)) };
  }
  return null;
}

/**
 * O arquivo é um extrato da conta (e não da fatura do cartão)? Tem título de Data, Valor e Descrição e, na descrição,
 * os tipos de movimento de uma conta; e o dinheiro entra e sai (no cartão quase tudo tem o mesmo sinal).
 */
export function pareceConta(linhas) {
  const c = colunas(linhas || []); if (!c) return false;
  const corpo = linhas.slice(c.ini); if (corpo.length < 2) return false;
  const conhecidas = corpo.filter((l) => MOVIMENTO.test(norm(l[c.t]))).length / corpo.length;
  const pos = corpo.filter((l) => numero(l[c.v]) > 0).length, neg = corpo.filter((l) => numero(l[c.v]) < 0).length;
  return (c.id >= 0 && conhecidas >= 0.3) || (conhecidas >= 0.5 && pos >= 2 && neg >= 2);
}

/**
 * Lê o extrato da conta e já separa o que vira lançamento do que deve ficar de fora (com o motivo).
 * Ficam de fora: o pagamento da fatura do cartão (o gasto já está na fatura), o Pix pago no crédito (a conta mostra o
 * dinheiro entrando e saindo com o mesmo identificador, e a compra está na fatura), movimento de investimento e,
 * se a pessoa disse o nome dela (`meuNome`), as transferências entre contas dela.
 * @returns {{movimentos: object[], periodo: {de:string, ate:string}|null, resumo: {entradas:number, saidas:number, ignorados:number}}}
 *  Cada movimento: { id, chave, data, tipo ("Despesa"|"Receita"), valor (positivo), descricao, categoria, forma, pessoa, ignorar, motivo, original }
 */
export function leConta({ texto, linhas, hoje, meuNome = "" }) {
  const L = linhas || separaCsv(texto), c = colunas(L);
  if (!c) return { movimentos: [], periodo: null, resumo: { entradas: 0, saidas: 0, ignorados: 0 } };
  const bruto = [];
  L.slice(c.ini).forEach((l) => {
    const data = leData(l[c.d], hoje), valor = numero(l[c.v]), original = String(l[c.t] ?? "").trim();
    if (!data || !Number.isFinite(valor) || valor === 0 || !original) return;
    bruto.push({ data, valor, original, id: c.id >= 0 ? String(l[c.id] ?? "").trim() : "" });
  });
  // Dois movimentos com o mesmo identificador, um de entrada e um de saída do mesmo valor, se anulam na conta.
  const grupos = new Map();
  bruto.forEach((x) => { if (x.id) grupos.set(x.id, [...(grupos.get(x.id) || []), x]); });
  const anulados = new Map();
  for (const g of grupos.values()) if (g.length === 2 && Math.abs(g[0].valor + g[1].valor) < 0.005) {
    const noCredito = g.some((x) => /cartao de credito|pix no credito/.test(norm(x.original)));
    g.forEach((x) => anulados.set(x, noCredito ? "Pix pago no cartão de crédito: a compra está na fatura do cartão" : "Entrou e saiu na mesma operação"));
  }
  const usados = new Map();
  const movimentos = bruto.map((x) => {
    const partes = x.original.split(" - ").map((s) => s.trim()), pre = norm(partes[0]);
    let forma = "", nome = x.original, pessoa = false;
    if (/^transferencia (enviada|recebida)/.test(pre)) { forma = /pelo pix/.test(pre) ? "Pix" : "Transferência"; nome = partes[1] || x.original; pessoa = !/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|^qr$/i.test(partes[2] || ""); }
    else if (/^compra no debito/.test(pre)) { forma = "Débito"; nome = partes[1] || x.original; }
    let ignorar = false, motivo = anulados.get(x) || "";
    if (motivo) ignorar = true;
    else if (/^pagamento de fatura/.test(pre)) { ignorar = true; motivo = "Pagamento da fatura do cartão: o gasto já está na fatura"; }
    else if (/^(aplicacao|resgate)\b|\brdb\b/.test(pre)) { ignorar = true; motivo = "Movimento de investimento: não é gasto nem entrada"; }
    else if (forma && ehMeuNome(nome, meuNome)) { ignorar = true; motivo = "Transferência entre contas suas"; }   // o Itaú corta o nome ("Marcos"): vale o começo do seu nome
    const tipo = x.valor > 0 ? "Receita" : "Despesa", valor = round2(Math.abs(x.valor));
    const limpo = forma === "Débito" ? `Compra no débito em ${arrumaNome(nome)}` : forma ? arrumaNome(nome) : x.original.slice(0, 60);
    const categoria = forma === "Pix" && pessoa && tipo === "Despesa" ? "Outros" : guessCat(nome, tipo);
    // A chave não muda se o mesmo arquivo for aberto de novo: o identificador do banco (com o sentido, porque um par divide o mesmo).
    let chave = `nu-${x.id || `${x.data}|${valor}|${norm(x.original)}`}-${tipo === "Receita" ? "e" : "s"}`;
    const n = usados.get(chave) || 0; usados.set(chave, n + 1); if (n) chave += `-${n + 1}`;
    return { id: x.id, chave, data: x.data, tipo, valor, descricao: limpo || x.original.slice(0, 60), categoria, forma, pessoa, ignorar, motivo, original: x.original };
  }).sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));
  const uteis = movimentos.filter((m) => !m.ignorar), soma = (t) => round2(uteis.filter((m) => m.tipo === t).reduce((s, m) => s + m.valor, 0));
  return { movimentos, periodo: movimentos.length ? { de: movimentos[0].data, ate: movimentos.at(-1).data } : null,
    resumo: { entradas: soma("Receita"), saidas: soma("Despesa"), ignorados: movimentos.length - uteis.length } };
}
