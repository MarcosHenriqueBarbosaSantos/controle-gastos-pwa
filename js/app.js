// Tela do app: entrada, lançamento rápido, indicadores, gráficos e abas.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { CATS, FORMAS, MESES, MES3, pad, toISO, mKey, addM, parseMoney, round2, calcMes, catMap, custoAcumulado } from "./calc.js";
import { createSupabaseStore, createLocalStore, demoSeed } from "./store.js";
import { parseWorkbook, buildWorkbook, importKey, norm } from "./excel.js";

const $ = (id) => document.getElementById(id);
const NS = "http://www.w3.org/2000/svg";
const brl = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const brl0 = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
const sgn = (v) => (v < 0 ? "− " : "") + brl(Math.abs(v));
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ddmm = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const hoje = () => toISO(new Date());
const nomeMes = (m) => MESES[Number(m.slice(5)) - 1];

const S = {
  mes: mKey(hoje()), tipo: "Despesa", tab: "l",
  data: { lancamentos: [], fixos: [], pagos: [], faturas: [] },
  store: null, client: null, loaded: false,
};

/* ================= inicialização e login ================= */
const configured = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase);

async function boot() {
  if (!configured()) {
    $("authForm").hidden = true;
    $("authMsg").textContent = "Login ainda não configurado neste endereço. Você pode testar tudo na demonstração.";
  } else {
    S.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    // O setTimeout evita chamar o Supabase de dentro do próprio callback (recomendação da biblioteca).
    S.client.auth.onAuthStateChange((ev, session) => setTimeout(() => {
      if (ev === "PASSWORD_RECOVERY") pedirNovaSenha();
      if (session) { if (S.store?.kind !== "supabase") startApp(createSupabaseStore(S.client), session.user.email); }
      else if (ev === "INITIAL_SESSION" || S.store?.kind === "supabase") semSessao();
    }, 0));
    return;
  }
  semSessao();
}
function semSessao() {
  let demo = false; try { demo = localStorage.getItem("cg-modo") === "demo"; } catch { /* sem armazenamento */ }
  if (demo) startDemo(); else showAuth();
}

function showAuth() {
  S.store = null; $("app").hidden = true; $("auth").hidden = false;
}
function authMsg(t, kind = "") { const m = $("authMsg"); m.textContent = t; m.className = "auth-msg " + kind; }
const traduzErro = (e) => {
  const m = String(e?.message || e || "");
  if (/invalid login/i.test(m)) return "E-mail ou senha incorretos.";
  if (/already registered/i.test(m)) return "Esse e-mail já tem conta. Use Entrar.";
  if (/email not confirmed/i.test(m)) return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
  if (/password/i.test(m) && /6/.test(m)) return "A senha precisa ter pelo menos 6 caracteres.";
  if (/fetch|network/i.test(m)) return "Sem conexão com a internet. Tente de novo.";
  return "Não deu certo: " + m;
};

$("authForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  authMsg("Entrando…");
  const { error } = await S.client.auth.signInWithPassword({ email: $("aEmail").value.trim(), password: $("aSenha").value });
  if (error) authMsg(traduzErro(error), "err");
});
$("aCriar").addEventListener("click", async () => {
  if (!$("authForm").reportValidity()) return;
  authMsg("Criando sua conta…");
  const { data, error } = await S.client.auth.signUp({
    email: $("aEmail").value.trim(), password: $("aSenha").value,
    options: { emailRedirectTo: location.origin + location.pathname },
  });
  if (error) return authMsg(traduzErro(error), "err");
  if (!data.session) authMsg("Conta criada. Abra o e-mail de confirmação que enviamos e depois volte para entrar.", "ok");
});
$("aEsqueci").addEventListener("click", async () => {
  const email = $("aEmail").value.trim();
  if (!email) { $("aEmail").focus(); return authMsg("Digite seu e-mail acima para receber o link de nova senha."); }
  const { error } = await S.client.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
  authMsg(error ? traduzErro(error) : "Enviamos um link para criar uma nova senha no seu e-mail.", error ? "err" : "ok");
});
$("aDemo").addEventListener("click", startDemo);
$("btnSair").addEventListener("click", async () => {
  if (S.store?.kind === "supabase") { await S.client.auth.signOut(); }
  else { try { localStorage.removeItem("cg-modo"); } catch { /* nada */ } showAuth(); }
});

