// Extrato do cartão exportado pelo banco (CSV, OFX ou Excel): transforma o arquivo em uma lista de compras.
// Tudo aqui é função pura (sem tela e sem banco de dados), testada em tests/extrato.test.mjs.
// A tela (app.js) mostra a lista para a pessoa conferir e só então lança as compras no cartão escolhido.

import { pad, mKey, addM, round2, mesDaFatura, periodoDaFatura } from "./calc.js";
import { norm, cellToISO } from "./excel.js";

const MESES3 = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const valida = (a, m, d) => { const dt = new Date(a, m - 1, d); return dt.getFullYear() === a && dt.getMonth() === m - 1 && dt.getDate() === d; };

/** Arquivos que este módulo sabe ler. */
export const ehExtrato = (arquivo) => /\.(csv|ofx|qfx|xlsx|xls|txt)$/i.test(arquivo?.name || "") || /csv|ofx|spreadsheet|ms-excel/i.test(arquivo?.type || "");
export const ehPlanilha = (arquivo) => /\.(xlsx|xls)$/i.test(arquivo?.name || "") || /spreadsheet|ms-excel/i.test(arquivo?.type || "");

/** Os bancos exportam em UTF-8 ou no padrão antigo do Windows; tenta o primeiro e cai no segundo. */
export function decodifica(bytes) {
  try { return new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { return new TextDecoder("windows-1252").decode(bytes); }
}

/** Data em "aaaa-mm-dd". Aceita 2026-09-02, 02/09/2026, 02/09/26, 02/09, "02 SET" e "02 set 2026". */
export function leData(v, hoje) {
  if (v instanceof Date && !isNaN(v)) return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
  const iso = cellToISO(v);
  if (iso) { const [a, m, d] = iso.split("-").map(Number); return valida(a, m, d) ? iso : null; }
  const s = norm(v), ano = Number(hoje.slice(0, 4));
  // Sem ano: fica com o ano que deixa a data no passado mais próximo (a compra de dezembro lida em janeiro é do ano anterior).
  const semAno = (mo, d) => { if (!valida(ano, mo, d) && !valida(ano - 1, mo, d)) return null; const x = `${ano}-${pad(mo)}-${pad(d)}`; return x <= hoje || !valida(ano - 1, mo, d) ? x : `${ano - 1}-${pad(mo)}-${pad(d)}`; };
  let m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})$/);
  if (m) return semAno(Number(m[2]), Number(m[1]));
  m = s.match(/^(\d{1,2})\s*(?:de\s+)?([a-z]{3})[a-z]*\.?(?:\s*(?:de\s+)?(\d{4}))?$/);
  if (m && MESES3.includes(m[2])) { const mo = MESES3.indexOf(m[2]) + 1, d = Number(m[1]); return m[3] ? (valida(Number(m[3]), mo, d) ? `${m[3]}-${pad(mo)}-${pad(d)}` : null) : semAno(mo, d); }
  return null;
}

/** Número de um texto de valor. `virgula` diz se o arquivo usa vírgula nos centavos (1.234,56) ou ponto (1234.56). */
function leNumero(v, virgula) {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  let s = String(v ?? "").replace(/r\$|\s| /gi, "");
  if (!/\d/.test(s) || /[a-z]{2}/i.test(s)) return null;
  const neg = /^\(.*\)$/.test(s) || /^-|-$|^−/.test(s);
  s = s.replace(/[()\-−+]/g, "");
  s = virgula ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? (neg ? -n : n) : null;
}
const usaVirgula = (textos) => textos.some((t) => /,\d{1,2}\)?-?$/.test(String(t).trim()));

/** "Magazine - Parcela 3/10" → { descricao: "Magazine", parcela: 3, de: 10 }. */
export function separaParcela(descricao, coluna = "") {
  let d = String(descricao ?? "").replace(/\s+/g, " ").trim(), m;
  const serve = (k, n) => k >= 1 && n >= 2 && n <= 72 && k <= n;
  const c = norm(coluna).match(/(\d{1,2})\s*(?:\/|de)\s*(\d{1,2})/);
  if (c && serve(Number(c[1]), Number(c[2]))) return { descricao: d, parcela: Number(c[1]), de: Number(c[2]) };
  for (const re of [/[\s\-–]*\(?\bparc(?:ela)?\.?\s*(\d{1,2})\s*(?:\/|de)\s*(\d{1,2})\)?/i, /\s*\((\d{1,2})\s*\/\s*(\d{1,2})\)/, /[\s\-–]+(\d{1,2})\s*\/\s*(\d{1,2})$/]) {
    m = d.match(re);
    if (m && serve(Number(m[1]), Number(m[2]))) return { descricao: d.replace(m[0], " ").replace(/\s+/g, " ").replace(/[\s\-–]+$/, "").trim(), parcela: Number(m[1]), de: Number(m[2]) };
  }
  return { descricao: d, parcela: 1, de: 1 };
}

