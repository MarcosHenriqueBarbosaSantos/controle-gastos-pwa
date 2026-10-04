// Leitor de comprovantes, faturas de cartão e holerites, por foto ou por PDF.
// 1) lerImagem: transforma a foto em texto, no próprio aparelho (biblioteca Tesseract.js).
// 2) lerPdf: tira o texto de um PDF (biblioteca pdf.js), também no aparelho. Nada é enviado para servidor.
// 3) interpretaTexto: acha no texto o valor, a data e o que mais der. É uma função pura, testada em tests/leitor.test.mjs.
// A leitura nunca é salva direto: o app mostra o que entendeu e a pessoa confere.

const semAcento = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const pad = (n) => String(n).padStart(2, "0");
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Valores em reais que aparecem em uma linha: "R$ 1.234,56", "45,90", e também "R$ 45.90" (leitura trocando vírgula por ponto). */
function valoresDaLinha(linha) {
  const out = [];
  const re = /(R\s?[$S5]\s*)?(\d{1,3}(?:\.\d{3})+,\d{2}|\d+,\d{2}|\d+\.\d{2})(?![\d,.]*\d)/g;
  let m;
  while ((m = re.exec(linha))) {
    const cifra = Boolean(m[1]), bruto = m[2];
    if (!bruto.includes(",") && !cifra) continue;                    // "12.50" sem R$ pode ser data, hora ou código
    if (/^\d{2}\.\d{2}$/.test(bruto) && /\d{2}\.\d{2}\.\d{2,4}/.test(linha)) continue;   // pedaço de data 03.10.2026
    const v = Number(bruto.includes(",") ? bruto.replace(/\./g, "").replace(",", ".") : bruto);
    if (v > 0 && v < 10000000) out.push({ v, cifra, pos: m.index });
  }
  return out;
}

function dataValida(a, m, d) { const dt = new Date(a, m - 1, d); return dt.getFullYear() === a && dt.getMonth() === m - 1 && dt.getDate() === d; }
const iso = (a, m, d) => `${a}-${pad(m)}-${pad(d)}`;

/** Datas de uma linha. As sem ano voltam com semAno = true, e o ano é decidido por quem chama. */
function datasDaLinha(linha, anoBase) {
  const out = [], t = semAcento(linha);
  let m;
  const num = /(?<!\d)(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4}|\d{2})(?!\d)/g;
  while ((m = num.exec(t))) {
    const d = Number(m[1]), mo = Number(m[2]); let a = Number(m[3]); if (a < 100) a += 2000;
    if (a >= 2000 && a <= 2100 && dataValida(a, mo, d)) out.push({ data: iso(a, mo, d), semAno: false });
  }
  const nome = new RegExp(`(?<!\\d)(\\d{1,2})\\s*(?:de\\s+)?(${MESES.join("|")})[a-z]*\\.?,?\\s*(?:de\\s+)?(\\d{4})?`, "g");
  while ((m = nome.exec(t))) {
    const d = Number(m[1]), mo = MESES.indexOf(m[2]) + 1, a = m[3] ? Number(m[3]) : anoBase;
    if (dataValida(a, mo, d)) out.push({ data: iso(a, mo, d), semAno: !m[3] });
  }
  if (!out.length) {
    const curta = /(?<![\d\/])(\d{1,2})\/(\d{1,2})(?![\d\/])/g;
    while ((m = curta.exec(t))) {
      const d = Number(m[1]), mo = Number(m[2]);
      if (dataValida(anoBase, mo, d)) out.push({ data: iso(anoBase, mo, d), semAno: true });
    }
  }
  return out;
}

