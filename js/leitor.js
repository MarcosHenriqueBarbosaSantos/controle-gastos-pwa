// Leitor de comprovantes, faturas de cartão e holerites, por foto ou por PDF.
// 1) lerImagem: transforma a foto em texto, no próprio aparelho (biblioteca Tesseract.js).
// 2) lerPdf: tira o texto de um PDF (biblioteca pdf.js), também no aparelho. Nada é enviado para servidor.
// 3) interpretaTexto: acha no texto o valor, a data e o que mais der. É uma função pura, testada em tests/leitor.test.mjs.
// A leitura nunca é salva direto: o app mostra o que entendeu e a pessoa confere.

const semAcento = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const pad = (n) => String(n).padStart(2, "0");
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/**
 * Valores em reais que aparecem em uma linha: "R$ 1.234,56", "45,90", e também "R$ 45.90" (leitura trocando vírgula por ponto).
 * Em foto, o leitor às vezes estraga a pontuação de um valor. Essas formas também entram, marcadas como `fraco`
 * (valem menos na escolha): "2.124, 13" (espaço), "2.124.13" (ponto no lugar da vírgula), "2.12413" (vírgula sumiu), "2 124,13".
 */
function valoresDaLinha(linha) {
  const out = [], usados = [];
  const livre = (i, n) => !usados.some(([a, b]) => i < b && i + n > a);
  const re = /(R\s?[$S5]\s*)?(\d{1,3}(?:\.\d{3})+,\d{2}|\d+,\d{2}|\d+\.\d{2})(?![\d,.]*\d)/g;
  let m;
  while ((m = re.exec(linha))) {
    const cifra = Boolean(m[1]), bruto = m[2];
    if (!bruto.includes(",") && !cifra) continue;                    // "12.50" sem R$ pode ser data, hora ou código
    if (/^\d{2}\.\d{2}$/.test(bruto) && /\d{2}\.\d{2}\.\d{2,4}/.test(linha)) continue;   // pedaço de data 03.10.2026
    const v = Number(bruto.includes(",") ? bruto.replace(/\./g, "").replace(",", ".") : bruto);
    if (v > 0 && v < 10000000) { out.push({ v, cifra, pos: m.index, fraco: false }); usados.push([m.index, m.index + m[0].length]); }
  }
  const FRACOS = [
    [/(?<![\d.,])(\d{1,3}(?:\.\d{3})*) ?, ?(\d{2})(?![\d,.])/g, (x) => x[1].replace(/\./g, "") + "." + x[2]],            // 2.124, 13
    [/(?<![\d.,])([1-9]\d{0,2}(?:\.\d{3})+)\.(\d{2})(?![\d,.])/g, (x) => x[1].replace(/\./g, "") + "." + x[2]],          // 2.124.13
    [/(?<![\d.,])([1-9]\d{0,2})\.(\d{3})(\d{2})(?![\d,.])/g, (x) => x[1] + x[2] + "." + x[3]],                          // 2.12413
  ];
  for (const [rf, conta] of FRACOS) while ((m = rf.exec(linha))) {
    const v = Number(conta(m));
    if (v > 0 && v < 10000000 && livre(m.index, m[0].length)) { out.push({ v, cifra: /R\s?[$S5]\s*$/.test(linha.slice(0, m.index)), pos: m.index, fraco: true }); usados.push([m.index, m.index + m[0].length]); }
  }
  // "2 124,13": pode ser 2.124,13 com o ponto apagado, ou um "2" solto antes de 124,13. Entram os dois; o segundo já está na lista.
  const esp = /(?<![\d.,])([1-9]\d{0,2}(?: \d{3})+),(\d{2})(?![\d,.])/g;
  while ((m = esp.exec(linha))) out.push({ v: Number(m[1].replace(/ /g, "") + "." + m[2]), cifra: false, pos: m.index, fraco: true });
  return out.sort((a, b) => a.pos - b.pos);
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
    // "221012024": o leitor leu uma barra como "1" e engoliu a outra. Só vale perto de uma palavra como "vencimento" (quem chama confere).
    const colada = /(?<!\d)([0-3]\d)[1Il|\/]?([01]\d)[1Il|\/]?(20\d{2})(?!\d)/g;
    while ((m = colada.exec(linha))) { const d = Number(m[1]), mo = Number(m[2]), a = Number(m[3]); if (dataValida(a, mo, d)) out.push({ data: iso(a, mo, d), semAno: false, fraca: true }); }
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
  comprovante: [[/valor (pago|total|da transferencia|do pix|do pagamento|cobrado|a pagar|do documento|a recolher|da conta|da guia)/, 6], [/total a pagar|total pago|valor final|total a recolher/, 6], [/\bvalor\b/, 4], [/\btotal\b/, 3], [/\bpago\b|\bpagamento\b/, 1],
    [/troco/, -7], [/desconto/, -5], [/saldo/, -6], [/tarifa|juros|multa|encargo/, -3], [/subtotal|sub-total/, -2], [/dinheiro|recebido/, -2], [/limite/, -6], [/cpf|cnpj|agencia|conta\b(?! de (luz|agua|energia|gas|telefone))/, -6], [/acrescimo|abatimento|deducoes|\bmora\b/, -3]],
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

function achaDescricao(linhas, norm, fiscal, aPagar = false) {
  // O leitor troca letras ("Beneficiano") e deixa sujeira antes do nome do campo ("1 CEDENTE").
  const rotulo = /^(?:[^a-z0-9]*[a-z0-9]?[^a-z0-9]+)?(favorecido|recebedor|destinatario|destino|benefici[a-z]{2,4}|cedente|estabelecimento|razao social|quem recebeu|nome do (?:recebedor|favorecido|destinatario)|para|pago para|pagamento para)\b\s*[:\-]?\s*(.*)$/;
  const ruim = (s) => !/\p{L}{3}/u.test(s) || /cpf|cnpj|agencia|\bconta\b|instituicao|banco\b|chave|\bpix\b|\bvalor\b|\bdata\b|\btipo\b|vencimento|pagavel|documento|\bcodigo\b/.test(semAcento(s));
  // "ACADEMIA CORPO EM FORMA LTDA — CNPJ 00.000.000/0001-00" → só o nome.
  const soNome = (x) => x.split(/\s*[—–]\s*|\s-\s|,?\s*\b(?:cnpj|cpf)\b/i)[0].trim();
  // Leitura estragada vira uma fila de pedacinhos ("ARR Se oS . sana ee"). Nome de verdade tem palavras inteiras.
  const pareceNome = (x) => { const ps = x.split(/\s+/).filter(Boolean), boas = ps.filter((w) => /\p{L}{3}/u.test(w) && /[aeiouáéíóúâêôãõ]/i.test(w) && !/[^\p{L}.'&]/u.test(w));
    return boas.length >= 1 && boas.length / ps.length >= 0.6 && (ps.length > 1 || (x.length >= 5 && /^\p{Lu}/u.test(x))); };
  for (let i = 0; i < norm.length; i++) {
    const m = norm[i].match(rotulo); if (!m) continue;
    const resto = linhas[i].slice(linhas[i].length - m[2].length).trim();
    if (m[1] === "para" && (/[,.;]/.test(resto) || resto.split(/\s+/).length > 6)) continue;   // "Para maior clareza, firmo o presente recibo."
    if (m[2] && !ruim(soNome(resto)) && pareceNome(soNome(resto))) return arruma(soNome(resto));
    // O nome costuma vir nas linhas de baixo, às vezes depois de um rótulo "Nome".
    for (let j = i + 1; j < Math.min(norm.length, i + 5); j++) {
      const n = norm[j].match(/^nome\b\s*[:\-]?\s*(.*)$/);
      const cand = soNome(n ? linhas[j].slice(linhas[j].length - n[1].length).trim() : linhas[j].trim());
      if (cand && !ruim(cand) && pareceNome(cand) && !rotulo.test(norm[j])) return arruma(cand);
    }
  }
  // Recibo: "referente ao aluguel do mês de setembro".
  const ref = linhas.join(" ").match(/referente\s+(?:a|ao|à|aos|às|as)\s+([^.;]{3,60})/i);
  if (ref && /\brecib|\brecebi/.test(norm.join(" "))) return arruma((ref[1].match(/^.*?\b20\d{2}\b/) || [ref[1].split(/,| do im\S*vel| situad| localizad/i)[0]])[0]).replace(/^./, (c) => c.toUpperCase());
  // Boleto ou guia sem o nome de quem cobra em um campo legível: o cabeçalho do documento (prefeitura, empresa), menos o nome do banco.
  if (aPagar) {
    const limpa = (x) => x.replace(/[^\p{L}\s.]/gu, " ").replace(/\s+/g, " ").trim();
    const l = linhas.slice(0, 8).find((x, i) => /\p{L}{4}/u.test(x) && !/\d{3}/.test(x) && !/banco|bradesco|itau|santander|caixa|pagamento|vencimento|parcela|documento|recibo do|ficha de/.test(norm[i]) && pareceNome(limpa(x)));
    return l ? arruma(limpa(l)) : "";
  }
  // Cupom fiscal ou maquininha: o nome da loja costuma ser a primeira linha com letras.
  if (fiscal) { const l = linhas.find((x) => /\p{L}{4}/u.test(x) && !/cupom|fiscal|cnpj|documento|extrato|comprovante|via\b|vencimento|pagavel/i.test(semAcento(x)) && pareceNome(x)); if (l) return arruma(l); }
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

/* ===================== boleto, conta e Pix: o valor escrito no próprio código ===================== */
const dv10 = (n) => { let s = 0, peso = 2; for (let i = n.length - 1; i >= 0; i--) { const x = Number(n[i]) * peso; s += x > 9 ? x - 9 : x; peso = peso === 2 ? 1 : 2; } return (10 - (s % 10)) % 10; };
const dv11 = (n) => { let s = 0, peso = 2; for (let i = n.length - 1; i >= 0; i--) { s += Number(n[i]) * peso; peso = peso === 9 ? 2 : peso + 1; } const r = s % 11; return r < 2 ? 0 : 11 - r; };
const maisDias = (isoBase, dias) => { const d = new Date(isoBase + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + dias); return d.toISOString().slice(0, 10); };
/** Boleto de banco: os 4 dígitos do "fator de vencimento" contam os dias desde 07/10/1997 e, a partir de 22/02/2025, recomeçaram em 1000. */
function vencimentoDoFator(fator, hoje) {
  if (!(fator >= 1000)) return null;
  const c = [maisDias("1997-10-07", fator), maisDias("2025-02-22", fator - 1000)];
  return c.sort((a, b) => Math.abs(new Date(a) - new Date(hoje)) - Math.abs(new Date(b) - new Date(hoje)))[0];
}
/**
 * Acha no texto um código de barras ou uma linha digitável e tira dele o valor (e, no boleto de banco, o vencimento).
 * Vale para boleto de banco (47 números) e para contas e tributos, como luz, água, IPTU e DAS (48 números, começando por 8).
 * `conferido` diz se os dígitos verificadores fecham: aí o valor é exato, mesmo que o resto da foto esteja ruim.
 * @returns {{valor:number, vencimento:string|null, conferido:boolean, tipo:"boleto"|"conta"}|null}
 */
export function leCodigoDePagamento(texto, hoje) {
  const t = String(texto ?? ""), achados = [];
  const conta = (b, dvs) => {   // b: quatro blocos de 11 números; dvs: o dígito de cada bloco (ou null, no código de barras)
    const barras = b.join(""), id = barras[2];
    if (barras[0] !== "8" || !"6789".includes(id)) return;
    const dv = id === "6" || id === "7" ? dv10 : dv11;
    const conferido = dvs ? b.every((x, i) => dv(x) === Number(dvs[i])) : dv(barras.slice(0, 3) + barras.slice(4)) === Number(barras[3]);
    const valor = id === "6" || id === "8" ? Number(barras.slice(4, 15)) / 100 : 0;   // 7 e 9: o número não é o valor em reais
    if (valor > 0) achados.push({ valor, vencimento: null, conferido, tipo: "conta" });
  };
  const boleto = (c1, c2, c3, fim, comDv = true) => {
    const conferido = comDv ? dv10(c1.slice(0, 9)) === Number(c1[9]) && dv10(c2.slice(0, 10)) === Number(c2[10]) && dv10(c3.slice(0, 10)) === Number(c3[10]) : false;
    const valor = Number(fim.slice(4)) / 100;
    if (valor > 0) achados.push({ valor, vencimento: vencimentoDoFator(Number(fim.slice(0, 4)), hoje), conferido, tipo: "boleto" });
  };
  let m;
  // conta ou tributo, linha digitável: 81640000021-3 24130478202-8 40122101240-5 70300000001-9
  const reConta = /(?<!\d)(8\d{10})[ .\-]{0,3}(\d)\D{1,4}(\d{11})[ .\-]{0,3}(\d)\D{1,4}(\d{11})[ .\-]{0,3}(\d)\D{1,4}(\d{11})[ .\-]{0,3}(\d)(?!\d)/g;
  while ((m = reConta.exec(t))) conta([m[1], m[3], m[5], m[7]], [m[2], m[4], m[6], m[8]]);
  // boleto de banco, linha digitável: 00190.00009 01234.567891 23456.789012 3 98760000212413
  const reBoleto = /(?<!\d)(\d{5})[ .]?(\d{5})\D{1,3}(\d{5})[ .]?(\d{6})\D{1,3}(\d{5})[ .]?(\d{6})\D{1,3}(\d)\D{1,3}(\d{14})(?!\d)/g;
  while ((m = reBoleto.exec(t))) if (m[1][0] !== "8") boleto(m[1] + m[2], m[3] + m[4], m[5] + m[6], m[8]);
  // os mesmos números sem separação (como vêm do leitor de código de barras ou de um "copia e cola")
  const reSeq = /(?<!\d)\d{44,48}(?!\d)/g;
  while ((m = reSeq.exec(t))) {
    const n = m[0];
    if (n.length === 48 && n[0] === "8") conta([0, 12, 24, 36].map((i) => n.slice(i, i + 11)), [11, 23, 35, 47].map((i) => n[i]));
    else if (n.length === 44 && n[0] === "8") conta([0, 11, 22, 33].map((i) => n.slice(i, i + 11)), null);
    else if (n.length === 47 && n[0] !== "8") boleto(n.slice(0, 10), n.slice(10, 21), n.slice(21, 32), n.slice(33));
    else if (n.length === 44 && n[0] !== "8") {   // código de barras do boleto: banco, moeda, dígito geral, fator, valor, campo livre
      const ok = (() => { const r = dv11(n.slice(0, 4) + n.slice(5)); return (r === 0 ? 1 : r) === Number(n[4]); })();
      const valor = Number(n.slice(9, 19)) / 100;
      if (valor > 0) achados.push({ valor, vencimento: vencimentoDoFator(Number(n.slice(5, 9)), hoje), conferido: ok, tipo: "boleto" });
    }
  }
  return achados.sort((a, b) => Number(b.conferido) - Number(a.conferido))[0] || null;
}

/**
 * Pix "copia e cola" (o texto que está dentro do QR Code): devolve o valor e o nome de quem recebe, quando vierem.
 * @returns {{valor:number|null, nome:string}|null}
 */
export function lePix(texto) {
  const m = String(texto ?? "").match(/000201[0-9A-Za-z .,*@$%+\-\/:_]{30,}/);
  if (!m) return null;
  const campos = {}, s = m[0];
  for (let i = 0; i + 4 <= s.length;) {
    const id = s.slice(i, i + 2), n = Number(s.slice(i + 2, i + 4));
    if (!/^\d{2}$/.test(id) || !Number.isInteger(n)) break;
    campos[id] = s.slice(i + 4, i + 4 + n); i += 4 + n;
  }
  if (!/br\.gov\.bcb\.pix/i.test(campos["26"] || "") && campos["58"] !== "BR") return null;
  const v = Number(campos["54"]);
  return { valor: v > 0 ? Math.round(v * 100) / 100 : null, nome: arruma(campos["59"] || "") };
}

/* ===================== valor escrito por extenso (recibo, cheque, nota promissória) ===================== */
const EXT = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, treze: 13, quatorze: 14, catorze: 14, quinze: 15,
  dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19, vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70, oitenta: 80, noventa: 90,
  cem: 100, cento: 100, duzentos: 200, trezentos: 300, quatrocentos: 400, quinhentos: 500, seiscentos: 600, setecentos: 700, oitocentos: 800, novecentos: 900 };
const EXT_P = `(?:${Object.keys(EXT).join("|")}|mil)`, EXT_SEQ = `${EXT_P}(?:,?\\s+(?:e\\s+)?${EXT_P})*`;
const somaExtenso = (frase) => {
  const [antes, depois] = frase.includes("mil") ? frase.split(/\bmil\b/) : ["", frase];
  const soma = (x) => (x.match(/[a-z]+/g) || []).reduce((n, w) => n + (EXT[w] || 0), 0);
  return (frase.includes("mil") ? (soma(antes) || 1) * 1000 : 0) + soma(depois);
};
/**
 * "oitocentos e cinquenta reais", "mil e duzentos reais e cinquenta centavos" → 850, 1200.5. Até 999.999,99.
 * O leitor erra menos nas palavras do que nos números dentro de quadrinhos; por isso o extenso vale muito na escolha do valor.
 * @returns {number|null}
 */
export function valorPorExtenso(texto) {
  const t = semAcento(texto).replace(/\s+/g, " ");
  const m = t.match(new RegExp(`\\b(${EXT_SEQ})\\s+rea(?:l|is)\\b(?:\\s+e\\s+(${EXT_SEQ})\\s+centavos?)?`));
  if (!m) return null;
  const v = somaExtenso(m[1]) + (m[2] ? somaExtenso(m[2]) / 100 : 0);
  return v > 0 && v < 1000000 ? Math.round(v * 100) / 100 : null;
}

/** Do que é a conta, quando o documento diz: vira a descrição e ajuda a escolher a categoria. */
const ASSUNTOS = [[/\biptu\b/, "IPTU"], [/\bipva\b/, "IPVA"], [/licenciamento/, "Licenciamento do veículo"], [/\bdarf\b/, "DARF"], [/simples nacional|\bdas\b.{0,20}\bmei\b|\bmei\b.{0,20}\bdas\b/, "DAS"],
  [/energia eletrica|conta de (luz|energia)|\bkwh\b/, "Conta de luz"], [/agua e esgoto|saneamento|conta de agua|\bsabesp\b/, "Conta de água"], [/\bgas natural\b|conta de gas|\bcomgas\b/, "Conta de gás"],
  [/condominio/, "Condomínio"], [/banda larga|internet fibra|\bfibra\b/, "Internet"], [/mensalidade escolar|anuidade escolar/, "Mensalidade escolar"], [/plano de saude/, "Plano de saúde"]];

/**
 * Interpreta o texto lido de uma foto ou de um PDF.
 * @param {string} texto  texto bruto devolvido pelo leitor
 * @param {string} hoje   data de hoje, "AAAA-MM-DD"
 * @returns {{tipo:"comprovante"|"fatura"|"holerite", valor:number|null, valores:number[], data:string|null, vencimento:string|null,
 *            descricao:string, forma:string, cartao:string, achouData:boolean, firme:boolean}}
 *   `firme` é false quando o valor foi um palpite (nenhuma palavra do documento nem o código de barras confirmam):
 *   quem chama pode tentar ler a foto de novo, de outro jeito, antes de mostrar.
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
    return { tipo, valor, valores: outros, data, vencimento: null, descricao: "Salário", forma: "", cartao: "", achouData: Boolean(data), firme: valor !== null };
  }

  // O valor que vem escrito no código de barras, na linha digitável ou no Pix copia e cola.
  const codigo = leCodigoDePagamento(texto, hoje), pix = lePix(texto);
  const exato = pix?.valor ?? (codigo?.conferido ? codigo.valor : null), pista = codigo && !codigo.conferido ? codigo.valor : null;
  const extenso = tipo === "fatura" ? null : valorPorExtenso(texto);

  // Valor: cada valor ganha pontos pelas palavras da própria linha e, se a linha só tem o número, pelas da linha de cima.
  const cands = [];
  linhas.forEach((l, i) => valoresDaLinha(l).forEach((x) => {
    const sozinho = !/[a-z]{3}/.test(norm[i].replace(/r\s?[$s5]/g, ""));
    let p = pontos(tipo, norm[i]) + (x.cifra ? 1 : 0) - (x.fraco ? 1.5 : 0);
    if (sozinho && i > 0) p += 0.8 * pontos(tipo, norm[i - 1]);
    // Formulário em colunas (boleto, guia): o nome do campo fica em cima e o valor embaixo, no começo da linha, com o texto da coluna ao lado.
    else if (i > 0 && x.pos <= 3) p += Math.max(0, 0.7 * pontos(tipo, norm[i - 1].slice(0, 30)));
    cands.push({ ...x, linha: i, p, pal: p });   // pal: os pontos que vieram das palavras do documento
  }));
  // O mesmo valor em mais de um lugar do documento (valor do documento e valor cobrado, por exemplo) pesa a favor.
  const vezes = new Map(); cands.forEach((c) => vezes.set(c.v, (vezes.get(c.v) || 0) + 1));
  cands.forEach((c) => { if (vezes.get(c.v) > 1 && c.p > -5) c.p += 1.5; if (c.v === exato) c.p += 20; else if (c.v === pista) c.p += 4; if (c.v === extenso) { c.p += 8; c.pal += 8; } });
  const ordem = [...cands].sort((a, b) => b.p - a.p || b.v - a.v);
  const comApoio = ordem.find((c) => c.p > 0);
  // Sem nenhuma palavra que ajude: fica com o palpite menos arriscado (com R$, repetido, maior), menos os que a linha desaconselha.
  const palpite = comApoio ? null : [...cands.filter((c) => c.p > -5)].sort((a, b) => Number(b.cifra) - Number(a.cifra) || Number(a.fraco) - Number(b.fraco) || vezes.get(b.v) - vezes.get(a.v) || b.v - a.v)[0] || null;
  // Na fatura do cartão o boleto pode trazer outro valor (o mínimo, um parcelamento): lá o código só reforça, não decide.
  // Código que não confere (algum número lido errado) nunca vira o valor sozinho: só reforça um valor igual e fica como sugestão.
  const valor = exato !== null && tipo !== "fatura" ? exato : extenso !== null ? extenso : comApoio ? comApoio.v : palpite ? palpite.v : null;
  const firme = valor !== null && (valor === exato || valor === extenso || Boolean(comApoio && comApoio.pal > 0));
  const valores = [...new Set(ordem.map((c) => c.v))].filter((v) => v !== valor).slice(0, 4);

  // Datas
  const datas = [];
  linhas.forEach((l, i) => datasDaLinha(l, ano).forEach((d) => datas.push({ ...d, linha: i })));
  const perto = (re, alcance = 1) => datas.find((d) => { for (let k = 0; k <= alcance; k++) if (d.linha - k >= 0 && re.test(norm[d.linha - k])) return true; return false; });
  // Data sem ano: escolhe o ano que deixa a data mais perto de hoje.
  const ajustaAno = (d) => { if (!d?.semAno) return d?.data || null; const [a, m, dia] = d.data.split("-").map(Number);
    return [a - 1, a, a + 1].map((x) => iso(x, m, dia)).sort((p, q) => Math.abs(new Date(p) - new Date(hoje)) - Math.abs(new Date(q) - new Date(hoje)))[0]; };

  let data = null, vencimento = null;
  // Conta para pagar (boleto, guia, conta de consumo), e não o comprovante de que ela foi paga.
  const aPagar = tipo !== "fatura" && (Boolean(codigo) || tem(/linha digitavel|codigo de barras|\bcedente\b|\bsacado\b|pagavel|valor do documento|nosso numero|total a pagar/))
    && !tem(/comprovante|pagamento (realizado|efetuado|aprovado)|autenticacao|pago em/);
  if (tipo === "fatura") {
    vencimento = ajustaAno(perto(/vencimento|vence|venc\b/, 1)) || null;
  } else {
    const limite = new Date(hoje); limite.setDate(limite.getDate() + 1);
    const serve = (d) => d && new Date(ajustaAno(d)) <= limite && new Date(ajustaAno(d)) > new Date(ano - 3, 0, 1);
    if (aPagar) vencimento = ajustaAno(perto(/vencimento|vence|venc\b/, 1)) || (codigo?.conferido ? codigo.vencimento : null) || null;
    // Na conta para pagar, o dia que interessa é o do vencimento (se já chegou); as outras datas são de emissão ou de leitura.
    const d = aPagar ? (vencimento && serve({ data: vencimento, semAno: false }) ? { data: vencimento, semAno: false } : null)
      : [perto(/data|realizad|efetuad|pago em|emissao|quando/, 1), ...datas.filter((x) => !x.fraca)].find(serve);
    data = d ? ajustaAno(d) : null;
  }

  // Cupom fiscal ou comprovante de maquininha: o nome da loja vem no alto, sem rótulo.
  const fiscal = tem(/cupom|nfc-?e|nota fiscal|danfe|cnpj|via (do )?cliente|\bnsu\b|\baut\b|maquininha/) && !tem(/\bpix\b|transferencia/);
  const assunto = tipo !== "fatura" && (aPagar || tem(/boleto|\bguia\b|tributo|vencimento/)) ? ASSUNTOS.find(([re]) => re.test(tudo))?.[1] || "" : "";
  // Sem valor nenhum, a foto provavelmente saiu ilegível: melhor deixar a descrição em branco do que preencher com letras soltas.
  const descricao = tipo === "fatura" ? "" : assunto || pix?.nome || (valor === null && !valores.length ? "" : achaDescricao(linhas, norm, fiscal && !aPagar, aPagar));
  const forma = pix || tem(/\bpix\b/) ? "Pix" : aPagar ? "Boleto" : tem(/\bdebito\b/) ? "Débito" : tem(/\bcredito\b/) ? "Cartão de crédito" : tem(/boleto|codigo de barras|linha digitavel/) ? "Boleto" : fiscal && tem(/dinheiro/) ? "Dinheiro" : "";
  const banco = BANCOS.find((b) => new RegExp(`\\b${b}\\b`).test(tudo)) || "";
  // O nome do banco só interessa na fatura (no comprovante, o banco que aparece costuma ser o de quem recebeu).
  return { tipo, valor, valores, data, vencimento, descricao, forma: tipo === "fatura" ? "" : forma,
    cartao: tipo === "fatura" && banco ? arruma(banco.toUpperCase()) : "", achouData: Boolean(data || vencimento), firme };
}

/**
 * Junta duas leituras da mesma foto (o leitor pode olhar a imagem de mais de um jeito). A primeira manda quando está firme;
 * a segunda completa o que faltou. Os valores que sobram viram sugestões.
 */
export function juntaLeituras(a, b) {
  if (!a) return b; if (!b) return a;
  const base = a.firme || !b.firme ? a : b, outra = base === a ? b : a;
  const valor = base.valor ?? outra.valor, daData = base.data || base.vencimento ? base : outra;
  return { tipo: base.tipo, valor, valores: [...new Set([...base.valores, ...(outra.valor !== null ? [outra.valor] : []), ...outra.valores])].filter((v) => v !== valor).slice(0, 4),
    data: base.tipo === daData.tipo ? daData.data : base.data, vencimento: base.tipo === daData.tipo ? daData.vencimento : base.vencimento,
    descricao: base.descricao || (outra.tipo === base.tipo ? outra.descricao : ""), forma: base.forma || (outra.tipo === base.tipo ? outra.forma : ""), cartao: base.cartao || (outra.tipo === base.tipo ? outra.cartao : ""),
    achouData: base.achouData || (base.tipo === outra.tipo && outra.achouData), firme: base.firme };
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

/* ---------- preparo da foto: contas puras sobre a imagem em tons de cinza (testadas em tests/leitor.test.mjs) ---------- */
/** Máximo (ou mínimo) em uma janela de raio r, em linhas e depois em colunas. */
function filtro(src, w, h, r, max) {
  const pega = max ? Math.max : Math.min, tmp = new Float32Array(src.length), out = new Float32Array(src.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = src[y * w + x]; for (let k = Math.max(0, x - r); k <= Math.min(w - 1, x + r); k++) v = pega(v, src[y * w + k]); tmp[y * w + x] = v; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = tmp[y * w + x]; for (let k = Math.max(0, y - r); k <= Math.min(h - 1, y + r); k++) v = pega(v, tmp[k * w + x]); out[y * w + x] = v; }
  return out;
}
function media(src, w, h, r) {
  const out = new Float32Array(src.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0, n = 0;
    for (let j = Math.max(0, y - r); j <= Math.min(h - 1, y + r); j++) for (let i = Math.max(0, x - r); i <= Math.min(w - 1, x + r); i++) { s += src[j * w + i]; n++; }
    out[y * w + x] = s / n;
  }
  return out;
}
/** Imagem "de tela" (print, PDF): as áreas lisas são exatamente lisas. Em foto de câmera sempre há um chuvisco. */
export function ehImagemDeTela(lum, W, H) {
  let iguais = 0, n = 0;
  const passo = Math.max(1, Math.floor(H / 400));
  for (let y = 0; y < H; y += passo) for (let x = 1; x < W; x += 3) { n++; if (lum[y * W + x] === lum[y * W + x - 1]) iguais++; }
  return n > 0 && iguais / n > 0.6;
}
/**
 * Foto de um papel: iguala a luz (tira sombra), apaga o que está em volta do papel (mesa, livro, mão) e diz onde o papel está.
 * Mexe em `lum` no lugar (um byte por ponto, 0 preto a 255 branco).
 * Só apaga o entorno quando existe uma borda nítida entre claro e escuro. Sombra sobre o papel muda aos poucos, e não é apagada.
 * @returns {{x0:number, y0:number, x1:number, y1:number, fundo:boolean}} caixa do papel (a imagem toda, se não houver entorno)
 */
export function limpaFundo(lum, W, H) {
  const cel = Math.max(6, Math.round(Math.max(W, H) / 300)), mw = Math.ceil(W / cel), mh = Math.ceil(H / cel), N = mw * mh;
  // Por célula, o ponto mais claro: é a cor do papel, sem o texto.
  const claro = new Float32Array(N);
  for (let y = 0; y < H; y++) { const cy = Math.floor(y / cel) * mw; for (let x = 0; x < W; x++) { const c = cy + Math.floor(x / cel), v = lum[y * W + x]; if (v > claro[c]) claro[c] = v; } }
  // Fecha buracos escuros pequenos (título grosso, código de barras, linhas) sem mudar a borda do papel.
  const papel = filtro(filtro(claro, mw, mh, 3, true), mw, mh, 3, false);
  // Separa claro e escuro pelo limiar que melhor divide as células (Otsu).
  const hist = new Float64Array(256); for (let i = 0; i < N; i++) hist[Math.min(255, Math.round(papel[i]))]++;
  let soma = 0; for (let v = 0; v < 256; v++) soma += v * hist[v];
  let w0 = 0, s0 = 0, melhor = -1, T = 0;
  for (let v = 0; v < 256; v++) { w0 += hist[v]; if (!w0 || w0 === N) continue; s0 += v * hist[v]; const m0 = s0 / w0, m1 = (soma - s0) / (N - w0), entre = w0 * (N - w0) * (m0 - m1) ** 2; if (entre > melhor) { melhor = entre; T = v; } }
  const escuro = (i) => papel[i] <= T;
  // A divisão só vale como "papel e entorno" se a passagem de um para o outro for um degrau, e não uma sombra suave.
  const degraus = []; let nEscuro = 0;
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
    const i = y * mw + x; if (escuro(i)) nEscuro++;
    for (const j of [x + 1 < mw ? i + 1 : -1, y + 1 < mh ? i + mw : -1]) if (j >= 0 && escuro(i) !== escuro(j)) degraus.push(Math.min(papel[i], papel[j]) / Math.max(1, papel[i], papel[j]));
  }
  degraus.sort((a, b) => a - b);
  const temFundo = nEscuro / N >= 0.02 && nEscuro / N <= 0.9 && degraus.length > 0 && degraus[degraus.length >> 1] < 0.8;
  const fora = new Float32Array(N);
  if (temFundo) {
    // O entorno é o escuro que encosta na beirada da foto. Anda de célula em célula sem atravessar degraus.
    const fila = [];
    const tenta = (i) => { if (!fora[i] && escuro(i)) { fora[i] = 1; fila.push(i); } };
    for (let x = 0; x < mw; x++) { tenta(x); tenta((mh - 1) * mw + x); }
    for (let y = 0; y < mh; y++) { tenta(y * mw); tenta(y * mw + mw - 1); }
    while (fila.length) {
      const i = fila.pop(), x = i % mw, y = (i - x) / mw;
      for (const j of [x > 0 ? i - 1 : -1, x + 1 < mw ? i + 1 : -1, y > 0 ? i - mw : -1, y + 1 < mh ? i + mw : -1]) {
        if (j < 0 || fora[j] || !escuro(j)) continue;
        const r = papel[j] / Math.max(1, papel[i]); if (r > 0.75 && r < 1.34) { fora[j] = 1; fila.push(j); }
      }
    }
  }
  let x0 = mw, y0 = mh, x1 = -1, y1 = -1;
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) if (!fora[y * mw + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0 || (x1 - x0 + 1) * (y1 - y0 + 1) < N * 0.04) { fora.fill(0); x0 = 0; y0 = 0; x1 = mw - 1; y1 = mh - 1; }   // quase nada sobrou: não confia, usa a foto toda
  // Luz de fundo suavizada e peso do "fora", lidos com interpolação para não deixar degraus de célula na imagem.
  const luz = media(papel, mw, mh, 2), peso = media(fora, mw, mh, 1);
  for (let y = 0; y < H; y++) {
    const fy = Math.min(mh - 1, Math.max(0, (y + 0.5) / cel - 0.5)), ya = Math.floor(fy), yb = Math.min(mh - 1, ya + 1), ty = fy - ya;
    for (let x = 0; x < W; x++) {
      const fx = Math.min(mw - 1, Math.max(0, (x + 0.5) / cel - 0.5)), xa = Math.floor(fx), xb = Math.min(mw - 1, xa + 1), tx = fx - xa;
      const mix = (m) => (m[ya * mw + xa] * (1 - tx) + m[ya * mw + xb] * tx) * (1 - ty) + (m[yb * mw + xa] * (1 - tx) + m[yb * mw + xb] * tx) * ty;
      const p = mix(peso), i = y * W + x, v = Math.min(255, (lum[i] * 255) / Math.max(40, mix(luz)));
      lum[i] = p >= 0.5 ? 255 : v;
    }
  }
  const m = 2;   // margem, em células
  return { x0: Math.max(0, (x0 - m) * cel), y0: Math.max(0, (y0 - m) * cel), x1: Math.min(W, (x1 + 1 + m) * cel), y1: Math.min(H, (y1 + 1 + m) * cel), fundo: temFundo && fora.some((v) => v) };
}
/**
 * Inclinação do texto, em graus (positivo: as linhas descem para a direita). Testa vários ângulos e fica com o que
 * deixa as linhas de texto mais "empilhadas" (cada linha caindo inteira na mesma altura). Devolve 0 quando não há ganho claro.
 */
export function inclinacao(lum, W, H, caixa = { x0: 0, y0: 0, x1: W, y1: H }) {
  const cw = caixa.x1 - caixa.x0, ch = caixa.y1 - caixa.y0, k = Math.max(1, Math.ceil(Math.max(cw, ch) / 520)), mw = Math.floor(cw / k), mh = Math.floor(ch / k);
  if (mw < 20 || mh < 20) return 0;
  const xs = [], ys = [], ws = [];
  for (let my = 0; my < mh; my++) for (let mx = 0; mx < mw; mx++) {
    let s = 0; for (let j = 0; j < k; j++) { const lin = (caixa.y0 + my * k + j) * W + caixa.x0 + mx * k; for (let i = 0; i < k; i++) s += lum[lin + i]; }
    const tinta = 255 - s / (k * k); if (tinta > 28) { xs.push(mx - mw / 2); ys.push(my - mh / 2); ws.push(tinta); }
  }
  if (xs.length < 50) return 0;
  const n = mw + mh + 4, acc = new Float64Array(n);
  const nota = (graus) => { const a = (graus * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a); acc.fill(0); for (let i = 0; i < xs.length; i++) acc[Math.round(ys[i] * c - xs[i] * sn + n / 2)] += ws[i]; let t = 0; for (let i = 0; i < n; i++) t += acc[i] * acc[i]; return t; };
  let melhor = 0, top = nota(0); const zero = top;
  for (let g = -15; g <= 15; g += 0.5) { const t = nota(g); if (t > top) { top = t; melhor = g; } }
  for (let g = melhor - 0.4; g <= melhor + 0.41; g += 0.1) { const t = nota(g); if (t > top) { top = t; melhor = g; } }
  return Math.abs(melhor) >= 0.6 && top > zero * 1.05 ? Math.round(melhor * 10) / 10 : 0;
}

/**
 * Prepara a imagem para a leitura.
 * Foto de papel: iguala a luz, apaga o entorno, recorta no papel, endireita o texto e deixa as letras em um tamanho bom para o leitor.
 * Print de tela e página de PDF já vêm limpos: só passam para tons de cinza, com mais contraste.
 */
export async function preparaImagem(arquivo, maior = 2600) {
  let img;
  try { img = await createImageBitmap(arquivo, { imageOrientation: "from-image" }); }
  catch { img = await new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => erro(new Error("imagem-invalida")); i.src = URL.createObjectURL(arquivo); }); }
  const e0 = Math.min(1, 3200 / Math.max(img.width, img.height)), W = Math.max(1, Math.round(img.width * e0)), H = Math.max(1, Math.round(img.height * e0));
  const base = document.createElement("canvas"); base.width = W; base.height = H;
  const gb = base.getContext("2d", { willReadFrequently: true }); gb.drawImage(img, 0, 0, W, H);
  const px = gb.getImageData(0, 0, W, H), d = px.data, lum = new Uint8ClampedArray(W * H);
  for (let i = 0, j = 0; j < lum.length; i += 4, j++) lum[j] = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
  const tela = ehImagemDeTela(lum, W, H);
  const caixa = tela ? { x0: 0, y0: 0, x1: W, y1: H } : limpaFundo(lum, W, H), angulo = tela ? 0 : inclinacao(lum, W, H, caixa);
  for (let i = 0, j = 0; j < lum.length; i += 4, j++) { d[i] = d[i + 1] = d[i + 2] = lum[j]; d[i + 3] = 255; }
  gb.putImageData(px, 0, 0);
  // Recorta no papel, endireita e leva para o tamanho de leitura (letra pequena é ampliada até uma vez e meia).
  const cw = caixa.x1 - caixa.x0, ch = caixa.y1 - caixa.y0, e = Math.min(tela ? 1 : 1.5, (tela ? 2000 : maior) / Math.max(cw, ch));
  const a = (-angulo * Math.PI) / 180, co = Math.abs(Math.cos(a)), se = Math.abs(Math.sin(a));
  const c = document.createElement("canvas"); c.width = Math.max(1, Math.round((cw * co + ch * se) * e)); c.height = Math.max(1, Math.round((cw * se + ch * co) * e));
  const g = c.getContext("2d", { willReadFrequently: true });
  g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
  g.translate(c.width / 2, c.height / 2); g.rotate(a); g.drawImage(base, caixa.x0, caixa.y0, cw, ch, (-cw * e) / 2, (-ch * e) / 2, cw * e, ch * e); g.setTransform(1, 0, 0, 1, 0, 0);
  // Estica o contraste entre o 2º e o 98º percentil: ajuda em papel térmico apagado e foto escura.
  const fim = g.getImageData(0, 0, c.width, c.height), f = fim.data, hist = new Uint32Array(256);
  for (let i = 0; i < f.length; i += 4) hist[f[i]]++;
  const total = c.width * c.height; let lo = 0, hi = 255, soma = 0;
  for (let v = 0; v < 256; v++) { soma += hist[v]; if (soma >= total * 0.02) { lo = v; break; } }
  soma = 0; for (let v = 255; v >= 0; v--) { soma += hist[v]; if (soma >= total * 0.02) { hi = v; break; } }
  const faixa = Math.max(1, hi - lo);
  for (let i = 0; i < f.length; i += 4) { const y = Math.max(0, Math.min(255, ((f[i] - lo) * 255) / faixa)); f[i] = f[i + 1] = f[i + 2] = y; }
  g.putImageData(fim, 0, 0);
  return c;
}

/** Código de barras de boleto e QR Code de Pix, quando o aparelho sabe ler (Chrome no Android). Devolve os textos encontrados. */
async function leCodigosDaImagem(tela) {
  try {
    if (!("BarcodeDetector" in globalThis)) return [];
    const tem = await globalThis.BarcodeDetector.getSupportedFormats(), quero = ["itf", "qr_code"].filter((f) => tem.includes(f));
    if (!quero.length) return [];
    const achados = await Promise.race([new globalThis.BarcodeDetector({ formats: quero }).detect(tela), new Promise((ok) => setTimeout(() => ok([]), 4000))]);
    return achados.map((c) => String(c.rawValue || "")).filter(Boolean);
  } catch { return []; }
}

/**
 * Lê uma foto (ou uma página já desenhada) e interpreta o que achou.
 * O leitor olha a imagem de até três jeitos: página inteira, texto espalhado (bom para formulário e tabela) e bloco único.
 * Para na primeira vez em que acha um valor firme e uma data; senão, junta o que cada jeito achou.
 * `aoProgredir` recebe { etapa: "carregando" | "lendo", pct, vez } para mostrar o andamento.
 * Lança Error("leitor-indisponivel") se a biblioteca não puder ser baixada (sem internet na primeira vez, por exemplo).
 * @returns {Promise<{texto:string, leitura:object, tela:HTMLCanvasElement, vezes:number}>}
 */
export async function lerImagem(arquivo, aoProgredir = () => {}, hoje = new Date().toISOString().slice(0, 10)) {
  aoProgredir({ etapa: "carregando", pct: 0, vez: 1 });
  const T = await carregaLeitor(), tela = await preparaImagem(arquivo);
  let worker, vez = 1;
  try {
    worker = await T.createWorker("por", 1, { logger: (m) => aoProgredir(m.status === "recognizing text"
      ? { etapa: "lendo", pct: Math.round((m.progress || 0) * 100), vez } : { etapa: "carregando", pct: Math.round((m.progress || 0) * 100), vez }) });
  } catch { throw new Error("leitor-indisponivel"); }
  try {
    const codigos = (await leCodigosDaImagem(tela)).join("\n"), textos = [];
    let leitura = null; const inicio = Date.now();
    for (const modo of ["3", "11", "6"]) {   // 3: página inteira; 11: texto espalhado; 6: um bloco só
      if (textos.length && Date.now() - inicio > 45000) break;   // aparelho lento: não deixa a pessoa esperando mais uma volta
      await worker.setParameters({ tessedit_pageseg_mode: modo });
      const { data } = await worker.recognize(tela), texto = (data.text || "") + (codigos ? "\n" + codigos : "");
      textos.push(texto);
      leitura = juntaLeituras(leitura, interpretaTexto(texto, hoje));
      if (leitura.firme && leitura.achouData) break;
      vez++;
    }
    return { texto: textos.join("\n\n"), leitura, tela, vezes: textos.length };
  } finally { worker.terminate().catch(() => {}); }
}
