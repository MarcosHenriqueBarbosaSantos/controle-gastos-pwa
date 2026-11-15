/* ---------- Resumo do ano do motorista (para o Imposto de Renda, o MEI ou o contador) ----------
   Junta o ano todo de quem roda: quanto cada app pagou, as corridas particulares (os recibos), os gastos com o carro
   separados como o contador pede (combustível, pedágio e estacionamento, manutenção, documentos e seguro, outros),
   os km e as horas. Sai em PDF, em planilha (CSV) ou em texto para o WhatsApp.
   Não é declaração nem conselho de imposto: é o resumo organizado do que a pessoa registrou no app.
   As contas são puras (tests/anual.test.mjs); a tela só monta o texto. */
import { APPS, isoLocal, duracaoMs, ganhoDoTurno } from "./motorista.js";
import { linhasDoAno, pdfDeLinhas } from "./extras.js";

const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const MESES_A = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/** Os grupos de gasto do carro, na ordem do relatório. */
export const GRUPOS_CARRO = [
  ["comb", "Combustível"],
  ["pedagio", "Pedágio e estacionamento"],
  ["manut", "Manutenção, peças e lavagem"],
  ["docs", "IPVA, licenciamento, seguro e multas"],
  ["outros", "Aluguel, parcela e outros do carro"],
];

/**
 * Em que grupo de gasto do carro um gasto entra, pela categoria e pela descrição. null se não é gasto do carro.
 * "Transporte" sozinho não entra: pode ser ônibus ou corrida que a própria pessoa pegou.
 */
export function grupoDoCarro(x) {
  if (x?.tipo !== "Despesa") return null;
  const t = `${x.categoria || ""} ${x.descricao || ""}`.toLowerCase();
  if (/combust|gasolin|[aá]lcool|etanol|abastec|\bgnv\b|diesel/.test(t)) return "comb";
  if (/ped[aá]gio|estacion|zona azul|sem parar|conectcar|veloe/.test(t)) return "pedagio";
  if (/manuten|oficina|mec[aâ]nic|pneu|[oó]leo|revis[aã]o|pe[cç]as?\b|lavagem|lava.?jato|lava.?r[aá]pido|funilar|borrachar|alinhament|balanceament|bateria|freio|embreagem/.test(t)) return "manut";
  if (/ipva|licenciament|seguro (do|da) (carro|moto|ve[ií]culo)|seguro auto|\bmulta|detran|vistoria/.test(t)) return "docs";
  if (/carro|moto\b|ve[ií]culo|locadora|loca[cç][aã]o|aluguel do (carro|ve)/.test(String(x.categoria || "").toLowerCase()) || /locadora|aluguel do carro|parcela do carro|financiamento do carro/.test(t)) return "outros";
  return null;
}

/** É o lançamento que o Recibo para cliente cria ("Corrida particular: Nome")? */
export const ehCorridaParticular = (x) => x?.tipo === "Receita" && /^corrida particular/i.test(String(x.descricao || "").trim());

/**
 * O resumo do ano. st: { lancamentos, fixos } (como o app guarda); turnos: as jornadas encerradas.
 * Os ganhos dos apps vêm das jornadas (é lá que cada app é separado); os particulares, dos recibos lançados como ganho.
 * Os gastos do carro vêm dos lançamentos e das contas fixas do ano (até `ate`, para não contar o que ainda não chegou).
 */