const PESO = {
  comprovante: [[/valor (pago|total|da transferencia|do pix|do pagamento|cobrado|a pagar)/, 6], [/total a pagar|total pago|valor final/, 6], [/\bvalor\b/, 4], [/\btotal\b/, 3], [/\bpago\b|\bpagamento\b/, 1],
    [/troco/, -7], [/desconto/, -5], [/saldo/, -6], [/tarifa|juros|multa|encargo/, -3], [/subtotal|sub-total/, -2], [/dinheiro|recebido/, -2], [/limite/, -6], [/cpf|cnpj|agencia|conta\b/, -6], [/acrescimo/, -3]],
  fatura: [[/total (da|desta) fatura|valor (da|desta) fatura|fatura atual|total a pagar|pagamento total|valor total/, 7], [/\btotal\b/, 2], [/\bfatura\b/, 1],
    [/minimo/, -8], [/limite|disponivel/, -8], [/anterior/, -6], [/parcelamento|parcelad|parcele/, -4], [/juros|encargos|multa|iof/, -4], [/pagamentos? recebidos?|pagamento efetuado/, -5], [/saque|credito rotativo/, -4], [/proxima|proximas|futur/, -4]],
};
const BANCOS = ["nubank", "itaucard", "itau", "bradesco", "santander", "inter", "c6", "caixa", "banco do brasil", "picpay", "mercado pago", "will", "next", "neon", "pan", "original", "sicredi", "sicoob", "xp", "btg", "digio", "credicard", "porto", "riachuelo", "renner", "carrefour", "magalu"];

function pontos(tipo, texto) { return PESO[tipo].reduce((t, [re, p]) => t + (re.test(texto) ? p : 0), 0); }

/** Nome bonito: "PADARIA BOA VISTA LTDA" → "Padaria Boa Vista Ltda". */
function arruma(s) {
  s = String(s).replace(/\s+/g, " ").replace(/^[\s:.\-–|]+|[\s:.\-–|]+$/g, "").slice(0, 60);
  return s === s.toUpperCase() ? s.toLowerCase().replace(/(^|\s)\p{L}/gu, (c) => c.toUpperCase()) : s;
}

function achaDescricao(linhas, norm, fiscal) {
  const rotulo = /^(favorecido|recebedor|destinatario|destino|beneficiario|estabelecimento|razao social|quem recebeu|nome do (?:recebedor|favorecido|destinatario)|para|pago para|pagamento para)\b\s*[:\-]?\s*(.*)$/;
  const ruim = (s) => !/\p{L}{3}/u.test(s) || /cpf|cnpj|agencia|\bconta\b|instituicao|banco\b|chave|\bpix\b|\bvalor\b|\bdata\b|\btipo\b/.test(semAcento(s));
  for (let i = 0; i < norm.length; i++) {
    const m = norm[i].match(rotulo); if (!m) continue;
    const resto = linhas[i].slice(linhas[i].length - m[2].length).trim();
    if (m[2] && !ruim(resto)) return arruma(resto);
    // O nome costuma vir nas linhas de baixo, às vezes depois de um rótulo "Nome".
    for (let j = i + 1; j < Math.min(norm.length, i + 5); j++) {
      const n = norm[j].match(/^nome\b\s*[:\-]?\s*(.*)$/);
      const cand = n ? linhas[j].slice(linhas[j].length - n[1].length).trim() : linhas[j].trim();
      if (cand && !ruim(cand) && !rotulo.test(norm[j])) return arruma(cand);
    }
  }
  // Cupom fiscal ou maquininha: o nome da loja costuma ser a primeira linha com letras.
  if (fiscal) { const l = linhas.find((x) => /\p{L}{4}/u.test(x) && !/cupom|fiscal|cnpj|documento|extrato|comprovante|via\b/i.test(semAcento(x))); if (l) return arruma(l); }
  return "";
}

/**
 * Holerite: o que interessa é o valor líquido, o que cai na conta.
 * Devolve o valor, ou null quando não acha.
 */
