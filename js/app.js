// Tela do app: entrada, lançamento rápido, indicadores, gráficos e abas.
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPORTE_CONTATO } from "./config.js";
import { CATS_PADRAO, RETIRADA, FORMAS, MESES, MES3, pad, toISO, mKey, addM, parseMoney, round2, calcMes, catMap, custoAcumulado,
  categoriasIniciais, primeiroMes, saldoAnterior, itensDoCusto, reservaAcumulada, guardadoPorDestino, comprasCartaoPorCategoria, proximosVencimentos, avisosDeHoje, CARTAO, DIAS_SEMANA, DIAS3, diaDaSemana,
  faturasAte, semCartaoNoMes, novaVersaoDeFixo, saldoAcumulado, mesDaFatura, valorDasParcelas, periodoDaFatura } from "./calc.js";
import { createSupabaseStore, createLocalStore, demoSeed } from "./store.js";
import { parseWorkbook, buildWorkbook, importKey, norm } from "./excel.js";

const $ = (id) => document.getElementById(id);
const NS = "http://www.w3.org/2000/svg";
const brl = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const brl0 = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
const sgn = (v) => (v < 0 ? "− " : "") + brl(Math.abs(v));
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ddmm = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const ddmmaa = (iso) => `${ddmm(iso)}/${iso.slice(2, 4)}`;
const hoje = () => toISO(new Date());
const nomeMes = (m) => MESES[Number(m.slice(5)) - 1];

const S = {
  mes: mKey(hoje()), tipo: "Despesa", tab: "l", view: "inicio",   // view só vale no celular: "inicio" ou "listas"
  data: { lancamentos: [], fixos: [], pagos: [], faturas: [], cartoes: [] },
  store: null, client: null, loaded: false,
  prefs: prefsPadrao(),
};
function prefsPadrao() { return { categorias: null, levarSaldo: true, saldoDesde: null, saldoInicial: 0, boasVindas: false, avisos: { email: true } }; }
/** Categorias disponíveis para um tipo: as da pessoa, ou as padrão. */
function cats(tipo) {
  return S.prefs.categorias?.[tipo]?.length ? S.prefs.categorias[tipo] : CATS_PADRAO[tipo];
}
const noCelular = () => matchMedia("(max-width:700px)").matches;
const salvaPrefs = () => grava(() => S.store.savePrefs(S.prefs));
const MOVS = ["Guardar", "Retirar"];
const formaDe = (tipo, v) => (tipo === "Despesa" ? v : tipo === "Reserva" && v === "Retirar" ? RETIRADA : "");
const opts = (lista, atual) => lista.map((c) => `<option${c === atual ? " selected" : ""}>${esc(c)}</option>`).join("");
/* Cartões cadastrados: os ativos aparecem para novas compras; os desativados só mantêm as faturas antigas. */
const cartoesAtivos = () => S.data.cartoes.filter((k) => k.ativo !== false);
const cartaoPorId = (id) => S.data.cartoes.find((k) => k.id === id) || null;
const optsCartao = (atual, vazio = "") => {
  const l = cartoesAtivos(), fora = atual && !l.some((k) => k.id === atual) ? cartaoPorId(atual) : null;
  return (vazio ? `<option value="">${esc(vazio)}</option>` : "") + (fora ? [fora, ...l] : l).map((k) => `<option value="${esc(k.id)}"${k.id === atual ? " selected" : ""}>${esc(k.nome)}</option>`).join("");
};
const optsParcelas = (valor, atual = 1) => {
  const ns = Array.from({ length: 24 }, (_, i) => i + 1); if (Number(atual) > 24) ns.push(Number(atual));
  return ns.map((n) => `<option value="${n}"${n === Number(atual) ? " selected" : ""}>${n === 1 ? "À vista" : n + "x"}${valor > 0 && n > 1 ? " de " + brl(valorDasParcelas(valor, n)[1]) : ""}</option>`).join("");
};
/** Como um gasto foi pago, para mostrar nas listas: a forma, ou o cartão e as parcelas. */
const pagoCom = (x) => {
  if (x.forma !== CARTAO) return x.forma || "—";
  const k = cartaoPorId(x.cartao_id), n = Number(x.parcelas) || 1;
  return (k ? k.nome : "Cartão de crédito") + (k && n > 1 ? ` · ${n}x de ${brl(valorDasParcelas(x.valor, n)[1])}` : "");
};

/* ================= inicialização e login ================= */
const configured = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase);