/** Quebra um texto CSV em linhas e células. Acha sozinho o separador (; , ou tabulação) e respeita aspas. */
export function separaCsv(texto) {
  const t = String(texto ?? "").replace(/^﻿/, ""), ini = t.split(/\r?\n/).slice(0, 12).join("\n");
  const conta = (ch) => ini.split(ch).length - 1;
  const sep = [";", "\t", ","].sort((a, b) => conta(b) - conta(a))[0];
  const linhas = []; let cel = "", lin = [], aspas = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (aspas) { if (ch === '"') { if (t[i + 1] === '"') { cel += '"'; i++; } else aspas = false; } else cel += ch; }
    else if (ch === '"') aspas = true;
    else if (ch === sep) { lin.push(cel); cel = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && t[i + 1] === "\n") i++; lin.push(cel); linhas.push(lin); lin = []; cel = ""; }
    else cel += ch;
  }
  if (cel || lin.length) { lin.push(cel); linhas.push(lin); }
  return linhas.map((l) => l.map((c) => (typeof c === "string" ? c.trim() : c))).filter((l) => l.some((c) => c !== ""));
}

const PAGAMENTO = /pagamento (recebido|efetuado|de fatura|da fatura|fatura)|pagto|pgto|pagamento em|pag fatura|payment|credito de pagamento/;
// Do lado das compras, só é pagamento o que diz isso com todas as letras. Do outro lado (dinheiro voltando), basta falar em pagamento.
const fecha = (it, compra) => ({ ...it, valor: round2(Math.abs(it.valor)),
  tipo: compra ? (PAGAMENTO.test(norm(it.descricao)) ? "pagamento" : "compra") : /pagamento|pagto|pgto|payment/.test(norm(it.descricao)) ? "pagamento" : "estorno" });

/**
 * Decide o que é compra, o que é pagamento da fatura e o que é estorno.
 * Cada banco usa um sinal: uns põem a compra positiva, outros negativa. A maioria das linhas de um extrato de cartão
 * é compra, então o sinal que mais aparece é o das compras (no OFX, a compra é sempre a negativa).
 */
function classifica(itens, sinalCompra = 0) {
  const us = itens.filter((i) => i.valor);
  const s = sinalCompra || (us.filter((i) => i.valor > 0).length >= us.filter((i) => i.valor < 0).length ? 1 : -1);
  return us.map((i) => fecha(i, Math.sign(i.valor) === s));
}