function pedirNovaSenha() {
  openDlg(`<h3>Criar nova senha</h3><form id="novaSenha" style="display:grid;gap:12px">
    <label class="f">Nova senha<input class="in" id="ns1" type="password" minlength="6" required autocomplete="new-password"></label>
    <div class="actions"><button class="btn primary" type="submit">Salvar senha</button></div><p class="auth-msg" id="nsMsg"></p></form>`);
  $("novaSenha").addEventListener("submit", async (e) => {
    e.preventDefault();
    const { error } = await S.client.auth.updateUser({ password: $("ns1").value });
    if (error) { $("nsMsg").textContent = traduzErro(error); return; }
    $("dlg").close();
  });
}

function startDemo() {
  try { localStorage.setItem("cg-modo", "demo"); } catch { /* nada */ }
  const store = createLocalStore("cg-demo-v1", demoSeed(hoje()));
  startApp(store, "Demonstração");
  showBanner(`Modo demonstração: dados de exemplo guardados só neste aparelho.`, [["Recomeçar exemplo", () => { store.reset(); startDemo(); }]]);
}

async function startApp(store, quem) {
  S.store = store; S.loaded = false;
  $("auth").hidden = true; $("app").hidden = false;
  $("whoName").textContent = quem;
  $("btnSair").textContent = store.kind === "supabase" ? "Sair" : "Sair da demonstração";
  showBanner("");
  render();
  try { S.data = await store.loadAll(); S.loaded = true; render(); }
  catch (e) { showBanner("Não foi possível carregar seus dados. Confira a internet e recarregue a página."); }
}

function showBanner(t, acoes = []) {
  const b = $("banner"); b.hidden = !t; b.innerHTML = "";
  if (!t) return;
  const s = document.createElement("span"); s.textContent = t; b.appendChild(s);
  acoes.forEach(([rot, fn]) => { const x = document.createElement("button"); x.className = "link"; x.type = "button"; x.textContent = rot; x.onclick = fn; b.appendChild(x); });
}

/** Executa uma gravação e mostra erro amigável se falhar. */
async function grava(fn) {
  try { await fn(); return true; }
  catch (e) {
    console.error(e);
    showBanner(/fetch|network/i.test(String(e?.message)) ? "Sem internet: o último lançamento não foi salvo. Tente de novo quando a conexão voltar."
      : "Não foi possível salvar. Recarregue a página e tente de novo.");
    return false;
  }
}

/* ================= render ================= */
function render() {
  const [y, mo] = S.mes.split("-").map(Number);
  $("mesTitulo").textContent = `${MESES[mo - 1]} ${y}`;
  $("hoje").hidden = S.mes === mKey(hoje());
  const c = calcMes(S.data, S.mes, hoje());
  renderForm(); renderKpis(c); renderCusto(c); renderCat(c); renderTabs(c);
}