/** Links de e-mail (confirmação, nova senha) voltam com o resultado no endereço. Se veio erro, explica na tela de entrada. */
function erroDoLink() {
  const p = new URLSearchParams((location.hash || "").replace(/^#/, "") || location.search);
  if (!p.get("error") && !p.get("error_code")) return "";
  history.replaceState(null, "", location.pathname);
  return /expired|otp/i.test((p.get("error_code") || "") + (p.get("error_description") || ""))
    ? "Esse link já foi usado ou expirou. Para criar uma nova senha, peça outro link em \"Esqueci minha senha\"."
    : "Não foi possível concluir pelo link do e-mail. Tente entrar normalmente ou peça um novo link.";
}
async function boot() {
  $("authSuporte").innerHTML = suporteHtml();
  // Endereço terminado em #demo (usado no site de apresentação) abre direto a demonstração.
  if (location.hash === "#demo") { try { localStorage.setItem("cg-modo", "demo"); } catch { /* nada */ } history.replaceState(null, "", location.pathname); }
  const aviso = erroDoLink(); if (aviso) authMsg(aviso, "err");
  if (!configured()) {
    $("authForm").hidden = true;
    $("authMsg").textContent = "Login ainda não configurado neste endereço. Você pode testar tudo na demonstração.";
  } else {
    S.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    // O setTimeout evita chamar o Supabase de dentro do próprio callback (recomendação da biblioteca).
    S.client.auth.onAuthStateChange((ev, session) => setTimeout(() => {
      // Chegou pelo link de "esqueci minha senha": entra no app e já pede a senha nova.
      if (ev === "PASSWORD_RECOVERY") { S.recuperando = true; if (S.store?.kind === "supabase" && S.loaded) pedirNovaSenha(); }
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
  S.store = null; $("app").hidden = true; $("bnav").hidden = true; $("auth").hidden = false; fecharLancar();
}
function authMsg(t, kind = "") { const m = $("authMsg"); m.textContent = t; m.className = "auth-msg " + kind; }
const traduzErro = (e) => {
  const m = String(e?.message || e || "");
  if (/invalid login/i.test(m)) return "E-mail ou senha incorretos. Confira os dois. Se ainda não tem conta, toque em Criar conta; se esqueceu a senha, use o link abaixo.";
  if (/rate limit|too many|security purposes/i.test(m)) return "Muitas tentativas seguidas. Espere um minuto e tente de novo.";
  if (/expired|invalid.*link|otp/i.test(m)) return "Esse link já foi usado ou expirou. Peça um novo em \"Esqueci minha senha\".";
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
  // Quando o e-mail já tem conta, o Supabase responde sem erro e sem identidades (para não revelar cadastros).
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0)
    return authMsg("Esse e-mail já tem conta. Use Entrar. Se não lembra a senha, toque em \"Esqueci minha senha\".", "err");
  if (!data.session) authMsg("Conta criada. Abra o e-mail de confirmação que enviamos (olhe também o spam), toque no link e depois volte aqui para entrar.", "ok");
});
$("aEsqueci").addEventListener("click", async () => {
  const email = $("aEmail").value.trim();
  if (!email) { $("aEmail").focus(); return authMsg("Digite seu e-mail acima para receber o link de nova senha."); }
  const { error } = await S.client.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
  authMsg(error ? traduzErro(error) : "Se esse e-mail tem conta, enviamos um link para criar uma nova senha. Olhe também o spam. Se não chegar, pode ser que a conta ainda não exista: use Criar conta.", error ? "err" : "ok");
});
$("aVer").addEventListener("change", (e) => { $("aSenha").type = e.target.checked ? "text" : "password"; });
$("aDemo").addEventListener("click", startDemo);
$("btnSair").addEventListener("click", async () => {
  if (S.store?.kind === "supabase") { await desligarPush().catch(() => {}); await S.client.auth.signOut(); }
  else { try { localStorage.removeItem("cg-modo"); } catch { /* nada */ } showAuth(); }
});

function pedirNovaSenha() {
  openDlg(`<h3>Criar nova senha</h3><p class="hint" style="margin:0 0 4px">Escolha uma senha nova, com pelo menos 6 caracteres.</p><form id="novaSenha" style="display:grid;gap:12px">
    <label class="f">Nova senha<input class="in" id="ns1" type="password" minlength="6" required autocomplete="new-password"></label>
    <div class="actions"><button class="btn primary" type="submit">Salvar senha</button></div><p class="auth-msg" id="nsMsg"></p></form>`);
  $("novaSenha").addEventListener("submit", async (e) => {
    e.preventDefault();
    const { error } = await S.client.auth.updateUser({ password: $("ns1").value });
    if (error) { $("nsMsg").textContent = traduzErro(error); return; }
    S.recuperando = false;
    $("dlg").close(); toast("Senha alterada. Você já está dentro do app.");
    $("flash").style.color = "var(--good)"; $("flash").textContent = "Senha alterada.";
  });
}

function startDemo() {
  try { localStorage.setItem("cg-modo", "demo"); } catch { /* nada */ }
  const store = createLocalStore("cg-demo-v8", demoSeed(hoje()));
  startApp(store, "Demonstração");
  showBanner(`Modo demonstração: dados de exemplo guardados só neste aparelho.`, [["Recomeçar exemplo", () => { store.reset(); startDemo(); }]]);
}

async function startApp(store, quem) {
  S.store = store; S.loaded = false;
  $("auth").hidden = true; $("app").hidden = false; $("bnav").hidden = false;
  $("whoName").textContent = quem;
  $("btnSair").textContent = store.kind === "supabase" ? "Sair" : "Sair da demonstração";
  showBanner("");
  render();
  S.prefs = prefsPadrao();
  try {
    S.data = await store.loadAll(); S.data.cartoes ||= [];
    const p = await store.loadPrefs().catch(() => null);
    S.prefs = { ...prefsPadrao(), ...(p || {}) };
    if (!S.prefs.categorias) S.prefs.categorias = categoriasIniciais(S.data);
    S.loaded = true; render();
    if (S.recuperando) pedirNovaSenha();
    else if (!S.prefs.boasVindas && !S.data.lancamentos.length && !S.data.fixos.length) boasVindas();
    else conviteAvisos();
  } catch (e) { console.error(e); showBanner("Não foi possível carregar seus dados. Confira a internet e recarregue a página."); }
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
    if (/column|schema cache|relation/i.test(String(e?.message))) return showBanner("O banco de dados precisa ser atualizado para esta versão. Rode o arquivo supabase/schema.sql no Supabase."), false;
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
  // No celular aparece uma tela por vez; a barra de baixo mostra onde a pessoa está.
  const app = $("app"); app.dataset.view = S.view; app.dataset.tab = S.tab;
  const onde = S.view === "inicio" ? "inicio" : S.tab === "r" ? "f" : S.tab;
  document.querySelectorAll("#bnav button").forEach((b) => b.dataset.nav === onde ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current"));
  $("listaTitulo").textContent = S.tab === "l" ? "Lançamentos" : S.tab === "c" ? "Cartões" : "";
  $("listaTitulo").hidden = S.tab === "f" || S.tab === "r";
  renderForm(); renderVenc(); renderKpis(c); renderCusto(c); renderCat(c); renderTabs(c);
}

function renderForm() {
  document.querySelectorAll("#tipoSeg button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.t === S.tipo));
  const sel = $("fCat");
  const lista = cats(S.tipo), chave = S.tipo + "|" + lista.join("|");
  if (sel.dataset.k !== chave) { sel.innerHTML = opts(lista); sel.dataset.k = chave; }
  $("fCatLbl").textContent = S.tipo === "Reserva" ? "Onde guardar" : "Categoria";
  // No tipo Guardado, o segundo seletor vira o movimento (guardar ou retirar).
  const fs = $("fForma"), modo = S.tipo === "Reserva" ? "mov" : "forma";
  if (fs.dataset.modo !== modo) { fs.innerHTML = opts(modo === "mov" ? MOVS : FORMAS); fs.dataset.modo = modo; }
  $("fFormaLbl").textContent = modo === "mov" ? "Movimento" : "Forma de pagamento";
  $("fFormaWrap").style.visibility = S.tipo === "Receita" ? "hidden" : "visible";
  const fd = $("fData"); if (!fd.value || mKey(fd.value) !== S.mes) fd.value = mKey(hoje()) === S.mes ? hoje() : S.mes + "-01";
  // Opção de já cadastrar como fixo (repete todo mês). Não vale para dinheiro guardado.
  const fixo = S.tipo !== "Reserva" && $("fFixo").checked;
  $("fFixoWrap").hidden = S.tipo === "Reserva";
  $("fFixoLbl").textContent = S.tipo === "Receita" ? "Repete sempre (entrada fixa, como o salário)" : "Repete sempre (gasto fixo, como aluguel ou Uber de toda sexta)";
  // Quando é fixo, a pessoa escolhe se repete todo mês ou toda semana; o dia vem da data escolhida.
  const fr = $("fRepete"), dt = fd.value || hoje();
  fr.hidden = !fixo;
  fr.options[0].textContent = `Todo mês, no dia ${dt.slice(8, 10)}`;
  fr.options[1].textContent = `Toda semana, ${DIAS_SEMANA[diaDaSemana(dt)] === "sábado" || DIAS_SEMANA[diaDaSemana(dt)] === "domingo" ? "no" : "na"} ${DIAS_SEMANA[diaDaSemana(dt)]}`;
  $("fOk").textContent = fixo ? (S.tipo === "Receita" ? "Cadastrar entrada fixa" : "Cadastrar gasto fixo")
    : S.tipo === "Despesa" ? "Lançar gasto" : S.tipo === "Receita" ? "Lançar entrada" : "Lançar";
  // Compra no cartão: a pessoa escolhe o cartão e, se não for um gasto fixo, em quantas vezes.
  const cc = S.tipo === "Despesa" && fs.value === CARTAO, tem = cartoesAtivos().length > 0;
  $("fCartaoLinha").hidden = !cc; $("fCartaoWrap").hidden = !tem; $("fParcWrap").hidden = !tem || fixo; $("fCartaoDica").hidden = tem;
  if (cc && tem) {
    const fk = $("fCartao"), k = cartoesAtivos().map((z) => z.id + z.nome).join("|");
    if (fk.dataset.k !== k) { fk.innerHTML = optsCartao(fk.value); fk.dataset.k = k; }
    $("fParc").innerHTML = optsParcelas(parseMoney($("fValor").value), fixo ? 1 : $("fParc").value || 1);
  }
}
/** Cartão e parcelas escolhidos no formulário de lançar. Sem cartão cadastrado não devolve nada: o lançamento segue como sempre foi. */
function cartaoDoForm() {
  const cc = S.tipo === "Despesa" && $("fForma").value === CARTAO && cartoesAtivos().length > 0;
  return cc ? { cartao_id: $("fCartao").value || null, parcelas: Number($("fParc").value) || 1 } : {};
}

function renderKpis(c) {
  const saldoPill = c.saldo < 0 ? `<span class="pill bad">● No vermelho</span>` : `<span class="pill good">● No azul</span>`;
  const projTxt = c.fase === "atual" ? `Previsão do mês: <b>${brl0(c.proj)}</b>` : c.fase === "passado" ? "Mês fechado" : "Só os fixos previstos";
  const noCartao = round2(c.comprasCartao + c.fxCartao);
  // Saldo acumulado: o que a pessoa já tinha (saldo inicial), mais os meses anteriores, mais este mês.
  const acum = S.prefs.levarSaldo ? saldoAcumulado(S.data, S.mes, hoje(), { desde: S.prefs.saldoDesde, inicial: S.prefs.saldoInicial }) : c.saldo;
  const resTotal = reservaAcumulada(S.data, S.mes), destinos = guardadoPorDestino(S.data, S.mes);
  const resMes = c.res > 0 ? `+ ${brl0(c.res)} neste mês` : c.res < 0 ? `− ${brl0(-c.res)} neste mês` : "Nada guardado neste mês";
  const resLinhas = destinos.length > 1 ? `<ul class="dest">${destinos.map(([k, v]) => `<li><span>${esc(k)}</span><b>${brl0(v)}</b></li>`).join("")}</ul>` : destinos.length === 1 ? `<span class="n">${esc(destinos[0][0])}</span>` : "";
  $("kpis").innerHTML = `
   <div class="kpi hero" data-det="custo" role="button" tabindex="0"><span class="l">Custo do mês<i aria-hidden="true">›</i></span><span class="v">${brl(c.custo)}</span><span class="n">${projTxt}</span></div>
   <div class="kpi" data-det="entradas" role="button" tabindex="0"><span class="l">Entradas<i aria-hidden="true">›</i></span><span class="v">${brl(c.rec)}</span>${c.frAReceber ? `<span class="pill warn">${brl0(c.frAReceber)} a receber</span>` : ""}<span class="n">${c.frT ? `${brl0(c.frT)} de entradas fixas` : "Salário e outras entradas"}</span></div>
   <div class="kpi" data-det="saldo" role="button" tabindex="0"><span class="l">Saldo do mês<i aria-hidden="true">›</i></span><span class="v" style="color:${c.saldo < 0 ? "var(--bad)" : "var(--good)"}">${sgn(c.saldo)}</span>${saldoPill}${acum !== c.saldo ? `<span class="n">Saldo acumulado: <b>${sgn(acum)}</b></span>` : ""}</div>
   <div class="kpi reserva" data-det="guardado" role="button" tabindex="0"><span class="l">Dinheiro guardado<i aria-hidden="true">›</i></span><span class="v">${brl(resTotal)}</span><span class="n">${resMes}</span>${resLinhas}</div>
   <div class="kpi" data-det="fixos" role="button" tabindex="0"><span class="l">Gastos fixos<i aria-hidden="true">›</i></span><span class="v">${brl(c.fxT)}</span>${c.fxPend ? `<span class="pill warn">${brl0(c.fxPend)} a pagar</span>` : (c.fx.length ? `<span class="pill good">✓ Todos pagos</span>` : `<span class="n">Nenhum cadastrado</span>`)}${c.fxCartao ? `<span class="n">${brl0(c.fxCartao)} no cartão</span>` : ""}</div>
   <div class="kpi" data-det="faturas" role="button" tabindex="0"><span class="l">Faturas do mês<i aria-hidden="true">›</i></span><span class="v">${brl(c.fatT)}</span>${c.fatAberta ? `<span class="pill warn">${brl0(c.fatAberta)} a pagar</span>` : (c.fat.length ? `<span class="pill good">✓ Pagas</span>` : `<span class="n">Nenhuma fatura neste mês</span>`)}${noCartao ? `<span class="n">${brl0(noCartao)} em compras no cartão neste mês</span>` : ""}</div>`;
  let t = "";
  if (!S.loaded) t = "Carregando seus lançamentos…";
  else if (!c.it.length && !c.fx.length && !c.fr.length) t = "Nenhum lançamento neste mês ainda. Use o formulário acima ou importe sua planilha do Excel.";
  else if (c.fase === "atual") {
    const med = c.dias ? c.vari / c.dias : 0;
    t = `Em ${c.dias} ${c.dias === 1 ? "dia" : "dias"} você gastou <strong>${brl(c.vari)}</strong> no dia a dia, média de ${brl(med)} por dia. Somando os fixos${c.fatT ? " e as faturas" : ""}, <strong>o mês deve fechar com custo de ${brl0(c.proj)}</strong>${c.rec ? ` e saldo de ${sgn(round2(c.rec - c.proj - c.res))}` : ""}.${c.comprasCartao ? ` As compras no cartão (${brl0(c.comprasCartao)}) entram no mês em que a fatura vencer.` : ""}`;
  } else if (c.fase === "passado") {
    const top = catMap(c)[0];
    t = `O mês fechou com custo de <strong>${brl(c.custo)}</strong>${top ? `. A maior categoria foi <strong>${esc(top[0])}</strong> (${brl0(top[1])}, ${Math.round((top[1] / c.custo) * 100)}% do custo)` : ""}.`;
  } else t = `Mês futuro: por enquanto aparecem só os gastos fixos previstos (${brl(c.fxT)}).`;
  $("insight").innerHTML = t;
}

/** Quadro de contas a vencer nos próximos 30 dias (não depende do mês que está na tela). */
function renderVenc() {
  const host = $("venc"), l = S.loaded ? proximosVencimentos(S.data, hoje(), 30) : [];
  const total = round2(l.reduce((t, x) => t + x.valor, 0));
  const cab = (dir) => `<div class="sec-head"><h2>Próximos vencimentos</h2><span>${dir}</span></div>`;
  // Alerta de saldo: uma linha acima da lista, só quando o mês está ou vai fechar no vermelho.
  const sd = S.loaded ? avisosDeHoje(S.data, hoje()).saldo : null;
  const alerta = !sd ? "" : `<li class="alerta ${sd.nivel}"><span class="quando ${sd.nivel}">${sd.tipo === "vermelho" ? "no vermelho" : "atenção"}</span>
      <span class="oque"><b>${sd.tipo === "vermelho" ? `Este mês já está ${brl(sd.valor)} no vermelho` : `No ritmo atual, o mês fecha ${brl(sd.valor)} no vermelho`}</b>
      <span>${sd.tipo === "vermelho" ? "As saídas do mês passaram das entradas." : "Ainda dá tempo de segurar os gastos do dia a dia."}</span></span></li>`;
  if (!l.length) {
    const temDados = S.data.lancamentos.length || S.data.fixos.length || S.data.faturas.length;
    host.innerHTML = cab("Contagem calculada pela data de hoje.") + `<ul class="venc">${alerta}<li class="vazio">${!S.loaded ? "Carregando…"
      : temDados ? "Nenhuma conta para os próximos 30 dias. Tudo em dia."
      : "Nenhuma conta para os próximos 30 dias. Cadastre seus gastos fixos e as faturas do cartão para ser avisado aqui."}</li></ul>`;
    return;
  }
  const cls = (d) => (d < 0 ? "bad" : d <= 7 ? "warn" : "ok");
  // No topo aparecem só as primeiras (3 no celular, 5 no computador); o resto abre no "Ver todas".
  const MAX = noCelular() ? 3 : 5, vis = S.vencTodas ? l : l.slice(0, MAX);
  host.innerHTML = cab(`${l.length} ${l.length === 1 ? "conta" : "contas"} em 30 dias, somando <b>${brl(total)}</b>`) +
    `<ul class="venc">${alerta}${vis.map((x, i) => `<li>
      <span class="dt"><b>${x.data.slice(8, 10)}</b><span>${MES3[Number(x.data.slice(5, 7)) - 1]}</span></span>
      <span class="oque"><b>${esc(x.titulo)}</b><span>${x.tipo === "fatura" ? "Fatura de cartão" : x.semanal ? "Gasto fixo · toda " + DIAS_SEMANA[diaDaSemana(x.data)] : "Gasto fixo"}</span></span>
      <span class="quando ${cls(x.dias)}">${quandoVence(x.dias)}</span>
      <span class="valor">${brl(x.valor)}</span>
      <button class="btn sm" type="button" data-pg="${i}">Já paguei</button></li>`).join("")}
      ${l.length > MAX ? `<li class="vazio"><button class="link" type="button" id="vencMais">${S.vencTodas ? "Mostrar só as próximas" : `Ver todas as ${l.length} contas`}</button></li>` : ""}</ul>`;
  host.querySelectorAll("[data-pg]").forEach((b) => (b.onclick = () => { b.disabled = true; pagarConta(vis[Number(b.dataset.pg)]); }));
  if ($("vencMais")) $("vencMais").onclick = () => { S.vencTodas = !S.vencTodas; renderVenc(); };
}
/** Marca uma conta (fatura ou ocorrência de fixo) como paga e atualiza a tela. */
async function pagarConta(x) {
  if (x.tipo === "fatura") {
    if (x.auto) await gravaFaturaAuto({ id: x.id, cartao_id: x.cartao_id, cartao: x.cartao, vencimento: x.data, valor: x.valor }, { status: "Paga" });
    else if (await grava(() => S.store.updateFatura(x.id, { status: "Paga" }))) { const f = S.data.faturas.find((z) => z.id === x.id); if (f) f.status = "Paga"; }
  } else if (await grava(() => S.store.setPago(x.id, x.chave, true))) S.data.pagos.push({ fixo_id: x.id, mes: x.chave });
  render();
}
/**
 * Grava a situação ou o valor corrigido de uma fatura calculada. O registro só é criado na primeira vez
 * que a pessoa mexe na fatura (marca como paga ou corrige o valor).
 */
async function gravaFaturaAuto(f, patch) {
  const reg = S.data.faturas.find((z) => (f.id && z.id === f.id) || (z.cartao_id === f.cartao_id && mKey(z.vencimento) === mKey(f.vencimento)));
  if (reg) { const ok = await grava(() => S.store.updateFatura(reg.id, patch)); if (ok) Object.assign(reg, patch); return ok; }
  const row = { cartao_id: f.cartao_id, cartao: f.cartao, vencimento: f.vencimento, valor: f.valor, status: "Aberta", valor_fixo: false, ...patch };
  let novo; const ok = await grava(async () => { novo = await S.store.addFatura(row); });
  if (ok) S.data.faturas.push(novo);
  return ok;
}
// Contagem de dias; o que já passou do dia aparece como atrasada, em vermelho (só o texto, sem contorno).
const quandoVence = (d) => d < 0 ? `atrasada há ${-d} ${-d === 1 ? "dia" : "dias"}` : d === 0 ? "vence hoje" : d === 1 ? "amanhã" : `em ${d} dias`;

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
    const t = el("text", { x: x(n), y: (perto ? Math.min(y(c.proj), y(c.rec)) : y(c.proj)) - 8, "text-anchor": "end", "font-size": 12, "font-weight": 600, fill: "var(--ink)" }, svg); t.textContent = brl0(c.proj);
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
  if (!cats.length) { host.innerHTML = `<div class="empty">As categorias aparecem aqui assim que você lançar um gasto.</div>`; cartaoDoMes(c, host); return; }
  const W = Math.max(260, host.clientWidth || 400), rowH = 34, H = cats.length * rowH, labW = Math.min(150, W * 0.36), valW = 112, bw = W - labW - valW, max = cats[0][1];
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", height: H, role: "img", "aria-label": "Gastos por categoria" }, host);
  cats.forEach(([k, v], i) => {
    const yy = i * rowH + 6, h = 20, w = Math.max(4, (v / max) * bw);
    const mc = Math.floor((labW - 8) / 7);
    // Cada linha é um botão: tocar abre a lista dos gastos daquela categoria.
    const g = el("g", { class: "cat-row", role: "button", tabindex: 0, "aria-label": `${k}: ${brl0(v)}. Ver os gastos` }, svg);
    el("rect", { class: "bg", x: 0, y: i * rowH + 1, width: W, height: rowH - 2, rx: 6, fill: "transparent" }, g);
    const t = el("text", { x: 4, y: yy + 14, "font-size": 12.5, fill: "var(--ink)" }, g); t.textContent = k.length > mc ? k.slice(0, mc - 1) + "…" : k;
    el("path", { d: `M${labW},${yy} H${labW + w - 4} q4,0 4,4 V${yy + h - 4} q0,4 -4,4 H${labW} Z`, fill: "var(--series)" }, g);
    const vt = el("text", { x: labW + w + 8, y: yy + 14, "font-size": 12, fill: "var(--ink-2)", "font-family": "IBM Plex Mono, monospace" }, g);
    vt.textContent = `${brl0(v)} · ${Math.round((v / tot) * 100)}%`;
    g.addEventListener("click", () => detalheCategoria(k));
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); detalheCategoria(k); } });
  });
  cartaoDoMes(c, host);
}
/** Lista do que foi para o cartão neste mês e ainda vai ser cobrado em uma fatura. */
function cartaoDoMes(c, host) {
  const l = comprasCartaoPorCategoria(c); if (!l.length) return;
  const d = document.createElement("div"); d.className = "nocartao";
  d.innerHTML = `<h3>No cartão neste mês</h3><p class="hint">Ainda não entrou no custo. Vai ser cobrado na fatura.</p><ul class="dest">${l.map(([k, v]) => `<li><span>${esc(k)}</span><b>${brl0(v)}</b></li>`).join("")}</ul>`;
  host.appendChild(d);
}

/* ================= abas ================= */
function renderTabs(c) {
  document.querySelectorAll(".tabs button").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === S.tab));
  // Só a aba ativa fica montada: as abas de fixos usam os mesmos campos.
  ["l", "f", "r", "c"].forEach((k) => { const p = $("pane-" + k); p.hidden = S.tab !== k; if (S.tab !== k) p.innerHTML = ""; });
  if (S.tab === "l") paneL(c); else if (S.tab === "f") paneF(c, "Despesa"); else if (S.tab === "r") paneF(c, "Receita"); else paneC(c);
}
function armDelete(b, fn) {
  b.addEventListener("click", () => {
    if (b.classList.contains("arm")) return fn();
    const orig = b.innerHTML; b.classList.add("arm"); b.textContent = "Confirmar";
    setTimeout(() => { if (b.isConnected) { b.classList.remove("arm"); b.innerHTML = orig; } }, 3000);
  });
}

