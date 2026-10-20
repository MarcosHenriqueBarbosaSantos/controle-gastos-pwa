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

/* ===== Extrato da conta do Nubank em PDF =====
 * No PDF do Nubank cada movimento é "tipo + nome - documento - banco" e o valor fica na coluna da direita, que ao virar texto
 * cai no fim da primeira linha ou até no meio do documento ("17.895.646 39,29 /0001-87"). Por isso o valor é o primeiro número com
 * vírgula do movimento, e o sinal vem do tipo ("enviada" sai, "recebida" entra) ou do bloco "Total de entradas/saídas" do dia.
 */
const MES_NU = { JAN: 1, FEV: 2, MAR: 3, ABR: 4, MAI: 5, JUN: 6, JUL: 7, AGO: 8, SET: 9, OUT: 10, NOV: 11, DEZ: 12 };
const DINHEIRO = /\d{1,3}(?:\.\d{3})*,\d{2}/;
const COMECO = /^(transfer[êe]ncia (?:enviada|recebida)(?: pelo pix)?|compra no d[ée]bito|pagamento de fatura|pagamento de boleto|pix no cr[ée]dito|valor adicionado(?: na conta)?(?: por cart[ãa]o de cr[ée]dito)?|estorno|resgate|aplica[çc][ãa]o|saque|dep[óo]sito|reembolso|cashback|rendimento)\s*/i;
const PARA = /^(total de (?:entradas|sa[ií]das)|saldo\b|extrato gerado|tem alguma d[úu]vida|nu pagamentos|ouvidoria|sac\b|p[áa]gina\b|\d+ de \d+$|valores em)/i;
const DATA_NU = /^(\d{1,2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\w*\.?\s+(\d{4})\b/i;
const sinalDoTipo = (t) => (/enviada|compra|pagamento|aplica|saque|cr[ée]dito/i.test(t) ? -1 : /recebida|adicionado|estorno|resgate|dep[óo]sito|reembolso|cashback|rendimento/i.test(t) ? 1 : 0);

/** O PDF é o extrato da conta do Nubank? Vários movimentos de Pix ou débito, cada um com valor. */
export function ehExtratoNubankPdf(linhas) {
  const texto = (linhas || []).join("\n");
  const movs = (texto.match(/(?:^|\n)\s*(?:transfer[êe]ncia (?:enviada|recebida) pelo pix|compra no d[ée]bito)/gi) || []).length;
  return movs >= 3 && DINHEIRO.test(texto);
}

/**
 * Lê as linhas de texto do PDF do Nubank. Devolve no formato do leitor de conta, como leExtratoDeContaPdf.
 * @returns {{linhas: (string|number)[][], titular: string, meses: string[]}}
 */
export function leExtratoNubankPdf(linhas) {
  const saida = [["Data", "Valor", "Identificador", "Descrição"]], meses = new Set();
  let data = "", bloco = 0, atual = null;
  const fecha = () => {
    if (!atual) return; const r = atual; atual = null;
    let texto = r.partes.join(" ").replace(/\s+/g, " ").trim();
    const m = texto.match(DINHEIRO); if (!m || !r.data) return;
    const valor = Number(m[0].replace(/\./g, "").replace(",", "."));
    if (!(valor > 0)) return;
    texto = texto.replace(new RegExp(`(?:R\$\s*)?[-+]?\s*${m[0].replace(/[.]/g, "\.")}`), " ").replace(/(\d)\s+\/(\d{4})/g, "$1/$2").replace(/\s+-\s*$/, "").replace(/\s{2,}/g, " ").trim();
    const c = texto.match(COMECO); if (!c) return;
    const tipo = c[0].trim(), resto = texto.slice(c[0].length).replace(/^[-\s]+/, "");
    const sinal = sinalDoTipo(tipo) || bloco || -1;
    saida.push([r.data, sinal * valor, "", resto ? `${tipo} - ${resto}` : tipo]); meses.add(r.data.slice(0, 7));
  };
  for (const bruta of linhas || []) {
    const l = String(bruta).trim(); if (!l) continue;
    const d = l.match(DATA_NU);
    if (d && MES_NU[d[2].toUpperCase()]) { fecha(); data = `${d[3]}-${String(MES_NU[d[2].toUpperCase()]).padStart(2, "0")}-${d[1].padStart(2, "0")}`; bloco = 0; const resto = l.slice(d[0].length); if (/total de entradas/i.test(resto)) bloco = 1; else if (/total de sa[ií]das/i.test(resto)) bloco = -1; continue; }
    if (/^total de entradas/i.test(l)) { fecha(); bloco = 1; continue; }
    if (/^total de sa[ií]das/i.test(l)) { fecha(); bloco = -1; continue; }
    if (PARA.test(l)) { fecha(); continue; }
    if (COMECO.test(l)) { fecha(); atual = { data, partes: [l] }; continue; }
    if (atual) atual.partes.push(l);
  }
  fecha();
  return { linhas: saida, titular: "", meses: [...meses].sort() };
}

/**
 * Um PDF com muitas linhas de data e valor (extrato ou fatura) que o app não sabe ler por linha: diz do que parece ser, para a tela
 * explicar o que fazer em vez de tratar como um comprovante só.
 * @returns {"fatura"|"extrato"|null}
 */
export function documentoDeVariasLinhas(linhas) {
  const texto = (linhas || []).join("\n"), valores = (texto.match(new RegExp(DINHEIRO.source, "g")) || []).length;
  const datas = (texto.match(/\b\d{1,2}[\/ ](?:\d{1,2}|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z]*\.?(?:[\/ ]\d{2,4})?\b/gi) || []).length;
  if (valores < 8 || datas < 5) return null;
  return /fatura|vencimento|limite|fechamento/i.test(texto) && !/extrato da conta|extrato conta/i.test(texto) ? "fatura" : "extrato";
}