export function resumoAnualDoMotorista({ st, turnos = [], ano, ate = "" }) {
  const de = `${ano}-01-01`, fim = ate && ate < `${ano}-12-31` ? ate : `${ano}-12-31`;
  const doAno = (turnos || []).filter((t) => t.fim && isoLocal(t.ini) >= de && isoLocal(t.ini) <= fim);
  const nomes = Object.fromEntries(APPS);
  const porApp = {}, viagensApp = {}, meses = Array.from({ length: 12 }, (_, i) => ({ m: `${ano}-${String(i + 1).padStart(2, "0")}`, apps: 0, particular: 0, carro: 0 }));
  const idx = (iso) => Number(String(iso).slice(5, 7)) - 1;
  let km = 0, ms = 0, viagens = 0, semGanho = 0; const dias = new Set();
  for (const t of doAno) {
    if (!(ganhoDoTurno(t) > 0)) semGanho++;
    meses[idx(isoLocal(t.ini))].km = r2((meses[idx(isoLocal(t.ini))].km || 0) + (Number(t.km) > 0 ? Number(t.km) : 0));
    for (const [k, v] of Object.entries(t.apps || {})) if (Number(v) > 0) porApp[k] = r2((porApp[k] || 0) + Number(v));
    for (const [k, v] of Object.entries(t.viagensApp || {})) if (Number(v) > 0) viagensApp[k] = (viagensApp[k] || 0) + Number(v);
    meses[idx(isoLocal(t.ini))].apps = r2(meses[idx(isoLocal(t.ini))].apps + ganhoDoTurno(t));
    km += Number(t.km) > 0 ? Number(t.km) : 0; ms += duracaoMs(t); viagens += Number(t.viagens) > 0 ? Number(t.viagens) : 0;
    if (ganhoDoTurno(t) > 0 || Number(t.km) > 0) dias.add(isoLocal(t.ini));
  }
  const apps = Object.entries(porApp).map(([k, ganho]) => ({ app: k, nome: nomes[k] || k, ganho, viagens: viagensApp[k] || 0 })).sort((a, b) => b.ganho - a.ganho);
  const linhas = linhasDoAno({ lancamentos: st?.lancamentos || [], fixos: st?.fixos || [] }, ano, fim);
  const gastos = Object.fromEntries(GRUPOS_CARRO.map(([k]) => [k, 0])), itensCarro = [];
  let particular = 0, nRecibos = 0;
  for (const x of linhas) {
    if (ehCorridaParticular(x)) { particular = r2(particular + x.valor); nRecibos++; meses[idx(x.data)].particular = r2(meses[idx(x.data)].particular + x.valor); continue; }
    const g = grupoDoCarro(x);
    if (g && x.valor > 0) { gastos[g] = r2(gastos[g] + x.valor); meses[idx(x.data)].carro = r2(meses[idx(x.data)].carro + x.valor); if (g === "comb") meses[idx(x.data)].comb = r2((meses[idx(x.data)].comb || 0) + x.valor); itensCarro.push({ ...x, grupo: g }); }
  }
  const ganhoApps = r2(apps.reduce((s, a) => s + a.ganho, 0)), ganho = r2(ganhoApps + particular);
  const gastoCarro = r2(Object.values(gastos).reduce((s, v) => s + v, 0));
  return {
    ano, ate: fim, apps, ganhoApps, particular, nRecibos, ganho, gastos, gastoCarro, resultado: r2(ganho - gastoCarro),
    km: r2(km), horas: Math.round(ms / 3600000), dias: dias.size, viagens, semGanho,
    meses: meses.map((x) => ({ ...x, km: x.km || 0, comb: x.comb || 0, ganho: r2(x.apps + x.particular) })), itensCarro,
    temDados: ganho > 0 || gastoCarro > 0 || km > 0,
  };
}

/** Km rodados num mês a partir dos quais faltar combustível lançado chama atenção. */
export const KM_SEM_COMBUSTIVEL = 300;
const MESES_EXT = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const listaE = (a) => (a.length <= 1 ? a.join("") : `${a.slice(0, -1).join(", ")} e ${a[a.length - 1]}`);
/**
 * O que parece faltar antes de mandar o resumo ao contador. Cada aviso: { t: texto, onde: "jornada" | "lancar" }.
 *  · jornadas encerradas sem ganho lançado (o ganho do dia não entrou);
 *  · meses em que rodou bastante e não lançou combustível (o gasto do carro está menor do que foi).
 */
export function avisosDoResumo(r) {
  const av = [];
  if (r.semGanho > 0) av.push({ t: `${r.semGanho === 1 ? "1 jornada está" : `${r.semGanho} jornadas estão`} sem os ganhos lançados. Sem eles, o total de ganhos fica menor.`, onde: "jornada" });
  const semComb = r.meses.filter((m) => m.km >= KM_SEM_COMBUSTIVEL && !(m.comb > 0)).map((m) => MESES_EXT[Number(m.m.slice(5)) - 1]);
  if (semComb.length) av.push({ t: `Você rodou em ${listaE(semComb)}, mas não há combustível lançado ${semComb.length === 1 ? "nesse mês" : "nesses meses"}. O gasto do carro pode estar menor do que foi.`, onde: "lancar" });
  return av;
}