function paneL(c) {
  // Entradas fixas aparecem na lista como lançamentos automáticos do mês.
  const auto = c.fr.map((f) => { const d = Number(f.data.slice(8, 10));
    return { auto: true, id: f.id, data: f.data, descricao: f.descricao, categoria: f.categoria, tipo: "Receita", valor: f.valor,
      previsto: c.fase === "futuro" || (c.fase === "atual" && d > c.dias) }; });
  const it = [...c.it, ...auto].sort((a, b) => b.data.localeCompare(a.data) || String(b.created_at || "").localeCompare(String(a.created_at || "")));
  if (!it.length) {
    $("pane-l").innerHTML = `<div class="welcome"><p><b>Nenhum lançamento em ${nomeMes(S.mes)}.</b> Anote cada gasto no formulário lá em cima assim que ele acontecer. O custo do mês e a projeção se atualizam na hora.</p><p>Já tem uma planilha? Use <b>Importar Excel</b> para trazer os lançamentos dela.</p></div>`;
    return;
  }
  $("pane-l").innerHTML = `<div class="tbl"><table><thead><tr><th>Dia</th><th>Descrição</th><th class="hide-sm">Categoria</th><th class="hide-sm">Pagamento</th><th class="num">Valor</th><th></th></tr></thead><tbody>${
    it.map((x) => x.auto ? `<tr class="${x.previsto ? "previsto" : ""}"><td class="d">${ddmm(x.data)}</td><td>${esc(x.descricao)} <span class="tag">${x.previsto ? "previsto" : "automático"}</span><span class="sub">Entrada fixa</span></td><td class="hide-sm"><span class="tag">${esc(x.categoria)}</span></td>
      <td class="hide-sm" style="color:var(--ink-2);font-size:13px">Entrada fixa</td><td class="num pos">+ ${brl(x.valor)}</td>
      <td class="acts"><button class="act" type="button" data-ir="r">Alterar</button></td></tr>`
    : `<tr><td class="d">${ddmm(x.data)}</td><td>${esc(x.descricao || x.categoria)}<span class="sub">${esc(x.categoria)}${x.tipo === "Despesa" && x.forma ? " · " + esc(pagoCom(x)) : x.tipo === "Reserva" ? (x.forma === RETIRADA ? " · retirou" : " · guardou") : ""}</span></td><td class="hide-sm"><span class="tag">${esc(x.categoria)}</span></td>
      <td class="hide-sm" style="color:var(--ink-2);font-size:13px">${x.tipo === "Despesa" ? esc(pagoCom(x)) : x.tipo === "Receita" ? "Entrada" : x.forma === RETIRADA ? "Retirou" : "Guardou"}</td>
      <td class="num ${x.tipo === "Receita" ? "pos" : x.tipo === "Reserva" ? "res" : ""}">${x.tipo === "Receita" ? "+ " : x.tipo === "Reserva" ? (x.forma === RETIRADA ? "← " : "→ ") : "− "}${brl(x.valor)}</td>
      <td class="acts"><button class="act" type="button" data-ed="${esc(x.id)}" aria-label="Editar"><span class="hide-sm">Editar</span><span class="show-sm">✎</span></button><button class="del" type="button" data-del="${esc(x.id)}" aria-label="Excluir"><span class="hide-sm">Excluir</span><span class="show-sm">✕</span></button></td></tr>`).join("")}</tbody></table></div>`;
  $("pane-l").querySelectorAll("[data-ir]").forEach((b) => (b.onclick = () => { S.view = "listas"; S.tab = b.dataset.ir; render(); }));
  $("pane-l").querySelectorAll("[data-ed]").forEach((b) => (b.onclick = () => editarLancamento(b.dataset.ed)));
  $("pane-l").querySelectorAll("[data-del]").forEach((b) => armDelete(b, async () => {
    const id = b.dataset.del;
    if (await grava(() => S.store.deleteLancamento(id))) { S.data.lancamentos = S.data.lancamentos.filter((x) => x.id !== id); render(); }
  }));
}

