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
  if (Array.isArray(meuNome)) return meuNome.some((n) => ehMeuNome(nome, n));   // vários jeitos de dizer o próprio nome: o digitado, o do banco e o do e-mail
  const meu = norm(meuNome).split(" ").filter((p) => p.length > 1), q = norm(nome);
  return meu.length >= 2 && q.length > 0 && (meu.every((p) => q.includes(p)) || (q.length >= 5 && norm(meuNome).startsWith(q)));
}

/**
 * O nome que dá para tirar do e-mail ("marcos.henrique.b.s@gmail.com" → "Marcos Henrique"): serve de palpite para reconhecer as transferências
 * entre as contas da própria pessoa quando ela não disse o nome ou o nome salvo está errado. Só vale com pelo menos duas palavras de 3 letras ou mais.
 */
export function nomeDoEmail(email) {
  const p = String(email || "").split("@")[0].split(/[._\-+0-9]+/).filter((x) => x.length >= 3);
  return p.length >= 2 ? p.slice(0, 3).map((x) => x[0].toUpperCase() + x.slice(1).toLowerCase()).join(" ") : "";
}

/**
 * A transferência é para a pessoa com quem divide as contas (a conta de casal)? Vale o primeiro nome igual ao apelido ("Júlia" em "Júlia Gabrielle Ferreira da Silva"),
 * ou o nome inteiro de duas palavras. `parceiro` pode ser um nome, ou uma lista de jeitos de chamar a mesma pessoa.
 */
export function ehParceiro(nome, parceiro) {
  if (Array.isArray(parceiro)) return parceiro.some((p) => ehParceiro(nome, p));
  const p = norm(parceiro).split(" ").filter((x) => x.length >= 3), n = norm(nome).split(" ").filter(Boolean);
  if (!p.length || !n.length) return false;
  return p.length >= 2 ? p.every((x) => n.includes(x)) : n[0] === p[0];
}

/** Categorias para dizer, sempre, para onde foi cada real: Pix para uma pessoa, Pix recebido de uma pessoa e o que vai e vem do parceiro. */
export const CATEGORIA_PIX_PESSOA = { Despesa: "Pix para pessoas", Receita: "Pix de pessoas" }, CATEGORIA_CASAL = "Casal";

/** Tipos de movimento que só aparecem em extrato de conta: servem para reconhecer o arquivo. */

const MOVIMENTO = /^(transferencia (enviada|recebida)( pelo pix)?|compra no debito|pagamento de fatura|valor adicionado na conta por cartao de credito|pix)\b/;
/** Movimentos de conta nos outros bancos (Pix, TED, compra no débito, tarifa, salário...): reconhecem o arquivo mesmo sem o texto do Nubank. */
const MOVIMENTO_GERAL = /\b(pix|ted|doc|transf\w*|compra( com| no)? (cartao )?deb\w*|cartao deb\w*|saque|tarifa|salario|deposito|rendimento|pagto|pagamento|cred(ito)? (em )?conta|deb(ito)? (em )?conta|iof|juros)\b/;


/**
 * Acha a linha de títulos de um extrato de conta, de qualquer banco: data, descrição (às vezes duas colunas, como Histórico e Descrição)
 * e o valor em uma coluna só (com sinal), em crédito/débito (ou entrada/saída) separados, ou com uma coluna D/C dizendo o sentido.
 * A coluna Saldo, quando existe, é sinal de extrato de conta (fatura de cartão não tem saldo).
 */
function colunas(linhas) {
  for (let i = 0; i < Math.min(linhas.length, 25); i++) {
    const cab = (linhas[i] || []).map(norm);
    const d = cab.findIndex((c) => /^(data|release_date|dt)\b|^data_/.test(c));
    const v = cab.findIndex((c) => /^valor\b|^transaction_net_amount|^amount\b/.test(c) && !/us\$|dolar/.test(c));
    const cr = cab.findIndex((c) => /^(credito|entrada|creditos|entradas)\b/.test(c)), db = cab.findIndex((c) => /^(debito|saida|debitos|saidas)\b/.test(c));
    const dc = cab.findIndex((c) => /^(deb_?cred|d\/c|d\.c\.?|natureza|tipo de lancamento|dc)\b/.test(c));
    const ts = cab.map((c, k) => (/^(descri|hist|lancamento$|lancamentos$|titulo|transaction_type|detalh|memo|estabelecimento)/.test(c) ? k : -1)).filter((k) => k >= 0);
    if (d >= 0 && ts.length && (v >= 0 || (cr >= 0 && db >= 0))) {
      return { ini: i + 1, d, v, t: ts[ts.length > 1 && /^descri/.test(cab[ts[1]]) ? 1 : 0], ts, cr, db, dc, saldo: cab.findIndex((c) => /^saldo/.test(c)), id: cab.findIndex((c) => /^identificador\b|^id$|^reference_id$/.test(c)) };
    }
  }
  return null;
}