function liquidoDoHolerite(linhas, norm) {
  const vals = linhas.map((l) => valoresDaLinha(l)), todos = vals.flat().map((x) => x.v);
  // Confere pela conta: líquido = vencimentos − descontos. Em uma linha de totais (vencimentos, descontos, líquido),
  // tanto os descontos quanto o líquido fecham a conta; o líquido é o que vem por último.
  const fecha = (c) => todos.some((a) => a > c && todos.some((b) => b > 0 && Math.abs(a - b - c) < 0.006));
  const daLinha = (l) => l.length === 1 ? l[0] : [...l].reverse().find(fecha) ?? l[l.length - 1];
  const rot = /liquido a receber|valor liquido|total liquido|salario liquido|liquido a pagar|liquido de|\bliquido\b/;
  for (let i = 0; i < norm.length; i++) {
    const m = norm[i].match(rot); if (!m) continue;
    const depois = vals[i].filter((x) => x.pos > m.index);
    if (depois.length) return depois[0].v;                           // "Líquido a receber  3.900,00"
    if (vals[i].length) return daLinha(vals[i].map((x) => x.v));     // valor antes do rótulo
    // Rótulo sozinho na linha: o valor vem mais abaixo. Em tabela, na linha seguinte. Em foto, o leitor costuma separar
    // a coluna dos nomes da coluna dos valores: aí vem uma fila de valores, um por linha, e o líquido é o último dela.
    const j = vals.findIndex((l, k) => k > i && k <= i + 4 && l.length);
    if (j < 0) continue;
    const soValor = (k) => vals[k]?.length && !/[a-z]{3}/.test(norm[k].replace(/r\s?[$s5]/g, ""));
    let fim = j; while (soValor(fim + 1)) fim++;
    const fila = vals.slice(j, fim + 1);
    return soValor(j) && fila.length > 1 && fila.every((l) => l.length === 1) ? fila[fila.length - 1][0].v : daLinha(vals[j].map((x) => x.v));
  }
  // Sem a palavra "líquido": usa a conta, partindo do maior valor do documento. Entre descontos e líquido, o líquido é o maior.
  const ord = [...new Set(todos)].sort((a, b) => b - a);
  for (const a of ord) for (const b of ord) { const c = Math.round((a - b) * 100) / 100; if (b < a && c > 0 && c !== b && ord.includes(c)) return Math.max(b, c); }
  return null;
}

/**
 * Interpreta o texto lido de uma foto ou de um PDF.
 * @param {string} texto  texto bruto devolvido pelo leitor
 * @param {string} hoje   data de hoje, "AAAA-MM-DD"
 * @returns {{tipo:"comprovante"|"fatura"|"holerite", valor:number|null, valores:number[], data:string|null, vencimento:string|null,
 *            descricao:string, forma:string, cartao:string, achouData:boolean}}
 */