const larg = (s, n, dir = false) => { s = String(s ?? ""); if (s.length > n) s = s.slice(0, n - 1) + "."; return dir ? s.padStart(n) : s.padEnd(n); };
const dataBr = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const kmBr = (n) => Math.round(n).toLocaleString("pt-BR");

/** O resumo em linhas de largura fixa, para o PDF (fonte monoespaçada). d: { nome, doc, carro, placa, hoje }. */
export function linhasDoResumoAnual(r, brl, d = {}) {
  const L = [], par = (a, b, bold = false) => L.push({ t: larg(a, 46) + larg(brl(b), 18, true), b: bold });
  L.push({ t: `Resumo do ano de ${r.ano} - motorista de aplicativo`, b: true });
  if (d.nome) L.push({ t: `${d.nome}${d.doc ? ` - ${d.doc}` : ""}` });
  if (d.carro || d.placa) L.push({ t: `Veículo: ${[d.carro, d.placa].filter(Boolean).join(" - ")}` });
  L.push({ t: `Período: 01/01/${r.ano} a ${dataBr(r.ate)}${d.hoje ? ` · gerado em ${dataBr(d.hoje)}` : ""}` }, { t: "" });
  L.push({ t: "1. Ganhos", b: true });
  r.apps.forEach((a) => par(`${a.nome}${a.viagens ? ` (${a.viagens} viagens)` : ""}`, a.ganho));
  if (r.particular) par(`Corridas particulares (${r.nRecibos} ${r.nRecibos === 1 ? "recibo" : "recibos"})`, r.particular);
  par("Total de ganhos", r.ganho, true); L.push({ t: "" });
  L.push({ t: "2. Gastos com o veículo", b: true });
  GRUPOS_CARRO.forEach(([k, n]) => { if (r.gastos[k]) par(n, r.gastos[k]); });
  par("Total de gastos com o veículo", r.gastoCarro, true); L.push({ t: "" });
  par("3. Ganhos menos gastos com o veículo", r.resultado, true); L.push({ t: "" });
  L.push({ t: "4. Trabalho", b: true });
  L.push({ t: `${r.dias} dias rodados · ${r.horas} horas · ${kmBr(r.km)} km${r.viagens ? ` · ${r.viagens} viagens` : ""}` }, { t: "" });
  L.push({ t: "5. Mês a mês", b: true }, { t: larg("Mês", 8) + larg("Ganhos", 18, true) + larg("Gastos veículo", 18, true) + larg("Diferença", 18, true) });
  r.meses.filter((m) => m.ganho || m.carro).forEach((m) => L.push({ t: larg(MESES_A[Number(m.m.slice(5)) - 1], 8) + larg(brl(m.ganho), 18, true) + larg(brl(m.carro), 18, true) + larg(brl(r2(m.ganho - m.carro)), 18, true) }));
  L.push({ t: "" });
  if (r.itensCarro.length) {
    L.push({ t: `6. Gastos com o veículo, um por um (${r.itensCarro.length})`, b: true });
    r.itensCarro.forEach((x) => L.push({ t: larg(dataBr(x.data), 11) + larg(x.descricao || x.categoria, 36) + larg(brl(x.valor), 17, true) }));
    L.push({ t: "" });
  }
  L.push({ t: "Feito com o Meus Gastos a partir do que foi registrado no app." }, { t: "Não é declaração de imposto. Confira os valores com o seu contador." });
  return L;
}

/** O mesmo resumo em texto curto, para o WhatsApp do contador (negrito com *). */
export function textoDoResumoAnual(r, brl, d = {}) {
  const l = [`*Resumo do ano de ${r.ano} - motorista de aplicativo*`];
  if (d.nome) l.push(`${d.nome}${d.doc ? ` (${d.doc})` : ""}`);
  l.push(`Período: 01/01/${r.ano} a ${dataBr(r.ate)}`, "", "*Ganhos*");
  r.apps.forEach((a) => l.push(`• ${a.nome}: ${brl(a.ganho)}`));
  if (r.particular) l.push(`• Corridas particulares (${r.nRecibos} ${r.nRecibos === 1 ? "recibo" : "recibos"}): ${brl(r.particular)}`);
  l.push(`*Total: ${brl(r.ganho)}*`, "", "*Gastos com o veículo*");
  GRUPOS_CARRO.forEach(([k, n]) => { if (r.gastos[k]) l.push(`• ${n}: ${brl(r.gastos[k])}`); });
  l.push(`*Total: ${brl(r.gastoCarro)}*`, "", `*Ganhos menos gastos com o veículo: ${brl(r.resultado)}*`, "",
    `${r.dias} dias rodados, ${r.horas} horas, ${kmBr(r.km)} km.`, "", "_Feito com o Meus Gastos. Não é declaração de imposto._");
  return l.join("\n");
}