/** Lê as linhas de uma tabela (CSV ou planilha). Acha as colunas pelo título ou, se não tiver título, pelo conteúdo. */
export function leLinhas(linhas, hoje) {
  const T = linhas.map((l) => l.map((c) => (c == null ? "" : c)));
  const acha = (cab, testes, fora = /$^/) => { for (const re of testes) { const i = cab.findIndex((c) => re.test(c) && !fora.test(c)); if (i >= 0) return i; } return -1; };
  let ini = 0, cD = -1, cT = -1, cV = -1, cP = -1, cC = -1;
  for (let i = 0; i < Math.min(T.length, 25); i++) {
    const cab = T[i].map(norm);
    const d = acha(cab, [/^data (da |de )?(compra|transacao|lancamento|movimento|movimentacao)$/, /^data$/, /^date$/, /^dt\b/, /\bdata\b/], /vencimento|pagamento|fechamento/);
    const v = acha(cab, [/valor.*r\$/, /^valor$/, /^amount$/, /\bvalor\b/, /quantia|montante|amount/], /us\$|dolar|cotacao|usd/);
    const t = acha(cab, [/^descricao$/, /descri/, /estabelecimento/, /^title$|^titulo$/, /lancamento/, /historico/, /memo/, /^nome$/], /nome no cartao|portador|data/);
    if (d >= 0 && v >= 0 && t >= 0) { ini = i + 1; cD = d; cV = v; cT = t; cP = acha(cab, [/parcela/]); cC = acha(cab, [/categoria|category/]); break; }
  }
  if (cD < 0) {   // sem linha de título: descobre as colunas pelo que tem dentro
    const n = Math.max(0, ...T.map((l) => l.length)), am = T.slice(0, 60), virg = usaVirgula(am.flat());
    const nota = (c, f) => am.filter((l) => f(l[c])).length / Math.max(1, am.length);
    const cols = [...Array(n).keys()];
    cD = cols.find((c) => nota(c, (x) => leData(x, hoje)) > 0.6) ?? -1;
    const dinheiro = (x) => x !== "" && leNumero(x, virg) !== null && (typeof x === "number" || /[.,]\d{1,2}\)?-?$/.test(String(x).trim()));
    cV = [...cols].reverse().find((c) => c !== cD && nota(c, dinheiro) > 0.6) ?? -1;
    const tam = (c) => am.reduce((s, l) => s + String(l[c] ?? "").length, 0);
    cT = cols.filter((c) => c !== cD && c !== cV && nota(c, (x) => /\p{L}{2}/u.test(String(x))) > 0.6).sort((a, b) => tam(b) - tam(a))[0] ?? -1;
    if (cD < 0 || cV < 0 || cT < 0) return [];
  }
  const corpo = T.slice(ini), virg = usaVirgula(corpo.map((l) => l[cV]));
  const itens = [];
  for (const l of corpo) {
    const data = leData(l[cD], hoje), valor = leNumero(l[cV], virg), texto = String(l[cT] ?? "").trim();
    if (!data || valor === null || !texto) continue;
    let p = separaParcela(texto, cP >= 0 ? l[cP] : "");
    // Alguns bancos põem "Parcela 2/5" em outra coluna (tipo da compra, por exemplo).
    if (p.de === 1) { const c = l.find((x, i) => i !== cD && i !== cV && i !== cT && /parc\w*\.?\s*\d{1,2}\s*(\/|de)\s*\d{1,2}/i.test(String(x))); if (c) p = separaParcela(texto, c); }
    itens.push({ data, descricao: p.descricao, valor, parcela: p.parcela, de: p.de, id: "", catBanco: cC >= 0 ? String(l[cC] ?? "").trim() : "" });
  }
  return classifica(itens);
}

/** Lê um arquivo OFX: cada compra vem em um bloco <STMTTRN>. */
export function leOfx(texto) {
  const campo = (b, nome) => { const m = b.match(new RegExp(`<${nome}>([^<\\r\\n]*)`, "i")); return m ? m[1].trim() : ""; };
  const itens = [];
  for (const b of String(texto).split(/<STMTTRN>/i).slice(1)) {
    const dt = campo(b, "DTPOSTED"), valor = Number(campo(b, "TRNAMT").replace(",", "."));
    const data = /^\d{8}/.test(dt) ? `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}` : null;
    const texto1 = campo(b, "MEMO") || campo(b, "NAME");
    if (!data || !Number.isFinite(valor) || !texto1) continue;
    const p = separaParcela(texto1.replace(/&amp;/g, "&"));
    itens.push({ data, descricao: p.descricao, valor, parcela: p.parcela, de: p.de, id: campo(b, "FITID"), catBanco: "" });
  }
  return classifica(itens, itens.some((i) => i.valor < 0) ? -1 : 1);
}

const BANCOS = [[/nu pagamentos|nubank/, "Nubank"], [/itau/, "Itaú"], [/bradesco/, "Bradesco"], [/santander/, "Santander"], [/banco inter|\binter\b/, "Inter"], [/\bc6\b/, "C6 Bank"],
  [/banco do brasil/, "Banco do Brasil"], [/caixa/, "Caixa"], [/picpay/, "PicPay"], [/mercado pago/, "Mercado Pago"], [/\bxp\b/, "XP"], [/\bbtg\b/, "BTG"], [/\bpan\b/, "Banco Pan"], [/sicredi/, "Sicredi"], [/sicoob/, "Sicoob"]];
