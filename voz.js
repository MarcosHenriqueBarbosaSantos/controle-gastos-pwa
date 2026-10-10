// Lançar por voz: transforma a frase falada em um lançamento para conferir.
// "gastei 32 no mercado no débito" → { valor: 32, descricao: "Mercado", forma: "Débito", tipo: "Despesa", data: hoje }
// Funções puras (sem tela), testadas em tests/voz.test.mjs. O reconhecimento da fala é do próprio navegador (app.js).

const semAcento = (s) => String(s ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const diasAntes = (hoje, n) => { const d = new Date(hoje + "T12:00:00"); d.setDate(d.getDate() - n); return iso(d); };

/* ---------- números falados por extenso ("trinta e dois", "mil e duzentos") ---------- */
const UNID = { zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, treze: 13,
  quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19 };
const DEZ = { vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70, oitenta: 80, noventa: 90 };
const CEM = { cem: 100, cento: 100, duzentos: 200, duzentas: 200, trezentos: 300, trezentas: 300, quatrocentos: 400, quatrocentas: 400, quinhentos: 500, quinhentas: 500,
  seiscentos: 600, seiscentas: 600, setecentos: 700, setecentas: 700, oitocentos: 800, oitocentas: 800, novecentos: 900, novecentas: 900 };
const valorDaPalavra = (p) => UNID[p] ?? DEZ[p] ?? CEM[p];
const ehNumeroPorExtenso = (p) => valorDaPalavra(p) !== undefined || p === "mil";

/**
 * Troca números por extenso por algarismos: "trinta e dois reais" → "32 reais", "dois mil e quinhentos" → "2500".
 * "um"/"uma" só vira 1 quando faz parte de um número ("um mil", "vinte e um"), para "um tênis" continuar sendo "um tênis".
 */
export function extensoParaNumero(texto) {
  const t = texto.split(/\s+/), out = [];
  for (let i = 0; i < t.length; i++) {
    const p = semAcento(t[i]);
    // "2 mil", "1,5 mil": algarismo seguido de "mil"
    if (p === "mil" && out.length && /^\d+(?:[,.]\d+)?$/.test(out[out.length - 1])) { out[out.length - 1] = String(Math.round(Number(out[out.length - 1].replace(",", ".")) * 1000)); continue; }
    const comeca = ehNumeroPorExtenso(p) && !((p === "um" || p === "uma") && !/^(mil|real|reais|e)$/.test(semAcento(t[i + 1] || "")));
    if (!comeca) { out.push(t[i]); continue; }
    let total = 0, grupo = 0, j = i, ultimoNum = i, ultimo = Infinity;
    while (j < t.length) {
      const q = semAcento(t[j]);
      if (q === "mil") { total += (grupo || 1) * 1000; grupo = 0; ultimoNum = j; ultimo = 1000; j++; continue; }
      const v = valorDaPalavra(q);
      if (v !== undefined) { grupo += v; ultimoNum = j; ultimo = v; j++; continue; }
      // "e" liga partes do mesmo número só quando a parte seguinte é menor: "cento e vinte e cinco" é um número,
      // mas "trinta e dois e cinquenta" são dois (32 reais e 50 centavos) — depois do "dois" não cabe mais nada.
      if (q === "e" && j + 1 < t.length) {
        const nq = semAcento(t[j + 1]), nv = nq === "mil" ? 1000 : valorDaPalavra(nq);
        const cabe = ultimo >= 1000 ? nv < 1000 : ultimo >= 100 ? nv < 100 : ultimo >= 20 ? nv < 10 : false;
        if (nv !== undefined && cabe) { j++; continue; }
      }
      break;
    }
    out.push(String(total + grupo));
    i = ultimoNum;
  }
  return out.join(" ");
}

/* ---------- o que cada palavra quer dizer ---------- */
const FORMAS_FALA = [
  [/\b(no |na |pelo |pela |com |em )?(cartao de debito|debito)\b/, "Débito"],
  [/\b(no |na |pelo |pela |com |em )?(cartao de credito|credito|cartao)\b/, "Cartão de crédito"],
  [/\b(no |na |pelo |pela |com |em |via )?pix\b/, "Pix"],
  [/\b(no |na |em |com )?(dinheiro|especie)\b/, "Dinheiro"],
  [/\b(no |na |pelo |por |com |em )?boleto\b/, "Boleto"],
];
const ENTRADA = /\b(recebi|ganhei|entrou|entraram|caiu|cairam|me pagaram|pagaram|salario caiu)\b/;
const GUARDAR = /\b(guardei|poupei|investi|reservei|separei)\b/;
const RETIRAR = /\b(retirei|tirei|resgatei|saquei)\b/;
const VERBOS = /^(gastei|paguei|comprei|comi|tomei|abasteci|coloquei|botei|dei|fiz|foi|foram|recebi|ganhei|entrou|caiu|guardei|poupei|investi|reservei|separei|retirei|tirei|resgatei|lancar|lanca|anota|anotar)\b\s*/;
const PONTAS = /^(e|de|do|da|dos|das|no|na|nos|nas|em|com|pro|pra|para|por|pelo|pela|o|a|os|as|um|uma|uns|umas|foi|deu|custou|reais|real|hoje|agora)$/;

/**
 * Entende a frase e devolve o que der para preencher. O que não foi dito fica de fora (a tela mantém o que já estava).
 * @param {string} fala  o texto reconhecido
 * @param {string} hoje  "AAAA-MM-DD"
 * @returns {{valor?:number, descricao?:string, forma?:string, tipo:"Despesa"|"Receita"|"Reserva", retirada?:boolean, data?:string, parcelas?:number, texto:string}}
 */
export function entendeFala(fala, hoje) {
  const original = String(fala || "").trim();
  let t = semAcento(extensoParaNumero(original)).replace(/r\$\s*/g, " ").replace(/\s+/g, " ").trim();
  const out = { tipo: "Despesa", texto: original };
  const tira = (re) => { t = t.replace(re, " ").replace(/\s+/g, " ").trim(); };

  // Tipo: entrada, guardar ou retirar do guardado. O resto é gasto.
  if (RETIRAR.test(t)) { out.tipo = "Reserva"; out.retirada = true; }
  else if (GUARDAR.test(t)) out.tipo = "Reserva";
  else if (ENTRADA.test(t)) out.tipo = "Receita";

  // Parcelas: "em 3 vezes", "3x", "em 10 parcelas" (antes do valor, para o 3 não virar o valor)
  const parc = t.match(/\b(?:em |de )?(\d{1,2})\s*(?:x|vezes|parcelas)\b/);
  if (parc && Number(parc[1]) >= 2) { out.parcelas = Number(parc[1]); out.forma = "Cartão de crédito"; }
  if (parc) tira(parc[0]);
  tira(/\b(a vista|a prazo|sem juros|parcelado)\b/);

  // Data: hoje, ontem, anteontem, "dia 5"
  if (/\banteontem\b/.test(t)) { out.data = diasAntes(hoje, 2); tira(/\banteontem\b/); }
  else if (/\bontem\b/.test(t)) { out.data = diasAntes(hoje, 1); tira(/\bontem\b/); }
  else if (/\bhoje\b/.test(t)) { out.data = hoje; tira(/\bhoje\b/); }
  const dia = t.match(/\b(?:no )?dia (\d{1,2})\b/);
  if (dia && Number(dia[1]) >= 1 && Number(dia[1]) <= 31) {
    const [a, m] = hoje.split("-").map(Number), d = Number(dia[1]);
    // Dia que ainda não chegou neste mês: é do mês passado.
    // Mês passado mais curto ("dia 31" falado em outubro, setembro tem 30): fica no último dia dele.
    const ultimoDoAnterior = new Date(a, m - 1, 0).getDate();
    const data = d <= Number(hoje.slice(8, 10)) ? `${a}-${pad(m)}-${pad(d)}` : (m === 1 ? `${a - 1}-12-${pad(Math.min(d, ultimoDoAnterior))}` : `${a}-${pad(m - 1)}-${pad(Math.min(d, ultimoDoAnterior))}`);
    out.data = data; tira(dia[0]);
  }

  // Forma de pagamento
  for (const [re, forma] of FORMAS_FALA) { const m = t.match(re); if (m) { if (!out.forma) out.forma = forma; tira(m[0]); } }

  // Valor: "32", "32,50", "1.250,00", "32 reais e 50 centavos", "32 e 50", "2 mil"
  const NUM = /(?:\b(?:de|por|foi|deu|custou|no valor de|valor)\s+)?\b(\d{1,3}(?:\.\d{3})+|\d+)(?:[,.](\d{1,2}))?\b(?:\s*mil\b)?(?:\s*(?:reais|real|conto|contos|pila|pilas)\b)?(?:\s*(?:e|com)\s*(\d{1,2})\s*(?:centavos)?\b)?/;
  const v = t.match(NUM);
  if (v) {
    let n = Number(v[1].replace(/\./g, ""));
    if (/\bmil\b/.test(v[0])) n *= 1000;
    // "32,5" é 32,50; mas "100 reais e 5 centavos" é 100,05 — o zero só entra depois de vírgula ou ponto.
    if (v[2] !== undefined) n += Number(v[2].length === 1 ? v[2] + "0" : v[2]) / 100;
    else if (v[3] !== undefined) n += Number(v[3]) / 100;
    if (n > 0) out.valor = Math.round(n * 100) / 100;
    tira(v[0]);
  }

  // Descrição: o que sobrou, sem o verbo do começo e sem preposições nas pontas ("no mercado" → "Mercado").
  t = t.replace(VERBOS, "");
  const palavras = t.split(" ").filter(Boolean);
  while (palavras.length && PONTAS.test(palavras[0])) palavras.shift();
  while (palavras.length && PONTAS.test(palavras[palavras.length - 1])) palavras.pop();
  if (palavras.length) {
    // Volta os acentos: pega as mesmas palavras na frase original quando dá.
    const orig = extensoParaNumero(original).split(/\s+/), mapa = new Map(orig.map((p) => [semAcento(p).replace(/[^\p{L}\p{N}]/gu, ""), p.replace(/[.,!?]+$/, "")]));
    const desc = palavras.map((p) => mapa.get(p) || p).join(" ").trim();
    out.descricao = desc.charAt(0).toUpperCase() + desc.slice(1);
  }
  return out;
}