function paneF(c, tipo) {
  const ent = tipo === "Receita", host = $(ent ? "pane-r" : "pane-f");
  const fx = ent ? c.fr : c.fx;   // uma linha por ocorrência: os semanais aparecem uma vez por semana
  const rows = fx.map((f) => {
    const p = c.pagosSet.has(f.id + "|" + f.chave), d = Number(f.data.slice(8, 10)), sem = f.repete === "semanal";
    const quando = sem ? `${DIAS3[diaDaSemana(f.data)]} ${ddmm(f.data)}` : `dia ${pad(f.dia || 1)}`;
    const chegou = c.fase === "passado" || (c.fase === "atual" && d <= c.dias);
    const status = ent ? `<span class="chk ${chegou ? "on" : ""}">${chegou ? "✓ Recebida" : "Dia " + pad(d)}</span>`
      : f.forma === CARTAO ? `<span class="chk" title="É pago junto com a fatura do cartão">Na fatura</span>`
      : `<button type="button" class="chk ${p ? "on" : f.data < hoje() ? "late" : "off"}" data-pago="${esc(f.id)}" data-chave="${esc(f.chave)}" data-v="${p ? 0 : 1}">${p ? "✓ Pago" : f.data < hoje() ? "○ Atrasado" : "○ A pagar"}</button>`;
    return `<tr><td class="d">${quando}</td><td>${esc(f.descricao)}${sem ? ` <span class="tag">toda ${DIAS3[diaDaSemana(f.data)]}</span>` : ""}<span class="sub">${quando} · ${esc(f.categoria)}${!ent && f.forma ? " · " + esc(pagoCom({ ...f, parcelas: 1 })) : ""}</span></td><td class="hide-sm"><span class="tag">${esc(f.categoria)}</span></td><td class="num ${ent ? "pos" : ""}">${ent ? "+ " : ""}${brl(f.valor)}</td>
      <td class="st">${status}</td>
      <td class="acts"><button class="act" type="button" data-fed="${esc(f.id)}" aria-label="Editar"><span class="hide-sm">Editar</span><span class="show-sm">✎</span></button><button class="del" type="button" data-end="${esc(f.id)}" title="Para de contar a partir deste mês">Encerrar</button></td></tr>`;
  }).join("");
  host.innerHTML = `<p class="hint" style="margin-top:0">${ent
      ? "Cadastre uma vez o que você recebe sempre, como o salário. A entrada é lançada sozinha, todo mês ou toda semana, no dia que você escolher."
      : "Cadastre uma vez o que se repete: todo mês, como o aluguel, ou toda semana, como o Uber de sexta ou a terapia. Entra no custo sozinho; é só marcar quando pagar."}</p>
   ${fx.length ? `<div class="tbl"><table class="cards"><thead><tr><th>${ent ? "Recebe" : "Vence"}</th><th>Descrição</th><th class="hide-sm">Categoria</th><th class="num">Valor</th><th>${MES3[Number(S.mes.slice(5)) - 1]}</th><th></th></tr></thead><tbody>${rows}</tbody>
     <tfoot><tr><td class="d"></td><td style="font-weight:600">Total</td><td class="hide-sm"></td><td class="num" style="font-weight:600">${brl(ent ? c.frT : c.fxT)}</td><td colspan="2" class="vazio"></td></tr></tfoot></table></div>`
     : `<div class="empty">${ent ? "Nenhuma entrada fixa neste mês. Adicione seu salário, aposentadoria, aluguel que recebe…" : "Nenhum gasto fixo neste mês. Adicione aluguel, condomínio, internet, faculdade, parcelas…"}</div>`}
   <form class="addrow ${ent ? "fr" : "fx"}" id="formFx" autocomplete="off">
     <label class="f">Descrição<input class="in" id="xDesc" required maxlength="60" placeholder="${ent ? "Ex.: Salário" : "Ex.: Condomínio"}"></label>
     <label class="f">Categoria<select class="in" id="xCat">${opts(cats(tipo), ent ? "Salário" : "Moradia")}</select></label>
     <label class="f">Repete<select class="in" id="xRep"><option value="mensal">Todo mês</option><option value="semanal">Toda semana</option></select></label>
     <label class="f" id="xDiaWrap">${ent ? "Dia que recebe" : "Dia venc."}<input class="in" id="xDia" type="number" min="1" max="31" value="${ent ? 5 : 10}" required></label>
     <label class="f" id="xSemWrap" hidden>Dia da semana<select class="in" id="xSem">${DIAS_SEMANA.map((d, i) => `<option value="${i}"${i === 5 ? " selected" : ""}>${d}</option>`).join("")}</select></label>
     <label class="f">Valor${ent ? "" : " por vez"} (R$)<input class="in money" id="xVal" inputmode="decimal" placeholder="0,00" required></label>
     ${ent ? "" : `<label class="f">Pagamento<select class="in" id="xForma">${opts(FORMAS)}</select></label>
     <label class="f" id="xCartaoWrap" hidden>Cartão<select class="in" id="xCartao">${optsCartao()}</select></label>`}
     <button class="btn primary" type="submit">${ent ? "Adicionar entrada fixa" : "Adicionar fixo"}</button>
   </form>`;
  $("xRep").onchange = () => { const sem = $("xRep").value === "semanal"; $("xDiaWrap").hidden = sem; $("xSemWrap").hidden = !sem; };
  if (!ent) $("xForma").onchange = () => { $("xCartaoWrap").hidden = $("xForma").value !== CARTAO || !cartoesAtivos().length; };
  host.querySelectorAll("[data-fed]").forEach((b) => (b.onclick = () => editarFixo(b.dataset.fed)));
  host.querySelectorAll("[data-pago]").forEach((b) => b.addEventListener("click", async () => {
    const id = b.dataset.pago, pago = b.dataset.v === "1", mes = b.dataset.chave;
    b.disabled = true;
    if (await grava(() => S.store.setPago(id, mes, pago))) {
      S.data.pagos = S.data.pagos.filter((p) => !(p.fixo_id === id && p.mes === mes));
      if (pago) S.data.pagos.push({ fixo_id: id, mes });
    }
    render();
  }));
  host.querySelectorAll("[data-end]").forEach((b) => armDelete(b, async () => {
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
    const sem = $("xRep").value === "semanal";
    // Semanal começa a contar de hoje (ou do dia 1, se a pessoa está olhando outro mês).
    const row = { tipo, descricao: $("xDesc").value.trim(), categoria: $("xCat").value, dia: sem ? 1 : Math.min(31, Math.max(1, Number($("xDia").value) || 1)),
      valor: round2(v), forma: ent ? "" : $("xForma").value, desde: sem && S.mes === mKey(hoje()) ? hoje() : S.mes + "-01", ate: null,
      ...(sem ? { repete: "semanal", dia_semana: Number($("xSem").value) } : {}),
      ...(!ent && $("xForma").value === CARTAO && cartoesAtivos().length ? { cartao_id: $("xCartao").value } : {}) };
    let novo; if (await grava(async () => { novo = await S.store.addFixo(row); })) {
      S.data.fixos.push(novo); render();
      // Confirma na tela e volta para o topo da lista, onde o item novo aparece.
      const msg = `${ent ? "Entrada fixa adicionada" : "Gasto fixo adicionado"}: ${row.descricao} · ${brl(row.valor)}.`;
      if (noCelular()) { toast(msg); $("listas").scrollIntoView({ block: "start" }); } else { $("flash").style.color = "var(--good)"; $("flash").textContent = msg; }
    }
  });
}

function paneC(c) {
  const host = $("pane-c"), hj = hoje(), cartoes = S.data.cartoes;
  // Faturas na tela: as que vencem no mês e as de meses anteriores que ainda estão em aberto.
  const vis = faturasAte(S.data, S.mes).filter((x) => mKey(x.vencimento) === S.mes || x.status !== "Paga");
  const atrasadas = round2(vis.filter((x) => mKey(x.vencimento) < S.mes).reduce((t, x) => t + x.valor, 0));
  // Próxima fatura em aberto de cada cartão, para mostrar ao lado do nome.
  const futuras = faturasAte(S.data, addM(mKey(hj), 2)).filter((x) => x.auto && x.status !== "Paga" && x.vencimento >= hj);
  const usados = new Set([...S.data.lancamentos, ...S.data.fixos].map((x) => x.cartao_id).filter(Boolean));
  const soltos = [...S.data.lancamentos.filter((x) => x.tipo === "Despesa"), ...S.data.fixos].filter((x) => x.forma === CARTAO && !cartaoPorId(x.cartao_id));
  const semCartao = semCartaoNoMes(S.data, S.mes);
  const linhaCartao = (k) => {
    const prox = futuras.find((x) => x.cartao_id === k.id), off = k.ativo === false;
    return `<li class="${off ? "off" : ""}"><span class="oque"><b>${esc(k.nome)}${off ? ` <span class="tag">desativado</span>` : ""}</b>
      <span>Fecha dia ${pad(k.fechamento)} · vence dia ${pad(k.vencimento)}${prox ? ` · próxima fatura ${brl(prox.valor)} em ${ddmm(prox.vencimento)}` : ""}</span></span>
      <span class="acts"><button class="act" type="button" data-ked="${esc(k.id)}">Editar</button>${off ? `<button class="act" type="button" data-kon="${esc(k.id)}">Reativar</button>`
        : `<button class="del" type="button" data-kdel="${esc(k.id)}" title="${usados.has(k.id) ? "Sai da lista de novas compras; as faturas continuam" : "Remove o cartão"}">${usados.has(k.id) ? "Desativar" : "Remover"}</button>`}</span></li>`;
  };
  const linhaFatura = (x, i) => {
    const venc = ddmmaa(x.vencimento), paga = x.status === "Paga";
    return `<tr><td class="d">${venc}</td><td>${esc(x.cartao)}${mKey(x.vencimento) < S.mes ? ` <span class="tag">mês anterior</span>` : ""}${x.auto && x.valor_fixo ? ` <span class="tag">valor corrigido</span>` : ""}
        <span class="sub">vence em ${venc}${x.auto ? ` · ${x.itens.length} ${x.itens.length === 1 ? "compra" : "compras"}` : " · lançada à mão"}</span></td>
      <td class="hide-sm" style="color:var(--ink-2);font-size:13px">${x.auto ? `${x.itens.length} ${x.itens.length === 1 ? "compra" : "compras"}` : "Lançada à mão"}</td>
      <td class="num">${brl(x.valor)}</td>
      <td class="st"><button type="button" class="chk ${paga ? "on" : x.vencimento < hj ? "late" : "off"}" data-st="${i}">${paga ? "✓ Paga" : x.vencimento < hj ? "○ Atrasada" : "○ Em aberto"}</button></td>
      <td class="acts"><button class="act" type="button" data-fat="${i}">${x.auto ? "Ver compras" : "Editar"}</button>${x.auto ? "" : `<button class="del" type="button" data-cdel="${esc(x.id)}" aria-label="Excluir"><span class="hide-sm">Excluir</span><span class="show-sm">✕</span></button>`}</td></tr>`;
  };
  host.innerHTML = `<h3 class="sub-h">Meus cartões</h3>
   <p class="hint" style="margin-top:0">Cadastre o cartão com o dia em que a fatura fecha e o dia em que vence. Depois é só lançar as compras escolhendo o cartão: o app monta a fatura sozinho, com as parcelas.</p>
   ${S.data.semCartoes ? `<p class="aviso" style="margin:0 0 10px">O cadastro de cartões ainda não está ligado nesta conta: falta atualizar o banco de dados (arquivo supabase/schema.sql). Enquanto isso, as faturas podem ser lançadas à mão.</p>` : ""}
   ${cartoes.length ? `<ul class="cartoes">${cartoes.map(linhaCartao).join("")}</ul>` : `<div class="empty">Nenhum cartão cadastrado ainda.</div>`}
   <form class="addrow kc" id="formK" autocomplete="off">
     <label class="f">Nome do cartão<input class="in" id="kNome" required maxlength="40" placeholder="Ex.: Nubank"></label>
     <label class="f">Dia que a fatura fecha<input class="in" id="kFech" type="number" inputmode="numeric" min="1" max="31" required placeholder="Ex.: 3"></label>
     <label class="f">Dia que a fatura vence<input class="in" id="kVenc" type="number" inputmode="numeric" min="1" max="31" required placeholder="Ex.: 10"></label>
     <button class="btn primary" type="submit">Adicionar cartão</button>
     ${soltos.length ? `<label class="check"><input type="checkbox" id="kLigar" ${cartoes.length ? "" : "checked"}> Usar este cartão nas ${soltos.length} ${soltos.length === 1 ? "compra no cartão que já lancei" : "compras no cartão que já lancei"} sem cartão escolhido</label>` : ""}
   </form>
   <h3 class="sub-h">Faturas de ${nomeMes(S.mes)}</h3>
   ${vis.length ? `<div class="tbl"><table class="cards"><thead><tr><th>Vence</th><th>Cartão</th><th class="hide-sm">Origem</th><th class="num">Fatura</th><th>Situação</th><th></th></tr></thead><tbody>${vis.map(linhaFatura).join("")}</tbody>
     <tfoot><tr><td class="d"></td><td style="font-weight:600">Faturas de ${nomeMes(S.mes)}</td><td class="hide-sm"></td><td class="num" style="font-weight:600">${brl(c.fatT)}</td><td colspan="2" class="st">${atrasadas ? `<span class="pill warn">${brl0(atrasadas)} de meses anteriores</span>` : ""}</td></tr></tfoot></table></div>`
     : `<div class="empty">Nenhuma fatura com vencimento em ${nomeMes(S.mes)}.</div>`}
   ${semCartao ? `<p class="aviso">${brl(semCartao)} em compras no cartão deste mês ${cartoes.length ? "estão sem cartão escolhido e não entram em nenhuma fatura. Edite o lançamento e escolha o cartão." : "ainda não entram em nenhuma fatura. Cadastre o cartão acima, ou lance a fatura à mão quando ela chegar."}</p>` : ""}
   <details class="manual"${cartoes.length ? "" : " open"}><summary>Lançar uma fatura à mão</summary>
   <p class="hint" style="margin:6px 0 0">Para um cartão que você não cadastrou: digite só o total e a data de vencimento.</p>
   <form class="addrow cc" id="formCc" autocomplete="off">
     <label class="f">Cartão<input class="in" id="cNome" required maxlength="40" placeholder="Ex.: Cartão da loja"></label>
     <label class="f">Vencimento<input class="in" id="cVenc" type="date" required value="${S.mes}-10"></label>
     <label class="f">Valor da fatura<input class="in money" id="cVal" inputmode="decimal" placeholder="0,00" required></label>
     <label class="f">Situação<select class="in" id="cSt"><option>Aberta</option><option>Paga</option></select></label>
     <button class="btn primary" type="submit">Adicionar fatura</button>
   </form></details>`;

  host.querySelectorAll("[data-st]").forEach((b) => b.addEventListener("click", async () => {
    const x = vis[Number(b.dataset.st)], status = x.status === "Paga" ? "Aberta" : "Paga";
    b.disabled = true;
    if (x.auto) await gravaFaturaAuto(x, { status });
    else { const f = S.data.faturas.find((z) => z.id === x.id); if (f && await grava(() => S.store.updateFatura(f.id, { status }))) f.status = status; }
    render();
  }));
  host.querySelectorAll("[data-fat]").forEach((b) => (b.onclick = () => editarFatura(vis[Number(b.dataset.fat)])));
  host.querySelectorAll("[data-cdel]").forEach((b) => armDelete(b, async () => {
    const id = b.dataset.cdel;
    if (await grava(() => S.store.deleteFatura(id))) { S.data.faturas = S.data.faturas.filter((z) => z.id !== id); render(); }
  }));
  host.querySelectorAll("[data-ked]").forEach((b) => (b.onclick = () => editarCartao(b.dataset.ked)));
  host.querySelectorAll("[data-kon]").forEach((b) => (b.onclick = async () => {
    const k = cartaoPorId(b.dataset.kon); if (k && await grava(() => S.store.updateCartao(k.id, { ativo: true }))) k.ativo = true; render();
  }));
  host.querySelectorAll("[data-kdel]").forEach((b) => armDelete(b, async () => {
    const k = cartaoPorId(b.dataset.kdel); if (!k) return;
    // Cartão com compras não é apagado: sai da lista de novas compras e as faturas dele continuam valendo.
    if (usados.has(k.id)) { if (await grava(() => S.store.updateCartao(k.id, { ativo: false }))) k.ativo = false; }
    else if (await grava(() => S.store.deleteCartao(k.id))) { S.data.cartoes = S.data.cartoes.filter((z) => z.id !== k.id); S.data.faturas = S.data.faturas.filter((z) => z.cartao_id !== k.id); }
    render();
  }));
  $("formK").addEventListener("submit", async (e) => {
    e.preventDefault();
    const nome = $("kNome").value.trim(), dia = (id) => Math.min(31, Math.max(1, Math.round(Number($(id).value)) || 0));
    if (!nome || !dia("kFech") || !dia("kVenc")) return;
    if (S.data.cartoes.some((k) => norm(k.nome) === norm(nome))) { toastOuFlash(`Já existe um cartão chamado ${nome}.`, true); $("kNome").focus(); return; }
    const ligar = Boolean($("kLigar")?.checked);
    let novo, quitadas = 0;
    const ok = await grava(async () => {
      novo = await S.store.addCartao({ nome, fechamento: dia("kFech"), vencimento: dia("kVenc") });
      S.data.cartoes.push(novo);
      if (ligar) {
        for (const x of soltos) {
          if (x.data) await S.store.updateLancamento(x.id, { cartao_id: novo.id }); else await S.store.updateFixo(x.id, { cartao_id: novo.id });
          x.cartao_id = novo.id;
        }
      }
      await adotarFaturasManuais(novo);
      if (ligar) quitadas = await quitarVencidas(new Set([novo.id]));
    });
    render();
    if (ok) toastOuFlash(`Cartão ${nome} cadastrado.${ligar ? ` ${soltos.length} ${soltos.length === 1 ? "compra ligada" : "compras ligadas"} a ele.` : ""}${quitadas ? " As faturas que já venceram ficaram como pagas; se alguma ainda está em aberto, é só desmarcar." : ""}`);
  });
  $("formCc").addEventListener("submit", async (e) => {
    e.preventDefault();
    const v = parseMoney($("cVal").value); if (!(v > 0)) { $("cVal").focus(); return; }
    const row = { cartao: $("cNome").value.trim(), vencimento: $("cVenc").value, valor: round2(v), status: $("cSt").value };
    let novo; if (await grava(async () => { novo = await S.store.addFatura(row); })) { S.data.faturas.push(novo); render(); }
  });
}
/** Aviso curto: no celular vira um toast; no computador aparece embaixo do formulário de lançar. */
function toastOuFlash(t, erro = false) {
  if (noCelular()) return toast(t);
  $("flash").style.color = erro ? "var(--bad)" : "var(--good)"; $("flash").textContent = t;
}
/**
 * Faturas lançadas à mão com o mesmo nome de um cartão recém-cadastrado passam a ser dele, com o valor
 * digitado valendo no lugar do calculado. Assim nenhum mês é cobrado duas vezes.
 */
async function adotarFaturasManuais(k) {
  const meses = new Set(S.data.faturas.filter((f) => f.cartao_id === k.id).map((f) => mKey(f.vencimento)));
  for (const f of S.data.faturas) {
    if (f.cartao_id || norm(f.cartao) !== norm(k.nome) || meses.has(mKey(f.vencimento))) continue;
    const patch = { cartao_id: k.id, valor_fixo: true };
    await S.store.updateFatura(f.id, patch); Object.assign(f, patch); meses.add(mKey(f.vencimento));
  }
}
/** Faturas calculadas que já venceram e nunca foram marcadas ficam como pagas (usado ao trazer compras antigas). */
async function quitarVencidas(ids) {
  const hj = hoje(); let n = 0;
  for (const f of faturasAte(S.data, mKey(hj))) {
    if (!f.auto || f.id || !ids.has(f.cartao_id) || f.vencimento >= hj) continue;
    S.data.faturas.push(await S.store.addFatura({ cartao_id: f.cartao_id, cartao: f.cartao, vencimento: f.vencimento, valor: f.valor, status: "Paga", valor_fixo: false })); n++;
  }
  return n;
}

/* ================= lançamento rápido ================= */
$("tipoSeg").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; S.tipo = b.dataset.t; renderForm(); });
$("fFixo").addEventListener("change", renderForm);
$("fData").addEventListener("change", renderForm);
$("fForma").addEventListener("change", renderForm);
$("fValor").addEventListener("input", () => { if (!$("fCartaoLinha").hidden) renderForm(); });   // atualiza o valor de cada parcela
$("fIrCartoes").onclick = () => { fecharLancar(); S.view = "listas"; S.tab = "c"; render(); $("kNome")?.focus(); };

