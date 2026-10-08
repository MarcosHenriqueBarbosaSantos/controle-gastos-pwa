// Tela do app: entrada, lançamento rápido, indicadores, gráficos e abas.
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPORTE_CONTATO, LINK_COMPRA, PRECO_PLANO } from "./config.js";
import { CATS_PADRAO, RETIRADA, FORMAS, MESES, MES3, pad, toISO, mKey, addM, parseMoney, round2, calcMes, catMap, custoAcumulado,
  categoriasIniciais, primeiroMes, saldoAnterior, itensDoCusto, reservaAcumulada, guardadoPorDestino, comprasCartaoPorCategoria, proximosVencimentos, avisosDeHoje, CARTAO, DIAS_SEMANA, DIAS3, diaDaSemana,
  faturasAte, faturasDoMes, raioX, livrePorDia, sequenciaDeDias, gastoDoDia, comparaComMesAnterior, usoDosLimites, usoDoTeto, primeirosPassos, semCartaoNoMes, novaVersaoDeFixo, saldoAcumulado, mesDaFatura, valorDasParcelas, periodoDaFatura,
  andamentoDaMeta, metasEmAndamento, sugestaoDaMeta, combinadosDoMes , buscaLancamentos, maisUsados, categoriaAprendida, ultimoParecido, descricoesParecidas, ultimosMeses, comparaCategorias , calendarioDoMes, estadoDoMes, sobraDoMes, mesDaVez, lancamentoRepetido, fixoRepetido, repetidosDoMes, chaveDoPar,
  comumDoCasal, juntaPrefsDoCasal, apelidoDoEmail, divisaoDoMes, ocorrencias, vezesNoPrazo, restanteDoPrazo, prazosEmAndamento } from "./calc.js";
import { createSupabaseStore, createLocalStore, demoSeed, comFila } from "./store.js";
import { buildWorkbook, norm, guessCat } from "./excel.js";
import { lerImagem, lerPdf, ehPdf, interpretaTexto } from "./leitor.js";
import { entendeFala } from "./voz.js";
import { interpretaQr, criaLeitorDeCodigos, codigosDaImagem, leituraDaNota, itensEmTexto } from "./qr.js";
import { leExtrato, decodifica, ehExtrato, ehPlanilha, faturaProvavel, dataNaFatura, comChaves } from "./extrato.js";

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

/* Ícones: desenhados em linha, herdam a cor do texto. */
const ICO = {
  camera: "M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
  imagem: "M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM3.5 17l5-5 4 4 3-3 5 5M15.5 9.5h.01",
  ajustes: "M4 7h9M17 7h3M4 17h3M11 17h9M13 5v4M7 15v4",
  subir: "M12 16V4M7 9l5-5 5 5M4 20h16",
  qr: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2.5v2.5H14zM17.5 17.5H20V20h-2.5zM14 20v-1M20 14v1",
  baixar: "M12 4v12M7 11l5 5 5-5M4 20h16",
  instalar: "M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM12 8v7M9 12l3 3 3-3",
  sair: "M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5M15 8l4 4-4 4M19 12H9",
  editar: "M4 20h4L19 9l-4-4L4 16zM13 7l4 4",
  x: "M6 6l12 12M18 6L6 18",
  lixo: "M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13M10 11v6M14 11v6",
  chev: "M9 6l6 6-6 6",
  entra: "M17 7L7 17M7 9v8h8",
  saldo: "M12 4v16M5 8h14M5 8l-2.5 6a2.7 2.7 0 0 0 5 0zM19 8l-2.5 6a2.7 2.7 0 0 0 5 0zM8 20h8",
  cofre: "M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6zM9 12l2 2 4-4",
  fixo: "M4 9a8 8 0 0 1 14-4l2 2M20 4v4h-4M20 15a8 8 0 0 1-14 4l-2-2M4 20v-4h4",
  cartao: "M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 10h18M7 15h3",
  luz: "M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z",
  dia: "M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM4 10h16M8 3v4M16 3v4M12 13v4M10 15h4",
  rumo: "M4 17l5-5 4 3 7-8M15 7h5v5",
  ok: "M5 12.5l4.5 4.5L19 7.5",
  fogo: "M12 3c1 3 4 4.5 4 8.5a4 4 0 0 1-8 0c0-1.2.4-2.2 1-3 .3 1.2 1 2 2 2.3C10.5 8.5 11 5.5 12 3zM7 14a5 5 0 0 0 10 0",
  alvo: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01",
  ajuda: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.6 9.4a2.5 2.5 0 1 1 3.6 2.3c-.8.4-1.2.9-1.2 1.8M12 17h.01",
  pessoa: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0",
  lupa: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-3.7-3.7",
  agenda: "M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM4 10h16M8 4v4M16 4v4",
  esq: "M15 6l-6 6 6 6", dir: "M9 6l6 6-6 6",
  casal: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.2a3.5 3.5 0 0 1 0 6.6M17.5 14.2A6.5 6.5 0 0 1 21.5 20",
  sobe: "M12 19V6M6.5 11.5 12 6l5.5 5.5", desce: "M12 5v13M6.5 12.5 12 18l5.5-5.5",
  mais: "M12 5v14M5 12h14",
  mic: "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3",
  olhoFechado: "M3 3l18 18M10.6 6.1A10 10 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3 3.6M6.6 6.6A17 17 0 0 0 2.5 12S6 18 12 18a9.6 9.6 0 0 0 4.4-1M9.9 9.9a3 3 0 0 0 4.2 4.2",
  olho: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
};
const ico = (n) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICO[n]}"/></svg>`;

/* Cada categoria tem sempre a mesma cor: no gráfico, na lista e nos detalhes. */
const PALETA = ["#4f97ec", "#34c8a8", "#f2b94b", "#ec7fa2", "#9b8cf2", "#f08a4b", "#5cc8e8", "#8ccf5a", "#d67bd6", "#7fa0c4", "#e56b6b", "#c9b458"];
function corCat(nome) {
  let i = CATS_PADRAO.Despesa.indexOf(nome);
  if (i < 0) { i = 0; for (const ch of String(nome)) i = (i * 31 + ch.codePointAt(0)) >>> 0; }
  return PALETA[i % PALETA.length];
}
const suave = (hex, a = 0.18) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
/** Marca redonda ao lado de cada linha: a inicial da categoria, ou um ícone para entrada, guardado e cartão. */
function ava(nome, tipo = "Despesa") {
  if (tipo === "Receita") return `<span class="ava in">${ico("entra")}</span>`;
  if (tipo === "Reserva") return `<span class="ava res">${ico("cofre")}</span>`;
  if (tipo === "Cartao") return `<span class="ava card">${ico("cartao")}</span>`;
  const c = corCat(nome);
  return `<span class="ava" style="--c:${c};--cs:${suave(c)}" aria-hidden="true">${esc(String(nome || "?").trim().charAt(0).toUpperCase())}</span>`;
}

const S = {
  mes: mKey(hoje()), tipo: "Despesa", tab: "l", view: "inicio",   // view só vale no celular: "inicio" ou "listas"
  data: { lancamentos: [], fixos: [], pagos: [], faturas: [], cartoes: [] },
  store: null, client: null, loaded: false,
  prefs: prefsPadrao(),
};
function prefsPadrao() { return { categorias: null, levarSaldo: true, saldoDesde: null, saldoInicial: 0, boasVindas: false, avisos: { email: true }, limites: {}, semGasto: [], teto: 0, metas: {}, guia: { fechado: false, semRenda: false, semCartao: false } }; }
/** Categorias disponíveis para um tipo: as da pessoa, ou as padrão. */
function cats(tipo) {
  return S.prefs.categorias?.[tipo]?.length ? S.prefs.categorias[tipo] : CATS_PADRAO[tipo];
}
const noCelular = () => matchMedia("(max-width:700px)").matches;
const salvaPrefs = () => grava(async () => { await S.store.savePrefs(S.prefs); await salvaCasal(); });
/* Contas com data para acabar (acerto, acordo, parcelamento): o fixo ganha um último mês. */
const vezesTxt = (n) => `${n} ${n === 1 ? "vez" : "vezes"}`;
/**
 * Opções do seletor "vai até": sem data para acabar e, em seguida, cada mês a partir do começo.
 * Com `contar`, cada mês diz quantas vezes dá até ali (é assim que a pessoa escolhe também pelo número de parcelas).
 */
/**
 * As opções do "Vai até": a quantidade de vezes vem primeiro ("36 vezes · até setembro de 2029"), para quem pensa em parcelas.
 * Ao editar um fixo que já começou, `de` é o mês na tela: a conta é do total, e mostra quantas faltam a partir dali.
 */
function opcoesDePrazo(base, atual = "", de = mKey(base.desde)) {
  const meses = Array.from({ length: 120 }, (_, i) => addM(de, i)); if (atual && !meses.includes(atual)) { meses.push(atual); meses.sort(); }
  const antes = de > mKey(base.desde) ? vezesNoPrazo({ ...base, ate: null }, addM(de, -1)) : 0;
  let n = antes;
  return `<option value="">Sem data para acabar</option>` + meses.map((m) => {
    n += ocorrencias([{ ...base, ate: null }], m, base.tipo || "Despesa").length;
    return `<option value="${m}"${m === atual ? " selected" : ""}>${vezesTxt(n)}${antes ? ` (faltam ${n - antes})` : ""} · até ${mesAno(m)}</option>`;
  }).join("");
}
/** O campo "Quantas vezes?" escolhe o mês no "Vai até"; e o "Vai até" escolhido mostra quantas vezes. */
function ligaVezes(campo, sel, base) {
  campo.oninput = () => {
    const n = Math.round(Number(campo.value.replace(/\D/g, ""))), m = n >= 1 ? mesDaVez(base(), n) : "";
    if (m && [...sel.options].some((o) => o.value === m)) { sel.value = m; sel.dispatchEvent(new Event("change")); }
    else if (!campo.value) { sel.value = ""; sel.dispatchEvent(new Event("change")); }
  };
  const mostra = () => { if (document.activeElement !== campo) campo.value = sel.value ? String(vezesNoPrazo({ ...base(), ate: null }, sel.value)) : ""; };
  sel.addEventListener("change", mostra); mostra();
}
/** "até mar/27": marca curta do fim do prazo. */
const ateCurto = (iso) => `até ${MES3[Number(iso.slice(5, 7)) - 1].toLowerCase()}/${iso.slice(2, 4)}`;
/** Ao marcar como paga a última vez de uma conta com prazo, o app avisa que acabou. */
function fimDoPrazo(id, chave) {
  const f = S.data.fixos.find((z) => z.id === id); if (!f?.ate || mKey(f.ate) !== mKey(chave)) return "";
  const r = restanteDoPrazo(S.data, f, f.desde);   // desde o começo: só terminou se não ficou nenhuma para trás
  return r && r.vezes === 0 ? `${f.descricao}: essa foi a última. Terminou!` : "";
}
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
  if (location.hash === "#demo") { try { sessionStorage.setItem("cg-modo", "demo"); } catch { /* nada */ } history.replaceState(null, "", location.pathname); }
  try { localStorage.removeItem("cg-modo"); } catch { /* nada */ }   // versões antigas guardavam a demonstração para sempre
  // Chegou por um atalho do ícone (segurar o ícone do app) ou por "Compartilhar" de outro aplicativo: o app abre e já vai direto ao ponto.
  const chegada = new URLSearchParams(location.search);
  if (chegada.has("compartilhado") || chegada.has("atalho")) { S.compartilhado = chegada.has("compartilhado"); S.atalho = chegada.get("atalho") || ""; history.replaceState(null, "", location.pathname + location.hash); }
  S.avisoDeEntrada = erroDoLink();   // aparece na tela de entrada, se a pessoa cair nela
  if (!configured()) {
    S.semLogin = true;
  } else {
    S.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    // O setTimeout evita chamar o Supabase de dentro do próprio callback (recomendação da biblioteca).
    S.client.auth.onAuthStateChange((ev, session) => setTimeout(() => {
      // Chegou pelo link de "esqueci minha senha": entra no app e já pede a senha nova.
      if (ev === "PASSWORD_RECOVERY") { S.recuperando = true; if (S.store?.kind === "supabase" && S.loaded) pedirNovaSenha(); }
      if (session) {
        try { localStorage.setItem("cg-ultimo", JSON.stringify({ id: session.user.id, email: session.user.email })); } catch { /* nada */ }
        if (S.store?.kind !== "supabase") startApp(comFila(createSupabaseStore(S.client), { chave: "cg-" + session.user.id }), session.user.email);
        else if (ev === "TOKEN_REFRESHED" || ev === "SIGNED_IN") sincroniza();   // o login voltou a valer (a conexão voltou): manda o que ficou na fila
        return;
      }
      // Sem conexão, o login guardado pode não ser confirmado. Quem já usou o app neste aparelho entra assim mesmo, com a cópia dos dados.
      let ultimo = null; try { ultimo = JSON.parse(localStorage.getItem("cg-ultimo")); } catch { /* nada */ }
      if (ev === "INITIAL_SESSION" && navigator.onLine === false && ultimo?.id) return void startApp(comFila(createSupabaseStore(S.client), { chave: "cg-" + ultimo.id }), ultimo.email);
      if (ev === "INITIAL_SESSION" || S.store?.kind === "supabase") semSessao();
    }, 0));
    return;
  }
  semSessao();
}
// A demonstração vale só enquanto o app estiver aberto: quem instala e abre pelo ícone cai em Entrar / Criar conta.
function semSessao() {
  let demo = false; try { demo = sessionStorage.getItem("cg-modo") === "demo"; } catch { /* sem armazenamento */ }
  if (demo) startDemo(); else showAuth();
}

/* ---------- tela de entrada: entrar, criar conta, esqueci a senha (pedir e-mail → código ou link) e confirmar e-mail ---------- */
const AUTH = { modo: "entrar", email: "", ocupado: false, relogio: null };
const voltaPara = () => location.origin + location.pathname;   // para onde os links de e-mail trazem a pessoa
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
function showAuth(modo = "") {
  const jaNaTela = !$("auth").hidden && !modo;
  S.store = null; $("app").hidden = true; $("bnav").hidden = true; $("acesso").hidden = true; $("auth").hidden = false; fecharLancar();
  if (jaNaTela) return;   // a pessoa está no meio de um passo (código, confirmação): não desmancha
  let lembrado = ""; try { lembrado = localStorage.getItem("cg-email") || ""; } catch { /* nada */ }
  if (lembrado && !$("aEmail").value) $("aEmail").value = lembrado;
  // Quem já entrou neste aparelho vê "Entrar"; quem nunca entrou vê "Criar conta".
  const aviso = S.avisoDeEntrada || "", tipo = S.avisoTipo || "err"; S.avisoDeEntrada = ""; S.avisoTipo = "";
  authModo(modo || (lembrado || aviso ? "entrar" : "criar"), aviso, aviso ? tipo : "");
}
function authMsg(t, kind = "") { const m = $("authMsg"); m.textContent = t; m.className = "auth-msg " + kind; }
function authModo(m, msg = "", kind = "") {
  AUTH.modo = m;
  const entrada = m === "entrar" || m === "criar";
  $("authEntrada").hidden = !entrada || Boolean(S.semLogin); $("authEsqueci").hidden = m !== "esqueci"; $("authCodigo").hidden = m !== "codigo"; $("authConfirma").hidden = m !== "confirma";
  $("authRodape").hidden = !entrada;
  document.querySelectorAll("#authSeg button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.modo === m));
  $("aEntrar").textContent = m === "criar" ? "Criar minha conta" : "Entrar";
  $("aSenha").autocomplete = m === "criar" ? "new-password" : "current-password";
  $("aSenhaDica").hidden = m !== "criar"; $("aEsqueci").hidden = m !== "entrar"; $("aTermos").hidden = m !== "criar";
  // Com o app à venda, quem cria conta fica sabendo do preço e de que o e-mail tem de ser o da compra.
  $("aPago").hidden = m !== "criar" || !LINK_COMPRA;
  if (LINK_COMPRA) $("aPago").innerHTML = `O Meus Gastos custa <b>${esc(PRECO_PLANO)}</b>. Use aqui o mesmo e-mail da compra. <a href="${esc(LINK_COMPRA)}" target="_blank" rel="noopener">Ainda não comprei</a>`;
  authMsg(S.semLogin && entrada ? "O login ainda não está ligado neste endereço. Você pode testar tudo na demonstração." : msg, kind);
}
/** Trava os botões enquanto um pedido está indo: um segundo toque mandaria outro e-mail e o primeiro deixaria de valer. */
async function authFaz(botao, rotulo, fn) {
  if (AUTH.ocupado) return;
  AUTH.ocupado = true; const antes = botao.textContent; botao.disabled = true; botao.textContent = rotulo;
  try { await fn(); } finally { AUTH.ocupado = false; botao.disabled = false; if (botao.textContent === rotulo) botao.textContent = antes; }
}
/** Depois de mandar um e-mail, o servidor só aceita outro pedido em um minuto: o botão conta o tempo. */
function esperaReenvio(botao, seg = 60) {
  clearInterval(AUTH.relogio);
  const pinta = () => { botao.disabled = seg > 0; botao.textContent = seg > 0 ? `Enviar de novo em ${seg} s` : "Enviar de novo"; };
  pinta(); AUTH.relogio = setInterval(() => { seg--; pinta(); if (seg <= 0) clearInterval(AUTH.relogio); }, 1000);
}
const traduzErro = (e) => {
  const m = String(e?.message || e || ""), cod = String(e?.code || "");
  if (/invalid login/i.test(m)) return "E-mail ou senha incorretos. Confira os dois. Se esqueceu a senha, toque em Esqueci minha senha.";
  const seg = m.match(/after (\d+) seconds?/i);
  if (seg) return `Acabamos de enviar um e-mail para você. Espere ${seg[1]} segundos para pedir outro.`;
  if (/email rate limit|over_email_send_rate_limit/i.test(m + cod)) return "O envio de e-mails atingiu o limite desta hora. Tente de novo mais tarde.";
  if (/error sending/i.test(m)) return "Não conseguimos enviar o e-mail agora. Tente de novo em alguns minutos. Se continuar, fale com o suporte.";
  if (/rate limit|too many|security purposes/i.test(m)) return "Muitas tentativas seguidas. Espere um minuto e tente de novo.";
  if (/expired|invalid.*(link|token)|otp/i.test(m + cod)) return "Esse código ou link já foi usado ou venceu. Peça um novo e use a mensagem mais recente.";
  if (/already registered/i.test(m)) return "Esse e-mail já tem conta. Use Entrar.";
  if (/email not confirmed/i.test(m)) return "Falta confirmar o seu e-mail. Abra a mensagem que enviamos e toque no link.";
  if (/different from the old/i.test(m)) return "A senha nova precisa ser diferente da anterior.";
  if (/password/i.test(m) && /(6|short|weak|least)/i.test(m)) return "A senha precisa ter pelo menos 6 caracteres.";
  if (/invalid.*email|email.*invalid/i.test(m)) return "Confira o e-mail: ele parece estar incompleto.";
  if (/fetch|network/i.test(m)) return "Sem conexão com a internet. Tente de novo.";
  return "Não deu certo: " + m;
};

$("authSeg").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) authModo(b.dataset.modo); });
// Botão de mostrar a senha, em qualquer campo de senha.
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-ver]"); if (!b) return;
  const campo = $(b.dataset.ver), ver = campo.type === "password";
  campo.type = ver ? "text" : "password"; b.setAttribute("aria-pressed", ver); b.setAttribute("aria-label", ver ? "Esconder a senha" : "Mostrar a senha");
});
document.querySelectorAll("#auth [data-voltar]").forEach((b) => (b.onclick = () => { clearInterval(AUTH.relogio); authModo("entrar"); }));

async function entrar(email, senha) {
  const { error } = await S.client.auth.signInWithPassword({ email, password: senha });
  if (!error) { try { localStorage.setItem("cg-email", email); } catch { /* nada */ } return authMsg(""); }
  if (/email not confirmed/i.test(error.message)) { AUTH.email = email; $("fEmail").textContent = email; return authModo("confirma", "Esse e-mail ainda não foi confirmado.", "err"); }
  authMsg(traduzErro(error), "err");
}
$("authForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const email = $("aEmail").value.trim(), senha = $("aSenha").value, criar = AUTH.modo === "criar";
  if (!emailOk(email)) { $("aEmail").focus(); return authMsg("Digite o seu e-mail completo, como voce@exemplo.com.", "err"); }
  if (!senha) { $("aSenha").focus(); return authMsg(criar ? "Escolha uma senha." : "Digite a sua senha.", "err"); }
  if (criar && senha.length < 6) { $("aSenha").focus(); return authMsg("A senha precisa ter pelo menos 6 caracteres.", "err"); }
  authFaz($("aEntrar"), criar ? "Criando sua conta…" : "Entrando…", async () => {
    if (!criar) return entrar(email, senha);
    const { data, error } = await S.client.auth.signUp({ email, password: senha, options: { emailRedirectTo: voltaPara() } });
    if (error) return authMsg(traduzErro(error), "err");
    // Quando o e-mail já tem conta, o Supabase responde sem erro e sem identidades (para não revelar cadastros).
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0)
      return authModo("entrar", "Esse e-mail já tem conta. Entre com a sua senha, ou toque em Esqueci minha senha.", "err");
    try { localStorage.setItem("cg-email", email); } catch { /* nada */ }
    if (!data.session) { AUTH.email = email; $("fEmail").textContent = email; authModo("confirma"); esperaReenvio($("fReenviar")); }
  });
});
$("fEntrar").onclick = () => authFaz($("fEntrar"), "Entrando…", async () => {
  const senha = $("aSenha").value;
  if (!senha) return authModo("entrar", "Digite a sua senha para entrar.");
  await entrar(AUTH.email, senha);
});
$("fReenviar").onclick = () => authFaz($("fReenviar"), "Enviando…", async () => {
  const { error } = await S.client.auth.resend({ type: "signup", email: AUTH.email, options: { emailRedirectTo: voltaPara() } });
  authMsg(error ? traduzErro(error) : "Enviamos de novo. Use a mensagem mais recente.", error ? "err" : "ok");
  if (!error || /after \d+ seconds/i.test(error.message)) esperaReenvio($("fReenviar"), Number(error?.message.match(/after (\d+)/)?.[1]) || 60);
});

/* Esqueci a senha. O e-mail traz um botão (link) e, se o modelo de e-mail do projeto tiver, um código de números.
   O código é o caminho mais seguro: funciona dentro do app instalado e não depende de o link abrir no lugar certo. */
$("aEsqueci").onclick = () => { $("rEmail").value = $("aEmail").value.trim(); authModo("esqueci"); if (!$("rEmail").value) $("rEmail").focus(); };
async function pedirEmailDeSenha(email, botao) {
  await authFaz(botao, "Enviando…", async () => {
    const { error } = await S.client.auth.resetPasswordForEmail(email, { redirectTo: voltaPara() });
    const espera = Number(error?.message.match(/after (\d+) seconds?/i)?.[1]) || 0;
    if (error && !espera) return authMsg(traduzErro(error), "err");
    AUTH.email = email; $("cEmail").textContent = email;
    // "Espere N segundos" quer dizer que um e-mail acabou de sair: a pessoa segue para a tela do código, com o relógio certo.
    authModo("codigo", espera ? "Já enviamos uma mensagem há pouco. Use essa." : "", "");
    esperaReenvio($("cReenviar"), espera || 60);
  });
}
$("authEsqueci").addEventListener("submit", (e) => {
  e.preventDefault();
  const email = $("rEmail").value.trim();
  if (!emailOk(email)) { $("rEmail").focus(); return authMsg("Digite o e-mail da sua conta, como voce@exemplo.com.", "err"); }
  pedirEmailDeSenha(email, $("rEnviar"));
});
$("cReenviar").onclick = () => pedirEmailDeSenha(AUTH.email, $("cReenviar"));
$("authCodigo").addEventListener("submit", (e) => {
  e.preventDefault();
  const codigo = $("cCodigo").value.replace(/\D/g, ""), senha = $("cSenha").value;
  if (codigo.length < 6) { $("cCodigo").focus(); return authMsg("Digite o código de números que veio no e-mail. Se a mensagem só tem um botão, toque nele.", "err"); }
  if (senha.length < 6) { $("cSenha").focus(); return authMsg("A senha nova precisa ter pelo menos 6 caracteres.", "err"); }
  authFaz($("cSalvar"), "Salvando…", async () => {
    const { error } = await S.client.auth.verifyOtp({ email: AUTH.email, token: codigo, type: "recovery" });
    if (error) return authMsg("Código incorreto ou vencido. Confira na mensagem mais recente, ou peça outro.", "err");
    // O código já colocou a pessoa dentro da conta; agora grava a senha nova.
    const troca = await S.client.auth.updateUser({ password: senha });
    clearInterval(AUTH.relogio); $("cCodigo").value = ""; $("cSenha").value = ""; authModo("entrar");
    try { localStorage.setItem("cg-email", AUTH.email); } catch { /* nada */ }
    if (troca.error) { S.recuperando = true; if (S.loaded) pedirNovaSenha(traduzErro(troca.error)); } else toast("Senha nova salva. Você já está dentro do app.");
  });
});
$("aDemo").addEventListener("click", startDemo);
$("btnSair").addEventListener("click", async () => {
  // Desligar a notificação deste aparelho não pode segurar a saída: se o navegador não responder em 1,5 s, sai assim mesmo.
  if (S.store?.kind === "supabase") {
    // Ao sair, a cópia dos dados deixa este aparelho. A fila de lançamentos fica guardada e é enviada no próximo login da mesma conta.
    S.store.esqueceCopia?.(); try { localStorage.removeItem("cg-ultimo"); } catch { /* nada */ }
    const st = S.store;
    await Promise.race([desligarPush().catch(() => {}), new Promise((r) => setTimeout(r, 1500))]);
    await Promise.race([S.client.auth.signOut().catch(() => {}), new Promise((r) => setTimeout(r, 4000))]);
    if (S.store === st) semSessao();   // sem conexão o aviso de saída pode não chegar: volta para a entrada assim mesmo
  }
  else { try { sessionStorage.removeItem("cg-modo"); } catch { /* nada */ } showAuth(); }
});

/** Quem chegou pelo link do e-mail já está dentro da conta: falta só escolher a senha nova. */
function pedirNovaSenha(aviso = "") {
  openDlg(`<h3>Criar a senha nova</h3><p class="hint" style="margin:0 0 4px;font-size:13.5px">Você entrou pelo e-mail. Escolha agora a senha nova, com pelo menos 6 caracteres.</p><form id="novaSenha" style="display:grid;gap:12px" novalidate>
    <label class="f">Senha nova<span class="senha"><input class="in" id="ns1" type="password" autocomplete="new-password"><button type="button" class="olho" data-ver="ns1" aria-label="Mostrar a senha" aria-pressed="false">${ico("olho")}</button></span></label>
    <p class="auth-msg err" id="nsMsg" role="alert">${esc(aviso)}</p>
    <div class="actions"><button class="btn primary" type="submit" id="nsSalvar">Salvar senha nova</button></div></form>`);
  $("novaSenha").addEventListener("submit", async (e) => {
    e.preventDefault();
    if ($("ns1").value.length < 6) { $("ns1").focus(); $("nsMsg").textContent = "A senha precisa ter pelo menos 6 caracteres."; return; }
    $("nsSalvar").disabled = true;
    const { error } = await S.client.auth.updateUser({ password: $("ns1").value });
    if (error) { $("nsSalvar").disabled = false; $("nsMsg").textContent = traduzErro(error); return; }
    S.recuperando = false;
    $("dlg").close(); showBanner(""); toastOuFlash("Senha nova salva. Você já está dentro do app.");
  });
  // Fechou sem salvar: a pessoa continua dentro, mas a senha antiga segue valendo. Um aviso deixa o caminho à mão.
  $("dlg").addEventListener("close", () => { if (S.recuperando) showBanner("Você entrou pelo e-mail, mas ainda não criou a senha nova.", [["Criar agora", () => pedirNovaSenha()]]); }, { once: true });
}

/** Sai da demonstração direto para a tela de criar conta. Os dados de exemplo não vão junto: a conta começa vazia, com os primeiros passos. */
function contaAPartirDaDemo() {
  try { sessionStorage.removeItem("cg-modo"); } catch { /* nada */ }
  $("dlg").open && $("dlg").close(); showBanner(""); showAuth("criar"); scrollTo(0, 0);
}
function startDemo() {
  try { sessionStorage.setItem("cg-modo", "demo"); } catch { /* nada */ }
  const store = createLocalStore("cg-demo-v8", demoSeed(hoje()));
  startApp(store, "Demonstração");
  showBanner(`Você está na demonstração, com dados de exemplo. Gostou? Crie a sua conta para usar com os seus números.`,
    [...(S.semLogin ? [] : [["Criar minha conta", contaAPartirDaDemo]]), ["Recomeçar exemplo", () => { store.reset(); startDemo(); }]]);
}

async function startApp(store, quem) {
  S.store = store; S.loaded = false; S.acesso = null; S.casal = null; S.quem = "";
  $("auth").hidden = true; $("acesso").hidden = true; $("app").hidden = false; $("bnav").hidden = false;
  $("whoName").textContent = quem;
  $("btnSair").textContent = store.kind === "supabase" ? "Sair" : "Sair da demonstração";
  showBanner("");
  render();
  S.prefs = prefsPadrao();
  try {
    S.data = await store.loadAll(); S.data.cartoes ||= [];
    const daCopia = Boolean(S.data.daCopia);
    const p = await store.loadPrefs().catch(() => null);
    S.prefs = { ...prefsPadrao(), ...(p || {}) };
    if (!p && store.kind === "local") S.prefs.metas = { "Reserva de emergência": { valor: 3000, ate: "", plano: { valor: 300, dia: 28 } } };   // exemplo da demonstração
    // Conta de casal: com quem as contas são divididas e o que é dos dois (categorias, limites, metas, saldo).
    S.casal = store.casalMeu ? await store.casalMeu().catch((e) => { console.warn("Conta de casal não conferida:", e?.message); return null; }) : null;
    aplicaCasal(); S.carregadoEm = Date.now();
    if (!S.prefs.categorias) S.prefs.categorias = categoriasIniciais(S.data);
    // Acesso de quem comprou. Se a conferência falhar (sem internet, banco sem essa parte), o app abre normalmente.
    S.acesso = await store.meuAcesso().catch((e) => { console.warn("Acesso não conferido:", e?.message); return null; });
    S.loaded = true;
    if (S.acesso?.cobranca && !S.acesso.ativo) { telaDeAcesso(); if (S.recuperando) pedirNovaSenha(); return; }
    render(); avisoDeRenovacao();
    if (daCopia) showBanner("Sem internet: estes são os dados da última vez que você abriu o app. O que você lançar agora fica guardado neste aparelho e é enviado quando a conexão voltar.");
    else sincroniza();
    if (S.recuperando) pedirNovaSenha();
    else if (S.compartilhado || S.atalho) aoChegar();
    else if (S.casal?.situacao === "convidado") conviteDeCasal();
    else if (!S.prefs.boasVindas && !S.data.lancamentos.length && !S.data.fixos.length) { S.prefs.boasVindas = true; salvaPrefs(); guiaPasso("renda", true); }
    else conviteAvisos();
  } catch (e) { console.error(e); showBanner("Não foi possível carregar seus dados. Confira a internet e recarregue a página."); }
}

/* ---------- acesso de quem comprou ---------- */
const ddmmaaaa = (iso) => `${ddmm(iso)}/${iso.slice(0, 4)}`;
/** Tela de quem tem conta mas não tem acesso em dia: ainda não comprou, não renovou ou pediu reembolso. */
function telaDeAcesso(msg = "", kind = "") {
  const a = S.acesso || {}, email = $("whoName").textContent, temDados = S.data.lancamentos.length || S.data.fixos.length || S.data.faturas.length;
  const devolvida = a.status === "reembolsado", venceu = !devolvida && Boolean(a.ate);
  const titulo = devolvida ? "A compra desta conta foi reembolsada" : venceu ? "O seu acesso terminou" : "Falta liberar o seu acesso";
  const texto = devolvida ? `O acesso de <b>${esc(email)}</b> foi encerrado junto com o reembolso.`
    : venceu ? `O acesso de <b>${esc(email)}</b> valeu até ${ddmmaaaa(a.ate)}. Os seus dados continuam guardados e voltam a aparecer assim que você renovar.`
    : `A conta <b>${esc(email)}</b> está criada, mas ainda não encontramos uma compra com este e-mail.`;
  $("app").hidden = true; $("bnav").hidden = true; $("auth").hidden = true; $("acesso").hidden = false; showBanner(""); fecharLancar(); scrollTo(0, 0);
  $("acessoCard").innerHTML = `<div class="auth-marca"><img src="icons/icon-192.png" alt="" width="48" height="48" class="auth-logo"><div><h1>Meus Gastos</h1><p class="auth-sub">Veja quanto sobra no seu mês.</p></div></div>
    <h2>${titulo}</h2><p class="auth-txt">${texto}</p>
    ${LINK_COMPRA ? `<a class="btn primary" id="acComprar" href="${esc(LINK_COMPRA)}" target="_blank" rel="noopener">${venceu ? "Renovar" : "Comprar"} por ${esc(PRECO_PLANO)}</a>` : `<p class="auth-txt">As vendas ainda não estão abertas.</p>`}
    ${S.casal?.situacao === "convidado" ? `<div class="ac-casal"><b>${esc(S.casal.outro)} convidou você para dividir as contas.</b><span>Aceitando, você usa o app com a assinatura dessa pessoa, sem precisar comprar.</span>
      <button class="btn primary" type="button" id="acCasal">Ver o convite</button></div>` : ""}
    <button class="btn" type="button" id="acConferir">Já comprei: conferir de novo</button>
    <p class="auth-msg ${kind}" id="acMsg" role="status">${esc(msg)}</p>
    <p class="hint">O acesso vale para o e-mail usado na compra e costuma ser liberado em menos de um minuto depois do pagamento aprovado. Boleto pode levar até 3 dias úteis. Comprou com outro e-mail? Saia e entre com ele, ou fale com o suporte.</p>
    <div class="auth-demo">${temDados ? `<button class="btn" type="button" id="acBaixar">Baixar meus dados em planilha</button>` : ""}
      <button class="btn" type="button" id="acDemo">Ver a demonstração</button>
      <button class="link" type="button" id="acSair">Sair desta conta</button>
      <button class="link" type="button" id="acExcluir">Excluir minha conta</button></div>
    ${suporteHtml()}`;
  $("acConferir").onclick = async () => {
    $("acConferir").disabled = true;
    const novo = await S.store.meuAcesso().catch(() => null);
    if (novo && (!novo.cobranca || novo.ativo)) { const st = S.store; return startApp(st, email).then(() => toast(novo.ate ? `Acesso liberado até ${ddmmaaaa(novo.ate)}.` : "Acesso liberado.")); }
    if (novo) S.acesso = novo;
    telaDeAcesso(novo ? `Ainda não encontramos a compra de ${email}. Se você acabou de pagar, espere um minuto e toque de novo.` : "Não foi possível conferir agora. Confira a internet e tente de novo.", "err");
  };
  if ($("acCasal")) $("acCasal").onclick = () => abrirCasal();
  if ($("acBaixar")) $("acBaixar").onclick = () => $("btnExport").click();
  $("acDemo").onclick = startDemo;
  $("acSair").onclick = () => $("btnSair").click();
  $("acExcluir").onclick = () => excluirConta();
}
/** Perto do fim do período: avisa quem cancelou a renovação (15 dias antes) e quem está com a renovação atrasada (3 dias). */
function avisoDeRenovacao() {
  const a = S.acesso;
  if (!a?.cobranca || !a.ativo || !a.ate || a.pelo_par || S.store?.kind !== "supabase") return;   // quem usa a assinatura da outra pessoa não é quem renova
  const d = Math.round((Date.UTC(+a.ate.slice(0, 4), +a.ate.slice(5, 7) - 1, +a.ate.slice(8, 10)) - Date.UTC(+hoje().slice(0, 4), +hoje().slice(5, 7) - 1, +hoje().slice(8, 10))) / 86400000);
  if (d > (a.status === "cancelado" ? 15 : 3)) return;
  showBanner(`O seu acesso vale até ${ddmmaaaa(a.ate)}${a.status === "cancelado" ? ", porque a renovação foi cancelada" : ". A renovação ainda não foi confirmada"}. Os seus dados não se perdem.`,
    LINK_COMPRA ? [["Renovar", () => open(LINK_COMPRA, "_blank", "noopener")]] : []);
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
    showBanner(/fetch|network|load failed/i.test(String(e?.message)) || navigator.onLine === false ? "Sem internet: essa mudança precisa de conexão e não foi salva. Lançamentos novos você pode fazer: eles ficam guardados e são enviados depois."
      : "Não foi possível salvar. Recarregue a página e tente de novo.");
    return false;
  }
}

/** "Hoje", "Ontem" ou "qui, 01 de outubro": título de cada dia na lista de lançamentos do celular. */
function rotuloDia(iso) {
  const hj = hoje(), o = new Date(); o.setDate(o.getDate() - 1);
  if (iso === hj) return "Hoje";
  if (iso === toISO(o)) return "Ontem";
  return `${DIAS3[diaDaSemana(iso)]}, ${iso.slice(8, 10)} de ${nomeMes(iso.slice(0, 7))}`;
}

/* ================= render ================= */
function render() {
  const [y, mo] = S.mes.split("-").map(Number);
  if (S.view === "mais" && !noCelular()) S.view = "inicio";   // a tela Mais só existe no celular; no computador tudo fica à vista
  const naMais = S.view === "mais", sub = S.view === "listas" && SUBS.includes(S.tab);
  $("mesTitulo").textContent = naMais ? "Mais" : `${MESES[mo - 1]} ${y}`;
  $("hoje").hidden = naMais || S.mes === mKey(hoje());
  const c = calcMes(S.data, S.mes, hoje());
  // No celular aparece uma tela por vez; a barra de baixo mostra onde a pessoa está.
  // Barra de baixo: Início · Lançamentos · + · Planejar (limites e metas) · Mais. Contas fixas, entradas e cartões abrem a partir de Mais.
  const app = $("app"); app.dataset.view = S.view; app.dataset.tab = S.tab;
  const onde = S.view === "inicio" ? "inicio" : naMais || sub ? "menu" : S.tab;
  document.querySelectorAll("#bnav button").forEach((b) => b.dataset.nav === onde ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current"));
  $("listaTitulo").textContent = S.tab === "l" ? "Extrato" : S.tab === "c" ? "Cartões" : S.tab === "m" ? "Planejar" : "";
  $("listaTitulo").hidden = S.tab === "f" || S.tab === "r";
  $("listaVoltar").hidden = !sub;
  renderForm(); renderInstalar(); renderFechamento(); renderRepetidos(); renderVenc(); renderKpis(c); renderCusto(c); renderCat(c); renderEvo(); renderTabs(c); renderMais(c); aplicaInicio();
  avisoDaFila();
}

/* ---------- chegar por atalho do ícone ou por "Compartilhar" de outro aplicativo ---------- */
async function aoChegar() {
  const atalho = S.atalho, compartilhado = S.compartilhado; S.atalho = ""; S.compartilhado = false;
  if (!compartilhado) { if (atalho === "lancar" || atalho === "qr" || atalho === "voz") abrirLancar(); if (atalho === "qr") abrirQr(); if (atalho === "voz") ouvirGasto(); return; }
  // O arquivo ou o texto compartilhado foi guardado pelo app neste aparelho (sw.js) e é apagado assim que é lido.
  let arquivo = null, texto = "";
  try {
    const c = await caches.open("meus-gastos-compartilhado"), ra = await c.match("./__compartilhado/arquivo"), rt = await c.match("./__compartilhado/texto");
    if (ra) { const b = await ra.blob(); arquivo = new File([b], decodeURIComponent(ra.headers.get("X-Nome") || "arquivo"), { type: b.type }); }
    if (rt) texto = (await rt.text()).trim();
    await c.delete("./__compartilhado/arquivo"); await c.delete("./__compartilhado/texto");
  } catch { /* sem o que ler: abre o formulário */ }
  if (arquivo) { S.lerComo = ""; return !ehPdf(arquivo) && !/^image\//.test(arquivo.type) && ehExtrato(arquivo) ? importarExtrato(arquivo) : processaLeitura(arquivo); }
  if (texto) { if (!usaCodigo(texto)) { S.lerComo = ""; conferirLeitura(interpretaTexto(texto, hoje()), texto, ""); } return; }
  abrirLancar(); toast("Não consegui abrir o que foi compartilhado. Tente de novo, ou lance por aqui.");
}

/* ---------- sem internet: lançamentos que esperam a conexão ---------- */
function avisoDaFila(msg = "") {
  const b = $("filaBar"), n = S.store?.naFila?.() || 0;
  b.hidden = !n && !msg; if (b.hidden) return;
  b.innerHTML = `<span>${esc(msg || (n === 1 ? "1 lançamento aguardando internet. Ele está guardado neste aparelho." : `${n} lançamentos aguardando internet. Eles estão guardados neste aparelho.`))}</span>${n ? `<button class="link" type="button" id="filaEnviar">Enviar agora</button>` : ""}`;
  if ($("filaEnviar")) $("filaEnviar").onclick = () => sincroniza(true);
}
let enviando = false;
/** Manda a fila para o servidor. `pedido` = a pessoa tocou em "Enviar agora" (aí o app conta o que aconteceu, mesmo que não dê). */
async function sincroniza(pedido = false) {
  const st = S.store;
  if (enviando || !st?.enviaFila || !st.naFila()) return;
  enviando = true;
  let r; try { r = await st.enviaFila(); } catch (e) { r = { enviados: [], faltam: st.naFila(), erro: String(e?.message || e) }; } finally { enviando = false; }
  if (S.store !== st) return;
  if (r.enviados.length) {
    const novos = new Map(r.enviados.map((x) => [x.id, x]));
    S.data.lancamentos = S.data.lancamentos.map((x) => (novos.has(x.id) ? { ...x, ...novos.get(x.id), valor: Number(novos.get(x.id).valor), pendente: undefined } : x));
    st.guardaCopia(S.data); render();
    toast(r.enviados.length === 1 ? "1 lançamento enviado. Está tudo salvo na sua conta." : `${r.enviados.length} lançamentos enviados. Está tudo salvo na sua conta.`);
  }
  if (r.erro) avisoDaFila("Não foi possível enviar os lançamentos guardados. Eles continuam neste aparelho. Se o problema continuar, fale com o suporte.");
  else if (pedido && r.faltam) avisoDaFila(r.faltam === 1 ? "Ainda sem conexão. O lançamento continua guardado neste aparelho." : "Ainda sem conexão. Os lançamentos continuam guardados neste aparelho.");
}
addEventListener("online", () => sincroniza());
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") sincroniza();
  else if (S.loaded && S.store?.guardaCopia && S.data) S.store.guardaCopia(S.data);   // ao sair da tela, atualiza a cópia que abre sem internet
});
addEventListener("pagehide", () => { if (S.loaded && S.store?.guardaCopia && S.data) S.store.guardaCopia(S.data); });

/** Palpite de categoria para uma descrição: primeiro o que a pessoa já escolheu antes, depois as palavras conhecidas, depois a dica (se houver). */
function palpiteCat(desc, tipo, dica = "") {
  const aprendida = S.data ? categoriaAprendida(S.data.lancamentos, desc, tipo) : "", fixo = guessCat(desc, tipo);
  return aprendida || (fixo !== "Outros" ? fixo : dica || fixo);
}

function renderForm() {
  document.querySelectorAll("#tipoSeg button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.t === S.tipo));
  // Gastos que a pessoa mais repete: um toque preenche o formulário.
  const rap = S.tipo === "Despesa" && S.loaded ? maisUsados(S.data.lancamentos, hoje()) : [], fr2 = $("fRapidos"), k2 = JSON.stringify(rap);
  if (fr2.dataset.k !== k2) { fr2.dataset.k = k2; S.rapidos = rap; fr2.innerHTML = rap.length ? `<span class="rap-t">Você costuma lançar</span>` + rap.map((r, i) => `<button type="button" data-rap="${i}">${esc(r.descricao)}<b>${brl(r.valor)}</b></button>`).join("") : ""; }
  fr2.hidden = !rap.length;
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
  const fixo = S.tipo !== "Reserva" && $("fFixo").checked, guardando = S.tipo === "Reserva" && fs.value !== "Retirar";
  $("fFixoWrap").hidden = S.tipo === "Reserva" && !guardando;
  $("fFixoLbl").textContent = S.tipo === "Reserva" ? "Guardar todo mês (dá para pular quando precisar)" : S.tipo === "Receita" ? "Repete (como o salário)" : "Repete (conta fixa ou parcelamento)";
  // Quando é fixo, a pessoa escolhe se repete todo mês ou toda semana; o dia vem da data escolhida.
  const fr = $("fRepete"), dt = fd.value || hoje();
  fr.hidden = !fixo;
  fr.options[0].textContent = `Todo mês, no dia ${dt.slice(8, 10)}`;
  fr.options[1].textContent = `Toda semana, ${DIAS_SEMANA[diaDaSemana(dt)] === "sábado" || DIAS_SEMANA[diaDaSemana(dt)] === "domingo" ? "no" : "na"} ${DIAS_SEMANA[diaDaSemana(dt)]}`;
  // Até quando repete: sem data para acabar (conta fixa) ou até um mês (acerto, acordo, parcelamento).
  const fa = $("fAte"), dica = $("fPrazoDica"), semF = fr.value === "semanal";
  fa.hidden = !fixo; $("fVezesWrap").hidden = !fixo;
  if (fixo) {
    const base = { tipo: S.tipo, desde: semF ? dt : mKey(dt) + "-01", dia: semF ? 1 : Number(dt.slice(8, 10)), ...(semF ? { repete: "semanal", dia_semana: diaDaSemana(dt) } : {}) }, kb = JSON.stringify(base);
    if (fa.dataset.k !== kb) { fa.innerHTML = opcoesDePrazo(base, fa.value); fa.dataset.k = kb; }
    const n = fa.value ? vezesNoPrazo(base, fa.value) : 0, vF = parseMoney($("fValor").value);
    const quanto = n === 1 ? `Uma vez só${vF > 0 ? `, de ${brl(vF)}` : ""}` : `${vezesTxt(n)}${vF > 0 ? ` de ${brl(vF)}: ${brl(round2(n * vF))} no total` : ""}`;
    dica.textContent = fa.value ? `${quanto}. Começa em ${ddmm(dt)} e acaba em ${mesAno(fa.value)}.` : "";
  }
  dica.hidden = !(fixo && fa.value);
  $("fOk").textContent = fixo ? (fa.value ? (S.tipo === "Receita" ? "Cadastrar entrada com prazo" : "Cadastrar conta com prazo") : S.tipo === "Receita" ? "Cadastrar entrada fixa" : "Cadastrar gasto fixo")
    : S.tipo === "Despesa" ? "Lançar gasto" : S.tipo === "Receita" ? "Lançar entrada" : guardando && $("fFixo").checked ? "Guardar e repetir todo mês" : "Lançar";
  // Compra no cartão: a pessoa escolhe o cartão e, se não for um gasto fixo, em quantas vezes.
  const cc = S.tipo === "Despesa" && fs.value === CARTAO, tem = cartoesAtivos().length > 0;
  $("fCartaoLinha").hidden = !cc; $("fCartaoWrap").hidden = !tem; $("fParcWrap").hidden = !tem || fixo; $("fCartaoDica").hidden = tem;
  if (cc && tem) {
    const fk = $("fCartao"), k = cartoesAtivos().map((z) => z.id + z.nome).join("|");
    if (fk.dataset.k !== k) { fk.innerHTML = optsCartao(fk.value); fk.dataset.k = k; }
    $("fParc").innerHTML = optsParcelas(parseMoney($("fValor").value), fixo ? 1 : $("fParc").value || 1);
  }
  mostraEfeito();
}
/** Cartão e parcelas escolhidos no formulário de lançar. Sem cartão cadastrado não devolve nada: o lançamento segue como sempre foi. */
function cartaoDoForm() {
  const cc = S.tipo === "Despesa" && $("fForma").value === CARTAO && cartoesAtivos().length > 0;
  return cc ? { cartao_id: $("fCartao").value || null, parcelas: Number($("fParc").value) || 1 } : {};
}

function renderKpis(c) {
  const noCartao = round2(c.comprasCartao + c.fxCartao);
  // Saldo acumulado: o que a pessoa já tinha (saldo inicial), mais os meses anteriores, mais este mês.
  const acum = S.prefs.levarSaldo ? saldoAcumulado(S.data, S.mes, hoje(), { desde: S.prefs.saldoDesde, inicial: S.prefs.saldoInicial }) : c.saldo;
  const resTotal = reservaAcumulada(S.data, S.mes), destinos = guardadoPorDestino(S.data, S.mes);
  const resMes = c.res > 0 ? `+ ${brl0(c.res)} neste mês` : c.res < 0 ? `− ${brl0(-c.res)} neste mês` : "Nada guardado neste mês";
  const resLinhas = destinos.length > 1 ? `<ul class="dest">${destinos.map(([k, v]) => `<li><span>${esc(k)}</span><b>${brl0(v)}</b></li>`).join("")}</ul>` : destinos.length === 1 ? `<span class="n">${esc(destinos[0][0])}</span>` : "";
  // Resumo no alto: um número só em destaque (quanto sobra ou falta), com a cor dizendo como o mês está,
  // e ao lado o custo até agora e a previsão. A régua de para onde vai o dinheiro fica em "Entenda essa conta".
  const rx = raioX(c), livre = livrePorDia(c), mesNome = nomeMes(S.mes), falta = rx.sobra < 0, est = estadoDoMes(c, S.prefs.teto);
  const verbo = c.fase === "passado" ? (falta ? "Faltaram" : "Sobraram") : c.fase === "futuro" ? (falta ? "Devem faltar" : "Devem sobrar") : falta ? "Faltam" : "Sobram";
  const ROTULO = { ok: "Tudo certo", atencao: "Atenção", estourado: falta ? "No vermelho" : "Passou do limite" };
  const entra = c.rec > 0 ? `Entram <button type="button" class="ln" data-det="entradas">${brl(c.rec)}</button>` : `<button type="button" class="ln" data-det="entradas">Nenhuma entrada lançada</button>`;
  const guardado = c.res > 0 ? ` · guardado <button type="button" class="ln" data-det="guardado">${brl(c.res)}</button>` : "";
  const duo = c.fase === "atual" ? `
      <div class="hstat" data-det="custo" role="button" tabindex="0"><span class="l">Custo até agora</span><span class="v">${brl0(c.custo)}</span><span class="n">com as contas fixas</span></div>
      <div class="hstat" data-det="custo" role="button" tabindex="0"><span class="l">Projeção do mês</span><span class="v">${brl0(c.proj)}</span><span class="n">${est.projSobra < 0 ? `fecha ${brl0(-est.projSobra)} no vermelho` : `devem sobrar ${brl0(est.projSobra)}`}</span></div>`
    : `
      <div class="hstat" data-det="custo" role="button" tabindex="0"><span class="l">${c.fase === "futuro" ? "Custo previsto" : "Custo do mês"}</span><span class="v">${brl0(c.custo)}</span><span class="n">${c.fase === "futuro" ? "por enquanto, só as contas fixas" : "fechado"}</span></div>
      <div class="hstat" data-det="entradas" role="button" tabindex="0"><span class="l">Entradas</span><span class="v">${brl0(c.rec)}</span><span class="n">${c.fase === "futuro" ? "previstas" : "no mês"}</span></div>`;
  // Topo com cara de banco: o valor livre em destaque, a barra do quanto da sobra já foi usado (na cor do estado do mês),
  // o olho para esconder os valores e, logo abaixo, as ações rápidas e o resumo em três números.
  const sb = sobraDoMes(c), atualM = c.fase === "atual";
  const rotulo = atualM ? (falta ? `Passou do que tinha para ${mesNome}` : `Livre para gastar em ${mesNome}`) : `${verbo} em ${mesNome}`;
  const usado = sb.livre > 0 ? Math.min(100, Math.round((sb.usado / sb.livre) * 100)) : 100;
  const ocultos = valoresOcultos();
  $("resumo").innerHTML = `<div class="hero banco est-${est.nivel}">
    <div class="hero-top"><span class="l">${rotulo}</span>
      <button type="button" class="olho" id="olho" aria-pressed="${ocultos}" aria-label="${ocultos ? "Mostrar os valores" : "Esconder os valores"}">${ico(ocultos ? "olhoFechado" : "olho")}</button></div>
    <span class="v ocultavel" data-det="saldo" role="button" tabindex="0" aria-label="${rotulo}: ${brl(Math.abs(rx.sobra))}. Abrir">${brl(Math.abs(rx.sobra))}</span>
    ${sb.entra > 0 ? `<div class="hbar" aria-hidden="true"><i style="width:${usado}%"></i></div>
    <div class="hsub ocultavel"><span>${atualM || c.fase === "passado" ? `de ${brl(sb.livre)} depois das contas` : `previsto, depois das contas`}</span>${livre && livre.valor > 0 ? `<span>${brl(livre.valor)}/dia</span>` : ""}</div>` : ""}
    ${est.nivel !== "neutro" ? `<span class="estado"><b>${ROTULO[est.nivel]}</b>${est.motivo ? `<span>${est.motivo}</span>` : ""}</span>` : ""}
    ${acum !== c.saldo ? `<span class="n ocultavel">Com os meses anteriores, o saldo acumulado é <b>${sgn(acum)}</b>.</span>` : ""}
  </div>
  <div class="acoes-rap" role="group" aria-label="Ações rápidas">
    <button type="button" data-acao="lancar"><span class="forte">${ico("mais")}</span>Lançar gasto</button>
    ${Reconhecedor ? `<button type="button" data-acao="voz"><span>${ico("mic")}</span>Por voz</button>` : `<button type="button" data-acao="cal"><span>${ico("agenda")}</span>Calendário</button>`}
    <button type="button" data-acao="ler"><span>${ico("qr")}</span>Escanear e importar</button>
    <button type="button" data-acao="recebi"><span>${ico("entra")}</span>Recebi</button>
  </div>
  <div class="resumo3 ocultavel">
    <button type="button" data-det="entradas"><small>Entradas</small><b class="pos">${brl0(c.rec)}</b>${guardado ? `<small>${c.res > 0 ? `guardado ${brl0(c.res)}` : ""}</small>` : ""}</button>
    <button type="button" data-det="custo"><small>${c.fase === "futuro" ? "Custo previsto" : atualM ? "Custo até hoje" : "Custo do mês"}</small><b>${brl0(c.custo)}</b><small>com as contas fixas</small></button>
    ${atualM ? `<button type="button" data-det="custo"><small>Projeção</small><b>${brl0(c.proj)}</b><small class="${est.projSobra < 0 ? "neg" : "pos"}">${est.projSobra < 0 ? `fecha ${brl0(-est.projSobra)} no vermelho` : `sobram ${brl0(est.projSobra)}`}</small></button>`
      : `<button type="button" data-det="saldo"><small>${falta ? "Faltou" : "Sobrou"}</small><b>${brl0(Math.abs(rx.sobra))}</b></button>`}
    <div class="resumo3-links">${c.fase === "passado" ? `<button type="button" class="link" id="verFech">Fechamento para compartilhar</button>` : ""}<button type="button" class="link" id="verSobra">O que sobra para viver o mês</button><button type="button" class="link" id="entenda">Entenda essa conta</button></div>
  </div>`;
  $("olho").onclick = () => { ocultaValores(!valoresOcultos()); render(); };
  $("resumo").querySelectorAll("[data-acao]").forEach((b) => (b.onclick = () => acaoRapida(b.dataset.acao)));
  $("entenda").onclick = () => entendaAConta(c);
  if ($("verFech")) $("verFech").onclick = () => abrirFechamento(S.mes);
  $("verSobra").onclick = () => { S.view = "listas"; S.tab = "m"; render(); noCelular() ? scrollTo(0, 0) : $("listas").scrollIntoView({ block: "start" }); };
  renderGuia(); renderDia(c); renderTeto(c); renderMetas(c);
  const cab = (icone, nome) => `<span class="l"><span class="kico">${ico(icone)}</span>${nome}<i aria-hidden="true">${ico("chev")}</i></span>`;
  $("kpis").innerHTML = `
   <div class="kpi reserva" data-det="guardado" role="button" tabindex="0">${cab("cofre", "Dinheiro guardado")}<span class="v">${brl(resTotal)}</span><span class="n">${resMes}</span>${resLinhas}</div>
   <div class="kpi fixos" data-det="fixos" role="button" tabindex="0">${cab("fixo", "Gastos fixos")}<span class="v">${brl(c.fxT)}</span>${c.fxPend ? `<span class="pill warn">${brl0(c.fxPend)} a pagar</span>` : (c.fx.length ? `<span class="pill good">✓ Todos pagos</span>` : `<span class="n">Nenhum cadastrado</span>`)}${c.fxCartao ? `<span class="n">${brl0(c.fxCartao)} no cartão</span>` : ""}</div>
   <div class="kpi faturas" data-det="faturas" role="button" tabindex="0">${cab("cartao", "Faturas do mês")}<span class="v">${brl(c.fatT)}</span>${c.fatAberta ? `<span class="pill warn">${brl0(c.fatAberta)} a pagar</span>` : (c.fat.length ? `<span class="pill good">✓ Pagas</span>` : `<span class="n">Nenhuma fatura neste mês</span>`)}${noCartao ? `<span class="n">${brl0(noCartao)} em compras no cartão neste mês</span>` : ""}</div>`;
  let t = "";
  if (!S.loaded) t = "Carregando seus lançamentos…";
  else if (!c.it.length && !c.fx.length && !c.fr.length) t = "Nenhum lançamento neste mês ainda. Lance o primeiro gasto, ou traga o extrato do cartão em Cartões.";
  else if (c.fase === "atual") {
    const med = c.dias ? c.vari / c.dias : 0;
    // Curto: a previsão já está no quadro do topo; aqui fica só o dia a dia.
    t = `Dia a dia: <strong>${brl(c.vari)}</strong> em ${c.dias} ${c.dias === 1 ? "dia" : "dias"} (${brl(med)} por dia).${c.comprasCartao ? ` No cartão: ${brl0(c.comprasCartao)}, para a próxima fatura.` : ""}`;
  } else if (c.fase === "passado") {
    const top = catMap(c)[0];
    t = `O mês fechou com custo de <strong>${brl(c.custo)}</strong>${top ? `. A maior categoria foi <strong>${esc(top[0])}</strong> (${brl0(top[1])}, ${Math.round((top[1] / c.custo) * 100)}% do custo)` : ""}.`;
  } else t = `Mês futuro: por enquanto aparecem só os gastos fixos previstos (${brl(c.fxT)}).`;
  // Duas leituras a mais, quando existem: como está em relação ao mês passado e os limites perto de estourar.
  const cmp = S.loaded ? comparaComMesAnterior(S.data, c, S.mes) : null;
  if (cmp && Math.abs(cmp.dif) >= 1) t += ` <strong>${brl0(Math.abs(cmp.dif))} a ${cmp.dif > 0 ? "mais" : "menos"}</strong> que em ${nomeMes(cmp.mes)} até hoje.`;
  const perto = S.loaded ? usoDosLimites(c, S.prefs.limites).filter((u) => u.pct >= 80) : [];
  const alerta = perto.length ? `<span class="lim-aviso">${perto.slice(0, 3).map((u) => u.passou ? `<b class="txt-bad">${esc(u.cat)} passou ${brl0(u.passou)} do limite</b>` : `<b>${esc(u.cat)} já usou ${u.pct}% do limite</b>`).join(" · ")}</span>` : "";
  $("insight").innerHTML = ico("luz") + `<span>${t}${alerta}</span>`;
}

/** "Seu dia": o que foi gasto hoje, o convite para anotar e a sequência de dias anotados. Só aparece no mês atual. */
function renderDia(c) {
  const host = $("dia"), hj = hoje();
  if (!S.loaded || c.fase !== "atual") { host.hidden = true; host.innerHTML = ""; return; }
  const g = gastoDoDia(S.data, hj), seq = sequenciaDeDias(S.data, hj, S.prefs.semGasto || []), zero = (S.prefs.semGasto || []).includes(hj);
  const titulo = g.n ? `Hoje você gastou ${brl(g.total)}` : zero ? "Hoje: dia sem gastos" : "Nada anotado hoje";
  const sub = g.n ? `em ${g.n} ${g.n === 1 ? "lançamento" : "lançamentos"}` : zero ? "Anotado. Se aparecer um gasto, é só lançar." : "Anote os gastos de hoje ou marque que não gastou nada.";
  const seqTxt = seq.feitoHoje ? (seq.dias > 1 ? `${seq.dias} dias seguidos anotando` : "Primeiro dia da sequência") : seq.dias ? `Anote hoje para manter ${seq.dias === 1 ? "o dia de ontem em sequência" : `os ${seq.dias} dias seguidos`}` : "";
  host.hidden = false;
  host.innerHTML = `<div class="dia${seq.feitoHoje ? " feito" : ""}">
    <span class="ava ${seq.feitoHoje ? "in" : "res"}">${ico(seq.feitoHoje ? "ok" : "dia")}</span>
    <div class="tx"><b>${titulo}</b><span>${sub}</span>${seqTxt ? `<span class="seq">${ico("fogo")}${seqTxt}</span>` : ""}</div>
    <div class="acoes"><button class="btn sm primary" type="button" id="diaLancar">Lançar gasto</button>${g.n || zero ? "" : `<button class="btn sm" type="button" id="diaZero">Não gastei nada</button>`}</div></div>`;
  $("diaLancar").onclick = () => { S.tipo = "Despesa"; renderForm(); if (noCelular()) abrirLancar(); else { $("fValor").scrollIntoView({ block: "center" }); $("fValor").focus(); } };
  if ($("diaZero")) $("diaZero").onclick = () => {
    S.prefs.semGasto = [...new Set([...(S.prefs.semGasto || []), hj])].sort().slice(-90);   // guarda só os últimos 90 dias
    salvaPrefs(); render();
  };
}

/* ---------- limite de gastos do mês ---------- */
const irParaLimites = () => { S.view = "listas"; S.tab = "m"; render(); noCelular() ? scrollTo(0, 0) : $("listas").scrollIntoView({ block: "start" }); };
$("btnLimites").onclick = irParaLimites;
/** Frases do limite do mês, iguais no quadro do início e na aba Limites. */
function textoDoTeto(u) {
  const titulo = u.nivel >= 120 ? "Muito acima do limite" : u.nivel >= 100 ? "Passou do limite" : u.nivel >= 80 ? "Perto do limite" : "Dentro do limite";
  const frase = u.resta < 0 ? `Já são ${brl(-u.resta)} a mais${u.nivel >= 120 ? ` (${u.pct - 100}% acima)` : ""}.` : `Ainda cabem ${brl(u.resta)}.`;
  const ritmo = u.vaiPassar ? ` No ritmo atual o mês fecha em ${brl0(u.projecao)}, ${brl0(u.projecao - u.teto)} acima do limite.` : "";
  return { titulo, frase: frase + ritmo, cls: u.nivel >= 100 ? "bad" : u.nivel >= 80 || u.vaiPassar ? "warn" : "ok" };
}
const barraDoTeto = (u) => { const esc2 = Math.max(100, u.pct); return `<span class="tbar"><i style="width:${Math.min(100, (u.pct / esc2) * 100).toFixed(1)}%"></i><em style="left:${(80 / esc2 * 100).toFixed(1)}%"></em>${u.pct > 100 ? `<em class="fim" style="left:${(100 / esc2 * 100).toFixed(1)}%"></em>` : ""}</span>`; };

/** Quadro do início: quanto do limite do mês já foi usado. Sem limite, convida a definir um. */
function renderTeto(c) {
  const host = $("teto"), u = S.loaded ? usoDoTeto(c, S.prefs.teto) : null;
  // Sem limite definido, o convite só aparece depois dos primeiros passos: uma coisa de cada vez.
  if (!S.loaded || (!u && (c.fase !== "atual" || guiaVisivel()))) { host.hidden = true; host.innerHTML = ""; return; }
  host.hidden = false;
  if (!u) {
    host.innerHTML = `<div class="teto vazio"><span class="ava res">${ico("alvo")}</span><div class="tx"><b>Quanto você quer gastar no máximo por mês?</b><span>Defina um limite e o app avisa quando você estiver perto ou passar dele.</span></div><button class="btn sm" type="button" id="tetoIr">Definir limite</button></div>`;
  } else {
    const t = textoDoTeto(u);
    host.innerHTML = `<button type="button" class="teto ${t.cls}" id="tetoIr" aria-label="Limite do mês: ${u.pct}% usado. ${t.titulo}. Abrir limites">
      <span class="topo"><span class="l">${ico("alvo")}Limite de ${nomeMes(S.mes)}</span><span class="pill ${t.cls === "ok" ? "good" : t.cls}">${t.titulo}</span></span>
      <span class="num"><b>${brl(u.gasto)}</b> de ${brl(u.teto)} <em>${u.pct}%</em></span>${barraDoTeto(u)}<span class="n">${t.frase}</span></button>`;
  }
  $("tetoIr").onclick = irParaLimites;
}

/* ---------- metas do dinheiro guardado ---------- */
const mesAno = (m) => `${nomeMes(m)} de ${m.slice(0, 4)}`;
const brlc = (v) => (Number.isInteger(v) ? brl0(v) : brl(v));
const metasDe = () => (S.prefs.metas ||= {});
/** Quando a meta fica pronta, em palavras. Só valor e meses: o app não estima rendimento. */
function textoDaMeta(a) {
  if (a.concluida) return `Meta completa: você juntou ${brl(a.guardado)}.`;
  if (a.prazoPassou) return `A data que você escolheu já passou e ainda faltam ${brl(a.falta)}. Se quiser, escolha uma data nova.`;
  if (a.ate) {
    const base = `Para chegar em ${mesAno(a.ate)}: ${brl(a.porMes)} por mês.`;
    const com = a.plano > 0 ? `Com os ${brlc(a.plano)} do seu combinado` : a.ritmo > 0 ? `No seu ritmo (${brl0(a.ritmo)} por mês)` : "";
    return base + (!com ? "" : a.noPrazo ? ` ${com} dá tempo.` : a.previsao ? ` ${com}, ela fica pronta em ${mesAno(a.previsao)}.` : "");
  }
  if (a.previsao) return (a.plano > 0 ? `Guardando os ${brlc(a.plano)} por mês do seu combinado` : a.mesesDeBase ? `Guardando ${brl0(a.ritmo)} por mês, como você vem fazendo` : `Guardando todo mês os ${brl0(a.ritmo)} que guardou neste`) + `, a meta fica pronta em ${mesAno(a.previsao)}.`;
  return a.guardado > 0 ? `Faltam ${brl(a.falta)}. Escolha uma data ou um valor por mês e o app diz quando a meta fica pronta.` : `Faltam ${brl(a.falta)}. Quando você começar a guardar, o app mostra em que mês a meta fica pronta.`;
}
/** O que dá para fazer neste mês, sem cobrança: em mês apertado o app só diz que tudo bem. */
function textoDaSugestao(s) {
  if (!s || s.tipo === "feita") return "";
  if (s.tipo === "feito") return `A parte deste mês já foi guardada (${brl(s.guardado)}).`;
  if (s.tipo === "pulou") return `Você pulou ${nomeMes(mKey(hoje()))}. Tudo bem: em ${nomeMes(addM(mKey(hoje()), 1))} o combinado volta.`;
  if (s.tipo === "apertado") return "Este mês está apertado. Tudo bem não guardar agora: a meta continua aqui.";
  if (s.tipo === "livre") return `Devem sobrar ${brl0(s.sobra)} neste mês. O que você guardar disso já faz a meta andar.`;
  return s.completo ? `Devem sobrar ${brl0(s.sobra)} neste mês. Guardando ${brl(s.valor)}, a meta segue no ritmo.` : `Devem sobrar ${brl0(s.sobra)} neste mês. Guardando ${brl0(s.valor)}, a meta já anda um pouco.`;
}
/** Recado logo depois de guardar ou retirar dinheiro de um lugar que tem meta. */
function recadoDaMeta(antes, depois, retirou) {
  if (!depois) return "";
  const d = depois.destino;
  if (retirou) return depois.concluida ? ` A meta ${d} continua completa.`
    : ` Que pena que precisou retirar. Imprevistos acontecem, e o dinheiro guardado existe para isso. A meta ${d} continua aqui: faltam ${brl(depois.falta)}. Você merece chegar lá, e a gente ajuda.`;
  if (depois.concluida) return antes?.concluida ? ` A meta ${d} continua completa.` : ` Meta ${d} completa: ${brl(depois.alvo)} guardados. É a recompensa pelo seu esforço. Parabéns!`;
  if (depois.marco > (antes?.marco || 0)) return ` Você chegou a ${depois.marco}% da meta ${d}. ${depois.marco === 50 ? "Metade do caminho" : depois.marco === 75 ? "Falta pouco" : "Bom começo"}: faltam ${brl(depois.falta)}.`;
  return ` Meta ${d}: ${depois.pct}%, faltam ${brl(depois.falta)}. Mais um passo.`;
}
const cartaoDaMeta = (a, dica, cls = "") => `<span class="topo"><span class="l">${ico("cofre")}Meta: ${esc(a.destino)}</span><span class="pill ${a.concluida ? "good" : "info"}">${a.concluida ? "Completa" : a.pct + "%"}</span></span>
  <span class="num"><b>${brl(a.guardado)}</b> de ${brl(a.alvo)}</span><span class="tbar mbar${cls}"><i style="width:${Math.max(0, a.pct)}%"></i></span>
  <span class="n">${textoDaMeta(a)}</span>${dica ? `<span class="n dica">${dica}</span>` : ""}`;

/** Quadro do início: as metas em andamento (até duas) ou, para quem não tem, o convite para criar uma. */
function renderMetas(c) {
  const host = $("metas"), some = () => { host.hidden = true; host.innerHTML = ""; };
  if (!S.loaded || c.fase !== "atual") return some();
  // No início ficam as metas que ainda faltam; a completa aparece só no mês em que foi completada.
  const todas = metasEmAndamento(S.data, S.prefs.metas, hoje()), l = todas.filter((a) => !a.concluida || a.noMes > 0);
  if (!l.length) {
    // O convite vem depois dos primeiros passos e do limite: uma coisa de cada vez.
    if (todas.length || guiaVisivel() || S.prefs.metaConvite === false || !(Number(S.prefs.teto) > 0 || reservaAcumulada(S.data, S.mes) > 0)) return some();
    host.hidden = false;
    host.innerHTML = `<div class="teto vazio meta"><span class="ava res">${ico("cofre")}</span><div class="tx"><b>Está guardando para alguma coisa?</b><span>Crie uma meta e o app mostra quanto falta e quando você chega lá.</span></div>
      <div class="acoes"><button class="btn sm primary" type="button" id="metaCriar">Criar meta</button><button class="btn sm" type="button" id="metaDepois">Agora não</button></div></div>`;
    $("metaCriar").onclick = () => detalheMeta(guardadoPorDestino(S.data, S.mes)[0]?.[0] || cats("Reserva")[0], true);
    $("metaDepois").onclick = () => { S.prefs.metaConvite = false; salvaPrefs(); render(); toast("Combinado. Para criar depois, toque em Dinheiro guardado."); };
    return;
  }
  const MAX = 2, vis = l.slice(0, MAX);
  host.hidden = false;
  host.innerHTML = vis.map((a, i) => `<button type="button" class="teto meta${a.concluida ? " ok" : ""}" data-meta="${i}" aria-label="Meta ${esc(a.destino)}: ${a.pct}% guardado. Abrir">${cartaoDaMeta(a, textoDaSugestao(sugestaoDaMeta(a, c)))}</button>`).join("")
    + (todas.length > vis.length ? `<button class="link" type="button" id="metasTodas">Ver as ${todas.length} metas</button>` : "");
  host.querySelectorAll("[data-meta]").forEach((b) => (b.onclick = () => detalheMeta(vis[Number(b.dataset.meta)].destino)));
  if ($("metasTodas")) $("metasTodas").onclick = () => detalheKpi("guardado");
}

/** Leva para o formulário de lançar já em Guardar, no destino da meta e com o valor sugerido. */
function guardarParaMeta(destino, valor = 0) {
  $("dlg").close(); S.tipo = "Reserva"; S.mes = mKey(hoje()); render();
  if (cats("Reserva").includes(destino)) $("fCat").value = destino;
  $("fForma").value = "Guardar"; $("fData").value = hoje(); $("fFixo").checked = false;
  $("fValor").value = valor > 0 ? valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "";
  renderForm();
  if (noCelular()) abrirLancar(); else { $("fValor").scrollIntoView({ block: "center" }); $("fValor").focus(); }
}

/** Quadro de uma meta: como ela está, o que dá para fazer neste mês e o formulário para criar, mudar ou tirar. */
function detalheMeta(destino, escolher = false, aviso = "") {
  const hj = hoje(), cur = mKey(hj), meta = metasDe()[destino], a = andamentoDaMeta(S.data, destino, meta, hj);
  const s = a ? sugestaoDaMeta(a, calcMes(S.data, cur, hj)) : null, dica = textoDaSugestao(s);
  const aqui = (guardadoPorDestino(S.data, cur).find(([k]) => k === destino) || [0, 0])[1];
  const dinheiro = (v) => (v > 0 ? v.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "");
  const destinos = [...new Set([...cats("Reserva"), ...Object.keys(metasDe()), destino])];
  const meses = Array.from({ length: 120 }, (_, i) => addM(cur, i)); if (meta?.ate && !meses.includes(meta.ate)) meses.unshift(meta.ate);
  const salario = S.data.fixos.find((f) => f.tipo === "Receita" && f.repete !== "semanal" && !f.ate), diaPadrao = Number(meta?.plano?.dia) || Number(salario?.dia) || Number(hj.slice(8, 10));
  const avisar = S.prefs.avisos?.meta !== false, demo = S.store?.kind === "local";
  openDlg(`<h3>${a ? "Meta" : "Nova meta"}: ${esc(destino)}</h3>
    ${aviso ? `<p class="hint meta-aviso">${aviso}</p>` : ""}
    ${a ? `<div class="teto meta parado${a.concluida ? " ok" : ""}">${cartaoDaMeta(a, dica)}</div>
      ${a.concluida ? "" : `<button class="btn primary" type="button" id="metaGuardar">${s?.tipo === "guardar" ? `Guardar ${brl(s.valor)} agora` : "Guardar agora"}</button>`}`
      : `<p class="hint" style="margin:0 0 4px;font-size:13px">${aqui > 0 ? `Você já tem <b>${brl(aqui)}</b> guardados aqui. Diga aonde quer chegar.` : "Diga quanto quer juntar. O que você guardar aqui passa a contar para a meta."}</p>`}
    <form id="metaForm" class="meta-form" autocomplete="off">
      ${escolher && !a ? `<label class="f larga">Onde fica esse dinheiro<select class="in" id="metaDest">${opts(destinos, destino)}</select></label>` : ""}
      <label class="f">Quanto você quer juntar (R$)<input class="in money" id="metaValor" inputmode="decimal" placeholder="Ex.: 6.000,00" value="${esc(dinheiro(Number(meta?.valor) || 0))}"></label>
      <label class="f">Até quando (opcional)<select class="in" id="metaAte"><option value="">Sem data</option>${meses.map((m) => `<option value="${m}"${m === meta?.ate ? " selected" : ""}>${mesAno(m)}</option>`).join("")}</select></label>
      <label class="f">Guardar todo mês (opcional, R$)<input class="in money" id="metaPlano" inputmode="decimal" placeholder="Ex.: 300,00" value="${esc(dinheiro(Number(meta?.plano?.valor) || 0))}"></label>
      <label class="f">No dia<select class="in" id="metaDia">${Array.from({ length: 31 }, (_, i) => `<option${i + 1 === diaPadrao ? " selected" : ""}>${i + 1}</option>`).join("")}</select></label>
      <p class="hint larga">O valor por mês vira um <b>combinado</b>: ele aparece todo mês em Próximos vencimentos para você marcar <b>Guardei</b>. Não é uma conta: dá para pular o mês quando precisar, sem problema.</p>
      <p class="hint larga meta-prev" id="metaPrev" aria-live="polite"></p>
      <p class="hint larga" id="metaErro" role="alert" hidden></p>
      <div class="meta-acoes larga"><button class="btn primary" type="submit">${a ? "Salvar mudanças" : "Criar meta"}</button>${meta ? `<button class="btn" type="button" id="metaTirar">Tirar a meta</button>` : ""}</div>
    </form>
    <h4 class="meta-h">Recados da meta</h4>
    <label class="check"><input type="checkbox" id="metaAvisar" ${avisar ? "checked" : ""}> Receber lembretes e parabéns das metas</label>
    <p class="hint" style="margin:6px 0 0">${demo ? "Na demonstração os recados não são enviados." : "Lembrete: no dia em que o seu dinheiro entra e dois dias antes de o mês acabar, só quando deve sobrar. Em mês apertado o app não manda nada. Parabéns: no dia seguinte a você guardar. Chegam por e-mail e notificação, como os avisos de contas."}</p>
    <p class="hint" style="margin:10px 0 0">A conta é simples: o que falta dividido pelos meses. O app não calcula rendimento de investimento.</p>
    <div class="actions"><button class="btn" type="button" data-close>Fechar</button></div>`);
  const lido = () => {
    const v = parseMoney($("metaValor").value), pv = parseMoney($("metaPlano").value);
    return { ...(meta || {}), valor: v > 0 ? round2(v) : 0, ate: $("metaAte").value, plano: pv > 0 ? { valor: round2(pv), dia: Number($("metaDia").value) } : undefined };
  };
  // Enquanto a pessoa digita, o app já mostra a conta com os valores novos.
  const previa = () => {
    const m = lido(), p = andamentoDaMeta(S.data, destino, m, hj), host = $("metaPrev");
    if (!p) { host.textContent = ""; return; }
    const usar = !p.concluida && !m.plano && p.porMes > 0 ? p.porMes : 0;
    host.innerHTML = esc(textoDaMeta(p)) + (usar ? ` <button class="link" type="button" id="metaUsar">Combinar ${brl(usar)} por mês</button>` : "");
    if (usar) $("metaUsar").onclick = () => { $("metaPlano").value = dinheiro(usar); previa(); };
  };
  ["metaValor", "metaPlano"].forEach((id) => $(id).addEventListener("input", previa)); $("metaAte").onchange = previa; $("metaDia").onchange = previa;
  if (!a) previa();
  if ($("metaDest")) $("metaDest").onchange = (e) => detalheMeta(e.target.value, true);
  if ($("metaGuardar")) $("metaGuardar").onclick = () => guardarParaMeta(destino, s?.tipo === "guardar" ? s.valor : 0);
  $("metaForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const m = lido(), erro = $("metaErro");
    if (!(m.valor > 0)) { erro.hidden = false; erro.style.color = "var(--bad)"; erro.textContent = "Digite quanto você quer juntar, por exemplo 6.000,00."; $("metaValor").focus(); return; }
    if (!m.plano) { delete m.plano; delete m.pulos; }
    metasDe()[destino] = m; await salvaPrefs(); render();
    detalheMeta(destino, false, a ? "Meta atualizada." : "Meta criada. Ela já aparece no início do app.");
  });
  if ($("metaTirar")) $("metaTirar").onclick = async () => {
    delete metasDe()[destino]; await salvaPrefs(); $("dlg").close(); render();
    toastOuFlash(`${destino} ficou sem meta. O dinheiro guardado continua igual.`);
  };
  $("metaAvisar").onchange = async (e) => { S.prefs.avisos = { ...S.prefs.avisos, meta: e.target.checked }; await salvaPrefs(); };
}

/** Combinado da meta marcado como feito: vira um lançamento de dinheiro guardado com a data de hoje. */
async function guardarCombinado(x) {
  const hj = hoje(), antes = andamentoDaMeta(S.data, x.destino, S.prefs.metas?.[x.destino], hj);
  const row = { data: hj, descricao: "Combinado da meta", tipo: "Reserva", categoria: x.destino, forma: "", valor: x.valor, import_key: null };
  let novos; if (!(await grava(async () => { novos = await S.store.addLancamentos([row]); }))) return render();
  S.data.lancamentos.push(...novos); render();
  toastOuFlash(`Guardado: ${brl(x.valor)} em ${x.destino}.` + recadoDaMeta(antes, andamentoDaMeta(S.data, x.destino, S.prefs.metas?.[x.destino], hj), false));
}
/** Pular o combinado deste mês: nada é cobrado e no mês seguinte ele volta. */
async function pularCombinado(x) {
  const cur = mKey(hoje()), m = metasDe()[x.destino]; if (!m) return;
  m.pulos = [...new Set([...(m.pulos || []), cur])].sort().slice(-12);
  await salvaPrefs(); render();
  toastOuFlash(`Tudo bem: ${nomeMes(cur)} fica sem o combinado de ${x.destino}. Em ${nomeMes(addM(cur, 1))} ele volta.`);
}

/**
 * "O que sobra para viver o mês": o salário inteiro, o que já tem dono, a sobra e o dia a dia descontando dela,
 * lançamento por lançamento, com o ritmo pelo andamento do mês. Fica no topo do Planejar.
 */
function htmlSobra(c) {
  const s = sobraDoMes(c), mes = nomeMes(S.mes), atual = c.fase === "atual";
  if (!S.loaded) return "";
  if (!(s.entra > 0)) return `<section class="sobra-pl"><h2>O que sobra para viver ${mes}</h2>
    <p class="hint">Para o app mostrar o que sobra do salário depois das contas, cadastre o que entra todo mês (o salário, por exemplo) em <b>Entradas fixas</b>.</p>
    <button class="btn primary" type="button" data-sobra-ir="r">Cadastrar o salário</button></section>`;
  const fr = c.fr.map((f) => esc(f.descricao)).slice(0, 3).join(", ");
  const linha = (rot, sub, v, cls = "") => `<li class="${cls}"><span><b>${rot}</b>${sub ? `<small>${sub}</small>` : ""}</span><b class="v">${v}</b></li>`;
  const cascata = `<ul class="cascata">
    ${linha("Entra no mês", (fr ? fr : "o que você lançou como entrada") + (s.retirado ? ` · inclui ${brl(s.retirado)} retirados do guardado` : ""), brl(s.entra), "pos")}
    ${linha("− Contas fixas", "aluguel, internet e o que se repete, pagas ou não", "− " + brl(s.fixos))}
    ${s.faturas ? linha("− Faturas do cartão", "as que vencem neste mês", "− " + brl(s.faturas)) : ""}
    ${s.guardado ? linha("− Guardado", "reserva, investimentos e metas", "− " + brl(s.guardado)) : ""}
    ${linha(`= Sobra para viver ${mes}`, "mercado, transporte, lazer: o dia a dia", brl(s.livre), "tot" + (s.livre <= 0 ? " neg" : ""))}</ul>`;
  if (s.livre <= 0) return `<section class="sobra-pl"><h2>O que sobra para viver ${mes}</h2>${cascata}
    <p class="sobra-aviso bad">As contas fixas e o que já tem dono passam das entradas: este mês não sobra nada para o dia a dia. Cada gasto novo aumenta o que falta.</p></section>`;
  const pct = Math.min(100, s.pct), idealPct = Math.min(100, (s.ideal / s.livre) * 100), passou = s.resta < 0;
  const ritmo = !atual ? "" : s.ritmo === "dentro"
    ? `<p class="sobra-aviso ok">No ritmo certo. Hoje é dia ${c.dias} de ${c.n}: para a sobra durar o mês todo, dava para ter usado até <b>${brl(s.ideal)}</b>, e você usou <b>${brl(s.usado)}</b>.</p>`
    : `<p class="sobra-aviso warn">Mais rápido que o ideal. Hoje é dia ${c.dias} de ${c.n}: para a sobra durar o mês todo por igual, dava para ter usado até <b>${brl(s.ideal)}</b>, e já foram <b>${brl(s.usado)}</b>.${s.resta > 0 ? " Se foi uma compra grande de uma vez (como o mercado do mês), tudo bem: o valor por dia abaixo já mostra quanto dá para gastar daqui em diante." : ""}</p>`;
  const porDia = atual ? (s.porDia > 0 ? `<div class="sobra-dia"><span>Dá para gastar por dia</span><b>${brl(s.porDia)}</b><small>nos ${s.restam} ${s.restam === 1 ? "dia que falta" : "dias que faltam"} · ${brl(s.porSemana)} por semana</small></div>` : "") : "";
  // Linha do tempo: cada gasto do dia a dia e quanto da sobra restou depois dele.
  const dd = c.it.filter((x) => x.tipo === "Despesa" && x.forma !== CARTAO).sort((a, b) => a.data.localeCompare(b.data) || String(a.created_at || "").localeCompare(String(b.created_at || "")));
  let saldo = s.livre;
  const passos = dd.map((x) => { saldo = round2(saldo - Number(x.valor)); return { x, saldo }; }).reverse();
  const MAX = 30, vis = passos.slice(0, MAX);
  const tempo = `<h3 class="sobra-h3">Como a sobra foi mudando</h3>
    <ul class="itens sobra-tempo">${vis.map(({ x, saldo: sd }) => `<li class="toca" role="button" tabindex="0" data-ref="${esc(JSON.stringify({ k: "lanc", id: x.id }))}"><span class="d">${ddmm(x.data)}</span><span>${esc(x.descricao || x.categoria)} <span class="tag t-dia">Dia a dia</span><span class="mini">${esc(x.categoria)} · − ${brl(x.valor)}</span></span><b class="${sd < 0 ? "txt-bad" : ""}">${sd < 0 ? "faltam " + brl(-sd) : "restam " + brl(sd)}</b></li>`).join("")}
      <li class="ini"><span class="d">01/${S.mes.slice(5)}</span><span>Começo do mês<span class="mini">a sobra depois das contas fixas</span></span><b>${brl(s.livre)}</b></li></ul>
    ${passos.length > MAX ? `<p class="hint">Mostrando os ${MAX} mais recentes. Todos estão em Lançamentos.</p>` : ""}
    ${c.comprasCartao ? `<p class="hint">Compras no cartão neste mês (${brl(c.comprasCartao)}) não descontam agora: entram na sobra do mês em que a fatura vencer.</p>` : ""}`;
  return `<section class="sobra-pl"><h2>O que sobra para viver ${mes}</h2>
    <p class="hint">Entradas menos as contas que já têm dono. Cada gasto do dia a dia desconta daqui.</p>
    ${cascata}
    <div class="sobra-agora${passou ? " neg" : ""}"><span>${passou ? "Passou da sobra em" : "Ainda resta da sobra"}</span><b>${brl(Math.abs(s.resta))}</b>
      <small>Já foram ${brl(s.usado)} no dia a dia${s.pct !== null ? ` (${s.pct}% da sobra)` : ""}</small></div>
    <div class="sobra-barra" role="img" aria-label="Usado ${s.pct}% da sobra${atual ? `; o ideal até hoje era ${Math.round(idealPct)}%` : ""}"><i style="width:${pct}%"></i>${atual ? `<em style="left:${idealPct.toFixed(1)}%" title="ideal até hoje"></em>` : ""}</div>
    ${atual ? `<p class="sobra-leg"><span><i class="u"></i>usado</span><span><i class="m"></i>ideal até hoje</span></p>` : ""}
    ${ritmo}${porDia}${dd.length ? tempo : `<p class="hint">Nenhum gasto do dia a dia lançado ainda: a sobra está inteira.</p>`}
  </section>`;
}
// Na aba Planejar: tocar num gasto da linha do tempo abre a edição; o botão do salário leva às Entradas fixas.
$("pane-m").addEventListener("click", (e) => {
  const li = e.target.closest(".sobra-pl [data-ref]"); if (li) return abrirItem(JSON.parse(li.dataset.ref));
  const ir = e.target.closest("[data-sobra-ir]"); if (ir) { S.view = "listas"; S.tab = ir.dataset.sobraIr; render(); scrollTo(0, 0); }
});
/** Aba Limites: o limite do mês, os avisos e os limites por categoria. */
function paneM(c) {
  const host = $("pane-m"), u = usoDoTeto(c, S.prefs.teto), cur = mKey(hoje()), catL = cats("Despesa"), gasto = new Map(catMap(c));
  // Para ajudar a estimar: a média do custo dos últimos meses fechados que têm lançamentos.
  const antes = [1, 2, 3].map((k) => calcMes(S.data, addM(cur, -k), hoje())).filter((x) => x.custo > 0), media = antes.length ? round2(antes.reduce((t, x) => t + x.custo, 0) / antes.length) : 0;
  const atual = calcMes(S.data, cur, hoje()), dinheiro = (v) => (v > 0 ? v.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "");
  const avisar = S.prefs.avisos?.limite !== false, t = u ? textoDoTeto(u) : null, lim = S.prefs.limites || {};
  const metasP = S.loaded ? metasEmAndamento(S.data, S.prefs.metas, hoje()) : [];
  host.innerHTML = `${htmlSobra(c)}${htmlCaixinhas()}<h2 class="pl-h">Limite de gasto</h2><p class="hint" style="margin-top:0;font-size:13px">O máximo que você quer gastar no mês. O app avisa quando chegar perto.</p>
    <form id="tetoForm" class="teto-form" autocomplete="off">
      <label class="f">Limite de gastos por mês (R$)<input class="in money" id="tetoValor" inputmode="decimal" placeholder="Ex.: 3.500,00" value="${esc(dinheiro(Number(S.prefs.teto) || 0))}"></label>
      <button class="btn primary" type="submit">${u ? "Mudar limite" : "Salvar limite"}</button>
      <p class="hint">Entra na conta tudo o que sai no mês: contas fixas, gastos do dia a dia e faturas de cartão. Dinheiro guardado não entra.${media ? ` Para se basear: ${antes.length === 1 ? "no último mês" : `nos últimos ${antes.length} meses`} seu custo foi de <b>${brl(media)}</b>${antes.length > 1 ? " em média" : ""}${atual.rec ? `, e neste mês entram ${brl(atual.rec)}` : ""}. <button class="link" type="button" id="tetoUsar">Usar ${brl0(Math.ceil(media / 50) * 50)}</button>` : ""}${u ? " Para tirar o limite, apague o valor e salve." : ""}</p>
    </form>
    ${u ? `<div class="teto ${t.cls} parado"><span class="topo"><span class="l">${ico("alvo")}Uso do limite em ${nomeMes(S.mes)}</span><span class="pill ${t.cls === "ok" ? "good" : t.cls}">${t.titulo}</span></span>
      <span class="num"><b>${brl(u.gasto)}</b> de ${brl(u.teto)} <em>${u.pct}%</em></span>${barraDoTeto(u)}<span class="n">${t.frase}</span></div>` : ""}
    <h3 class="sub-h">Metas do dinheiro guardado</h3>
    ${metasP.length ? `<div class="plano-metas">${metasP.map((a, i) => `<button type="button" class="teto meta${a.concluida ? " ok" : ""}" data-pmeta="${i}" aria-label="Meta ${esc(a.destino)}: ${a.pct}% guardado. Abrir">${cartaoDaMeta(a, "")}</button>`).join("")}</div>`
      : `<p class="hint" style="margin-top:0">Diga quanto quer juntar e o app mostra quanto falta e em que mês você chega lá.</p>`}
    <button class="btn" type="button" id="planoMeta">${metasP.length ? "Ver o dinheiro guardado" : "Criar uma meta"}</button>
    <h3 class="sub-h">Limite por categoria</h3>
    <p class="hint" style="margin-top:0">Opcional. Deixe em branco as categorias que não precisam de limite.</p>
    <form id="limCats" class="lim-cats" autocomplete="off">
      ${catL.map((k, i) => `<label class="lc">${ava(k)}<span class="tx"><b>${esc(k)}</b><span>${brl(gasto.get(k) || 0)} em ${nomeMes(S.mes)}</span></span><input class="in money" data-cat="${i}" inputmode="decimal" placeholder="Sem limite" aria-label="Limite para ${esc(k)}" value="${esc(dinheiro(Number(lim[k]) || 0))}"></label>`).join("")}
      <button class="btn" type="submit">Salvar limites das categorias</button>
    </form>
    <h3 class="sub-h">Avisos do limite</h3>
    <label class="check"><input type="checkbox" id="tetoAvisar" ${avisar ? "checked" : ""}> Avisar por e-mail e notificação no celular</label>
    <p class="hint" style="margin:6px 0 0">Você recebe um aviso de manhã quando chegar a <b>80%</b> do limite, outro quando <b>passar</b> e outro se passar em <b>mais de 20%</b>. Cada um chega uma vez no mês. Dentro do app, o quadro do início muda de cor na hora.
      ${S.store?.kind === "local" ? "Na demonstração os avisos por e-mail e notificação não são enviados." : `Os canais (e-mail e notificação neste aparelho) são os mesmos dos avisos de contas. <button class="link" type="button" id="tetoCanais">Ver em Ajustes</button>`}</p>`;
  host.querySelectorAll("[data-pmeta]").forEach((b) => (b.onclick = () => detalheMeta(metasP[Number(b.dataset.pmeta)].destino)));
  $("planoMeta").onclick = () => (metasP.length ? detalheKpi("guardado") : detalheMeta(guardadoPorDestino(S.data, S.mes)[0]?.[0] || cats("Reserva")[0], true));
  if ($("tetoUsar")) $("tetoUsar").onclick = () => { $("tetoValor").value = dinheiro(Math.ceil(media / 50) * 50); $("tetoValor").focus(); };
  if ($("tetoCanais")) $("tetoCanais").onclick = () => $("btnAjustes").click();
  $("tetoForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const v = parseMoney($("tetoValor").value); S.prefs.teto = v > 0 ? round2(v) : 0;
    await salvaPrefs(); render();
    toastOuFlash(v > 0 ? `Limite do mês: ${brl(round2(v))}.` : "O mês ficou sem limite.");
  });
  $("tetoAvisar").onchange = async (e) => { S.prefs.avisos = { ...S.prefs.avisos, limite: e.target.checked }; await salvaPrefs(); toastOuFlash(e.target.checked ? "Avisos do limite ligados." : "Avisos do limite desligados."); };
  $("limCats").addEventListener("submit", async (e) => {
    e.preventDefault();
    const novo = {}; host.querySelectorAll("[data-cat]").forEach((inp) => { const v = parseMoney(inp.value); if (v > 0) novo[catL[Number(inp.dataset.cat)]] = round2(v); });
    // Limite de categoria que não está mais na lista (foi removida em Ajustes) continua guardado.
    for (const [k, v] of Object.entries(lim)) if (!catL.includes(k)) novo[k] = v;
    S.prefs.limites = novo; await salvaPrefs(); render();
    toastOuFlash(`${Object.keys(novo).length} ${Object.keys(novo).length === 1 ? "categoria com limite" : "categorias com limite"}.`);
  });
}

/** Explica, com os números da pessoa, como o app chega ao que sobra e ao quanto dá para gastar por dia. */
function entendaAConta(c) {
  const rx = raioX(c), livre = livrePorDia(c), mes = nomeMes(S.mes), menos = (v) => `− ${brl(v)}`;
  const linha = (t, s2, v, cls = "") => `<li><span></span><span>${t}${s2 ? `<span class="mini">${s2}</span>` : ""}</span><b class="${cls}">${v}</b></li>`;
  const expl = { fixos: "aluguel, internet e o que mais se repete todo mês, pago ou não", dia: "o que você lançou no dia a dia, fora do cartão", faturas: "faturas que vencem neste mês", guardado: "o que você separou para reserva ou investimento" };
  // A régua: cada cor é uma parte do que sai; o trecho que resta é a sobra.
  const COR = { fixos: "#ffc857", dia: "#ff8fa3", faturas: "#c3b4ff", guardado: "#7ee0d2" }, falta = rx.sobra < 0;
  const regua = rx.partes.length || rx.sobra > 0 ? `<div class="conta-regua"><div class="regua${falta ? " over" : ""}" role="img" aria-label="${esc(rx.partes.map((p) => `${p.nome}: ${brl0(p.valor)}`).concat(falta ? [`Faltam ${brl0(-rx.sobra)}`] : [`Sobra ${brl0(rx.sobra)}`]).join(". "))}">
      ${rx.partes.map((p) => `<i style="width:${p.pct.toFixed(2)}%;background:${COR[p.k]}"></i>`).join("")}${rx.limitePct !== null ? `<em style="left:${rx.limitePct.toFixed(2)}%"></em>` : ""}</div>
    <ul class="regua-leg" aria-hidden="true">${rx.partes.map((p) => `<li><span><i style="background:${COR[p.k]}"></i>${p.nome}<b>${brl0(p.valor)}</b></span></li>`).join("")}
      <li><span><i class="${falta ? "falta" : "sobra"}"></i>${falta ? "Falta" : "Sobra"}<b>${brl0(Math.abs(rx.sobra))}</b></span></li></ul></div>` : "";
  abreDetalhe(`A conta de ${mes}`, "De onde vem cada número do resumo.", [{ html: `${regua}<ul class="itens conta">
      ${linha("Entra no mês", c.frT ? `${brl(c.frT)} de entradas fixas${c.recLanc ? ` e ${brl(c.recLanc)} lançados` : ""}` : "o que você lançou como entrada", brl(c.rec), "pos")}
      ${c.res < 0 ? linha("Retirado do que estava guardado", "", "+ " + brl(-c.res), "pos") : ""}
      ${rx.partes.map((p) => linha(p.nome, expl[p.k], menos(p.valor))).join("")}
      <li class="tot"><span></span><span>${rx.sobra < 0 ? "Falta" : "Sobra"}</span><b class="${rx.sobra < 0 ? "txt-bad" : "pos"}">${brl(Math.abs(rx.sobra))}</b></li></ul>
    ${livre ? `<p class="hint" style="margin:10px 0 0;font-size:13px">${livre.valor > 0 ? `Dividindo a sobra pelos ${livre.restam} ${livre.restam === 1 ? "dia que falta" : "dias que faltam"} (contando hoje), dá <b>${brl(livre.valor)} por dia</b>. Gastando até isso, o mês não fecha no vermelho.` : "Como não há sobra, o valor por dia fica em zero: cada gasto novo aumenta o que falta."}</p>
      <p class="hint" style="margin:8px 0 0;font-size:13px">"Projeção do mês" é a previsão: o app supõe que os gastos do dia a dia continuam no mesmo passo até o fim do mês. Ela mistura o ritmo deste mês com a média dos anteriores e não repete compras grandes que foram pontuais.</p>` : ""}
    ${c.comprasCartao ? `<p class="hint" style="margin:8px 0 0;font-size:13px">As compras no cartão deste mês (${brl(c.comprasCartao)}) não entram agora: elas pesam no mês em que a fatura vencer.</p>` : ""}` }]);
}

/** Quadro de contas a vencer nos próximos 30 dias (não depende do mês que está na tela). */
function renderVenc() {
  const host = $("venc"), l = S.loaded ? proximosVencimentos(S.data, hoje(), 30) : [];
  const total = round2(l.reduce((t, x) => t + x.valor, 0));
  const cab = (dir) => `<div class="sec-head"><h2>Próximos vencimentos</h2><span>${dir}</span></div>${S.loaded ? `<button class="link venc-cal" type="button" id="vencCal">${ico("agenda")}Ver no calendário</button>` : ""}`;
  // Alerta de saldo: uma linha acima da lista, só quando o mês está ou vai fechar no vermelho.
  const sd = S.loaded ? avisosDeHoje(S.data, hoje()).saldo : null;
  const alerta = !sd ? "" : `<li class="alerta ${sd.nivel}"><span class="quando ${sd.nivel}">${sd.tipo === "vermelho" ? "no vermelho" : "atenção"}</span>
      <span class="oque"><b>${sd.tipo === "vermelho" ? `Este mês já está ${brl(sd.valor)} no vermelho` : `No ritmo atual, o mês fecha ${brl(sd.valor)} no vermelho`}</b>
      <span>${sd.tipo === "vermelho" ? "As saídas do mês passaram das entradas." : "Ainda dá tempo de segurar os gastos do dia a dia."}</span></span></li>`;
  // Combinados das metas: aparecem junto, mas não são contas. Não entram no total e nunca ficam atrasados.
  const comb = S.loaded ? combinadosDoMes(S.data, S.prefs.metas, hoje()) : [];
  const combHtml = comb.map((x, i) => `<li class="comb" data-u="ok">
      <span class="dt"><b>${x.data.slice(8, 10)}</b><span>${MES3[Number(x.data.slice(5, 7)) - 1]}</span></span>
      <span class="oque"><b>Guardar para ${esc(x.destino)}</b><span>Combinado da meta · você escolhe</span></span>
      <span class="quando ok">${x.chegou ? "quando der" : "dia " + x.data.slice(8, 10)}</span>
      <span class="valor">${brl(x.valor)}</span>
      <span class="dupla"><button class="btn sm" type="button" data-cg="${i}">Guardei</button><button class="btn sm leve" type="button" data-cp="${i}">Pular</button></span></li>`).join("");
  const ligaComb = () => {
    host.querySelectorAll("[data-cg]").forEach((b) => (b.onclick = () => { b.disabled = true; guardarCombinado(comb[Number(b.dataset.cg)]); }));
    host.querySelectorAll("[data-cp]").forEach((b) => (b.onclick = () => { b.disabled = true; pularCombinado(comb[Number(b.dataset.cp)]); }));
  };
  if (!l.length) {
    const temDados = S.data.lancamentos.length || S.data.fixos.length || S.data.faturas.length;
    host.innerHTML = cab("Contagem calculada pela data de hoje.") + `<ul class="venc">${alerta}${combHtml}<li class="vazio">${!S.loaded ? "Carregando…"
      : temDados ? "Nenhuma conta para os próximos 30 dias. Tudo em dia."
      : "Nenhuma conta para os próximos 30 dias. Cadastre seus gastos fixos e as faturas do cartão para ser avisado aqui."}</li></ul>`;
    ligaComb();
    return;
  }
  const cls = (d) => (d < 0 ? "bad" : d <= 7 ? "warn" : "ok");
  // No topo aparecem só as primeiras (3 no celular, 5 no computador); o resto abre no "Ver todas".
  const MAX = noCelular() ? 3 : 5, vis = S.vencTodas ? l : l.slice(0, MAX);
  host.innerHTML = cab(`${l.length} ${l.length === 1 ? "conta" : "contas"} em 30 dias, somando <b>${brl(total)}</b>`) +
    `<ul class="venc">${alerta}${vis.map((x, i) => `<li data-u="${cls(x.dias)}">
      <span class="dt"><b>${x.data.slice(8, 10)}</b><span>${MES3[Number(x.data.slice(5, 7)) - 1]}</span></span>
      <span class="oque">${x.tipo === "fixo" && fotoDe("fixo", x.titulo) ? `<span class="mini-foto" style="background-image:url('${fotoDe("fixo", x.titulo)}')" aria-hidden="true"></span>` : ""}<b>${esc(x.titulo)}</b><span>${x.tipo === "fatura" ? "Fatura de cartão" : x.semanal ? "Gasto fixo · toda " + DIAS_SEMANA[diaDaSemana(x.data)] : "Gasto fixo"}</span></span>
      <span class="quando ${cls(x.dias)}">${quandoVence(x.dias)}</span>
      <span class="valor">${brl(x.valor)}</span>
      <button class="btn sm" type="button" data-pg="${i}">Já paguei</button></li>`).join("")}${combHtml}
      ${l.length > MAX ? `<li class="vazio"><button class="link" type="button" id="vencMais">${S.vencTodas ? "Mostrar só as próximas" : `Ver todas as ${l.length} contas`}</button></li>` : ""}</ul>`;
  host.querySelectorAll("[data-pg]").forEach((b) => (b.onclick = () => { b.disabled = true; pagarConta(vis[Number(b.dataset.pg)]); }));
  if ($("vencMais")) $("vencMais").onclick = () => { S.vencTodas = !S.vencTodas; renderVenc(); };
  ligaComb();
}
/* ---------- calendário de vencimentos: o mês inteiro, com o que vence e o que entra em cada dia ---------- */
$("venc").addEventListener("click", (e) => { if (e.target.closest("#vencCal")) calendario(mKey(hoje())); });
const SIT = { atrasada: ["!", "atrasada"], hoje: ["●", "vence hoje"], "a vencer": ["●", "a vencer"], paga: ["✓", "paga"] };
function calendario(m, escolhido = "") {
  const cal = calendarioDoMes(S.data, m, hoje()), hj = hoje(), ano = m.slice(0, 4);
  const sel = escolhido || (m === mKey(hj) ? hj : cal.dias.find((d) => d.contas.length || d.entradas.length)?.iso || `${m}-01`), dSel = cal.dias[Number(sel.slice(8, 10)) - 1];
  const curto = (v) => (v >= 1000 ? `${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k` : Math.round(v).toLocaleString("pt-BR"));
  const rotulo = (d) => `${d.dia} de ${nomeMes(m)}${d.iso === hj ? ", hoje" : ""}: ${d.contas.length ? `${d.contas.length} ${d.contas.length === 1 ? "conta" : "contas"}${d.aPagar ? `, ${brl(d.aPagar)} a pagar` : ", tudo pago"}${d.situacao === "atrasada" ? ", com atraso" : ""}` : "nenhuma conta"}${d.entradas.length ? `; entra ${brl(d.entradas.reduce((t, x) => t + x.valor, 0))}` : ""}`;
  const casa = (d) => `<button type="button" class="cal-d${d.situacao ? " s-" + d.situacao.replace(" ", "-") : ""}${d.iso === hj ? " hoje" : ""}${d.iso === sel ? " sel" : ""}" data-d="${d.iso}" aria-label="${esc(rotulo(d))}" aria-pressed="${d.iso === sel}">
      <span class="n">${d.dia}</span>${d.contas.length ? `<span class="m"><i aria-hidden="true">${SIT[d.situacao][0]}</i>${d.aPagar ? curto(d.aPagar) : ""}</span>` : ""}${d.entradas.length ? `<span class="e" aria-hidden="true">+</span>` : ""}</button>`;
  // Cada conta: tocar no nome abre a edição; o botão troca a situação (paga ⇄ não paga), para corrigir o que foi marcado errado.
  const tipoCal = (x) => { if (x.tipo === "fatura") return "Fatura de cartão"; const f = S.data.fixos.find((z) => z.id === x.id); return f ? tipoDoFixo(f)[0] + (f.ate ? " " + ateCurto(f.ate) : "") : "Conta fixa"; };
  const linha = (x, i) => `<li class="s-${x.situacao.replace(" ", "-")}"><span class="q"><i aria-hidden="true">${SIT[x.situacao][0]}</i>${SIT[x.situacao][1]}</span><button type="button" class="t" data-ced="${i}" aria-label="${esc(x.titulo)}: editar"><b>${esc(x.titulo)}</b><span>${esc(tipoCal(x))} · toque para editar</span></button><span class="v">${brl(x.valor)}</span>${x.situacao === "paga" ? `<button class="btn sm leve" type="button" data-cdes="${i}">Não paguei</button>` : `<button class="btn sm" type="button" data-cpg="${i}">Já paguei</button>`}</li>`;
  openDlg(`<h3>Calendário de vencimentos</h3>
    <div class="cal-nav"><button class="iconbtn" type="button" id="calAnt" aria-label="Mês anterior">${ico("esq")}</button><b>${nomeMes(m)} de ${ano}</b><button class="iconbtn" type="button" id="calProx" aria-label="Próximo mês">${ico("dir")}</button></div>
    <p class="hint cal-res">${cal.aPagar || cal.pago ? `A pagar no mês: <b>${brl(cal.aPagar)}</b>. Já pago: <b>${brl(cal.pago)}</b>.` : "Nenhuma conta neste mês. Cadastre os gastos fixos e o cartão para ver os vencimentos aqui."}${cal.entra ? ` Entradas fixas: <b>${brl(cal.entra)}</b>.` : ""}</p>
    <div class="cal" role="group" aria-label="Dias de ${nomeMes(m)}">${["D", "S", "T", "Q", "Q", "S", "S"].map((x, i) => `<span class="cal-s" aria-hidden="true" title="${DIAS_SEMANA[i]}">${x}</span>`).join("")}${"<span></span>".repeat(cal.vazios)}${cal.dias.map(casa).join("")}</div>
    <p class="cal-leg" aria-hidden="true"><span class="s-atrasada"><i>!</i>atrasada</span><span class="s-a-vencer"><i>●</i>a vencer</span><span class="s-paga"><i>✓</i>paga</span><span class="s-entra"><i>+</i>entrada</span></p>
    <div class="cal-dia" id="calDia"><h4>${dSel.dia} de ${nomeMes(m)}${dSel.iso === hj ? " (hoje)" : ""}</h4>
      ${dSel.contas.length || dSel.entradas.length ? `<ul class="cal-lista">${dSel.contas.map(linha).join("")}${dSel.entradas.map((x, i) => `<li class="s-entra"><span class="q"><i aria-hidden="true">+</i>entrada</span><button type="button" class="t" data-ced-e="${i}" aria-label="${esc(x.titulo)}: editar"><b>${esc(x.titulo)}</b><span>Entrada fixa · toque para editar</span></button><span class="v">${brl(x.valor)}</span></li>`).join("")}</ul>` : `<p class="hint" style="margin:0">Nada vence e nada entra neste dia.</p>`}</div>
    <div class="actions"><button class="btn primary" type="button" data-close>Fechar</button></div>`);
  $("calAnt").onclick = () => calendario(addM(m, -1)); $("calProx").onclick = () => calendario(addM(m, 1));
  $("dlgBody").querySelectorAll(".cal-d").forEach((b) => (b.onclick = () => calendario(m, b.dataset.d)));
  $("dlgBody").querySelectorAll("[data-cpg]").forEach((b) => (b.onclick = () => { const vez = pagarConta(dSel.contas[Number(b.dataset.cpg)]); calendario(m, sel); vez.then((ok) => { if (!ok && $("calDia")) calendario(m, sel); }); }));
  $("dlgBody").querySelectorAll("[data-cdes]").forEach((b) => (b.onclick = () => {
    const x = dSel.contas[Number(b.dataset.cdes)], vez = mudaPago(x, false); calendario(m, sel);
    toast(`${x.titulo}: voltou para a pagar.`); vez.then((ok) => { if (!ok && $("calDia")) calendario(m, sel); });
  }));
  // Tocar na conta abre a edição. Ao salvar ou cancelar, a edição fecha o quadro; o calendário abre de novo no mesmo dia.
  const editaDoCalendario = (ref) => { abrirItem(ref); $("dlg").addEventListener("close", () => { if (!$("dlg").open) setTimeout(() => calendario(m, sel), 0); }, { once: true }); };
  $("dlgBody").querySelectorAll("[data-ced]").forEach((b) => (b.onclick = () => { const x = dSel.contas[Number(b.dataset.ced)];
    editaDoCalendario(x.tipo === "fatura" ? { k: "fatura", id: x.id, cartao_id: x.cartao_id, cartao: x.cartao, venc: x.data } : { k: "fixo", id: x.id }); }));
  $("dlgBody").querySelectorAll("[data-ced-e]").forEach((b) => (b.onclick = () => editaDoCalendario({ k: "fixo", id: dSel.entradas[Number(b.dataset.cedE)].id })));
  $("dlgBody").querySelector(".cal-d.sel")?.focus({ preventScroll: true });
}

/**
 * "Já paguei" em um toque: a conta sai da lista na mesma hora e a gravação acontece por trás.
 * O aviso de baixo traz "Desfazer", para o toque sem querer. Se a gravação falhar, a conta volta e o aviso explica.
 */
function pagarConta(x) {
  const feito = mudaPago(x, true);
  const fim = x.tipo === "fixo" ? fimDoPrazo(x.id, x.chave) : "";
  toastDesfazer(fim || `${x.titulo}: marcada como paga.`, () => mudaPago(x, false).then((ok) => ok && toast(`${x.titulo} voltou para a lista.`)));
  return feito;
}
let filaPago = Promise.resolve();   // uma mudança de cada vez: o "Desfazer" só vai para o banco depois do "Já paguei"
/**
 * Muda a situação de uma conta (ocorrência de fixo ou fatura) primeiro na tela, depois no banco.
 * Fatura calculada que nunca foi mexida ganha o seu registro aqui (ver gravaFaturaAuto).
 * @returns {Promise<boolean>} se a gravação deu certo
 */
function mudaPago(x, pago) {
  let volta;
  if (x.tipo === "fixo") {
    const eh = (p) => p.fixo_id === x.id && p.mes === x.chave;
    if (pago) { S.data.pagos.push({ fixo_id: x.id, mes: x.chave }); volta = () => { const i = S.data.pagos.findIndex(eh); if (i >= 0) S.data.pagos.splice(i, 1); }; }
    else { const antes = S.data.pagos.filter(eh); S.data.pagos = S.data.pagos.filter((p) => !eh(p)); volta = () => S.data.pagos.push(...antes); }
  } else {
    const status = pago ? "Paga" : "Aberta";
    let reg = x.reg || S.data.faturas.find((z) => (x.id && z.id === x.id) || (x.auto && z.cartao_id === x.cartao_id && mKey(z.vencimento) === mKey(x.data)));
    if (reg) { const antes = reg.status; reg.status = status; volta = () => { reg.status = antes; }; }
    else {
      reg = { id: null, cartao_id: x.cartao_id, cartao: x.cartao, vencimento: x.data, valor: x.valor, status, valor_fixo: false };
      S.data.faturas.push(reg); volta = () => { const i = S.data.faturas.indexOf(reg); if (i >= 0) S.data.faturas.splice(i, 1); };
    }
    x.reg = reg;
  }
  render();
  const vez = filaPago.then(async () => {
    const ok = await grava(async () => {
      if (x.tipo === "fixo") return S.store.setPago(x.id, x.chave, pago);
      const reg = x.reg;
      if (reg.id) return S.store.updateFatura(reg.id, { status: reg.status });
      const { id, ...row } = reg, novo = await S.store.addFatura(row);
      Object.assign(reg, novo, { status: reg.status });   // se o "Desfazer" veio no meio, vale o que está na tela
    });
    if (!ok) { volta(); render(); $("toast").hidden = true; }
    return ok;
  });
  filaPago = vez.catch(() => false);
  return vez;
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
  // Preenchimento em degradê embaixo da linha do custo.
  const grad = el("linearGradient", { id: "gCusto", x1: 0, y1: 0, x2: 0, y2: 1 }, el("defs", {}, svg));
  el("stop", { offset: 0, style: "stop-color:var(--series);stop-opacity:.38" }, grad); el("stop", { offset: 1, style: "stop-color:var(--series);stop-opacity:0" }, grad);
  for (let v = 0; v <= hi + 1e-6; v += step) {
    el("line", { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), stroke: v === 0 ? "var(--axis)" : "var(--grid)", "stroke-width": 1, "stroke-dasharray": v === 0 ? "none" : "2 5" }, svg);
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
    el("path", { d: p + ` L${x(endD)},${y(0)} L${x(1)},${y(0)} Z`, fill: "url(#gCusto)" }, svg);
    el("path", { d: p, fill: "none", stroke: "var(--series)", "stroke-width": 2.5, "stroke-linejoin": "round", "stroke-linecap": "round", "stroke-dasharray": c.fase === "futuro" ? "5 4" : "none" }, svg);
    el("circle", { cx: x(endD), cy: y(cum[endD]), r: 9, fill: "var(--series)", opacity: 0.22 }, svg);
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
  // Uma linha por categoria: nome, valor e uma barra na cor da categoria. Tocar abre a lista dos gastos.
  // Com limite definido, a barra mostra quanto do limite já foi usado e fica vermelha quando passa.
  const lim = new Map(usoDosLimites(c, S.prefs.limites).map((u) => [u.cat, u]));
  // Dia a dia de cada categoria contra o mês anterior (até o mesmo dia, no mês atual). Só aparece quando a diferença é relevante.
  const cmp = S.loaded ? comparaCategorias(S.data, c, S.mes) : null, m3 = cmp ? MES3[Number(cmp.mes.slice(5)) - 1].toLowerCase() : "";
  const delta = (k) => { const d = cmp?.por[k]; return d ? `<span class="cmp">${ico(d.dif > 0 ? "sobe" : "desce")}${brl0(Math.abs(d.dif))} ${d.dif > 0 ? "a mais" : "a menos"} que em ${m3}</span>` : ""; };
  const linhas = [...cats, ...[...lim.values()].filter((u) => !cats.some(([k]) => k === u.cat)).map((u) => [u.cat, 0])];
  const max = cats[0][1], box = document.createElement("div"); box.className = "cats";
  box.innerHTML = linhas.map(([k, v], i) => {
    const u = lim.get(k);
    return `<button type="button" class="cat-row${u?.passou ? " over" : ""}" data-i="${i}" style="--c:${corCat(k)}" aria-label="${esc(k)}: ${brl0(v)}${u ? ` de ${brl0(u.limite)} de limite` : ""}. Ver os gastos">
    <span class="nm"><i></i>${esc(k)}${u?.passou ? ` <span class="tag bad">passou ${brl0(u.passou)}</span>` : ""}</span><span class="vl">${brl0(v)}<em>${u ? `de ${brl0(u.limite)}` : `${Math.round((v / tot) * 100)}%`}</em></span>
    <span class="bar${u ? " lim" : ""}"><i style="width:${Math.max(v ? 2 : 0, u ? Math.min(100, u.pct) : (v / max) * 100).toFixed(1)}%"></i></span>${delta(k)}</button>`; }).join("");
  host.appendChild(box);
  if (cmp && linhas.some(([k]) => cmp.por[k])) { const p = document.createElement("p"); p.className = "hint cmp-nota"; p.textContent = `A comparação é dos gastos do dia a dia com ${nomeMes(cmp.mes)}${cmp.ate ? `, até o dia ${cmp.ate}` : ""}.`; host.appendChild(p); }
  box.querySelectorAll(".cat-row").forEach((b) => (b.onclick = () => detalheCategoria(linhas[Number(b.dataset.i)][0])));
  cartaoDoMes(c, host);
}
/** Lista do que foi para o cartão neste mês e ainda vai ser cobrado em uma fatura. */
function cartaoDoMes(c, host) {
  const l = comprasCartaoPorCategoria(c); if (!l.length) return;
  const d = document.createElement("div"); d.className = "nocartao";
  d.innerHTML = `<h3>No cartão neste mês</h3><p class="hint">Ainda não entrou no custo. Vai ser cobrado na fatura.</p><ul class="dest">${l.map(([k, v]) => `<li><span>${esc(k)}</span><b>${brl0(v)}</b></li>`).join("")}</ul>`;
  host.appendChild(d);
}

/* ---------- últimos meses: entradas e custo lado a lado, e a sobra embaixo ---------- */
function renderEvo() {
  const painel = $("evoPanel"), host = $("chEvo");
  const meses = S.loaded ? ultimosMeses(S.data, S.mes, hoje()) : [];
  painel.hidden = meses.length < 2;   // um mês só não é evolução
  if (meses.length < 2) { host.innerHTML = ""; return; }
  const max = Math.max(...meses.flatMap((x) => [x.rec, x.custo]), 1), alt = (v) => (v > 0 ? Math.max(2, (v / max) * 100).toFixed(1) : 0);
  const curto = (v) => (Math.abs(v) >= 10000 ? `${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : Math.round(v).toLocaleString("pt-BR"));
  host.innerHTML = `<div class="evo" style="--n:${meses.length}">${meses.map((x, i) => {
    const nome = `${nomeMes(x.m)} de ${x.m.slice(0, 4)}`, sobra = x.sobra >= 0 ? `sobraram ${brl0(x.sobra)}` : `faltaram ${brl0(-x.sobra)}`;
    return `<button type="button" class="evo-m${x.m === S.mes ? " aqui" : ""}" data-m="${x.m}" data-i="${i}" aria-label="${nome}: entraram ${brl0(x.rec)}, custo de ${brl0(x.custo)}, ${sobra}${x.fase === "atual" ? " até agora" : x.fase === "futuro" ? " (previsto)" : ""}. Abrir o mês">
      <span class="evo-b"><i class="ent" style="height:${alt(x.rec)}%"></i><i class="cus" style="height:${alt(x.custo)}%"></i></span>
      <span class="evo-n">${MES3[Number(x.m.slice(5)) - 1]}${x.fase === "atual" ? "*" : ""}</span>
      <span class="evo-s${x.sobra < 0 ? " neg" : ""}">${x.sobra < 0 ? "− " : "+ "}${curto(Math.abs(x.sobra))}</span></button>`; }).join("")}</div>
    <div class="tip" hidden></div>${meses.some((x) => x.fase === "atual") ? `<p class="hint evo-nota">* Mês em andamento: os números ainda vão mudar.</p>` : ""}`;
  const tip = host.querySelector(".tip");
  const mostra = (b) => {
    const x = meses[Number(b.dataset.i)];
    tip.innerHTML = `<b>${nomeMes(x.m)} de ${x.m.slice(0, 4)}${x.fase === "atual" ? " (até agora)" : ""}</b><div class="r"><span>Entradas</span><span>${brl0(x.rec)}</span></div><div class="r"><span>Custo</span><span>${brl0(x.custo)}</span></div><div class="r"><span>${x.sobra >= 0 ? "Sobrou" : "Faltou"}</span><span>${brl0(Math.abs(x.sobra))}</span></div>`;
    tip.hidden = false;
    // Ao lado do mês, para não cobrir as barras dele.
    const larg = host.clientWidth; let left = b.offsetLeft + b.offsetWidth + 6;
    if (left + tip.offsetWidth > larg) left = b.offsetLeft - tip.offsetWidth - 6;
    tip.style.left = Math.max(0, left) + "px"; tip.style.top = "8px";
  };
  host.querySelectorAll(".evo-m").forEach((b) => {
    b.addEventListener("pointerenter", () => mostra(b)); b.addEventListener("focus", () => mostra(b));
    b.addEventListener("pointerleave", () => (tip.hidden = true)); b.addEventListener("blur", () => (tip.hidden = true));
    b.onclick = () => { if (b.dataset.m !== S.mes) { S.mes = b.dataset.m; render(); scrollTo(0, 0); } };
  });
}

/* ================= abas ================= */
function renderTabs(c) {
  document.querySelectorAll(".tabs button").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === S.tab));
  // Só a aba ativa fica montada: as abas de fixos usam os mesmos campos.
  ["l", "f", "r", "c", "m"].forEach((k) => { const p = $("pane-" + k); p.hidden = S.tab !== k; if (S.tab !== k) p.innerHTML = ""; });
  if (S.tab === "l") paneL(c); else if (S.tab === "f") paneF(c, "Despesa"); else if (S.tab === "r") paneF(c, "Receita"); else if (S.tab === "m") paneM(c); else paneC(c);
}
function armDelete(b, fn) {
  b.addEventListener("click", () => {
    if (b.classList.contains("arm")) return fn();
    const orig = b.innerHTML; b.classList.add("arm"); b.textContent = "Confirmar";
    setTimeout(() => { if (b.isConnected) { b.classList.remove("arm"); b.innerHTML = orig; } }, 3000);
  });
}

/** Uma linha da lista de lançamentos. `comAno` mostra o ano junto da data (resultado de busca, que mistura meses). */
/** O tipo do lançamento em letras pequenas no extrato, como nos bancos: de onde ele vem. */
const tipoDoLanc = (x) => x.tipo === "Receita" ? "Entrada" : x.tipo === "Reserva" ? (x.forma === RETIRADA ? "Retirada" : "Guardado")
  : Number(x.parcelas) > 1 ? `${x.parcelas}x no cartão` : x.forma === CARTAO ? "No cartão" : "Dia a dia";
function linhaLanc(x, toque, comAno = false) {
  return `<tr data-id="${esc(x.id)}"${toque}><td class="d">${comAno ? ddmm(x.data) + "/" + x.data.slice(2, 4) : ddmm(x.data)}</td><td class="desc">${ava(x.categoria, x.tipo)}<span class="tx">${esc(x.descricao || x.categoria)}${x.pendente ? ` <span class="tag espera">aguardando internet</span>` : ""}${quemTag(x)}<span class="sub"><span class="tp">${tipoDoLanc(x)}</span>${esc(x.categoria)}${x.tipo === "Despesa" && x.forma ? " · " + esc(pagoCom(x)) : x.tipo === "Reserva" ? (x.forma === RETIRADA ? " · retirou" : " · guardou") : ""}</span></span></td><td class="hide-sm"><span class="tag">${esc(x.categoria)}</span></td>
      <td class="hide-sm" style="color:var(--ink-2);font-size:13px">${x.tipo === "Despesa" ? esc(pagoCom(x)) : x.tipo === "Receita" ? "Entrada" : x.forma === RETIRADA ? "Retirou" : "Guardou"}</td>
      <td class="num ${x.tipo === "Receita" ? "pos" : x.tipo === "Reserva" ? "res" : ""}">${x.tipo === "Receita" ? "+ " : x.tipo === "Reserva" ? (x.forma === RETIRADA ? "← " : "→ ") : "− "}${brl(x.valor)}</td>
      <td class="acts"><button class="act" type="button" data-ed="${esc(x.id)}" aria-label="Editar"><span class="hide-sm">Editar</span><span class="show-sm">${ico("editar")}</span></button><button class="del" type="button" data-del="${esc(x.id)}" aria-label="Excluir"><span class="hide-sm">Excluir</span><span class="show-sm">${ico("lixo")}</span></button></td></tr>`;
}
function paneL(c) {
  const host = $("pane-l");
  // A busca fica fora da parte que é redesenhada, para o teclado não fechar enquanto a pessoa digita.
  if (!$("lBusca")) {
    host.innerHTML = `<div class="busca"><label class="so-leitor" for="lBusca">Buscar lançamento</label>${ico("lupa")}<input class="in" id="lBusca" type="search" placeholder="Buscar em todos os meses" autocomplete="off" enterkeyhint="search" maxlength="60"><button type="button" class="busca-x" id="lBuscaX" aria-label="Limpar a busca" hidden>${ico("x")}</button></div><div class="seg quem-filtro" id="lQuem" role="group" aria-label="De quem são os lançamentos" hidden></div><div id="lLista"></div>`;
    $("lBusca").value = S.busca || "";
    $("lBusca").addEventListener("input", (e) => { S.busca = e.target.value; listaL(calcMes(S.data, S.mes, hoje())); });
    $("lBuscaX").onclick = () => { S.busca = ""; $("lBusca").value = ""; listaL(calcMes(S.data, S.mes, hoje())); $("lBusca").focus(); };
  }
  listaL(c);
}
function listaL(c) {
  const host = $("lLista"), q = (S.busca || "").trim(), toque = noCelular() ? ` tabindex="0" role="button"` : "";
  $("lBuscaX").hidden = !q;
  // Conta de casal: dá para ver só os lançamentos de um dos dois.
  const fq = $("lQuem"), deQuem = casalAtivo() ? S.quem || "" : "", doQuem = (x) => !deQuem || (!x.auto && (deQuem === "eu" ? x.user_id !== S.casal.outro_id : x.user_id === S.casal.outro_id));
  fq.hidden = !casalAtivo();
  if (casalAtivo()) {
    fq.innerHTML = [["", "Todos"], ["eu", "Meus"], ["outro", nomeDoOutro()]].map(([v, r]) => `<button type="button" data-quem="${v}" aria-pressed="${deQuem === v}">${esc(r)}</button>`).join("");
    fq.querySelectorAll("button").forEach((b) => (b.onclick = () => { S.quem = b.dataset.quem; listaL(calcMes(S.data, S.mes, hoje())); }));
  }
  const cab = `<thead><tr><th>Dia</th><th>Descrição</th><th class="hide-sm">Categoria</th><th class="hide-sm">Pagamento</th><th class="num">Valor</th><th></th></tr></thead>`;
  if (q.length >= 2) {
    // Busca: todos os meses, do mais recente para o mais antigo, separados por mês.
    const r = buscaLancamentos(S.data.lancamentos.filter(doQuem), q);
    if (!r.total) host.innerHTML = `<div class="welcome"><p><b>Nada encontrado para "${esc(q)}".</b> A busca olha a descrição, a categoria, a forma de pagamento e o valor, em todos os meses.</p></div>`;
    else {
      const mes = (x, i) => i && mKey(r.itens[i - 1].data) === mKey(x.data) ? "" : `<tr class="dia"><td colspan="6"><span>${nomeMes(mKey(x.data))} de ${x.data.slice(0, 4)}</span></td></tr>`;
      host.innerHTML = `<p class="hint busca-res" role="status">${r.total === 1 ? "1 lançamento encontrado" : `${r.total} lançamentos encontrados`}${r.soma ? `, somando <b>${brl(r.soma)}</b> em gastos` : ""}.${r.total > r.itens.length ? ` Mostrando os ${r.itens.length} mais recentes.` : ""}</p>
        <div class="tbl"><table class="lanc">${cab}<tbody>${r.itens.map((x, i) => mes(x, i) + linhaLanc(x, toque, true)).join("")}</tbody></table></div>`;
    }
  } else {
  // Entradas fixas aparecem na lista como lançamentos automáticos do mês.
  const auto = c.fr.map((f) => { const d = Number(f.data.slice(8, 10));
    return { auto: true, id: f.id, data: f.data, descricao: f.descricao, categoria: f.categoria, tipo: "Receita", valor: f.valor,
      previsto: c.fase === "futuro" || (c.fase === "atual" && d > c.dias) }; });
  const it = [...c.it, ...auto].filter(doQuem).sort((a, b) => b.data.localeCompare(a.data) || String(b.created_at || "").localeCompare(String(a.created_at || "")));
  if (!it.length && deQuem) { host.innerHTML = `<div class="welcome"><p><b>${deQuem === "eu" ? "Você não lançou nada" : `${esc(nomeDoOutro())} não lançou nada`} em ${nomeMes(S.mes)}.</b></p></div>`; return; }
  if (!it.length) {
    host.innerHTML = `<div class="welcome"><p><b>Nenhum lançamento em ${nomeMes(S.mes)}.</b> Anote cada gasto no formulário lá em cima assim que ele acontecer. O custo do mês e a projeção se atualizam na hora.</p><p>Usa cartão? Na aba <b>Cartões</b> dá para importar o extrato do banco e lançar todas as compras de uma vez.</p></div>`;
    return;
  }
  // No celular a lista é separada por dia, com o total gasto em cada um.
  const gastoDoDia = (d) => round2(it.filter((x) => !x.auto && x.tipo === "Despesa" && x.data === d).reduce((t, x) => t + x.valor, 0));
  const dia = (x, i) => i && it[i - 1].data === x.data ? "" : `<tr class="dia"><td colspan="6"><span>${rotuloDia(x.data)}</span>${gastoDoDia(x.data) ? `<b>− ${brl(gastoDoDia(x.data))}</b>` : ""}</td></tr>`;
  host.innerHTML = `<p class="hint so-mobile" style="margin:-6px 0 10px">Toque em um lançamento para editar ou excluir.</p><div class="tbl"><table class="lanc">${cab}<tbody>${
    it.map((x, i) => dia(x, i) + (x.auto ? `<tr class="${x.previsto ? "previsto" : ""}" data-fixa="${esc(x.id)}"${toque}><td class="d">${ddmm(x.data)}</td><td class="desc">${ava(x.categoria, "Receita")}<span class="tx">${esc(x.descricao)} <span class="tag">${x.previsto ? "previsto" : "automático"}</span><span class="sub"><span class="tp">Entrada fixa</span>${esc(x.categoria)}</span></span></td><td class="hide-sm"><span class="tag">${esc(x.categoria)}</span></td>
      <td class="hide-sm" style="color:var(--ink-2);font-size:13px">Entrada fixa</td><td class="num pos">+ ${brl(x.valor)}</td>
      <td class="acts"><button class="act" type="button" data-fed="${esc(x.id)}">Alterar</button></td></tr>`
    : linhaLanc(x, toque))).join("")}</tbody></table></div>`;
  }
  $("pane-l").querySelectorAll("[data-ir]").forEach((b) => (b.onclick = () => { S.view = "listas"; S.tab = b.dataset.ir; render(); }));
  $("pane-l").querySelectorAll("[data-ed]").forEach((b) => (b.onclick = () => editarLancamento(b.dataset.ed)));
  $("pane-l").querySelectorAll("[data-fed]").forEach((b) => (b.onclick = () => editarFixo(b.dataset.fed)));
  $("pane-l").querySelectorAll("tr[data-id],tr[data-fixa]").forEach((tr) => {
    const abre = () => { if (tr.dataset.id) editarLancamento(tr.dataset.id); else if (tr.dataset.fixa && tr.dataset.fixa !== "1") editarFixo(tr.dataset.fixa); else { S.view = "listas"; S.tab = "r"; render(); } };
    tr.addEventListener("click", (e) => { if (noCelular() && !e.target.closest("button")) abre(); });
    tr.addEventListener("keydown", (e) => { if (noCelular() && e.target === tr && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); abre(); } });
  });
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
    // Conta com prazo: mostra até quando vai; na última vez, avisa.
    const ultima = f.ate && mKey(f.ate) === S.mes && !fx.some((o) => o.id === f.id && o.data > f.data);
    const prazo = f.ate ? ` <span class="tag ${ultima ? "fim" : "prazo"}">${ultima ? "última vez" : ateCurto(f.ate)}</span>` : "";
    return `<tr><td class="d">${quando}</td><td class="desc">${avaFoto("fixo", f.descricao) || ava(f.categoria, ent ? "Receita" : "Despesa")}<span class="tx">${esc(f.descricao)}${sem ? ` <span class="tag">toda ${DIAS3[diaDaSemana(f.data)]}</span>` : ""}${prazo}<span class="sub">${quando} · ${esc(f.categoria)}${!ent && f.forma ? " · " + esc(pagoCom({ ...f, parcelas: 1 })) : ""}</span></span></td><td class="hide-sm"><span class="tag">${esc(f.categoria)}</span></td><td class="num ${ent ? "pos" : ""}">${ent ? "+ " : ""}${brl(f.valor)}</td>
      <td class="st">${status}</td>
      <td class="acts"><button class="act" type="button" data-fed="${esc(f.id)}" aria-label="Editar"><span class="hide-sm">Editar</span><span class="show-sm">${ico("editar")}</span></button><button class="del" type="button" data-end="${esc(f.id)}" title="Para de contar a partir deste mês">Encerrar</button></td></tr>`;
  }).join("");
  host.innerHTML = `<p class="hint" style="margin-top:0">${ent
      ? "Cadastre uma vez o que você recebe sempre, como o salário. A entrada é lançada sozinha, todo mês ou toda semana, no dia que você escolher."
      : "Cadastre uma vez o que se repete: todo mês, como o aluguel, ou toda semana, como o Uber de sexta ou a terapia. Entra no custo sozinho; é só marcar quando pagar. Acerto, acordo ou parcelamento: escolha até que mês vai."}</p>
   ${quadroDosPrazos(tipo)}
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
     <label class="f prazo">Vai até<select class="in" id="xAte"></select></label>
     ${ent ? "" : `<label class="f">Pagamento<select class="in" id="xForma">${opts(FORMAS)}</select></label>
     <label class="f" id="xCartaoWrap" hidden>Cartão<select class="in" id="xCartao">${optsCartao()}</select></label>`}
     <button class="btn primary" type="submit">${ent ? "Adicionar entrada fixa" : "Adicionar fixo"}</button>
   </form>`;
  // O começo é o mês que está na tela (semanal no mês atual começa hoje); o seletor diz quantas vezes dá até cada mês.
  const comecoX = () => { const sem = $("xRep").value === "semanal"; return { tipo, desde: sem && S.mes === mKey(hoje()) ? hoje() : S.mes + "-01", dia: sem ? 1 : Math.min(31, Math.max(1, Number($("xDia").value) || 1)), ...(sem ? { repete: "semanal", dia_semana: Number($("xSem").value) } : {}) }; };
  const prazoX = () => { $("xAte").innerHTML = opcoesDePrazo(comecoX(), $("xAte").value); };
  prazoX(); $("xSem").onchange = prazoX;
  $("xRep").onchange = () => { const sem = $("xRep").value === "semanal"; $("xDiaWrap").hidden = sem; $("xSemWrap").hidden = !sem; prazoX(); };
  if (!ent) $("xForma").onchange = () => { $("xCartaoWrap").hidden = $("xForma").value !== CARTAO || !cartoesAtivos().length; };
  host.querySelectorAll("[data-fed]").forEach((b) => (b.onclick = () => editarFixo(b.dataset.fed)));
  host.querySelectorAll("[data-pago]").forEach((b) => b.addEventListener("click", async () => {
    const id = b.dataset.pago, pago = b.dataset.v === "1", mes = b.dataset.chave;
    b.disabled = true;
    if (await grava(() => S.store.setPago(id, mes, pago))) {
      S.data.pagos = S.data.pagos.filter((p) => !(p.fixo_id === id && p.mes === mes));
      if (pago) S.data.pagos.push({ fixo_id: id, mes });
      const fim = pago ? fimDoPrazo(id, mes) : ""; if (fim) toastOuFlash(fim);
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
      valor: round2(v), forma: ent ? "" : $("xForma").value, desde: sem && S.mes === mKey(hoje()) ? hoje() : S.mes + "-01", ate: $("xAte").value ? $("xAte").value + "-01" : null,
      ...(sem ? { repete: "semanal", dia_semana: Number($("xSem").value) } : {}),
      ...(!ent && $("xForma").value === CARTAO && cartoesAtivos().length ? { cartao_id: $("xCartao").value } : {}) };
    let novo; if (await grava(async () => { novo = await S.store.addFixo(row); })) {
      S.data.fixos.push(novo); render();
      // Confirma na tela e volta para o topo da lista, onde o item novo aparece.
      const nV = row.ate ? vezesNoPrazo(row, mKey(row.ate)) : 0;
      const msg = `${row.ate ? (ent ? "Entrada com prazo adicionada" : "Conta com prazo adicionada") : ent ? "Entrada fixa adicionada" : "Gasto fixo adicionado"}: ${row.descricao} · ${brl(row.valor)}${row.ate ? `, até ${mesAno(mKey(row.ate))} (${vezesTxt(nV)}, ${brl(round2(nV * row.valor))} no total)` : ""}.`;
      if (noCelular()) { toast(msg); $("listas").scrollIntoView({ block: "start" }); } else { $("flash").style.color = "var(--good)"; $("flash").textContent = msg; }
    }
  });
}

/** Quadro "com data para acabar": o que ainda falta de cada acerto, acordo ou parcelamento, e o total. */
function quadroDosPrazos(tipo) {
  const ent = tipo === "Receita", p = S.loaded ? prazosEmAndamento(S.data, hoje(), tipo) : { itens: [], total: 0 };
  if (!p.itens.length) return "";
  return `<div class="prazos"><div class="prazos-t"><b>${ent ? "A receber por prazo" : "Acertos e parcelamentos"}</b><span>${ent ? "Ainda entram" : "Ainda faltam"} <b>${brl(p.total)}</b></span></div>
    <ul>${p.itens.map((x) => `<li><span class="tx"><b>${esc(x.f.descricao)}</b><span>${x.vezes ? `${x.vezes === 1 ? "falta 1 vez" : `faltam ${x.vezes} vezes`} de ${brl(x.f.valor)}` : ent ? "tudo recebido" : "tudo pago"} · acaba em ${mesAno(x.ate)}</span></span><b class="v">${brl(x.total)}</b></li>`).join("")}</ul></div>`;
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
    return `<li class="${off ? "off" : ""}">${ava("", "Cartao")}<span class="oque"><b>${esc(k.nome)}${off ? ` <span class="tag">desativado</span>` : ""}</b>
      <span>Fecha dia ${pad(k.fechamento)} · vence dia ${pad(k.vencimento)}${prox ? ` · próxima fatura ${brl(prox.valor)} em ${ddmm(prox.vencimento)}` : ""}</span></span>
      <span class="acts"><button class="act" type="button" data-ked="${esc(k.id)}">Editar</button>${off ? `<button class="act" type="button" data-kon="${esc(k.id)}">Reativar</button>`
        : `<button class="del" type="button" data-kdel="${esc(k.id)}" title="${usados.has(k.id) ? "Sai da lista de novas compras; as faturas continuam" : "Remove o cartão"}">${usados.has(k.id) ? "Desativar" : "Remover"}</button>`}</span></li>`;
  };
  const linhaFatura = (x, i) => {
    const venc = ddmmaa(x.vencimento), paga = x.status === "Paga";
    return `<tr><td class="d">${venc}</td><td class="desc">${ava("", "Cartao")}<span class="tx">${esc(x.cartao)}${mKey(x.vencimento) < S.mes ? ` <span class="tag">mês anterior</span>` : ""}${x.auto && x.valor_fixo ? ` <span class="tag">valor corrigido</span>` : ""}
        <span class="sub">vence em ${venc}${x.auto ? ` · ${x.itens.length} ${x.itens.length === 1 ? "compra" : "compras"}` : " · lançada à mão"}</span></span></td>
      <td class="hide-sm" style="color:var(--ink-2);font-size:13px">${x.auto ? `${x.itens.length} ${x.itens.length === 1 ? "compra" : "compras"}` : "Lançada à mão"}</td>
      <td class="num">${brl(x.valor)}</td>
      <td class="st"><button type="button" class="chk ${paga ? "on" : x.vencimento < hj ? "late" : "off"}" data-st="${i}">${paga ? "✓ Paga" : x.vencimento < hj ? "○ Atrasada" : "○ Em aberto"}</button></td>
      <td class="acts"><button class="act" type="button" data-fat="${i}">${x.auto ? "Ver compras" : "Editar"}</button>${x.auto ? "" : `<button class="del" type="button" data-cdel="${esc(x.id)}" aria-label="Excluir"><span class="hide-sm">Excluir</span><span class="show-sm">${ico("lixo")}</span></button>`}</td></tr>`;
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
   <h3 class="sub-h">Faturas de ${nomeMes(S.mes)} <button class="btn sm ler" type="button" id="lerFatura">${ico("camera")}Ler fatura</button><button class="btn sm ler" type="button" id="impExtrato">${ico("subir")}Importar extrato</button></h3>
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
  $("lerFatura").onclick = () => abrirLeitor("fatura");
  $("impExtrato").onclick = abrirExtrato;
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
$("tipoSeg").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; S.tipo = b.dataset.t; S.catManual = false; S.formaManual = false; limpaSugestoes(); renderForm(); });
// Um toque em um gasto que se repete preenche valor, descrição, categoria e forma de pagamento. A pessoa confere e lança.
$("fRapidos").addEventListener("click", (e) => {
  const b = e.target.closest("[data-rap]"), r = b && S.rapidos?.[Number(b.dataset.rap)]; if (!r) return;
  $("fValor").value = r.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 }); $("fDesc").value = r.descricao;
  if (cats("Despesa").includes(r.categoria)) $("fCat").value = r.categoria;
  if (FORMAS.includes(r.forma)) $("fForma").value = r.forma;
  S.catManual = true; S.formaManual = true; limpaSugestoes(); renderForm(); $("fOk").focus();
});
// A categoria acompanha a descrição enquanto a pessoa não escolher uma à mão: o app usa o que ela já escolheu antes para aquele nome.
// A forma de pagamento e o cartão também seguem a última vez, até a pessoa trocar à mão.
$("fCat").addEventListener("change", () => { S.catManual = true; });
$("fCartao").addEventListener("change", () => { S.formaManual = true; });
/**
 * Repete o que a pessoa fez da última vez com essa descrição: a categoria e, no gasto, a forma de pagamento e o cartão.
 * Só mexe no que ela ainda não escolheu à mão, e diz embaixo do campo o que foi preenchido.
 */
function aplicaComoAntes(u) {
  const feito = [];
  if (!S.catManual && cats(S.tipo).includes(u.categoria)) { $("fCat").value = u.categoria; feito.push(u.categoria); }
  if (S.tipo === "Despesa" && !S.formaManual && FORMAS.includes(u.forma)) {
    $("fForma").value = u.forma; renderForm();   // mostra ou esconde a linha do cartão
    const k = u.forma === CARTAO && cartoesAtivos().find((z) => z.id === u.cartao_id);
    if (k) $("fCartao").value = k.id;
    feito.push(k ? k.nome : u.forma);
  }
  const ca = $("fComoAntes"); ca.textContent = feito.length ? `Da última vez: ${feito.join(" · ")}` : ""; ca.title = ca.textContent; ca.hidden = !feito.length;
}
function limpaSugestoes() { $("fSugere").hidden = true; $("fSugere").innerHTML = ""; S.sugestoes = []; $("fComoAntes").hidden = true; }
/** Descrições já usadas que combinam com o que está sendo digitado: um toque completa e repete o resto. */
function mostraSugestoes() {
  const el = $("fSugere"), lista = S.loaded && S.tipo !== "Reserva" ? descricoesParecidas(S.data.lancamentos, $("fDesc").value, S.tipo, hoje()) : [];
  S.sugestoes = lista; el.hidden = !lista.length;
  el.innerHTML = lista.map((x, i) => `<button type="button" data-sug="${i}"><span>${esc(x.descricao)}</span><small>${esc(x.categoria)}</small></button>`).join("");
}
$("fDesc").addEventListener("input", () => {
  mostraSugestoes();
  if (S.tipo === "Reserva") return;
  const u = S.loaded ? ultimoParecido(S.data.lancamentos, $("fDesc").value, S.tipo) : null;
  if (u) return aplicaComoAntes(u);
  $("fComoAntes").hidden = true;
  if (S.catManual) return;
  const c = palpiteCat($("fDesc").value, S.tipo);   // sem histórico: as palavras conhecidas ("uber" → Transporte)
  if (c !== "Outros" && cats(S.tipo).includes(c)) $("fCat").value = c;
});
// Tocar na sugestão não tira o foco do campo antes da hora (no computador, a lista fecharia antes do clique).
$("fSugere").addEventListener("mousedown", (e) => e.preventDefault());
$("fSugere").addEventListener("click", (e) => {
  const b = e.target.closest("[data-sug]"), x = b && S.sugestoes?.[Number(b.dataset.sug)]; if (!x) return;
  $("fDesc").value = x.descricao; $("fSugere").hidden = true;
  aplicaComoAntes(x);
  // Com o valor já digitado, o próximo passo é lançar; sem ele, volta para o valor.
  if (parseMoney($("fValor").value) > 0) $("fOk").focus(); else $("fValor").focus();
});
$("fDesc").addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("fSugere").hidden) { e.preventDefault(); $("fSugere").hidden = true; } });
$("fDesc").addEventListener("blur", () => setTimeout(() => { if (!$("fSugere").contains(document.activeElement)) $("fSugere").hidden = true; }, 120));
$("fFixo").addEventListener("change", renderForm);
$("fData").addEventListener("change", renderForm);
$("fForma").addEventListener("change", () => { S.formaManual = true; $("fComoAntes").hidden = true; renderForm(); mostraEfeito(); });
$("fValor").addEventListener("input", () => { mostraEfeito(); if (!$("fCartaoLinha").hidden || !$("fPrazoDica").hidden) renderForm(); });
/** "Livre agora → depois": o efeito do gasto na sobra do mês, antes de confirmar (só no mês atual, e só para gasto fora do cartão). */
function mostraEfeito() {
  const el = $("fEfeito"), v = parseMoney($("fValor").value), d = $("fData").value || hoje();
  const conta = S.loaded && v > 0 && S.tipo !== "Receita" && mKey(d) === mKey(hoje()) && !(S.tipo === "Despesa" && $("fForma").value === CARTAO) && !$("fFixo").checked && !(S.tipo === "Reserva" && $("fForma").value === "Retirar");
  el.hidden = !conta; if (!conta) return;
  const livre = raioX(calcMes(S.data, mKey(hoje()), hoje())).sobra, depois = round2(livre - v);
  el.innerHTML = `Livre agora ${brl(livre)} → depois <b class="${depois < 0 ? "txt-bad" : ""}">${brl(depois)}</b>`;
}   // atualiza o valor de cada parcela e o total do prazo
$("fRepete").addEventListener("change", renderForm);
$("fAte").addEventListener("change", renderForm);
// "Quantas vezes?" no formulário de lançar: a base é a mesma que monta as opções do "Vai até".
ligaVezes($("fVezes"), $("fAte"), () => { const dt = $("fData").value || hoje(), sem = $("fRepete").value === "semanal";
  return { tipo: S.tipo, desde: sem ? dt : mKey(dt) + "-01", dia: sem ? 1 : Number(dt.slice(8, 10)), ...(sem ? { repete: "semanal", dia_semana: diaDaSemana(dt) } : {}) }; });
$("fIrCartoes").onclick = () => { fecharLancar(); S.view = "listas"; S.tab = "c"; render(); $("kNome")?.focus(); };

/* ================= celular: navegação, lançamento em tela cheia e menu ================= */
let toastT;
function toast(t) { const el = $("toast"); el.classList.remove("com-acao"); el.textContent = t; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (el.hidden = true), Math.min(10000, Math.max(3500, t.length * 60))); }
/* ================= instalar o app =================
   Onde o navegador deixa (Chrome, Edge e Samsung Internet no Android; Chrome e Edge no computador), um toque abre a janela de instalar.
   Onde não deixa (iPhone, navegador da Xiaomi, Firefox), o mesmo botão mostra o caminho certo para aquele aparelho. */
const appInstalado = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const UA = navigator.userAgent;
const aparelho = () => {
  const ios = /iPhone|iPad|iPod/.test(UA) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ios) return /CriOS|FxiOS|EdgiOS|OPiOS/.test(UA) ? "ios-outro" : "ios";
  if (/MiuiBrowser|XiaoMi\/|Mint Browser/i.test(UA)) return "xiaomi";
  if (/Android/.test(UA)) return /SamsungBrowser/.test(UA) ? "samsung" : /Firefox/.test(UA) ? "firefox" : "android";
  return "pc";
};
const linkDoChrome = () => `intent://${location.host}${location.pathname}#Intent;scheme=https;package=com.android.chrome;end`;
async function copiaEndereco(b) {
  try { await navigator.clipboard.writeText(location.origin + location.pathname); b.textContent = "Endereço copiado"; }
  catch { b.textContent = location.host + location.pathname; }
}
/** O quadro "Instale o app" do início: só no celular, só no navegador, e some se a pessoa dispensar neste aparelho. */
function renderInstalar() {
  const host = $("instCard");
  let fora = false; try { fora = localStorage.getItem("cg-inst-fora") === "1"; } catch { /* sem armazenamento */ }
  $("btnInstall").hidden = appInstalado();
  const mostra = S.loaded && noCelular() && !appInstalado() && !fora;
  host.hidden = !mostra; if (!mostra) { host.innerHTML = ""; return; }
  const umToque = Boolean(installEvt);
  host.innerHTML = `<div class="inst-card"><span class="ava" aria-hidden="true">${ico("instalar")}</span>
    <span class="tx"><b>Instale o Meus Gastos no celular</b><span>${umToque ? "Um toque e o ícone vai para a tela inicial." : "Ícone na tela inicial, tela cheia e funciona sem internet."}</span></span>
    <button class="btn primary sm" type="button" id="instAgora">Instalar</button><button class="iconbtn" type="button" id="instFora" aria-label="Agora não">${ico("x")}</button></div>`;
  $("instAgora").onclick = instalarApp;
  $("instFora").onclick = () => { try { localStorage.setItem("cg-inst-fora", "1"); } catch { /* nada */ } renderInstalar(); toast("Tudo bem. A opção Instalar o app continua em Mais."); };
}
/** O botão Instalar: a janela do navegador quando existe; senão, o caminho daquele aparelho. */
async function instalarApp() {
  if (appInstalado()) return toast("O app já está instalado e aberto como aplicativo.");
  if (installEvt) {
    const e = installEvt; installEvt = null; e.prompt();
    const r = await Promise.resolve(e.userChoice).catch(() => null);
    if (r?.outcome !== "accepted") toast("Tudo bem. Quando quiser, é só tocar em Instalar de novo.");
    return renderInstalar();
  }
  const ap = aparelho(), passos = (l) => `<ol class="inst-passos">${l.map((x) => `<li>${x}</li>`).join("")}</ol>`;
  const seNaoAparecer = `<p class="hint" style="margin:12px 0 0">O ícone não apareceu? Procure <b>Meus Gastos</b> na lista de todos os apps (deslize de baixo para cima na tela inicial). Em celulares <b>Xiaomi, Redmi e Poco</b>, abra <b>Configurações › Apps › Chrome › Permissões</b> (ou <b>Outras permissões</b>), permita <b>Atalhos na tela inicial</b> e instale de novo.</p>`;
  const corpo = {
    ios: ["No iPhone, a instalação é pelo Safari, em três toques:", passos(["Toque em <b>Compartilhar</b> (o quadrado com a seta para cima), na barra do Safari.", "Role a lista e toque em <b>Adicionar à Tela de Início</b>.", "Confirme em <b>Adicionar</b>."])],
    "ios-outro": ["No iPhone, só o <b>Safari</b> instala apps da web. Copie o endereço, abra no Safari e siga os passos:", passos(["Toque em <b>Compartilhar</b>, na barra do Safari.", "Toque em <b>Adicionar à Tela de Início</b> e confirme."]) + `<div class="actions" style="justify-content:flex-start"><button class="btn" type="button" id="instCopia">Copiar o endereço</button></div>`],
    xiaomi: ["O navegador que vem no Xiaomi não instala apps. Abra no <b>Chrome</b>, que instala com um toque:", `<div class="actions" style="justify-content:flex-start"><a class="btn primary" href="${linkDoChrome()}">Abrir no Chrome</a><button class="btn" type="button" id="instCopia">Copiar o endereço</button></div>` + passos(["No Chrome, toque em <b>Instalar</b> no quadro do início (ou no menu <b>⋮</b> › <b>Instalar app</b>).", "Confirme em <b>Instalar</b>."]) + seNaoAparecer],
    samsung: ["No Samsung Internet:", passos(["Toque no menu <b>≡</b>, embaixo.", "Toque em <b>Adicionar página a</b> › <b>Tela inicial</b> (ou no ícone de instalar na barra de endereço).", "Confirme em <b>Adicionar</b>."])],
    firefox: ["No Firefox:", passos(["Toque no menu <b>⋮</b>.", "Toque em <b>Instalar</b> (ou <b>Adicionar à tela inicial</b>).", "Confirme."]) + seNaoAparecer],
    android: ["Pelo menu do navegador:", passos(["Toque nos <b>três pontinhos ⋮</b>, no canto de cima.", "Toque em <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.", "Confirme em <b>Instalar</b>."]) + `<p class="hint" style="margin:12px 0 0">Não achou a opção? Abra este endereço no <b>Chrome</b>: <a href="${linkDoChrome()}">abrir no Chrome</a>.</p>` + seNaoAparecer],
    pc: ["No computador (Chrome ou Edge):", passos(["Clique no ícone de instalar na barra de endereço (um monitor com uma seta), ou no menu <b>⋮</b> › <b>Instalar Meus Gastos</b>.", "Confirme em <b>Instalar</b>."]) + `<p class="hint" style="margin:12px 0 0">Para o celular, abra <b>${esc(location.host)}</b> no navegador dele.</p>`],
  }[ap];
  openDlg(`<h3>Instalar o Meus Gastos</h3><p class="hint" style="margin:0 0 10px;font-size:14px">${corpo[0]}</p>${corpo[1]}
    <div class="actions"><button class="btn primary" type="button" data-close>Entendi</button></div>`);
  if ($("instCopia")) $("instCopia").onclick = () => copiaEndereco($("instCopia"));
}
/** Aviso com um botão (Desfazer, Atualizar). Aparece também no computador. `dura` = 0: fica até a pessoa tocar. */
function toastAcao(t, rotulo, acao, dura = 7000) {
  const el = $("toast"); el.classList.add("com-acao"); el.hidden = false;
  el.innerHTML = `<span>${esc(t)}</span><button type="button" class="toast-acao">${esc(rotulo)}</button>`;
  el.querySelector("button").onclick = () => { el.hidden = true; clearTimeout(toastT); acao(); };
  clearTimeout(toastT); if (dura) toastT = setTimeout(() => (el.hidden = true), dura);
}
const toastDesfazer = (t, desfazer) => toastAcao(t, "Desfazer", desfazer);
function abrirLancar() {
  document.body.classList.add("lancando"); $("flash").textContent = "";
  try { if (!history.state?.lanc) history.pushState({ lanc: true }, ""); } catch { /* sem histórico: o ✕ fecha */ }   // o botão Voltar do celular fecha a tela
  // O foco vai para o valor na hora do toque: o iPhone só abre o teclado quando o foco vem direto do toque,
  // e não de um setTimeout. O setTimeout fica só para quando a tela abre sem toque (compartilhar, atalho).
  const v = $("fValor"); v.focus({ preventScroll: true });
  if (document.activeElement !== v) setTimeout(() => v.focus(), 50);
}
function fecharLancar(viaVoltar = false) {
  if (!document.body.classList.contains("lancando")) return;
  document.body.classList.remove("lancando");
  try { if (!viaVoltar && history.state?.lanc) history.back(); } catch { /* nada */ }
}
/** Depois de salvar: no celular fecha a tela e mostra um aviso; no computador volta o foco para o valor. */
/** Nível do limite do mês atual: 0, 80, 100 ou 120 (ver usoDoTeto). */
const nivelDoTeto = () => usoDoTeto(calcMes(S.data, mKey(hoje()), hoje()), S.prefs.teto)?.nivel || 0;
function aposLancar(texto) { if (noCelular()) { fecharLancar(); toast(texto); } else $("fValor").focus(); }
/** Telas que, no celular, abrem a partir de Mais: contas fixas, entradas fixas e cartões. */
const SUBS = ["f", "r", "c"];
// Botão Voltar do celular: fecha a tela de lançar; em uma tela aberta a partir de Mais, volta para Mais.
addEventListener("popstate", (e) => {
  if (S.ignoraPop) { S.ignoraPop = false; return; }   // foi o próprio app que voltou, ao fechar um quadro
  if ($("dlg").open) { S.dlgPeloVoltar = true; S.dlgNoHist = false; return $("dlg").close(); }
  if (document.body.classList.contains("lancando")) return fecharLancar(true);
  if (!e.state?.sub && noCelular() && S.view === "listas" && SUBS.includes(S.tab)) { S.view = "mais"; render(); scrollTo(0, 0); }
});
$("lancFechar").onclick = () => fecharLancar();
$("bnav").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  const n = b.dataset.nav;
  if (n === "mais") return abrirLancar();
  if (n === "inicio") S.view = "inicio";
  else if (n === "menu") S.view = "mais";
  else { S.view = "listas"; S.tab = n; }
  render(); scrollTo(0, 0);
});
function abrirSub(tab) {
  S.view = "listas"; S.tab = tab;
  try { if (!history.state?.sub) history.pushState({ sub: true }, ""); } catch { /* sem histórico: o botão Mais da tela volta */ }
  render(); scrollTo(0, 0);
}
$("listaVoltar").onclick = () => { if (history.state?.sub) history.back(); else { S.view = "mais"; render(); scrollTo(0, 0); } };

/**
 * Tela "Mais" do celular: o que não cabe na barra de baixo, em grupos. Cada linha diz em poucas palavras o que tem lá dentro.
 * No computador ela não existe: os mesmos botões ficam no topo e nas abas.
 */
function renderMais(c) {
  const host = $("mais");
  if (S.view !== "mais" || !S.loaded) { host.innerHTML = ""; return; }
  const naDemo = S.store?.kind === "local" && !S.semLogin, quem = $("whoName").textContent || "", n = (q, um, varios) => `${q} ${q === 1 ? um : varios}`;
  const contas = c.fx.filter((o) => o.forma !== CARTAO), cartoes = (S.data.cartoes || []).filter((k) => k.ativo !== false);
  const linha = (id, icone, titulo, sub = "", cls = "") => `<button class="mais-item" type="button" data-mais="${id}"><span class="ava ${cls}">${ico(icone)}</span><span class="tx"><b>${titulo}</b>${sub ? `<span>${sub}</span>` : ""}</span>${ico("chev")}</button>`;
  const grupo = (titulo, linhas) => `<div class="mais-grupo"><h2>${titulo}</h2><div class="mais-lista">${linhas.filter(Boolean).join("")}</div></div>`;
  host.innerHTML = `<div class="mais-quem"><span class="ava">${naDemo ? ico("pessoa") : esc(quem.trim().charAt(0).toUpperCase() || "?")}</span>
      <div class="tx"><b>${esc(naDemo ? "Demonstração" : quem)}</b><span>${naDemo ? "Dados de exemplo, guardados só neste aparelho." : esc(textoDoAcesso())}</span></div></div>
    ${grupo("Contas e cartões", [
      linha("f", "fixo", "Contas fixas", contas.length ? `${n(contas.length, "conta", "contas")} em ${nomeMes(S.mes)}, ${brl(round2(contas.reduce((t, o) => t + Number(o.valor), 0)))}` : "Aluguel, internet e o que se repete"),
      linha("r", "entra", "Entradas fixas", c.fr.length ? `${brl(c.frT)} em ${nomeMes(S.mes)}` : "Salário e o que entra todo mês", "in"),
      linha("c", "cartao", "Cartões e faturas", cartoes.length ? `${n(cartoes.length, "cartão", "cartões")}${c.fatT ? `, ${brl(c.fatT)} em faturas neste mês` : ""}` : "Cadastre o cartão e a fatura se monta sozinha", "card"),
      linha("cal", "agenda", "Calendário de vencimentos", "O que vence e o que entra em cada dia")])}
    ${grupo("Dividir as contas", [linha("casal", "casal", "Conta de casal", esc(resumoDoCasal()), S.casal?.situacao === "convidado" ? "aviso" : "")])}
    ${grupo("Ferramentas", [
      linha("btnExport", "baixar", "Baixar relatório", "Planilha com tudo o que você registrou"),
      appInstalado() ? "" : linha("btnInstall", "instalar", "Instalar o app no celular", "Ícone na tela inicial, abre em tela cheia e funciona sem internet")])}
    ${grupo("Ajustes e ajuda", [
      linha("btnAjustes", "ajustes", "Ajustes e categorias", naDemo ? "Categorias, tema e saldo" : "Categorias, avisos, tema e a sua conta"),
      linha("btnAjuda", "ajuda", "Como usar", "Respostas para as dúvidas mais comuns"),
      linha("btnSair", "sair", esc($("btnSair").textContent))])}`;
  host.querySelectorAll("[data-mais]").forEach((b) => (b.onclick = () => {
    const k = b.dataset.mais;
    if (SUBS.includes(k)) abrirSub(k); else if (k === "cal") calendario(mKey(hoje())); else if (k === "casal") abrirCasal(); else $(k).click();
  }));
}
/* ================= conta de casal =================
   Duas pessoas, cada uma com o seu login, nas mesmas contas (supabase/casal.sql). Cada linha continua sendo de quem lançou. */
const casalAtivo = () => S.casal?.situacao === "ativo";
const nomeDoOutro = () => S.casal?.dados?.nomes?.[S.casal.outro_id] || apelidoDoEmail(S.casal?.outro) || "a outra pessoa";
const quemTag = (x) => (casalAtivo() && x.user_id && x.user_id === S.casal.outro_id ? ` <span class="tag quem">${esc(nomeDoOutro())}</span>` : "");
/** Coloca nas preferências o que é dos dois: categorias, limites, metas e saldo. */
function aplicaCasal() { if (casalAtivo()) S.prefs = { ...S.prefs, ...comumDoCasal(S.casal.dados) }; }
const canonico = (o) => JSON.stringify(o, (_k, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]])) : v));
/** Guarda na conta de casal o que é dos dois, só quando mudou. */
async function salvaCasal() {
  if (!casalAtivo() || !S.store.casalSalvar) return;
  const novo = { ...comumDoCasal(S.prefs), nomes: S.casal.dados?.nomes || {} };
  if (canonico(novo) === canonico(S.casal.dados || {})) return;
  await S.store.casalSalvar(novo); S.casal.dados = novo;
}
function resumoDoCasal() {
  const c = S.casal;
  if (S.store?.kind !== "supabase") return "Divida as contas com outra pessoa";
  if (c?.situacao === "ativo") return `Você e ${nomeDoOutro()} dividem as contas`;
  if (c?.situacao === "convidei") return `Convite feito para ${c.outro}`;
  if (c?.situacao === "convidado") return `${c.outro} convidou você`;
  return "Divida as contas com outra pessoa";
}
function conviteDeCasal() {
  showBanner(`${S.casal.outro} convidou você para dividir as contas no Meus Gastos.`, [["Ver o convite", () => { showBanner(""); abrirCasal(); }], ["Agora não", () => showBanner("")]]);
}
const erroDoCasal = (e) => {
  const m = String(e?.message || e), quando = /^\d{4}-\d{2}-\d{2}$/.test(e?.hint || "") ? ddmmaaaa(e.hint) : "";
  if (/email_invalido/.test(m)) return "Confira o e-mail: ele parece incompleto.";
  if (/proprio_email/.test(m)) return "Esse é o seu e-mail. Digite o da outra pessoa.";
  if (/ja_tem/.test(m)) return "Você já tem uma conta de casal ou um convite em aberto.";
  if (/espera/.test(m)) return `Você encerrou uma conta de casal há poucos dias. Dá para formar outra${quando ? ` a partir de ${quando}` : " em alguns dias"}.`;
  if (/recusado/.test(m)) return "Essa pessoa recusou o convite. Converse com ela antes de convidar de novo.";
  if (/sem_convite/.test(m)) return "Esse convite não existe mais.";
  if (/sem_casal/.test(m)) return "A conta de casal já foi encerrada.";
  return /fetch|network|load failed/i.test(m) || navigator.onLine === false ? "Sem internet. Confira a conexão e tente de novo." : "Não foi possível concluir. Tente de novo em instantes.";
};
/** Tela da conta de casal: convidar, responder ao convite, ver com quem as contas são divididas e encerrar. */
async function abrirCasal(aviso = "", erro = false) {
  const fecha = `<button class="btn" type="button" data-close>Fechar</button>`;
  if (S.store?.kind !== "supabase") return openDlg(`<h3>Conta de casal</h3><p class="casal-txt">Duas pessoas, cada uma com o seu e-mail e a sua senha, vendo e lançando nas mesmas contas. O app mostra quem lançou cada gasto.</p>
    <p class="hint">Na demonstração não há outra pessoa para convidar. Crie a sua conta para usar.</p><div class="actions">${fecha}</div>`);
  const c = S.casal || { situacao: "nenhum" }, msg = `<p class="auth-msg ${erro ? "err" : "ok"}" id="csMsg" role="status">${esc(aviso)}</p>`;
  const diz = (t, ruim = true) => { $("csMsg").textContent = t; $("csMsg").className = "auth-msg " + (ruim ? "err" : "ok"); };
  const espera = c.espera ? `<p class="aviso">Você encerrou uma conta de casal há poucos dias. Dá para formar outra a partir de ${ddmmaaaa(c.espera)}.</p>` : "";
  if (c.situacao === "indisponivel") return openDlg(`<h3>Conta de casal</h3><p class="hint">A conta de casal ainda não foi ligada no banco de dados (arquivo supabase/casal.sql).</p><div class="actions">${fecha}</div>`);

  if (c.situacao === "ativo") {
    const d = divisaoDoMes(S.data.lancamentos, S.mes, S.casal.eu), nomes = c.dados?.nomes || {}, n = (q) => `${q} ${q === 1 ? "gasto" : "gastos"}`;
    openDlg(`<h3>Conta de casal</h3>
      <p class="casal-txt">Você divide as contas com <b>${esc(nomeDoOutro())}</b> (${esc(c.outro)})${c.desde ? ` desde ${ddmmaaaa(c.desde)}` : ""}. Os dois veem e lançam nas mesmas contas.</p>
      <div class="casal-div"><span class="t">Quem lançou em ${nomeMes(S.mes)}</span>
        <span><b>Você</b>${brl(d.eu.total)}<em>${n(d.eu.n)}</em></span><span><b>${esc(nomeDoOutro())}</b>${brl(d.outro.total)}<em>${n(d.outro.n)}</em></span></div>
      <form id="csNomes" class="dlg-form" autocomplete="off">
        <label class="f">Seu nome<input class="in" id="csMeu" maxlength="20" placeholder="${esc(apelidoDoEmail($("whoName").textContent))}" value="${esc(nomes[c.eu] || "")}"></label>
        <label class="f">Nome de quem divide com você<input class="in" id="csDele" maxlength="20" placeholder="${esc(apelidoDoEmail(c.outro))}" value="${esc(nomes[c.outro_id] || "")}"></label>
        <p class="hint wide" style="margin:0">É o nome que aparece ao lado dos lançamentos de cada um.</p>
        <button class="btn" type="submit">Salvar nomes</button></form>
      ${msg}
      <div class="actions"><button class="link aj-excluir" type="button" id="csEncerrar" style="margin-right:auto">Encerrar a conta de casal</button>${fecha}</div>`);
    $("csNomes").addEventListener("submit", async (e) => {
      e.preventDefault();
      const novos = { ...nomes }; for (const [id, campo] of [[c.eu, "csMeu"], [c.outro_id, "csDele"]]) { const v = $(campo).value.trim().slice(0, 20); if (v) novos[id] = v; else delete novos[id]; }
      try { const dados = { ...comumDoCasal(S.prefs), nomes: novos }; await S.store.casalSalvar(dados); S.casal.dados = dados; render(); abrirCasal("Nomes salvos."); }
      catch (err) { diz(erroDoCasal(err)); }
    });
    $("csEncerrar").onclick = () => {
      const a = S.acesso || {};
      openDlg(`<h3>Encerrar a conta de casal?</h3><ul class="casal-pontos">
        <li>Cada um fica com os lançamentos, as contas fixas e os cartões que cadastrou.</li>
        <li>O que foi lançado no cartão de um fica com o dono do cartão.</li>
        <li>Categorias, limites e metas ficam copiados para os dois.</li>
        ${a.pelo_par ? `<li><b>O seu acesso vem da assinatura de ${esc(c.outro)}.</b> Depois de encerrar, para continuar lançando você precisa de uma compra no seu e-mail.</li>` : a.cobranca ? `<li>${esc(nomeDoOutro())} deixa de usar a sua assinatura.</li>` : ""}
        <li>Para formar outra conta de casal, é preciso esperar 7 dias.</li></ul>
        <p class="auth-msg err" id="csMsg" role="alert"></p>
        <div class="actions"><button class="btn perigo" type="button" id="csSim" style="margin-left:0">Encerrar</button><button class="btn" type="button" id="csNao">Voltar</button></div>`);
      $("csNao").onclick = () => abrirCasal();
      $("csSim").onclick = async () => {
        $("csSim").disabled = true;
        try { await S.store.casalSair(); $("dlg").close(); await startApp(S.store, $("whoName").textContent); toast("Conta de casal encerrada. Cada um ficou com o que lançou."); }
        catch (err) { $("csSim").disabled = false; diz(erroDoCasal(err)); }
      };
    };
    return;
  }

  if (c.situacao === "convidado") {
    openDlg(`<h3>Convite para dividir as contas</h3>
      <p class="casal-txt"><b>${esc(c.outro)}</b> convidou você para dividir as contas no Meus Gastos.</p>
      <ul class="casal-pontos"><li>Os seus lançamentos, contas fixas e cartões e os dessa pessoa passam a aparecer juntos, para os dois.</li>
        <li>Cada um pode lançar, corrigir e apagar qualquer item.</li>
        <li>As categorias e as metas se juntam. O limite do mês e o saldo inicial passam a ser os de quem convidou.</li>
        ${S.acesso?.cobranca ? "<li>Uma assinatura vale para os dois.</li>" : ""}</ul>
      <p class="aviso" style="margin:0">Só aceite se você conhece essa pessoa: ela vai ver tudo o que você registrou.</p>${espera}${msg}
      <div class="actions"><button class="btn primary" type="button" id="csAceitar" style="margin-left:0"${c.espera ? " disabled" : ""}>Aceitar</button><button class="btn" type="button" id="csRecusar">Recusar</button>${fecha}</div>`);
    $("csAceitar").onclick = async () => {
      $("csAceitar").disabled = true; $("csRecusar").disabled = true;
      try {
        const meus = comumDoCasal(S.prefs), novo = await S.store.casalResponder(true);
        // Junta as categorias e as metas de quem aceitou com as de quem convidou.
        await S.store.casalSalvar({ ...juntaPrefsDoCasal(novo.dados || {}, meus), nomes: novo.dados?.nomes || {} }).catch((e) => console.warn("Categorias não juntadas:", e?.message));
        $("dlg").close(); await startApp(S.store, $("whoName").textContent);
        if (casalAtivo()) toast(`Pronto: você e ${nomeDoOutro()} dividem as contas.`);
      } catch (err) { $("csAceitar").disabled = false; $("csRecusar").disabled = false; diz(erroDoCasal(err)); }
    };
    $("csRecusar").onclick = async () => {
      try { S.casal = await S.store.casalResponder(false); showBanner(""); if (!$("acesso").hidden) telaDeAcesso(); else render(); if (S.casal.situacao === "convidado") abrirCasal(); else { $("dlg").close(); toast("Convite recusado."); } }
      catch (err) { diz(erroDoCasal(err)); }
    };
    return;
  }

  if (c.situacao === "convidei") {
    const texto = `Te convidei para dividir as contas comigo no Meus Gastos. Entre (ou crie a sua conta) com o e-mail ${c.outro} em ${location.origin}${location.pathname} e aceite o convite.`;
    openDlg(`<h3>Conta de casal</h3>
      <p class="casal-txt">Convite feito para <b>${esc(c.outro)}</b>.</p>
      <p class="casal-txt">Peça para essa pessoa abrir o Meus Gastos e entrar, ou criar a conta, <b>com esse e-mail</b>. O convite aparece para ela na hora. Ninguém recebe e-mail.</p>${msg}
      <div class="actions"><button class="btn primary" type="button" id="csMandar" style="margin-left:0">Mandar o convite por mensagem</button><button class="btn" type="button" id="csCancelar">Cancelar convite</button>${fecha}</div>`);
    $("csMandar").onclick = async () => {
      try { if (navigator.share) await navigator.share({ text: texto }); else { await navigator.clipboard.writeText(texto); diz("Mensagem copiada. Cole no WhatsApp ou onde preferir.", false); } }
      catch (err) { if (err?.name !== "AbortError") diz("Não consegui abrir o compartilhamento. Avise a pessoa por conta própria."); }
    };
    $("csCancelar").onclick = async () => {
      try { S.casal = await S.store.casalSair(); render(); abrirCasal("Convite cancelado."); } catch (err) { diz(erroDoCasal(err)); }
    };
    return;
  }

  openDlg(`<h3>Conta de casal</h3>
    <p class="casal-txt">Divida as contas com outra pessoa. Cada um entra com o seu e-mail e a sua senha, e os dois veem e lançam nas mesmas contas.</p>
    <ul class="casal-pontos"><li>Lançamentos, contas fixas, cartões, limites e metas passam a ser dos dois.</li><li>O app mostra quem lançou cada gasto.</li>${S.acesso?.cobranca ? "<li>Uma assinatura vale para os dois.</li>" : ""}</ul>
    ${espera || `<form id="csForm" style="display:grid;gap:10px" novalidate>
      <label class="f">E-mail da outra pessoa<input class="in" type="email" id="csEmail" autocomplete="off" inputmode="email" maxlength="254" placeholder="nome@exemplo.com"></label>
      <button class="btn primary" type="submit" id="csConvidar">Convidar</button></form>
    <p class="hint" style="margin:8px 0 0">Ninguém recebe e-mail: o convite aparece no app quando a pessoa entrar, ou criar a conta, com esse e-mail.</p>`}${msg}
    <div class="actions">${fecha}</div>`);
  if ($("csForm")) $("csForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("csEmail").value.trim();
    if (!email) return diz("Digite o e-mail da outra pessoa.");
    $("csConvidar").disabled = true;
    try { S.casal = await S.store.casalConvidar(email); render(); abrirCasal(); }
    catch (err) { $("csConvidar").disabled = false; diz(erroDoCasal(err)); }
  });
}
/** Com conta de casal (ou convite em aberto), ao voltar para o app busca o que a outra pessoa lançou nesse meio-tempo. */
async function atualizaDoCasal() {
  const antes = S.casal?.situacao;
  if (!S.loaded || S.store?.kind !== "supabase" || !["ativo", "convidei"].includes(antes) || Date.now() - (S.carregadoEm || 0) < 45000) return;
  if (document.querySelector("dialog[open]") || document.body.classList.contains("lancando") || !$("acesso").hidden || $("app").hidden) return;
  S.carregadoEm = Date.now();
  try {
    const st = S.store, c = await st.casalMeu();
    if (S.store !== st) return;
    if (c.situacao !== antes) return void startApp(st, $("whoName").textContent);   // aceitaram o convite, ou a conta de casal acabou: recomeça com os dados certos
    if (antes !== "ativo") return;
    const d = await st.loadAll(); if (S.store !== st || d.daCopia) return;
    d.cartoes ||= []; S.data = d; S.casal = c; aplicaCasal(); render();
  } catch (e) { console.warn("Não atualizou:", e?.message); }
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") atualizaDoCasal(); });
addEventListener("focus", atualizaDoCasal);

/** Uma linha sobre a conta de quem está usando, para o topo da tela Mais. */
function textoDoAcesso() {
  const a = S.acesso;
  if (a?.pelo_par) return `Pela assinatura de ${S.casal?.outro || "quem divide as contas com você"}`;
  if (!a?.cobranca) return "Conta ativa";
  if (!a.ate) return "Acesso de cortesia";
  return a.status === "cancelado" ? `Acesso até ${ddmmaaaa(a.ate)}` : `Assinatura ativa até ${ddmmaaaa(a.ate)}`;
}

/* ---------- Organizar o início: a pessoa escolhe quais quadros aparecem ---------- */
const QUADROS = [["dia", "Seu dia", "O que você gastou hoje e a sequência de dias anotando", ["dia"]], ["teto", "Limite do mês", "Quanto do limite já foi usado", ["teto"]],
  ["metas", "Metas", "As metas do dinheiro guardado", ["metas"]], ["venc", "Próximos vencimentos", "Contas e faturas a pagar", ["venc"]],
  ["kpis", "Guardado, fixos e faturas", "Os quadros com os totais do mês", ["kpis", "insight"]], ["graficos", "Gráficos do mês", "Custo acumulado e gastos por categoria", ["graficos"]],
  ["evo", "Últimos meses", "Entradas, custo e sobra mês a mês", ["evoPanel"]]];
function aplicaInicio() {
  const fora = new Set(S.prefs.inicioFora || []);
  QUADROS.forEach(([k, , , ids]) => ids.forEach((id) => $(id)?.classList.toggle("fora", fora.has(k))));
}
$("btnOrganizar").onclick = () => {
  const fora = new Set(S.prefs.inicioFora || []);
  openDlg(`<h3>Organizar o início</h3><p class="hint" style="margin:0 0 6px">Escolha o que aparece na tela inicial. O resumo do mês fica sempre no topo. O que você esconder continua funcionando e pode voltar quando quiser.</p>
    <div class="org-lista">${QUADROS.map(([k, t, d]) => `<label class="check org"><input type="checkbox" data-quadro="${k}" ${fora.has(k) ? "" : "checked"}><span class="tx"><b>${t}</b><span>${d}</span></span></label>`).join("")}</div>
    <div class="actions"><button class="btn primary" data-close>Pronto</button></div>`);
  $("dlgBody").querySelectorAll("[data-quadro]").forEach((cx) => (cx.onchange = async () => {
    const f = new Set(S.prefs.inicioFora || []); cx.checked ? f.delete(cx.dataset.quadro) : f.add(cx.dataset.quadro);
    S.prefs.inicioFora = [...f]; aplicaInicio(); await salvaPrefs();
  }));
};

/* ---------- Como usar: respostas curtas para as dúvidas mais comuns, sempre no menu ---------- */
const AJUDA = [
  ["O que é o número grande do início?", `É quanto sobra no mês: tudo o que entra, menos tudo o que sai (contas fixas, gastos do dia a dia, faturas de cartão e o que você guardou). Toque no número, ou em <b>Entenda essa conta</b>, para ver de onde ele veio.`],
  ["O que é o custo do mês?", `É a soma do que sai no mês: contas fixas, gastos do dia a dia e as faturas de cartão que vencem nele. Dinheiro guardado fica separado e não entra no custo.`],
  ["Por que a compra no cartão não aparece neste mês?", `Porque ela só pesa no mês em que a fatura vence, como no seu bolso. A compra fica em <b>Cartões</b>, dentro da fatura. Se foi parcelada, cada parcela cai na fatura do mês dela. O app sabe a fatura certa pelo dia em que ela fecha e pelo dia em que vence, que você informa ao cadastrar o cartão.`],
  ["O que é “Pode gastar por dia”?", `É o que sobra no mês dividido pelos dias que faltam, contando hoje. Cada gasto que você anota diminui esse valor na hora.`],
  ["E a “Projeção do mês”?", `É a previsão de como o mês termina se o dia a dia continuar no mesmo ritmo dos dias que já passaram. As contas fixas já estão todas dentro dela, pagas ou não. Quando aparece “fecha R$ 1.276 no vermelho”, não é uma conta a pagar: é quanto os gastos devem passar das entradas no fim do mês, se nada mudar. Serve de aviso antecipado: dá tempo de segurar o dia a dia.`],
  ["Qual a diferença entre gasto fixo e lançamento?", `<b>Fixo</b> é o que se repete: aluguel, internet, salário. Você cadastra uma vez e ele entra sozinho em todo mês (ou em toda semana). <b>Lançamento</b> é um gasto que aconteceu uma vez, como o mercado de hoje.`],
  ["Tem um calendário das contas?", `Tem. No início, em <b>Próximos vencimentos</b>, toque em <b>Ver no calendário</b>. Cada dia mostra o que vence e o que entra; tocando no dia você vê as contas e pode marcar <b>Já paguei</b>.`],
  ["Como lanço um acerto, acordo ou parcelamento que tem data para acabar?", `Em <b>Lançar</b>, preencha o valor de cada vez, marque <b>Repete</b> e escolha até que mês vai (a lista mostra quantas vezes dá). Começa na data que você escolher e para sozinho no mês final. Em <b>Contas fixas</b> aparece quanto ainda falta de cada um e o total. Serve também para um valor que alguém vai te pagar por um prazo: use <b>Entrada</b>.`],
  ["Como marco uma conta como paga?", `No início, em <b>Próximos vencimentos</b>, toque em <b>Já paguei</b>. Também dá para marcar em <b>Contas fixas</b> e, para a fatura, em <b>Cartões</b>. No celular, os dois ficam em <b>Mais</b>.`],
  ["Como registro o dinheiro que guardei?", `Em Lançar, escolha <b>Guardar</b> e diga onde o dinheiro ficou (reserva, investimento). Ele sai do que sobra no mês e passa a somar no quadro <b>Dinheiro guardado</b>. Para tirar, use o mesmo caminho e escolha Retirar.`],
  ["Como funciona a meta do dinheiro guardado?", `Toque no quadro <b>Dinheiro guardado</b> e crie uma meta para o lugar onde você guarda: quanto quer juntar e, se quiser, até quando. O app mostra quanto falta, em que mês você chega lá e quanto dá para guardar com o que deve sobrar no mês. Se você combinar um valor por mês, ele aparece em Próximos vencimentos para marcar <b>Guardei</b> ou <b>Pular</b>: não é uma conta e pular não tem problema. A previsão usa só o valor guardado e os meses: o app não calcula rendimento.`],
  ["Como funciona o limite de gastos?", `Na aba <b>Limites</b> você diz quanto quer gastar no máximo por mês e, se quiser, por categoria. O app mostra quanto já foi usado e avisa ao chegar a 80%, ao passar do limite e se passar em mais de 20%.`],
  ["Como acho um gasto antigo?", `Na aba <b>Lançamentos</b>, use a <b>busca</b>: ela procura em todos os meses pela descrição, pela categoria, pela forma de pagamento ou pelo valor.`],
  ["Tem jeito mais rápido de lançar o que se repete?", `Tem. Em Lançar, os gastos que você mais repete aparecem em <b>Você costuma lançar</b>: um toque preenche tudo e você só confirma. E, ao abrir qualquer lançamento, <b>Lançar de novo hoje</b> cria uma cópia com a data de hoje. A categoria também se ajusta sozinha: o app usa a que você escolheu da última vez para aquele nome.`],
  ["Como vejo se estou melhorando?", `No início, o quadro <b>Últimos meses</b> mostra o que entrou, o custo e quanto sobrou em cada mês. Em <b>Por categoria</b>, o app diz quando uma categoria está mais alta ou mais baixa do que no mês anterior.`],
  ["Errei um lançamento. Como corrijo?", `Na aba <b>Lançamentos</b>, toque no lançamento para mudar o valor, a data, a categoria ou para excluir.`],
  ["Tem como não digitar tudo?", `Tem. Em Lançar, toque em <b>Ler foto ou PDF</b> para o app ler um comprovante, boleto, conta ou holerite. No mesmo lugar, <b>Ler QR code</b> abre a câmera para ler o código do Pix ou do cupom de mercado; também dá para colar o Pix copia e cola. No cupom de mercado, o app busca o valor, a loja e os itens no site da Fazenda (testado com notas de São Paulo; em outros estados pode pedir o valor). Na aba <b>Cartões</b>, use <b>Importar extrato</b> para trazer de uma vez as compras do arquivo que o banco gera. Você sempre confere antes de salvar.`],
  ["Dá para mandar o comprovante direto do aplicativo do banco?", `No Android, com o app instalado: no comprovante, toque em <b>Compartilhar</b> e escolha <b>Meus Gastos</b>. O app abre já lendo o comprovante. Segurando o ícone do app também aparecem os atalhos <b>Lançar gasto</b> e <b>Ler QR code</b>. No iPhone esse caminho não existe: use Lançar → Ler foto ou PDF.`],
  ["E se eu estiver sem internet?", `Pode lançar normalmente. O gasto fica guardado no aparelho, aparece como <b>aguardando internet</b> e é enviado sozinho quando a conexão voltar. Alterar ou excluir o que já estava salvo precisa de conexão.`],
  ["O que é o resumo da semana e o lembrete das 20h?", `No <b>domingo à noite</b> o app manda um resumo: quanto você gastou na semana, onde pesou mais e as contas dos próximos 7 dias. O <b>lembrete das 20h</b> é uma notificação que só aparece nos dias em que você não anotou nada. Os dois se ligam e desligam em <b>Ajustes</b>, na parte Resumo e lembrete.`],
  ["Dá para usar a dois?", `Dá, com a <b>Conta de casal</b> (no celular, em <b>Mais</b>; no computador, em <b>Ajustes</b>). Você convida a outra pessoa pelo e-mail e ela aceita dentro do app, entrando com esse e-mail. Cada um continua com a sua senha. Os dois veem e lançam nas mesmas contas, e o app mostra quem lançou cada gasto. Qualquer um dos dois pode encerrar quando quiser: cada um fica com o que lançou.`],
  ["Onde ficam as contas fixas, os cartões e os ajustes no celular?", `Na barra de baixo: <b>Início</b>, <b>Lançamentos</b>, o <b>+</b> para lançar, <b>Planejar</b> (limites e metas) e <b>Mais</b>. Em Mais ficam as contas fixas, as entradas fixas, os cartões, o calendário, a conta de casal, o relatório, os ajustes e esta ajuda. No fim do Início, <b>Organizar o início</b> escolhe quais quadros aparecem.`],
  ["Como recebo avisos e instalo no celular?", `Em <b>Ajustes</b> você liga os avisos por e-mail e a notificação no aparelho. Para instalar, use <b>Instalar app</b> (no celular, em <b>Mais</b>); no iPhone, abra pelo Safari, toque em Compartilhar e em Adicionar à Tela de Início.`],
  ["Como troco a senha ou excluo a minha conta?", `Em <b>Ajustes</b>, na parte <b>Sua conta</b>. Para trocar a senha, você digita a atual e a nova. Excluir a conta apaga para sempre todos os seus registros e pede a senha para confirmar; antes, baixe o relatório se quiser guardar uma cópia. Excluir a conta não cancela a assinatura: o cancelamento é feito na Hotmart.`],
  ["Meus dados ficam seguros? Consigo levar embora?", `Cada conta só enxerga os próprios dados, e essa regra é aplicada no banco de dados. Fotos e PDFs são lidos no seu aparelho e não são enviados. Em <b>Baixar relatório</b> você leva tudo em planilha. Os detalhes estão na <a href="site/privacidade.html" target="_blank" rel="noopener">Política de privacidade</a>.`],
];
function ajuda() {
  openDlg(`<h3>Como usar</h3><p class="hint" style="margin:0 0 12px;font-size:13.5px">Toque em uma pergunta para ver a resposta.</p>
    <div class="ajuda">${AJUDA.map(([q, r]) => `<details><summary>${q}</summary><p>${r}</p></details>`).join("")}</div>
    <div class="aj-sec" style="margin-top:14px"><button class="link" type="button" id="ajudaPassos">Refazer os primeiros passos</button>${suporteHtml()}</div>
    <div class="actions"><button class="btn primary" data-close>Fechar</button></div>`);
  $("ajudaPassos").onclick = () => { guiaDe().fechado = false; salvaPrefs(); guiaPasso("renda", true); };
}
$("btnAjuda").onclick = ajuda;
/* ================= fotos: capas das caixinhas e das contas fixas =================
   A foto é reduzida no aparelho (quadrada, 320 px, JPEG) e guardada nas preferências, que na conta de casal valem para os dois.
   A chave é o nome (sem acento e caixa): a foto continua quando a conta muda de valor e vira uma versão nova. */
const chaveFoto = (tipo, nome) => `${tipo}:${norm(nome)}`;
const fotoDe = (tipo, nome) => S.prefs.fotos?.[chaveFoto(tipo, nome)] || "";
const avaFoto = (tipo, nome) => { const f = fotoDe(tipo, nome); return f ? `<span class="ava foto" style="background-image:url('${f}')" aria-hidden="true"></span>` : ""; };
function escolheFoto() {
  return new Promise((ok) => {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*";
    inp.onchange = async () => {
      const arq = inp.files?.[0]; if (!arq) return ok("");
      try {
        const img = await createImageBitmap(arq), lado = Math.min(img.width, img.height), cv = document.createElement("canvas"); cv.width = cv.height = 320;
        cv.getContext("2d").drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, 320, 320);
        ok(cv.toDataURL("image/jpeg", 0.72));
      } catch { toast("Não deu para abrir essa imagem. Tente outra."); ok(""); }
    };
    inp.click();
  });
}
async function trocaFoto(tipo, nome, depois) {
  const url = await escolheFoto(); if (!url) return;
  S.prefs.fotos = { ...(S.prefs.fotos || {}), [chaveFoto(tipo, nome)]: url };
  await salvaPrefs(); render(); depois?.();
}
async function tiraFoto(tipo, nome, depois) {
  const f = { ...(S.prefs.fotos || {}) }; delete f[chaveFoto(tipo, nome)]; S.prefs.fotos = f;
  await salvaPrefs(); render(); depois?.();
}

/* ================= caixinhas: o dinheiro guardado, como nos bancos =================
   Cada destino do guardado (reserva, investimentos, viagem…) é uma caixinha com capa, quanto tem e o progresso da meta. */
const CORES_CAIXA = ["#1e5fbf", "#157347", "#9a4a06", "#6b3fb8", "#b42318", "#0f6e74"];
function htmlCaixinhas() {
  if (!S.loaded) return "";
  const cur = mKey(hoje()), saldo = new Map(guardadoPorDestino(S.data, cur)), metas = metasDe();
  const nomes = [...new Set([...saldo.keys(), ...Object.keys(metas)])];
  const total = round2([...saldo.values()].reduce((t, v) => t + v, 0));
  const card = (nome, i) => {
    const v = saldo.get(nome) || 0, a = andamentoDaMeta(S.data, nome, metas[nome], hoje()), foto = fotoDe("dest", nome);
    return `<button type="button" class="caixa" data-caixa="${esc(nome)}">
      <span class="capa${foto ? " com" : ""}" style="${foto ? `background-image:url('${foto}')` : `background:${CORES_CAIXA[i % CORES_CAIXA.length]}`}">${foto ? "" : `<b>${esc(nome.charAt(0).toUpperCase())}</b>`}</span>
      <span class="info"><b class="nome">${esc(nome)}</b><span class="vv ocultavel">${brl(v)}</span>
      ${a ? `<span class="pbar"><i style="width:${Math.min(100, a.pct)}%"></i></span><small>${a.pct}% de ${brl0(a.alvo)}</small>` : `<small>sem meta</small>`}</span></button>`;
  };
  return `<section class="caixas"><div class="caixas-h"><h2>Caixinhas</h2><span class="ocultavel">${brl(total)} guardados</span></div>
    <div class="caixas-grid">${nomes.map(card).join("")}
      <button type="button" class="caixa nova" data-caixa-nova="1"><span class="capa"><b>+</b></span><span class="info"><b class="nome">Nova caixinha</b><small>viagem, carro, reserva…</small></span></button></div></section>`;
}
function abrirCaixa(nome) {
  const v = (guardadoPorDestino(S.data, mKey(hoje())).find(([k]) => k === nome) || [0, 0])[1], foto = fotoDe("dest", nome);
  const guardar = (retirar) => { $("dlg").close(); S.tipo = "Reserva"; renderForm(); $("fCat").value = nome; $("fForma").value = retirar ? "Retirar" : "Guardar"; S.catManual = true; renderForm();
    setTimeout(() => { if (noCelular()) abrirLancar(); else { $("fValor").scrollIntoView({ block: "center" }); $("fValor").focus(); } }, 200); };
  openDlg(`<div class="caixa-capa${foto ? " com" : ""}" style="${foto ? `background-image:url('${foto}')` : ""}"><h3>${esc(nome)}</h3></div>
    <p class="caixa-valor ocultavel">${brl(v)}</p><p class="hint" style="margin:0 0 12px">guardados nesta caixinha</p>
    <div class="caixa-acoes"><button class="btn primary" type="button" id="cxGuardar">Guardar</button><button class="btn" type="button" id="cxRetirar">Retirar</button></div>
    <div class="caixa-mais">
      <button class="mais-item" type="button" id="cxMeta"><span class="tx"><b>${metasDe()[nome] ? "Ver e mudar a meta" : "Criar uma meta"}</b><span>quanto quer juntar e até quando</span></span>${ico("chev")}</button>
      <button class="mais-item" type="button" id="cxFoto"><span class="tx"><b>${foto ? "Trocar a foto" : "Colocar uma foto"}</b><span>a capa da caixinha, como nos bancos</span></span>${ico("chev")}</button>
      ${foto ? `<button class="mais-item" type="button" id="cxSemFoto"><span class="tx"><b>Tirar a foto</b></span>${ico("chev")}</button>` : ""}
    </div>
    <div class="actions"><button class="btn" type="button" data-close>Fechar</button></div>`);
  $("cxGuardar").onclick = () => guardar(false); $("cxRetirar").onclick = () => guardar(true);
  $("cxMeta").onclick = () => detalheMeta(nome);
  $("cxFoto").onclick = () => trocaFoto("dest", nome, () => abrirCaixa(nome));
  if ($("cxSemFoto")) $("cxSemFoto").onclick = () => tiraFoto("dest", nome, () => abrirCaixa(nome));
}
$("pane-m").addEventListener("click", (e) => {
  const b = e.target.closest("[data-caixa]"); if (b) return abrirCaixa(b.dataset.caixa);
  if (e.target.closest("[data-caixa-nova]")) detalheMeta(cats("Reserva")[0] || "Reserva de emergência", true);
});

/* ================= esconder os valores e ações rápidas do início =================
   O olho do topo esconde os valores (fica guardado neste aparelho), para abrir o app em público sem mostrar quanto tem. */
const valoresOcultos = () => { try { return localStorage.getItem("cg-ocultar") === "1"; } catch { return false; } };
function ocultaValores(sim) { try { sim ? localStorage.setItem("cg-ocultar", "1") : localStorage.removeItem("cg-ocultar"); } catch { /* vale só agora */ } document.body.classList.toggle("ocultar", sim); }
document.body.classList.toggle("ocultar", valoresOcultos());
/** "Escanear e importar": tudo o que traz gastos de fora, num lugar só. */
function escanearEImportar() {
  const op = (id, icone, t, s) => `<button class="mais-item" type="button" id="${id}"><span class="ic-box">${ico(icone)}</span><span class="tx"><b>${t}</b><span>${s}</span></span>${ico("chev")}</button>`;
  openDlg(`<h3>Escanear e importar</h3><p class="hint" style="margin:0 0 12px">O app lê no próprio aparelho e mostra tudo para você conferir antes de lançar.</p>
    <div class="caixa-mais">${op("esQr", "qr", "Ler QR code", "Pix, cupom fiscal (nota) ou código de barras do boleto")}
      ${op("esFoto", "camera", "Foto ou PDF de comprovante", "Pix, boleto, maquininha, fatura ou holerite")}
      ${op("esExtrato", "subir", "Importar extrato do cartão", "o arquivo que o banco exporta: CSV, OFX ou Excel")}</div>
    <div class="actions"><button class="btn" type="button" data-close>Fechar</button></div>`);
  $("esQr").onclick = () => { $("dlg").close(); setTimeout(() => { abrirLancar(); abrirQr(); }, 200); };
  $("esFoto").onclick = () => { $("dlg").close(); setTimeout(() => abrirLeitor(), 200); };
  $("esExtrato").onclick = () => { $("dlg").close(); setTimeout(() => abrirExtrato(), 200); };
}
function acaoRapida(a) {
  if (a === "cal") return calendario(mKey(hoje()));
  if (a === "ler") return escanearEImportar();
  S.tipo = a === "recebi" ? "Receita" : "Despesa"; S.catManual = false; S.formaManual = false; renderForm();
  if (noCelular()) abrirLancar(); else { $("fValor").scrollIntoView({ block: "center" }); $("fValor").focus(); }
  if (a === "voz") ouvirGasto();
}

/* ================= fechamento do mês =================
   Nos primeiros dias de cada mês, o início mostra como o mês anterior fechou, com uma imagem pronta para compartilhar.
   A imagem é desenhada no aparelho (canvas); nada é enviado para fora. Dá para esconder os valores e mostrar só porcentagens. */
const mesAnterior = () => addM(mKey(hoje()), -1);
function renderFechamento() {
  const host = $("fechCard"), m = mesAnterior(), dia = Number(hoje().slice(8, 10));
  let fora = false; try { fora = localStorage.getItem("cg-fech-" + m) === "1"; } catch { /* nada */ }
  const c = S.loaded ? calcMes(S.data, m, hoje()) : null, mostra = c && dia <= 7 && !fora && (c.rec > 0 || c.custo > 0) && S.mes === mKey(hoje());
  host.hidden = !mostra; if (!mostra) { host.innerHTML = ""; return; }
  const sobra = raioX(c).sobra;
  host.innerHTML = `<div class="fech-card${sobra < 0 ? " neg" : ""}"><span class="tx"><small>${nomeMes(m)} fechou</small><b>${sobra < 0 ? "Faltaram" : "Sobraram"} ${brl0(Math.abs(sobra))}</b></span>
    <button class="btn sm primary" type="button" id="fechVer">Ver o fechamento</button><button class="iconbtn" type="button" id="fechFora" aria-label="Agora não">${ico("x")}</button></div>`;
  $("fechVer").onclick = () => abrirFechamento(m);
  $("fechFora").onclick = () => { try { localStorage.setItem("cg-fech-" + m, "1"); } catch { /* nada */ } renderFechamento(); };
}
/** Desenha a imagem do fechamento (1080 × 1350, o formato que fica bom no WhatsApp e no Instagram). */
function desenhaFechamento(m, semValores) {
  const c = calcMes(S.data, m, hoje()), rx = raioX(c), sobra = rx.sobra, cats = catMap(c).slice(0, 3);
  const W = 1080, H = 1350, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const g = cv.getContext("2d"), fonte = (peso, tam) => `${peso} ${tam}px "Bricolage Grotesque","IBM Plex Sans",system-ui,sans-serif`;
  const fundo = g.createLinearGradient(0, 0, W, H);
  if (sobra >= 0) { fundo.addColorStop(0, "#0d7a4f"); fundo.addColorStop(1, "#0b5a6b"); } else { fundo.addColorStop(0, "#b3261e"); fundo.addColorStop(1, "#7a1d6a"); }
  g.fillStyle = fundo; g.fillRect(0, 0, W, H);
  g.fillStyle = "rgba(255,255,255,.08)"; g.beginPath(); g.arc(W - 120, 140, 320, 0, Math.PI * 2); g.fill();
  const pct = (v) => (c.rec > 0 ? `${Math.round((v / c.rec) * 100)}%` : "—"), val = (v) => (semValores ? pct(v) : brl0(v));
  g.fillStyle = "#fff"; g.textBaseline = "alphabetic";
  g.font = fonte(600, 40); g.globalAlpha = 0.9; g.fillText("Meus Gastos", 90, 130); g.globalAlpha = 1;
  g.font = fonte(700, 64); g.fillText(`${nomeMes(m)[0].toUpperCase() + nomeMes(m).slice(1)} de ${m.slice(0, 4)}`, 90, 240);
  g.font = fonte(600, 52); g.globalAlpha = 0.92; g.fillText(sobra >= 0 ? "Sobrou" : "Faltou", 90, 360); g.globalAlpha = 1;
  g.font = fonte(800, semValores ? 170 : 150);
  g.fillText(semValores ? pct(Math.abs(sobra)) : brl0(Math.abs(sobra)), 84, 510);
  if (semValores) { g.font = fonte(500, 40); g.globalAlpha = 0.9; g.fillText("do que entrou no mês", 90, 575); g.globalAlpha = 1; }
  // Entrou, custo e guardado
  const linhas = [["Entrou", semValores ? "100%" : brl0(c.rec)], ["Custo do mês", val(c.custo)], ...(c.res > 0 ? [["Guardado", val(c.res)]] : [])];
  let y = 690;
  g.font = fonte(500, 42);
  linhas.forEach(([r, v]) => { g.globalAlpha = 0.85; g.fillText(r, 90, y); g.globalAlpha = 1; g.textAlign = "right"; g.font = fonte(700, 42); g.fillText(v, W - 90, y); g.textAlign = "left"; g.font = fonte(500, 42); y += 62; });
  // As categorias que mais pesaram
  if (cats.length) {
    y += 40; g.font = fonte(700, 40); g.fillText("Onde mais foi", 90, y); y += 10;
    const maior = cats[0][1];
    cats.forEach(([nome, v]) => {
      y += 58; g.font = fonte(500, 36); g.fillText(nome, 90, y);
      g.textAlign = "right"; g.fillText(semValores ? `${c.custo ? Math.round((v / c.custo) * 100) : 0}% do custo` : brl0(v), W - 90, y); g.textAlign = "left";
      y += 20; g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(90, y, W - 180, 14); g.fillStyle = "#fff"; g.fillRect(90, y, Math.max(14, ((W - 180) * v) / maior), 14);
    });
  }
  g.font = fonte(500, 34); g.globalAlpha = 0.85; g.fillText("meugastos.com.br", 90, H - 70); g.globalAlpha = 1;
  return cv;
}
function abrirFechamento(m) {
  let semValores = false;
  const pinta = () => { const cv = desenhaFechamento(m, semValores); $("fechImg").src = cv.toDataURL("image/png"); return cv; };
  openDlg(`<h3>Fechamento de ${nomeMes(m)}</h3><p class="hint" style="margin:0 0 10px">Uma imagem para guardar ou mandar para quem divide as contas com você. Ela é feita aqui no aparelho.</p>
    <img id="fechImg" class="fech-img" alt="Resumo de ${nomeMes(m)}">
    <label class="check" style="margin:10px 0 0"><input type="checkbox" id="fechSem"> Esconder os valores (mostrar só porcentagens)</label>
    <div class="actions"><button class="btn" type="button" id="fechBaixar">Baixar imagem</button><button class="btn primary" type="button" id="fechShare">Compartilhar</button></div>`);
  pinta();
  $("fechSem").onchange = () => { semValores = $("fechSem").checked; pinta(); };
  const arquivo = () => new Promise((ok) => pinta().toBlob((b) => ok(new File([b], `meus-gastos-${m}.png`, { type: "image/png" })), "image/png"));
  const baixa = async () => { const f = await arquivo(), a = document.createElement("a"); a.href = URL.createObjectURL(f); a.download = f.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
  $("fechBaixar").onclick = baixa;
  $("fechShare").onclick = async () => {
    const f = await arquivo();
    if (navigator.canShare?.({ files: [f] })) { try { await navigator.share({ files: [f], text: `Meu ${nomeMes(m)} no Meus Gastos` }); } catch { /* a pessoa desistiu */ } }
    else { await baixa(); toast("Este aparelho não compartilha imagens direto daqui. A imagem foi baixada: é só enviar pelo app que quiser."); }
  };
}

/* ================= lançar por voz =================
   O navegador transforma a fala em texto (Chrome no Android e no computador, Safari no iPhone); js/voz.js entende o texto
   e o formulário é preenchido para a pessoa conferir. Nada é lançado sem o toque em "Lançar". */
const Reconhecedor = window.SpeechRecognition || window.webkitSpeechRecognition;
let ouvindo = null;
$("btnVoz").hidden = !Reconhecedor;
$("btnVoz").onclick = () => (ouvindo ? ouvindo.stop() : ouvirGasto());
$("vozParar").onclick = () => ouvindo?.stop();
function ouvirGasto() {
  if (!Reconhecedor) return toast("Este navegador não entende fala. No Android, use o Chrome; no iPhone, o Safari.");
  if (ouvindo) return;
  const r = new Reconhecedor(); r.lang = "pt-BR"; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
  let final = "", parcial = "", erro = "";
  ouvindo = r; $("vozPainel").hidden = false; $("vozTitulo").textContent = "Ouvindo…"; $("vozTexto").textContent = "Fale o gasto, por exemplo: “gastei 32 no mercado no débito”.";
  $("btnVoz").classList.add("ativo"); $("btnVoz").querySelector("span").textContent = "Parar";
  r.onresult = (e) => {
    parcial = [...e.results].map((x) => x[0].transcript).join(" ").trim();
    if ([...e.results].every((x) => x.isFinal)) final = parcial;
    $("vozTexto").textContent = `“${parcial}”`;
  };
  r.onerror = (e) => { erro = e.error || "erro"; };
  r.onend = () => {
    ouvindo = null; $("vozPainel").hidden = true; $("btnVoz").classList.remove("ativo"); $("btnVoz").querySelector("span").textContent = "Falar o gasto";
    const txt = final || parcial;
    if (txt) return aplicaFala(txt);
    const msg = erro === "not-allowed" || erro === "service-not-allowed" ? "Para lançar por voz, permita o microfone para o Meus Gastos (no aviso do navegador ou nas permissões do app)."
      : erro === "network" ? "O reconhecimento de fala precisa de internet. Sem conexão, digite o gasto."
      : erro === "no-speech" || !erro ? "Não ouvi nada. Toque em Falar o gasto e diga, por exemplo: “gastei 32 no mercado no débito”." : "Não deu para ouvir agora. Tente de novo ou digite o gasto.";
    $("flash").style.color = "var(--warn)"; $("flash").textContent = msg; if (noCelular()) toast(msg);
  };
  try { r.start(); } catch { ouvindo = null; $("vozPainel").hidden = true; toast("Não deu para abrir o microfone agora. Tente de novo."); }
}
/** Preenche o formulário com o que foi entendido da fala e diz o que entendeu. */
function aplicaFala(txt) {
  const f = entendeFala(txt, hoje());
  S.tipo = f.tipo; S.catManual = false; S.formaManual = false; limpaSugestoes();
  const quando = f.data || hoje();
  if (mKey(quando) !== S.mes) S.mes = mKey(quando);   // "ontem" no dia 1º é do mês passado
  // Cada fala começa do zero: nada do que foi falado ou digitado antes fica no formulário.
  $("fValor").value = ""; $("fDesc").value = ""; $("fData").value = quando; $("fFixo").checked = false; $("fParc").value = "1"; $("fForma").value = FORMAS[0];
  render();
  $("fData").value = quando;
  if (f.valor) $("fValor").value = f.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  if (f.descricao) $("fDesc").value = f.descricao;
  if (f.tipo === "Reserva") {
    const dest = cats("Reserva").find((d) => norm(txt).includes(norm(d)));
    if (dest) { $("fCat").value = dest; S.catManual = true; }
    $("fForma").value = f.retirada ? "Retirar" : "Guardar";
  } else if (f.descricao) {
    // Mesma regra de quando a pessoa digita: o que ela fez da última vez com essa descrição; senão, as palavras conhecidas.
    const u = ultimoParecido(S.data.lancamentos, f.descricao, f.tipo);
    if (u) aplicaComoAntes(u); else { const c = palpiteCat(f.descricao, f.tipo); if (cats(f.tipo).includes(c)) $("fCat").value = c; }
  }
  if (f.forma && f.tipo === "Despesa") { $("fForma").value = f.forma; S.formaManual = true; }
  renderForm();
  if (f.parcelas && f.tipo === "Despesa" && !$("fParcWrap").hidden) { $("fParc").innerHTML = optsParcelas(f.valor || 0, f.parcelas); renderForm(); }
  const partes = [f.descricao || (f.tipo === "Receita" ? "Entrada" : f.tipo === "Reserva" ? (f.retirada ? "Retirada" : "Guardar") : ""), f.valor ? brl(f.valor) : "",
    f.tipo === "Despesa" ? $("fForma").value + (f.parcelas ? ` em ${f.parcelas}x` : "") : "", ($("fData").value === hoje() ? "hoje" : ddmm($("fData").value))].filter(Boolean);
  const flash = $("flash");
  if (!f.valor) { flash.style.color = "var(--warn)"; flash.textContent = `Ouvi “${txt}”, mas não entendi o valor. Digite o valor e confira o resto.`; $("fValor").focus(); return; }
  flash.style.color = "var(--good)"; flash.textContent = `Entendi: ${partes.join(" · ")}. Confira e toque em ${$("fOk").textContent}.`;
  $("fOk").focus();
}
/** Quem lançou: "Você" ou o nome da outra pessoa da conta de casal. */
const quemLancou = (x) => (casalAtivo() && x.user_id && x.user_id === S.casal.outro_id ? nomeDoOutro() : "Você");
/** Para comparar repetidos: cada linha vira "eu" ou "outro" (a pessoa da conta de casal). A linha nova é sempre "eu". */
const comAutor = (x) => ({ ...x, user_id: casalAtivo() && x.user_id && x.user_id === S.casal.outro_id ? "outro" : "eu" });
const quandoFixo = (f) => (f.repete === "semanal" ? `toda ${DIAS_SEMANA[Number(f.dia_semana)]}` : `todo dia ${pad(Number(f.dia) || 1)}`);
/**
 * Antes de gravar: se já existe um lançamento (ou fixo) que parece o mesmo, pergunta.
 * Na conta de casal é o que evita a mesma conta entrar duas vezes, uma por pessoa.
 * @returns {Promise<"lancar"|"nao"|"voltar">} "voltar" = fechou no Fechar ou no Voltar do celular: volta ao formulário como estava
 */
function confirmaRepetido(x, fixo) {
  return new Promise((responde) => {
    let resp = "voltar";
    const oque = fixo ? `${esc(x.descricao || x.categoria)} · ${brl(x.valor)}, ${quandoFixo(x)}` : `${esc(x.descricao || x.categoria)} · ${brl(x.valor)} em ${ddmm(x.data)}`;
    openDlg(`<h3>Isso já foi lançado?</h3>
      <p class="hint" style="margin:0 0 12px;font-size:14px">${esc(quemLancou(x))} já ${fixo ? "cadastrou" : "lançou"} <b>${oque}</b>${fixo ? ` em ${x.tipo === "Receita" ? "Entradas fixas" : "Contas fixas"}` : ""}. Se for a mesma ${x.tipo === "Receita" ? "entrada" : "conta"}, lançar de novo conta duas vezes.</p>
      <div class="actions"><button class="btn" type="button" id="repSim">Lançar mesmo assim</button><button class="btn primary" type="button" id="repNao">É a mesma, não lançar</button></div>`);
    $("repSim").onclick = () => { resp = "lancar"; $("dlg").close(); };
    $("repNao").onclick = () => { resp = "nao"; $("dlg").close(); };
    $("dlg").addEventListener("close", () => responde(resp), { once: true });
    $("repNao").focus();
  });
}
/** Pares do mês na tela que parecem repetidos, já sem os que alguém marcou como "não é repetido". */
function repetidosNaTela() {
  if (!S.loaded) return [];
  const st = { fixos: S.data.fixos, lancamentos: S.data.lancamentos.map(comAutor) }, orig = new Map(S.data.lancamentos.map((x) => [x.id, x]));
  return repetidosDoMes(st, S.mes, S.prefs.naoRepetidos || []).map((p) => (p.tipo === "fixo" ? p : { ...p, a: orig.get(p.a.id), b: orig.get(p.b.id) }));
}
/** Aviso no início: o que parece ter sido lançado duas vezes (na conta de casal, uma vez por cada pessoa). */
function renderRepetidos() {
  const host = $("repet"), pares = repetidosNaTela();
  host.hidden = !pares.length; if (!pares.length) { host.innerHTML = ""; return; }
  const p = pares[0], nome = (x) => esc(x.descricao || x.categoria);
  const frase = pares.length === 1
    ? `${nome(p.a)} e ${nome(p.b)}: ${brl(p.a.valor)}${p.tipo === "fixo" ? `, ${quandoFixo(p.a)}` : ` em ${ddmm(p.a.data)}${p.a.data !== p.b.data ? ` e ${ddmm(p.b.data)}` : ""}`}.`
    : `${pares.length} pares de lançamentos com o mesmo valor e data parecida neste mês.`;
  host.innerHTML = `<div class="repet"><span class="ava" aria-hidden="true">!</span><span class="tx"><b>${pares.length === 1 ? "Pode estar lançado duas vezes" : "Pode haver lançamentos repetidos"}</b><span>${frase}</span></span>
    <button class="btn sm" type="button" id="repConferir">Conferir</button></div>`;
  $("repConferir").onclick = conferirRepetidos;
}
function conferirRepetidos() {
  const pares = repetidosNaTela();
  if (!pares.length) { if ($("dlg").open) $("dlg").close(); render(); return toast("Pronto: nada repetido neste mês."); }
  const linha = (p, x, lado) => `<li><span class="oque"><b>${esc(x.descricao || x.categoria)}</b><span>${p.tipo === "fixo" ? `${x.tipo === "Receita" ? "Entrada fixa" : "Conta fixa"}, ${quandoFixo(x)}` : ddmm(x.data)} · ${esc(x.categoria)}${casalAtivo() ? ` · ${quemLancou(x) === "Você" ? "lançado por você" : `lançado por ${esc(quemLancou(x))}`}` : ""}</span></span>
      <b>${brl(x.valor)}</b><button class="btn sm" type="button" data-rapaga="${lado}" style="grid-column:1/-1;justify-self:start">${p.tipo === "fixo" ? "Apagar esta (com o histórico dela)" : "Apagar este"}</button></li>`;
  openDlg(`<h3>Lançamentos que podem estar repetidos</h3>
    <p class="hint" style="margin:0 0 12px">Mesmo valor e data parecida. Se for a mesma conta, apague uma; se não for, toque em <b>Não é repetido</b>.</p>
    ${pares.map((p, i) => `<div class="rep-par" data-par="${i}"><ul>${linha(p, p.a, "a")}${linha(p, p.b, "b")}</ul><button class="link nao" type="button" data-ranao>Não é repetido</button></div>`).join("")}
    <div class="actions"><button class="btn primary" type="button" data-close>Fechar</button></div>`);
  $("dlgBody").querySelectorAll("[data-par]").forEach((el) => {
    const p = pares[Number(el.dataset.par)];
    el.querySelector("[data-ranao]").onclick = async () => { S.prefs.naoRepetidos = [...new Set([...(S.prefs.naoRepetidos || []), p.chave])]; await salvaPrefs(); render(); conferirRepetidos(); };
    el.querySelectorAll("[data-rapaga]").forEach((b) => armDelete(b, async () => {
      const x = p[b.dataset.rapaga]; b.disabled = true;
      if (p.tipo === "fixo") {
        if (await grava(() => S.store.deleteFixo(x.id))) { S.data.fixos = S.data.fixos.filter((z) => z.id !== x.id); S.data.pagos = S.data.pagos.filter((z) => z.fixo_id !== x.id); }
      } else if (await grava(() => S.store.deleteLancamento(x.id))) S.data.lancamentos = S.data.lancamentos.filter((z) => z.id !== x.id);
      render(); conferirRepetidos();
    }));
  });
}
function naoLancouRepetido() {
  $("fValor").value = ""; $("fDesc").value = ""; $("fFixo").checked = false; S.catManual = false; S.formaManual = false; limpaSugestoes(); renderForm();
  $("flash").style.color = "var(--muted)"; $("flash").textContent = "Nada lançado: essa conta já estava lá.";
  aposLancar($("flash").textContent);
}
$("formLanc").addEventListener("submit", async (e) => {
  e.preventDefault();
  const flash = $("flash"), v = parseMoney($("fValor").value);
  if (!(v > 0)) { flash.style.color = "var(--bad)"; flash.textContent = "Digite um valor maior que zero, por exemplo 25,90."; $("fValor").focus(); return; }
  const data = $("fData").value || hoje();
  if (S.tipo !== "Reserva" && $("fFixo").checked) {
    // Vira um fixo: conta em todo mês a partir do mês da data, no mesmo dia.
    const dia = Number(data.slice(8, 10)), ent = S.tipo === "Receita", sem = $("fRepete").value === "semanal", wd = diaDaSemana(data);
    const fx = { tipo: S.tipo, descricao: $("fDesc").value.trim() || $("fCat").value, categoria: $("fCat").value, dia: sem ? 1 : dia, valor: round2(v),
      forma: ent ? "" : $("fForma").value, desde: sem ? data : mKey(data) + "-01", ate: $("fAte").value ? $("fAte").value + "-01" : null, ...(sem ? { repete: "semanal", dia_semana: wd } : {}),
      ...(cartaoDoForm().cartao_id ? { cartao_id: cartaoDoForm().cartao_id } : {}) };
    const igual = fixoRepetido(S.data.fixos, fx);
    if (igual) { const r = await confirmaRepetido(igual, true); if (r === "nao") return naoLancouRepetido(); if (r === "voltar") return $("fValor").focus(); }
    $("fOk").disabled = true;
    let novo; const ok = await grava(async () => { novo = await S.store.addFixo(fx); });
    $("fOk").disabled = false;
    if (!ok) return;
    S.data.fixos.push(novo);
    flash.style.color = "var(--good)";
    const nVezes = fx.ate ? vezesNoPrazo(fx, mKey(fx.ate)) : 0;
    flash.textContent = `${fx.ate ? (ent ? "Entrada com prazo cadastrada" : "Conta com prazo cadastrada") : ent ? "Entrada fixa cadastrada" : "Gasto fixo cadastrado"}: ${fx.descricao} · ${brl(fx.valor)}, ${sem ? "toda semana, " + DIAS_SEMANA[wd] : "todo dia " + pad(dia)}${fx.ate ? `, até ${mesAno(mKey(fx.ate))} (${vezesTxt(nVezes)}, ${brl(round2(nVezes * fx.valor))} no total)` : ""}. Para alterar, abra ${ent ? "Entradas fixas" : "Contas fixas"}.`;
    $("fValor").value = ""; $("fDesc").value = ""; S.catManual = false; S.formaManual = false; limpaSugestoes(); $("fFixo").checked = false; $("fRepete").value = "mensal"; $("fAte").value = ""; $("fVezes").value = "";
    aposLancar(flash.textContent);
    return render();
  }
  const row = { data, descricao: $("fDesc").value.trim(), tipo: S.tipo, categoria: $("fCat").value,
    forma: formaDe(S.tipo, $("fForma").value), valor: round2(v), import_key: null, ...cartaoDoForm() };
  const parecido = lancamentoRepetido(S.data.lancamentos.map(comAutor), comAutor(row)), igual = parecido && S.data.lancamentos.find((z) => z.id === parecido.id);
  if (igual) { const r = await confirmaRepetido(igual, false); if (r === "nao") return naoLancouRepetido(); if (r === "voltar") return $("fValor").focus(); }
  const nivelAntes = nivelDoTeto(), ehMeta = S.tipo === "Reserva", metaAntes = ehMeta ? andamentoDaMeta(S.data, row.categoria, S.prefs.metas?.[row.categoria], hoje()) : null;
  const combinar = ehMeta && row.forma !== RETIRADA && $("fFixo").checked;
  // O lançamento entra na tela no mesmo toque, já com o id definitivo; o envio acontece por trás.
  // Sem conexão (ou com sinal fraco) ele fica na fila do aparelho; se o banco recusar, ele sai da tela e o aviso explica.
  row.id = crypto.randomUUID();
  const naTela = { ...row, created_at: new Date().toISOString(), enviando: true };   // "aguardando internet" só aparece se cair na fila
  S.data.lancamentos.push(naTela);
  const envio = grava(async () => {
    const [novo] = await S.store.addLancamentos([row]);
    const i = S.data.lancamentos.indexOf(naTela);
    if (i >= 0) S.data.lancamentos[i] = novo ? { ...novo, valor: Number(novo.valor) } : { ...naTela, enviando: undefined };
  }).then((ok) => {
    if (!ok) { const i = S.data.lancamentos.indexOf(naTela); if (i >= 0) S.data.lancamentos.splice(i, 1); $("toast").hidden = true; }
    render(); avisoDaFila();
    return ok;
  });
  flash.style.color = "var(--good)";
  const kc = cartaoPorId(row.cartao_id || "");
  flash.textContent = `Lançado: ${row.descricao || row.categoria} · ${brl(row.valor)} em ${ddmm(data)}${mKey(data) !== S.mes ? " (outro mês)" : ""}.`
    + (kc ? ` ${row.parcelas > 1 ? `Em ${row.parcelas}x no ${kc.nome}: a primeira parcela vem` : `No ${kc.nome}: vem`} na fatura de ${nomeMes(mesDaFatura(kc, data))}.` : "");
  // Aviso na hora, quando este lançamento fez o mês chegar perto do limite ou passar dele.
  const nivelDepois = nivelDoTeto();
  if (nivelDepois > nivelAntes) { const u = usoDoTeto(calcMes(S.data, mKey(hoje()), hoje()), S.prefs.teto), t = textoDoTeto(u); flash.style.color = "var(--warn)"; flash.textContent += ` ${t.titulo} do mês: ${u.pct}% usado. ${t.frase}`; }
  if (ehMeta) flash.textContent += recadoDaMeta(metaAntes, andamentoDaMeta(S.data, row.categoria, S.prefs.metas?.[row.categoria], hoje()), row.forma === RETIRADA);
  $("fValor").value = ""; $("fDesc").value = ""; $("fParc").value = "1"; S.catManual = false; S.formaManual = false; limpaSugestoes();
  aposLancar(flash.textContent);
  if (combinar && (await envio)) {
    // "Repetir todo mês" em Guardar: o valor vira o combinado da meta desse lugar. Sem meta ainda, o app pede o valor final.
    const m = (metasDe()[row.categoria] ||= { valor: 0, ate: "" });
    m.plano = { valor: row.valor, dia: Number(data.slice(8, 10)) }; $("fFixo").checked = false; salvaPrefs();
    const frase = `Combinado salvo: guardar ${brl(row.valor)} todo dia ${data.slice(8, 10)} em ${row.categoria}.`;
    if (!(m.valor > 0)) { render(); return detalheMeta(row.categoria, false, `${esc(frase)} Para o app mostrar o progresso, diga quanto você quer juntar.`); }
    toastOuFlash(`${flash.textContent} ${frase}`);
  }
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
// A importação de planilha saiu da tela: para trazer gastos de fora existem o extrato do cartão e o leitor de foto ou PDF.
// O que fica é o relatório: uma planilha do Excel com tudo o que está no app.
$("btnExport").onclick = () => {
  if (typeof XLSX === "undefined") return showBanner("Não foi possível gerar o relatório. Confira a internet e recarregue a página.");
  const wb = buildWorkbook(XLSX, S.data, S.mes.slice(0, 4), calcMes, hoje());
  XLSX.writeFile(wb, `meus-gastos-relatorio-${S.mes.slice(0, 4)}.xlsx`);
};
function openDlg(html) {
  $("dlgBody").innerHTML = html;
  $("dlgBody").querySelectorAll("[data-close]").forEach((b) => (b.onclick = () => $("dlg").close()));
  if (!$("dlg").open) {   // trocar o conteúdo de um quadro já aberto não precisa abrir de novo
    $("dlg").showModal(); $("dlg").scrollTop = 0;
    // O botão Voltar do celular fecha o quadro (e não a tela que está atrás dele).
    try { if (!history.state?.dlg) { history.pushState({ ...(history.state || {}), dlg: true }, ""); S.dlgNoHist = true; } } catch { /* sem histórico: o Fechar resolve */ }
  }
}
// "Pular e lançar um gasto agora", nos primeiros passos: fecha o guia e abre o lançamento, já no valor.
$("dlgBody").addEventListener("click", (e) => {
  if (!e.target.closest("[data-ja-lancar]")) return;
  $("dlg").close(); S.tipo = "Despesa"; renderForm();
  setTimeout(() => { if (noCelular()) abrirLancar(); else { $("fValor").scrollIntoView({ block: "center" }); $("fValor").focus(); } }, 200);   // depois de o Voltar do quadro terminar
});
// Todo quadro tem o mesmo "Fechar" no canto de cima, além do botão de baixo.
$("dlgX").onclick = () => $("dlg").close();
$("dlg").addEventListener("close", () => {
  if (S.dlgNoHist && !S.dlgPeloVoltar) { S.dlgNoHist = false; S.ignoraPop = true; try { history.back(); } catch { S.ignoraPop = false; } }
  S.dlgNoHist = false; S.dlgPeloVoltar = false;
});

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
    <div class="actions wide"><button class="btn primary" type="submit">Salvar alteração</button><button class="btn" type="button" id="eDeNovo">Lançar de novo hoje</button><button class="btn" type="button" data-close>Cancelar</button><button class="btn perigo" type="button" id="eExcluir">${ico("lixo")}Excluir</button></div></form>`);
  // Mesmo lançamento, com a data de hoje: para o gasto que se repete.
  $("eDeNovo").onclick = async () => {
    const { id: _id, created_at: _c, user_id: _u, pendente: _p, enviando: _e, ...copia } = x;
    const row = { ...copia, data: hoje(), import_key: null };
    $("eDeNovo").disabled = true;
    let novos; const ok = await grava(async () => { novos = await S.store.addLancamentos([row]); });
    if (!ok) { $("eDeNovo").disabled = false; return; }
    S.data.lancamentos.push(...novos); S.mes = mKey(hoje()); $("dlg").close(); render();
    toast(`Lançado de novo hoje: ${x.descricao || x.categoria}, ${brl(x.valor)}.`);
  };
  armDelete($("eExcluir"), async () => {
    if (await grava(() => S.store.deleteLancamento(id))) { S.data.lancamentos = S.data.lancamentos.filter((z) => z.id !== id); $("dlg").close(); render(); }
  });
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
      forma: formaDe(tipo, $("eForma").value), valor: round2(v),
      import_key: String(x.import_key || "").startsWith("ext|") ? x.import_key : null,   // compra vinda do extrato continua marcada, para não voltar na próxima importação
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
    <div class="f wide prazo-par"><label class="f">Vai até<select class="in" id="eAte">${opcoesDePrazo(f, f.ate ? mKey(f.ate) : "", S.mes > mKey(f.desde) ? S.mes : mKey(f.desde))}</select></label>
      <label class="f">Quantas vezes?<input class="in" id="eVezes" inputmode="numeric" maxlength="3" placeholder="ex.: 36"></label></div>
    ${temPassado ? `<label class="f wide">A mudança vale<select class="in" id="eDesde">
        <option value="mes">De ${mesTxt} em diante</option>
        <option value="tudo">Em todos os meses, inclusive os anteriores</option></select></label>
      <p class="hint wide" style="margin:-6px 0 0">Na primeira opção, os meses anteriores ficam como estavam.</p>` : ""}
    <div class="f wide foto-linha">${avaFoto("fixo", f.descricao) || `<span class="ava">${ico("imagem")}</span>`}<span><b>Foto</b><small>aparece nas listas, para achar a conta de olho</small></span>
      <button class="btn sm" type="button" id="eFoto">${fotoDe("fixo", f.descricao) ? "Trocar" : "Colocar"}</button>${fotoDe("fixo", f.descricao) ? `<button class="btn sm" type="button" id="eSemFoto">Tirar</button>` : ""}</div>
    <p class="auth-msg err wide" id="edMsg"></p>
    <div class="actions wide"><button class="btn primary" type="submit">Salvar alteração</button><button class="btn" type="button" data-close>Cancelar</button></div></form>`);
  ligaVezes($("eVezes"), $("eAte"), () => f);
  $("eFoto").onclick = () => trocaFoto("fixo", f.descricao, () => editarFixo(id));
  if ($("eSemFoto")) $("eSemFoto").onclick = () => tiraFoto("fixo", f.descricao, () => editarFixo(id));
  const noCartao = () => !ent && $("eForma").value === CARTAO && S.data.cartoes.length > 0;
  if (!ent) { const sync = () => { $("eCartaoWrap").hidden = !noCartao(); }; $("eForma").onchange = sync; sync(); }
  $("edForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const v = parseMoney($("eValor").value);
    if (!(v > 0)) { $("edMsg").textContent = "Digite um valor maior que zero, por exemplo 350,00."; return; }
    const patch = { descricao: $("eDesc").value.trim(), categoria: $("eCat").value, valor: round2(v), forma: ent ? "" : $("eForma").value,
      ...(sem ? { dia_semana: Number($("eSem").value) } : { dia: Math.min(31, Math.max(1, Number($("eDia").value) || 1)) }),
      ...(ent || !S.data.cartoes.length ? {} : { cartao_id: noCartao() ? $("eCartao").value || null : null }) };
    // O fim do prazo é do fixo inteiro: se só ele mudou, não precisa criar uma versão nova.
    const ate = $("eAte").value ? $("eAte").value + "-01" : null, antes = f.ate || null, soOPrazo = Object.keys(patch).every((k) => String(patch[k] ?? "") === String(f[k] ?? ""));
    patch.ate = ate;
    if (!temPassado || $("eDesde").value === "tudo" || soOPrazo) {
      if (await grava(() => S.store.updateFixo(id, soOPrazo ? { ate } : patch))) { Object.assign(f, soOPrazo ? { ate } : patch); $("dlg").close(); render(); if (soOPrazo && ate !== antes) toastOuFlash(ate ? `${f.descricao}: vai até ${mesAno(mKey(ate))}.` : `${f.descricao}: sem data para acabar.`); }
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
  ? `<ul class="itens">${l.map((i) => `<li${i.ref ? ` class="toca" role="button" tabindex="0" data-ref="${esc(JSON.stringify(i.ref))}" aria-label="${esc(i.t)}: editar"` : ""}><span class="d">${i.d}</span><span>${esc(i.t)}${i.tag ? ` <span class="tag ${i.tagCls || ""}">${esc(i.tag)}</span>` : ""}${i.s ? `<span class="mini">${esc(i.s)}</span>` : ""}</span><b class="${i.cls || ""}">${i.v}</b></li>`).join("")}</ul>`
  : `<p class="hint" style="margin:6px 0 10px">${vazio}</p>`;
/** Abre o quadro de detalhes. secoes: [{titulo?, total?, itens?, vazio?, html?}]; ir: [rótulo do botão, aba para abrir]. */
function abreDetalhe(titulo, sub, secoes, ir) {
  openDlg(`<h3>${titulo}</h3>${sub ? `<p class="hint" style="margin:0 0 4px;font-size:13px">${sub}</p>` : ""}
    <div class="det">${secoes.map((s) => `${s.titulo ? `<h4><span>${s.titulo}</span><b>${s.total ?? ""}</b></h4>` : ""}${s.html ?? linhasDet(s.itens, s.vazio)}`).join("")}</div>
    ${secoes.some((s) => s.itens?.some((i) => i.ref)) ? `<p class="hint det-toque">Toque em um item para editar.</p>` : ""}
    <div class="actions">${ir ? `<button class="btn primary" type="button" id="detIr">${ir[0]}</button>` : ""}<button class="btn" type="button" data-close>Fechar</button></div>`);
  if (ir) $("detIr").onclick = () => { $("dlg").close(); S.view = "listas"; S.tab = ir[1]; render(); noCelular() ? scrollTo(0, 0) : $("listas").scrollIntoView({ block: "start" }); };
  $("dlgBody").querySelectorAll("[data-ref]").forEach((li) => {
    const abre = () => abrirItem(JSON.parse(li.dataset.ref));
    li.onclick = abre; li.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abre(); } };
  });
}
/**
 * Abre a edição de qualquer item, venha de onde vier (quadros de detalhe, calendário, listas):
 * um lançamento, um fixo (conta, entrada ou conta com prazo) ou uma fatura.
 */
function abrirItem(ref) {
  if (!ref) return;
  if (ref.k === "lanc") {
    const x = S.data.lancamentos.find((z) => z.id === ref.id);
    if (!x) return toast("Esse lançamento ainda está sendo enviado. Tente de novo em instantes.");
    return editarLancamento(ref.id);
  }
  if (ref.k === "fixo") return S.data.fixos.some((z) => z.id === ref.id) ? editarFixo(ref.id) : toast("Não encontrei esse item. Ele pode ter sido apagado.");
  if (ref.k === "fatura") {
    const f = calcMes(S.data, mKey(ref.venc), hoje()).fat.find((z) => (ref.id && z.id === ref.id) || (ref.cartao_id ? z.cartao_id === ref.cartao_id : z.cartao === ref.cartao) && z.vencimento === ref.venc);
    return f ? editarFatura(f) : toast("Não encontrei essa fatura.");
  }
}
/** O tipo de cada item, igual em todas as telas: de onde ele vem, para a pessoa saber o que está editando. */
function tipoDoItem(i) {
  if (i.origem === "gasto") return ["Dia a dia", "t-dia"];
  if (i.origem === "fixo") return i.prazo ? ["Com prazo", "t-prazo"] : ["Conta fixa", "t-fixo"];
  if (i.origem === "cartao") return i.fixo ? ["Fixo no cartão", "t-fixo"] : i.de > 1 ? [`Parcela ${i.parcela}/${i.de}`, "t-parc"] : ["No cartão", "t-cartao"];
  return ["Fatura", "t-fatura"];
}
const tipoDoFixo = (f) => (f.ate ? ["Com prazo", "t-prazo"] : f.tipo === "Receita" ? ["Entrada fixa", "t-entrada"] : ["Conta fixa", "t-fixo"]);
const porData = (a, b) => a.data.localeCompare(b.data);
const origemTxt = (i) => i.origem === "cartao" ? `na fatura do ${i.cartao}` : i.origem === "fixo" ? `gasto fixo${i.forma ? " · " + i.forma : ""}` : i.origem === "fatura" ? "fatura de cartão" : i.forma || "";
const formaTxt = (i) => (i.origem === "cartao" || i.origem === "fatura" ? i.cartao : i.forma || "");
const linhaCusto = (i) => { const [tag, tagCls] = tipoDoItem(i); return { d: ddmm(i.data), t: i.descricao, tag, tagCls, s: [i.categoria, formaTxt(i)].filter(Boolean).join(" · "), v: brl(i.valor), ref: i.ref }; };

function detalheKpi(tipo) {
  if (!S.loaded) return;
  const hj = hoje(), c = calcMes(S.data, S.mes, hj), mes = nomeMes(S.mes);
  if (tipo === "entradas") {
    const l = [...c.fr.map((f) => ({ data: f.data, t: f.descricao, s: f.categoria + (c.fase === "futuro" || (c.fase === "atual" && f.data > hj) ? " · a receber" : ""), valor: f.valor,
        tag: tipoDoFixo(f), ref: { k: "fixo", id: f.id } })),
      ...c.it.filter((x) => x.tipo === "Receita").map((x) => ({ data: x.data, t: x.descricao || x.categoria, s: x.categoria, valor: x.valor, tag: ["Entrada", "t-entrada"], ref: { k: "lanc", id: x.id } }))].sort(porData);
    return abreDetalhe(`Entradas de ${mes}`, `Total do mês: <b>${brl(c.rec)}</b>${c.frAReceber ? ` · ${brl(c.frAReceber)} ainda a receber` : ""}`,
      [{ itens: l.map((i) => ({ d: ddmm(i.data), t: i.t, tag: i.tag[0], tagCls: i.tag[1], s: i.s, v: "+ " + brl(i.valor), cls: "pos", ref: i.ref })), vazio: "Nenhuma entrada neste mês." }], ["Ver nos lançamentos", "l"]);
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
    const dest = guardadoPorDestino(S.data, S.mes), mov = c.it.filter((x) => x.tipo === "Reserva").sort(porData), tem = new Map(dest);
    const nomes = [...new Set([...dest.map(([k]) => k), ...cats("Reserva"), ...Object.keys(S.prefs.metas || {})])];
    abreDetalhe("Dinheiro guardado", `Total até ${mes}: <b>${brl(reservaAcumulada(S.data, S.mes))}</b>`, [
      { titulo: "Onde está e as metas", html: `<ul class="itens metas-lista">${nomes.map((k, i) => { const a = andamentoDaMeta(S.data, k, S.prefs.metas?.[k], hj);
          return `<li><span>${esc(k)}<span class="mini">${a ? (a.concluida ? `Meta de ${brl0(a.alvo)} completa` : `${a.pct}% da meta de ${brl0(a.alvo)}`) : "Sem meta"}</span></span><b>${brl(tem.get(k) || 0)}</b><button class="btn sm" type="button" data-meta-d="${i}">${a ? "Ver meta" : "Criar meta"}</button></li>`; }).join("")}</ul>` },
      { titulo: `Movimentos de ${mes}`, total: sgn(c.res), itens: mov.map((x) => ({ d: ddmm(x.data), t: x.descricao || x.categoria, s: x.categoria, ref: { k: "lanc", id: x.id },
          tag: x.forma === RETIRADA ? "retirou" : "guardou", v: (x.forma === RETIRADA ? "− " : "+ ") + brl(x.valor), cls: "res" })), vazio: "Nada guardado nem retirado neste mês." }], ["Ver nos lançamentos", "l"]);
    $("dlgBody").querySelectorAll("[data-meta-d]").forEach((b) => (b.onclick = () => detalheMeta(nomes[Number(b.dataset.metaD)])));
    return;
  }
  if (tipo === "fixos") {
    const st = (f) => f.forma === CARTAO ? ["na fatura", ""] : c.pagosSet.has(f.id + "|" + f.chave) ? ["pago", "ok"] : f.data < hj ? ["atrasado", "bad"] : ["a pagar", ""];
    return abreDetalhe(`Gastos fixos de ${mes}`, `Total: <b>${brl(c.fxT)}</b>${c.fxPend ? ` · ${brl(c.fxPend)} ainda a pagar` : ""}`,
      [{ itens: c.fx.map((f) => ({ d: ddmm(f.data), t: f.descricao, tag: st(f)[0], tagCls: st(f)[1], s: [tipoDoFixo(f)[0] + (f.ate ? " " + ateCurto(f.ate) : ""), f.categoria, f.forma ? pagoCom({ ...f, parcelas: 1 }) : ""].filter(Boolean).join(" · "), v: brl(f.valor), ref: { k: "fixo", id: f.id } })),
        vazio: "Nenhum gasto fixo neste mês." }], ["Abrir gastos fixos", "f"]);
  }
  if (tipo === "faturas") {
    const compras = c.it.filter((x) => x.tipo === "Despesa" && x.forma === CARTAO).sort(porData), tot = round2(c.comprasCartao + c.fxCartao);
    const fixosCc = c.fx.filter((f) => f.forma === CARTAO).map((f) => ({ d: ddmm(f.data), t: f.descricao, tag: "Fixo no cartão", tagCls: "t-fixo", s: f.categoria + " · " + pagoCom({ ...f, parcelas: 1 }), v: brl(f.valor), ref: { k: "fixo", id: f.id } }));
    return abreDetalhe(`Faturas de ${mes}`, `Vencem neste mês: <b>${brl(c.fatT)}</b>${c.fatAberta ? ` · ${brl(c.fatAberta)} ainda a pagar` : ""}`, [
      { itens: c.fat.map(linhaFaturaDet(hj)), vazio: "Nenhuma fatura vence neste mês." },
      { titulo: "Compras no cartão neste mês", total: brl(tot), itens: [...compras.map((x) => ({ d: ddmm(x.data), t: x.descricao || x.categoria, tag: Number(x.parcelas) > 1 ? `${x.parcelas}x` : "No cartão", tagCls: Number(x.parcelas) > 1 ? "t-parc" : "t-cartao", s: x.categoria + " · " + pagoCom(x), v: brl(x.valor), ref: { k: "lanc", id: x.id } })), ...fixosCc],
        vazio: "Nenhuma compra no cartão neste mês." }], ["Abrir cartões", "c"]);
  }
}
const linhaFaturaDet = (hj) => (f) => ({ d: ddmm(f.vencimento), t: `Fatura ${f.cartao}`, v: brl(f.valor), ref: { k: "fatura", id: f.id || null, cartao_id: f.cartao_id || null, cartao: f.cartao, venc: f.vencimento },
  tag: f.status === "Paga" ? "paga" : f.vencimento < hj ? "atrasada" : "em aberto", tagCls: f.status === "Paga" ? "ok" : f.vencimento < hj ? "bad" : "",
  s: f.auto ? `${f.itens.length} ${f.itens.length === 1 ? "compra" : "compras"}${f.valor_fixo ? " · valor corrigido" : ""}` : "lançada à mão" });

/** Gastos de uma categoria no mês: o que aparece na barra do gráfico "Por categoria". */
function detalheCategoria(nome) {
  const c = calcMes(S.data, S.mes, hoje()), l = itensDoCusto(c).filter((i) => i.categoria === nome).sort(porData);
  const total = round2(l.reduce((t, i) => t + i.valor, 0)), atual = Number(S.prefs.limites?.[nome]) || 0;
  abreDetalhe(`${esc(nome)} em ${nomeMes(S.mes)}`, `Total: <b>${brl(total)}</b>${c.custo ? ` · ${Math.round((total / c.custo) * 100)}% do custo do mês` : ""} · ${l.length} ${l.length === 1 ? "item" : "itens"}`,
    [{ itens: l.map((i) => ({ ...linhaCusto(i), s: formaTxt(i) })) },
     { html: `<form class="limite" id="limForm" autocomplete="off">
        <label class="f">Limite por mês para ${esc(nome)} (R$)<input class="in money" id="limValor" inputmode="decimal" placeholder="Sem limite" value="${atual ? esc(atual.toLocaleString("pt-BR", { minimumFractionDigits: 2 })) : ""}"></label>
        <button class="btn" type="submit">${atual ? "Mudar limite" : "Definir limite"}</button>
        <p class="hint">${atual ? (total > atual ? `Você passou ${brl(round2(total - atual))} do limite neste mês.` : `Ainda dá para gastar ${brl(round2(atual - total))} nesta categoria neste mês.`) + " Para tirar o limite, apague o valor e salve." : "Com um limite, a barra da categoria mostra quanto dele já foi usado e o app avisa quando estiver perto."}</p></form>` }], ["Ver nos lançamentos", "l"]);
  $("limForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const v = parseMoney($("limValor").value), lim = { ...(S.prefs.limites || {}) };
    if (v > 0) lim[nome] = round2(v); else delete lim[nome];
    S.prefs.limites = lim; salvaPrefs(); $("dlg").close(); render();
    toastOuFlash(v > 0 ? `Limite de ${brl(round2(v))} por mês para ${nome}.` : `${nome} ficou sem limite.`);
  });
}
["resumo", "kpis"].forEach((id) => {
  $(id).addEventListener("click", (e) => { const k = e.target.closest("[data-det]"); if (k) detalheKpi(k.dataset.det); });
  $(id).addEventListener("keydown", (e) => { const k = e.target.closest("[data-det]"); if (k && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); detalheKpi(k.dataset.det); } });
});

/* ================= ajustes e boas-vindas ================= */
const suporteHtml = () => {
  if (!SUPORTE_CONTATO) return "";
  const link = /^https?:/.test(SUPORTE_CONTATO);
  return `<p class="hint" style="margin:0">Precisa de ajuda? ${link ? `<a href="${esc(SUPORTE_CONTATO)}" target="_blank" rel="noopener">Fale com o suporte</a>` : `Escreva para <a href="mailto:${esc(SUPORTE_CONTATO)}">${esc(SUPORTE_CONTATO)}</a>`}.</p>`;
};
function ajustes() {
  const first = primeiroMes(S.data) || mKey(hoje()), cur = mKey(hoje()), meses = [];
  for (let m = first, i = 0; m <= cur && i < 120; m = addM(m, 1), i++) meses.push(m);
  const desde = S.prefs.saldoDesde && meses.includes(S.prefs.saldoDesde) ? S.prefs.saldoDesde : first;
  const ini = Number(S.prefs.saldoInicial) || 0;
  const bloco = (tipo, titulo) => `<div class="aj-sec"><h4>${titulo}</h4><div class="chips">${
    cats(tipo).map((c) => `<span class="chip">${esc(c)}<button type="button" data-rm="${esc(c)}" data-tipo="${tipo}" aria-label="Remover ${esc(c)}">${ico("x")}</button></span>`).join("")}</div>
    <form class="aj-add" data-add="${tipo}" autocomplete="off"><input class="in" maxlength="30" placeholder="${tipo === "Reserva" ? "Novo destino" : "Nova categoria"}" aria-label="Adicionar em ${titulo.toLowerCase()}"><button class="btn" type="submit">Adicionar</button></form></div>`;
  openDlg(`<h3>Ajustes</h3>
    ${bloco("Despesa", "Categorias de gasto")}${bloco("Receita", "Categorias de entrada")}${bloco("Reserva", "Onde você guarda dinheiro")}
    <p class="hint" style="margin:-4px 0 0">Remover uma categoria não apaga os lançamentos que já usam ela.</p>
    <div class="aj-sec"><h4>Aparência</h4>
      <label class="f">Tema<select class="in" id="ajTema"><option value="escuro">Escuro</option><option value="claro"${document.documentElement.dataset.tema === "claro" ? " selected" : ""}>Claro</option></select></label>
    </div>
    <div class="aj-sec"><h4>Saldo</h4>
      <label class="check"><input type="checkbox" id="ajLevar" ${S.prefs.levarSaldo ? "checked" : ""}> Levar o saldo de um mês para o outro</label>
      <div id="ajDesdeWrap" class="aj-saldo" ${S.prefs.levarSaldo ? "" : "hidden"}>
        <label class="f">Começar a contar em<select class="in" id="ajDesde">${meses.map((m) => `<option value="${m}"${m === desde ? " selected" : ""}>${nomeMes(m)} de ${m.slice(0, 4)}</option>`).join("")}</select></label>
        <label class="f">Saldo inicial: quando começou, você<select class="in" id="ajIniSinal"><option value="1">tinha este valor na conta</option><option value="-1"${ini < 0 ? " selected" : ""}>estava devendo este valor</option></select></label>
        <label class="f">Valor do saldo inicial (R$)<input class="in money" id="ajIni" inputmode="decimal" placeholder="0,00" value="${ini ? esc(Math.abs(ini).toLocaleString("pt-BR", { minimumFractionDigits: 2 })) : ""}"></label>
        <p class="hint" style="margin:0" id="ajIniMsg">O saldo inicial entra no saldo acumulado. Deixe em branco para começar do zero.</p>
      </div>
    </div>
    ${S.acesso?.cobranca ? `<div class="aj-sec"><h4>Assinatura</h4><p class="aj-assina">${S.acesso.pelo_par ? `Você usa o app pela assinatura de <b>${esc(S.casal?.outro || "quem divide as contas com você")}</b>${S.acesso.ate ? `, que vale até <b>${ddmmaaaa(S.acesso.ate)}</b>` : ""}.`
      : !S.acesso.ate ? "Acesso de cortesia, sem data de fim."
      : S.acesso.status === "cancelado" ? `A renovação foi cancelada. O acesso vale até <b>${ddmmaaaa(S.acesso.ate)}</b>.`
      : `Acesso ativo até <b>${ddmmaaaa(S.acesso.ate)}</b>. A renovação é anual e feita pela Hotmart, na forma de pagamento da compra. Para cancelar, use o e-mail de compra da Hotmart ou fale com o suporte.`}</p></div>` : ""}
    ${S.store.kind === "supabase" ? `<div class="aj-sec"><h4>Avisos de contas</h4>
      <p class="hint" style="margin:0">De manhã, só nos dias em que houver conta atrasada ou vencendo em até 3 dias.</p>
      <label class="check"><input type="checkbox" id="ajEmail" ${S.prefs.avisos?.email !== false ? "checked" : ""}> Receber por e-mail (${esc($("whoName").textContent)})</label>
      <label class="check"><input type="checkbox" id="ajPush" ${pushDisponivel() ? "" : "disabled"}> Receber notificação neste aparelho</label>
      <p class="hint" style="margin:0" id="ajPushMsg">${pushDisponivel() ? "" : "Neste aparelho a notificação só funciona com o app instalado. No iPhone: Compartilhar → Adicionar à Tela de Início, e abra o app por lá."}</p>
      <button class="btn" type="button" id="ajTeste" style="justify-self:start">Enviar um aviso de teste agora</button>
    </div>
    <div class="aj-sec"><h4>Resumo e lembrete</h4>
      <label class="check"><input type="checkbox" id="ajSemana" ${S.prefs.avisos?.semana !== false ? "checked" : ""}> Resumo da semana, no domingo à noite</label>
      <p class="hint" style="margin:0">Quanto você gastou na semana, onde pesou mais e as contas dos próximos 7 dias. Chega por e-mail e por notificação, pelos canais marcados acima.</p>
      <label class="check"><input type="checkbox" id="ajNoite" ${S.prefs.avisos?.noite === true ? "checked" : ""}> Lembrete às 20h, nos dias em que eu não anotar nada</label>
      <p class="hint" style="margin:0">Só por notificação, e só se você não tiver lançado nada nem marcado “Não gastei nada”. Se passar uma semana sem anotar, o lembrete para sozinho e volta quando você lançar de novo.</p>
      <p class="hint" style="margin:0" id="ajResumoMsg" role="status"></p>
      <button class="btn" type="button" id="ajVerSemana" style="justify-self:start">Enviar o resumo desta semana agora</button>
    </div>` : ""}
    ${S.store.kind === "supabase" ? `<div class="aj-sec"><h4>Sua conta</h4>
      <p class="aj-assina">Você entrou como <b>${esc($("whoName").textContent)}</b>.</p>
      <div class="aj-conta"><button class="btn" type="button" id="ajCasal">Conta de casal</button><button class="btn" type="button" id="ajSenha">Trocar a senha</button><button class="link aj-excluir" type="button" id="ajExcluir">Excluir minha conta</button></div>
    </div>` : ""}
    <div class="aj-sec"><button class="link" type="button" id="ajBV">Refazer os primeiros passos</button>${suporteHtml()}
      <p class="hint" style="margin:0">Leia os <a href="site/termos.html" target="_blank" rel="noopener">Termos de uso</a> e a <a href="site/privacidade.html" target="_blank" rel="noopener">Política de privacidade</a>.</p></div>
    <div class="actions"><button class="btn primary" data-close>Pronto</button></div>`);
  const body = $("dlgBody");
  if ($("ajSenha")) { $("ajCasal").onclick = () => abrirCasal(); $("ajSenha").onclick = () => trocarSenha(ajustes); $("ajExcluir").onclick = () => excluirConta(ajustes); }
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
  $("ajBV").onclick = () => { guiaDe().fechado = false; salvaPrefs(); guiaPasso("renda", true); };
  // O tema fica guardado neste aparelho: claro (cara de banco) é o padrão, escuro é opção.
  $("ajTema").onchange = (e) => {
    const claro = e.target.value === "claro";
    if (claro) document.documentElement.dataset.tema = "claro"; else delete document.documentElement.dataset.tema;
    try { localStorage.setItem("cg-tema", claro ? "claro" : "escuro"); } catch { /* sem armazenamento: vale só agora */ }
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", claro ? "#0b2545" : "#0a0f16");
  };
  if ($("ajEmail")) ligaAjustesDeAvisos();
}

/* ---------- a conta: trocar a senha e excluir ---------- */
const campoSenha = (id, rotulo, auto) => `<label class="f">${rotulo}<span class="senha"><input class="in" id="${id}" type="password" autocomplete="${auto}"><button type="button" class="olho" data-ver="${id}" aria-label="Mostrar a senha" aria-pressed="false">${ico("olho")}</button></span></label>`;
/** Confere a senha da conta com um novo login. Devolve "" quando está certa, ou a mensagem para mostrar. */
async function confereSenha(senha) {
  const { error } = await S.client.auth.signInWithPassword({ email: $("whoName").textContent, password: senha });
  if (!error) return "";
  return /invalid login/i.test(error.message) ? "A senha atual não confere. Se você esqueceu, saia do app e toque em Esqueci minha senha." : traduzErro(error);
}
function trocarSenha(voltar) {
  openDlg(`<h3>Trocar a senha</h3><form id="tsForm" style="display:grid;gap:12px" novalidate>
    ${campoSenha("tsAtual", "Senha atual", "current-password")}${campoSenha("tsNova", "Senha nova", "new-password")}
    <p class="hint" style="margin:0">A senha nova precisa ter pelo menos 6 caracteres.</p>
    <p class="auth-msg err" id="tsMsg" role="alert"></p>
    <div class="actions"><button class="btn primary" type="submit" id="tsSalvar">Salvar senha nova</button><button class="btn" type="button" id="tsVoltar">${voltar ? "Voltar" : "Cancelar"}</button></div></form>`);
  $("tsVoltar").onclick = () => (voltar ? voltar() : $("dlg").close());
  $("tsForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const atual = $("tsAtual").value, nova = $("tsNova").value, erro = (t, campo) => { $("tsMsg").textContent = t; if (campo) $(campo).focus(); };
    if (!atual) return erro("Digite a senha que você usa hoje.", "tsAtual");
    if (nova.length < 6) return erro("A senha nova precisa ter pelo menos 6 caracteres.", "tsNova");
    if (nova === atual) return erro("A senha nova precisa ser diferente da atual.", "tsNova");
    $("tsSalvar").disabled = true; $("tsSalvar").textContent = "Salvando…"; erro("");
    const falha = (await confereSenha(atual)) || traduzErroOuVazio((await S.client.auth.updateUser({ password: nova })).error);
    if (falha) { $("tsSalvar").disabled = false; $("tsSalvar").textContent = "Salvar senha nova"; return erro(falha); }
    $("dlg").close(); toast("Senha trocada. Use a senha nova na próxima vez que entrar.");
  });
  $("tsAtual").focus();
}
const traduzErroOuVazio = (e) => (e ? traduzErro(e) : "");
/** Excluir a conta: pede a senha, apaga tudo no banco e volta para a tela de entrada. Não tem volta, e a tela diz isso. */
function excluirConta(voltar) {
  const a = S.acesso || {}, email = $("whoName").textContent, assinando = a.origem === "hotmart" && a.status === "ativo" && Boolean(a.ate);
  const temDados = S.data.lancamentos.length || S.data.fixos.length || S.data.faturas.length;
  openDlg(`<h3>Excluir minha conta</h3>
    <p class="ec-txt">Isso apaga <b>para sempre</b> a conta <b>${esc(email)}</b> e tudo o que está nela: lançamentos, gastos fixos, cartões e faturas, metas, limites, categorias e avisos. Não dá para desfazer.</p>
    ${casalAtivo() ? `<p class="ec-txt ec-alerta"><b>A conta de casal com ${esc(S.casal.outro)} é encerrada.</b> Essa pessoa fica com o que ela lançou e com o que está nos cartões dela. O que você lançou é apagado.</p>` : ""}
    ${assinando ? `<p class="ec-txt ec-alerta"><b>Excluir a conta não cancela a assinatura.</b> Para não ser cobrado na renovação, cancele também na Hotmart: entre na sua conta de comprador, em Minhas compras, com o e-mail usado na compra. Se não conseguir, fale com o suporte.</p>` : ""}
    ${temDados ? `<button class="btn" type="button" id="ecBaixar" style="justify-self:start">${ico("baixar")}Baixar meus dados em planilha antes</button>` : ""}
    <form id="ecForm" style="display:grid;gap:12px;margin-top:14px" novalidate>
      ${campoSenha("ecSenha", "Para confirmar, digite a sua senha", "current-password")}
      <p class="auth-msg err" id="ecMsg" role="alert"></p>
      <div class="actions"><button class="btn perigo arm" type="submit" id="ecExcluir" style="margin-left:0">Excluir a conta para sempre</button><button class="btn" type="button" id="ecVoltar">${voltar ? "Voltar" : "Cancelar"}</button></div></form>`);
  $("ecVoltar").onclick = () => (voltar ? voltar() : $("dlg").close());
  if ($("ecBaixar")) $("ecBaixar").onclick = () => $("btnExport").click();
  $("ecForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const senha = $("ecSenha").value, erro = (t) => { $("ecMsg").textContent = t; $("ecExcluir").disabled = false; $("ecExcluir").textContent = "Excluir a conta para sempre"; };
    if (!senha) { $("ecSenha").focus(); return erro("Digite a sua senha para confirmar."); }
    $("ecExcluir").disabled = true; $("ecExcluir").textContent = "Excluindo…"; $("ecMsg").textContent = "";
    const falha = await confereSenha(senha);
    if (falha) return erro(falha);
    await Promise.race([desligarPush().catch(() => {}), new Promise((r) => setTimeout(r, 1500))]);   // este aparelho deixa de receber notificação
    try { await S.store.excluirConta(); S.store.esqueceCopia?.(); try { localStorage.removeItem("cg-ultimo"); } catch { /* nada */ } }
    catch (err) {
      const m = String(err?.message || err) + String(err?.code || "");
      return erro(/confirmar_senha|sem_sessao/.test(m) ? "Por segurança, digite a sua senha de novo e confirme."
        : /could not find the function|PGRST202|42883/i.test(m) ? `A exclusão pelo app ainda não está ligada. Escreva para ${SUPORTE_CONTATO || "o suporte"} a partir do e-mail da conta que nós apagamos para você.`
        : /fetch|network/i.test(m) ? "Sem conexão com a internet. A conta não foi excluída. Tente de novo." : "Não foi possível excluir agora. A conta continua como estava. Tente de novo em alguns minutos.");
    }
    S.avisoDeEntrada = "A sua conta e os seus dados foram excluídos."; S.avisoTipo = "ok";
    $("dlg").close();
    await S.client.auth.signOut({ scope: "local" }).catch(() => {});   // a sessão já não existe no servidor: só limpa este aparelho
    setTimeout(() => { if ($("auth").hidden) showAuth("entrar"); }, 200);   // se o aviso de saída não chegar, vai para a entrada assim mesmo
  });
}
/* ================= leitor por foto ou PDF: comprovante, fatura ou holerite ================= */
// A foto ou o PDF é lido no próprio aparelho (js/leitor.js). O app nunca salva direto: mostra o que entendeu para a pessoa conferir.
let leitura = 0;   // muda a cada leitura; resultado de uma leitura cancelada é ignorado
function abrirLeitor(preferido = "") {
  S.lerComo = preferido;
  openDlg(`<h3>${preferido === "fatura" ? "Ler fatura" : "Ler foto ou PDF"}</h3>
    <p class="hint" style="margin:0 0 10px;font-size:13px">${preferido === "fatura" ? "Fotografe a fatura do cartão ou escolha o PDF que o banco mandou." : "Fotografe ou escolha o arquivo de um comprovante de pagamento, da fatura do cartão ou do holerite."} O app lê o valor e a data e deixa tudo preenchido para você conferir.</p>
    <ul class="dicas"><li>PDF e print de tela leem melhor do que foto de papel.</li><li>Na foto de papel: chegue perto, enquadre só o documento e segure o celular reto por cima dele, com boa luz.</li><li>Em boleto e conta, deixe o código de barras e a fileira de números aparecendo: o valor também está escrito ali.</li><li>Da fatura o app pega só o total e o vencimento; do holerite, o valor líquido.</li><li>A leitura é feita no seu aparelho. O arquivo não é enviado para nenhum servidor.</li></ul>
    <div class="menu-lista" style="display:grid;gap:8px"><button class="btn primary" type="button" id="lerFoto">${ico("camera")}Tirar foto</button><button class="btn" type="button" id="lerEscolher">${ico("imagem")}Escolher imagem ou PDF</button><button class="btn" type="button" id="lerQr">${ico("qr")}Ler QR code do Pix ou da nota</button><button class="btn" type="button" id="lerExtrato">${ico("subir")}Importar extrato do cartão</button><button class="btn ghost" type="button" data-close>Cancelar</button></div>`);
  $("lerFoto").onclick = () => $("lerCamera").click();
  $("lerEscolher").onclick = () => $("lerGaleria").click();
  $("lerQr").onclick = abrirQr;
  $("lerExtrato").onclick = abrirExtrato;
}

/* ---------- QR code: Pix, nota fiscal e boleto, pela câmera, por uma imagem ou colando o código ---------- */
let camera = null;   // a câmera aberta pelo leitor de QR code; é desligada sempre que o quadro fecha ou muda
function desligaCamera() { camera?.getTracks().forEach((t) => t.stop()); camera = null; }
$("dlg").addEventListener("close", desligaCamera);
/** O código foi entendido: mostra a conferência. `previa` é a imagem de onde ele saiu, quando há. */
function usaCodigo(texto, previa = "") {
  const r = interpretaQr(texto, hoje());
  if (!r) return false;
  desligaCamera(); S.lerComo = "";
  // Nota de mercado: o código só tem o endereço da Fazenda. Com a pessoa logada, o servidor do app busca o valor lá.
  if (r.origem === "nota" && r.valor === null && r.link && NOTA_URL && S.store?.kind === "supabase") consultaNota(r, String(texto), previa);
  else conferirLeitura(r, String(texto), previa);
  return true;
}
const NOTA_URL = SUPABASE_URL ? SUPABASE_URL.replace(/\/$/, "") + "/functions/v1/nota" : "";
/** Pede ao servidor a nota que está no endereço do QR code e abre a conferência já com valor, loja, data e itens. Se não der, segue como antes. */
async function consultaNota(r, texto, previa, seFalhar = null) {
  const vez = ++leitura;
  openDlg(`<h3>Consultando a nota…</h3><p class="hint" style="margin:0;font-size:13px">Buscando o valor, a loja e os itens no site da Fazenda. Leva alguns segundos.</p>
    <div class="barra vai"><i></i></div><div class="actions"><button class="btn" type="button" id="notaPular">Digitar o valor eu mesmo</button></div>`);
  $("notaPular").onclick = () => { leitura++; conferirLeitura(r, texto, previa); };
  $("dlg").addEventListener("close", () => { if (vez === leitura) leitura++; }, { once: true });   // fechou no meio: o resultado é descartado
  let nota = null, motivo = "";
  const corta = new AbortController(), relogio = setTimeout(() => corta.abort(), 15000);
  try {
    const resp = await fetch(NOTA_URL, { method: "POST", signal: corta.signal, headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + (await S.store.token()) }, body: JSON.stringify({ url: r.link }) });
    const j = await resp.json().catch(() => null);
    if (j?.ok && j.nota?.valor > 0) nota = j.nota; else motivo = j?.motivo || "erro";
  } catch { motivo = "sem-resposta"; } finally { clearTimeout(relogio); }
  if (vez !== leitura) return;
  if (nota) return conferirLeitura(leituraDaNota(nota, r, hoje()), itensEmTexto(nota) || texto, previa);
  if (seFalhar) return seFalhar();   // veio de uma foto: o leitor de texto ainda pode achar o total impresso
  const porque = motivo === "limite" ? "Foram muitas consultas seguidas. Espere alguns minutos e tente de novo"
    : motivo === "nao-entendi" || motivo === "endereco" ? "Consultei a Fazenda, mas ainda não sei ler a nota desse estado"
    : "O site da Fazenda não respondeu agora";
  conferirLeitura({ ...r, aviso: `${porque}. Digite o valor, ou volte e fotografe o cupom inteiro para o app ler o total.` }, texto, previa);
}
const QR_NAO_SERVE = "Esse código não é de Pix, de nota fiscal nem de boleto. Aponte para o QR code do pagamento ou do cupom.";
function abrirQr() {
  const vez = ++leitura;
  openDlg(`<h3>Ler QR code</h3>
    <p class="hint" style="margin:0 0 10px;font-size:13px">Aponte a câmera para o QR code do Pix ou do cupom fiscal. O app mostra o que leu para você conferir antes de lançar. ${S.store?.kind === "supabase" ? "O código é lido no aparelho; na nota de mercado, o app busca o valor no site da Fazenda." : "Na demonstração, a nota de mercado vem sem o valor: com a sua conta, o app busca o valor no site da Fazenda."}</p>
    <div class="qr-cam" id="qrCam"><video id="qrVideo" playsinline muted></video><i aria-hidden="true"></i></div>
    <p class="auth-msg" id="qrMsg" role="status">Abrindo a câmera…</p>
    <div class="menu-lista" style="display:grid;gap:8px">
      <button class="btn" type="button" id="qrImagem">${ico("imagem")}Escolher uma imagem do QR code</button>
      <details class="qr-colar"><summary>Colar o código do Pix (copia e cola)</summary>
        <textarea class="in" id="qrTexto" rows="3" spellcheck="false" autocapitalize="none" placeholder="Cole aqui o código que começa com 000201…" aria-label="Código do Pix copia e cola"></textarea>
        <button class="btn" type="button" id="qrUsar">Usar este código</button></details>
      <button class="btn ghost" type="button" data-close>Cancelar</button></div>
    <input type="file" id="qrArquivo" accept="image/*" hidden>`);
  const msg = (t, kind = "") => { if ($("qrMsg")) { $("qrMsg").textContent = t; $("qrMsg").className = "auth-msg " + kind; } };
  $("qrImagem").onclick = () => $("qrArquivo").click();
  $("qrArquivo").onchange = async (e) => {
    const f = e.target.files[0]; e.target.value = ""; if (!f) return;
    msg("Procurando o código na imagem…");
    try {
      const achados = await codigosDaImagem(f, await criaLeitorDeCodigos());
      if (vez !== leitura) return;
      if (!achados.length) return msg("Não achei um QR code nessa imagem. Tente um print mais nítido, com o código inteiro aparecendo.", "err");
      if (!achados.some((t) => usaCodigo(t, URL.createObjectURL(f)))) msg(QR_NAO_SERVE, "err");
    } catch (err) { console.error(err); if (vez === leitura) msg(/leitor-indisponivel/.test(String(err?.message)) ? "O leitor de QR code não carregou. Confira a internet e tente de novo." : "Não consegui abrir essa imagem. Tente outra.", "err"); }
  };
  $("qrUsar").onclick = () => {
    const t = $("qrTexto").value.trim();
    if (!t) { $("qrTexto").focus(); return msg("Cole o código do Pix no campo acima.", "err"); }
    if (!usaCodigo(t)) msg("Esse texto não é um código de Pix. Copie de novo o \"copia e cola\" inteiro, do começo ao fim.", "err");
  };
  ligaCameraDoQr(vez, msg);
}
async function ligaCameraDoQr(vez, msg) {
  const semCamera = (t) => { if (vez !== leitura || !$("qrCam")) return; $("qrCam").hidden = true; msg(t); };
  if (!navigator.mediaDevices?.getUserMedia) return semCamera("Este navegador não abre a câmera por aqui. Escolha uma imagem do QR code ou cole o código do Pix.");
  let leitor;
  try {
    camera = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    if (vez !== leitura || !$("qrVideo")) return desligaCamera();   // a pessoa fechou enquanto a câmera abria
    $("qrVideo").srcObject = camera; await $("qrVideo").play().catch(() => {});
    leitor = await criaLeitorDeCodigos();
  } catch (e) {
    desligaCamera();
    return semCamera(/leitor-indisponivel/.test(String(e?.message)) ? "O leitor de QR code não carregou. Confira a internet e tente de novo."
      : e?.name === "NotAllowedError" ? "A câmera está bloqueada para o app. Libere a câmera nas permissões do navegador, ou escolha uma imagem do QR code."
      : "Não consegui abrir a câmera. Escolha uma imagem do QR code ou cole o código do Pix.");
  }
  if (vez !== leitura || !$("qrVideo")) return desligaCamera();
  msg(leitor.barras ? "Procurando o código… Também leio o código de barras do boleto." : "Procurando o código…");
  let recusado = "";
  const olha = async () => {
    if (vez !== leitura || !camera || !$("qrVideo")) return;
    try {
      const v = $("qrVideo");
      if (v.readyState >= 2) for (const t of await leitor.le(v)) {
        if (t === recusado) continue;
        const tela = document.createElement("canvas"); tela.width = v.videoWidth; tela.height = v.videoHeight; tela.getContext("2d").drawImage(v, 0, 0);
        if (usaCodigo(t, tela.toDataURL("image/jpeg", 0.7))) { navigator.vibrate?.(60); return; }
        recusado = t; msg(QR_NAO_SERVE, "err");
      }
    } catch (e) { console.warn("Leitura do quadro falhou:", e?.message); }
    setTimeout(olha, 220);
  };
  olha();
}
/** Explica o que é o extrato e abre a escolha do arquivo. */
function abrirExtrato() {
  openDlg(`<h3>Importar extrato do cartão</h3>
    <p class="hint" style="margin:0 0 10px;font-size:13px">Em vez de digitar compra por compra, traga o arquivo que o banco exporta. O app lança todas as compras no cartão e a fatura é montada sozinha.</p>
    <ul class="dicas"><li>No app ou no site do banco, abra a fatura do cartão e procure exportar ou enviar por e-mail em <b>CSV</b>, <b>OFX</b> ou <b>Excel</b>.</li><li>Você confere a lista e as categorias antes de lançar.</li><li>Pode importar de novo quando a fatura tiver compras novas: o que já entrou não é repetido.</li><li>O arquivo é lido no seu aparelho; só as compras que você lançar são salvas na sua conta.</li></ul>
    <div class="menu-lista" style="display:grid;gap:8px"><button class="btn primary" type="button" id="extEscolher">${ico("subir")}Escolher o arquivo</button><button class="btn ghost" type="button" data-close>Cancelar</button></div>`);
  $("extEscolher").onclick = () => $("extratoIn").click();
}
$("btnLer").onclick = () => abrirLeitor();
["lerCamera", "lerGaleria"].forEach((id) => $(id).addEventListener("change", (e) => { const f = e.target.files[0]; e.target.value = ""; if (!f) return; if (!ehPdf(f) && !/^image\//.test(f.type) && ehExtrato(f)) importarExtrato(f); else processaLeitura(f); }));

/** PDF protegido: pede a senha. Ela só é usada aqui, para abrir o arquivo no aparelho; não é guardada nem enviada. */
function pedirSenhaDoPdf(arquivo, errada) {
  openDlg(`<h3>Esse PDF tem senha</h3>
    <p style="color:var(--ink-2);margin:0 0 12px">Digite a senha do arquivo. Em fatura de cartão, o banco costuma explicar a senha no e-mail (muitas vezes são alguns números do CPF). A senha é usada só neste aparelho para abrir o arquivo; não é guardada nem enviada.</p>
    <form id="pdfSenhaForm" autocomplete="off"><label class="f">Senha do PDF<input class="in" id="pdfSenha" type="password" autocomplete="off" required></label>
    <p class="auth-msg err" style="margin:8px 0 0">${errada ? "Essa senha não abriu o arquivo. Confira e tente de novo." : ""}</p>
    <div class="actions" style="margin-top:12px"><button class="btn primary" type="submit">Abrir o PDF</button><button class="btn" type="button" data-close>Cancelar</button></div></form>`);
  $("pdfSenha").focus();
  $("pdfSenhaForm").addEventListener("submit", (e) => { e.preventDefault(); const s = $("pdfSenha").value; if (s) processaLeitura(arquivo, s); });
}

async function processaLeitura(arquivo, senha = "", semCodigo = false) {
  const vez = ++leitura, pdf = ehPdf(arquivo), preparando = "Preparando o leitor. Na primeira vez demora um pouco mais, porque ele é baixado.";
  openDlg(`<h3>${pdf ? "Lendo o PDF…" : "Lendo a imagem…"}</h3><p class="hint" id="lerEtapa" style="margin:0;font-size:13px">${preparando}</p>
    <div class="barra"><i id="lerBarra"></i></div><div class="actions"><button class="btn" type="button" id="lerCancela">Cancelar</button></div>`);
  $("lerCancela").onclick = () => { leitura++; $("dlg").close(); };
  const anda = (rotulo) => (p) => {
    if (vez !== leitura || !$("lerBarra")) return;
    $("lerEtapa").textContent = p.etapa !== "lendo" ? preparando : p.vez > 1 ? `Olhando de outro jeito, para achar o valor e a data (${p.vez}ª tentativa)… ${p.pct}%` : `${rotulo} ${p.pct}%`;
    $("lerBarra").style.width = (p.etapa === "lendo" ? 30 + p.pct * 0.7 : Math.min(30, 4 + p.pct * 0.26)) + "%";
  };
  try {
    let texto, previa, lido = null;
    if (pdf) {
      const r = await lerPdf(arquivo, { senha, aoProgredir: anda("Lendo o PDF…") });
      if (vez !== leitura) return;
      texto = r.texto; previa = r.tela.toDataURL("image/jpeg", 0.72);
      // PDF que é só uma foto digitalizada não tem texto dentro: lê a primeira página como imagem.
      if (texto.replace(/\s/g, "").length < 40) ({ texto, leitura: lido } = await lerImagem(r.tela, anda("Esse PDF é uma imagem. Lendo o texto…"), hoje()));
    } else {
      // Print ou foto com um QR code que já traz o valor (Pix, cupom SAT, nota emitida sem internet): o que está no código é exato,
      // então vale mais do que o texto lido da imagem. Nota sem valor no código segue para a leitura do texto, que acha o total impresso.
      const noCodigo = S.lerComo === "fatura" || semCodigo ? [] : await criaLeitorDeCodigos().then((l) => codigosDaImagem(arquivo, l)).catch(() => []);
      if (vez !== leitura) return;
      const exato = noCodigo.find((t) => { const r = interpretaQr(t, hoje()); return r && (r.origem === "pix" || r.valor !== null); });
      if (exato) return void usaCodigo(exato, URL.createObjectURL(arquivo));
      // Foto do cupom de mercado: com a pessoa logada, a nota é consultada na Fazenda; se a consulta falhar, o texto da foto é lido como antes.
      const daNota = NOTA_URL && S.store?.kind === "supabase" ? noCodigo.map((t) => [t, interpretaQr(t, hoje())]).find(([, r]) => r?.origem === "nota" && r.link) : null;
      if (daNota) { S.lerComo = ""; return void consultaNota(daNota[1], daNota[0], URL.createObjectURL(arquivo), () => processaLeitura(arquivo, senha, true)); }
      ({ texto, leitura: lido } = await lerImagem(arquivo, anda("Lendo o texto da imagem…"), hoje())); previa = URL.createObjectURL(arquivo);
    }
    if (vez !== leitura) return;
    conferirLeitura(lido || interpretaTexto(texto, hoje()), texto, previa);
  } catch (e) {
    if (vez !== leitura) return;
    const cod = String(e?.message);
    if (/pdf-senha/.test(cod)) return pedirSenhaDoPdf(arquivo, /errada/.test(cod));
    console.error(e);
    const semLeitor = /leitor-indisponivel/.test(cod), ruim = /pdf-invalido/.test(cod);
    openDlg(`<h3>${semLeitor ? "O leitor não carregou" : ruim ? "Não consegui abrir esse PDF" : "Não consegui ler essa imagem"}</h3>
      <p style="color:var(--ink-2);margin:0 0 14px">${semLeitor ? "O leitor é baixado da internet na primeira vez que é usado. Confira a conexão e tente de novo."
        : ruim ? "O arquivo pode estar danificado ou não ser um PDF. Tente baixar de novo, ou mande um print da tela." : "Tente outra foto, com mais luz e o valor bem enquadrado, ou lance à mão."}</p>
      <div class="actions"><button class="btn primary" type="button" id="lerDeNovo">Tentar de novo</button><button class="btn" type="button" data-close>Lançar à mão</button></div>`);
    $("lerDeNovo").onclick = () => abrirLeitor(S.lerComo);
  }
}

/** Mostra o que foi lido, já preenchido, para a pessoa conferir e salvar. `previa` é o endereço da miniatura (foto ou 1ª página do PDF). */
function conferirLeitura(r, texto, previa) {
  const dinheiro = (v) => (v > 0 ? v.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "");
  // gasto, entrada (holerite ou outro recebimento) ou fatura de cartão
  const tipoIni = S.lerComo === "fatura" || r.tipo === "fatura" ? "fatura" : r.tipo === "holerite" ? "entrada" : "gasto";
  const escolhe = (lista, palpite) => (lista.includes(palpite) ? palpite : lista.includes("Outros") ? "Outros" : lista[0]);
  const catL = cats("Despesa"), catE = cats("Receita");
  const ativos = cartoesAtivos(), achado = ativos.find((k) => r.cartao && (norm(k.nome).includes(norm(r.cartao)) || norm(r.cartao).includes(norm(k.nome))));
  // Na fatura, só escolhe o cartão sozinho quando o nome lido bate com um cartão cadastrado. Senão a pessoa escolhe, para não trocar o valor da fatura errada.
  const sugerido = achado || ativos[0];
  openDlg(`<h3>Conferir leitura</h3>
    <div class="ler-topo${previa ? "" : " sem-foto"}">${previa ? `<img src="${previa}" alt="Arquivo lido">` : ""}
      <div><p class="hint" style="font-size:13px">${r.aviso ? esc(r.aviso) + (r.link ? ` <a href="${esc(r.link)}" target="_blank" rel="noopener noreferrer">Abrir a nota no site da Fazenda</a>` : "")
        : r.valor ? (r.tipo === "holerite" ? "Parece um holerite: peguei o valor líquido. Confira os campos antes de salvar."
        : r.firme === false ? `Achei ${brl(r.valor)}, mas sem certeza de que é o valor certo. Confira${r.valores.length ? " ou toque em outro valor abaixo" : ""}.`
        : "Confira os campos antes de salvar. O leitor pode trocar algum número.")
        : r.valores.length ? "Não tive certeza de qual é o valor. Toque em um dos que encontrei, ou digite."
        : "Não consegui ler o valor nessa foto. Digite abaixo, ou tire outra mais de perto, só do documento, com o celular reto por cima."}${r.vencimento && r.tipo !== "fatura" && !r.data ? ` Vence em ${ddmm(r.vencimento)}; deixei a data de hoje.` : ""}</p>
      ${r.valores.length ? `<div class="ler-chips" aria-label="Outros valores encontrados">${r.valores.map((v) => `<button type="button" data-usar="${v}">${brl(v)}</button>`).join("")}</div>` : ""}</div></div>
    <div class="seg" id="lTipoSeg" role="group" aria-label="O que é esse arquivo"><button type="button" data-lt="gasto">Gasto</button><button type="button" data-lt="entrada">Entrada</button><button type="button" data-lt="fatura">Fatura</button></div>
    <form id="lerForm" class="dlg-form" autocomplete="off" novalidate>
      <label class="f" data-g="gasto entrada">Valor (R$)<input class="in money" id="lValor" inputmode="decimal" placeholder="0,00" value="${esc(dinheiro(r.valor))}"></label>
      <label class="f" data-g="gasto entrada"><span id="lDataLbl">Data</span><input class="in" type="date" id="lData" value="${esc(r.data || hoje())}"></label>
      <label class="f wide" data-g="gasto entrada">Descrição<input class="in" id="lDesc" maxlength="80" value="${esc(r.descricao)}" placeholder="Ex.: mercado, farmácia"></label>
      <label class="f" data-g="gasto">Categoria<select class="in" id="lCat">${opts(catL, escolhe(catL, palpiteCat(r.descricao, "Despesa", r.categoria)))}</select></label>
      <label class="f wide" data-g="entrada">Categoria<select class="in" id="leCat">${opts(catE, escolhe(catE, palpiteCat(r.descricao, "Receita")))}</select></label>
      <label class="f" data-g="gasto">Forma de pagamento<select class="in" id="lForma">${opts(FORMAS, r.forma || "Pix")}</select></label>
      <label class="f" data-g="gasto" id="lCartaoWrap" hidden>Cartão<select class="in" id="lCartao">${optsCartao(sugerido?.id)}</select></label>
      <label class="f" data-g="gasto" id="lParcWrap" hidden>Parcelas<select class="in" id="lParc">${optsParcelas(r.valor || 0, 1)}</select></label>
      <label class="f wide" data-g="fatura">Cartão<select class="in" id="lfCartao">${ativos.length && !achado ? `<option value="?" selected disabled>Escolha o cartão</option>` : ""}${ativos.map((k) => `<option value="${esc(k.id)}"${k === achado ? " selected" : ""}>${esc(k.nome)}</option>`).join("")}<option value="">Outro cartão (digitar o nome)</option></select></label>
      ${ativos.length && !achado && r.cartao ? `<p class="hint wide" data-g="fatura" style="margin:-4px 0 0;font-size:12.5px">No arquivo aparece o nome ${esc(r.cartao)}.</p>` : ""}
      <p class="hint wide" data-g="fatura" id="lfDica" style="margin:-4px 0 0;font-size:12.5px">O valor lido passa a valer como o total dessa fatura, no lugar da soma das compras lançadas.</p>
      <label class="f wide" data-g="fatura" id="lfNomeWrap">Nome do cartão<input class="in" id="lfNome" maxlength="40" value="${esc(r.cartao)}" placeholder="Ex.: Nubank"></label>
      <label class="f" data-g="fatura">Valor da fatura (R$)<input class="in money" id="lfValor" inputmode="decimal" placeholder="0,00" value="${esc(dinheiro(r.valor))}"></label>
      <label class="f" data-g="fatura">Vencimento<input class="in" type="date" id="lfVenc" value="${esc(r.vencimento || "")}"></label>
      <label class="f" data-g="fatura">Situação<select class="in" id="lfSt"><option value="Aberta">Em aberto</option><option value="Paga">Paga</option></select></label>
      <p class="auth-msg err wide" id="lerMsg"></p>
      <div class="actions wide"><button class="btn primary" type="submit" id="lerSalvar">Salvar</button><button class="btn" type="button" id="lerOutra">Ler outro</button><button class="btn" type="button" data-close>Cancelar</button></div>
    </form>
    <details class="lido"><summary>${r.consultada ? "Ver os itens da nota" : r.origem ? "Ver o que estava no código" : "Ver o texto que foi lido"}</summary><pre>${esc(texto.trim() || "(nenhum texto encontrado)")}</pre></details>`);
  if (previa?.startsWith("blob:")) $("dlg").addEventListener("close", () => URL.revokeObjectURL(previa), { once: true });
  let tipo = tipoIni, avisado = "";
  const sync = () => {
    document.querySelectorAll("#lTipoSeg button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.lt === tipo));
    document.querySelectorAll("#lerForm [data-g]").forEach((el) => (el.hidden = !el.dataset.g.split(" ").includes(tipo)));
    if (tipo === "gasto") { const cc = $("lForma").value === CARTAO && ativos.length > 0; $("lCartaoWrap").hidden = !cc; $("lParcWrap").hidden = !cc; }
    else if (tipo === "fatura") { const k = $("lfCartao").value; $("lfNomeWrap").hidden = k !== ""; $("lfDica").hidden = k === "" || k === "?"; }
    $("lDataLbl").textContent = tipo === "entrada" ? "Dia em que recebeu" : "Data";
    $("lerSalvar").textContent = tipo === "fatura" ? "Salvar fatura" : tipo === "entrada" ? "Lançar entrada" : "Lançar gasto"; $("lerMsg").textContent = ""; avisado = "";
  };
  $("lTipoSeg").onclick = (e) => { const b = e.target.closest("button"); if (b) { tipo = b.dataset.lt; sync(); } };
  $("lForma").onchange = sync; $("lfCartao").onchange = sync;
  $("lValor").oninput = () => { $("lParc").innerHTML = optsParcelas(parseMoney($("lValor").value), $("lParc").value); };
  $("dlgBody").querySelectorAll("[data-usar]").forEach((b) => (b.onclick = () => { $(tipo === "fatura" ? "lfValor" : "lValor").value = dinheiro(Number(b.dataset.usar)); $("lValor").oninput(); }));
  $("lerOutra").onclick = () => abrirLeitor(S.lerComo);
  sync();

  $("lerForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = (t) => { $("lerMsg").textContent = t; };
    // Avisa uma vez antes de salvar algo que pode estar em dobro; no segundo toque, salva.
    const confirma = (chave, texto) => { if (avisado === chave) return true; avisado = chave; $("lerSalvar").textContent = "Salvar mesmo assim"; msg(texto); return false; };
    if (tipo === "gasto" || tipo === "entrada") {
      const ent = tipo === "entrada", v = parseMoney($("lValor").value), data = $("lData").value, T = ent ? "Receita" : "Despesa";
      if (!(v > 0)) return msg("Digite o valor, por exemplo 25,90.");
      if (!data) return msg(ent ? "Escolha o dia em que você recebeu." : "Escolha a data do gasto.");
      const chave = [tipo, data, round2(v)].join("|");
      // Mesmo valor no mesmo dia já lançado: pode ser o mesmo comprovante lido duas vezes.
      if (S.data.lancamentos.some((x) => x.tipo === T && x.data === data && round2(x.valor) === round2(v))
        && !confirma(chave, `Já existe ${ent ? "uma entrada" : "um gasto"} de ${brl(v)} em ${ddmm(data)}. Se for ${ent ? "outro recebimento" : "outra compra"}, toque em Salvar mesmo assim.`)) return;
      // Entrada fixa (como o salário cadastrado) já é lançada sozinha todo mês: lançar o holerite também contaria em dobro.
      const fixas = ent ? calcMes(S.data, mKey(data), hoje()).fr : [];
      if (fixas.length && !confirma(chave, `Você já tem entrada fixa em ${nomeMes(mKey(data))} (${fixas.map((f) => `${f.descricao} ${brl(f.valor)}`).join(", ")}), que o app lança sozinho. Se for o mesmo dinheiro, não lance de novo: ajuste o valor em Entradas fixas. Se for outro recebimento, toque em Salvar mesmo assim.`)) return;
      const forma = ent ? "" : $("lForma").value, cc = !ent && forma === CARTAO && ativos.length > 0;
      const row = { data, descricao: $("lDesc").value.trim(), tipo: T, categoria: $(ent ? "leCat" : "lCat").value, forma, valor: round2(v), import_key: null,
        ...(cc ? { cartao_id: $("lCartao").value || null, parcelas: Number($("lParc").value) || 1 } : {}) };
      $("lerSalvar").disabled = true;
      let novos; const ok = await grava(async () => { novos = await S.store.addLancamentos([row]); });
      if (!ok) { $("lerSalvar").disabled = false; return; }
      S.data.lancamentos.push(...novos); S.mes = mKey(data);
      $("dlg").close(); fecharLancar(); render();
      toastOuFlash(`${ent ? "Entrada lançada" : "Lançado"} pela leitura: ${row.descricao || row.categoria} · ${brl(row.valor)} em ${ddmm(data)}.`);
      return;
    }
    const v = parseMoney($("lfValor").value), venc = $("lfVenc").value, id = $("lfCartao").value, status = $("lfSt").value;
    if (!(v > 0)) return msg("Digite o valor da fatura, por exemplo 350,00.");
    if (id === "?") return msg("Escolha de qual cartão é essa fatura.");
    if (!venc) return msg("Escolha a data de vencimento da fatura.");
    $("lerSalvar").disabled = true;
    let ok, nome;
    if (id) {   // cartão cadastrado: o valor lido passa a valer para a fatura daquele mês
      const k = cartaoPorId(id); nome = k.nome;
      ok = await gravaFaturaAuto({ id: null, cartao_id: k.id, cartao: k.nome, vencimento: venc, valor: round2(v) }, { valor: round2(v), valor_fixo: true, status });
    } else {
      nome = $("lfNome").value.trim();
      if (!nome) { $("lerSalvar").disabled = false; return msg("Digite o nome do cartão."); }
      let nova; ok = await grava(async () => { nova = await S.store.addFatura({ cartao: nome, vencimento: venc, valor: round2(v), status }); });
      if (ok) S.data.faturas.push(nova);
    }
    if (!ok) { $("lerSalvar").disabled = false; return; }
    S.mes = mKey(venc); S.view = "listas"; S.tab = "c";
    $("dlg").close(); fecharLancar(); render();
    toastOuFlash(`Fatura ${nome} salva: ${brl(round2(v))}, vence em ${ddmmaa(venc)}.`);
  });
}

/* ================= extrato do cartão: lançar as compras em lote ================= */
// O banco exporta a fatura ou o extrato do cartão em CSV, OFX ou Excel. O app lê o arquivo (js/extrato.js), mostra as compras
// para a pessoa conferir e lança todas de uma vez no cartão escolhido. Importar de novo um arquivo mais novo só traz o que falta.
$("extratoIn").addEventListener("change", (e) => { const f = e.target.files[0]; e.target.value = ""; if (f) importarExtrato(f); });

async function importarExtrato(arquivo) {
  let ext = null;
  try {
    if (ehPlanilha(arquivo)) {
      if (typeof XLSX === "undefined") return showBanner("Não foi possível abrir o leitor de Excel. Confira a internet e recarregue a página.");
      const wb = XLSX.read(await arquivo.arrayBuffer(), { type: "array" });
      // Fica com a aba que tem mais compras.
      ext = wb.SheetNames.map((n) => leExtrato({ linhas: XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: null }), hoje: hoje(), nome: arquivo.name }))
        .sort((a, b) => b.compras.length - a.compras.length)[0];
    } else ext = leExtrato({ texto: decodifica(new Uint8Array(await arquivo.arrayBuffer())), hoje: hoje(), nome: arquivo.name });
  } catch (e) { console.error(e); }
  if (!ext || !ext.compras.length) {
    return openDlg(`<h3>Não achei compras nesse arquivo</h3>
      <p style="color:var(--ink-2);margin:0 0 14px">O arquivo precisa ter, em cada linha, a data, a descrição e o valor da compra. No app ou no site do banco, abra a fatura do cartão e procure a opção de exportar ou enviar por e-mail em <b>CSV</b>, <b>OFX</b> ou <b>Excel</b>. Fatura em PDF ou foto vai pelo botão Ler fatura.</p>
      <div class="actions"><button class="btn" type="button" data-close>Fechar</button></div>`);
  }
  if (!cartoesAtivos().length) {
    // Sem cartão cadastrado: o próprio arquivo costuma dizer o banco e o dia em que a fatura fecha (e o Nubank põe o vencimento no nome).
    const i = ext.info, dia = (d) => (d ? Number(d.slice(8, 10)) : "");
    openDlg(`<h3>Cadastre o cartão para importar</h3>
      <p style="color:var(--ink-2);margin:0 0 12px">Achei ${ext.compras.length} ${ext.compras.length === 1 ? "compra" : "compras"} no arquivo. Elas entram em um cartão: confira os dados abaixo${i.fecha ? ", que vieram do arquivo," : ""} e continue.</p>
      <form id="extK" class="dlg-form" autocomplete="off">
        <label class="f wide">Nome do cartão<input class="in" id="ekNome" required maxlength="40" value="${esc(i.banco)}" placeholder="Ex.: Nubank"></label>
        <label class="f">Dia que a fatura fecha<input class="in" id="ekFech" type="number" inputmode="numeric" min="1" max="31" required value="${dia(i.fecha)}" placeholder="Ex.: 3"></label>
        <label class="f">Dia que a fatura vence<input class="in" id="ekVenc" type="number" inputmode="numeric" min="1" max="31" required value="${dia(i.vencimento)}" placeholder="Ex.: 10"></label>
        <p class="auth-msg err wide" id="ekMsg"></p>
        <div class="actions wide"><button class="btn primary" type="submit">Cadastrar e continuar</button><button class="btn" type="button" data-close>Cancelar</button></div>
      </form>`);
    $("extK").addEventListener("submit", async (e) => {
      e.preventDefault();
      const nome = $("ekNome").value.trim(), d = (id) => Math.min(31, Math.max(1, Math.round(Number($(id).value)) || 0));
      if (!nome || !Number($("ekFech").value) || !Number($("ekVenc").value)) { $("ekMsg").textContent = "Preencha o nome e os dois dias."; return; }
      if (S.data.cartoes.some((k) => norm(k.nome) === norm(nome))) { $("ekMsg").textContent = `Já existe um cartão chamado ${nome}, mas ele está desativado. Reative em Cartões ou use outro nome.`; return; }
      let novo; if (!(await grava(async () => { novo = await S.store.addCartao({ nome, fechamento: d("ekFech"), vencimento: d("ekVenc") }); }))) return;
      S.data.cartoes.push(novo); render();
      conferirExtrato(ext, arquivo.name || "extrato");
    });
    return;
  }
  conferirExtrato(ext, arquivo.name || "extrato");
}

/** Lista as compras do extrato para a pessoa conferir, escolher o cartão e a fatura, e lançar tudo de uma vez. */
function conferirExtrato(ext, nomeArquivo) {
  const ativos = cartoesAtivos(), catL = cats("Despesa");
  // Categoria: primeiro o que a pessoa já usou para a mesma descrição; depois o palpite pelo nome; por fim a categoria do banco.
  const historico = new Map();
  [...S.data.lancamentos].sort((a, b) => a.data.localeCompare(b.data)).forEach((x) => { if (x.tipo === "Despesa" && x.descricao) historico.set(norm(x.descricao.replace(/\s*\(\d+\/\d+\)$/, "")), x.categoria); });
  const sugere = (it) => { const h = historico.get(norm(it.descricao)); let c = h || guessCat(it.descricao, "Despesa"); if (c === "Outros" && it.catBanco) c = guessCat(it.catBanco, "Despesa"); return catL.includes(c) ? c : catL.includes("Outros") ? "Outros" : catL[0]; };
  const info = ext.info, pelaNome = ativos.find((k) => norm(nomeArquivo).includes(norm(k.nome)) || (info.banco && (norm(k.nome).includes(norm(info.banco)) || norm(info.banco).includes(norm(k.nome)))));
  const est = { cartao: (pelaNome || ativos[0]).id, mes: "", itens: ext.compras.map((it) => ({ ...it, cat: sugere(it), marcado: null })) };

  const monta = () => {
    const k = cartaoPorId(est.cartao), provavel = faturaProvavel(k, ext.compras, hoje(), info);
    // O arquivo diz o dia em que a fatura fecha (e às vezes o do vencimento). Se o cadastro do cartão está diferente, oferece acertar.
    const dFech = info.fecha ? Number(info.fecha.slice(8, 10)) : 0, dVenc = info.vencimento ? Number(info.vencimento.slice(8, 10)) : 0;
    const difere = (dFech && dFech !== Number(k.fechamento)) || (dVenc && dVenc !== Number(k.vencimento));
    if (!est.mes) est.mes = provavel;
    const meses = [...new Set([-2, -1, 0, 1, 2].map((d) => addM(provavel, d)).concat(est.mes === "datas" ? [] : [est.mes]))].sort();
    const mesDo = (it) => (est.mes === "datas" ? mesDaFatura(k, it.data) : est.mes);
    const vence = (m) => { const [a, mo] = m.split("-").map(Number); return `${m}-${pad(Math.min(Number(k.vencimento), new Date(a, mo, 0).getDate()))}`; };
    // O que já está no app: importado antes (mesma chave) ou já presente na fatura (lançado à mão, parcela de compra antiga, fixo no cartão).
    const chaves = new Set(S.data.lancamentos.map((x) => x.import_key).filter(Boolean)), porId = new Map(S.data.lancamentos.map((x) => [x.id, x]));
    const sobras = new Map();
    const naFatura = (m) => { if (!sobras.has(m)) sobras.set(m, (faturasDoMes(S.data, m).find((f) => f.auto && f.cartao_id === k.id)?.itens || []).filter((i) => !String(porId.get(i.id)?.import_key || "").startsWith("ext|")).map((i) => i.valor)); return sobras.get(m); };
    const comChave = comChaves(k.id, est.itens);
    est.itens.forEach((it, i) => {
      it.chave = comChave[i].chave;
      if (chaves.has(it.chave)) { it.estado = "importada"; return; }
      const l = naFatura(mesDo(it)), j = l.findIndex((v) => Math.abs(v - it.valor) < 0.005);
      if (j >= 0) { l.splice(j, 1); it.estado = "parecida"; } else it.estado = "nova";
    });
    const vis = est.itens.map((it, i) => ({ it, i })).filter((x) => x.it.estado !== "importada"), antigas = est.itens.length - vis.length;
    const ligado = (it) => (it.marcado === null ? it.estado === "nova" : it.marcado);
    const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`, soma = (l) => round2(l.reduce((t, x) => t + x.valor, 0));
    const fora = [ext.pagamentos.length ? `${plural(ext.pagamentos.length, "pagamento de fatura", "pagamentos de fatura")} (${brl(soma(ext.pagamentos))})` : "",
      ext.estornos.length ? `${plural(ext.estornos.length, "estorno", "estornos")} (${brl(soma(ext.estornos))})` : ""].filter(Boolean).join(" e ");
    openDlg(`<div class="ext"><h3>Importar extrato do cartão</h3>
      <p class="hint" style="margin:0 0 12px;font-size:13px">Achei <b>${plural(est.itens.length, "compra", "compras")}</b> em ${esc(nomeArquivo)}. Confira, ajuste as categorias e lance tudo de uma vez.</p>
      <form id="extForm" autocomplete="off">
      <div class="dlg-form">
        <label class="f">Cartão<select class="in" id="extCartao">${ativos.map((c) => `<option value="${esc(c.id)}"${c.id === k.id ? " selected" : ""}>${esc(c.nome)}</option>`).join("")}</select></label>
        <label class="f">Fatura<select class="in" id="extMes">${meses.map((m) => `<option value="${m}"${m === est.mes ? " selected" : ""}>vence em ${ddmmaa(vence(m))}</option>`).join("")}<option value="datas"${est.mes === "datas" ? " selected" : ""}>Pela data de cada compra</option></select></label>
      </div>
      ${info.fecha ? `<p class="hint" style="margin:8px 0 0">No arquivo${info.banco ? ` do ${esc(info.banco)}` : ""}: fatura de ${info.inicio ? ddmm(info.inicio) + " a " : ""}${ddmm(info.fecha)}${info.vencimento ? `, vence em ${ddmm(info.vencimento)}` : ""}.</p>` : ""}
      ${difere ? `<p class="aviso" style="margin:8px 0 0">No cadastro, o ${esc(k.nome)} fecha dia ${pad(k.fechamento)} e vence dia ${pad(k.vencimento)}. Pelo arquivo, a fatura fecha dia ${pad(dFech)}${dVenc ? ` e vence dia ${pad(dVenc)}` : ""}. Se o arquivo é mesmo desse cartão, acerte o cadastro para as próximas faturas caírem no mês certo. <button class="link" type="button" id="extAcerta">Acertar o cartão</button></p>` : ""}
      <p class="hint" style="margin:8px 0 0">${est.mes === "datas" ? "Cada compra entra na fatura do mês em que foi feita, pelo dia de fechamento do cartão. Use para arquivo com vários meses."
        : `Todas as compras entram na fatura que vence em ${nomeMes(est.mes)}, como no extrato do banco.`}</p>
      ${vis.length ? `<div class="ext-topo"><b id="extSoma"></b><button class="link" type="button" id="extTodas"></button></div>
      <ul class="ext-lista">${vis.map(({ it, i }) => `<li class="${it.estado}">
          <input type="checkbox" data-i="${i}" ${ligado(it) ? "checked" : ""} aria-label="Lançar ${esc(it.descricao)}">
          <span class="oque"><b>${esc(it.descricao)}${it.de > 1 ? ` <span class="tag">${it.parcela}/${it.de}</span>` : ""}</b>
            <span>${ddmm(it.data)}${it.estado === "parecida" ? ` · <em>parece já estar na fatura</em>` : ""}</span></span>
          <b class="v">${brl(it.valor)}</b>
          <select class="in" data-c="${i}" aria-label="Categoria de ${esc(it.descricao)}">${opts(catL, it.cat)}</select></li>`).join("")}</ul>`
        : `<div class="empty" style="margin-top:12px">Todas as compras desse arquivo já foram importadas antes.</div>`}
      ${antigas ? `<p class="hint" style="margin:10px 0 0">${plural(antigas, "compra já tinha sido importada", "compras já tinham sido importadas")} antes e ${antigas === 1 ? "ficou" : "ficaram"} de fora.</p>` : ""}
      ${fora ? `<p class="hint" style="margin:6px 0 0">Não entram: ${fora}.${ext.estornos.length ? " Para descontar o estorno, corrija o valor da fatura depois, em Editar." : ""}</p>` : ""}
      <p class="auth-msg err" id="extMsg" style="margin:8px 0 0"></p>
      <div class="actions" style="margin-top:12px">${vis.length ? `<button class="btn primary" type="submit" id="extSalvar">Lançar</button>` : ""}<button class="btn" type="button" data-close>${vis.length ? "Cancelar" : "Fechar"}</button></div>
      </form></div>`);
    $("extCartao").onchange = (e) => { est.cartao = e.target.value; est.mes = ""; est.itens.forEach((it) => (it.marcado = null)); monta(); };
    $("extMes").onchange = (e) => { est.mes = e.target.value; est.itens.forEach((it) => (it.marcado = null)); monta(); };
    if ($("extAcerta")) $("extAcerta").onclick = async () => {
      const patch = { fechamento: dFech || Number(k.fechamento), vencimento: dVenc || Number(k.vencimento) };
      if (await grava(() => S.store.updateCartao(k.id, patch))) { Object.assign(k, patch); est.mes = ""; est.itens.forEach((it) => (it.marcado = null)); render(); monta(); }
    };
    if (!vis.length) return;
    const conta = () => {
      const sel = vis.filter((x) => ligado(x.it)).map((x) => x.it);
      $("extSoma").textContent = `${plural(sel.length, "compra marcada", "compras marcadas")} · ${brl(soma(sel))}`;
      $("extSalvar").textContent = sel.length ? `Lançar ${plural(sel.length, "compra", "compras")}` : "Lançar"; $("extSalvar").disabled = !sel.length;
      $("extTodas").textContent = sel.length === vis.length ? "Desmarcar todas" : "Marcar todas";
    };
    $("dlgBody").querySelectorAll("[data-i]").forEach((b) => (b.onchange = () => { est.itens[Number(b.dataset.i)].marcado = b.checked; conta(); }));
    $("dlgBody").querySelectorAll("[data-c]").forEach((b) => (b.onchange = () => { est.itens[Number(b.dataset.c)].cat = b.value; }));
    $("extTodas").onclick = () => { const tudo = vis.every((x) => ligado(x.it)); vis.forEach((x) => (x.it.marcado = !tudo)); $("dlgBody").querySelectorAll("[data-i]").forEach((b) => (b.checked = !tudo)); conta(); };
    conta();

    $("extForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const sel = vis.filter((x) => ligado(x.it)).map((x) => x.it); if (!sel.length) return;
      // A compra é lançada no cartão, com a data que a faz cair na fatura escolhida. Parcela entra só com o valor deste mês.
      const linhas = sel.map((it) => ({ data: est.mes === "datas" ? it.data : dataNaFatura(k, est.mes, it.data), descricao: it.descricao + (it.de > 1 ? ` (${it.parcela}/${it.de})` : ""),
        tipo: "Despesa", categoria: it.cat, forma: CARTAO, valor: it.valor, cartao_id: k.id, parcelas: 1, import_key: it.chave }));
      $("extSalvar").disabled = true; $("extSalvar").textContent = "Lançando…";
      let novos; const ok = await grava(async () => { novos = await S.store.addLancamentos(linhas); });
      if (!ok) { $("extSalvar").disabled = false; conta(); return; }
      S.data.lancamentos.push(...novos);
      const m = est.mes === "datas" ? linhas.map((l) => mesDaFatura(k, l.data)).sort().pop() : est.mes;
      S.mes = m; S.view = "listas"; S.tab = "c";
      $("dlg").close(); fecharLancar(); render();
      const f = faturasDoMes(S.data, m).find((x) => x.auto && x.cartao_id === k.id);
      toastOuFlash(`${plural(novos.length, "compra lançada", "compras lançadas")} no ${k.nome}.${f ? ` Fatura de ${nomeMes(m)}: ${brl(f.valor)}${f.valor_fixo ? ` (valor corrigido à mão; a soma das compras é ${brl(f.calculado)})` : ""}.` : ""}`);
    });
  };
  monta();
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
  /** Pede um envio na hora ao servidor (aviso de teste ou o resumo da semana) e conta o que saiu. */
  const pedeEnvio = async (botao, teste, diz, esperando) => {
    botao.disabled = true; diz(esperando);
    try {
      const r = await fetch(AVISOS_URL, { method: "POST", headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + (await S.store.token()) }, body: JSON.stringify({ teste }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.erro === "Pedido não reconhecido." ? "O servidor de avisos ainda está na versão antiga. Tente de novo mais tarde." : j.erro || "O servidor de avisos ainda não está no ar.");
      const email = j.email === "enviado" ? "E-mail enviado (olhe também o spam)." : j.email === "desligado" ? "E-mail desligado." : j.email === "não configurado" ? "E-mail ainda não configurado no servidor." : "O e-mail não saiu: " + j.email;
      const push = j.push.aparelhos ? `Notificação enviada para ${j.push.entregues} de ${j.push.aparelhos} ${j.push.aparelhos === 1 ? "aparelho" : "aparelhos"}.` : "Nenhum aparelho com notificação ligada.";
      diz(`${email} ${push}`, /não saiu/.test(email));
    } catch (err) { diz(/fetch|network/i.test(String(err?.message)) ? "Não consegui falar com o servidor de avisos. Confira a internet." : String(err?.message || err), true); }
    botao.disabled = false;
  };
  $("ajTeste").onclick = () => pedeEnvio($("ajTeste"), true, msg, "Enviando o aviso de teste…");
  // Resumo da semana (domingo à noite) e lembrete do fim do dia.
  const msgR = (t, erro = false) => { $("ajResumoMsg").textContent = t; $("ajResumoMsg").style.color = erro ? "var(--bad)" : ""; };
  $("ajSemana").onchange = async (e) => { S.prefs.avisos = { ...S.prefs.avisos, semana: e.target.checked }; await salvaPrefs(); msgR(e.target.checked ? "Resumo ligado. O próximo chega no domingo à noite." : "Resumo desligado."); };
  $("ajNoite").onchange = async (e) => {
    const cx = e.target; S.prefs.avisos = { ...S.prefs.avisos, noite: cx.checked }; await salvaPrefs();
    if (!cx.checked) return msgR("Lembrete desligado.");
    // O lembrete só chega por notificação: se este aparelho ainda não tem, liga agora.
    const sub = await Promise.race([inscricaoPush().catch(() => null), new Promise((r) => setTimeout(() => r(null), 2500))]);
    if (sub && Notification.permission === "granted") return msgR("Lembrete ligado. Às 20h, só nos dias sem nenhuma anotação.");
    if (!pushDisponivel()) return msgR("Lembrete ligado, mas este aparelho ainda não recebe notificação: ela só funciona com o app instalado.", true);
    cx.disabled = true;
    try { await ligarPush(); $("ajPush").checked = true; msgR("Lembrete ligado, e a notificação deste aparelho também."); }
    catch (err) { msgR("Lembrete ligado, mas a notificação deste aparelho não: " + String(err?.message || err), true); }
    cx.disabled = false;
  };
  $("ajVerSemana").onclick = () => pedeEnvio($("ajVerSemana"), "semana", msgR, "Montando o resumo desta semana…");
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

/* ================= primeiros passos =================
   Conta nova: três perguntas (quanto recebe, contas de todo mês, cartão) e, no fim, o "quanto sobra" já calculado.
   O que ficar para depois aparece na lista "Comece por aqui", no início, até a pessoa resolver ou dispensar. */
const GUIA_PASSOS = ["renda", "contas", "cartao"];
const guiaDe = () => (S.prefs.guia ||= { fechado: false, semRenda: false, semCartao: false });
const mesAtual = () => mKey(hoje());
const escolheCat = (tipo, palpite) => { const l = cats(tipo); return l.includes(palpite) ? palpite : l.includes("Outros") ? "Outros" : l[0]; };
const guiaVisivel = () => S.loaded && !guiaDe().fechado && !primeirosPassos(S.data, guiaDe()).completo;
const lista3 = (nomes) => nomes.slice(0, 3).join(", ") + (nomes.length > 3 ? ` e mais ${nomes.length - 3}` : "");

/** Lista "Comece por aqui", no início: o que já foi feito e o que falta. Some quando tudo está resolvido. */
function renderGuia() {
  const host = $("guia");
  if (!guiaVisivel()) { host.hidden = true; host.innerHTML = ""; return; }
  const g = guiaDe(), p = primeirosPassos(S.data, g), feito = Object.fromEntries(p.itens.map((i) => [i.k, i.feito]));
  const nomes = (tipo) => S.data.fixos.filter((f) => (f.tipo || "Despesa") === tipo).map((f) => f.descricao);
  const ITENS = [
    ["renda", "Quanto você recebe", "Salário e outras entradas fixas. É daqui que sai o quanto sobra.", nomes("Receita").length ? lista3(nomes("Receita")) : g.semRenda ? "Você lança as entradas quando elas chegam" : "Entrada lançada"],
    ["contas", "Suas contas de todo mês", "Aluguel, luz, internet. Você cadastra uma vez e elas entram sozinhas.", lista3(nomes("Despesa"))],
    ["cartao", "Seu cartão de crédito", "Com o dia em que a fatura fecha e o dia em que vence, o app monta a fatura.", S.data.cartoes.length ? lista3(S.data.cartoes.map((k) => k.nome)) : g.semCartao ? "Você não usa cartão" : "Fatura lançada à mão"],
    ["gasto", "Seu primeiro gasto", "Anote um gasto de hoje. Leva dez segundos.", "Feito"],
  ];
  host.hidden = false;
  host.innerHTML = `<div class="guia">
    <div class="guia-topo"><div><b>Comece por aqui</b><span>${p.feitos} de ${p.total} feitos. Com eles, o app mostra quanto sobra no seu mês.</span></div><button class="link" type="button" id="guiaFechar">Dispensar</button></div>
    <div class="guia-barra" role="img" aria-label="${p.feitos} de ${p.total} passos feitos"><i style="width:${(p.feitos / p.total) * 100}%"></i></div>
    <ul>${ITENS.map(([k, titulo, falta, pronto]) => feito[k]
      ? `<li><div class="gi feito"><span class="m">${ico("ok")}</span><span class="tx"><b>${titulo}</b><span>${esc(pronto)}</span></span></div></li>`
      : `<li><button type="button" class="gi" data-guia="${k}"><span class="m"></span><span class="tx"><b>${titulo}</b><span>${falta}</span></span>${ico("chev")}</button></li>`).join("")}</ul></div>`;
  host.querySelectorAll("[data-guia]").forEach((b) => (b.onclick = () => (b.dataset.guia === "gasto" ? guiaLancar() : guiaPasso(b.dataset.guia))));
  $("guiaFechar").onclick = () => { guiaDe().fechado = true; salvaPrefs(); render(); toast("Lista escondida. Para ver de novo: Ajustes, Refazer os primeiros passos."); };
}
/** Abre o formulário de lançar já no tipo Gasto. */
function guiaLancar() {
  S.tipo = "Despesa"; S.view = "inicio"; render();
  if (noCelular()) abrirLancar(); else { $("fValor").scrollIntoView({ block: "center" }); $("fValor").focus(); }
}
/** Depois de um passo: vai para o próximo que falta (ou para todos, no primeiro uso) e, no fim, mostra o resultado. */
function guiaProximo(k, todos) {
  const p = primeirosPassos(S.data, guiaDe());
  const prox = GUIA_PASSOS.slice(GUIA_PASSOS.indexOf(k) + 1).find((x) => todos || !p.itens.find((i) => i.k === x).feito);
  if (prox) guiaPasso(prox, todos); else guiaFim();
}

/**
 * Um passo do guia, dentro do quadro de diálogo.
 * @param {"renda"|"contas"|"cartao"} k
 * @param {boolean} todos  true no primeiro uso: passa pelas três perguntas, mesmo as já respondidas
 */
function guiaPasso(k, todos = false) {
  if (S.mes !== mesAtual()) { S.mes = mesAtual(); render(); }
  const etapa = `<p class="guia-etapa">Passo ${GUIA_PASSOS.indexOf(k) + 1} de ${GUIA_PASSOS.length}</p>`;
  // Em todo passo: quem quer só anotar um gasto pula tudo e já lança (os passos ficam em "Comece por aqui").
  const depois = `<div class="guia-pular"><button class="btn" type="button" data-ja-lancar>Pular e lançar um gasto agora</button><button class="link gdepois" type="button" data-close>Fazer depois</button></div>`;
  const erro = (t) => { $("gMsg").textContent = t; };

  if (k === "cartao") {
    const ja = S.data.cartoes;
    openDlg(`<div class="guiad">${etapa}<h3>Você usa cartão de crédito?</h3>
      <p class="gsub">Diga o dia em que a fatura fecha e o dia em que vence. Com isso, cada compra entra sozinha na fatura certa, com as parcelas.</p>
      ${ja.length ? `<p class="gja">Já cadastrado: ${esc(lista3(ja.map((x) => x.nome)))}.</p>` : ""}
      <form id="gForm" autocomplete="off">
        <div class="dlg-form">
          <label class="f wide">Nome do cartão<input class="in" id="gkNome" maxlength="40" placeholder="Ex.: Nubank"></label>
          <label class="f">Dia que a fatura fecha<input class="in" id="gkFech" type="number" inputmode="numeric" min="1" max="31" placeholder="Ex.: 3"></label>
          <label class="f">Dia que a fatura vence<input class="in" id="gkVenc" type="number" inputmode="numeric" min="1" max="31" placeholder="Ex.: 10"></label>
        </div>
        <p class="hint" style="margin:10px 0 0">As duas datas estão na fatura ou no aplicativo do banco. Se não tiver agora, toque em Fazer depois.</p>
        <p class="gmsg" id="gMsg" role="alert"></p>
        <div class="actions"><button class="btn primary" type="submit">${ja.length ? "Continuar" : "Cadastrar cartão"}</button><button class="btn" type="button" id="gAlt">${ja.length ? "Pular" : "Não uso cartão"}</button></div>
        ${depois}
      </form></div>`);
    $("gAlt").onclick = () => { if (!ja.length) { guiaDe().semCartao = true; salvaPrefs(); render(); } guiaProximo(k, todos); };
    $("gForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const nome = $("gkNome").value.trim(), dia = (id) => Math.min(31, Math.max(0, Math.round(Number($(id).value)) || 0)), fe = dia("gkFech"), ve = dia("gkVenc");
      if (!nome && !fe && !ve && ja.length) return guiaProximo(k, todos);
      if (!nome || !fe || !ve) return erro(ja.length ? "Para cadastrar outro cartão, preencha o nome e os dois dias." : "Preencha o nome e os dois dias, ou toque em Não uso cartão.");
      if (S.data.cartoes.some((x) => norm(x.nome) === norm(nome))) return erro(`Já existe um cartão chamado ${nome}.`);
      const bt = e.target.querySelector("[type=submit]"); bt.disabled = true;
      const ok = await grava(async () => { const novo = await S.store.addCartao({ nome, fechamento: fe, vencimento: ve }); S.data.cartoes.push(novo); await adotarFaturasManuais(novo); });
      render(); if (ok) guiaProximo(k, todos); else $("dlg").close();
    });
    return;
  }

  const ent = k === "renda", tipo = ent ? "Receita" : "Despesa", diaPadrao = ent ? 5 : 10;
  const ja = S.data.fixos.filter((f) => (f.tipo || "Despesa") === tipo), tem = new Set(ja.map((f) => norm(f.descricao)));
  // [como aparece na tela, nome que fica salvo, categoria]
  const base = (ent ? [["Salário", "Salário", "Salário"], ["Adiantamento ou vale, se tiver", "Adiantamento", "Adiantamento"]]
    : [["Aluguel", "Aluguel", "Moradia"], ["Condomínio", "Condomínio", "Moradia"], ["Luz", "Luz", "Contas da casa"], ["Água", "Água", "Contas da casa"], ["Internet", "Internet", "Contas da casa"], ["Celular", "Celular", "Contas da casa"]])
    .filter(([, nome]) => !tem.has(norm(nome)));
  const campos = (nome) => `<input class="in money" data-v inputmode="decimal" placeholder="0,00" aria-label="Valor de ${esc(nome)}"><input class="in" data-d type="number" inputmode="numeric" min="1" max="31" placeholder="${diaPadrao}" aria-label="Dia ${ent ? "em que recebe" : "do vencimento de"} ${esc(nome)}">`;
  const livre = () => `<div class="glin"><input class="in" data-n maxlength="40" placeholder="${ent ? "Ex.: Pensão" : "Ex.: Academia"}" aria-label="${ent ? "Nome da entrada" : "Nome da conta"}">${campos(ent ? "outra entrada" : "outra conta")}</div>`;
  openDlg(`<div class="guiad">${etapa}<h3>${ent ? "Quanto você recebe por mês?" : "Quais contas você paga todo mês?"}</h3>
    <p class="gsub">${ent ? `${todos && !ja.length ? "São três perguntas rápidas. No fim, o app já mostra quanto sobra no seu mês. " : ""}Digite o valor que cai na conta e o dia em que você recebe.`
      : "Preencha só as que você tem, com o valor de um mês normal. Elas passam a entrar sozinhas em todo mês."}</p>
    ${ja.length ? `<p class="gja">Já cadastrado: ${esc(lista3(ja.map((f) => f.descricao)))}. Para mudar um valor, use a aba ${ent ? "Entradas fixas" : "Gastos fixos"}.</p>` : ""}
    <form id="gForm" autocomplete="off">
      <div class="glinhas" id="gLinhas">
        <div class="gcab"><span>${ent ? "Entrada" : "Conta"}</span><span>Valor por mês</span><span>${ent ? "Dia" : "Vence dia"}</span></div>
        ${base.map(([rot, nome, cat]) => `<div class="glin" data-nome="${esc(nome)}" data-cat="${esc(cat)}"><span class="gn">${esc(rot)}</span>${campos(nome)}</div>`).join("")}
        ${base.length ? "" : livre()}
      </div>
      <button class="link gmais" type="button" id="gMais">+ ${ent ? "Outra entrada" : "Outra conta (assinatura, escola, academia, parcela)"}</button>
      <p class="hint" style="margin:10px 0 0">Sem o dia, o app usa o dia ${diaPadrao}. Dá para mudar depois.</p>
      <p class="gmsg" id="gMsg" role="alert"></p>
      <div class="actions"><button class="btn primary" type="submit">Continuar</button><button class="btn" type="button" id="gAlt">${ent && !ja.length ? "Minha renda varia" : "Pular"}</button></div>
      ${depois}
    </form></div>`);
  $("gMais").onclick = () => { $("gLinhas").insertAdjacentHTML("beforeend", livre()); $("gLinhas").lastElementChild.querySelector("[data-n]").focus(); };
  $("gAlt").onclick = () => { if (ent && !ja.length) { guiaDe().semRenda = true; salvaPrefs(); render(); } guiaProximo(k, todos); };
  $("gForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const linhas = [...$("gLinhas").querySelectorAll(".glin")].map((el) => {
      const campoNome = el.querySelector("[data-n]"), nome = (campoNome ? campoNome.value.trim() : el.dataset.nome) || (ent ? "Outra entrada" : "Outra conta");
      return { nome, valor: round2(parseMoney(el.querySelector("[data-v]").value) || 0), dia: Math.min(31, Math.max(1, Math.round(Number(el.querySelector("[data-d]").value)) || diaPadrao)),
        cat: escolheCat(tipo, el.dataset.cat || (ent ? "Renda extra" : guessCat(nome, "Despesa"))) };
    }).filter((l) => l.valor > 0);
    if (!linhas.length) {
      if (ja.length) return guiaProximo(k, todos);
      return erro(ent ? "Digite quanto você recebe, ou toque em Minha renda varia." : "Preencha o valor de pelo menos uma conta, ou toque em Pular.");
    }
    const bt = e.target.querySelector("[type=submit]"); bt.disabled = true;
    const ok = await grava(async () => {
      for (const l of linhas) S.data.fixos.push(await S.store.addFixo({ tipo, descricao: l.nome, categoria: l.cat, dia: l.dia, valor: l.valor, forma: ent ? "" : "Pix", desde: mesAtual() + "-01", ate: null }));
    });
    render(); if (ok) guiaProximo(k, todos); else $("dlg").close();
  });
  setTimeout(() => $("gLinhas").querySelector("input")?.focus(), 60);
}

/** Fim do guia: o mês da pessoa, já com o que ela cadastrou. */
function guiaFim() {
  const c = calcMes(S.data, mesAtual(), hoje()), livre = livrePorDia(c), p = primeirosPassos(S.data, guiaDe());
  const saem = round2(c.rec - c.saldo), soFixos = !c.vari && !c.fatT && !c.res, nada = !c.rec && !saem && !S.data.cartoes.length;
  const falta = p.itens.filter((i) => !i.feito && i.k !== "gasto").length, temGasto = p.itens.find((i) => i.k === "gasto").feito;
  const frase = nada ? "Você deixou as perguntas para depois. Elas ficam na lista Comece por aqui, na tela inicial."
    : !c.rec ? "Falta dizer quanto entra para o app calcular quanto sobra. Quando receber, lance em Lançar, Entrada."
    : c.saldo > 0 ? `Dá ${brl(livre.valor)} por dia até o fim de ${nomeMes(mesAtual())}. Cada gasto que você anotar é descontado daqui, na hora.`
    : "As contas já passam do que entra neste mês. O app vai mostrar para onde o dinheiro está indo.";
  openDlg(`<div class="guiad"><h3>${nada ? "Tudo certo, fica para depois" : c.rec ? "Pronto. Este é o seu mês." : "Anotado. Falta só a sua renda."}</h3>
    ${nada ? "" : `<div class="gfim">
      ${c.rec ? `<div><span>Entram</span><b>${brl(c.rec)}</b></div>` : ""}
      <div><span>${soFixos ? "Contas de todo mês" : "Saídas do mês"}</span><b>${brl(saem)}</b></div>
      ${c.rec ? `<div class="tot${c.saldo < 0 ? " neg" : ""}"><span>${c.saldo < 0 ? "Faltam" : "Sobram"} em ${nomeMes(mesAtual())}</span><b>${brl(Math.abs(c.saldo))}</b></div>` : ""}</div>`}
    <p class="gsub">${frase}${!nada && falta ? " O que ficou para depois está na lista Comece por aqui, na tela inicial." : ""}</p>
    ${suporteHtml()}
    <div class="actions">${temGasto ? `<button class="btn primary" data-close>Ver meu mês</button>` : `<button class="btn primary" type="button" id="gLancar">Lançar meu primeiro gasto</button><button class="btn" data-close>Ver meu mês</button>`}</div></div>`);
  if ($("gLancar")) $("gLancar").onclick = () => { $("dlg").close(); guiaLancar(); };
  $("dlg").addEventListener("close", conviteAvisos, { once: true });
}
$("btnAjustes").onclick = ajustes;

/* ================= PWA ================= */
let installEvt = null;
addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installEvt = e; if (S.loaded) renderInstalar(); });
addEventListener("appinstalled", () => { installEvt = null; if (S.loaded) render(); toast("Pronto! O Meus Gastos está instalado. Procure o ícone na tela inicial ou na lista de apps."); });
$("btnInstall").hidden = appInstalado();
$("btnInstall").onclick = () => instalarApp();
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
  // O app abre com a cópia guardada (sw.js). Quando uma versão nova termina de baixar, a pessoa escolhe a hora de atualizar:
  // nada recarrega sozinho no meio de um lançamento.
  const tinhaVersao = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!tinhaVersao) return;   // primeira instalação: a tela já é a mais nova
    toastAcao("Tem uma versão nova do app.", "Atualizar", () => location.reload(), 0);
  });
  // Tocou numa notificação com o app já aberto: o lembrete do fim do dia leva direto para o lançamento.
  navigator.serviceWorker.addEventListener("message", (e) => {
    if (e.data?.tipo !== "notificacao" || !/[?&]atalho=lancar\b/.test(String(e.data.url || ""))) return;
    if (S.loaded && S.store && !$("app").hidden && !document.querySelector("dialog[open]")) { S.atalho = "lancar"; aoChegar(); }
  });
}

addEventListener("load", boot);
