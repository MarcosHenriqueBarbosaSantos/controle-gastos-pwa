/* ---------- Lançar por prints: o ganho do dia lido do print da tela de cada app (Uber, 99, inDrive...) ----------
   O motorista coloca o dia na tela do app, tira o print (gesto ou botões do aparelho) e, no fim, escolhe todos os prints de uma vez.
   De cada print o app tira: o dia, o app, o valor grande da tela (o ganho), os km e os pedidos, quando aparecem.
   No tablet com apps lado a lado, um print só vira um pedaço por app (colunasDoPrint).
   As contas daqui são puras e testadas (tests/prints.test.mjs). A leitura da imagem fica em lerPrintsDeGanhos, no fim do arquivo. */

const MESES_P = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const sem = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const pad = (n) => String(n).padStart(2, "0");

/** Junta as palavras (com caixa x0,y0,x1,y1) em linhas, de cima para baixo. Cada linha: { t, y0, y1, h, x0, x1, palavras }. */
export function linhasDasPalavras(palavras = []) {
  const ps = palavras.filter((p) => p && String(p.t || "").trim()).map((p) => ({ ...p, t: String(p.t).trim(), cy: (p.y0 + p.y1) / 2, h: p.y1 - p.y0 })).sort((a, b) => a.cy - b.cy || a.x0 - b.x0);
  const linhas = [];
  for (const p of ps) {
    const l = linhas.find((x) => Math.abs(x.cy - p.cy) <= Math.max(x.h, p.h) * 0.5);
    if (l) { l.palavras.push(p); l.y0 = Math.min(l.y0, p.y0); l.y1 = Math.max(l.y1, p.y1); l.h = Math.max(l.h, p.h); l.cy = (l.y0 + l.y1) / 2; }
    else linhas.push({ palavras: [p], y0: p.y0, y1: p.y1, h: p.h, cy: p.cy });
  }
  return linhas.map((l) => { l.palavras.sort((a, b) => a.x0 - b.x0); return { ...l, t: l.palavras.map((p) => p.t).join(" "), x0: Math.min(...l.palavras.map((p) => p.x0)), x1: Math.max(...l.palavras.map((p) => p.x1)) }; }).sort((a, b) => a.y0 - b.y0);
}

/** Qual app aparece no texto. Sem nome do app na tela, devolve null (a pessoa escolhe e o app lembra a posição). */
export function appDoTexto(texto, apps = []) {
  const t = sem(texto);
  const sinais = [["ubermoto", /uber\s*moto/], ["99moto", /99\s*moto/], ["99food", /99\s*food/], ["indrive", /in\s*drive/], ["ifood", /ifood/], ["rappi", /rappi/],
    ["uber", /\buber\b|uber\s*pro|caixa de ent[\s\S]*descubra|descubra[\s\S]*caixa de ent/], ["99", /taxa\s*99|\b99\s*pop\b|\b99\s*pay\b|central de ganhos|\b99\b/]];
  return sinais.find(([k, re]) => (!apps.length || apps.includes(k)) && re.test(t))?.[0] || null;
}

/**
 * O dia do ganho mostrado no print, em AAAA-MM-DD. Ignora a barra de status do aparelho (o alto da tela, com o dia de hoje)
 * e as faixas de semana ("5 de out. - 12 de out."). Com o ano escrito, vale esse; sem ano, o ano de hoje (ou o anterior, se o mês ainda não chegou).
 */
export function diaDoPrint(linhas, hoje, alturaTela = 0) {
  const topo = alturaTela > 0 ? alturaTela * 0.045 : -1, anoHoje = Number(hoje.slice(0, 4)), mesHoje = Number(hoje.slice(5, 7));
  const re = new RegExp(`(?<![\\d/])(\\d{1,2})\\s*(?:de\\s+)?(${MESES_P.join("|")})[a-z]*\\.?(?:\\s*(?:de\\s+)?(\\d{4}))?`, "g");
  const achados = [];
  for (const l of linhas) {
    if (l.y1 <= topo) continue;                                   // barra de status
    const t = sem(l.t), ms = [...t.matchAll(re)];
    const num = [...t.matchAll(/(?<!\d)(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?!\d)/g)];
    if (ms.length + num.length !== 1) continue;                   // nenhuma data, ou uma faixa de datas: não serve
    let d, mo, a;
    if (ms.length) { d = Number(ms[0][1]); mo = MESES_P.indexOf(ms[0][2]) + 1; a = ms[0][3] ? Number(ms[0][3]) : null; }
    else { d = Number(num[0][1]); mo = Number(num[0][2]); a = Number(num[0][3]); if (a < 100) a += 2000; }
    if (!(d >= 1 && d <= 31 && mo >= 1 && mo <= 12)) continue;
    if (!a) a = mo > mesHoje ? anoHoje - 1 : anoHoje;
    achados.push({ iso: `${a}-${pad(mo)}-${pad(d)}`, comAno: /\d{4}/.test(t) || num.length > 0, h: l.h });
  }
  const bom = achados.filter((x) => x.iso <= hoje);
  if (!bom.length) return null;
  return (bom.find((x) => x.comAno) || bom.sort((a, b) => b.h - a.h)[0]).iso;
}