function renderForm() {
  document.querySelectorAll("#tipoSeg button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.t === S.tipo));
  const sel = $("fCat");
  if (sel.dataset.t !== S.tipo) { sel.innerHTML = CATS[S.tipo].map((c) => `<option>${esc(c)}</option>`).join(""); sel.dataset.t = S.tipo; }
  const fs = $("fForma"); if (!fs.options.length) fs.innerHTML = FORMAS.map((c) => `<option>${esc(c)}</option>`).join("");
  $("fFormaWrap").style.visibility = S.tipo === "Despesa" ? "visible" : "hidden";
  const fd = $("fData"); if (!fd.value || mKey(fd.value) !== S.mes) fd.value = mKey(hoje()) === S.mes ? hoje() : S.mes + "-01";
  $("fOk").textContent = S.tipo === "Despesa" ? "Lançar gasto" : S.tipo === "Receita" ? "Lançar entrada" : "Guardar";
}

function renderKpis(c) {
  const saldoPill = c.saldo < 0 ? `<span class="pill bad">● No vermelho</span>` : `<span class="pill good">● No azul</span>`;
  const projTxt = c.fase === "atual" ? `No ritmo atual: <b>${brl0(c.proj)}</b>` : c.fase === "passado" ? "Mês fechado" : "Só os fixos previstos";
  $("kpis").innerHTML = `
   <div class="kpi hero"><span class="l">Custo do mês</span><span class="v">${brl(c.custo)}</span><span class="n">${projTxt}</span></div>
   <div class="kpi"><span class="l">Entradas</span><span class="v">${brl(c.rec)}</span><span class="n">${c.res ? `${brl(c.res)} guardado na reserva` : "Salário e outras entradas"}</span></div>
   <div class="kpi"><span class="l">Saldo</span><span class="v" style="color:${c.saldo < 0 ? "var(--bad)" : "var(--good)"}">${sgn(c.saldo)}</span>${saldoPill}</div>
   <div class="kpi"><span class="l">Gastos fixos</span><span class="v">${brl(c.fxT)}</span>${c.fxPend ? `<span class="pill warn">${brl0(c.fxPend)} a pagar</span>` : (c.fx.length ? `<span class="pill good">✓ Todos pagos</span>` : `<span class="n">Nenhum cadastrado</span>`)}</div>
   <div class="kpi"><span class="l">Cartão a pagar</span><span class="v">${brl(c.ccAberto)}</span><span class="n">${c.comprasCartao ? `${brl0(c.comprasCartao)} em compras no mês` : "Faturas em aberto"}</span></div>`;
  let t = "";
  if (!S.loaded) t = "Carregando seus lançamentos…";
  else if (!c.it.length && !c.fx.length) t = "Nenhum lançamento neste mês ainda. Use o formulário acima ou importe sua planilha do Excel.";
  else if (c.fase === "atual") {
    const med = c.dias ? c.vari / c.dias : 0;
    t = `Em ${c.dias} ${c.dias === 1 ? "dia" : "dias"} você gastou <strong>${brl(c.vari)}</strong> no dia a dia, média de ${brl(med)} por dia. Somando os fixos, <strong>o mês deve fechar com custo de ${brl0(c.proj)}</strong>${c.rec ? ` e saldo de ${sgn(round2(c.rec - c.proj - c.res))}` : ""}.`;
  } else if (c.fase === "passado") {
    const top = catMap(c)[0];
    t = `O mês fechou com custo de <strong>${brl(c.custo)}</strong>${top ? `. A maior categoria foi <strong>${esc(top[0])}</strong> (${brl0(top[1])}, ${Math.round((top[1] / c.custo) * 100)}% do custo)` : ""}.`;
  } else t = `Mês futuro: por enquanto aparecem só os gastos fixos previstos (${brl(c.fxT)}).`;
  $("insight").innerHTML = t;
}

const el = (t, a = {}, p) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); p && p.appendChild(e); return e; };
function niceStep(raw) { if (raw <= 0) return 100; const p = Math.pow(10, Math.floor(Math.log10(raw))); const f = raw / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; }