/** O valor com sinal de uma linha: o que entrou é positivo e o que saiu é negativo, qualquer que seja o jeito do banco escrever. */
function valorDaLinha(l, c) {
  if (c.cr >= 0 && c.db >= 0 && (c.v < 0)) {
    const e = numero(l[c.cr]), s = numero(l[c.db]);
    if (Number.isFinite(e) && e !== 0) return Math.abs(e);
    if (Number.isFinite(s) && s !== 0) return -Math.abs(s);
    return NaN;
  }
  const v = numero(l[c.v]); if (!Number.isFinite(v)) return NaN;
  if (c.dc >= 0) { const s = norm(l[c.dc]); if (/^(d|deb|debito|saida)/.test(s)) return -Math.abs(v); if (/^(c|cred|credito|entrada)/.test(s)) return Math.abs(v); }
  return v;
}
/** A descrição de uma linha: as colunas de texto juntas (Histórico e Descrição, por exemplo), sem repetir. */
function textoDaLinha(l, c) {
  const partes = []; for (const k of c.ts) { const p = String(l[k] ?? "").replace(/\s+/g, " ").trim(); if (p && !partes.some((x) => norm(x) === norm(p) || norm(x).includes(norm(p)))) partes.push(p); }
  return partes.join(" - ");
}
/**
 * Deixa a descrição de qualquer banco no jeito que o resto do leitor entende ("Transferência enviada pelo Pix - Nome",
 * "Compra no débito - Loja", "Pagamento de fatura"). O sentido vem do sinal do valor.
 */
export function descricaoGeral(texto, valor) {
  const t = String(texto ?? "").replace(/\s+/g, " ").trim(), n = norm(t);
  if (!t || /^transferencia (enviada|recebida)/.test(n) || /^compra no debito\b/.test(n) || /^pagamento de fatura\b/.test(n) || /^valor adicionado/.test(n)) return t;
  if (/(pagto|pagamento|pgto)\b.*(fatura|cartao de credito|cart(ao)? cred)|fatura (do )?cart|pag(to)? cartao/.test(n)) return "Pagamento de fatura";
  const sentido = valor < 0 ? "enviada" : "recebida";
  const limpa = (s) => s.replace(/\b(pix|ted|doc|transf\w*|enviad[oa]|recebid[oa]|qrs|qr code|pagto|pagamento|pgto|compra|no|com|de|para|cart[aã]o|d[eé]bito|deb|cp|cred|cr[eé]dito|dep)\b\s*:?/gi, " ").replace(/\b\d{5,}-?\b/g, " ").replace(/\s*\d{2}\/\d{2}$/, "").replace(/[-:]+/g, " ").replace(/\s{2,}/g, " ").trim();
  if (/\bpix\b/.test(n)) { const nome = limpa(t); return nome ? `Transferência ${sentido} pelo Pix - ${nome}` : `Transferência ${sentido} pelo Pix`; }
  if (/^(ted|doc|transf)/.test(n)) { const nome = limpa(t); return nome ? `Transferência ${sentido} - ${nome}` : `Transferência ${sentido}`; }
  if (/(compra|cartao|pgto|pagto).*(deb|debito)|debito.*compra|compra.*cartao/.test(n) && valor < 0) { const nome = limpa(t); return nome ? `Compra no débito - ${nome}` : "Compra no débito"; }
  return t;
}
/**
 * O arquivo é um extrato da conta (e não da fatura do cartão)? Tem título de Data, Valor e Descrição e, na descrição,
 * os tipos de movimento de uma conta; e o dinheiro entra e sai (no cartão quase tudo tem o mesmo sinal).
 */

export function pareceConta(linhas) {
  const c = colunas(linhas || []); if (!c) return false;
  const corpo = linhas.slice(c.ini).filter((l) => l && l.some((x) => String(x ?? "").trim())); if (corpo.length < 2) return false;
  const vals = corpo.map((l) => valorDaLinha(l, c));
  const conhecidas = corpo.filter((l) => MOVIMENTO.test(norm(textoDaLinha(l, c)))).length / corpo.length;
  const gerais = corpo.filter((l) => MOVIMENTO_GERAL.test(norm(textoDaLinha(l, c)))).length / corpo.length;
  const pos = vals.filter((v) => v > 0).length, neg = vals.filter((v) => v < 0).length;
  // Saldo, crédito/débito separados ou coluna D/C só existem em extrato de conta.
  if (c.saldo >= 0 || (c.cr >= 0 && c.db >= 0 && c.v < 0) || c.dc >= 0) return pos + neg >= 2 && gerais >= 0.2;
  return (c.id >= 0 && conhecidas >= 0.3) || (conhecidas >= 0.5 && pos >= 2 && neg >= 2) || (gerais >= 0.6 && pos >= 1 && neg >= 1 && corpo.length >= 3);
}