const valorBr = (s) => Number(String(s).replace(/\./g, "").replace(",", "."));
/** Palavras que dizem que o valor ao lado não é o ganho do dia (meta, saldo, bônus, recompensa...). */
const NAO_GANHO = /objetiv|meta|plano|saldo|carteira|bonus|recompensa|ganhe ate|aumentar|comiss|taxa|imposto|por km|\/km|tarifa|gorjeta|dinheiro|semana|ultima|solicitac/;

/**
 * Lê um print (ou um pedaço dele) já em linhas: { app, valor, data, km, viagens, confianca }.
 * O valor é o maior número em reais da tela (a letra grande que o app usa para o ganho), fora de meta, saldo e bônus.
 * Os km e os pedidos vêm do número que fica em cima (ou do lado) da palavra "km", "pedidos", "viagens" ou "corridas".
 */
export function leituraDoPrintDeGanhos(linhas, { apps = [], hoje, alturaTela = 0 } = {}) {
  const topo = alturaTela > 0 ? alturaTela * 0.045 : -1, util = linhas.filter((l) => l.y1 > topo);
  const texto = util.map((l) => l.t).join("\n");
  const cands = [];
  util.forEach((l, i) => {
    const t = sem(l.t), vizinho = sem([util[i - 1]?.t, util[i + 1]?.t].filter(Boolean).join(" "));
    for (const m of l.t.matchAll(/R\s?\$\s*([\d.]{1,9},\d{2})/g)) {
      const v = valorBr(m[1]); if (!(v > 0 && v < 100000)) continue;
      if (/[+]\s*$/.test(l.t.slice(0, m.index))) continue;          // "+R$ 13,50": preço dinâmico no mapa, não é ganho
      const antes = sem(l.t.slice(Math.max(0, m.index - 22), m.index)), sozinho = sem(l.t.replace(m[0], "")).replace(/[^a-z]/g, "").length < 3;
      const ruim = NAO_GANHO.test(antes) || (sozinho && NAO_GANHO.test(vizinho) && !/ganho|renda|total|hoje|liquid/.test(vizinho));
      cands.push({ v, h: l.h, ruim, bom: /ganho|renda|liquid|total/.test(t + " " + vizinho) });
    }
  });
  const ok = cands.filter((c) => !c.ruim), lista = ok.length ? ok : cands;
  if (!lista.length) return null;
  const maiorH = Math.max(...lista.map((c) => c.h)), topoH = lista.filter((c) => c.h >= maiorH * 0.8);
  const escolhido = (topoH.find((c) => c.bom) || topoH[0]);
  // km e viagens: o número logo acima da palavra (mesma coluna) ou na mesma linha, antes dela
  const numeroDe = (reRotulo, reNum) => {
    for (let i = 0; i < util.length; i++) {
      for (const p of util[i].palavras || []) {
        if (!reRotulo.test(sem(p.t))) continue;
        const mesma = sem(util[i].t).match(reNum); if (mesma && util[i].palavras.length > 1 && !reRotulo.test(sem(util[i].palavras[0].t))) return mesma[1];
        const cx = (p.x0 + p.x1) / 2, acima = util.slice(Math.max(0, i - 2), i).reverse();
        for (const l of acima) for (const q of l.palavras || []) { const qc = (q.x0 + q.x1) / 2; if (Math.abs(qc - cx) < Math.max(80, (p.x1 - p.x0) * 1.5)) { const m = sem(q.t).match(/^(\d{1,4}(?:[.,]\d{1,2})?)$/); if (m) return m[1]; } }
      }
    }
    return null;
  };
  const kmTxt = (texto.match(/(?<![\d,$])(\d{1,4}(?:[.,]\d{1,2})?)\s*km\b(?!\s*\/)/i) || [])[1] || numeroDe(/quilometr/, /(\d{1,4}(?:[.,]\d{1,2})?)\s*km/);
  const viagTxt = numeroDe(/^(pedidos?|viagens?|corridas?|solicitac)/, /(?<![\d,.])(\d{1,3})\s+(?:pedidos?|viagens?|corridas?)/);
  const km = kmTxt ? valorBr(kmTxt) : 0, viagens = viagTxt && /^\d+$/.test(viagTxt) ? Number(viagTxt) : 0;
  return { app: appDoTexto(texto, apps), valor: r2(escolhido.v), data: diaDoPrint(util, hoje, alturaTela), km: km > 0 && km < 2000 ? r2(km) : 0, viagens: viagens > 0 && viagens < 200 ? viagens : 0, confianca: ok.length ? (escolhido.bom ? "alta" : "media") : "baixa" };
}