function renderCusto(c) {
  const host = $("chCusto"); host.innerHTML = "";
  const n = c.n, { cum, det } = custoAcumulado(c);
  const lastDay = c.fase === "atual" ? c.dias : c.fase === "passado" ? n : 0;
  $("lgProj").hidden = c.fase !== "atual";
  const W = Math.max(300, host.clientWidth || 640), H = 240, m = { l: 62, r: 18, t: 14, b: 26 };
  const maxV = Math.max(c.rec, c.fase === "atual" ? c.proj : 0, cum[n], 100) * 1.1;
  const step = niceStep(maxV / 4), hi = Math.ceil(maxV / step) * step;
  const x = (d) => m.l + ((d - 1) / (n - 1)) * (W - m.l - m.r), y = (v) => m.t + ((hi - v) / hi) * (H - m.t - m.b);
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", height: H, role: "img", "aria-label": "Custo acumulado no mês" }, host);
  for (let v = 0; v <= hi + 1e-6; v += step) {
    el("line", { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), stroke: v === 0 ? "var(--axis)" : "var(--grid)", "stroke-width": 1 }, svg);
    const t = el("text", { x: m.l - 8, y: y(v) + 4, "text-anchor": "end", "font-size": 11, fill: "var(--muted)" }, svg);
    t.textContent = v >= 1000 ? (v / 1000).toLocaleString("pt-BR") + " mil" : brl0(v);
  }
  (W < 520 ? [1, 10, 20, n] : [1, 5, 10, 15, 20, 25, n]).forEach((d) => {
    const t = el("text", { x: x(d), y: H - 7, "text-anchor": "middle", "font-size": 11, fill: "var(--muted)" }, svg);
    t.textContent = pad(d) + "/" + S.mes.slice(5);
  });
  if (c.rec > 0) {
    el("line", { x1: m.l, x2: W - m.r, y1: y(c.rec), y2: y(c.rec), stroke: "var(--ink-2)", "stroke-width": 1.5 }, svg);
    const t = el("text", { x: m.l + 6, y: y(c.rec) - 6, "font-size": 11, fill: "var(--ink-2)", "font-weight": 600 }, svg);
    t.textContent = "Entradas " + brl0(c.rec);
  }
  const endD = c.fase === "futuro" ? n : lastDay;
  if (endD >= 1) {
    let p = `M${x(1)},${y(cum[1])}`; for (let d = 2; d <= endD; d++) p += ` L${x(d)},${y(cum[d])}`;
    el("path", { d: p + ` L${x(endD)},${y(0)} L${x(1)},${y(0)} Z`, fill: "var(--series-soft)" }, svg);
    el("path", { d: p, fill: "none", stroke: "var(--series)", "stroke-width": 2, "stroke-linejoin": "round", "stroke-dasharray": c.fase === "futuro" ? "5 4" : "none" }, svg);
    el("circle", { cx: x(endD), cy: y(cum[endD]), r: 4.5, fill: "var(--series)", stroke: "var(--surface)", "stroke-width": 2 }, svg);
  }
  if (c.fase === "atual" && lastDay < n) {
    el("path", { d: `M${x(lastDay)},${y(cum[lastDay])} L${x(n)},${y(c.proj)}`, stroke: "var(--series)", "stroke-width": 2, "stroke-dasharray": "5 4", fill: "none" }, svg);
    const perto = c.rec > 0 && Math.abs(y(c.proj) - y(c.rec)) < 18;
    const t = el("text", { x: x(n), y: y(c.proj) + (perto ? 18 : -8), "text-anchor": "end", "font-size": 12, "font-weight": 600, fill: "var(--ink)" }, svg); t.textContent = brl0(c.proj);
  } else if (endD >= 1) {
    const t = el("text", { x: x(endD) - 6, y: y(cum[endD]) - 9, "text-anchor": "end", "font-size": 12, "font-weight": 600, fill: "var(--ink)" }, svg); t.textContent = brl0(cum[endD]);
  }
  const tip = document.createElement("div"); tip.className = "tip"; tip.hidden = true; host.appendChild(tip);
  const cross = el("line", { y1: m.t, y2: H - m.b, stroke: "var(--axis)", "stroke-dasharray": "3 3", visibility: "hidden" }, svg);
  const hit = el("rect", { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: "transparent" }, svg);
  hit.addEventListener("pointermove", (ev) => {
    const b = svg.getBoundingClientRect(), px = ((ev.clientX - b.left) * W) / b.width;
    const d = Math.max(1, Math.min(n, Math.round(((px - m.l) / (W - m.l - m.r)) * (n - 1) + 1)));
    cross.setAttribute("x1", x(d)); cross.setAttribute("x2", x(d)); cross.setAttribute("visibility", "visible");
    const futuro = c.fase === "atual" && d > lastDay;
    tip.innerHTML = `<b>${pad(d)}/${S.mes.slice(5)} · ${futuro ? "ainda não chegou" : "acumulado " + brl0(cum[d])}</b>` +
      (det[d].length ? det[d].map(([a, v]) => `<div class="r"><span>${esc(a)}</span><span>${brl0(v)}</span></div>`).join("") : `<div class="r"><span>Sem gastos neste dia</span></div>`);
    tip.hidden = false;
    const sx = (x(d) * b.width) / W; let left = sx + 12; if (left + tip.offsetWidth > b.width) left = sx - 12 - tip.offsetWidth;
    tip.style.left = Math.max(0, left) + "px"; tip.style.top = "10px";
  });
  hit.addEventListener("pointerleave", () => { tip.hidden = true; cross.setAttribute("visibility", "hidden"); });
}

function renderCat(c) {
  const host = $("chCat"); host.innerHTML = "";
  const cats = catMap(c), tot = cats.reduce((s, x) => s + x[1], 0);
  if (!cats.length) { host.innerHTML = `<div class="empty">As categorias aparecem aqui assim que você lançar um gasto.</div>`; return; }
  const W = Math.max(260, host.clientWidth || 400), rowH = 34, H = cats.length * rowH, labW = Math.min(150, W * 0.36), valW = 112, bw = W - labW - valW, max = cats[0][1];
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", height: H, role: "img", "aria-label": "Gastos por categoria" }, host);
  cats.forEach(([k, v], i) => {
    const yy = i * rowH + 6, h = 20, w = Math.max(4, (v / max) * bw);
    const mc = Math.floor((labW - 8) / 7);
    const t = el("text", { x: 0, y: yy + 14, "font-size": 12.5, fill: "var(--ink)" }, svg); t.textContent = k.length > mc ? k.slice(0, mc - 1) + "…" : k;
    el("path", { d: `M${labW},${yy} H${labW + w - 4} q4,0 4,4 V${yy + h - 4} q0,4 -4,4 H${labW} Z`, fill: "var(--series)" }, svg);
    const vt = el("text", { x: labW + w + 8, y: yy + 14, "font-size": 12, fill: "var(--ink-2)", "font-family": "IBM Plex Mono, monospace" }, svg);
    vt.textContent = `${brl0(v)} · ${Math.round((v / tot) * 100)}%`;
  });
}