/* ================= celular: navegação, lançamento em tela cheia e menu ================= */
let toastT;
function toast(t) { const el = $("toast"); el.textContent = t; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (el.hidden = true), 3500); }
function abrirLancar() {
  document.body.classList.add("lancando"); $("flash").textContent = "";
  try { if (!history.state?.lanc) history.pushState({ lanc: true }, ""); } catch { /* sem histórico: o ✕ fecha */ }   // o botão Voltar do celular fecha a tela
  setTimeout(() => $("fValor").focus(), 50);
}
function fecharLancar(viaVoltar = false) {
  if (!document.body.classList.contains("lancando")) return;
  document.body.classList.remove("lancando");
  try { if (!viaVoltar && history.state?.lanc) history.back(); } catch { /* nada */ }
}
/** Depois de salvar: no celular fecha a tela e mostra um aviso; no computador volta o foco para o valor. */
function aposLancar(texto) { if (noCelular()) { fecharLancar(); toast(texto); } else $("fValor").focus(); }
addEventListener("popstate", () => fecharLancar(true));
$("lancFechar").onclick = () => fecharLancar();
$("bnav").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  const n = b.dataset.nav;
  if (n === "mais") return abrirLancar();
  if (n === "inicio") S.view = "inicio";
  else { S.view = "listas"; S.tab = n === "f" && S.tab === "r" ? "r" : n; }
  render(); scrollTo(0, 0);
});
$("btnMenu").onclick = () => {
  openDlg(`<h3>Menu</h3><p class="hint" style="margin:0 0 12px">${esc($("whoName").textContent)}</p><div class="menu-lista">
    <button class="btn" data-go="btnAjustes">⚙ Ajustes e categorias</button>
    <button class="btn" data-go="btnImport">⬆ Importar Excel</button>
    <button class="btn" data-go="btnExport">⬇ Baixar Excel</button>
    ${$("btnInstall").hidden ? "" : `<button class="btn" data-go="btnInstall">📲 Instalar app</button>`}
    <button class="btn" data-go="btnSair">${esc($("btnSair").textContent)}</button>
    <button class="btn ghost" data-close>Fechar</button></div>`);
  $("dlgBody").querySelectorAll("[data-go]").forEach((b) => (b.onclick = () => { $("dlg").close(); $(b.dataset.go).click(); }));
};
$("formLanc").addEventListener("submit", async (e) => {
  e.preventDefault();
  const flash = $("flash"), v = parseMoney($("fValor").value);
  if (!(v > 0)) { flash.style.color = "var(--bad)"; flash.textContent = "Digite um valor maior que zero, por exemplo 25,90."; $("fValor").focus(); return; }
  const data = $("fData").value || hoje();
  if (S.tipo !== "Reserva" && $("fFixo").checked) {
    // Vira um fixo: conta em todo mês a partir do mês da data, no mesmo dia.
    const dia = Number(data.slice(8, 10)), ent = S.tipo === "Receita", sem = $("fRepete").value === "semanal", wd = diaDaSemana(data);
    const fx = { tipo: S.tipo, descricao: $("fDesc").value.trim() || $("fCat").value, categoria: $("fCat").value, dia: sem ? 1 : dia, valor: round2(v),
      forma: ent ? "" : $("fForma").value, desde: sem ? data : mKey(data) + "-01", ate: null, ...(sem ? { repete: "semanal", dia_semana: wd } : {}),
      ...(cartaoDoForm().cartao_id ? { cartao_id: cartaoDoForm().cartao_id } : {}) };
    $("fOk").disabled = true;
    let novo; const ok = await grava(async () => { novo = await S.store.addFixo(fx); });
    $("fOk").disabled = false;
    if (!ok) return;
    S.data.fixos.push(novo);
    flash.style.color = "var(--good)";
    flash.textContent = `${ent ? "Entrada fixa cadastrada" : "Gasto fixo cadastrado"}: ${fx.descricao} · ${brl(fx.valor)}, ${sem ? "toda semana, " + DIAS_SEMANA[wd] : "todo dia " + pad(dia)}. Para alterar, use a aba ${ent ? "Entradas fixas" : "Gastos fixos"}.`;
    $("fValor").value = ""; $("fDesc").value = ""; $("fFixo").checked = false; $("fRepete").value = "mensal";
    aposLancar(flash.textContent);
    return render();
  }
  const row = { data, descricao: $("fDesc").value.trim(), tipo: S.tipo, categoria: $("fCat").value,
    forma: formaDe(S.tipo, $("fForma").value), valor: round2(v), import_key: null, ...cartaoDoForm() };
  $("fOk").disabled = true;
  let novos;
  const ok = await grava(async () => { novos = await S.store.addLancamentos([row]); });
  $("fOk").disabled = false;
  if (!ok) return;
  S.data.lancamentos.push(...novos);
  flash.style.color = "var(--good)";
  const kc = cartaoPorId(row.cartao_id || "");
  flash.textContent = `Lançado: ${row.descricao || row.categoria} · ${brl(row.valor)} em ${ddmm(data)}${mKey(data) !== S.mes ? " (outro mês)" : ""}.`
    + (kc ? ` ${row.parcelas > 1 ? `Em ${row.parcelas}x no ${kc.nome}: a primeira parcela vem` : `No ${kc.nome}: vem`} na fatura de ${nomeMes(mesDaFatura(kc, data))}.` : "");
  $("fValor").value = ""; $("fDesc").value = ""; $("fParc").value = "1";
  aposLancar(flash.textContent);
  render();
});
$("prev").onclick = () => { S.mes = addM(S.mes, -1); render(); };
$("next").onclick = () => { S.mes = addM(S.mes, 1); render(); };
$("hoje").onclick = () => { S.mes = mKey(hoje()); render(); };
document.querySelector(".tabs").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; S.tab = b.dataset.tab; render(); });
// Ao mudar a LARGURA da tela (girar o celular, redimensionar a janela), só os gráficos são redesenhados.
// Mudança de altura é ignorada: no celular ela acontece quando o teclado abre, e redesenhar a tela
// nesse momento apagaria o campo em que a pessoa está digitando.
let rt, larguraAtual = innerWidth;
addEventListener("resize", () => {
  if (innerWidth === larguraAtual) return;
  larguraAtual = innerWidth;
  clearTimeout(rt);
  rt = setTimeout(() => { if ($("app").hidden) return; const c = calcMes(S.data, S.mes, hoje()); renderCusto(c); renderCat(c); }, 150);
});

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
  const kNovos = res.cartoes.filter((z) => !S.data.cartoes.some((k) => norm(k.nome) === norm(z.nome)));
  const fxAtuais = new Set(S.data.fixos.map((z) => (z.tipo || "Despesa") + "|" + norm(z.descricao)));
  const fxNovos = res.fixos.filter((z) => !fxAtuais.has(z.tipo + "|" + norm(z.descricao)));
  const ccAtuais = new Set(S.data.faturas.map((z) => z.cartao + z.vencimento + z.valor));
  const ccNovos = res.faturas.filter((z) => !ccAtuais.has(z.cartao + z.vencimento + z.valor));
  const meses = [...new Set(novos.map((x) => mKey(x.data)))].sort();
  if (!novos.length && !fxNovos.length && !ccNovos.length && !kNovos.length) {
    return openDlg(`<h3>Nada novo para importar</h3><p>${res.lancamentos.length || res.fixos.length ? "Tudo o que está nessa planilha já foi lançado aqui." : "Não encontrei lançamentos nessa planilha. Ela precisa ter colunas de data, descrição e valor."}</p><div class="actions"><button class="btn" data-close>Fechar</button></div>`);
  }
  const plural = (n, s, p) => `${n} ${n > 1 ? p : s}`;
  openDlg(`<h3>Importar "${esc(f.name)}"</h3><p style="color:var(--ink-2);margin:0">Encontrei:</p><ul>
    ${novos.length ? `<li>${plural(novos.length, "lançamento", "lançamentos")} (${meses.map((m) => nomeMes(m) + "/" + m.slice(2, 4)).join(", ")})</li>` : ""}
    ${fxNovos.some((z) => z.tipo === "Despesa") ? `<li>${plural(fxNovos.filter((z) => z.tipo === "Despesa").length, "gasto fixo", "gastos fixos")}</li>` : ""}
    ${fxNovos.some((z) => z.tipo === "Receita") ? `<li>${plural(fxNovos.filter((z) => z.tipo === "Receita").length, "entrada fixa", "entradas fixas")}</li>` : ""}
    ${kNovos.length ? `<li>${plural(kNovos.length, "cartão", "cartões")}</li>` : ""}
    ${ccNovos.length ? `<li>${plural(ccNovos.length, "fatura de cartão", "faturas de cartão")}</li>` : ""}</ul>
    ${res.formato === "antigo" ? `<p class="hint">As categorias foram escolhidas pela descrição. Tudo entra como gasto do dia a dia; depois você pode cadastrar os fixos na aba Gastos fixos.</p>` : ""}
    <p class="hint">Lançamentos que já existem aqui são ignorados, então pode importar a mesma planilha de novo sem duplicar.</p>
    <div class="actions"><button class="btn primary" id="okImp">Importar</button><button class="btn" data-close>Cancelar</button></div>`);
  $("okImp").onclick = async () => {
    $("okImp").disabled = true; $("okImp").textContent = "Importando…";
    const ok = await grava(async () => {
      // Cartões primeiro: as compras e os fixos da planilha dizem o cartão pelo nome.
      for (const z of kNovos) S.data.cartoes.push(await S.store.addCartao({ nome: z.nome, fechamento: z.fechamento, vencimento: z.vencimento, ...(z.ativo ? {} : { ativo: false }) }));
      const idDe = (nome) => (nome ? S.data.cartoes.find((k) => norm(k.nome) === norm(nome))?.id || null : null), usados = new Set();
      let linhas = novos.map(({ cartao, parcelas, ...x }) => {
        const cartao_id = x.forma === CARTAO ? idDe(cartao) : null; if (cartao_id) usados.add(cartao_id);
        return { ...x, cartao_id, parcelas: cartao_id ? parcelas || 1 : 1 };
      });
      // Planilha sem nenhum cartão: as linhas vão sem os campos de cartão, como nas versões anteriores.
      if (!usados.size) linhas = linhas.map(({ cartao_id, parcelas, ...x }) => x);
      if (linhas.length) S.data.lancamentos.push(...(await S.store.addLancamentos(linhas)));
      const ano = (meses[meses.length - 1] || S.mes).slice(0, 4);
      for (const z of fxNovos) {
        const desde = z.mesesPagos.length ? `${ano}-${pad(Math.min(...z.mesesPagos))}-01` : S.mes + "-01";
        const kId = z.forma === CARTAO ? idDe(z.cartao) : null; if (kId) usados.add(kId);
        const novo = await S.store.addFixo({ tipo: z.tipo, descricao: z.descricao, categoria: z.categoria, dia: z.dia, valor: z.valor, forma: z.forma, desde, ate: z.ativo ? null : addM(S.mes, -1) + "-01",
          ...(z.repete === "semanal" ? { repete: "semanal", dia_semana: z.dia_semana } : {}), ...(kId ? { cartao_id: kId } : {}) });
        S.data.fixos.push(novo);
        for (const mm of z.mesesPagos) { const mes = `${ano}-${pad(mm)}-01`; await S.store.setPago(novo.id, mes, true); S.data.pagos.push({ fixo_id: novo.id, mes }); }
      }
      for (const z of ccNovos) S.data.faturas.push(await S.store.addFatura(z));
      // Fatura da planilha com o nome de um cartão cadastrado vale como o valor daquele mês (sem cobrar em dobro),
      // e as faturas calculadas que já venceram entram como pagas, para não aparecerem todas como atrasadas.
      for (const k of S.data.cartoes) await adotarFaturasManuais(k);
      if (usados.size) await quitarVencidas(usados);
      // Categorias que vieram na planilha passam a aparecer nos menus.
      const usadas = categoriasIniciais(S.data); let mudou = false;
      for (const t of ["Despesa", "Receita", "Reserva"]) {
        const novas = usadas[t].filter((c) => !cats(t).includes(c));
        if (novas.length) { S.prefs.categorias = { ...S.prefs.categorias, [t]: [...cats(t), ...novas] }; mudou = true; }
      }
      if (mudou) await S.store.savePrefs(S.prefs);
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

/* ================= editar ================= */
const TIPOS = [["Despesa", "Gasto"], ["Receita", "Entrada"], ["Reserva", "Guardado"]];
function editarLancamento(id) {
  const x = S.data.lancamentos.find((z) => z.id === id); if (!x) return;
  const catOpts = (tipo, atual) => { const l = cats(tipo); return opts(l.includes(atual) || !atual ? l : [atual, ...l], atual); };
  openDlg(`<h3>Editar lançamento</h3><form id="edForm" class="dlg-form" autocomplete="off">
    <label class="f">Tipo<select class="in" id="eTipo">${TIPOS.map(([v, r]) => `<option value="${v}"${v === x.tipo ? " selected" : ""}>${r}</option>`).join("")}</select></label>
    <label class="f">Valor (R$)<input class="in money" id="eValor" inputmode="decimal" required value="${esc(x.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 }))}"></label>
    <label class="f wide">Descrição<input class="in" id="eDesc" maxlength="80" value="${esc(x.descricao)}"></label>
    <label class="f"><span id="eCatLbl">Categoria</span><select class="in" id="eCat">${catOpts(x.tipo, x.categoria)}</select></label>
    <label class="f" id="eFormaWrap"><span id="eFormaLbl">Forma de pagamento</span><select class="in" id="eForma"></select></label>
    <label class="f" id="eCartaoWrap" hidden>Cartão<select class="in" id="eCartao">${optsCartao(x.cartao_id, cartaoPorId(x.cartao_id) ? "" : "Sem cartão escolhido")}</select></label>
    <label class="f" id="eParcWrap" hidden>Parcelas<select class="in" id="eParc">${optsParcelas(x.valor, x.parcelas || 1)}</select></label>
    <label class="f">Data<input class="in" type="date" id="eData" required value="${esc(x.data)}"></label>
    <p class="auth-msg err wide" id="edMsg"></p>
    <div class="actions wide"><button class="btn primary" type="submit">Salvar alteração</button><button class="btn" type="button" data-close>Cancelar</button></div></form>`);
  const sync = (atual) => {
    const t = $("eTipo").value, mov = t === "Reserva";
    $("eFormaWrap").hidden = t === "Receita";
    $("eFormaLbl").textContent = mov ? "Movimento" : "Forma de pagamento";
    $("eCatLbl").textContent = mov ? "Onde guardar" : "Categoria";
    $("eForma").innerHTML = mov ? opts(MOVS, atual === RETIRADA ? "Retirar" : "Guardar") : opts(FORMAS, atual);
    syncCartao();
  };
  // Cartão e parcelas só aparecem para gasto no cartão de crédito, e quando há cartão cadastrado.
  const noCartao = () => $("eTipo").value === "Despesa" && $("eForma").value === CARTAO && S.data.cartoes.length > 0;
  const syncCartao = () => { $("eCartaoWrap").hidden = !noCartao(); $("eParcWrap").hidden = !noCartao(); };
  $("eForma").onchange = syncCartao;
  $("eValor").oninput = () => { $("eParc").innerHTML = optsParcelas(parseMoney($("eValor").value), $("eParc").value); };
  $("eTipo").onchange = () => { $("eCat").innerHTML = catOpts($("eTipo").value, ""); sync(""); };
  sync(x.forma);
  $("edForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const v = parseMoney($("eValor").value);
    if (!(v > 0)) { $("edMsg").textContent = "Digite um valor maior que zero, por exemplo 25,90."; return; }
    const tipo = $("eTipo").value;
    const patch = { data: $("eData").value, descricao: $("eDesc").value.trim(), tipo, categoria: $("eCat").value,
      forma: formaDe(tipo, $("eForma").value), valor: round2(v), import_key: null,
      ...(S.data.cartoes.length || x.cartao_id ? { cartao_id: noCartao() ? $("eCartao").value || null : null, parcelas: noCartao() && $("eCartao").value ? Number($("eParc").value) || 1 : 1 } : {}) };
    if (await grava(() => S.store.updateLancamento(id, patch))) { Object.assign(x, patch); $("dlg").close(); render(); }
  });
}
/** Fatura: a lançada à mão pode ter tudo alterado; a calculada mostra as compras e deixa corrigir o valor. */
function editarFatura(x) {
  const valorTxt = (v) => esc(Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 }));
  const situacao = `<label class="f">Situação<select class="in" id="eSt"><option value="Aberta"${x.status !== "Paga" ? " selected" : ""}>Em aberto</option><option value="Paga"${x.status === "Paga" ? " selected" : ""}>Paga</option></select></label>`;
  if (!x.auto) {
    const f = S.data.faturas.find((z) => z.id === x.id); if (!f) return;
    openDlg(`<h3>Editar fatura</h3><form id="edForm" class="dlg-form" autocomplete="off">
      <label class="f wide">Cartão<input class="in" id="eNome" required maxlength="40" value="${esc(f.cartao)}"></label>
      <label class="f">Valor da fatura (R$)<input class="in money" id="eValor" inputmode="decimal" required value="${valorTxt(f.valor)}"></label>
      <label class="f">Vencimento<input class="in" type="date" id="eVenc" required value="${esc(f.vencimento)}"></label>
      ${situacao}
      <p class="auth-msg err wide" id="edMsg"></p>
      <div class="actions wide"><button class="btn primary" type="submit">Salvar alteração</button><button class="btn" type="button" data-close>Cancelar</button></div></form>`);
    $("edForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const v = parseMoney($("eValor").value);
      if (!(v > 0)) { $("edMsg").textContent = "Digite um valor maior que zero, por exemplo 350,00."; return; }
      const patch = { cartao: $("eNome").value.trim(), vencimento: $("eVenc").value, valor: round2(v), status: $("eSt").value };
      if (await grava(() => S.store.updateFatura(f.id, patch))) { Object.assign(f, patch); $("dlg").close(); render(); }
    });
    return;
  }
  const k = cartaoPorId(x.cartao_id), per = k ? periodoDaFatura(k, mKey(x.vencimento)) : null;
  openDlg(`<h3>Fatura ${esc(x.cartao)}</h3>
    <p class="hint" style="margin:0">Vence em ${ddmmaa(x.vencimento)}${per ? ` · compras de ${ddmm(per.de)} a ${ddmm(per.ate)}` : ""}</p>
    <ul class="itens">${x.itens.map((i) => `<li><span class="d">${ddmm(i.data)}</span><span>${esc(i.descricao)}${i.de > 1 ? ` <span class="tag">${i.parcela}/${i.de}</span>` : ""}${i.origem === "fixo" ? ` <span class="tag">fixo</span>` : ""}</span><b>${brl(i.valor)}</b></li>`).join("")
      || `<li><span></span><span style="color:var(--muted)">Nenhuma compra lançada nesta fatura.</span><b></b></li>`}
      <li class="tot"><span></span><span>Soma das compras</span><b>${brl(x.calculado)}</b></li></ul>
    <form id="edForm" class="dlg-form" autocomplete="off">
      <label class="f">Valor da fatura (R$)<input class="in money" id="eValor" inputmode="decimal" required value="${valorTxt(x.valor)}"></label>
      ${situacao}
      <p class="hint wide" style="margin:0">O banco cobrou outro valor (juros, anuidade, alguma compra que faltou lançar)? Corrija o valor acima: ele passa a valer no lugar da soma.${x.valor_fixo ? ` <button class="link" type="button" id="eVoltar">Voltar ao valor calculado</button>` : ""}</p>
      <p class="auth-msg err wide" id="edMsg"></p>
      <div class="actions wide"><button class="btn primary" type="submit">Salvar</button><button class="btn" type="button" data-close>Fechar</button></div></form>`);
  const salvar = async (valor, status) => {
    const fixo = Math.abs(valor - x.calculado) >= 0.005;
    // Sem compras e sem valor corrigido não sobra nada para guardar: o registro guarda o último valor válido.
    const patch = { status, valor_fixo: fixo, valor: fixo || x.calculado > 0 ? round2(valor) : x.valor };
    if (status === x.status && fixo === x.valor_fixo && patch.valor === x.valor) return $("dlg").close();
    if (await gravaFaturaAuto(x, patch)) { $("dlg").close(); render(); }
  };
  $("edForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const v = parseMoney($("eValor").value);
    if (!(v > 0)) { $("edMsg").textContent = "Digite um valor maior que zero, por exemplo 350,00."; return; }
    salvar(round2(v), $("eSt").value);
  });
  if ($("eVoltar")) $("eVoltar").onclick = () => {
    if (!(x.calculado > 0)) { $("edMsg").textContent = "Esta fatura não tem compras lançadas, então não há valor calculado para voltar."; return; }
    salvar(x.calculado, $("eSt").value);
  };
}
function editarCartao(id) {
  const k = cartaoPorId(id); if (!k) return;
  openDlg(`<h3>Editar cartão</h3><p class="hint">Os dias valem para todas as faturas deste cartão. As que já estão marcadas como pagas continuam pagas.</p><form id="edForm" class="dlg-form" autocomplete="off">
    <label class="f wide">Nome do cartão<input class="in" id="eNome" required maxlength="40" value="${esc(k.nome)}"></label>
    <label class="f">Dia que a fatura fecha<input class="in" id="eFech" type="number" inputmode="numeric" min="1" max="31" required value="${esc(k.fechamento)}"></label>
    <label class="f">Dia que a fatura vence<input class="in" id="eVenc" type="number" inputmode="numeric" min="1" max="31" required value="${esc(k.vencimento)}"></label>
    <p class="hint wide" style="margin:0">Compras feitas do dia do fechamento em diante entram na fatura seguinte.</p>
    <p class="auth-msg err wide" id="edMsg"></p>
    <div class="actions wide"><button class="btn primary" type="submit">Salvar alteração</button><button class="btn" type="button" data-close>Cancelar</button></div></form>`);
  $("edForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const dia = (el) => Math.min(31, Math.max(1, Math.round(Number($(el).value)) || 1)), nome = $("eNome").value.trim();
    if (S.data.cartoes.some((z) => z.id !== k.id && norm(z.nome) === norm(nome))) { $("edMsg").textContent = "Já existe outro cartão com esse nome."; return; }
    const patch = { nome, fechamento: dia("eFech"), vencimento: dia("eVenc") };
    if (await grava(() => S.store.updateCartao(k.id, patch))) { Object.assign(k, patch); $("dlg").close(); render(); }
  });
}
function editarFixo(id) {
  const f = S.data.fixos.find((z) => z.id === id); if (!f) return;
  const ent = f.tipo === "Receita", l = cats(ent ? "Receita" : "Despesa"), sem = f.repete === "semanal";
  // Se o fixo já contava em meses anteriores ao que está na tela, a pessoa escolhe desde quando a mudança vale.
  const temPassado = mKey(f.desde) < S.mes, mesTxt = `${nomeMes(S.mes)} de ${S.mes.slice(0, 4)}`;
  openDlg(`<h3>${ent ? "Editar entrada fixa" : "Editar gasto fixo"}</h3><form id="edForm" class="dlg-form" autocomplete="off">
    <label class="f wide">Descrição<input class="in" id="eDesc" required maxlength="60" value="${esc(f.descricao)}"></label>
    <label class="f">Valor (R$)<input class="in money" id="eValor" inputmode="decimal" required value="${esc(f.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 }))}"></label>
    ${sem ? `<label class="f">Dia da semana<select class="in" id="eSem">${DIAS_SEMANA.map((d, i) => `<option value="${i}"${i === Number(f.dia_semana) ? " selected" : ""}>${d}</option>`).join("")}</select></label>`
      : `<label class="f">${ent ? "Dia que recebe" : "Dia do vencimento"}<input class="in" id="eDia" type="number" min="1" max="31" required value="${esc(f.dia)}"></label>`}
    <label class="f">Categoria<select class="in" id="eCat">${opts(l.includes(f.categoria) ? l : [f.categoria, ...l], f.categoria)}</select></label>
    ${ent ? "" : `<label class="f">Pagamento<select class="in" id="eForma">${opts(FORMAS, f.forma)}</select></label>
    <label class="f" id="eCartaoWrap" hidden>Cartão<select class="in" id="eCartao">${optsCartao(f.cartao_id, cartaoPorId(f.cartao_id) ? "" : "Sem cartão escolhido")}</select></label>`}
    ${temPassado ? `<label class="f wide">A mudança vale<select class="in" id="eDesde">
        <option value="mes">De ${mesTxt} em diante</option>
        <option value="tudo">Em todos os meses, inclusive os anteriores</option></select></label>
      <p class="hint wide" style="margin:-6px 0 0">Na primeira opção, os meses anteriores ficam como estavam.</p>` : ""}
    <p class="auth-msg err wide" id="edMsg"></p>
    <div class="actions wide"><button class="btn primary" type="submit">Salvar alteração</button><button class="btn" type="button" data-close>Cancelar</button></div></form>`);
  const noCartao = () => !ent && $("eForma").value === CARTAO && S.data.cartoes.length > 0;
  if (!ent) { const sync = () => { $("eCartaoWrap").hidden = !noCartao(); }; $("eForma").onchange = sync; sync(); }
  $("edForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const v = parseMoney($("eValor").value);
    if (!(v > 0)) { $("edMsg").textContent = "Digite um valor maior que zero, por exemplo 350,00."; return; }
    const patch = { descricao: $("eDesc").value.trim(), categoria: $("eCat").value, valor: round2(v), forma: ent ? "" : $("eForma").value,
      ...(sem ? { dia_semana: Number($("eSem").value) } : { dia: Math.min(31, Math.max(1, Number($("eDia").value) || 1)) }),
      ...(ent || !S.data.cartoes.length ? {} : { cartao_id: noCartao() ? $("eCartao").value || null : null }) };
    if (!temPassado || $("eDesde").value === "tudo") {
      if (await grava(() => S.store.updateFixo(id, patch))) { Object.assign(f, patch); $("dlg").close(); render(); }
      return;
    }
    // Vale só daqui para a frente: encerra o fixo antigo no mês anterior e cria um novo a partir deste mês.
    const { encerra, novo } = novaVersaoDeFixo(f, patch, S.mes), corte = S.mes + "-01";
    const ok = await grava(async () => {
      const criado = await S.store.addFixo(novo);
      // Se não der para encerrar o antigo, desfaz o novo para não ficar contando em dobro.
      try { await S.store.updateFixo(f.id, encerra); } catch (err) { await S.store.deleteFixo(criado.id).catch(() => {}); throw err; }
      // O que já estava marcado como pago deste mês em diante acompanha o fixo novo.
      for (const pg of S.data.pagos.filter((z) => z.fixo_id === f.id && z.mes >= corte)) {
        await S.store.setPago(criado.id, pg.mes, true); await S.store.setPago(f.id, pg.mes, false); pg.fixo_id = criado.id;
      }
      Object.assign(f, encerra); S.data.fixos.push(criado);
    });
    $("dlg").close(); render();
    if (ok) toastOuFlash(`Alterado de ${mesTxt} em diante. Os meses anteriores continuam como estavam.`);
  });
}