export function interpretaTexto(texto, hoje) {
  const linhas = String(texto ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean), norm = linhas.map(semAcento);
  const tudo = norm.join("\n"), ano = Number(hoje.slice(0, 4));
  const tem = (re) => re.test(tudo);

  // Que tipo de documento é?
  const pf = (tem(/\bfatura\b/) ? 2 : 0) + (tem(/vencimento|vence em/) ? 1 : 0) + (tem(/pagamento minimo|minimo/) ? 2 : 0) + (tem(/limite/) ? 1 : 0) + (tem(/total (da|desta) fatura|valor (da|desta) fatura/) ? 3 : 0) + (tem(/fechamento/) ? 1 : 0);
  const pc = (tem(/comprovante/) ? 3 : 0) + (tem(/\bpix\b/) ? 2 : 0) + (tem(/transferencia/) ? 2 : 0) + (tem(/pagamento (realizado|efetuado|aprovado)/) ? 2 : 0) + (tem(/cupom|nfc-?e|nota fiscal|danfe/) ? 3 : 0) + (tem(/favorecido|recebedor|destinatario|quem recebeu/) ? 1 : 0) + (tem(/autenticacao|protocolo|nsu|autorizacao/) ? 1 : 0);
  const ph = (tem(/holerite|contracheque|contra-cheque|recibo de pagamento de salario/) ? 4 : 0) + (tem(/demonstrativo de pagamento|folha de pagamento|folha mensal/) ? 3 : 0)
    + (tem(/salario base|salario contratual|salario mensal/) ? 2 : 0) + (tem(/\bfgts\b/) ? 2 : 0) + (tem(/\binss\b/) ? 1 : 0) + (tem(/\birrf\b|imposto de renda/) ? 1 : 0)
    + (tem(/\bliquido\b/) ? 2 : 0) + (tem(/total de (vencimentos|proventos)|total (vencimentos|proventos)/) ? 2 : 0) + (tem(/total de descontos|total descontos/) ? 1 : 0)
    + (tem(/competencia|matricula|admissao|\bcbo\b|funcionario|empregado/) ? 1 : 0);
  const tipo = ph >= 5 && ph > pf && ph > pc ? "holerite" : pf >= 3 && pf > pc ? "fatura" : "comprovante";
  if (tipo === "holerite") {
    const valor = liquidoDoHolerite(linhas, norm);
    // Só vale uma data que o holerite chama de pagamento ou crédito (a de admissão, por exemplo, não serve).
    const ds = []; linhas.forEach((l, i) => datasDaLinha(l, ano).forEach((d) => { if (!d.semAno) ds.push({ ...d, linha: i }); }));
    const pago = ds.find((d) => [0, 1].some((k) => d.linha - k >= 0 && /data (de|do) (pagamento|credito)|pagamento em|credito em|pago em|data pagto|dt\.? ?pag/.test(norm[d.linha - k])));
    const amanha = new Date(hoje); amanha.setDate(amanha.getDate() + 1);
    const data = pago && new Date(pago.data) <= amanha ? pago.data : null;
    const outros = [...new Set(linhas.flatMap((l, i) => /total|liquido|vencimentos|proventos|descontos|salario base/.test(norm[i]) || (i > 0 && /total|liquido/.test(norm[i - 1])) ? valoresDaLinha(l).map((x) => x.v) : []))]
      .filter((v) => v !== valor).sort((a, b) => b - a).slice(0, 4);
    // Sem totais na mesma linha do nome (foto com as colunas separadas): sugere os maiores valores do documento.
    if (outros.length < 2) outros.splice(0, outros.length, ...[...new Set(linhas.flatMap((l) => valoresDaLinha(l).map((x) => x.v)))].filter((v) => v !== valor).sort((a, b) => b - a).slice(0, 4));
    return { tipo, valor, valores: outros, data, vencimento: null, descricao: "Salário", forma: "", cartao: "", achouData: Boolean(data) };
  }

  // Valor: cada valor ganha pontos pelas palavras da própria linha e, se a linha só tem o número, pelas da linha de cima.
  const cands = [];
  linhas.forEach((l, i) => valoresDaLinha(l).forEach((x) => {
    const sozinho = !/[a-z]{3}/.test(norm[i].replace(/r\s?[$s5]/g, ""));
    let p = pontos(tipo, norm[i]) + (x.cifra ? 1 : 0);
    if (sozinho && i > 0) p += 0.8 * pontos(tipo, norm[i - 1]);
    cands.push({ ...x, linha: i, p });
  }));
  const ordem = [...cands].sort((a, b) => b.p - a.p || b.v - a.v);
  const melhor = ordem.find((c) => c.p > 0) || (cands.length ? [...cands.filter((c) => c.p >= 0)].sort((a, b) => Number(b.cifra) - Number(a.cifra) || b.v - a.v)[0] : null);
  const valor = melhor ? melhor.v : null;
  const valores = [...new Set(ordem.filter((c) => c.p > -5).map((c) => c.v))].filter((v) => v !== valor).slice(0, 4);

  // Datas
  const datas = [];
  linhas.forEach((l, i) => datasDaLinha(l, ano).forEach((d) => datas.push({ ...d, linha: i })));
  const perto = (re, alcance = 1) => datas.find((d) => { for (let k = 0; k <= alcance; k++) if (d.linha - k >= 0 && re.test(norm[d.linha - k])) return true; return false; });
  // Data sem ano: escolhe o ano que deixa a data mais perto de hoje.
  const ajustaAno = (d) => { if (!d?.semAno) return d?.data || null; const [a, m, dia] = d.data.split("-").map(Number);
    return [a - 1, a, a + 1].map((x) => iso(x, m, dia)).sort((p, q) => Math.abs(new Date(p) - new Date(hoje)) - Math.abs(new Date(q) - new Date(hoje)))[0]; };

  let data = null, vencimento = null;
  if (tipo === "fatura") {
    vencimento = ajustaAno(perto(/vencimento|vence|venc\b/, 1)) || null;
  } else {
    const limite = new Date(hoje); limite.setDate(limite.getDate() + 1);
    const serve = (d) => d && new Date(ajustaAno(d)) <= limite && new Date(ajustaAno(d)) > new Date(ano - 3, 0, 1);
    const d = [perto(/data|realizad|efetuad|pago em|emissao|quando/, 1), ...datas].find(serve);
    data = d ? ajustaAno(d) : null;
  }

  // Cupom fiscal ou comprovante de maquininha: o nome da loja vem no alto, sem rótulo.
  const fiscal = tem(/cupom|nfc-?e|nota fiscal|danfe|cnpj|via (do )?cliente|\bnsu\b|\baut\b|maquininha/) && !tem(/\bpix\b|transferencia/);
  const descricao = tipo === "fatura" ? "" : achaDescricao(linhas, norm, fiscal);
  const forma = tem(/\bpix\b/) ? "Pix" : tem(/\bdebito\b/) ? "Débito" : tem(/\bcredito\b/) ? "Cartão de crédito" : tem(/boleto|codigo de barras|linha digitavel/) ? "Boleto" : fiscal && tem(/dinheiro/) ? "Dinheiro" : "";
  const banco = BANCOS.find((b) => new RegExp(`\\b${b}\\b`).test(tudo)) || "";
  // O nome do banco só interessa na fatura (no comprovante, o banco que aparece costuma ser o de quem recebeu).
  return { tipo, valor, valores, data, vencimento, descricao, forma: tipo === "fatura" ? "" : forma,
    cartao: tipo === "fatura" && banco ? arruma(banco.toUpperCase()) : "", achouData: Boolean(data || vencimento) };
}