/**
 * Lê o extrato da conta e já separa o que vira lançamento do que deve ficar de fora (com o motivo).
 * Ficam de fora: o pagamento da fatura do cartão (o gasto já está na fatura), o Pix pago no crédito (a conta mostra o
 * dinheiro entrando e saindo com o mesmo identificador, e a compra está na fatura), movimento de investimento e,
 * se a pessoa disse o nome dela (`meuNome`), as transferências entre contas dela e, com a conta de casal ligada (`parceiro`), as transferências entre os dois.
 * @returns {{movimentos: object[], periodo: {de:string, ate:string}|null, resumo: {entradas:number, saidas:number, ignorados:number}}}
 *  Cada movimento: { id, chave, data, tipo ("Despesa"|"Receita"), valor (positivo), descricao, categoria, forma, pessoa, ignorar, motivo, original }
 */
export function leConta({ texto, linhas, hoje, meuNome = "", parceiro = "" }) {
  const L = linhas || separaCsv(texto), c = colunas(L);
  if (!c) return { movimentos: [], periodo: null, resumo: { entradas: 0, saidas: 0, ignorados: 0 } };
  const bruto = [];

  L.slice(c.ini).forEach((l) => {
    if (!l) return;
    const data = leData(l[c.d], hoje), valor = valorDaLinha(l, c), bruta = textoDaLinha(l, c);
    if (!data || !Number.isFinite(valor) || valor === 0 || !bruta || /^s\s?a\s?l\s?d\s?o\b|^saldo\b/i.test(bruta)) return;
    bruto.push({ data, valor, original: descricaoGeral(bruta, valor), id: c.id >= 0 ? String(l[c.id] ?? "").trim() : "" });
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
    const entreOsDois = (forma === "Pix" || forma === "Transferência") && Boolean(parceiro) && ehParceiro(nome, parceiro);   // só transferência: uma compra no débito numa loja "Júlia Modas" não é a Júlia
    let ignorar = false, motivo = anulados.get(x) || "";
    if (motivo) ignorar = true;
    else if (/^pagamento de fatura/.test(pre)) { ignorar = true; motivo = "Pagamento da fatura do cartão: o gasto já está na fatura"; }
    else if (/^(aplicacao|resgate)\b|\brdb\b/.test(pre)) { ignorar = true; motivo = "Movimento de investimento: não é gasto nem entrada"; }
    else if (forma && ehMeuNome(nome, meuNome)) { ignorar = true; motivo = "Transferência entre contas suas"; }   // o Itaú corta o nome ("Marcos"): vale o começo do seu nome
    else if (entreOsDois) { ignorar = true; motivo = "Transferência com a pessoa da conta casal: o dinheiro só muda de mão entre vocês"; }
    const tipo = x.valor > 0 ? "Receita" : "Despesa", valor = round2(Math.abs(x.valor));
    const limpo = forma === "Débito" ? (partes[1] ? `Compra no débito em ${arrumaNome(nome)}` : "Compra no débito") : forma ? arrumaNome(nome) : x.original.slice(0, 60);
    const parc = entreOsDois;
    let categoria = forma && pessoa && partes.length > 2 ? "Outros" : guessCat(nome, tipo);   // uma pessoa (com CPF) não é uma loja: o nome dela não vira "posto" nem "Uber"
    // Só dá para dizer "é uma pessoa" quando o banco escreve o documento (CPF). O Pix para uma pessoa nunca fica sem categoria: é "Pix para pessoas" (ou "Casal", se é o parceiro).
    if (parc) categoria = CATEGORIA_CASAL;
    else if (forma && pessoa && partes.length > 2 && categoria === "Outros") categoria = CATEGORIA_PIX_PESSOA[tipo];
    // A chave não muda se o mesmo arquivo for aberto de novo: o identificador do banco (com o sentido, porque um par divide o mesmo).
    let chave = `nu-${x.id || `${x.data}|${valor}|${norm(x.original)}`}-${tipo === "Receita" ? "e" : "s"}`;
    const n = usados.get(chave) || 0; usados.set(chave, n + 1); if (n) chave += `-${n + 1}`;
    return { id: x.id, chave, data: x.data, tipo, valor, descricao: limpo || x.original.slice(0, 60), categoria, forma, pessoa, parceiro: parc, ignorar, motivo, original: x.original };
  }).sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));
  const uteis = movimentos.filter((m) => !m.ignorar), soma = (t) => round2(uteis.filter((m) => m.tipo === t).reduce((s, m) => s + m.valor, 0));
  return { movimentos, periodo: movimentos.length ? { de: movimentos[0].data, ate: movimentos.at(-1).data } : null,
    resumo: { entradas: soma("Receita"), saidas: soma("Despesa"), ignorados: movimentos.length - uteis.length } };
}