/* ================= detalhes: tocar em um quadro ou em uma categoria mostra do que o valor é feito ================= */
const linhasDet = (l, vazio = "Nada por aqui neste mês.") => l.length
  ? `<ul class="itens">${l.map((i) => `<li><span class="d">${i.d}</span><span>${esc(i.t)}${i.tag ? ` <span class="tag ${i.tagCls || ""}">${esc(i.tag)}</span>` : ""}${i.s ? `<span class="mini">${esc(i.s)}</span>` : ""}</span><b class="${i.cls || ""}">${i.v}</b></li>`).join("")}</ul>`
  : `<p class="hint" style="margin:6px 0 10px">${vazio}</p>`;
/** Abre o quadro de detalhes. secoes: [{titulo?, total?, itens?, vazio?, html?}]; ir: [rótulo do botão, aba para abrir]. */
function abreDetalhe(titulo, sub, secoes, ir) {
  openDlg(`<h3>${titulo}</h3>${sub ? `<p class="hint" style="margin:0 0 4px;font-size:13px">${sub}</p>` : ""}
    <div class="det">${secoes.map((s) => `${s.titulo ? `<h4><span>${s.titulo}</span><b>${s.total ?? ""}</b></h4>` : ""}${s.html ?? linhasDet(s.itens, s.vazio)}`).join("")}</div>
    <div class="actions">${ir ? `<button class="btn primary" type="button" id="detIr">${ir[0]}</button>` : ""}<button class="btn" type="button" data-close>Fechar</button></div>`);
  if (ir) $("detIr").onclick = () => { $("dlg").close(); S.view = "listas"; S.tab = ir[1]; render(); noCelular() ? scrollTo(0, 0) : $("listas").scrollIntoView({ block: "start" }); };
}
const porData = (a, b) => a.data.localeCompare(b.data);
const origemTxt = (i) => i.origem === "cartao" ? `na fatura do ${i.cartao}` : i.origem === "fixo" ? `gasto fixo${i.forma ? " · " + i.forma : ""}` : i.origem === "fatura" ? "fatura de cartão" : i.forma || "";
const linhaCusto = (i) => ({ d: ddmm(i.data), t: i.descricao, tag: i.de > 1 ? `${i.parcela}/${i.de}` : "", s: [i.categoria, origemTxt(i)].filter(Boolean).join(" · "), v: brl(i.valor) });