/**
 * Tablet com apps lado a lado: onde ficam as divisórias. lum: tons de cinza (W*H). Devolve os pedaços [{x0, x1}] da esquerda para a direita.
 * Divisória = faixa estreita de colunas quase lisas de cima a baixo, entre 15% e 85% da largura. Print de celular (em pé) fica inteiro.
 */
export function colunasDoPrint(lum, W, H) {
  if (!(W > H * 1.15)) return [{ x0: 0, x1: W }];
  const y0 = Math.floor(H * 0.12), y1 = Math.floor(H * 0.88), passo = Math.max(1, Math.floor((y1 - y0) / 300));
  const lisa = new Array(W).fill(false);
  for (let x = Math.floor(W * 0.15); x < Math.ceil(W * 0.85); x++) {
    let s = 0, s2 = 0, n = 0;
    for (let y = y0; y < y1; y += passo) { const v = lum[y * W + x]; s += v; s2 += v * v; n++; }
    const m = s / n; lisa[x] = s2 / n - m * m < 60;
  }
  const cortes = []; let ini = -1;
  for (let x = 0; x <= W; x++) {
    if (x < W && lisa[x]) { if (ini < 0) ini = x; }
    else if (ini >= 0) { if (x - ini >= 2 && x - ini <= W * 0.04) cortes.push((ini + x) / 2); ini = -1; }
  }
  const unicos = cortes.filter((c, i) => !i || c - cortes[i - 1] > W * 0.1);
  const bordas = [0, ...unicos, W], partes = [];
  for (let i = 0; i < bordas.length - 1; i++) if (bordas[i + 1] - bordas[i] > W * 0.15) partes.push({ x0: Math.round(bordas[i]), x1: Math.round(bordas[i + 1]) });
  return partes.length ? partes : [{ x0: 0, x1: W }];
}

/**
 * As leituras conferidas viram um lançamento por dia: { dia, apps: {uber: 61.18, ...}, viagensApp, km, viagens }.
 * Duas leituras do mesmo app no mesmo dia: fica a maior (o mesmo print lido duas vezes não soma).
 * `jaTem(dia, app)` diz quanto já está lançado naquele dia e app: esses ficam de fora e aparecem em `repetidos`.
 */
export function lancamentosDosPrints(leituras, jaTem = () => 0) {
  const por = new Map(), repetidos = [];
  for (const l of leituras) {
    if (!l || !l.usar || !l.data || !l.app || !(l.valor > 0)) continue;
    if (jaTem(l.data, l.app) > 0) { repetidos.push(l); continue; }
    const d = por.get(l.data) || { dia: l.data, apps: {}, viagensApp: {}, km: 0, viagens: 0 };
    if (!(d.apps[l.app] >= l.valor)) { d.apps[l.app] = r2(l.valor); if (l.viagens) d.viagensApp[l.app] = l.viagens; }
    d.km = r2(Math.max(d.km, 0) + (l.km || 0)); d.viagens = Object.values(d.viagensApp).reduce((s, v) => s + v, 0);
    por.set(l.data, d);
  }
  return { dias: [...por.values()].sort((a, b) => (a.dia < b.dia ? -1 : 1)), repetidos };
}

/* ---------- leitura das imagens (navegador) ---------- */
/** As palavras que o Tesseract achou, com caixa, nas versões que devolvem `words` ou só `blocks`. */
function palavrasDoResultado(data) {
  const ws = data?.words?.length ? data.words : (data?.blocks || []).flatMap((b) => (b.paragraphs || []).flatMap((p) => (p.lines || []).flatMap((l) => l.words || [])));
  return ws.map((w) => ({ t: w.text, x0: w.bbox.x0, y0: w.bbox.y0, x1: w.bbox.x1, y1: w.bbox.y1 }));
}