/* ===================== PDF ===================== */
/**
 * Junta os pedaços de texto de uma página de PDF em linhas, de cima para baixo e da esquerda para a direita.
 * Cada item vem com o texto e a posição na página (x, y, com y crescendo para cima). Função pura.
 * @param {{str:string, x:number, y:number, h?:number}[]} itens
 * @returns {string[]}
 */
export function linhasDoPdf(itens) {
  const us = itens.filter((i) => i.str && i.str.trim()).sort((a, b) => b.y - a.y || a.x - b.x), linhas = [];
  for (const it of us) {
    const tol = Math.max(2, (it.h || 10) * 0.45), l = linhas.find((x) => Math.abs(x.y - it.y) <= tol);
    if (l) l.itens.push(it); else linhas.push({ y: it.y, itens: [it] });
  }
  return linhas.map((l) => l.itens.sort((a, b) => a.x - b.x).map((i) => i.str.trim()).join(" ").replace(/\s+/g, " ").trim()).filter(Boolean);
}
export const ehPdf = (arquivo) => arquivo?.type === "application/pdf" || /\.pdf$/i.test(arquivo?.name || "");

const PDFJS = "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.7.284/legacy/build/";
let pdfLib = null, pdfFalhas = 0;
/** Carrega o leitor de PDF só quando a pessoa escolhe um PDF pela primeira vez. */
async function carregaPdf() {
  if (pdfLib) return pdfLib;
  // O navegador guarda a falha de um endereço que não carregou; por isso, cada nova tentativa usa um endereço diferente.
  try { const lib = await import(PDFJS + "pdf.min.mjs" + (pdfFalhas ? "?t=" + pdfFalhas : "")); lib.GlobalWorkerOptions.workerSrc = PDFJS + "pdf.worker.min.mjs"; pdfLib = lib; }
  catch { pdfFalhas++; throw new Error("leitor-indisponivel"); }
  return pdfLib;
}

/**
 * Lê um PDF: devolve o texto das primeiras páginas e a primeira página como imagem (para a miniatura e,
 * se o PDF for só uma foto digitalizada, para a leitura por imagem).
 * Lança Error("pdf-senha") se o arquivo pede senha, Error("pdf-senha-errada") se a senha não abriu,
 * Error("pdf-invalido") se não é um PDF que dê para abrir e Error("leitor-indisponivel") se a biblioteca não carregou.
 */
export async function lerPdf(arquivo, { senha = "", aoProgredir = () => {} } = {}) {
  aoProgredir({ etapa: "carregando", pct: 0 });
  const lib = await carregaPdf();
  const tarefa = lib.getDocument({ data: new Uint8Array(await arquivo.arrayBuffer()), ...(senha ? { password: senha } : {}) });
  let doc;
  try { doc = await tarefa.promise; }
  catch (e) { tarefa.destroy().catch(() => {}); throw new Error(e?.name === "PasswordException" ? (senha ? "pdf-senha-errada" : "pdf-senha") : "pdf-invalido"); }
  try {
    const n = Math.min(doc.numPages, 3), partes = [];
    for (let i = 1; i <= n; i++) {
      const pg = await doc.getPage(i), tc = await pg.getTextContent();
      partes.push(linhasDoPdf(tc.items.map((it) => ({ str: it.str, x: it.transform[4], y: it.transform[5], h: it.height }))).join("\n"));
      aoProgredir({ etapa: "lendo", pct: Math.round((i / (n + 1)) * 100) });
    }
    const pg = await doc.getPage(1), base = pg.getViewport({ scale: 1 });
    const vp = pg.getViewport({ scale: Math.min(2, 2000 / Math.max(base.width, base.height)) });
    const tela = document.createElement("canvas"); tela.width = Math.ceil(vp.width); tela.height = Math.ceil(vp.height);
    await pg.render({ canvas: tela, canvasContext: tela.getContext("2d"), viewport: vp }).promise;
    aoProgredir({ etapa: "lendo", pct: 100 });
    return { texto: partes.join("\n"), tela, paginas: doc.numPages };
  } finally { tarefa.destroy().catch(() => {}); }
}

