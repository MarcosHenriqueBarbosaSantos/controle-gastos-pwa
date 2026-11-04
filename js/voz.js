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
const VERBOS = /^(gastei|paguei|comprei|troquei|consertei|arrumei|contratei|assinei|renovei|comi|tomei|abasteci|coloquei|botei|dei|fiz|foi|foram|recebi|ganhei|entrou|caiu|guardei|poupei|investi|reservei|separei|retirei|tirei|resgatei|lancar|lanca|anota|anotar)\b\s*/;
const RUIDO = /^(eu|tenho|tinha|tive|meu|minha|meus|minhas|nosso|nossa|vou|vamos|quero|parcelar|parcelei|parcelo|dividir|passei|passar)$/;
const NAO_NOME_CARTAO = /^(credito|debito|de|do|da|dos|das|em|no|na|ontem|hoje|anteontem|para|pra|por|pelo|pela|com|que|e|ou|mas|vou|vamos|parcelado|vezes|reais|real|todo|todos|esse|este)$/;
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
  tira(/\b(a vista|a prazo|sem juros|parcelad[oa]s?)\b/);

  // Data: hoje, ontem, anteontem, "dia 5"
  if (/\banteontem\b/.test(t)) { out.data = diasAntes(hoje, 2); tira(/\banteontem\b/); }
  else if (/\bontem\b/.test(t)) { out.data = diasAntes(hoje, 1); tira(/\bontem\b/); }
  else if (/\bhoje\b/.test(t)) { out.data = hoje; tira(/\bhoje\b/); }
  // Mês dito: "luz 180 em dezembro", "internet 99 dia 15 de janeiro", "no mês que vem". Sem verbo no passado vale o próximo mês assim chamado;
  // com "gastei/paguei/comprei" vale o mais recente que já passou. "março" só vale com "em/de/para" na frente (para não confundir com o nome Marco).
  const nomeMes = t.match(/\b(?:(em|de|para|pra|no|ate|mes de)\s+)?(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/);
  const mesQueVem = t.match(/\b(?:no |para o |pro )?(?:proximo mes|mes que vem)\b/);
  if (!out.data && ((nomeMes && !(nomeMes[2] === "marco" && !nomeMes[1])) || mesQueVem)) {
    const [a, m, hd] = hoje.split("-").map(Number), passado = /\b(gastei|paguei|comprei|abasteci|troquei|consertei|arrumei|passei|comi|tomei|pagamos|compramos)\b/.test(t);
    const nomes = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    let alvoM, alvoA;
    if (nomeMes && !(nomeMes[2] === "marco" && !nomeMes[1])) { alvoM = nomes.indexOf(nomeMes[2]) + 1; alvoA = passado ? (alvoM <= m ? a : a - 1) : (alvoM >= m ? a : a + 1); }
    else { alvoM = m === 12 ? 1 : m + 1; alvoA = m === 12 ? a + 1 : a; }
    const diaDito = t.match(/\b(?:no )?dia (\d{1,2})\b/), fimDoMes = new Date(alvoA, alvoM, 0).getDate();
    const d = diaDito && Number(diaDito[1]) >= 1 && Number(diaDito[1]) <= 31 ? Math.min(Number(diaDito[1]), fimDoMes) : (alvoA === a && alvoM === m ? hd : Math.min(hd, fimDoMes));
    out.data = `${alvoA}-${pad(alvoM)}-${pad(d)}`;
    tira(nomeMes && !(nomeMes[2] === "marco" && !nomeMes[1]) ? nomeMes[0] : mesQueVem[0]); if (diaDito) tira(diaDito[0]);
  }
  const dia = t.match(/\b(?:no )?dia (\d{1,2})\b/);
  if (dia && Number(dia[1]) >= 1 && Number(dia[1]) <= 31) {
    const [a, m] = hoje.split("-").map(Number), d = Number(dia[1]);
    // Dia que ainda não chegou neste mês: é do mês passado.
    // Mês passado mais curto ("dia 31" falado em outubro, setembro tem 30): fica no último dia dele.
    const ultimoDoAnterior = new Date(a, m - 1, 0).getDate();
    const data = d <= Number(hoje.slice(8, 10)) ? `${a}-${pad(m)}-${pad(d)}` : (m === 1 ? `${a - 1}-12-${pad(Math.min(d, ultimoDoAnterior))}` : `${a}-${pad(m - 1)}-${pad(Math.min(d, ultimoDoAnterior))}`);
    out.data = data; tira(dia[0]);
  }

  // Cartão citado pelo nome: "no cartão da minha mãe", "no cartão roxo". O app acha o cartão pelo nome.
  const dono = t.match(/\b(?:no |na |pelo |pela |com |em )?cartao\s+(?:d[aeo]s?\s+)?(?:(?:minha|meu|nossa|nosso)\s+)?([a-z][a-z0-9]{2,})\b/);
  if (dono && !NAO_NOME_CARTAO.test(dono[1])) { out.cartaoCitado = dono[1]; out.forma = "Cartão de crédito"; tira(dono[0]); }
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
  const palavras = t.split(" ").filter((p) => p && !RUIDO.test(p));
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

/**
 * "mercado 50 farmácia 30" (o reconhecimento de fala quase nunca põe vírgula): corta o texto junto de cada valor.
 * Se a frase começa pelo nome ("mercado 50"), o valor fecha o item; se começa pelo valor ("gastei 50 no mercado 30 na farmácia"), abre.
 * Frases com data ("dia 5"), parcelas ou centavos não são cortadas: ficam como estão.
 */
function divideNoNumero(p) {
  const semAc = semAcento(p);
  if (/\bdia \d|\d\s*(?:x|vezes|parcelas)\b|centavos?\b/.test(semAc)) return [p];
  const achados = [...p.matchAll(/(?<![\p{L}\d])\d+(?:[.¤§,]\d+)*(?:\s*mil\b)?(?:\s*(?:reais|real|contos?|pilas?)\b)?/giu)];
  if (achados.length < 2) return [p];
  const antes = semAcento(p.slice(0, achados[0].index)).replace(VERBOS, "").split(/\s+/).filter((w) => w && !PONTAS.test(w));
  // Se o nome vem antes do valor ("luz 180 dezembro internet 99 janeiro"), o mês dito logo depois do valor ainda é do mesmo item.
  const mesLogoDepois = (fim) => { const r = semAcento(p.slice(fim)).match(/^\s*(?:(?:em|de|para|pra|no|ate)\s+)?(?:janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/); return r ? r[0].length : 0; };
  const cortes = antes.length ? achados.slice(0, -1).map((m) => { const fim = m.index + m[0].length; return fim + mesLogoDepois(fim); }) : achados.slice(1).map((m) => m.index);
  const out = []; let ini = 0;
  for (const c of cortes) { out.push(p.slice(ini, c).trim()); ini = c; }
  out.push(p.slice(ini).trim());
  return out.filter(Boolean);
}

/** Quantos itens, no máximo, uma fala vira de uma vez (acima disso a prévia fica comprida e o reconhecimento costuma ter errado). */
export const MAX_ITENS_FALA = 10;
/**
 * Várias coisas numa fala só: "mercado 50, farmácia 30 e uber 20" → três itens.
 * Separa em vírgula, ponto e vírgula, "e", "depois" e "mais" (sem quebrar "1.250,50" nem "32 reais e 50 centavos") e entende cada pedaço como a fala de um gasto.
 * Data e forma de pagamento ditas no começo ou no fim ("... ontem no débito") valem para os itens que não disseram a sua.
 * Devolve null quando não são pelo menos dois itens com valor, quando algum pedaço fica sem valor (a frase está solta demais), quando há
 * parcelas ou "guardei": aí vale o caminho de um lançamento só.
 * @returns {{itens:{valor:number, descricao:string, forma?:string, data?:string, tipo:"Despesa"|"Receita"}[], texto:string}|null}
 */
export function entendeVarios(fala, hoje) {
  const original = String(fala || "").trim();
  if (!original) return null;
  const antes = original.replace(/(\d)\.(\d)/g, "$1¤$2").replace(/(\d),(\d)/g, "$1§$2").replace(/([;,])/g, " $1 ");
  const protegido = extensoParaNumero(antes);
  const pedacos = protegido.split(/\s*(?:;|,|\bdepois\b|\bmais\b|\be\b(?!\s*\d+\s*centavos))\s*/i).map((p) => p.replace(/§/g, ",").replace(/¤/g, ".").trim()).filter(Boolean);
  const partes = pedacos.flatMap(divideNoNumero);
  if (partes.length < 2) return null;
  const lidos = partes.map((p) => entendeFala(p, hoje));
  if (lidos.some((f) => !(f.valor > 0) || f.parcelas || f.tipo === "Reserva")) return null;
  const primeiro = lidos[0], ultimo = lidos[lidos.length - 1];
  const comum = (campo) => ultimo[campo] ?? primeiro[campo];
  const itens = lidos.slice(0, MAX_ITENS_FALA).map((f) => ({
    valor: f.valor, tipo: f.tipo, descricao: f.descricao || (f.tipo === "Receita" ? "Entrada" : "Gasto"),
    ...((f.forma || (f.tipo === "Despesa" && comum("forma"))) ? { forma: f.forma || comum("forma") } : {}),
    ...((f.data || comum("data")) ? { data: f.data || comum("data") } : {}),
  }));
  return { itens, texto: original };
}

/* ---------- a fatura do cartão em vários meses: "1.000 esse mês e 600 nos outros meses até abril" ---------- */
const MESES_FALA = { janeiro: 0, jan: 0, fevereiro: 1, fev: 1, marco: 2, mar: 2, abril: 3, abr: 3, maio: 4, mai: 4, junho: 5, jun: 5, julho: 6, jul: 6, agosto: 7, ago: 7, setembro: 8, set: 8, outubro: 9, out: 9, novembro: 10, nov: 10, dezembro: 11, dez: 11 };
/** Soma n meses a um mês "AAAA-MM". */
const somaMes = (m, n) => { let a = Number(m.slice(0, 4)), x = Number(m.slice(5, 7)) + n; a += Math.floor((x - 1) / 12); x = (((x - 1) % 12) + 12) % 12 + 1; return `${a}-${pad(x)}`; };
/** O mês dito pelo nome, no ano certo: do mês de hoje em diante (janeiro dito em novembro é o do ano que vem). */
const mesDoNome = (idx, hoje) => { const a = Number(hoje.slice(0, 4)), m = Number(hoje.slice(5, 7)); return `${idx + 1 >= m ? a : a + 1}-${pad(idx + 1)}`; };
/** Meses de "de" até "ate", os dois incluídos (no máximo 36). */
const mesesDe = (de, ate) => { const out = []; for (let m = de, g = 0; m <= ate && g < 36; m = somaMes(m, 1), g++) out.push(m); return out; };
/** Quantos meses, no máximo, uma fala vira de uma vez, e quantos quando a pessoa não disse até quando. */
export const MAX_MESES_FALA = 24, MESES_SEM_FIM = 6;

/**
 * Entende a fatura do cartão em vários meses numa fala só. Exemplos que funcionam:
 *   "cartão roxo esse mês mil e duzentos e nos outros meses seiscentos até abril"
 *   "cartão 1000 em novembro e 600 de dezembro a abril"
 *   "fatura novembro 1200 dezembro 800 janeiro 650"
 *   "cartão esse mês 1000 e nos próximos 5 meses 600"
 * Só vale quando a frase fala de cartão ou fatura, tem valor e diz de qual mês (ou meses) ele é. O nome do cartão fica para o app achar.
 * @returns {{meses:{mes:string, valor:number}[], fimAssumido:boolean, texto:string}|null}  mes = "AAAA-MM"; fimAssumido = a pessoa não disse até quando
 */
export function entendeMeses(fala, hoje) {
  const original = String(fala || "").trim();
  if (!original) return null;
  const t = semAcento(extensoParaNumero(original.replace(/(\d)\.(\d)/g, "$1¤$2").replace(/(\d),(\d)/g, "$1§$2").replace(/([;,])/g, " $1 "))).replace(/r\$\s*/g, " ").replace(/\s+/g, " ").trim();
  // "fatura" basta. "cartão" só vale como a fatura quando não é a forma de pagar de uma compra: "gastei 50 no mercado no cartão em janeiro" é um gasto, não a fatura.
  const fatura = /\bfatura\b/.test(t), cartaoSolto = /(?:^|\s)(?<!\b(?:no|na|pelo|pela|com|em|num|numa)\s)cartao\b/.test(t) && !/\b(gastei|comprei|paguei|passei|abasteci|coloquei|botei|comi|tomei|parcelei)\b/.test(t);
  if (!fatura && !cartaoSolto) return null;
  const tk = t.split(" ").filter(Boolean), it = [];
  for (let i = 0; i < tk.length; i++) {
    const w = tk[i], prox = tk[i + 1], ult = it[it.length - 1];
    if (/^\d/.test(w)) {
      if (tk[i - 1] === "dia") continue;
      const v = Number(w.replace(/¤/g, "").replace(/§/g, "."));
      if (prox === "mes" || prox === "meses") { it.push({ k: "count", n: v }); i++; continue; }
      it.push({ k: "num", v }); if (prox === "reais" || prox === "real") i++;
      continue;
    }
    if (MESES_FALA[w] !== undefined && !(w === "mar" && ult?.k === "num")) { it.push({ k: "mes", idx: MESES_FALA[w] }); continue; }
    if ((w === "esse" || w === "este" || w === "neste" || w === "nesse") && prox === "mes") { it.push({ k: "esse" }); i++; continue; }
    if (w === "mes" && prox === "atual") { it.push({ k: "esse" }); i++; continue; }
    if (w === "agora") { it.push({ k: "esse" }); continue; }
    if (["outros", "demais", "proximos", "seguintes", "restante"].includes(w)) { if (prox === "meses") i++; it.push({ k: "outros" }); continue; }
    if (w === "meses" && prox === "seguintes") { it.push({ k: "outros" }); i++; continue; }
    if (w === "proximo" && prox === "mes") { it.push({ k: "proximo" }); i++; continue; }
    if ((w === "todo" || w === "todos" || w === "cada") && (prox === "mes" || prox === "meses" || ((prox === "o" || prox === "os") && /^mes/.test(tk[i + 2] || "")))) { it.push({ k: "todos" }); i += prox === "mes" || prox === "meses" ? 1 : 2; continue; }
    if (w === "ate") { it.push({ k: "ate" }); continue; }
    if (w === "a" && ult?.k === "mes" && (MESES_FALA[prox] !== undefined || (["o", "mes", "de"].includes(prox) && MESES_FALA[tk[i + 2]] !== undefined))) { it.push({ k: "ate" }); continue; }
  }
  const nums = it.filter((x) => x.k === "num");
  if (!nums.length || !it.some((x) => !["num", "ate"].includes(x.k))) return null;
  // Cada valor com o seu "de quando": o mês pode vir antes do valor ("novembro 1200") ou depois ("1000 em novembro").
  const primeiroNum = it.findIndex((x) => x.k === "num"), escopoAntes = it.slice(0, primeiroNum).some((x) => x.k !== "ate");
  const clausulas = [];
  if (escopoAntes) {
    let atual = [];
    for (const x of it) {
      if (x.k === "num") { atual.push(x); clausulas.push(atual); atual = []; continue; }
      const ult = clausulas[clausulas.length - 1], anterior = atual.length ? atual[atual.length - 1] : null;
      // "600 até abril" e "600 por 5 meses": o que vem logo depois do valor ainda é dele
      if (!atual.length && ult && (x.k === "ate" || x.k === "count")) ult.push(x);
      else if (!atual.length && ult && x.k === "mes" && ult[ult.length - 1].k === "ate") ult.push(x);
      else atual.push(x), void anterior;
    }
  } else {
    for (const x of it) { if (x.k === "num") clausulas.push([x]); else if (clausulas.length) clausulas[clausulas.length - 1].push(x); }
  }
  const atual = hoje.slice(0, 7), mapa = new Map(); let fimAssumido = false;
  const livre = () => (mapa.size ? somaMes([...mapa.keys()].sort().at(-1), 1) : atual);
  for (const c of clausulas) {
    const valor = c.find((x) => x.k === "num").v, esc = c.filter((x) => x.k !== "num");
    if (!(valor > 0) || !esc.length) continue;
    const tem = (k) => esc.find((x) => x.k === k), meses = esc.filter((x) => x.k === "mes"), ate = tem("ate"), conta = tem("count");
    const plural = tem("outros") || tem("todos");
    let lista = [];
    if (plural || (conta && !meses.length)) {
      const ini = tem("todos") ? atual : livre();
      if (ate && meses.length) { let fim = mesDoNome(meses[meses.length - 1].idx, hoje); if (fim < ini) fim = somaMes(fim, 12); lista = mesesDe(ini, fim); }
      else if (conta) lista = mesesDe(ini, somaMes(ini, Math.max(1, Math.round(conta.n)) - 1));
      else { lista = mesesDe(ini, somaMes(ini, MESES_SEM_FIM - 1)); fimAssumido = true; }
    } else if (tem("esse")) {
      lista = ate && meses.length ? mesesDe(atual, mesDoNome(meses[0].idx, hoje)) : [atual];
    } else if (meses.length) {
      const ini = mesDoNome(meses[0].idx, hoje); let fim = ini;
      if (ate && meses.length >= 2) { fim = mesDoNome(meses[1].idx, hoje); if (fim < ini) fim = somaMes(fim, 12); }
      lista = mesesDe(ini, fim);
    } else if (tem("proximo")) lista = [somaMes(atual, 1)];
    for (const m of lista) mapa.set(m, valor);
  }
  if (!mapa.size) return null;
  const meses = [...mapa.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(0, MAX_MESES_FALA).map(([mes, valor]) => ({ mes, valor }));
  return { meses, fimAssumido, texto: original };
}

/**
 * A oferta de uma corrida, falada: "dezoito reais, sete quilômetros, quinze minutos" ou "18,50 com 7,2 km e 15 min".
 * Km e minutos vêm pela palavra ao lado; o valor é o número com "reais" ou, sem isso, o primeiro número que sobrar.
 * @returns {{valor?:number, km?:number, min?:number}}
 */
export function entendeCorrida(fala) {
  let t = semAcento(extensoParaNumero(String(fala || ""))).replace(/r\$\s*/g, " ").replace(/\s+/g, " ").trim();
  const num = (s) => Number(String(s).replace(",", "."));
  const out = {};
  const km = t.match(/(\d+(?:[.,]\d+)?)\s*(?:km|quilometros?|kilometros?|kms?)\b/);
  if (km) { out.km = num(km[1]); t = t.replace(km[0], " "); }
  const min = t.match(/(\d+)\s*(?:min|mins|minutos?)\b/);
  if (min) { out.min = Number(min[1]); t = t.replace(min[0], " "); }
  const real = t.match(/(\d+(?:[.,]\d{1,2})?)\s*(?:reais|real|contos?|pilas?)\b(?:\s*e\s*(\d{1,2})\s*centavos?)?/) || t.match(/(\d+(?:[.,]\d{1,2})?)/);
  if (real) { let n = num(real[1]); if (real[2]) n += Number(real[2]) / 100; if (n > 0) out.valor = Math.round(n * 100) / 100; }
  return out;
}