/**
 * Lê vários prints de uma vez, no aparelho. Cada print (ou cada pedaço, no tablet com apps lado a lado) vira uma leitura:
 * { arquivo, parte, partes, app, valor, data, km, viagens, confianca, miniatura }. Os que não têm valor vêm com valor 0.
 * deps: { carregaLeitor, preparaImagem } de leitor.js. Lança Error("leitor-indisponivel") sem a biblioteca.
 */
export async function lerPrintsDeGanhos(arquivos, { apps = [], hoje, aoProgredir = () => {}, deps }) {
  const T = await deps.carregaLeitor(); let worker;
  try { worker = await T.createWorker("por", 1); } catch { throw new Error("leitor-indisponivel"); }
  const saida = [];
  try {
    await worker.setParameters({ tessedit_pageseg_mode: "11" });   // texto espalhado: telas de app têm números soltos
    for (let i = 0; i < arquivos.length; i++) {
      aoProgredir({ atual: i + 1, total: arquivos.length });
      const tela = await deps.preparaImagem(arquivos[i]), W = tela.width, H = tela.height;
      const g = tela.getContext("2d", { willReadFrequently: true }), px = g.getImageData(0, 0, W, H).data, lum = new Uint8ClampedArray(W * H);
      for (let k = 0, j = 0; j < lum.length; k += 4, j++) lum[j] = px[k];
      const partes = colunasDoPrint(lum, W, H);
      for (let p = 0; p < partes.length; p++) {
        const { x0, x1 } = partes[p], c = document.createElement("canvas"); c.width = x1 - x0; c.height = H;
        c.getContext("2d").drawImage(tela, x0, 0, x1 - x0, H, 0, 0, x1 - x0, H);
        const { data } = await worker.recognize(c), linhas = linhasDasPalavras(palavrasDoResultado(data));
        const l = leituraDoPrintDeGanhos(linhas, { apps, hoje, alturaTela: H }) || { app: appDoTexto(data?.text || "", apps), valor: 0, data: null, km: 0, viagens: 0, confianca: "baixa" };
        const mini = document.createElement("canvas"), e = 120 / Math.max(c.width, c.height); mini.width = Math.round(c.width * e); mini.height = Math.round(c.height * e);
        mini.getContext("2d").drawImage(c, 0, 0, mini.width, mini.height);
        saida.push({ ...l, arquivo: i, parte: p, partes: partes.length, miniatura: mini.toDataURL("image/jpeg", 0.6) });
      }
    }
  } finally { worker.terminate().catch(() => {}); }
  return saida;
}