function detalheKpi(tipo) {
  if (!S.loaded) return;
  const hj = hoje(), c = calcMes(S.data, S.mes, hj), mes = nomeMes(S.mes);
  if (tipo === "entradas") {
    const l = [...c.fr.map((f) => ({ data: f.data, t: f.descricao, s: f.categoria + " · entrada fixa", valor: f.valor,
        tag: c.fase === "futuro" || (c.fase === "atual" && f.data > hj) ? "a receber" : "" })),
      ...c.it.filter((x) => x.tipo === "Receita").map((x) => ({ data: x.data, t: x.descricao || x.categoria, s: x.categoria, valor: x.valor, tag: "" }))].sort(porData);
    return abreDetalhe(`Entradas de ${mes}`, `Total do mês: <b>${brl(c.rec)}</b>${c.frAReceber ? ` · ${brl(c.frAReceber)} ainda a receber` : ""}`,
      [{ itens: l.map((i) => ({ d: ddmm(i.data), t: i.t, tag: i.tag, s: i.s, v: "+ " + brl(i.valor), cls: "pos" })), vazio: "Nenhuma entrada neste mês." }], ["Ver nos lançamentos", "l"]);
  }
  if (tipo === "custo") {
    const it = itensDoCusto(c), de = (o) => it.filter((i) => i.origem === o).sort(porData).map(linhaCusto);
    return abreDetalhe(`Custo de ${mes}`, `Total: <b>${brl(c.custo)}</b>${c.fase === "atual" ? ` · previsão de fechar em ${brl0(c.proj)}` : ""}`, [
      { titulo: "Gastos do dia a dia", total: brl(c.vari), itens: de("gasto"), vazio: "Nenhum gasto lançado fora do cartão." },
      { titulo: "Gastos fixos", total: brl(c.fxCusto), itens: de("fixo"), vazio: "Nenhum gasto fixo fora do cartão." },
      { titulo: "Faturas de cartão", total: brl(c.fatT), itens: c.fat.map(linhaFaturaDet(hj)), vazio: "Nenhuma fatura vence neste mês." }], ["Ver nos lançamentos", "l"]);
  }
  if (tipo === "saldo") {
    const ini = Number(S.prefs.saldoInicial) || 0, ant = S.prefs.levarSaldo ? saldoAnterior(S.data, S.mes, hj, S.prefs.saldoDesde) : 0;
    const acum = S.prefs.levarSaldo ? saldoAcumulado(S.data, S.mes, hj, { desde: S.prefs.saldoDesde, inicial: ini }) : c.saldo, iniVale = round2(acum - ant - c.saldo);
    const li = (t, v, forte = false) => `<li class="${forte ? "tot" : ""}"><span></span><span>${t}</span><b>${v}</b></li>`;
    return abreDetalhe(`Saldo de ${mes}`, "Entradas menos o custo do mês e menos o que você guardou.", [
      { html: `<ul class="itens">${li("Entradas", "+ " + brl(c.rec))}${li("Custo do mês", "− " + brl(c.custo))}${c.res ? li(c.res > 0 ? "Guardado neste mês" : "Retirado do guardado", (c.res > 0 ? "− " : "+ ") + brl(Math.abs(c.res))) : ""}${li("Saldo do mês", sgn(c.saldo), true)}</ul>` },
      ...(S.prefs.levarSaldo ? [{ titulo: "Saldo acumulado", total: sgn(acum),
        html: `<ul class="itens">${iniVale ? li("Saldo inicial", sgn(iniVale)) : ""}${li("Saldo dos meses anteriores", sgn(ant))}${li(`Saldo de ${mes}`, sgn(c.saldo))}${li("Saldo acumulado", sgn(acum), true)}</ul>` }] : [])]);
  }
  if (tipo === "guardado") {
    const dest = guardadoPorDestino(S.data, S.mes), mov = c.it.filter((x) => x.tipo === "Reserva").sort(porData);
    return abreDetalhe("Dinheiro guardado", `Total até ${mes}: <b>${brl(reservaAcumulada(S.data, S.mes))}</b>`, [
      { titulo: "Onde está", itens: dest.map(([k, v]) => ({ d: "", t: k, v: brl(v) })), vazio: "Nada guardado até aqui." },
      { titulo: `Movimentos de ${mes}`, total: sgn(c.res), itens: mov.map((x) => ({ d: ddmm(x.data), t: x.descricao || x.categoria, s: x.categoria,
          tag: x.forma === RETIRADA ? "retirou" : "guardou", v: (x.forma === RETIRADA ? "− " : "+ ") + brl(x.valor), cls: "res" })), vazio: "Nada guardado nem retirado neste mês." }], ["Ver nos lançamentos", "l"]);
  }
  if (tipo === "fixos") {
    const st = (f) => f.forma === CARTAO ? ["na fatura", ""] : c.pagosSet.has(f.id + "|" + f.chave) ? ["pago", "ok"] : f.data < hj ? ["atrasado", "bad"] : ["a pagar", ""];
    return abreDetalhe(`Gastos fixos de ${mes}`, `Total: <b>${brl(c.fxT)}</b>${c.fxPend ? ` · ${brl(c.fxPend)} ainda a pagar` : ""}`,
      [{ itens: c.fx.map((f) => ({ d: ddmm(f.data), t: f.descricao, tag: st(f)[0], tagCls: st(f)[1], s: f.categoria + (f.forma ? " · " + pagoCom({ ...f, parcelas: 1 }) : ""), v: brl(f.valor) })),
        vazio: "Nenhum gasto fixo neste mês." }], ["Abrir gastos fixos", "f"]);
  }
  if (tipo === "faturas") {
    const compras = c.it.filter((x) => x.tipo === "Despesa" && x.forma === CARTAO).sort(porData), tot = round2(c.comprasCartao + c.fxCartao);
    const fixosCc = c.fx.filter((f) => f.forma === CARTAO).map((f) => ({ d: ddmm(f.data), t: f.descricao, tag: "fixo", s: f.categoria + " · " + pagoCom({ ...f, parcelas: 1 }), v: brl(f.valor) }));
    return abreDetalhe(`Faturas de ${mes}`, `Vencem neste mês: <b>${brl(c.fatT)}</b>${c.fatAberta ? ` · ${brl(c.fatAberta)} ainda a pagar` : ""}`, [
      { itens: c.fat.map(linhaFaturaDet(hj)), vazio: "Nenhuma fatura vence neste mês." },
      { titulo: "Compras no cartão neste mês", total: brl(tot), itens: [...compras.map((x) => ({ d: ddmm(x.data), t: x.descricao || x.categoria, s: x.categoria + " · " + pagoCom(x), v: brl(x.valor) })), ...fixosCc],
        vazio: "Nenhuma compra no cartão neste mês." }], ["Abrir cartões", "c"]);
  }
}
const linhaFaturaDet = (hj) => (f) => ({ d: ddmm(f.vencimento), t: `Fatura ${f.cartao}`, v: brl(f.valor),
  tag: f.status === "Paga" ? "paga" : f.vencimento < hj ? "atrasada" : "em aberto", tagCls: f.status === "Paga" ? "ok" : f.vencimento < hj ? "bad" : "",
  s: f.auto ? `${f.itens.length} ${f.itens.length === 1 ? "compra" : "compras"}${f.valor_fixo ? " · valor corrigido" : ""}` : "lançada à mão" });

/** Gastos de uma categoria no mês: o que aparece na barra do gráfico "Por categoria". */
function detalheCategoria(nome) {
  const c = calcMes(S.data, S.mes, hoje()), l = itensDoCusto(c).filter((i) => i.categoria === nome).sort(porData);
  const total = round2(l.reduce((t, i) => t + i.valor, 0));
  abreDetalhe(`${esc(nome)} em ${nomeMes(S.mes)}`, `Total: <b>${brl(total)}</b>${c.custo ? ` · ${Math.round((total / c.custo) * 100)}% do custo do mês` : ""} · ${l.length} ${l.length === 1 ? "item" : "itens"}`,
    [{ itens: l.map((i) => ({ ...linhaCusto(i), s: origemTxt(i) })) }], ["Ver nos lançamentos", "l"]);
}
$("kpis").addEventListener("click", (e) => { const k = e.target.closest("[data-det]"); if (k) detalheKpi(k.dataset.det); });
$("kpis").addEventListener("keydown", (e) => { const k = e.target.closest("[data-det]"); if (k && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); detalheKpi(k.dataset.det); } });