/** Planilha (CSV com ponto e vírgula, abre direto no Excel) com cada ganho e cada gasto do veículo do ano. */
export function csvDoResumoAnual(r) {
  const num = (v) => r2(v).toFixed(2).replace(".", ","), cel = (s) => { s = String(s ?? ""); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const L = [["Parte", "Item", "Data", "Valor"].join(";")];
  r.apps.forEach((a) => L.push(["Ganhos", a.nome, "", num(a.ganho)].map(cel).join(";")));
  if (r.particular) L.push(["Ganhos", `Corridas particulares (${r.nRecibos})`, "", num(r.particular)].map(cel).join(";"));
  L.push(["Ganhos", "Total", "", num(r.ganho)].map(cel).join(";"));
  r.itensCarro.forEach((x) => L.push(["Gasto do veículo", `${GRUPOS_CARRO.find(([k]) => k === x.grupo)[1]}: ${x.descricao || x.categoria}`, dataBr(x.data), num(x.valor)].map(cel).join(";")));
  L.push(["Gasto do veículo", "Total", "", num(r.gastoCarro)].map(cel).join(";"));
  L.push(["Resultado", "Ganhos menos gastos com o veículo", "", num(r.resultado)].map(cel).join(";"));
  return "﻿" + L.join("\r\n") + "\r\n";
}

/**
 * A tela. app: { $, esc, brl, toast, hoje, dados() -> {st, turnos}, meus() -> {nome, doc, carro, placa}, voltar(), baixa(nome, blob), lancar(), ganhos(), uso() }.
 * Abre no ano passado entre janeiro e maio (época do Imposto de Renda) e no ano atual no resto do ano.
 */
export function criaResumoAnual(app) {
  const { $, esc, brl, toast, hoje } = app;
  let ano = null;
  function tela(host) {
    const h = hoje(), anoHoje = Number(h.slice(0, 4));
    if (!ano) ano = Number(h.slice(5, 7)) <= 5 ? anoHoje - 1 : anoHoje;
    const { st, turnos } = app.dados(), r = resumoAnualDoMotorista({ st, turnos, ano, ate: h }), d = { ...(app.meus() || {}), hoje: h }, av = avisosDoResumo(r);
    const lin = (a, b, cls = "") => `<li class="${cls}"><span>${a}</span><b>${b}</b></li>`;
    const anos = [anoHoje - 1, anoHoje];
    host.innerHTML = `<div id="motRoot" class="rc an">
      <button class="mot-voltar" type="button" id="anVolta"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>Voltar</button>
      <p class="hint">Tudo o que você ganhou e gastou com o carro no ano, organizado para o Imposto de Renda, o MEI ou o contador.</p>
      <div class="an-anos" role="group" aria-label="Ano">${anos.map((a) => `<button type="button" class="chip" data-an-ano="${a}" aria-pressed="${a === ano}">${a}</button>`).join("")}</div>
      ${r.temDados ? `<div class="rc-previa an-previa" aria-live="polite">
        <div class="rc-topo"><small>Ganhos menos gastos com o veículo em ${ano}${ano === anoHoje ? " (até hoje)" : ""}</small><b>${brl(r.resultado)}</b><span>${r.dias} dias rodados · ${r.horas} horas · ${kmBr(r.km)} km</span></div>
        <h3 class="an-h">Ganhos</h3>
        <ul class="rc-linhas">${r.apps.map((a) => lin(esc(a.nome), brl(a.ganho))).join("")}${r.particular ? lin(`Corridas particulares <small>${r.nRecibos} ${r.nRecibos === 1 ? "recibo" : "recibos"}</small>`, brl(r.particular)) : ""}${lin("Total de ganhos", brl(r.ganho), "tot")}</ul>
        <h3 class="an-h">Gastos com o veículo</h3>
        <ul class="rc-linhas">${GRUPOS_CARRO.filter(([k]) => r.gastos[k]).map(([k, n]) => { const it = r.itensCarro.filter((x) => x.grupo === k);
          return `<li class="an-grupo"><details><summary><span>${n} <small>${it.length} ${it.length === 1 ? "gasto" : "gastos"}</small></span><b>${brl(r.gastos[k])}</b></summary>
            <ul>${it.slice(-40).reverse().map((x) => `<li><span>${dataBr(x.data).slice(0, 5)} · ${esc(x.descricao || x.categoria)}</span><b>${brl(x.valor)}</b></li>`).join("")}${it.length > 40 ? `<li><span>e mais ${it.length - 40} no PDF</span></li>` : ""}</ul></details></li>`; }).join("") || lin("Nenhum gasto do carro lançado", brl(0))}${lin("Total de gastos", brl(r.gastoCarro), "tot")}</ul>
      </div>
      ${av.length ? `<section class="rc-bloco an-confira" aria-label="Confira antes de mandar"><h3>Confira antes de mandar</h3><ul>${av.map((a) => `<li><p>${a.t}</p><button class="btn sm" type="button" data-an-ir="${a.onde}">${a.onde === "jornada" ? "Lançar os ganhos" : "Lançar combustível"}</button></li>`).join("")}</ul></section>` : ""}
      <details class="rc-bloco an-meses"><summary>Mês a mês</summary><ul class="rc-linhas">${r.meses.filter((m) => m.ganho || m.carro).map((m) => `<li><span>${MESES_A[Number(m.m.slice(5)) - 1]}<small>ganhou ${brl(m.ganho)} · carro ${brl(m.carro)}</small></span><b>${brl(r2(m.ganho - m.carro))}</b></li>`).join("")}</ul></details>
      <div class="rc-bts"><button class="btn primary" type="button" id="anPdf">Baixar PDF para o contador</button><button class="btn" type="button" id="anWhats">Mandar no WhatsApp</button><button class="btn" type="button" id="anCsv">Baixar planilha (Excel)</button></div>
      <details class="rc-bloco an-como"><summary>Como esse resumo é feito</summary><ul>
        <li>Os ganhos de cada app vêm das suas jornadas. As corridas particulares vêm dos recibos que você lançou como ganho.</li>
        <li>Os gastos com o veículo são os lançamentos e as contas fixas com combustível, pedágio, oficina, IPVA, seguro e parecidos. Gasto de "Transporte" sozinho não entra, porque pode ser um ônibus seu.</li>
        <li>Faltou alguma coisa? Lance o gasto com a data certa e ele entra aqui na hora.</li>
        <li>Não é declaração de imposto. Leve o PDF para o seu contador conferir.</li></ul></details>`
      : `<div class="rc-bloco an-vazio"><b>Ainda não há nada de ${ano} para resumir.</b><p class="hint">Use a Jornada para registrar os ganhos de cada app e lance os gastos do carro. Eles aparecem aqui, já organizados.</p></div>`}
    </div>`;
    $("anVolta").onclick = () => app.voltar();
    host.querySelectorAll("[data-an-ano]").forEach((b) => (b.onclick = () => { ano = Number(b.dataset.anAno); tela(host); }));
    if (!r.temDados) return;
    host.querySelectorAll("[data-an-ir]").forEach((b) => (b.onclick = () => (b.dataset.anIr === "jornada" ? (app.ganhos || app.voltar)() : app.lancar?.())));
    $("anPdf").onclick = () => { app.baixa(`resumo-motorista-${ano}.pdf`, new Blob([pdfDeLinhas(linhasDoResumoAnual(r, brl, d))], { type: "application/pdf" })); toast("PDF baixado. Ele está na pasta de downloads."); app.uso?.(); };
    $("anCsv").onclick = () => { app.baixa(`resumo-motorista-${ano}.csv`, new Blob([csvDoResumoAnual(r)], { type: "text/csv;charset=utf-8" })); toast("Planilha baixada."); app.uso?.(); };
    $("anWhats").onclick = () => { window.open(`https://wa.me/?text=${encodeURIComponent(textoDoResumoAnual(r, brl, d))}`, "_blank", "noopener"); app.uso?.(); };
  }
  return { tela };
}
