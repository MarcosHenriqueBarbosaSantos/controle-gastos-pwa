// Leitura de QR code e de código de barras: Pix, nota fiscal (NFC-e e SAT) e boleto.
// O código é lido e entendido no aparelho: o app tira dele o que já vem escrito (valor, nome de quem recebe, data).
// A única consulta para fora é a da nota fiscal de mercado, cujo QR code é só um endereço do site da Fazenda:
// com a pessoa logada, o servidor do app (supabase/functions/nota) abre esse endereço e devolve valor, loja e itens.
import { lePix, leCodigoDePagamento } from "./leitor.js";

/* ===================== entender o texto do código (funções puras) ===================== */

/** Conferência do Pix: CRC16-CCITT (polinômio 0x1021, início 0xFFFF), em 4 letras hexadecimais. */
export function crc16(texto) {
  let c = 0xffff;
  for (const b of new TextEncoder().encode(texto)) {
    c ^= b << 8;
    for (let i = 0; i < 8; i++) c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xffff : (c << 1) & 0xffff;
  }
  return c.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Pix "copia e cola" (o texto de dentro do QR code do Pix).
 * `conferido` diz se o código de verificação do fim fecha: aí o valor é exatamente o que está no código.
 * @returns {{valor:number|null, nome:string, conferido:boolean}|null}
 */
export function lePixQr(texto) {
  const s = String(texto ?? "").trim(), p = lePix(s);
  if (!p) return null;
  const i = s.indexOf("000201"), cod = s.slice(i), fim = cod.match(/6304([0-9A-Fa-f]{4})$/);
  return { valor: p.valor, nome: p.nome, conferido: Boolean(fim) && crc16(cod.slice(0, -4)) === fim[1].toUpperCase() };
}

/** Dígito verificador da chave de acesso de nota fiscal (módulo 11, pesos de 2 a 9, da direita para a esquerda). */
const dvDaChave = (c43) => { let soma = 0, peso = 2; for (let i = c43.length - 1; i >= 0; i--) { soma += Number(c43[i]) * peso; peso = peso === 9 ? 2 : peso + 1; } const r = 11 - (soma % 11); return r >= 10 ? 0 : r; };
const chaveOk = (c) => /^\d{44}$/.test(c) && dvDaChave(c.slice(0, 43)) === Number(c[43]);
const dinheiro = (t) => { const v = Number(String(t ?? "").replace(",", ".")); return v > 0 && v < 1e7 ? Math.round(v * 100) / 100 : null; };
const dataOk = (iso) => /^\d{4}-\d{2}-\d{2}$/.test(iso) && !Number.isNaN(Date.parse(iso + "T12:00:00Z")) && new Date(iso + "T12:00:00Z").toISOString().slice(0, 10) === iso;

/**
 * QR code de nota fiscal de compra: NFC-e (a maioria dos estados) e cupom SAT (São Paulo).
 * A chave de acesso diz o mês e o CNPJ da loja. O valor só vem no cupom SAT, na NFC-e emitida sem internet e nas notas antigas.
 * @returns {{chave:string, cnpj:string, mes:string, valor:number|null, data:string|null, link:string}|null}
 *   `link` só vem quando o endereço é https e de um site do governo (.gov.br); senão fica vazio.
 */
export function leNotaQr(texto) {
  const s = String(texto ?? "").trim();
  let chave = "", valor = null, data = null, link = "";
  // Cupom SAT: chave|AAAAMMDDhhmmss|valor|CPF ou CNPJ de quem comprou|assinatura
  const sat = s.match(/^(?:CFe)?(\d{44})\|(\d{14})\|(\d{1,9}[.,]\d{2})\|/);
  if (sat) { chave = sat[1]; valor = dinheiro(sat[3]); const d = `${sat[2].slice(0, 4)}-${sat[2].slice(4, 6)}-${sat[2].slice(6, 8)}`; data = dataOk(d) ? d : null; }
  else if (/^https?:\/\//i.test(s)) {
    let u; try { u = new URL(s); } catch { return null; }
    const p = u.searchParams.get("p");
    if (p) {   // NFC-e atual: chave|versão|ambiente|… Emitida sem internet, traz também o dia e o valor.
      const partes = p.split("|"); chave = partes[0];
      if (partes.length >= 8) { valor = dinheiro(partes[4]); if (/^\d{1,2}$/.test(partes[3])) data = partes[3].padStart(2, "0"); }
    } else if (u.searchParams.get("chNFe")) {   // NFC-e antiga: cada informação em um campo do endereço
      chave = u.searchParams.get("chNFe"); valor = dinheiro(u.searchParams.get("vNF"));
      const hex = u.searchParams.get("dhEmi") || "";
      if (/^([0-9a-f]{2})+$/i.test(hex)) { const t = hex.match(/../g).map((h) => String.fromCharCode(parseInt(h, 16))).join("").slice(0, 10); if (dataOk(t)) data = t; }
    }
    if (u.protocol === "https:" && /\.gov\.br$/i.test(u.hostname)) link = u.href;
  }
  if (!chaveOk(chave)) return null;
  const mes = `20${chave.slice(2, 4)}-${chave.slice(4, 6)}`;
  if (!/^20\d\d-(0[1-9]|1[0-2])$/.test(mes)) return null;
  if (data && data.length === 2) data = dataOk(`${mes}-${data}`) ? `${mes}-${data}` : null;   // a nota sem internet traz só o dia
  if (data && data.slice(0, 7) !== mes) data = null;
  return { chave, cnpj: chave.slice(6, 20), mes, valor, data, link };
}

const brl = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const ddmm = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/**
 * Entende o texto lido de um QR code ou de um código de barras e devolve uma leitura no mesmo formato do leitor de fotos,
 * pronta para a tela de conferência. `aviso` é a frase que explica à pessoa o que foi lido e o que falta.
 * Devolve null quando o código não é de Pix, de nota fiscal nem de boleto.
 * @returns {{origem:"pix"|"nota"|"boleto", tipo:string, valor:number|null, valores:number[], data:string|null, vencimento:string|null,
 *            descricao:string, forma:string, cartao:string, achouData:boolean, firme:boolean, aviso:string, link:string}|null}
 */
export function interpretaQr(texto, hoje) {
  const base = { tipo: "comprovante", valor: null, valores: [], data: null, vencimento: null, descricao: "", forma: "", cartao: "", achouData: false, firme: true, aviso: "", link: "" };
  const pix = lePixQr(texto);
  if (pix) {
    const quem = pix.nome ? ` para ${pix.nome}` : "";
    return { ...base, origem: "pix", valor: pix.valor, descricao: pix.nome, forma: "Pix", data: hoje, firme: pix.conferido || pix.valor === null,
      aviso: pix.valor === null ? `É um Pix${quem}, mas o QR code não traz o valor. Digite quanto você pagou.`
        : pix.conferido ? `Li o Pix: ${brl(pix.valor)}${quem}. Deixei a data de hoje; mude se pagou em outro dia.`
        : `Li o Pix: ${brl(pix.valor)}${quem}, mas o código parece incompleto. Confira o valor antes de salvar.` };
  }
  const nota = leNotaQr(texto);
  if (nota) {
    const noMes = nota.mes === hoje.slice(0, 7), data = nota.data || (noMes ? hoje : `${nota.mes}-01`);
    const quando = `${MESES[Number(nota.mes.slice(5)) - 1]} de ${nota.mes.slice(0, 4)}`;
    return { ...base, origem: "nota", valor: nota.valor, data, achouData: Boolean(nota.data), descricao: "Compra com nota fiscal", link: nota.link,
      aviso: nota.valor !== null ? `Li a nota fiscal: ${brl(nota.valor)}${nota.data ? `, de ${ddmm(nota.data)}` : `, de ${quando}`}. Confira a data, a descrição e a forma de pagamento.`
        : `É uma nota fiscal de ${quando}, mas o QR code dela não traz o valor. Digite o valor, ou volte e fotografe o cupom inteiro para o app ler o total.` };
  }
  const cod = /^[\d\s.\-]{44,60}$/.test(String(texto ?? "").trim()) ? leCodigoDePagamento(String(texto), hoje) : null;
  if (cod) {
    return { ...base, origem: "boleto", valor: cod.valor, vencimento: cod.vencimento, descricao: cod.tipo === "boleto" ? "Boleto" : "Conta", forma: "Boleto", firme: cod.conferido,
      aviso: `Li o código de barras: ${brl(cod.valor)}${cod.vencimento ? `, com vencimento em ${ddmm(cod.vencimento)}` : ""}. Deixei a data de hoje; diga do que é a conta na descrição.` };
  }
  return null;
}

/* ===================== a nota consultada na Fazenda (funções puras) ===================== */

const semAcento = (t) => String(t ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const MIUDAS = new Set(["e", "de", "da", "do", "das", "dos", "em"]);
/** "COMPANHIA EXEMPLO COMERCIO E INDUSTRIA LTDA" → "Companhia Exemplo Comercio e Industria". */
export function nomeDaLoja(razao) {
  let s = String(razao ?? "").replace(/\s+/g, " ").trim().replace(/[\s,.\-]+(ltda|s\.?\s?a\.?|me|epp|eireli|cia)\.?$/i, "").trim();
  if (s && s === s.toUpperCase()) s = s.toLowerCase().split(" ").map((w, i) => (i > 0 && MIUDAS.has(w) ? w : w.replace(/^\p{L}/u, (c) => c.toUpperCase()))).join(" ");
  return s.slice(0, 60);
}

// Abreviações e nomes de produtos que aparecem em cupom de supermercado.
const DE_MERCADO = /\b(arroz|feij\w*|leite|lte|pao|acucar|cafe|oleo|carne|frango|bisc\w*|macarrao|queijo|ovos?|banana|batata|tomate|cebola|alface|alho|refri\w*|ref|agua|ag|suco|iogurte|manteiga|margarina|farinha|sabao|sab|sabonete|deterg\w*|det|papel|amaciante|shampoo|cerveja|cerv|hamb\w*|presunto|mussarela|linguica|uva|maca|laranja|achoc\w*|molho|sal|tempero)\b/;
/**
 * Palpite de categoria pelos itens da nota: "Mercado" quando boa parte deles é de supermercado. Vazio quando não dá para dizer.
 * @param {{itens?:{nome:string}[]}} nota
 */
export function categoriaDaNota(nota) {
  const itens = nota?.itens || [], sim = itens.filter((i) => DE_MERCADO.test(semAcento(i.nome))).length;
  return sim >= 3 || (sim >= 2 && sim / itens.length >= 0.4) ? "Mercado" : "";
}

/** Os itens da nota em linhas de texto, para a pessoa conferir: "2 UN  LEITE INTEGRAL 1L  10,98". */
export function itensEmTexto(nota) {
  const n = (v) => v.toLocaleString("pt-BR", { maximumFractionDigits: 3 }), d = (v) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (nota?.itens || []).map((i) => `${i.qtd ? n(i.qtd) + (i.un ? " " + i.un : "") + "  " : ""}${i.nome}${i.valor ? "  " + d(i.valor) : ""}`).join("\n");
}

/**
 * Junta o que o servidor leu na Fazenda com a leitura do QR code. `base` é o que interpretaQr devolveu para a nota.
 * @param {{loja:string, valor:number, data:string|null, forma:string, qtdItens:number, itens:object[]}} nota
 */
export function leituraDaNota(nota, base, hoje) {
  const loja = nomeDaLoja(nota.loja), data = /^\d{4}-\d{2}-\d{2}$/.test(nota.data || "") ? nota.data : base.data || hoje;
  const itens = nota.qtdItens > 0 ? `, com ${nota.qtdItens} ${nota.qtdItens === 1 ? "item" : "itens"}` : "";
  return { ...base, origem: "nota", consultada: true, valor: nota.valor, valores: [], data, achouData: Boolean(nota.data), descricao: loja || base.descricao, forma: nota.forma || "", categoria: categoriaDaNota(nota), firme: true,
    aviso: `Consultei a nota na Fazenda: ${brl(nota.valor)}${loja ? ` em ${loja}` : ""}, de ${ddmm(data)}${itens}. ${nota.forma ? "Confira a categoria e a forma de pagamento." : "Confira a categoria e escolha a forma de pagamento."}` };
}

/* ===================== ler o código da câmera ou de uma imagem (só no navegador) ===================== */

const JSQR = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js";
let baixando = null;
/** O leitor de QR code em JavaScript, para os aparelhos que não têm um próprio. É baixado na primeira vez que é usado. */
function carregaJsQr() {
  if (window.jsQR) return Promise.resolve(window.jsQR);
  baixando ||= new Promise((ok, erro) => {
    const s = document.createElement("script"); s.src = JSQR; s.async = true;
    s.onload = () => (window.jsQR ? ok(window.jsQR) : erro(new Error("leitor-indisponivel")));
    s.onerror = () => { baixando = null; s.remove(); erro(new Error("leitor-indisponivel")); };
    document.head.appendChild(s);
  });
  return baixando;
}

/**
 * Cria o leitor de códigos. Usa o leitor do próprio aparelho quando existe (Android e Mac: lê QR code e código de barras);
 * nos outros, usa o leitor em JavaScript, que lê só QR code.
 * @returns {Promise<{barras:boolean, le:(fonte:HTMLVideoElement|HTMLCanvasElement|ImageBitmap, maior?:number)=>Promise<string[]>}>}
 */
export async function criaLeitorDeCodigos() {
  if ("BarcodeDetector" in window) {
    try {
      const f = await window.BarcodeDetector.getSupportedFormats();
      if (f.includes("qr_code")) {
        const d = new window.BarcodeDetector({ formats: f.filter((x) => x === "qr_code" || x === "itf") });
        return { barras: f.includes("itf"), le: async (fonte) => (await d.detect(fonte)).map((x) => x.rawValue).filter(Boolean) };
      }
    } catch { /* leitor do aparelho indisponível: usa o de JavaScript */ }
  }
  const jsQR = await carregaJsQr();
  const tela = document.createElement("canvas"), ctx = tela.getContext("2d", { willReadFrequently: true });
  return { barras: false, le: async (fonte, maior = 900) => {
    const w0 = fonte.videoWidth || fonte.width, h0 = fonte.videoHeight || fonte.height;
    if (!w0 || !h0) return [];
    const k = Math.min(1, maior / Math.max(w0, h0)), w = Math.round(w0 * k), h = Math.round(h0 * k);
    tela.width = w; tela.height = h; ctx.drawImage(fonte, 0, 0, w, h);
    const r = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "attemptBoth" });
    return r?.data ? [r.data] : [];
  } };
}

/** Procura um código em uma foto ou print. Em foto grande, o código pode estar pequeno: tenta em mais de um tamanho. */
export async function codigosDaImagem(arquivo, leitor) {
  const img = await createImageBitmap(arquivo);
  try {
    for (const maior of [1000, 1800, 2800]) {
      const achados = await leitor.le(img, maior);
      if (achados.length) return achados;
      if (Math.max(img.width, img.height) <= maior) break;   // já foi lida no tamanho real
    }
    return [];
  } finally { img.close?.(); }
}