/* ================= ajustes e boas-vindas ================= */
const suporteHtml = () => {
  if (!SUPORTE_CONTATO) return "";
  const link = /^https?:/.test(SUPORTE_CONTATO);
  return `<p class="hint" style="margin:0">Precisa de ajuda? ${link ? `<a href="${esc(SUPORTE_CONTATO)}" target="_blank" rel="noopener">Fale com o suporte</a>` : `Escreva para <b style="user-select:all">${esc(SUPORTE_CONTATO)}</b>`}.</p>`;
};
function ajustes() {
  const first = primeiroMes(S.data) || mKey(hoje()), cur = mKey(hoje()), meses = [];
  for (let m = first, i = 0; m <= cur && i < 120; m = addM(m, 1), i++) meses.push(m);
  const desde = S.prefs.saldoDesde && meses.includes(S.prefs.saldoDesde) ? S.prefs.saldoDesde : first;
  const ini = Number(S.prefs.saldoInicial) || 0;
  const bloco = (tipo, titulo) => `<div class="aj-sec"><h4>${titulo}</h4><div class="chips">${
    cats(tipo).map((c) => `<span class="chip">${esc(c)}<button type="button" data-rm="${esc(c)}" data-tipo="${tipo}" aria-label="Remover ${esc(c)}">✕</button></span>`).join("")}</div>
    <form class="aj-add" data-add="${tipo}" autocomplete="off"><input class="in" maxlength="30" placeholder="${tipo === "Reserva" ? "Novo destino" : "Nova categoria"}" aria-label="Adicionar em ${titulo.toLowerCase()}"><button class="btn" type="submit">Adicionar</button></form></div>`;
  openDlg(`<h3>Ajustes</h3>
    ${bloco("Despesa", "Categorias de gasto")}${bloco("Receita", "Categorias de entrada")}${bloco("Reserva", "Onde você guarda dinheiro")}
    <p class="hint" style="margin:-4px 0 0">Remover uma categoria não apaga os lançamentos que já usam ela.</p>
    <div class="aj-sec"><h4>Saldo</h4>
      <label class="check"><input type="checkbox" id="ajLevar" ${S.prefs.levarSaldo ? "checked" : ""}> Levar o saldo de um mês para o outro</label>
      <div id="ajDesdeWrap" class="aj-saldo" ${S.prefs.levarSaldo ? "" : "hidden"}>
        <label class="f">Começar a contar em<select class="in" id="ajDesde">${meses.map((m) => `<option value="${m}"${m === desde ? " selected" : ""}>${nomeMes(m)} de ${m.slice(0, 4)}</option>`).join("")}</select></label>
        <label class="f">Saldo inicial: quando começou, você<select class="in" id="ajIniSinal"><option value="1">tinha este valor na conta</option><option value="-1"${ini < 0 ? " selected" : ""}>estava devendo este valor</option></select></label>
        <label class="f">Valor do saldo inicial (R$)<input class="in money" id="ajIni" inputmode="decimal" placeholder="0,00" value="${ini ? esc(Math.abs(ini).toLocaleString("pt-BR", { minimumFractionDigits: 2 })) : ""}"></label>
        <p class="hint" style="margin:0" id="ajIniMsg">O saldo inicial entra no saldo acumulado. Deixe em branco para começar do zero.</p>
      </div>
    </div>
    ${S.store.kind === "supabase" ? `<div class="aj-sec"><h4>Avisos de contas</h4>
      <p class="hint" style="margin:0">De manhã, só nos dias em que houver conta atrasada ou vencendo em até 3 dias.</p>
      <label class="check"><input type="checkbox" id="ajEmail" ${S.prefs.avisos?.email !== false ? "checked" : ""}> Receber por e-mail (${esc($("whoName").textContent)})</label>
      <label class="check"><input type="checkbox" id="ajPush" ${pushDisponivel() ? "" : "disabled"}> Receber notificação neste aparelho</label>
      <p class="hint" style="margin:0" id="ajPushMsg">${pushDisponivel() ? "" : "Neste aparelho a notificação só funciona com o app instalado. No iPhone: Compartilhar → Adicionar à Tela de Início, e abra o app por lá."}</p>
      <button class="btn" type="button" id="ajTeste" style="justify-self:start">Enviar um aviso de teste agora</button>
    </div>` : ""}
    <div class="aj-sec"><button class="link" type="button" id="ajBV">Ver as boas-vindas de novo</button>${suporteHtml()}</div>
    <div class="actions"><button class="btn primary" data-close>Pronto</button></div>`);
  const body = $("dlgBody");
  body.querySelectorAll("[data-rm]").forEach((b) => (b.onclick = async () => {
    const t = b.dataset.tipo, l = cats(t);
    if (l.length <= 1) return;
    S.prefs.categorias = { ...S.prefs.categorias, [t]: l.filter((c) => c !== b.dataset.rm) };
    await salvaPrefs(); render(); ajustes();
  }));
  body.querySelectorAll("[data-add]").forEach((f) => f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const t = f.dataset.add, nome = f.querySelector("input").value.trim(), l = cats(t);
    if (!nome || l.some((c) => norm(c) === norm(nome))) { f.querySelector("input").focus(); return; }
    S.prefs.categorias = { ...S.prefs.categorias, [t]: [...l, nome] };
    await salvaPrefs(); render(); ajustes();
  }));
  $("ajLevar").onchange = async (e) => { S.prefs.levarSaldo = e.target.checked; $("ajDesdeWrap").hidden = !e.target.checked; await salvaPrefs(); render(); };
  $("ajDesde").onchange = async (e) => { S.prefs.saldoDesde = e.target.value; await salvaPrefs(); render(); };
  const salvaIni = async () => {
    const txt = $("ajIni").value.trim(), v = txt ? Math.abs(parseMoney(txt.replace("−", "-"))) : 0;
    if (!isFinite(v)) { $("ajIniMsg").textContent = "Digite só o valor, por exemplo 1.500,00."; $("ajIniMsg").style.color = "var(--bad)"; return; }
    S.prefs.saldoInicial = round2(v * Number($("ajIniSinal").value));
    $("ajIniMsg").style.color = ""; $("ajIniMsg").textContent = v ? `Saldo inicial salvo: ${sgn(S.prefs.saldoInicial)}.` : "O saldo inicial entra no saldo acumulado. Deixe em branco para começar do zero.";
    await salvaPrefs(); render();
  };
  $("ajIni").onchange = salvaIni; $("ajIniSinal").onchange = salvaIni;
  $("ajBV").onclick = boasVindas;
  if ($("ajEmail")) ligaAjustesDeAvisos();
}
/* ================= avisos: e-mail e notificação no celular ================= */
// O servidor (supabase/functions/avisos) manda os avisos de manhã. Aqui a pessoa escolhe o que quer receber.
const AVISOS_URL = SUPABASE_URL ? SUPABASE_URL.replace(/\/$/, "") + "/functions/v1/avisos" : "";
const pushDisponivel = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
const b64ParaBytes = (b) => Uint8Array.from(atob(b.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(b.length / 4) * 4, "=")), (c) => c.charCodeAt(0));
async function inscricaoPush() { return pushDisponivel() ? (await navigator.serviceWorker.ready).pushManager.getSubscription() : null; }
/** Pede a permissão, inscreve este aparelho e guarda a inscrição para o servidor de avisos. */
async function ligarPush() {
  if (!pushDisponivel()) throw new Error("Este aparelho não aceita notificações pelo navegador.");
  if ((await Notification.requestPermission()) !== "granted") throw new Error("A permissão de notificação foi negada. Libere nas configurações do navegador para este site e tente de novo.");
  const r = await fetch(AVISOS_URL, { headers: { apikey: SUPABASE_ANON_KEY } }), j = await r.json().catch(() => ({}));
  if (!r.ok || !j.chavePublica) throw new Error("O servidor de avisos ainda não está no ar. Tente de novo mais tarde.");
  const reg = await navigator.serviceWorker.ready;
  // Se já havia uma inscrição com outra chave, começa de novo.
  const antiga = await reg.pushManager.getSubscription(); if (antiga) await antiga.unsubscribe();
  const sub = (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ParaBytes(j.chavePublica) })).toJSON();
  await S.store.salvaPush({ endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth });
}
async function desligarPush() {
  const sub = await inscricaoPush(); if (!sub) return;
  if (S.store?.removePush) await S.store.removePush(sub.endpoint).catch(() => {});
  await sub.unsubscribe();
}
function ligaAjustesDeAvisos() {
  const msg = (t, erro = false) => { $("ajPushMsg").textContent = t; $("ajPushMsg").style.color = erro ? "var(--bad)" : ""; };
  inscricaoPush().then((sub) => { if ($("ajPush")) $("ajPush").checked = Boolean(sub) && Notification.permission === "granted"; }).catch(() => {});
  $("ajEmail").onchange = async (e) => { S.prefs.avisos = { ...S.prefs.avisos, email: e.target.checked }; await salvaPrefs(); };
  $("ajPush").onchange = async (e) => {
    const cx = e.target; cx.disabled = true;
    try {
      if (cx.checked) { await ligarPush(); msg("Notificações ligadas neste aparelho."); }
      else { await desligarPush(); msg("Notificações desligadas neste aparelho."); }
    } catch (err) { cx.checked = !cx.checked; msg(/relation|schema cache|avisos_push/i.test(String(err?.message)) ? "Os avisos ainda não foram ligados no banco de dados (arquivo supabase/avisos.sql)." : String(err?.message || err), true); }
    cx.disabled = false;
  };
  $("ajTeste").onclick = async () => {
    const b = $("ajTeste"); b.disabled = true; msg("Enviando o aviso de teste…");
    try {
      const r = await fetch(AVISOS_URL, { method: "POST", headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + (await S.store.token()) }, body: JSON.stringify({ teste: true }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.erro || "O servidor de avisos ainda não está no ar.");
      const email = j.email === "enviado" ? "E-mail enviado (olhe também o spam)." : j.email === "desligado" ? "E-mail desligado." : j.email === "não configurado" ? "E-mail ainda não configurado no servidor." : "O e-mail não saiu: " + j.email;
      const push = j.push.aparelhos ? `Notificação enviada para ${j.push.entregues} de ${j.push.aparelhos} ${j.push.aparelhos === 1 ? "aparelho" : "aparelhos"}.` : "Nenhum aparelho com notificação ligada.";
      msg(`${email} ${push}`, /não saiu/.test(email));
    } catch (err) { msg(/fetch|network/i.test(String(err?.message)) ? "Não consegui falar com o servidor de avisos. Confira a internet." : String(err?.message || err), true); }
    b.disabled = false;
  };
}
/** Convite, uma vez por aparelho, para ligar as notificações (só para quem já tem contas cadastradas). */
function conviteAvisos() {
  if (S.store?.kind !== "supabase" || !pushDisponivel() || Notification.permission !== "default") return;
  if (!S.data.fixos.length && !S.data.faturas.length && !S.data.cartoes.length) return;
  try { if (localStorage.getItem("cg-convite-avisos")) return; localStorage.setItem("cg-convite-avisos", "1"); } catch { return; }
  showBanner("Quer ser avisado no celular quando uma conta estiver para vencer?", [
    ["Ativar avisos", async () => { try { await ligarPush(); showBanner(""); toastOuFlash("Avisos ligados neste aparelho. Dá para mudar em Ajustes."); } catch (e) { showBanner(String(e?.message || e)); } }],
    ["Agora não", () => showBanner("")]]);
}

function boasVindas() {
  openDlg(`<h3>Bem-vindo ao Meus Gastos</h3><p style="color:var(--ink-2);margin:0 0 10px">Em poucos passos você passa a ver quanto o seu mês vai custar.</p>
    <ol class="passos">
      <li><b>Cadastre o que é fixo.</b> Gastos como aluguel, internet e parcelas, e entradas como o salário. Eles entram sozinhos em todo mês.</li>
      <li><b>Lance cada gasto na hora.</b> Valor, descrição e categoria, pelo formulário no topo. Entradas também.</li>
      <li><b>Registre o que você guarda.</b> Reserva de emergência, investimentos ou outro destino. Esse dinheiro sai do saldo e fica somado em um quadro separado.</li>
      <li><b>Cadastre seu cartão de crédito.</b> Com o dia em que a fatura fecha e o dia em que vence, o app monta a fatura sozinho, com as parcelas. A compra só pesa no mês em que a fatura vence.</li>
      <li><b>Acompanhe o mês.</b> O app mostra o custo até agora, quanto o mês deve fechar e para onde o dinheiro está indo.</li>
    </ol>
    <p class="hint">Já controla em planilha? Use <b>Importar Excel</b> para trazer seus lançamentos. Em <b>Ajustes</b> você muda as categorias e informa quanto já tinha na conta quando começou (saldo inicial).</p>
    ${suporteHtml()}
    <div class="actions"><button class="btn primary" id="bvFixos">Cadastrar meus fixos</button><button class="btn" data-close>Começar a lançar</button></div>`);
  const visto = () => { if (!S.prefs.boasVindas) { S.prefs.boasVindas = true; salvaPrefs(); } };
  $("bvFixos").onclick = () => { $("dlg").close(); S.view = "listas"; S.tab = "f"; render(); $("xDesc")?.focus(); };
  $("dlg").addEventListener("close", visto, { once: true });
}
$("btnAjustes").onclick = ajustes;

/* ================= PWA ================= */
let installEvt = null;
addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installEvt = e; $("btnInstall").hidden = false; });
$("btnInstall").onclick = async () => { if (!installEvt) return; installEvt.prompt(); await installEvt.userChoice; installEvt = null; $("btnInstall").hidden = true; };
if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});

addEventListener("load", boot);