/* ================= abas ================= */
function renderTabs(c) {
  document.querySelectorAll(".tabs button").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === S.tab));
  ["l", "f", "c"].forEach((k) => ($("pane-" + k).hidden = S.tab !== k));
  if (S.tab === "l") paneL(c); else if (S.tab === "f") paneF(c); else paneC(c);
}
function armDelete(b, fn) {
  b.addEventListener("click", () => {
    if (b.classList.contains("arm")) return fn();
    const orig = b.innerHTML; b.classList.add("arm"); b.textContent = "Confirmar";
    setTimeout(() => { if (b.isConnected) { b.classList.remove("arm"); b.innerHTML = orig; } }, 3000);
  });
}

function paneL(c) {
  const it = [...c.it].sort((a, b) => b.data.localeCompare(a.data) || String(b.created_at || "").localeCompare(String(a.created_at || "")));
  if (!it.length) {
    $("pane-l").innerHTML = `<div class="welcome"><p><b>Nenhum lançamento em ${nomeMes(S.mes)}.</b> Anote cada gasto no formulário lá em cima assim que ele acontecer. O custo do mês e a projeção se atualizam na hora.</p><p>Já tem uma planilha? Use <b>Importar Excel</b> para trazer os lançamentos dela.</p></div>`;
    return;
  }
  $("pane-l").innerHTML = `<div class="tbl"><table><thead><tr><th>Dia</th><th>Descrição</th><th class="hide-sm">Categoria</th><th class="hide-sm">Pagamento</th><th class="num">Valor</th><th></th></tr></thead><tbody>${
    it.map((x) => `<tr><td class="d">${ddmm(x.data)}</td><td>${esc(x.descricao || x.categoria)}</td><td class="hide-sm"><span class="tag">${esc(x.categoria)}</span></td>
      <td class="hide-sm" style="color:var(--ink-2);font-size:13px">${x.tipo === "Despesa" ? esc(x.forma || "—") : x.tipo === "Receita" ? "Entrada" : "Reserva"}</td>
      <td class="num ${x.tipo === "Receita" ? "pos" : x.tipo === "Reserva" ? "res" : ""}">${x.tipo === "Receita" ? "+ " : x.tipo === "Reserva" ? "→ " : "− "}${brl(x.valor)}</td>
      <td style="text-align:right"><button class="del" type="button" data-del="${esc(x.id)}" aria-label="Excluir"><span class="hide-sm">Excluir</span><span class="show-sm">✕</span></button></td></tr>`).join("")}</tbody></table></div>`;
  $("pane-l").querySelectorAll("[data-del]").forEach((b) => armDelete(b, async () => {
    const id = b.dataset.del;
    if (await grava(() => S.store.deleteLancamento(id))) { S.data.lancamentos = S.data.lancamentos.filter((x) => x.id !== id); render(); }
  }));
}