/** Nome curto do banco a partir do nome que vem no arquivo ("NU PAGAMENTOS S.A." → "Nubank"). */
export function nomeDoBanco(texto) {
  const t = norm(texto); if (!t) return "";
  const b = BANCOS.find(([re]) => re.test(t)); if (b) return b[1];
  return String(texto).replace(/\b(s\.?a\.?|ltda\.?|banco)\b/gi, "").replace(/[.\-_]+/g, " ").trim().split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

/**
 * O que o OFX conta além das compras: o banco e o período da fatura. O fim do período é o dia em que a fatura fecha.
 * @returns {{banco:string, inicio:string|null, fecha:string|null}}
 */
export function infoDoOfx(texto) {
  const campo = (nome) => { const m = String(texto).match(new RegExp(`<${nome}>([^<\\r\\n]*)`, "i")); return m ? m[1].trim() : ""; };
  const dia = (v) => (/^\d{8}/.test(v) ? `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}` : null);
  return { banco: nomeDoBanco(campo("ORG")), inicio: dia(campo("DTSTART")), fecha: dia(campo("DTEND")) };
}

/**
 * Data de vencimento escrita no nome do arquivo (o Nubank exporta "Nubank_2026-10-14.ofx", com o dia em que a fatura vence).
 * Só vale se cair até 25 dias depois do fechamento; sem a data de fechamento, não dá para confiar.
 */
export function vencimentoDoNome(nome, fecha) {
  const m = String(nome || "").match(/(20\d{2})[-_.](\d{2})[-_.](\d{2})/); if (!m || !fecha) return null;
  const v = `${m[1]}-${m[2]}-${m[3]}`, dias = (new Date(v) - new Date(fecha)) / 86400000;
  return valida(Number(m[1]), Number(m[2]), Number(m[3])) && dias > 0 && dias <= 25 ? v : null;
}

/**
 * Lê o extrato. Passe `texto` (CSV ou OFX) ou `linhas` (planilha já aberta, uma lista de linhas). `nome` é o nome do arquivo.
 * @returns {{formato:"ofx"|"csv"|"planilha", compras:object[], pagamentos:object[], estornos:object[], info:{banco:string, inicio:string|null, fecha:string|null, vencimento:string|null}}}
 * Cada item: { data, descricao, valor (positivo), parcela, de, id, catBanco, tipo }.
 */
export function leExtrato({ texto, linhas, hoje, nome = "" }) {
  const ofx = !linhas && /<OFX>|<STMTTRN>/i.test(texto || "");
  const itens = ofx ? leOfx(texto) : leLinhas(linhas || separaCsv(texto), hoje);
  const de = (t) => itens.filter((i) => i.tipo === t);
  const info = ofx ? infoDoOfx(texto) : { banco: "", inicio: null, fecha: null };
  if (!info.banco) info.banco = BANCOS.find(([re]) => re.test(norm(nome).replace(/[_\-.]+/g, " ")))?.[1] || "";
  info.vencimento = vencimentoDoNome(nome, info.fecha);
  return { formato: ofx ? "ofx" : linhas ? "planilha" : "csv", compras: de("compra"), pagamentos: de("pagamento"), estornos: de("estorno"), info };
}

/**
 * Fatura (mês de vencimento) a que o extrato pertence. Quando o arquivo diz o vencimento ou o dia em que a fatura fecha,
 * vale o que ele diz. Senão, é a que mais aparece entre as compras que não são parcela antiga.
 */
export function faturaProvavel(cartao, compras, hoje, info = null) {
  if (info?.vencimento) return mKey(info.vencimento);
  if (info?.fecha) return Number(cartao.vencimento) > Number(info.fecha.slice(8, 10)) ? mKey(info.fecha) : addM(mKey(info.fecha), 1);
  const base = compras.filter((i) => i.parcela <= 1), cont = new Map();
  for (const i of base.length ? base : compras) { const m = mesDaFatura(cartao, i.data); cont.set(m, (cont.get(m) || 0) + 1); }
  return [...cont.entries()].sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]))[0]?.[0] || mesDaFatura(cartao, hoje);
}

/**
 * Data com que a compra é lançada para cair na fatura do mês m. A data do extrato é mantida quando já cai nessa fatura.
 * Parcela antiga (a compra foi meses atrás) e compra que o banco pôs na fatura um dia antes ou depois do fechamento
 * cadastrado vão para o dia mais próximo dentro do período da fatura.
 */
export function dataNaFatura(cartao, m, data) {
  const p = periodoDaFatura(cartao, m);
  return data < p.de ? p.de : data > p.ate ? p.ate : data;
}

/**
 * Marca do item para não importar duas vezes a mesma compra. Usa o código do banco (OFX) quando existe;
 * senão, data, valor, descrição e parcela. `n` distingue compras idênticas no mesmo arquivo (dois cafés iguais no mesmo dia).
 */
export function chaveDoItem(cartaoId, it, n = 0) {
  const base = it.id ? `id:${it.id}` : [it.data, round2(it.valor).toFixed(2), norm(it.descricao).slice(0, 40), `${it.parcela}/${it.de}`, n].join("|");
  return `ext|${String(cartaoId).slice(0, 8)}|${base}`;
}
/** Dá a cada compra a sua chave, numerando as repetidas. */
export function comChaves(cartaoId, compras) {
  const vistos = new Map();
  return compras.map((it) => { const k = chaveDoItem(cartaoId, it, 0), n = vistos.get(k) || 0; vistos.set(k, n + 1); return { ...it, chave: chaveDoItem(cartaoId, it, n) }; });
}
