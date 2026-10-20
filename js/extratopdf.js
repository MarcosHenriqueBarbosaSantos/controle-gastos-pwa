// Extrato da conta em PDF (hoje o do Itaú, que junta vários meses): lê as linhas do PDF e entrega no formato do leitor de conta (js/conta.js).
// Funções puras, sem tela (testadas em tests/extratopdf.test.mjs). O texto do PDF vem de linhasDoPdf (js/leitor.js).

const NUM = String.raw`-?\d{1,3}(?:\.\d{3})*,\d{2}`;
const LINHA = new RegExp(String.raw`^(\d{2})/(\d{2})/(\d{4})\s+(.+?)\s+(${NUM})(?:\s+(${NUM}))?$`);

/** O PDF é um extrato de conta (linhas com data, descrição e valor, sob o título "extrato conta")? */
export function ehExtratoDeContaPdf(linhas) {
  const texto = (linhas || []).slice(0, 40).join(" ").toLowerCase();
  if (!/extrato\s+conta|extrato\s+de\s+conta/.test(texto) || !/lan[cç]amentos/.test(texto)) return false;
  return linhas.filter((l) => LINHA.test(l)).length >= 3;
}

/** Nome do titular: a primeira linha do extrato do Itaú é "Nome CPF agência: … conta: …". */
export function titularDoPdf(linhas) {
  for (const l of (linhas || []).slice(0, 12)) {
    const m = String(l).match(/^(\p{L}[\p{L}'. ]{3,}?)\s+\d{3}\.\d{3}\.\d{3}-\d{2}\b/u);
    if (m) return m[1].trim();
  }
  return "";
}

/** O banco escreve a data da operação colada no fim da descrição ("PIX QRS POSTO JAMAI10/10"); a data da linha é a do lançamento. */
function dataDaOperacao(postagem, dd, mm) {
  const y = Number(postagem.slice(0, 4)), cand = (ano) => `${ano}-${mm}-${dd}`;
  let d = cand(y); if (d > postagem) d = cand(y - 1);
  const dias = (new Date(postagem) - new Date(d)) / 86400000;
  return Number.isFinite(dias) && dias >= 0 && dias <= 20 ? d : postagem;
}

/** Descrição do Itaú → o texto que o leitor de conta entende ("Transferência enviada pelo Pix - Nome"). */
function descreve(texto, valor) {
  const saiu = valor < 0, nome = (s) => s.replace(/\s+/g, " ").trim();
  let m;
  if ((m = texto.match(/^PIX\s+TRANSF\.?\s+(.+)$/i))) return `Transferência ${saiu ? "enviada" : "recebida"} pelo Pix - ${nome(m[1])}`;
  if ((m = texto.match(/^PIX\s+QRS\.?\s+(.+)$/i))) return `Transferência ${saiu ? "enviada" : "recebida"} pelo Pix - ${nome(m[1])} - QR`;   // pago por QR code: quase sempre uma loja
  if ((m = texto.match(/^(?:TED|DOC)\b[\s.\d-]*?\s*([A-Za-zÀ-ú].*)?$/i))) return `Transferência ${saiu ? "enviada" : "recebida"} - ${nome(m[1] || "TED")}`;
  return nome(texto);
}

/**
 * Lê as linhas de texto do PDF. Devolve `linhas` no formato do leitor de conta (Data, Valor, Identificador, Descrição, com título)
 * e o nome do titular. Saldos do dia, saldo anterior e totais ficam de fora: não são movimento.
 * @returns {{linhas: (string|number)[][], titular: string, meses: string[]}}
 */
export function leExtratoDeContaPdf(linhas) {
  const saida = [["Data", "Valor", "Identificador", "Descrição"]], meses = new Set();
  for (const l of linhas || []) {
    const m = String(l).match(LINHA); if (!m) continue;
    const [, d, mo, a, textoBruto, v] = m, postagem = `${a}-${mo}-${d}`;
    if (/^saldo\b|^total\b/i.test(textoBruto.trim())) continue;
    const valor = Number(v.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(valor) || valor === 0) continue;
    let texto = textoBruto.trim(), data = postagem;
    const fim = texto.match(/^(.*?)\s*(\d{2})\/(\d{2})$/);
    if (fim && fim[1]) { texto = fim[1]; data = dataDaOperacao(postagem, fim[2], fim[3]); }
    saida.push([data, valor, "", descreve(texto, valor)]); meses.add(data.slice(0, 7));
  }
  return { linhas: saida, titular: titularDoPdf(linhas), meses: [...meses].sort() };
}