function paneF(c) {
  const fx = c.fx.slice().sort((a, b) => (a.dia || 0) - (b.dia || 0));
  const rows = fx.map((f) => {
    const p = c.pagosSet.has(f.id);
    return `<tr><td class="d">dia ${pad(f.dia || 1)}</td><td>${esc(f.descricao)}</td><td class="hide-sm"><span class="tag">${esc(f.categoria)}</span></td><td class="num">${brl(f.valor)}</td>
      <td><button type="button" class="chk ${p ? "on" : "off"}" data-pago="${esc(f.id)}" data-v="${p ? 0 : 1}">${p ? "✓ Pago" : "○ A pagar"}</button></td>
      <td style="text-align:right;white-space:nowrap"><button class="del" type="button" data-end="${esc(f.id)}" title="Para de contar a partir deste mês">Encerrar</button></td></tr>`;
  }).join("");
  $("pane-f").innerHTML = `<p class="hint" style="margin-top:0">Cadastre uma vez as contas que se repetem todo mês. Elas entram no custo de cada mês sozinhas; é só marcar quando pagar.</p>
   ${fx.length ? `<div class="tbl"><table><thead><tr><th>Vence</th><th>Descrição</th><th class="hide-sm">Categoria</th><th class="num">Valor</th><th>${MES3[Number(S.mes.slice(5)) - 1]}</th><th></th></tr></thead><tbody>${rows}</tbody>
     <tfoot><tr><td></td><td style="font-weight:600">Total</td><td class="hide-sm"></td><td class="num" style="font-weight:600">${brl(c.fxT)}</td><td colspan="2"></td></tr></tfoot></table></div>`
     : `<div class="empty">Nenhum gasto fixo neste mês. Adicione aluguel, condomínio, internet, faculdade, parcelas…</div>`}
   <form class="addrow fx" id="formFx" autocomplete="off">
     <label class="f">Descrição<input class="in" id="xDesc" required maxlength="60" placeholder="Ex.: Condomínio"></label>
     <label class="f">Categoria<select class="in" id="xCat">${CATS.Despesa.map((k) => `<option${k === "Moradia" ? " selected" : ""}>${esc(k)}</option>`).join("")}</select></label>
     <label class="f">Dia venc.<input class="in" id="xDia" type="number" min="1" max="31" value="10" required></label>
     <label class="f">Valor (R$)<input class="in money" id="xVal" inputmode="decimal" placeholder="0,00" required></label>
     <label class="f">Pagamento<select class="in" id="xForma">${FORMAS.map((k) => `<option>${esc(k)}</option>`).join("")}</select></label>
     <button class="btn primary" type="submit">Adicionar fixo</button>
   </form>`;
  $("pane-f").querySelectorAll("[data-pago]").forEach((b) => b.addEventListener("click", async () => {
    const id = b.dataset.pago, pago = b.dataset.v === "1", mes = S.mes + "-01";
    b.disabled = true;
    if (await grava(() => S.store.setPago(id, mes, pago))) {
      S.data.pagos = S.data.pagos.filter((p) => !(p.fixo_id === id && mKey(p.mes) === S.mes));
      if (pago) S.data.pagos.push({ fixo_id: id, mes });
    }
    render();
  }));
  $("pane-f").querySelectorAll("[data-end]").forEach((b) => armDelete(b, async () => {
    const f = S.data.fixos.find((z) => z.id === b.dataset.end); if (!f) return;
    const ate = addM(S.mes, -1);
    if (ate < mKey(f.desde)) {
      if (await grava(() => S.store.deleteFixo(f.id))) S.data.fixos = S.data.fixos.filter((z) => z.id !== f.id);
    } else if (await grava(() => S.store.updateFixo(f.id, { ate: ate + "-01" }))) f.ate = ate + "-01";
    render();
  }));
  $("formFx").addEventListener("submit", async (e) => {
    e.preventDefault();
    const v = parseMoney($("xVal").value); if (!(v > 0)) { $("xVal").focus(); return; }
    const row = { descricao: $("xDesc").value.trim(), categoria: $("xCat").value, dia: Math.min(31, Math.max(1, Number($("xDia").value) || 1)),
      valor: round2(v), forma: $("xForma").value, desde: S.mes + "-01", ate: null };
    let novo; if (await grava(async () => { novo = await S.store.addFixo(row); })) { S.data.fixos.push(novo); render(); }
  });
}