/* ---------- a tela "Lançar por prints" ---------- */
const DS_P = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const rotDiaP = (iso) => `${DS_P[new Date(iso + "T12:00:00").getDay()]} ${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
/**
 * app: { $, esc, brl, nm, toast, hoje, apps() -> [[k, nome]], lado(partes, parte) / guardaLado(partes, parte, app),
 *        jaTem(dia, app) -> valor já lançado, gravaDia({dia, apps, viagensApp, km, viagens, ms}) -> Promise<bool>, voltar(), lerHoras(txt), deps }.
 */
export function criaLancarPrints(app) {
  const { $, esc, brl, nm, toast, hoje } = app;
  let leituras = [], horas = {};
  function tela(host, arquivos = null) {
    leituras = []; horas = {};
    host.innerHTML = `<div id="motRoot" class="lp">
      <button class="mot-voltar" type="button" id="lpVolta"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>Voltar</button>
      <ol class="lp-passos"><li>Abra cada app no dia que quer lançar, na tela de ganhos, e tire o print (com os botões ou o gesto do aparelho).</li>
        <li>Faça isso com cada dia e cada app. No tablet com os apps lado a lado, um print só serve para todos.</li>
        <li>Aqui, escolha todos os prints de uma vez. O app lê o dia, o app e o valor; você confere e lança tudo.</li></ol>
      <button class="btn primary lp-escolhe" type="button" id="lpEscolhe">Escolher os prints</button>
      <p class="hint">A leitura é feita neste aparelho. Os prints não são guardados nem enviados.</p>
      <div id="lpLista" aria-live="polite"></div></div>`;
    $("lpVolta").onclick = () => app.voltar();
    $("lpEscolhe").onclick = () => { const f = document.createElement("input"); f.type = "file"; f.accept = "image/*"; f.multiple = true; f.onchange = () => f.files?.length && ler([...f.files]); f.click(); };
    if (arquivos?.length) ler(arquivos);
  }
  async function ler(arquivos) {
    const lista = $("lpLista"); $("lpEscolhe").disabled = true;
    lista.innerHTML = `<div class="lp-lendo"><b id="lpProg">Lendo ${arquivos.length === 1 ? "o print" : `${arquivos.length} prints`}…</b><span>Pode levar alguns segundos por print.</span><div class="barra"><i id="lpBarra"></i></div></div>`;
    try {
      const lidas = await lerPrintsDeGanhos(arquivos, { apps: app.apps().map(([k]) => k), hoje: hoje(), deps: app.deps,
        aoProgredir: ({ atual, total }) => { if ($("lpProg")) $("lpProg").textContent = `Lendo o print ${atual} de ${total}…`; if ($("lpBarra")) $("lpBarra").style.width = `${Math.round(((atual - 1) / total) * 100)}%`; } });
      const ontem = new Date(Date.now() - 864e5), isoOntem = `${ontem.getFullYear()}-${pad(ontem.getMonth() + 1)}-${pad(ontem.getDate())}`;
      leituras = lidas.map((l, i) => {
        const irmao = lidas.find((x) => x.arquivo === l.arquivo && x.data)?.data, antes = lidas.slice(0, i).reverse().find((x) => x.data)?.data;
        return { ...l, app: l.app || app.lado(l.partes, l.parte) || null, data: l.data || irmao || antes || isoOntem, dataLida: Boolean(l.data), usar: l.valor > 0 };
      });
    } catch (e) {
      lista.innerHTML = `<p class="lp-erro">${e?.message === "leitor-indisponivel" ? "O leitor de imagens precisa de internet na primeira vez. Conecte e tente de novo." : "Não consegui ler esses prints. Tente de novo, ou lance o dia à mão."}</p>`;
      $("lpEscolhe").disabled = false; return;
    }
    $("lpEscolhe").disabled = false; $("lpEscolhe").textContent = "Escolher outros prints";
    desenha();
  }
  function desenha() {
    const apps = app.apps(), lista = $("lpLista");
    if (!leituras.length) { lista.innerHTML = `<p class="lp-erro">Nenhum print lido.</p>`; return; }
    const nomeApp = (k) => esc((apps.find(([a]) => a === k) || [k, k])[1]);
    const opcoes = (sel) => `<option value="">Qual app?</option>${apps.map(([k, n]) => `<option value="${k}"${k === sel ? " selected" : ""}>${esc(n)}</option>`).join("")}`;
    const { dias, repetidos } = lancamentosDosPrints(leituras, app.jaTem);
    const total = r2(dias.reduce((s, d) => s + Object.values(d.apps).reduce((a, b) => a + b, 0), 0));
    const HS = [4, 6, 8, 10, 12];
    lista.innerHTML = `<h3 class="lp-h">Confira cada leitura</h3>
      <ul class="lp-itens">${leituras.map((l, i) => { const ja = l.app && l.data ? app.jaTem(l.data, l.app) : 0;
        return `<li class="lp-item${l.usar ? "" : " off"}">
        <img src="${l.miniatura}" alt="" width="60">
        <div class="lp-campos">
          <label class="lp-usa"><input type="checkbox" data-lp-usar="${i}"${l.usar ? " checked" : ""}> Lançar este${l.partes > 1 ? ` <small>(parte ${l.parte + 1} de ${l.partes} do print)</small>` : ""}</label>
          <div class="lp-linha"><label>App<select class="in" data-lp-app="${i}">${opcoes(l.app)}</select></label><label>Dia${l.dataLida ? "" : ` <small class="lp-conf">confira</small>`}<input class="in" type="date" max="${hoje()}" data-lp-data="${i}" value="${l.data}"></label></div>
          <div class="lp-linha tres"><label>Ganho (R$)${l.confianca === "alta" ? "" : ` <small class="lp-conf">confira</small>`}<input class="in" inputmode="decimal" data-lp-valor="${i}" value="${l.valor > 0 ? l.valor.toFixed(2).replace(".", ",") : ""}"></label><label>Km<input class="in" inputmode="decimal" data-lp-km="${i}" value="${l.km ? String(l.km).replace(".", ",") : ""}"></label><label>Viagens<input class="in" inputmode="numeric" data-lp-viag="${i}" value="${l.viagens || ""}"></label></div>
          ${ja > 0 && l.usar ? `<p class="lp-ja">Já tem ${brl(ja)} desse app nesse dia. Este não será lançado de novo.</p>` : ""}
        </div></li>`; }).join("")}</ul>
      ${dias.length ? `<h3 class="lp-h">Horas trabalhadas em cada dia</h3><ul class="lp-dias">${dias.map((d) => `<li><div class="lp-dia-tit"><b>${rotDiaP(d.dia)}</b><span>${Object.entries(d.apps).map(([k, v]) => `${nomeApp(k)} ${brl(v)}`).join(" + ")}</span></div>
        <div class="md-horas" role="group" aria-label="Horas em ${rotDiaP(d.dia)}">${HS.map((h) => `<button type="button" class="chip" data-lp-h="${d.dia}|${h}" aria-pressed="${horas[d.dia] === `${h}:00`}">${h}h</button>`).join("")}</div>
        <input class="in lp-hin" data-lp-hin="${d.dia}" inputmode="text" maxlength="5" placeholder="ou digite, ex.: 7:30" value="${esc(horas[d.dia] && !HS.some((h) => horas[d.dia] === `${h}:00`) ? horas[d.dia] : "")}"></li>`).join("")}</ul>` : ""}
      ${repetidos.length ? `<p class="hint">${repetidos.length === 1 ? "1 leitura já estava lançada e ficou de fora." : `${repetidos.length} leituras já estavam lançadas e ficaram de fora.`}</p>` : ""}
      <p class="auth-msg err" id="lpMsg" role="alert"></p>
      <button class="btn primary lp-lanca" type="button" id="lpLanca"${dias.length ? "" : " disabled"}>${dias.length ? `Lançar ${dias.length === 1 ? "1 dia" : `${dias.length} dias`}: ${brl(total)}` : "Nada para lançar"}</button>`;
    const pega = (i) => leituras[Number(i)];
    lista.querySelectorAll("[data-lp-usar]").forEach((x) => (x.onchange = () => { pega(x.dataset.lpUsar).usar = x.checked; desenha(); }));
    lista.querySelectorAll("[data-lp-app]").forEach((x) => (x.onchange = () => { const l = pega(x.dataset.lpApp); l.app = x.value || null; if (l.app) app.guardaLado(l.partes, l.parte, l.app); desenha(); }));
    lista.querySelectorAll("[data-lp-data]").forEach((x) => (x.onchange = () => { const l = pega(x.dataset.lpData); l.data = x.value; l.dataLida = true; desenha(); }));
    lista.querySelectorAll("[data-lp-valor]").forEach((x) => (x.onchange = () => { const l = pega(x.dataset.lpValor); l.valor = nm(x.value); l.confianca = "alta"; l.usar = l.valor > 0; desenha(); }));
    lista.querySelectorAll("[data-lp-km]").forEach((x) => (x.onchange = () => { pega(x.dataset.lpKm).km = nm(x.value); desenha(); }));
    lista.querySelectorAll("[data-lp-viag]").forEach((x) => (x.onchange = () => { pega(x.dataset.lpViag).viagens = Math.max(0, Math.round(nm(x.value))); desenha(); }));
    lista.querySelectorAll("[data-lp-h]").forEach((x) => (x.onclick = () => { const [d, h] = x.dataset.lpH.split("|"); horas[d] = `${h}:00`; desenha(); }));
    lista.querySelectorAll("[data-lp-hin]").forEach((x) => (x.onchange = () => { horas[x.dataset.lpHin] = x.value.trim(); desenha(); }));
    if ($("lpLanca")) $("lpLanca").onclick = async () => {
      const falta = dias.filter((d) => !app.lerHoras(horas[d.dia] || "")), semApp = leituras.some((l) => l.usar && l.valor > 0 && !l.app);
      if (semApp) return void ($("lpMsg").textContent = "Escolha o app de cada leitura marcada.");
      if (falta.length) return void ($("lpMsg").textContent = `Toque nas horas trabalhadas de ${falta.map((d) => rotDiaP(d.dia)).join(", ")}.`);
      $("lpLanca").disabled = true; let ok = 0;
      for (const d of dias) if (await app.gravaDia({ ...d, ms: app.lerHoras(horas[d.dia]) })) ok++;
      toast(ok === dias.length ? `${ok === 1 ? "1 dia lançado" : `${ok} dias lançados`}: ${brl(total)}. Confira em Ganhos.` : `Lancei ${ok} de ${dias.length} dias. Tente de novo os que faltaram.`);
      if (ok) app.voltar(); else $("lpLanca").disabled = false;
    };
  }
  return { tela };
}