/* ===================== leitura da imagem (só no navegador) ===================== */
const TESSERACT = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
let carregando = null;
/** Carrega a biblioteca de leitura só quando a pessoa usa o leitor pela primeira vez. */
function carregaLeitor() {
  if (globalThis.Tesseract) return Promise.resolve(globalThis.Tesseract);
  carregando ||= new Promise((ok, erro) => {
    const s = document.createElement("script"); s.src = TESSERACT;
    s.onload = () => (globalThis.Tesseract ? ok(globalThis.Tesseract) : erro(new Error("leitor-indisponivel")));
    s.onerror = () => { carregando = null; s.remove(); erro(new Error("leitor-indisponivel")); };
    document.head.appendChild(s);
  });
  return carregando;
}

/** Prepara a foto para a leitura: reduz para um tamanho razoável, passa para tons de cinza e aumenta o contraste. */
export async function preparaImagem(arquivo, maior = 2000) {
  let img;
  try { img = await createImageBitmap(arquivo, { imageOrientation: "from-image" }); }
  catch { img = await new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => erro(new Error("imagem-invalida")); i.src = URL.createObjectURL(arquivo); }); }
  const esc = Math.min(1, maior / Math.max(img.width, img.height));
  const c = document.createElement("canvas"); c.width = Math.round(img.width * esc); c.height = Math.round(img.height * esc);
  const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(img, 0, 0, c.width, c.height);
  const px = g.getImageData(0, 0, c.width, c.height), d = px.data, hist = new Uint32Array(256);
  for (let i = 0; i < d.length; i += 4) { const y = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000 | 0; d[i] = y; hist[y]++; }
  // Estica o contraste entre o 2º e o 98º percentil: ajuda em papel térmico apagado e foto escura.
  const total = c.width * c.height; let lo = 0, hi = 255, soma = 0;
  for (let v = 0; v < 256; v++) { soma += hist[v]; if (soma >= total * 0.02) { lo = v; break; } }
  soma = 0; for (let v = 255; v >= 0; v--) { soma += hist[v]; if (soma >= total * 0.02) { hi = v; break; } }
  const faixa = Math.max(1, hi - lo);
  for (let i = 0; i < d.length; i += 4) { const y = Math.max(0, Math.min(255, ((d[i] - lo) * 255) / faixa)); d[i] = d[i + 1] = d[i + 2] = y; }
  g.putImageData(px, 0, 0);
  return c;
}

/**
 * Lê o texto de uma foto. `aoProgredir` recebe { etapa: "carregando" | "lendo", pct } para mostrar o andamento.
 * Lança Error("leitor-indisponivel") se a biblioteca não puder ser baixada (sem internet na primeira vez, por exemplo).
 */
export async function lerImagem(arquivo, aoProgredir = () => {}) {
  aoProgredir({ etapa: "carregando", pct: 0 });
  const T = await carregaLeitor(), tela = await preparaImagem(arquivo);
  let worker;
  try {
    worker = await T.createWorker("por", 1, { logger: (m) => aoProgredir(m.status === "recognizing text"
      ? { etapa: "lendo", pct: Math.round((m.progress || 0) * 100) } : { etapa: "carregando", pct: Math.round((m.progress || 0) * 100) }) });
  } catch { throw new Error("leitor-indisponivel"); }
  try { const { data } = await worker.recognize(tela); return { texto: data.text || "", confianca: data.confidence || 0, tela }; }
  finally { worker.terminate().catch(() => {}); }
}