function paneC(c) {
  const vis = S.data.faturas.filter((x) => x.status !== "Paga" || mKey(x.vencimento) === S.mes).sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  $("pane-c").innerHTML = `<p class="hint" style="margin-top:0">Anote o valor de cada fatura e quando vence. Aparecem as faturas em aberto e as pagas deste mês.</p>
   ${vis.length ? `<div class="tbl"><table><thead><tr><th>Vence</th><th>Cartão</th><th class="num">Fatura</th><th>Status</th><th></th></tr></thead><tbody>${
     vis.map((x) => `<tr><td class="d">${ddmm(x.vencimento)}/${x.vencimento.slice(2, 4)}</td><td>${esc(x.cartao)}</td><td class="num">${brl(x.valor)}</td>
       <td><button type="button" class="chk ${x.status === "Paga" ? "on" : "off"}" data-st="${esc(x.id)}">${x.status === "Paga" ? "✓ Paga" : "○ Em aberto"}</button></td>
       <td style="text-align:right"><button class="del" type="button" data-cdel="${esc(x.id)}" aria-label="Excluir"><span class="hide-sm">Excluir</span><span class="show-sm">✕</span></button></td></tr>`).join("")}</tbody>
     <tfoot><tr><td></td><td style="font-weight:600">Em aberto</td><td class="num" style="font-weight:600">${brl(c.ccAberto)}</td><td colspan="2"></td></tr></tfoot></table></div>`
     : `<div class="empty">Nenhuma fatura em aberto.</div>`}
   <form class="addrow cc" id="formCc" autocomplete="off">
     <label class="f">Cartão<input class="in" id="cNome" required maxlength="40" placeholder="Ex.: Nubank"></label>
     <label class="f">Vencimento<input class="in" id="cVenc" type="date" required value="${S.mes}-10"></label>
     <label class="f">Valor da fatura<input class="in money" id="cVal" inputmode="decimal" placeholder="0,00" required></label>
     <label class="f">Status<select class="in" id="cSt"><option>Aberta</option><option>Paga</option></select></label>
     <button class="btn primary" type="submit">Adicionar fatura</button>
   </form>`;
  $("pane-c").querySelectorAll("[data-st]").forEach((b) => b.addEventListener("click", async () => {
    const f = S.data.faturas.find((z) => z.id === b.dataset.st); const status = f.status === "Paga" ? "Aberta" : "Paga";
    b.disabled = true;
    if (await grava(() => S.store.updateFatura(f.id, { status }))) f.status = status;
    render();
  }));
  $("pane-c").querySelectorAll("[data-cdel]").forEach((b) => armDelete(b, async () => {
    const id = b.dataset.cdel;
    if (await grava(() => S.store.deleteFatura(id))) { S.data.faturas = S.data.faturas.filter((z) => z.id !== id); render(); }
  }));
  $("formCc").addEventListener("submit", async (e) => {
    e.preventDefault();
    const v = parseMoney($("cVal").value); if (!(v > 0)) { $("cVal").focus(); return; }
    const row = { cartao: $("cNome").value.trim(), vencimento: $("cVenc").value, valor: round2(v), status: $("cSt").value };
    let novo; if (await grava(async () => { novo = await S.store.addFatura(row); })) { S.data.faturas.push(novo); render(); }
  });
}

/* ================= lançamento rápido ================= */
$("tipoSeg").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; S.tipo = b.dataset.t; renderForm(); });
$("formLanc").addEventListener("submit", async (e) => {
  e.preventDefault();
  const flash = $("flash"), v = parseMoney($("fValor").value);
  if (!(v > 0)) { flash.style.color = "var(--bad)"; flash.textContent = "Digite um valor maior que zero, por exemplo 25,90."; $("fValor").focus(); return; }
  const data = $("fData").value || hoje();
  const row = { data, descricao: $("fDesc").value.trim(), tipo: S.tipo, categoria: $("fCat").value,
    forma: S.tipo === "Despesa" ? $("fForma").value : "", valor: round2(v), import_key: null };
  $("fOk").disabled = true;
  let novos;
  const ok = await grava(async () => { novos = await S.store.addLancamentos([row]); });
  $("fOk").disabled = false;
  if (!ok) return;
  S.data.lancamentos.push(...novos);
  flash.style.color = "var(--good)";
  flash.textContent = `Lançado: ${row.descricao || row.categoria} · ${brl(row.valor)} em ${ddmm(data)}${mKey(data) !== S.mes ? " (outro mês)" : ""}.`;
  $("fValor").value = ""; $("fDesc").value = ""; $("fValor").focus();
  render();
});
$("prev").onclick = () => { S.mes = addM(S.mes, -1); render(); };
$("next").onclick = () => { S.mes = addM(S.mes, 1); render(); };
$("hoje").onclick = () => { S.mes = mKey(hoje()); render(); };
document.querySelector(".tabs").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; S.tab = b.dataset.tab; render(); });
let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => !$("app").hidden && render(), 150); });

/* ================= Excel ================= */
$("btnImport").onclick = () => $("fileIn").click();
$("fileIn").addEventListener("change", async (e) => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  if (typeof XLSX === "undefined") return showBanner("Não foi possível abrir o leitor de Excel. Confira a internet e recarregue a página.");
  let res;
  try { res = parseWorkbook(XLSX, XLSX.read(await f.arrayBuffer(), { type: "array" })); }
  catch { return openDlg(`<h3>Não consegui ler esse arquivo</h3><p>Confira se é uma planilha .xlsx e tente de novo.</p><div class="actions"><button class="btn" data-close>Fechar</button></div>`); }
  const existentes = new Set(S.data.lancamentos.map((x) => x.import_key || importKey(x)));
  const novos = res.lancamentos.map((x) => ({ ...x, import_key: importKey(x) })).filter((x) => !existentes.has(x.import_key));
  const fxAtuais = new Set(S.data.fixos.map((z) => norm(z.descricao)));
  const fxNovos = res.fixos.filter((z) => !fxAtuais.has(norm(z.descricao)));
  const ccAtuais = new Set(S.data.faturas.map((z) => z.cartao + z.vencimento + z.valor));
  const ccNovos = res.faturas.filter((z) => !ccAtuais.has(z.cartao + z.vencimento + z.valor));
  const meses = [...new Set(novos.map((x) => mKey(x.data)))].sort();
  if (!novos.length && !fxNovos.length && !ccNovos.length) {
    return openDlg(`<h3>Nada novo para importar</h3><p>${res.lancamentos.length || res.fixos.length ? "Tudo o que está nessa planilha já foi lançado aqui." : "Não encontrei lançamentos nessa planilha. Ela precisa ter colunas de data, descrição e valor."}</p><div class="actions"><button class="btn" data-close>Fechar</button></div>`);
  }
  const plural = (n, s, p) => `${n} ${n > 1 ? p : s}`;
  openDlg(`<h3>Importar "${esc(f.name)}"</h3><p style="color:var(--ink-2);margin:0">Encontrei:</p><ul>
    ${novos.length ? `<li>${plural(novos.length, "lançamento", "lançamentos")} (${meses.map((m) => nomeMes(m) + "/" + m.slice(2, 4)).join(", ")})</li>` : ""}
    ${fxNovos.length ? `<li>${plural(fxNovos.length, "gasto fixo", "gastos fixos")}</li>` : ""}
    ${ccNovos.length ? `<li>${plural(ccNovos.length, "fatura de cartão", "faturas de cartão")}</li>` : ""}</ul>
    ${res.formato === "antigo" ? `<p class="hint">As categorias foram escolhidas pela descrição. Tudo entra como gasto do dia a dia; depois você pode cadastrar os fixos na aba Gastos fixos.</p>` : ""}
    <p class="hint">Lançamentos que já existem aqui são ignorados, então pode importar a mesma planilha de novo sem duplicar.</p>
    <div class="actions"><button class="btn primary" id="okImp">Importar</button><button class="btn" data-close>Cancelar</button></div>`);
  $("okImp").onclick = async () => {
    $("okImp").disabled = true; $("okImp").textContent = "Importando…";
    const ok = await grava(async () => {
      if (novos.length) S.data.lancamentos.push(...(await S.store.addLancamentos(novos)));
      const ano = (meses[meses.length - 1] || S.mes).slice(0, 4);
      for (const z of fxNovos) {
        const desde = z.mesesPagos.length ? `${ano}-${pad(Math.min(...z.mesesPagos))}-01` : S.mes + "-01";
        const novo = await S.store.addFixo({ descricao: z.descricao, categoria: z.categoria, dia: z.dia, valor: z.valor, forma: z.forma, desde, ate: z.ativo ? null : addM(S.mes, -1) + "-01" });
        S.data.fixos.push(novo);
        for (const mm of z.mesesPagos) { const mes = `${ano}-${pad(mm)}-01`; await S.store.setPago(novo.id, mes, true); S.data.pagos.push({ fixo_id: novo.id, mes }); }
      }
      for (const z of ccNovos) S.data.faturas.push(await S.store.addFatura(z));
    });
    if (meses.length) S.mes = meses[meses.length - 1];
    $("dlg").close(); render();
    if (ok) { $("flash").style.color = "var(--good)"; $("flash").textContent = "Planilha importada."; }
  };
});
$("btnExport").onclick = () => {
  if (typeof XLSX === "undefined") return showBanner("Não foi possível gerar o Excel. Confira a internet e recarregue a página.");
  const wb = buildWorkbook(XLSX, S.data, S.mes.slice(0, 4), calcMes, hoje());
  XLSX.writeFile(wb, `meus-gastos-${S.mes}.xlsx`);
};
function openDlg(html) {
  $("dlgBody").innerHTML = html;
  $("dlgBody").querySelectorAll("[data-close]").forEach((b) => (b.onclick = () => $("dlg").close()));
  $("dlg").showModal();
}

/* ================= PWA ================= */
let installEvt = null;
addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installEvt = e; $("btnInstall").hidden = false; });
$("btnInstall").onclick = async () => { if (!installEvt) return; installEvt.prompt(); await installEvt.userChoice; installEvt = null; $("btnInstall").hidden = true; };
if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});

addEventListener("load", boot);
