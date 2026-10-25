// Tela do app: entrada, lançamento rápido, indicadores, gráficos e abas.
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPORTE_CONTATO, LINK_COMPRA, PRECO_PLANO, PLAY_PACOTE, APP_VERSAO, IMPORTA_EXTRATO } from "./config.js";
import { CATS_PADRAO, RETIRADA, JA_TINHA, FORMAS, MESES, MES3, pad, toISO, mKey, addM, parseMoney, round2, VALOR_MAX, calcMes, catMap, custoAcumulado,
  categoriasIniciais, primeiroMes, saldoAnterior, contasQueNaoFecham, quandoOsDinheiroAcaba, podeGastarHoje, oQueFazerAgora, gastoAVistaDoDia, semEntradaNoMes, itensDoCusto, reservaAcumulada, guardadoPorDestino, comprasCartaoPorCategoria, proximosVencimentos, avisosDeHoje, CARTAO, DIAS_SEMANA, DIAS3, diaDaSemana,
  faturasAte, faturasDoMes, raioX, livrePorDia, sequenciaDeDias, gastoDoDia, comparaComMesAnterior, usoDosLimites, usoDoTeto, primeirosPassos, semCartaoNoMes, novaVersaoDeFixo, saldoAcumulado, contasEmAtraso, planoDoMes, faturasSemValor, mesDaFatura, valorDasParcelas, periodoDaFatura,
  andamentoDaMeta, metasEmAndamento, sugestaoDaMeta, situacaoDaMeta, metasAGuardarNoMes, combinadosDoMes , buscaLancamentos, maisUsados, categoriaAprendida, ultimoParecido, descricoesParecidas, ultimosMeses, comparaCategorias , calendarioDoMes, estadoDoMes, sobraDoMes, sobraDiaADia, mesDaVez, lancamentoRepetido, fixoRepetido, repetidosDoMes, chaveDoPar,
  comumDoCasal, juntaPrefsDoCasal, apelidoDoEmail, divisaoDoMes, ocorrencias, vezesNoPrazo, restanteDoPrazo, prazosEmAndamento, valorForaDoComum, formaMaisUsada, assinaturasDetectadas, paraRevisar, estadoDoLimite, iconeDaCategoria, ICONES_CATEGORIA, dependentesDoCartao } from "./calc.js";
import { createSupabaseStore, createLocalStore, demoSeed, comFila, semRede, comPrazo } from "./store.js";
import { buildWorkbook, norm, guessCat } from "./excel.js";
import { lerImagem, lerPdf, textoDoPdf, ehPdf, interpretaTexto } from "./leitor.js";
import { ehExtratoDeContaPdf, leExtratoDeContaPdf, ehExtratoNubankPdf, leExtratoNubankPdf, documentoDeVariasLinhas, leFaturaPdf } from "./extratopdf.js";
import { saldosDoCasal } from "./casalvisao.js";
import { paraOndeFoi, nomeDoMes, metaSugerida, limiteViavel } from "./paraondefoi.js";
import { entreMinhasContas, pixComoCartao, gruposEmOutros, nomeDoLancamento, movimentosJaLancados, repetidosDeImportacao, movimentosDeContasFixas, contasQueSeRepetem, proximasRepetidas } from "./arrumar.js";
import { entendeFala } from "./voz.js";
import { NOVIDADES } from "./novidades.js";
import { ganhoContraGasto } from "./ganhogasto.js";
import { ligaCapturaDeErros } from "./erros.js";
import { linhaDaSemana } from "./semana.js";
import { valorDaHora, horasDeTrabalho, regraDeAceite, msAndamento, APPS, TIPOS_GASTO, MAX_TURNOS, isoLocal, ganhoDoTurno, somaValores, duracaoMs, relogio, horasCurtas, custoVariavelPorKm, custoTotalPorKm, resumoTurnos, kmPorDia, metaDoDia, ritmoAoVivo, ganhosPorDia, ganhoPorApp, melhorDiaDaSemana, ritmoHistorico, alcanceDaMeta, kmRealPorMes } from "./motorista.js";
import { desempenhoDoMes, rendimentoDeGuardar, quantoGuardarPorMes, parcelaComJuros, jurosCompostos, ferias, decimoTerceiro, MODOS_DESAFIO, criaDesafio, valorDaSemana, totalDoDesafio, andamentoDoDesafio,
  resumoDoAno, MOEDAS, valorEmReais, textoDaMoeda, entendeMensagemBanco, csvDoAno, relatorioEmLinhas, pdfDeLinhas, SEP, nomeDeSub, agrupaPorPai,
  avaliaConta, revisaoDoMes, custoDoVeiculo, custoDaCasa, pesoDaCasa, dicaDoDia, chaveDoItem, itemNaLista, precoDoItem, agrupaPorCorredor, registraPrecos, variacaoDoPreco, itensParaRepetir, resumoDaCompra, estimativaDaLista, ticketMedioMercado, juntaLista, compraDoCarrinho, textoDaLista, buscaDeFuncoes, filtraLancamentos, conquistas, novasConquistas, acertoDoCasal, rolagemDosLimites, conferirDivisao, montaBackup, leBackup, faltaRestaurar, ajustesRestauraveis, linhasDoMes, linhasDoCartao, csvDoMes, csvDoCartao, CAB_EXTRATO, CAB_CARTAO, extratoDoMesEmLinhas, cartaoEmLinhas } from "./extras.js";
import { interpretaQr, criaLeitorDeCodigos, codigosDaImagem, leituraDaNota, itensEmTexto } from "./qr.js";
import { leExtrato, decodifica, ehExtrato, ehPlanilha, faturaProvavel, dataNaFatura, comChaves, separaCsv } from "./extrato.js";
import { pareceConta, leConta, arrumaNome, nomeDoEmail, CATEGORIA_PIX_PESSOA, CATEGORIA_CASAL } from "./conta.js";
import { criaEscuta, mensagemDeErro } from "./escuta.js";

const $ = (id) => document.getElementById(id);
const NS = "http://www.w3.org/2000/svg";
const brl = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const brl0 = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
const sgn = (v) => (v < 0 ? "−\u00a0" : "") + brl(Math.abs(v));   // espaço que não quebra: o sinal nunca fica sozinho no fim da linha
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ddmm = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const ddmmaa = (iso) => `${ddmm(iso)}/${iso.slice(2, 4)}`;
const hoje = () => toISO(new Date());
const nomeMes = (m) => MESES[Number(m.slice(5)) - 1];

/* Ícones: desenhados em linha, herdam a cor do texto. */
const ICO = {
  grafico: "M4 20h16M7 16v-5M12 16V6M17 16v-8",
  camera: "M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
  imagem: "M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM3.5 17l5-5 4 4 3-3 5 5M15.5 9.5h.01",
  clipe: "M21.4 11.1l-9.2 9.2a5 5 0 0 1-7.1-7.1l9.2-9.2a3.5 3.5 0 0 1 4.9 4.9l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5",
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
  carrinho: "M3 4h2l2.2 10.2a1.5 1.5 0 0 0 1.5 1.2h8.2a1.5 1.5 0 0 0 1.5-1.1L20 8H6M9 20h.01M17 20h.01",
  casa: "M3 11l9-8 9 8M5 10v10h14V10M10 20v-6h4v6",
  calc: "M6 3h12v18H6zM9 7h6M9 12h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01",
  sol: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  presente: "M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7c-2 0-4-1-4-3s3-2 4 3c1-5 4-5 4-3s-2 3-4 3",
  carro: "M5 16v3M19 16v3M3 16h18v-4l-2-5H5l-2 5zM3 12h18M7.5 14h.01M16.5 14h.01",
  medalha: "M8 3h8l-1.5 6h-5zM12 21a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 13v3",
  alvo: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01",
  ideia: "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z",
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
// Os desenhos das categorias (a pessoa escolhe um para cada em Ajustes). Os nomes ficam em ICONES_CATEGORIA, no calc.js.
Object.assign(ICO, {
  talher: "M6 3v6a2 2 0 0 0 4 0V3M8 11v10M16 21V3c-2.5 2-3 5-3 8h3",
  raio: "M13 2L4 14h7l-1 8 9-12h-7z",
  capelo: "M2 9l10-5 10 5-10 5zM6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5",
  saude: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 8v8M8 12h8",
  tesoura: "M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM7 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM9.5 7L20 18M9.5 17L20 6",
  tv: "M3 7h18v12H3zM8 3l4 4 4-4",
  musica: "M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
  camiseta: "M8 3L3 6l2 4 3-1v12h8V9l3 1 2-4-5-3a4 4 0 0 1-8 0z",
  aviao: "M3 12l18-8-6 17-3-7z",
  livro: "M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11",
  sacola: "M5 8h14l-1 13H6zM9 8V6a3 3 0 0 1 6 0v2",
  ferramenta: "M15 4a5 5 0 0 0-4.5 6.8L3 18.3 5.7 21l7.5-7.5A5 5 0 0 0 20 9l-3 3-2.5-.5L14 9l3-3z",
  bola: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18",
  pontos: "M5 12h.01M12 12h.01M19 12h.01",
});
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
  return `<span class="ava" style="--c:${c};--cs:${suave(c)}" aria-hidden="true">${ico(iconeDaCategoria(nome, S.prefs.iconesCat))}</span>`;
}

const S = {
  mes: mKey(hoje()), tipo: "Despesa", tab: "l", view: "inicio",   // view só vale no celular: "inicio" ou "listas"
  data: { lancamentos: [], fixos: [], pagos: [], faturas: [], cartoes: [] },
  store: null, client: null, loaded: false,
  prefs: prefsPadrao(),
};
function prefsPadrao() { return { categorias: null, levarSaldo: true, saldoDesde: null, mesesVirados: [], saldoInicial: 0, boasVindas: false, avisos: { email: true }, limites: {}, semGasto: [], teto: 0, metas: {}, guia: { fechado: false, semRenda: false, semCartao: false } }; }
/** Categorias disponíveis para um tipo: as da pessoa, ou as padrão. */
function cats(tipo) {
  return S.prefs.categorias?.[tipo]?.length ? S.prefs.categorias[tipo] : CATS_PADRAO[tipo];
}
const noCelular = () => matchMedia("(max-width:700px)").matches;
/* Preferências (metas, limites, categorias, fotos, ajustes): a tela muda na hora e o envio vai por trás, em fila,
   para dois toques seguidos não chegarem fora de ordem. Antes a tela esperava a internet a cada mudança — com sinal
   fraco parecia que "não atualizava". Uma cópia fica no aparelho e vale se for mais nova que a do servidor (store.js). */
let filaPrefs = Promise.resolve(true), prefsPendente = false;
const salvaPrefs = () => {
  const vez = filaPrefs.then(async () => {
    try { await comPrazo(S.store.savePrefs(S.prefs), 15000); await comPrazo(Promise.resolve(salvaCasal()), 15000); prefsPendente = false; return true; }
    catch (e) {
      // Sem conexão: a mudança já está guardada no aparelho e vai assim que a internet voltar. Não precisa assustar ninguém.
      if (semRede(e)) { prefsPendente = true; return false; }
      return grava(() => { throw e; }, { aviso: false });   // recusa do banco: aí sim o aviso aparece
    }
  });
  filaPrefs = vez.catch(() => false);
  return Promise.resolve(true);
};
addEventListener("online", () => { if (prefsPendente && S.loaded) salvaPrefs(); });
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
/** O valor do campo de valor: se a pessoa digitou uma conta (12+8,50), o resultado; senão o número de sempre. */
const valorDoCampo = () => { const r = avaliaConta($("fValor").value); return r !== null ? r : parseMoney($("fValor").value); };
const MOVS = ["Guardar", "Retirar", "Já tinha guardado"];
const formaDe = (tipo, v) => (tipo === "Despesa" ? v : tipo === "Reserva" && v === "Retirar" ? RETIRADA : tipo === "Reserva" && v === "Já tinha guardado" ? JA_TINHA : "");
/** O movimento como aparece no seletor, a partir da forma gravada. */
const movDe = (forma) => (forma === RETIRADA ? "Retirar" : forma === JA_TINHA ? "Já tinha guardado" : "Guardar");
const opts = (lista, atual) => lista.map((c) => `<option${c === atual ? " selected" : ""}>${esc(c)}</option>`).join("");
/* "+ Nova caixinha…" / "+ Nova categoria…" no fim da lista: a pessoa dá o nome que quiser ali mesmo, sem ir em Ajustes. */
const NOVA_CAT = "__nova__";
const optNova = (tipo) => `<option value="${NOVA_CAT}">${tipo === "Reserva" ? "+ Nova caixinha…" : "+ Nova categoria…"}</option>`;
/** Liga a opção "nova" a um seletor de categoria. tipo() diz se é gasto, entrada ou guardado; sugestao() dá um nome para começar (a descrição). */
function ligaNovaCategoria(sel, tipo, sugestao, criada) {
  let antes = sel.value === NOVA_CAT ? "" : sel.value;
  sel.addEventListener("focus", () => { if (sel.value !== NOVA_CAT) antes = sel.value; });
  sel.addEventListener("change", (e) => {
    if (sel.value !== NOVA_CAT) { antes = sel.value; return; }
    e.stopImmediatePropagation();
    sel.value = antes || sel.options[0]?.value || "";
    const lbl = sel.closest("label") || sel, t = tipo(), caixa = t === "Reserva";
    lbl.parentElement.querySelector(".nova-cat")?.remove();
    const box = document.createElement("div");
    box.className = "nova-cat"; box.style.gridColumn = "1/-1";
    const paiSel = t === "Despesa" ? cats(t).filter((c) => !c.includes(SEP)) : [];
    box.innerHTML = `<label class="f">${caixa ? "Nome da nova caixinha" : "Nome da nova categoria"}<input class="in" maxlength="40" placeholder="${caixa ? "Ex.: Viagem, Carro, Feitura" : "Ex.: Academia, Pet"}"></label>
      ${paiSel.length ? `<label class="f">Dentro de (opcional)<select class="in" data-pai><option value="">Nenhuma: categoria própria</option>${paiSel.map((c) => `<option>${esc(c)}</option>`).join("")}</select></label>` : ""}
      <div class="actions"><button class="btn primary sm" type="button" data-nc="ok">${caixa ? "Criar caixinha" : "Criar categoria"}</button><button class="btn sm" type="button" data-nc="nao">Cancelar</button></div>
      <p class="hint" role="status" style="margin:0"></p>`;
    lbl.after(box);
    const inp = box.querySelector("input"), msg = box.querySelector("p"), sug = (sugestao() || "").trim();
    if (sug && !cats(t).some((c) => norm(c) === norm(sug))) inp.value = sug.slice(0, 40);
    inp.focus(); inp.select();
    const cria = async () => {
      let nome = inp.value.trim().replace(/\s+/g, " ");
      if (!nome) { msg.style.color = "var(--bad)"; msg.textContent = "Escreva o nome."; return inp.focus(); }
      const pai = box.querySelector("[data-pai]")?.value; if (pai) nome = nomeDeSub(pai, nome.replace(/^.*›\s*/, ""));
      const l = cats(t), ja = l.find((c) => norm(c) === norm(nome));
      if (!ja) { S.prefs.categorias = { ...(S.prefs.categorias || categoriasIniciais(S.data)), [t]: [...l, nome] }; salvaPrefs(); }
      box.remove(); criada(ja || nome, !ja);
    };
    box.querySelector('[data-nc="ok"]').onclick = cria;
    box.querySelector('[data-nc="nao"]').onclick = () => { box.remove(); sel.focus(); };
    inp.addEventListener("keydown", (k) => { if (k.key === "Enter") { k.preventDefault(); cria(); } if (k.key === "Escape") { k.preventDefault(); k.stopPropagation(); box.remove(); sel.focus(); } });
  });
}
/* Cartões cadastrados: os ativos aparecem para novas compras; os desativados só mantêm as faturas antigas. */
const cartoesAtivos = () => S.data.cartoes.filter((k) => k.ativo !== false);
const cartaoPorId = (id) => S.data.cartoes.find((k) => k.id === id) || null;
const NOVO_CARTAO = "__novo__";
const optsCartao = (atual, vazio = "", comNovo = false) => {
  const l = cartoesAtivos(), fora = atual && atual !== NOVO_CARTAO && !l.some((k) => k.id === atual) ? cartaoPorId(atual) : null;
  const novo = comNovo ? `<option value="${NOVO_CARTAO}"${atual === NOVO_CARTAO || (!l.length && !fora) ? " selected" : ""}>+ Outro cartão (emprestado ou novo)</option>` : "";
  return (vazio ? `<option value="">${esc(vazio)}</option>` : "") + (fora ? [fora, ...l] : l).map((k) => `<option value="${esc(k.id)}"${k.id === atual ? " selected" : ""}>${esc(k.nome)}</option>`).join("") + novo;
};
/** Campos para cadastrar um cartão na hora de lançar (inclusive um cartão emprestado). `p` é o começo dos ids. */
const htmlNovoCartao = (p, grupo = "") => `<div class="novo-cartao wide" id="${p}Novo"${grupo ? ` data-g="${grupo}"` : ""} hidden>
  <label class="f wide">Nome do cartão<input class="in" id="${p}NNome" maxlength="40" placeholder="Ex.: Cartão da minha mãe"></label>
  <label class="f">Dia que a fatura fecha<input class="in" id="${p}NFech" type="number" inputmode="numeric" min="1" max="31" placeholder="Ex.: 3"></label>
  <label class="f">Dia que a fatura vence<input class="in" id="${p}NVenc" type="number" inputmode="numeric" min="1" max="31" placeholder="Ex.: 10"></label>
  <p class="hint wide" style="margin:0;font-size:12.5px">Está usando o cartão de outra pessoa? Escreva de quem é no nome. Os dois dias aparecem na fatura do cartão; se não souber, deixe em branco e ajuste depois em Cartões.</p></div>`;
/** Cadastra o cartão digitado nos campos acima. Devolve { id, padrao } ou { erro }. Cartão com o mesmo nome já ativo é reaproveitado. */
async function criaCartaoRapido(p) {
  const nome = $(p + "NNome").value.trim();
  if (!nome) { $(p + "NNome").focus(); return { erro: "Escreva o nome do cartão (por exemplo, Cartão da minha mãe)." }; }
  const igual = S.data.cartoes.find((k) => norm(k.nome) === norm(nome));
  if (igual) return igual.ativo === false ? { erro: `Já existe um cartão chamado ${nome}, mas ele está desativado. Reative em Cartões ou use outro nome.` } : { id: igual.id, padrao: false };
  const dia = (id, pad) => { const n = Math.round(Number($(id).value)); return n >= 1 && n <= 31 ? n : pad; };
  const fech = dia(p + "NFech", 0), venc = dia(p + "NVenc", 0), padrao = !fech || !venc;
  let novo;
  if (!(await grava(async () => { novo = await S.store.addCartao({ nome, fechamento: fech || 3, vencimento: venc || 10 }); }))) return { erro: "Não consegui cadastrar o cartão agora. Tente de novo." };
  S.data.cartoes.push(novo);
  return { id: novo.id, padrao, nome };
}
const avisoCartaoPadrao = (r) => (r?.padrao ? ` Cartão ${r.nome}: usei fecha dia 3 e vence dia 10. Ajuste em Cartões quando souber.` : "");
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
  if (location.hash === "#demo") { try { sessionStorage.setItem("cg-modo", "demo"); sessionStorage.removeItem("cg-demo-mot"); } catch { /* nada */ } history.replaceState(null, "", location.pathname); }
  // #motorista (anúncio e site para motoristas de aplicativo): abre a demonstração já na tela do Modo motorista, com uma semana de corridas de exemplo.
  else if (location.hash === "#motorista") { try { sessionStorage.setItem("cg-modo", "demo"); sessionStorage.setItem("cg-demo-mot", "1"); } catch { /* nada */ } S.atalho = "motorista"; history.replaceState(null, "", location.pathname); }
  // #criar (botão "Testar 7 dias grátis" do site): abre a tela de entrada já em "Criar conta".
  else if (location.hash === "#criar") { S.querCriar = true; history.replaceState(null, "", location.pathname); }
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
  authModo(modo || (S.querCriar ? "criar" : lembrado || aviso ? "entrar" : "criar"), aviso, aviso ? tipo : ""); S.querCriar = false;
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
  if (LINK_COMPRA) $("aPago").innerHTML = `Teste <b>7 dias grátis</b>, sem cartão. Depois, ${esc(PRECO_PLANO)}. Já comprou? Use aqui o mesmo e-mail da compra. <a href="${esc(LINK_COMPRA)}" target="_blank" rel="noopener">Quero assinar já</a>`;
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
  try { sessionStorage.setItem("cg-destravado", "1"); } catch { /* nada */ }   // quem acabou de digitar a senha não precisa da digital
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
/** A demonstração do Modo motorista: uma semana de corridas já registrada, o carro preenchido e as contas do mês, sem salário fixo. */
function demoMotorista() {
  const base = demoSeed(hoje());
  return (uuid) => {
    const d = base(uuid), desde = d.fixos[0]?.desde || `${hoje().slice(0, 7)}-01`;
    d.fixos = d.fixos.filter((f) => !["Salário", "Faculdade", "Terapia"].includes(f.descricao));
    d.fixos.push({ id: uuid(), tipo: "Despesa", descricao: "Parcela do carro", categoria: "Transporte", dia: 20, valor: 650, forma: "Boleto", desde, ate: null, cartao_id: null });
    d.lancamentos = d.lancamentos.filter((l) => l.tipo === "Despesa" && Number(l.valor) <= 100);
    d.pagos = []; d.faturas = [];
    const turnos = [];
    // [dias atrás, hora que começou, horas rodadas, Uber, 99, km, viagens, combustível, pedágio]
    [[1, 17, 6.5, 148.5, 96, 168, 17, 70, 9.6], [2, 18, 5, 92, 60, 121, 11, 50, 0], [3, 7, 8, 185, 155, 214, 21, 85, 18], [4, 17, 6, 132, 88, 159, 15, 60, 9.6], [6, 18, 7, 176, 94, 188, 18, 75, 0], [7, 16, 5.5, 104, 71, 126, 12, 55, 9.6]]
      .forEach(([k, h, dur, uber, n99, km, viagens, comb, pedagio]) => {
        const t0 = new Date(); t0.setDate(t0.getDate() - k); t0.setHours(h, 0, 0, 0);
        const ini = t0.getTime(), dia = isoLocal(ini), ganho = round2(uber + n99);
        const linha = (descricao, tipo, categoria, forma, valor) => { const l = { id: uuid(), data: dia, descricao, tipo, categoria, forma, valor, import_key: null, cartao_id: null, parcelas: 1 }; d.lancamentos.push(l); return l.id; };
        const rid = linha("Corridas: Uber + 99", "Receita", "Renda extra", "", ganho), cids = [linha("Combustível do turno", "Despesa", "Transporte", "Pix", comb)];
        if (pedagio) cids.push(linha("Pedágio do turno", "Despesa", "Transporte", "Pix", pedagio));
        turnos.push({ id: uuid(), ini, fim: ini + dur * 3600000, apps: { uber, "99": n99 }, gastos: { comb, ...(pedagio ? { pedagio } : {}) }, viagens, km, comb: round2(comb + pedagio), rid, cids });
      });
    d.prefs = { tourVisto: true, motorista: { usa: true, ativo: null, turnos, diasSemana: 6, horasDia: 8, extra: 0 },
      veiculo: { kmMes: 3200, consumo: 13, precoLitro: 6.2, manutAno: 2400, seguroAno: 2400, ipvaAno: 1200, licAno: 180, outrosMes: 120, valor: 40000, desvalPct: 8 } };
    return d;
  };
}
function startDemo() {
  try { sessionStorage.setItem("cg-modo", "demo"); } catch { /* nada */ }
  let mot = false; try { mot = sessionStorage.getItem("cg-demo-mot") === "1"; } catch { /* nada */ }
  const store = mot ? createLocalStore("cg-demo-mot-v1", demoMotorista()) : createLocalStore("cg-demo-v12", demoSeed(hoje()));
  startApp(store, "Demonstração");
  showBanner("Demonstração (dados de exemplo)",
    [...(S.semLogin ? [] : [["Criar conta", contaAPartirDaDemo]]), ["Recomeçar", () => { store.reset(); startDemo(); }]], "fina");
}

/* ================= bloqueio com a digital ou o rosto =================
   Usa o leitor do próprio celular (WebAuthn): o app pede a digital ou o rosto ao abrir e ao voltar depois de 3 minutos fora.
   É um bloqueio da tela, não troca a senha da conta: quem não consegue desbloquear entra de novo com o e-mail e a senha. */
const travaId = () => { try { return localStorage.getItem("cg-trava") || ""; } catch { return ""; } };
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const deB64url = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (ch) => ch.charCodeAt(0));
async function biometriaDisponivel() {
  try { return Boolean(window.PublicKeyCredential) && (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()); } catch { return false; }
}
async function ligaTrava(email) {
  const cred = await navigator.credentials.create({ publicKey: {
    challenge: crypto.getRandomValues(new Uint8Array(32)), rp: { name: "Meus Gastos", id: location.hostname },
    user: { id: crypto.getRandomValues(new Uint8Array(16)), name: email || "meus-gastos", displayName: email || "Meus Gastos" },
    pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
    authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" }, timeout: 60000 } });
  localStorage.setItem("cg-trava", b64url(cred.rawId)); try { sessionStorage.setItem("cg-destravado", "1"); } catch { /* nada */ }
}
function travar() {
  if (!travaId() || S.store?.kind !== "supabase") return;
  try { if (sessionStorage.getItem("cg-destravado") === "1") return; } catch { /* nada */ }
  $("travaMsg").textContent = ""; $("trava").hidden = false; document.body.classList.add("travado");
}
async function destravar() {
  try {
    await navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), rpId: location.hostname,
      allowCredentials: [{ type: "public-key", id: deB64url(travaId()), transports: ["internal"] }], userVerification: "required", timeout: 60000 } });
    try { sessionStorage.setItem("cg-destravado", "1"); } catch { /* nada */ }
    $("trava").hidden = true; document.body.classList.remove("travado");
  } catch { $("travaMsg").textContent = "Não deu certo. Tente de novo ou entre com o e-mail e a senha."; }
}
$("travaAbrir").onclick = destravar;
$("travaSenha").onclick = () => { $("trava").hidden = true; document.body.classList.remove("travado"); $("btnSair").click(); };
let saiuEm = 0;
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") { saiuEm = Date.now(); return; }
  if (saiuEm && Date.now() - saiuEm > 3 * 60 * 1000 && travaId()) { try { sessionStorage.removeItem("cg-destravado"); } catch { /* nada */ } travar(); }
});
async function startApp(store, quem) {
  S.store = store; S.loaded = false; S.acesso = null; S.casal = null; S.quem = "";
  $("auth").hidden = true; $("acesso").hidden = true; $("app").hidden = false; $("bnav").hidden = false;
  $("whoName").textContent = quem;
  $("btnSair").textContent = store.kind === "supabase" ? "Sair" : "Sair da demonstração";
  travar();
  showBanner("");
  render();
  S.prefs = prefsPadrao();
  try {
    S.data = await store.loadAll(); S.data.cartoes ||= [];
    const daCopia = Boolean(S.data.daCopia);
    const p = await store.loadPrefs().catch(() => null);
    S.prefs = { ...prefsPadrao(), ...(p || {}) };
    if (!p && store.kind === "local") {   // exemplo da demonstração: duas metas e um desafio de economia já começado
      const m0 = mKey(hoje());
      S.prefs.metas = { "Reserva de emergência": { valor: 3000, ate: "", plano: { valor: 300, dia: 28 } }, Viagem: { valor: 2500, ate: addM(m0, 8) } };
      const ini = new Date(); ini.setDate(ini.getDate() - 17);
      const d = criaDesafio({ nome: "Desafio da viagem", caixinha: "Viagem", modo: "crescente", base: 2, semanas: 26, inicio: toISO(ini) });
      if (d) { d.feitas = [1, 2]; S.prefs.desafios = { demo: d }; }
    }
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
    else if (!S.prefs.boasVindas && !S.data.lancamentos.length && !S.data.fixos.length) { S.prefs.boasVindas = true; salvaPrefs(); tourInicial(() => setTimeout(() => guiaPasso("renda", true), 250)); }
    else if (store.kind === "local" && !S.prefs.tourVisto) tourInicial(null, TOUR_DEMO);
    else conviteAvisos();
  } catch (e) { console.error(e); showBanner("Não foi possível carregar seus dados. Confira a internet e recarregue a página."); }
}

/* ---------- acesso de quem comprou ---------- */
const ddmmaaaa = (iso) => `${ddmm(iso)}/${iso.slice(0, 4)}`;
/** Tela de quem tem conta mas não tem acesso em dia: ainda não comprou, não renovou ou pediu reembolso. */
function telaDeAcesso(msg = "", kind = "") {
  const a = S.acesso || {}, email = $("whoName").textContent, temDados = S.data.lancamentos.length || S.data.fixos.length || S.data.faturas.length;
  const devolvida = a.status === "reembolsado", venceu = !devolvida && Boolean(a.ate);
  const teste = a.origem === "teste", titulo = devolvida ? "A compra desta conta foi reembolsada" : teste && venceu ? "O seu teste grátis terminou" : venceu ? "O seu acesso terminou" : "Falta liberar o seu acesso";
  const texto = devolvida ? `O acesso de <b>${esc(email)}</b> foi encerrado junto com o reembolso.`
    : teste && venceu ? `Os 7 dias de teste de <b>${esc(email)}</b> terminaram em ${ddmmaaaa(a.ate)}. Os seus dados continuam guardados e voltam a aparecer assim que você assinar.`
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
  if (!a?.cobranca || !a.ativo || !a.ate || a.pelo_par || S.store?.kind !== "supabase") return;
  if (a.origem === "teste") {
    const f = Math.round((Date.UTC(+a.ate.slice(0, 4), +a.ate.slice(5, 7) - 1, +a.ate.slice(8, 10)) - Date.UTC(+hoje().slice(0, 4), +hoje().slice(5, 7) - 1, +hoje().slice(8, 10))) / 86400000);
    return showBanner(f <= 0 ? "Hoje é o último dia do seu teste grátis. Seus dados ficam guardados." : `Faltam ${f} ${f === 1 ? "dia" : "dias"} do seu teste grátis. Seus dados ficam guardados.`,
      LINK_COMPRA ? [[`Assinar por ${PRECO_PLANO}`, () => open(LINK_COMPRA, "_blank", "noopener")]] : []);
  }   // quem usa a assinatura da outra pessoa não é quem renova
  const d = Math.round((Date.UTC(+a.ate.slice(0, 4), +a.ate.slice(5, 7) - 1, +a.ate.slice(8, 10)) - Date.UTC(+hoje().slice(0, 4), +hoje().slice(5, 7) - 1, +hoje().slice(8, 10))) / 86400000);
  if (d > (a.status === "cancelado" ? 15 : 3)) return;
  showBanner(`O seu acesso vale até ${ddmmaaaa(a.ate)}${a.status === "cancelado" ? ", porque a renovação foi cancelada" : ". A renovação ainda não foi confirmada"}. Os seus dados não se perdem.`,
    LINK_COMPRA ? [["Renovar", () => open(LINK_COMPRA, "_blank", "noopener")]] : []);
}

function showBanner(t, acoes = [], estilo = "") {
  const b = $("banner"); b.hidden = !t; b.innerHTML = ""; b.classList.toggle("fina", estilo === "fina"); b.classList.toggle("demo", estilo === "fina" && /^Demonstração/.test(t || ""));   // o aviso da demonstração só aparece no Início
  if (!t) return;
  const s = document.createElement("span"); s.textContent = t; b.appendChild(s);
  acoes.forEach(([rot, fn]) => { const x = document.createElement("button"); x.className = "link"; x.type = "button"; x.textContent = rot; x.onclick = fn; b.appendChild(x); });
}

/** Executa uma gravação e mostra erro amigável se falhar. */
/**
 * Salva no banco e diz se deu. Com internet lenta, avisa que está salvando (em vez de a tela parecer parada)
 * e desiste depois de `prazo` ms, com o aviso de sem conexão — antes, um pedido pendurado deixava a tela esperando para sempre.
 */
let salvandoAgora = 0;
async function grava(fn, { aviso = true, prazo = 30000 } = {}) {
  // Enquanto salva, o botão de salvar do quadro não aceita outro toque (com internet lenta, o segundo toque duplicava).
  if (aviso) { salvandoAgora++; document.body.classList.add("salvando"); }
  const lento = aviso ? setTimeout(() => { if ($("toast").hidden || !$("toast").classList.contains("com-acao")) toast("Salvando… a internet está lenta."); }, 1500) : 0;
  try { await comPrazo(Promise.resolve().then(fn), prazo); return true; }
  catch (e) {
    console.error(e);
    if (/column|schema cache|relation/i.test(String(e?.message))) return showBanner("O banco de dados precisa ser atualizado para esta versão. Rode o arquivo supabase/schema.sql no Supabase."), false;
    showBanner(/fetch|network|load failed/i.test(String(e?.message)) || navigator.onLine === false ? "Sem internet: essa mudança precisa de conexão e não foi salva. Lançamentos novos você pode fazer: eles ficam guardados e são enviados depois."
      : "Não foi possível salvar. Recarregue a página e tente de novo.");
    return false;
  } finally {
    clearTimeout(lento);
    if (aviso && --salvandoAgora <= 0) { salvandoAgora = 0; document.body.classList.remove("salvando"); }
  }
}

/** "Hoje", "Ontem" ou "qui, 01 de outubro": título de cada dia na lista de lançamentos do celular. */
function rotuloDia(iso) {
  const hj = hoje(), o = new Date(); o.setDate(o.getDate() - 1);
  if (iso === hj) return "Hoje";
  if (iso === toISO(o)) return "Ontem";
  return `${DIAS3[diaDaSemana(iso)]}, ${iso.slice(8, 10)} de ${nomeMes(iso.slice(0, 7))}`;
}

/** No celular, o mês fica em chips no topo (anterior, atual e seguinte) no lugar das setas; o computador continua com as setas. */
function mesesNoTopo(mostrar) {
  const host = $("mesesTopo"), nav = document.querySelector(".top .monthnav");
  host.hidden = !mostrar; nav.hidden = mostrar;
  if (!mostrar) { host.innerHTML = ""; return; }
  host.innerHTML = [-1, 0, 1].map((k) => { const m = addM(S.mes, k), n = Number(m.slice(5)) - 1, outroAno = m.slice(0, 4) !== S.mes.slice(0, 4);
    const nome = outroAno ? `${MES3[n]} ${m.slice(0, 4)}` : MESES[n][0].toUpperCase() + MESES[n].slice(1);
    return `<button type="button" data-mes="${m}"${k === 0 ? ' aria-current="true"' : ""}>${nome}</button>`; }).join("")
    + (S.mes !== mKey(hoje()) ? `<button type="button" class="atual" data-mes="${mKey(hoje())}">Mês atual</button>` : "");
  host.querySelectorAll("[data-mes]").forEach((b) => (b.onclick = () => { S.mes = b.dataset.mes; render(); }));
}
/* ================= render ================= */
function render() {
  const [y, mo] = S.mes.split("-").map(Number);
  if ((S.view === "mais" || S.view === "analise") && !noCelular()) S.view = "inicio";   // a tela Mais só existe no celular; no computador tudo fica à vista
  const naMais = S.view === "mais", sub = S.view === "listas" && SUBS.includes(S.tab);
  $("mesTitulo").textContent = naMais ? "Mais" : `${MESES[mo - 1]} ${y}`;
  $("hoje").hidden = naMais || S.mes === mKey(hoje());
  mesesNoTopo(!naMais && noCelular());
  const c = calcMes(S.data, S.mes, hoje());
  // No celular aparece uma tela por vez; a barra de baixo mostra onde a pessoa está.
  // Barra de baixo: Início · Extrato · + · Planejar · Mais (as ferramentas moram no Mais; o Mercado abre por lá e pela busca). Cartões e Contas fixas ficam na faixa "Ir para" do Início.
  const app = $("app"); app.dataset.view = S.view; app.dataset.tab = S.tab;
  app.dataset.vazio = S.loaded && !S.data.lancamentos.length && !S.data.fixos.length && !(S.data.faturas || []).length ? "1" : "0";   // conta nova: o Início mostra só o que ajuda a começar
  corDaBarra(S.view === "listas" && S.tab === "mot" && noCelular());   // tela cheia: a barra de cima do celular acompanha a cor da tela
  // Fora do Início, o Voltar do celular precisa de uma entrada no histórico para voltar ao Início (e não fechar o app).
  // Vale também quando a tela mudou por um atalho (gráfico, limite, fatura salva), e não só pela barra de baixo.
  if (S.loaded && noCelular() && S.view !== "inicio" && !$("dlg").open && !document.body.classList.contains("lancando") && !S.ignoraPop) {
    try { const h = history.state || {}; if (!h.aba && !h.sub && !h.lanc && !h.dlg) history.pushState({ aba: true }, ""); } catch { /* nada */ }
  }
  const onde = S.view === "inicio" ? "inicio" : S.view === "analise" ? "m" : naMais || sub ? "menu" : S.tab;
  document.querySelectorAll("#bnav button").forEach((b) => b.dataset.nav === onde ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current"));
  $("listaTitulo").textContent = S.tab === "l" ? "Lançamentos" : S.tab === "c" ? "Cartões" : S.tab === "m" ? "Planejar" : S.tab === "mot" ? "Modo motorista" : "";
  $("listaTitulo").hidden = S.tab === "f" || S.tab === "r";
  $("listaVoltar").hidden = !sub;
  renderForm(); renderInstalar(); renderFechamento(); renderRepetidos(); renderVenc(); renderSemanaIni(); renderKpis(c); renderCusto(c); renderCat(c); renderEvo(); renderTabs(c); renderMais(c); aplicaInicio();
  avisoDaFila();
}

/* ---------- chegar por atalho do ícone ou por "Compartilhar" de outro aplicativo ---------- */
async function aoChegar() {
  const atalho = S.atalho, compartilhado = S.compartilhado; S.atalho = ""; S.compartilhado = false;
  if (!compartilhado) { if (atalho === "lancar" || atalho === "qr" || atalho === "voz") abrirLancar(); if (atalho === "qr") abrirQr(); if (atalho === "voz") ouvirGasto(); if (atalho === "mercado") mercado(); if (atalho === "motorista") motoristaTela(); return; }
  // O arquivo ou o texto compartilhado foi guardado pelo app neste aparelho (sw.js) e é apagado assim que é lido.
  let arquivo = null, texto = "";
  try {
    const c = await caches.open("meus-gastos-compartilhado"), ra = await c.match("./__compartilhado/arquivo"), rt = await c.match("./__compartilhado/texto");
    if (ra) { const b = await ra.blob(); arquivo = new File([b], decodeURIComponent(ra.headers.get("X-Nome") || "arquivo"), { type: b.type }); }
    if (rt) texto = (await rt.text()).trim();
    await c.delete("./__compartilhado/arquivo"); await c.delete("./__compartilhado/texto");
  } catch { /* sem o que ler: abre o formulário */ }
  if (arquivo) { S.lerComo = ""; return !ehPdf(arquivo) && !/^image\//.test(arquivo.type) && ehExtrato(arquivo) ? (IMPORTA_EXTRATO ? importarExtrato(arquivo) : (abrirLancar(), toast("Esse tipo de arquivo não é lido. Lance a compra à mão ou use a foto ou o PDF do comprovante."))) : processaLeitura(arquivo); }
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

/** O botão de lançar mostra o valor digitado ("Lançar gasto de R$ 32,00"): a pessoa confere o número no mesmo lugar onde toca. */
function rotuloDoOk() {
  const b = $("fOk"), base = b.dataset.base || b.textContent, v = valorDoCampo();
  b.textContent = (base === "Lançar gasto" || base === "Lançar entrada") && v > 0 && v <= VALOR_MAX ? `${base} de ${brl(v)}` : base;
}
function renderForm() {
  document.querySelectorAll("#tipoSeg button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.t === S.tipo));
  // Gastos que a pessoa mais repete: um toque preenche o formulário.
  const rap = S.tipo === "Despesa" && S.loaded ? maisUsados(S.data.lancamentos, hoje()) : [], fr2 = $("fRapidos"), k2 = JSON.stringify(rap);
  if (fr2.dataset.k !== k2) { fr2.dataset.k = k2; S.rapidos = rap; fr2.innerHTML = rap.length ? `<span class="rap-t">Você costuma lançar</span>` + rap.map((r, i) => `<button type="button" data-rap="${i}">${esc(r.descricao)}<b>${brl(r.valor)}</b></button>`).join("") : ""; }
  fr2.hidden = !rap.length;
  const sel = $("fCat");
  const lista = cats(S.tipo), chave = S.tipo + "|" + lista.join("|");
  if (sel.dataset.k !== chave) { const v = sel.value; sel.innerHTML = opts(lista) + optNova(S.tipo); sel.dataset.k = chave; if (lista.includes(v)) sel.value = v; }
  $("fCatLbl").textContent = S.tipo === "Reserva" ? "Onde guardar" : "Categoria";
  // No tipo Guardado, o segundo seletor vira o movimento (guardar ou retirar).
  const fs = $("fForma"), modo = S.tipo === "Reserva" ? "mov" : "forma";
  if (fs.dataset.modo !== modo) { fs.innerHTML = opts(modo === "mov" ? MOVS : FORMAS); fs.dataset.modo = modo; }
  $("fFormaLbl").textContent = modo === "mov" ? "Movimento" : "Forma de pagamento";
  $("fFormaWrap").style.visibility = S.tipo === "Receita" ? "hidden" : "visible";
  // A data acompanha o mês que está na tela quando a pessoa troca de mês. Mas a data que ela mesma escolheu
  // (um gasto de setembro lançado em outubro, por exemplo) fica como ela escolheu, e não volta para hoje.
  const fd = $("fData");
  if (!fd.value || (S.mesDoForm !== S.mes && mKey(fd.value) !== S.mes)) fd.value = mKey(hoje()) === S.mes ? hoje() : S.mes + "-01";
  S.mesDoForm = S.mes;
  syncDiaChips();
  // Opção de já cadastrar como fixo (repete todo mês). Não vale para dinheiro guardado.
  const fixo = S.tipo !== "Reserva" && $("fFixo").checked, guardando = S.tipo === "Reserva" && fs.value === "Guardar";
  $("fFixoWrap").hidden = S.tipo === "Reserva" && !guardando;
  $("fFixoLbl").textContent = S.tipo === "Reserva" ? "Guardar todo mês (dá para pular quando precisar)" : S.tipo === "Receita" ? "Repete (como o salário)" : "Repete (conta fixa ou parcelamento)";
  // Quando é fixo, a pessoa escolhe se repete todo mês ou toda semana; o dia vem da data escolhida.
  const fr = $("fRepete"), dt = fd.value || hoje();
  fr.hidden = !fixo; $("fDividirBtn").hidden = S.tipo !== "Despesa" || fixo;
  fr.options[0].textContent = `Todo mês, no dia ${dt.slice(8, 10)}`;
  fr.options[2].textContent = "Duas vezes no mês (dia " + dt.slice(8, 10) + " e outro dia)";
  $("fDia2Wrap").hidden = !(fixo && fr.value === "duas");
  fr.options[1].textContent = `Toda semana, ${DIAS_SEMANA[diaDaSemana(dt)] === "sábado" || DIAS_SEMANA[diaDaSemana(dt)] === "domingo" ? "no" : "na"} ${DIAS_SEMANA[diaDaSemana(dt)]}`;
  // Até quando repete: sem data para acabar (conta fixa) ou até um mês (acerto, acordo, parcelamento).
  const fa = $("fAte"), dica = $("fPrazoDica"), semF = fr.value === "semanal";
  fa.hidden = !fixo; $("fVezesWrap").hidden = !fixo;
  if (fixo) {
    const base = { tipo: S.tipo, desde: semF ? dt : mKey(dt) + "-01", dia: semF ? 1 : Number(dt.slice(8, 10)), ...(semF ? { repete: "semanal", dia_semana: diaDaSemana(dt) } : {}) }, kb = JSON.stringify(base);
    if (fa.dataset.k !== kb) { fa.innerHTML = opcoesDePrazo(base, fa.value); fa.dataset.k = kb; }
    const n = fa.value ? vezesNoPrazo(base, fa.value) * (fr.value === "duas" ? 2 : 1) : 0, vF = valorDoCampo();
    const quanto = n === 1 ? `Uma vez só${vF > 0 ? `, de ${brl(vF)}` : ""}` : `${vezesTxt(n)}${vF > 0 ? ` de ${brl(vF)}: ${brl(round2(n * vF))} no total` : ""}`;
    dica.textContent = fa.value ? `${quanto}. Começa em ${ddmm(dt)} e acaba em ${mesAno(fa.value)}.` : "";
  }
  dica.hidden = !(fixo && fa.value);
  $("fOk").textContent = fixo ? (fa.value ? (S.tipo === "Receita" ? "Cadastrar entrada com prazo" : "Cadastrar conta com prazo") : S.tipo === "Receita" ? "Cadastrar entrada fixa" : "Cadastrar conta fixa")
    : S.tipo === "Despesa" ? "Lançar gasto" : S.tipo === "Receita" ? "Lançar entrada" : guardando && $("fFixo").checked ? "Guardar e repetir todo mês" : "Lançar";
  $("fOk").dataset.base = $("fOk").textContent; rotuloDoOk();
  // Compra no cartão: a pessoa escolhe o cartão e, se não for um gasto fixo, em quantas vezes.
  const cc = S.tipo === "Despesa" && fs.value === CARTAO;
  $("fCartaoLinha").hidden = !cc; $("fCartaoWrap").hidden = false; $("fParcWrap").hidden = fixo; $("fCartaoDica").hidden = true;
  if (cc) {
    const fk = $("fCartao"), k = cartoesAtivos().map((z) => z.id + z.nome).join("|");
    if (fk.dataset.k !== k) { fk.innerHTML = optsCartao(fk.value, "", true); fk.dataset.k = k; }
    $("fNovo").hidden = fk.value !== NOVO_CARTAO;
    $("fParc").innerHTML = optsParcelas(valorDoCampo(), fixo ? 1 : $("fParc").value || 1);
  }
  mostraEfeito(); chipsDoForm();
}
/* ---------- Lançar rápido: categoria e forma de pagamento em botões (um toque, sem abrir lista) ---------- */
// Os seletores continuam sendo a fonte da verdade (o resto do app lê e grava neles); os botões só os acompanham.
const CHIPS_CAT_MAX = 6;
/** As categorias que a pessoa mais usa nos últimos 4 meses, para o tipo da tela; completa com as primeiras da lista. */
function categoriasDeUmToque(lista, tipo) {
  const corte = addM(mKey(hoje()), -4) + "-01", cont = new Map();
  S.data.lancamentos.forEach((x) => { if (x.tipo === tipo && x.data >= corte && lista.includes(x.categoria)) cont.set(x.categoria, (cont.get(x.categoria) || 0) + 1); });
  const top = [...cont.entries()].sort((a, b) => b[1] - a[1]).map((x) => x[0]).filter((x) => x !== "Outros");
  const resto = [...new Set([...top, ...lista.filter((x) => x !== "Outros")])];
  // "Outros" é a saída de quem não achou a categoria: fica por último, nunca na frente.
  return lista.includes("Outros") ? [...resto.slice(0, CHIPS_CAT_MAX - 1), "Outros"] : resto.slice(0, CHIPS_CAT_MAX);
}
function desenhaChips(sel, destino, valores, rotuloNova) {
  const atual = sel.value, ordem = valores.includes(atual) || !atual || atual === NOVA_CAT ? valores : [...valores.slice(0, valores.length - 1), atual];
  const k = JSON.stringify([ordem, atual, Boolean(rotuloNova)]);
  if (destino.dataset.k === k) return; destino.dataset.k = k;
  destino.innerHTML = ordem.map((v) => `<button type="button" class="chip-op" data-v="${esc(v)}" aria-pressed="${v === atual}">${esc(v)}</button>`).join("")
    + (rotuloNova ? `<button type="button" class="chip-op mais" data-nova="1">${esc(rotuloNova)}</button>` : "");
}
function chipsDoForm() {
  const form = $("formLanc"); if (!form) return;
  const montar = (sel, id, valores, rotuloNova) => {
    const label = sel.closest("label"); if (!label) return;
    let box = $(id);
    if (!box) { box = document.createElement("div"); box.id = id; box.className = "chips-campo"; box.setAttribute("role", "group"); box.setAttribute("aria-labelledby", label.querySelector("span[id]")?.id || ""); label.insertBefore(box, sel); label.classList.add("com-chips"); }
    desenhaChips(sel, box, valores, rotuloNova);
  };
  const cat = $("fCat"), forma = $("fForma");
  const listaCat = [...cat.options].map((o) => o.value).filter((v) => v && v !== NOVA_CAT);
  montar(cat, "fCatChips", categoriasDeUmToque(listaCat, S.tipo), S.tipo === "Reserva" ? "+ Nova caixinha" : "+ Nova categoria");
  montar(forma, "fFormaChips", [...forma.options].map((o) => o.value).filter(Boolean), "");
}
(function ligaChipsDoForm() {
  const form = $("formLanc"); if (!form) return;
  let agendado = false;
  const sync = () => { if (agendado) return; agendado = true; requestAnimationFrame(() => { agendado = false; chipsDoForm(); }); };
  form.addEventListener("click", (e) => {
    const b = e.target.closest(".chip-op"); if (!b) return sync();
    const sel = b.closest("label").querySelector("select");
    if (b.dataset.nova) sel.value = NOVA_CAT; else sel.value = b.dataset.v;
    sel.dispatchEvent(new Event("change", { bubbles: true })); sync();
  });
  ["input", "change"].forEach((ev) => form.addEventListener(ev, sync));
  new MutationObserver(sync).observe(form, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });
})();
/** A dica de como usar o Extrato aparece nas 4 primeiras vezes que a pessoa abre o app e some depois: quem já sabe não precisa dela. */
function dicaDoExtrato() {
  try {
    const n = Number(localStorage.getItem("cg-dica-extrato") || 0);
    if (!sessionStorage.getItem("cg-dica-extrato-sessao")) { sessionStorage.setItem("cg-dica-extrato-sessao", "1"); localStorage.setItem("cg-dica-extrato", String(n + 1)); return n + 1 <= 4; }
    return n <= 4;
  } catch { return true; }
}
/** Cartão e parcelas escolhidos no formulário de lançar. Sem cartão cadastrado não devolve nada: o lançamento segue como sempre foi. */
function cartaoDoForm() {
  const cc = S.tipo === "Despesa" && $("fForma").value === CARTAO && cartoesAtivos().length > 0 && $("fCartao").value !== NOVO_CARTAO;
  return cc ? { cartao_id: $("fCartao").value || null, parcelas: Number($("fParc").value) || 1 } : {};
}

function renderKpis(c) {
  const noCartao = round2(c.comprasCartao + c.fxCartao);
  // Saldo acumulado: o que a pessoa já tinha (saldo inicial), mais os meses anteriores, mais este mês.
  const acum = S.prefs.levarSaldo ? saldoAcumulado(S.data, S.mes, hoje(), { desde: S.prefs.saldoDesde, inicial: S.prefs.saldoInicial, viradas: S.prefs.mesesVirados || [] }) : c.saldo;
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
      <div class="hstat" data-det="custo" role="button" tabindex="0"><span class="l">Gasto até hoje</span><span class="v">${brl0(c.custo)}</span><span class="n">com as contas fixas</span></div>
      <div class="hstat" data-det="custo" role="button" tabindex="0"><span class="l">Projeção do mês</span><span class="v">${brl0(c.proj)}</span><span class="n">${est.projSobra < 0 ? `fecha ${brl0(-est.projSobra)} no vermelho` : `devem sobrar ${brl0(est.projSobra)}`}</span></div>`
    : `
      <div class="hstat" data-det="custo" role="button" tabindex="0"><span class="l">${c.fase === "futuro" ? "Gasto previsto" : "Gasto do mês"}</span><span class="v">${brl0(c.custo)}</span><span class="n">${c.fase === "futuro" ? "por enquanto, só as contas fixas" : "fechado"}</span></div>
      <div class="hstat" data-det="entradas" role="button" tabindex="0"><span class="l">Entradas</span><span class="v">${brl0(c.rec)}</span><span class="n">${c.fase === "futuro" ? "previstas" : "no mês"}</span></div>`;
  // Topo com cara de banco: o valor livre em destaque, a barra do quanto da sobra já foi usado (na cor do estado do mês),
  // o olho para esconder os valores e, logo abaixo, as ações rápidas e o resumo em três números.
  const sb = sobraDoMes(c), atualM = c.fase === "atual";
  const rotulo = atualM ? (falta ? `Gastou além do que entrou em ${mesNome}` : `Livre para gastar em ${mesNome}`) : `${verbo} em ${mesNome}`;
  const usado = sb.livre > 0 ? Math.min(100, Math.round((sb.usado / sb.livre) * 100)) : 100;
  const ocultos = valoresOcultos();
  // O traço na barra mostra onde o mês está (quantos dias já passaram); a barra, quanto da folga já foi usado.
  const tempo = atualM ? Math.max(1, Math.min(99, Math.round((c.dias / c.n) * 100))) : null;
  const ritmo = atualM && sb.livre > 0 && sb.entra > 0 && c.dias >= 3 ? (usado <= tempo - 8 ? { cls: "ok", t: `No ritmo: você usou ${usado}% da folga e o mês já passou ${tempo}%.` } : usado >= tempo + 8 && usado < 100 ? { cls: "alto", t: `Acima do ritmo: você usou ${usado}% da folga e o mês já passou ${tempo}%.` } : null) : null;
  // Conta nova, ainda sem nada: no lugar dos "R$ 0", um convite para começar (as três perguntas ou o primeiro gasto).
  const semEnt = semEntradaNoMes(c);
  const vazio = atualM && !S.data.lancamentos.length && !S.data.fixos.length && !(S.data.faturas || []).length;
  if (vazio) {
    $("resumo").innerHTML = `<div class="hero banco est-neutro hero-vazio">
      <div class="hero-top"><span class="l">Seu mês em ${mesNome}</span></div>
      <span class="v convite">Vamos montar o seu mês</span>
      <span class="n">Diga quanto você recebe e quais contas tem todo mês. Na hora, o app mostra quanto sobra para gastar.${guiaVisivel() ? " Comece pela lista acima." : ""}</span>
    </div>
    <div class="acoes-rap" role="group" aria-label="Ações rápidas">
      <button type="button" data-acao="lancar"><span class="forte">${ico("mais")}</span>Lançar gasto</button>
      ${Reconhecedor ? `<button type="button" data-acao="voz"><span>${ico("mic")}</span>Por voz</button>` : `<button type="button" data-acao="cal"><span>${ico("agenda")}</span>Calendário</button>`}
      <button type="button" data-acao="ler"><span>${ico("qr")}</span>Ler comprovante</button>
      <button type="button" data-acao="recebi"><span>${ico("entra")}</span>Recebi</button>
    </div>
    ${guiaVisivel() ? "" : `<div class="convite-card"><b>Comece em 2 minutos</b><span>São três perguntas: quanto você recebe, as contas de todo mês e o cartão.</span>
      <button type="button" class="btn primary" id="conviteComecar">Começar agora</button>
      ${IMPORTA_EXTRATO ? `<button type="button" class="btn" id="conviteExtrato">Já tenho o extrato do banco</button>` : ""}</div>`}`;
    $("grafSobraSec").innerHTML = ""; $("resumo2").innerHTML = "";
    $("resumo").querySelectorAll("[data-acao]").forEach((b) => (b.onclick = () => acaoRapida(b.dataset.acao)));
    if ($("conviteComecar")) $("conviteComecar").onclick = () => guiaPasso("renda", true);
    if ($("conviteExtrato")) $("conviteExtrato").onclick = () => abrirExtrato();
  } else {
  $("resumo").innerHTML = `${S.prefs.motorista?.ativo?.ini ? `<button type="button" class="mot-faixa" data-atalho="motorista"><span class="mot-pulso" aria-hidden="true"></span><span>Turno em andamento desde ${hhmm(Number(S.prefs.motorista.ativo.ini))}</span><b>Parar</b></button>` : ""}${semEnt ? `<div class="hero banco est-neutro hero-vazio hero-sem-entrada">
      <div class="hero-top"><span class="l">Seu mês em ${mesNome}</span>
        <button type="button" class="olho" id="olho" aria-pressed="${ocultos}" aria-label="${ocultos ? "Mostrar os valores" : "Esconder os valores"}">${ico(ocultos ? "olhoFechado" : "olho")}</button></div>
      <span class="v convite">Falta contar o que você recebe</span>
      <span class="n ocultavel">Até agora o app só viu o que sai: ${brl(c.custo)} em contas e gastos. Diga quanto você recebe e ele mostra quanto sobra.</span>
      <button type="button" class="hero-bt" data-acao="recebi">Adicionar o que recebo</button>
    </div>` : `<div class="hero banco est-${est.nivel}">
    <div class="hero-top"><span class="l">${rotulo}</span>
      <button type="button" class="olho" id="olho" aria-pressed="${ocultos}" aria-label="${ocultos ? "Mostrar os valores" : "Esconder os valores"}">${ico(ocultos ? "olhoFechado" : "olho")}</button></div>
    <span class="v ocultavel" data-det="saldo" role="button" tabindex="0" aria-label="${rotulo}: ${brl(Math.abs(rx.sobra))}. Abrir">${brl(Math.abs(rx.sobra))}</span>
    ${sb.entra > 0 ? `<div class="hbar" aria-hidden="true"><i style="width:${usado}%"></i>${tempo ? `<u class="ritmo" style="left:${tempo}%"></u>` : ""}</div>
    <div class="hsub ocultavel"><span>${atualM || c.fase === "passado" ? (sb.livre < 0 ? `as contas do mês já passam das entradas em ${brl(-sb.livre)}` : falta ? `depois das contas, sobravam ${brl(sb.livre)} para o dia a dia` : `de ${brl(sb.livre)} depois das contas`) : `previsto, depois das contas`}</span>${livre && livre.valor > 0 ? `<span>${brl(livre.valor)}/dia</span>` : ""}</div>` : ""}
    ${est.nivel !== "neutro" ? `<span class="estado"><b>${ROTULO[est.nivel]}</b>${est.motivo && est.nivel !== "estourado" ? `<span>${est.motivo}</span>` : ""}</span>` : ""}
  </div>`}
  ${!semEnt && (rx.sobra < 0 || (atualM && est.projSobra < 0)) && c.it.length ? `<button type="button" class="ordem-card" data-atalho="ordem">${ico("cofre")}<span><b>Quer recomeçar sem peso?</b><span>Veja as contas, o que ficou para trás e um jeito leve de repor.</span></span>${ico("chev")}</button>` : ""}
  <div class="acoes-rap" role="group" aria-label="Ações rápidas">
    <button type="button" data-acao="lancar"><span class="forte">${ico("mais")}</span>Lançar gasto</button>
    ${Reconhecedor ? `<button type="button" data-acao="voz"><span>${ico("mic")}</span>Por voz</button>` : `<button type="button" data-acao="cal"><span>${ico("agenda")}</span>Calendário</button>`}
    <button type="button" data-acao="ler"><span>${ico("qr")}</span>Ler comprovante</button>
    <button type="button" data-acao="recebi"><span>${ico("entra")}</span>Recebi</button>
  </div>
  ${atualM ? htmlHoje(c) : ""}
  ${c.fase === "futuro" ? htmlPrevisaoFuturo(c, rx) : ""}
  ${htmlMotoristaIni()}`;
  // Abaixo dos Próximos vencimentos: o acesso às telas, o cartão, a lista de mercado e a previsão do mês.
  $("resumo2").innerHTML = `
  <nav class="ir-para" aria-label="Ir para">
    <button type="button" data-atalho="fixas">${ico("fixo")}<span>Contas fixas</span></button>
    <button type="button" data-atalho="cart">${ico("cartao")}<span>Cartões</span></button>
    <button type="button" data-atalho="ext">${ico("saldo")}<span>Lançamentos</span></button>
    <button type="button" data-atalho="plan">${ico("alvo")}<span>Planejar</span></button>
    ${noCelular() ? `<button type="button" data-atalho="graficos">${ico("grafico")}<span>Gráficos</span></button>` : ""}
    <button type="button" data-atalho="cal">${ico("agenda")}<span>Calendário</span></button>
  </nav>
  ${htmlCartoesIni()}
  ${htmlMercadoIni()}
  <div class="resumo3 proj ocultavel">${projecaoDoMes(c, est, rx, acum)}
    <div class="resumo3-links">${c.fase === "passado" ? `<button type="button" class="link" id="verFech">Fechamento para compartilhar</button>` : ""}<button type="button" class="link" id="entenda">Entenda essa conta</button></div>
  </div>`;
  // O gráfico da sobra fica depois dos Próximos vencimentos (que sobem para logo após entradas e saídas).
  $("grafSobraSec").innerHTML = (atualM || c.fase === "passado") && sb.livre > 0 ? graficoDaSobra(c) : "";
  $("olho").onclick = () => { ocultaValores(!valoresOcultos()); render(); };
  $("resumo").querySelectorAll("[data-acao]").forEach((b) => (b.onclick = () => acaoRapida(b.dataset.acao)));
  ligaHoje(); ligaMotoristaIni(); ligaPrevisaoFuturo();
  ligaMercadoIni();
  if ($("usaMetaIni")) $("usaMetaIni").onclick = () => usaMeta(Number($("usaMetaIni").dataset.valor), () => {});
  inicioQ("[data-cartao-ini]").forEach((b) => (b.onclick = () => abrirSub("c")));
  inicioQ("[data-atalho]").forEach((b) => (b.onclick = () => ({ ext: () => abrirSub("l"), graficos: abrirAnalise, plan: () => abrirSub("m"), cart: () => abrirSub("c"), fixas: () => abrirSub("f"), cal: () => calendario(mKey(hoje())), motorista: motoristaTela, ordem: () => equilibrioTela() })[b.dataset.atalho]()));
  $("entenda").onclick = () => entendaAConta(c);
  if ($("verFech")) $("verFech").onclick = () => abrirFechamento(S.mes);
  if ($("verRev")) $("verRev").onclick = () => revisaoTela(S.mes);
  if ($("verSobra")) $("verSobra").onclick = () => { S.view = "listas"; S.tab = "m"; render(); noCelular() ? scrollTo(0, 0) : $("listas").scrollIntoView({ block: "start" }); };
  }
  renderGuia(); renderDia(c); renderTeto(c); renderMetas(c); renderMetaIni(c); renderParaOndeIni(c); renderCasalIni(c); renderDesempIni(c); renderConqIni(c); renderDicaIni(c); setTimeout(avisaConquistas, 700);
  const cab = (icone, nome) => `<span class="l"><span class="kico">${ico(icone)}</span>${nome}<i aria-hidden="true">${ico("chev")}</i></span>`;
  $("kpis").innerHTML = `
   <div class="kpi reserva" data-det="guardado" role="button" tabindex="0">${cab("cofre", "Caixinhas")}<span class="v">${brl(resTotal)}</span><span class="n">${resMes}</span>${resLinhas}</div>
   <div class="kpi fixos" data-det="fixos" role="button" tabindex="0">${cab("fixo", "Contas fixas")}<span class="v">${brl(c.fxT)}</span>${c.fxPend ? `<span class="pill warn">${brl0(c.fxPend)} a pagar</span>` : (c.fx.length ? `<span class="pill good">✓ Todos pagos</span>` : `<span class="n">Nenhum cadastrado</span>`)}${c.fxCartao ? `<span class="n">${brl0(c.fxCartao)} no cartão</span>` : ""}</div>
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
  } else t = `Mês futuro: por enquanto aparecem só as contas fixas previstas (${brl(c.fxT)}).`;
  // Duas leituras a mais, quando existem: como está em relação ao mês passado e os limites perto de estourar.
  const cmp = S.loaded ? comparaComMesAnterior(S.data, c, S.mes) : null;
  if (cmp && Math.abs(cmp.dif) >= 1) t += ` <strong>${brl0(Math.abs(cmp.dif))} a ${cmp.dif > 0 ? "mais" : "menos"}</strong> que em ${nomeMes(cmp.mes)} até hoje.`;
  const perto = S.loaded ? usoDosLimites(c, S.prefs.limites, extrasDosLimites()).filter((u) => u.pct >= 80) : [];
  const alerta = perto.length ? `<span class="lim-aviso">${perto.slice(0, 3).map((u) => u.passou ? `<b class="txt-bad">${esc(u.cat)} passou ${brl0(u.passou)} do limite</b>` : `<b>${esc(u.cat)} já usou ${u.pct}% do limite</b>`).join(" · ")}</span>` : "";
  $("insight").innerHTML = ico("luz") + `<span>${t}${alerta}</span>`;
}

/** "Seu dia": o que foi gasto hoje, o convite para anotar e a sequência de dias anotados. Só aparece no mês atual. */
/**
 * Mês que ainda não começou e que já aparece no vermelho: explica por quê (só conta o que já está cadastrado) e, se a pessoa costuma
 * lançar entradas avulsas (Uber, extras), oferece contar a média dos últimos meses como previsão.
 */
function mediaDeEntradasAvulsas(mes) {
  const ms = [addM(mes, -1), addM(mes, -2), addM(mes, -3)].filter((m) => m >= (primeiroMes(S.data) || m) && m <= mKey(hoje()));
  const por = ms.map((m) => round2(S.data.lancamentos.filter((x) => x.tipo === "Receita" && mKey(x.data) === m).reduce((t, x) => t + Number(x.valor), 0))).filter((v) => v > 0);
  return por.length ? { media: round2(por.reduce((t, v) => t + v, 0) / por.length), meses: por.length } : null;
}
function htmlPrevisaoFuturo(c, rx) {
  if (!S.loaded || rx.sobra >= 0) return "";
  const mes = nomeMes(S.mes), md = mediaDeEntradasAvulsas(S.mes), jaTem = S.data.fixos.some((f) => f.tipo === "Receita" && f.descricao === "Renda variável (média)" && f.desde <= S.mes + "-01" && (!f.ate || f.ate >= S.mes + "-01"));
  return `<section class="prev-fut" aria-label="Por que ${mes} aparece no vermelho">
    <h3>Por que ${mes} já aparece no vermelho?</h3>
    <p>${mes.charAt(0).toUpperCase() + mes.slice(1)} ainda não começou, então o app só conta o que já está cadastrado: entradas fixas de <b>${brl(c.rec)}</b> e contas de <b>${brl(c.custo)}</b>. O que entra durante o mês (Uber, extras) só aparece quando você lança. O saldo de meses anteriores não entra nessa conta.</p>
    ${md && !jaTem ? `<p>Nos últimos ${md.meses} ${md.meses === 1 ? "mês" : "meses"}, entraram em média <b>${brl(md.media)}</b> além das entradas fixas.</p><button type="button" class="btn primary" id="prevMedia" data-valor="${md.media}">Contar ${brl(md.media)} como previsão de entrada</button><p class="hint">Cria uma entrada fixa "Renda variável (média)" a partir de ${mes}. Você muda o valor ou apaga em Entradas fixas.</p>` : ""}
    <p class="hint">No dia 1º o app passa a mostrar quanto você pode gastar por dia, e cada gasto que você anota diminui esse valor na hora.</p></section>`;
}
function ligaPrevisaoFuturo() {
  const b = $("prevMedia"); if (!b) return;
  b.onclick = async () => {
    const v = Number(b.dataset.valor); if (!(v > 0)) return; b.disabled = true;
    const row = { tipo: "Receita", descricao: "Renda variável (média)", categoria: cats("Receita")[0] || "Salário", dia: 5, valor: v, forma: "", desde: S.mes + "-01", ate: null };
    let novo; if (await grava(async () => { novo = await S.store.addFixo(row); })) { S.data.fixos.push(novo); render(); toastOuFlash(`Entrada de ${brl(v)} por mês contada a partir de ${nomeMes(S.mes)}. Dá para mudar em Entradas fixas.`); } else b.disabled = false;
  };
}

/** Modo motorista no Início: quem usa vê o resultado de hoje e o botão de começar a jornada; quem ainda não usa recebe o convite (e pode dispensar). */
function htmlMotoristaIni() {
  const m = S.prefs.motorista;
  if (m?.ativo?.ini) return "";   // jornada rolando: a faixa no topo já leva para ela
  if (!m?.usa) {
    if (S.prefs.motoristaOculto) return "";
    return `<section class="mot-ini convite" aria-label="Modo motorista"><button type="button" class="mot-ini-bt" data-mot-ini="abrir">${ico("carro")}<span class="tx"><b>Trabalha com aplicativo?</b><span>Uber, 99, iFood: o modo motorista mostra ganho, km, gasolina e o lucro de verdade.</span></span></button><button type="button" class="copiado-x" data-mot-ini="dispensar" aria-label="Não mostrar mais">✕</button></section>`;
  }
  const hj = hoje(), r = resumoTurnos(m.turnos || [], hj, hj, S.prefs.veiculo || {});
  const hoje0 = !r.ganho && !r.ms;
  return `<section class="mot-ini" aria-label="Modo motorista"><div class="mot-ini-topo"><span class="l">${ico("carro")}<b>Modo motorista</b></span><button class="btn sm primary" type="button" data-mot-ini="abrir">Iniciar jornada</button></div>
    <p class="mot-ini-res ocultavel">${hoje0 ? "Nenhuma jornada hoje. Toque para começar e o app conta horas, ganho e gastos." : `Hoje: <b>${brl(r.ganho)}</b> de ganho · ${horasCurtas(r.ms)} rodadas${r.lucro !== undefined && r.lucro !== null ? ` · lucro <b>${brl(r.lucro)}</b>` : ""}`}</p></section>`;
}
function ligaMotoristaIni() {
  $("resumo").querySelectorAll("[data-mot-ini]").forEach((b) => (b.onclick = () => {
    if (b.dataset.motIni === "dispensar") { S.prefs.motoristaOculto = true; salvaPrefs(); return render(); }
    motoristaTela();
  }));
}

/** Cartão "Hoje" do Início: quanto ainda cabe hoje e o que pede ação agora (no máximo 3 itens). Substitui o quadro "Seu dia". */
const inicioQ = (s) => [...$("resumo").querySelectorAll(s), ...$("resumo2").querySelectorAll(s)];
function htmlHoje(c) {
  const hj = hoje(), g = gastoDoDia(S.data, hj), avista = gastoAVistaDoDia(S.data, hj), pg = semEntradaNoMes(c) ? null : podeGastarHoje(c, avista), itens = oQueFazerAgora(S.data, hj, S.prefs.semGasto || []);
  const seq = sequenciaDeDias(S.data, hj, S.prefs.semGasto || []);
  const ult = S.data.lancamentos.filter((x) => x.tipo === "Despesa" && !x.pendente && !x.enviando).sort((p, q) => q.data.localeCompare(p.data) || String(q.created_at || "").localeCompare(String(p.created_at || "")))[0];
  const passou = pg && pg.resta < 0;
  const topo = !pg ? "" : pg.fatia <= 0 ? `<div class="hoje-topo bad"><span class="l">Hoje</span><b class="ocultavel">Sem folga no mês</b><span>As contas do mês já passam das entradas. Gaste só o essencial.</span></div>`
    : `<div class="hoje-topo${passou ? " bad" : ""}"><span class="l">${passou ? "Hoje passou do dia" : "Ainda cabem hoje"}</span><b class="ocultavel">${brl(Math.abs(pg.resta))}</b><span class="ocultavel">${passou ? `o limite de hoje era ${brl(pg.fatia)}; o resto sai dos outros dias` : avista ? `de ${brl(pg.fatia)} por dia · você já gastou ${brl(avista)}` : `o que dá para gastar hoje, repartindo o mês em ${pg.restam} ${pg.restam === 1 ? "dia" : "dias"}`}</span></div>`;
  const lista = itens.map((x, i) => `<li class="hoje-item t-${x.tipo}"><button type="button" data-hoje="${i}"><span class="tx"><b>${esc(x.titulo)}</b><span>${esc(x.sub)}</span></span>${x.valor ? `<span class="valor ocultavel">${brl(x.valor)}</span>` : ""}${ico("chev")}</button>${x.tipo === "dia" ? `<button type="button" class="btn sm" id="hojeZero">Não gastei nada</button>` : ""}</li>`).join("");
  const rodape = [ult && !g.n ? `<button class="link" type="button" id="hojeRepetir">Repetir: ${esc(ult.descricao || ult.categoria)} · ${brl(ult.valor)}</button>` : "", seq.feitoHoje && seq.dias > 1 ? `<span class="seq">${ico("fogo")}${seq.dias} dias seguidos anotando</span>` : ""].filter(Boolean).join("");
  S.hojeItens = itens;
  return `<section class="hoje-card" aria-label="Hoje">${topo}${lista ? `<ul class="hoje-lista">${lista}</ul>` : `<p class="hoje-ok">${ico("ok")}Nada pendente por agora. Tudo em dia.</p>`}${rodape ? `<div class="hoje-rod">${rodape}</div>` : ""}</section>`;
}
function ligaHoje() {
  const host = $("resumo");
  host.querySelectorAll("[data-hoje]").forEach((b) => (b.onclick = () => {
    const x = (S.hojeItens || [])[Number(b.dataset.hoje)]; if (!x) return;
    if (x.alvo === "lancar") return acaoRapida("lancar");
    const v = $("venc"); if (v) v.scrollIntoView({ behavior: "smooth", block: "start" });
  }));
  if ($("hojeZero")) $("hojeZero").onclick = () => { S.prefs.semGasto = [...new Set([...(S.prefs.semGasto || []), hoje()])].sort().slice(-90); salvaPrefs(); render(); };
  if ($("hojeRepetir")) $("hojeRepetir").onclick = () => {
    const ult = S.data.lancamentos.filter((x) => x.tipo === "Despesa" && !x.pendente && !x.enviando).sort((p, q) => q.data.localeCompare(p.data) || String(q.created_at || "").localeCompare(String(p.created_at || "")))[0];
    if (ult) repeteLancamento(ult);
  };
}

function renderDia() {
  // O quadro "Seu dia" virou o cartão "Hoje", dentro do resumo; o antigo fica sempre escondido.
  const host = $("dia"); host.hidden = true; host.innerHTML = "";
}

/* ---------- limite de gastos do mês ---------- */
/** Com "somar a sobra" ligado, o que não foi gasto do limite de cada categoria no mês passado soma ao limite deste mês. */
const extrasDosLimites = (m = S.mes) => (S.loaded && S.prefs.limitesRolagem ? rolagemDosLimites(S.data, m, hoje(), S.prefs.limites) : {});
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
const cartaoDaMeta = (a, dica, cls = "") => `<span class="topo"><span class="l">${ico("cofre")}Caixinha ${esc(a.destino)}</span><span class="pill ${a.concluida ? "good" : "info"}">${a.concluida ? "Completa" : a.pct + "%"}</span></span>
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
    $("metaDepois").onclick = () => { S.prefs.metaConvite = false; salvaPrefs(); render(); toast("Combinado. Para criar depois, toque em Caixinhas, no Planejar."); };
    return;
  }
  const MAX = 2, vis = l.slice(0, MAX);
  host.hidden = false;
  host.innerHTML = vis.map((a, i) => `<button type="button" class="teto meta${a.concluida ? " ok" : ""}" data-meta="${i}" aria-label="Meta ${esc(a.destino)}: ${a.pct}% guardado. Abrir">${cartaoDaMeta(a, textoDaSugestao(sugestaoDaMeta(a, c)))}</button>`).join("")
    + `<button class="link" type="button" id="metasTodas">Ver todas as caixinhas</button>`;
  host.querySelectorAll("[data-meta]").forEach((b) => (b.onclick = () => detalheMeta(vis[Number(b.dataset.meta)].destino)));
  $("metasTodas").onclick = () => todasAsMetas();
}

/** A situação da meta em palavras: se está no caminho ou se a pessoa precisa mudar o valor por mês ou a data. */
function fraseDaSituacao(a) {
  const s = situacaoDaMeta(a); if (!s) return null;
  const vem = s.passo > 0 ? (a.plano > 0 ? `seu combinado é ${brl(s.passo)} por mês` : `você vem guardando ${brl(s.passo)} por mês`) : "";
  switch (s.estado) {
    case "completa": return { cls: "good", titulo: "Meta batida", frase: `Você juntou ${brl(a.guardado)}. Parabéns!` };
    case "prazoPassou": return { cls: "bad", titulo: "A data passou", frase: `Ainda faltam ${brl(a.falta)}. Toque em Alterar e escolha uma data nova.` };
    case "noPrazo": return { cls: "good", titulo: "No caminho", frase: `Para chegar até ${mesAno(a.ate)} são ${brl(s.porMes)} por mês, e ${vem}. Dá tempo.` };
    case "atrasada": return { cls: "warn", titulo: "Precisa ajustar", frase: `Para chegar até ${mesAno(a.ate)} são ${brl(s.porMes)} por mês, mas ${vem}${a.previsao ? `: assim ela só fica pronta em ${mesAno(a.previsao)}` : ""}. Guarde ${brl(s.aMais)} a mais por mês ou mude a data.` };
    case "semRitmo": return { cls: "info", titulo: "Comece a guardar", frase: `Para chegar até ${mesAno(a.ate)}, guarde ${brl(s.porMes)} por mês.` };
    default: return { cls: "info", titulo: "Sem data", frase: textoDaMeta(a) + " Escolha até quando para saber quanto guardar por mês." };
  }
}
/** A meta que aparece no início do celular: a que a pessoa escolheu, ou a de data mais próxima. */
function metaPrincipal(todas) {
  return todas.find((a) => a.destino === S.prefs.metaPrincipal) || todas.find((a) => !a.concluida) || todas[0] || null;
}
/** Início do celular: um quadro com a meta principal. Tocar abre todas as metas. */
function renderMetaIni(c) {
  const host = $("metaIni"), some = () => { host.hidden = true; host.innerHTML = ""; };
  if (!S.loaded || c.fase !== "atual") return some();
  const todas = metasEmAndamento(S.data, S.prefs.metas, hoje()), a = metaPrincipal(todas);
  if (!a) return some();
  const sit = fraseDaSituacao(a);
  host.hidden = false;
  host.innerHTML = `<button type="button" class="teto meta${a.concluida ? " ok" : ""}" id="metaIniBtn" aria-label="Caixinha ${esc(a.destino)}: ${a.pct}% da meta. Ver todas as caixinhas">
    <span class="topo"><span class="l">${ico("cofre")}Caixinha ${esc(a.destino)}</span><span class="pill ${sit.cls}">${sit.titulo}</span></span>
    <span class="num"><b>${brl(a.guardado)}</b> de ${brl(a.alvo)} <em>${a.pct}%</em></span><span class="tbar mbar"><i style="width:${Math.max(0, a.pct)}%"></i></span>
    <span class="n">${a.concluida ? sit.frase : `Faltam <b>${brl(a.falta)}</b>${a.ate && !a.prazoPassou ? ` · ${brl(a.porMes)} por mês até ${mesAno(a.ate)}` : !a.ate && a.previsao ? ` · guardando ${brl(a.plano > 0 ? a.plano : a.ritmo)} por mês, fica pronta em ${mesAno(a.previsao)}` : ""}.`}</span>
    <span class="n ver">Ver todas as caixinhas ${ico("chev")}</span></button>`;
  $("metaIniBtn").onclick = () => todasAsMetas();
}
/** Nova caixinha: o nome é a pessoa que escolhe; a meta (quanto e até quando) pode vir junto, já com a conta por mês. */
function novaCaixinha() {
  const cur = mKey(hoje()), meses = Array.from({ length: 121 }, (_, i) => addM(cur, i));
  openDlg(`<h3>Nova caixinha</h3>
    <form id="ncForm" class="dlg-form" autocomplete="off">
      <label class="f wide">Nome da caixinha<input class="in" id="ncNome" required maxlength="40" placeholder="Ex.: Viagem, Carro, Reforma"></label>
      <label class="f">Quanto quer juntar (opcional, R$)<input class="in money" id="ncValor" inputmode="decimal" placeholder="Ex.: 6.000,00"></label>
      <label class="f">Até quando (opcional)<select class="in" id="ncAte"><option value="">Sem data</option>${meses.map((m) => `<option value="${m}">${mesAno(m)}</option>`).join("")}</select></label>
      <p class="hint wide meta-conta" id="ncConta" aria-live="polite"></p>
      <p class="auth-msg err wide" id="ncMsg"></p>
      <div class="actions wide"><button class="btn primary" type="submit">Criar caixinha</button><button class="btn" type="button" data-close>Cancelar</button></div></form>`);
  $("ncNome").focus();
  const conta = () => {
    const v = parseMoney($("ncValor").value), ate = $("ncAte").value, host = $("ncConta");
    if (!(v > 0)) { host.textContent = ""; return; }
    const a = andamentoDaMeta(S.data, $("ncNome").value.trim() || "\u0000", { valor: round2(v), ate }, hoje());
    host.innerHTML = ate && a?.porMes ? `Para juntar ${brl(v)} até <b>${mesAno(ate)}</b>, guarde mais ou menos <b>${brl(a.porMes)} por mês</b>.` : "Escolha até quando para ver quanto guardar por mês.";
  };
  $("ncValor").addEventListener("input", conta); $("ncAte").onchange = conta;
  $("ncForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const nome = $("ncNome").value.trim().replace(/\s+/g, " "), v = parseMoney($("ncValor").value), l = cats("Reserva");
    if (!nome) { $("ncMsg").textContent = "Escreva o nome da caixinha."; return $("ncNome").focus(); }
    if (l.some((c) => norm(c) === norm(nome))) { $("ncMsg").textContent = `Já existe a caixinha ${l.find((c) => norm(c) === norm(nome))}.`; return $("ncNome").focus(); }
    if (v > VALOR_MAX) { $("ncMsg").textContent = ALTO_DEMAIS; return $("ncValor").focus(); }
    S.prefs.categorias = { ...(S.prefs.categorias || categoriasIniciais(S.data)), Reserva: [...l, nome] };
    if (v > 0) S.prefs.metas = { ...metasDe(), [nome]: { valor: round2(v), ate: $("ncAte").value } };
    await salvaPrefs(); $("dlg").close(); render();
    toast(`Caixinha ${nome} criada${v > 0 ? ` com meta de ${brl(v)}${$("ncAte").value ? ` até ${mesAno($("ncAte").value)}` : ""}` : ""}.`);
  });
}
/** Todas as metas, cada uma com quanto já guardou, quanto falta, quanto guardar por mês e se precisa mudar alguma coisa. */
function todasAsMetas() {
  const hj = hoje(), c = calcMes(S.data, mKey(hj), hj), todas = metasEmAndamento(S.data, S.prefs.metas, hj), princ = metaPrincipal(todas);
  // Caixinha e meta são a mesma coisa: a meta é quanto a pessoa quer juntar naquela caixinha. As que ainda não têm meta aparecem no fim.
  const saldo = new Map(guardadoPorDestino(S.data, mKey(hj))), comMeta = new Set(todas.map((a) => a.destino));
  const semMeta = [...new Set([...cats("Reserva"), ...saldo.keys()])].filter((k) => !comMeta.has(k));
  const linha = (rot, v) => `<div><dt>${rot}</dt><dd>${v}</dd></div>`;
  openDlg(`<h3>Suas caixinhas</h3>
    <p class="hint" style="margin:0 0 12px">Cada caixinha pode ter uma meta: quanto juntar e até quando. A conta é simples: o que falta dividido pelos meses.${todas.length > 1 ? " A marcada aparece no início." : ""}</p>
    <div class="metas-todas">${todas.map((a, i) => {
      const sit = fraseDaSituacao(a), dica = textoDaSugestao(sugestaoDaMeta(a, c)), s = situacaoDaMeta(a);
      return `<article class="meta-card ${sit.cls}">
        <header><b>Caixinha ${esc(a.destino)}</b><span class="pill ${sit.cls}">${sit.titulo}</span></header>
        <span class="tbar mbar"><i style="width:${Math.max(0, a.pct)}%"></i></span>
        <dl class="meta-nums">
          ${linha("Já guardou", `<b>${brl(a.guardado)}</b> (${a.pct}%)`)}
          ${linha("Meta", brl(a.alvo))}
          ${linha("Falta", a.concluida ? "nada" : `<b>${brl(a.falta)}</b>`)}
          ${linha("Até quando", a.ate ? mesAno(a.ate) : "sem data")}
          ${a.ate && !a.concluida && !a.prazoPassou ? linha("Precisa por mês", `<b>${brl(a.porMes)}</b>`) : ""}
          ${!a.concluida && s.passo > 0 ? linha(a.plano > 0 ? "Seu combinado" : "Vem guardando", `${brl(s.passo)} por mês`) : ""}
          ${!a.concluida && a.previsao && (!a.ate || !a.noPrazo) ? linha("Nesse ritmo fica pronta", mesAno(a.previsao)) : ""}
        </dl>
        <p class="meta-sit">${sit.frase}</p>${dica ? `<p class="hint" style="margin:0">Este mês: ${dica}</p>` : ""}
        <div class="meta-btns"><button class="btn sm primary" type="button" data-malt="${i}">Alterar</button>${a.concluida ? "" : `<button class="btn sm" type="button" data-mgu="${i}">Guardar</button>`}${todas.length > 1 ? (a === princ ? `<span class="meta-ini-tag">Aparece no início</span>` : `<button class="link" type="button" data-mini="${i}">Mostrar no início</button>`) : ""}</div>
      </article>`;
    }).join("")}
    ${semMeta.map((k) => `<article class="meta-card sem"><header><b>Caixinha ${esc(k)}</b><span class="pill">Sem meta</span></header>
      <p class="meta-sit">${saldo.get(k) ? `Tem <b>${brl(saldo.get(k))}</b> guardados.` : "Ainda sem dinheiro guardado."} Diga quanto quer juntar e até quando.</p>
      <div class="meta-btns"><button class="btn sm primary" type="button" data-mcriar="${esc(k)}">Criar meta</button></div></article>`).join("")}</div>
    <div class="actions"><button class="btn" type="button" id="metaNova">+ Nova caixinha</button><button class="btn primary" type="button" data-close>Fechar</button></div>`);
  const body = $("dlgBody");
  body.querySelectorAll("[data-malt]").forEach((b) => (b.onclick = () => detalheMeta(todas[Number(b.dataset.malt)].destino)));
  body.querySelectorAll("[data-mgu]").forEach((b) => (b.onclick = () => { const a = todas[Number(b.dataset.mgu)], sg = sugestaoDaMeta(a, c); guardarParaMeta(a.destino, sg?.tipo === "guardar" ? sg.valor : 0); }));
  body.querySelectorAll("[data-mini]").forEach((b) => (b.onclick = () => { S.prefs.metaPrincipal = todas[Number(b.dataset.mini)].destino; salvaPrefs(); render(); todasAsMetas(); toast(`${S.prefs.metaPrincipal} aparece no início.`); }));
  body.querySelectorAll("[data-mcriar]").forEach((b) => (b.onclick = () => detalheMeta(b.dataset.mcriar)));
  $("metaNova").onclick = () => novaCaixinha();
}

/** Leva para o formulário de lançar já em Guardar, no destino da meta e com o valor sugerido. */
function guardarParaMeta(destino, valor = 0, mov = "Guardar") {
  $("dlg").close(); S.tipo = "Reserva"; S.mes = mKey(hoje()); render();
  if (cats("Reserva").includes(destino)) $("fCat").value = destino;
  $("fForma").value = mov; $("fData").value = hoje(); $("fFixo").checked = false;
  $("fValor").value = valor > 0 ? valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "";
  renderForm(); mostraEfeito();
  if (noCelular()) abrirLancar(); else { $("fValor").scrollIntoView({ block: "center" }); $("fValor").focus(); }
}

/** Exclui a meta (e o combinado de todo mês, que faz parte dela). O dinheiro guardado não muda: ele é dos lançamentos. */
async function excluiMeta(destino) {
  const tinha = metasDe()[destino]; if (!tinha) return;
  delete metasDe()[destino]; salvaPrefs();
  if ($("dlg").open) $("dlg").close();
  render();
  const aqui = (guardadoPorDestino(S.data, mKey(hoje())).find(([k]) => k === destino) || [0, 0])[1];
  toastDesfazer(`Meta de ${destino} excluída${tinha.plano ? ", com o combinado de todo mês" : ""}. ${aqui ? `Os ${brl(aqui)} guardados continuam na caixinha.` : "A caixinha vazia saiu da lista."}`,
    () => { metasDe()[destino] = tinha; salvaPrefs(); render(); toast(`A meta de ${destino} voltou.`); });
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
  openDlg(`<h3>Caixinha ${esc(destino)}${a ? "" : ": criar meta"}</h3>
    ${aviso ? `<p class="hint meta-aviso">${aviso}</p>` : ""}
    ${a ? `<div class="teto meta parado${a.concluida ? " ok" : ""}">${cartaoDaMeta(a, dica)}</div>
      ${a.concluida ? "" : `<button class="btn primary" type="button" id="metaGuardar">${s?.tipo === "guardar" ? `Guardar ${brl(s.valor)} agora` : "Guardar agora"}</button>`}`
      : `<p class="hint" style="margin:0 0 4px;font-size:13px">${aqui > 0 ? `Você já tem <b>${brl(aqui)}</b> guardados aqui. Diga aonde quer chegar.` : "Diga quanto quer juntar. O que você guardar aqui passa a contar para a meta."}</p>`}
    <div class="caixa-acoes meta-mov"><button class="btn" type="button" id="metaRetirar">Retirar dinheiro</button><button class="btn" type="button" id="metaJaTinha">Já tinha guardado</button></div>
    <form id="metaForm" class="meta-form" autocomplete="off">
      ${escolher && !a ? `<label class="f larga">Onde fica esse dinheiro<select class="in" id="metaDest">${opts(destinos, destino)}</select></label>` : ""}
      <label class="f">Quanto você quer juntar (R$)<input class="in money" id="metaValor" inputmode="decimal" placeholder="Ex.: 6.000,00" value="${esc(dinheiro(Number(meta?.valor) || 0))}"></label>
      <label class="f">Até quando (opcional)<select class="in" id="metaAte"><option value="">Sem data</option>${meses.map((m) => `<option value="${m}"${m === meta?.ate ? " selected" : ""}>${mesAno(m)}</option>`).join("")}</select></label>
      <label class="f">Guardar todo mês (opcional, R$)<input class="in money" id="metaPlano" inputmode="decimal" placeholder="Ex.: 300,00" value="${esc(dinheiro(Number(meta?.plano?.valor) || 0))}"></label>
      <label class="f">No dia<select class="in" id="metaDia">${Array.from({ length: 31 }, (_, i) => `<option${i + 1 === diaPadrao ? " selected" : ""}>${i + 1}</option>`).join("")}</select></label>
      <p class="hint larga">O valor por mês vira um <b>combinado</b>: ele aparece todo mês em Próximos vencimentos para você marcar <b>Guardei</b>. Não é uma conta: dá para pular o mês quando precisar, sem problema.</p>
      <p class="hint larga meta-prev" id="metaPrev" aria-live="polite"></p>
      <p class="hint larga" id="metaErro" role="alert" hidden></p>
      <div class="meta-acoes larga"><button class="btn primary" type="submit">${a ? "Salvar mudanças" : "Criar meta"}</button>${cats("Reserva").includes(destino) ? `<button class="btn" type="button" id="metaNome">Mudar o nome</button>` : ""}${meta ? `<button class="btn perigo" type="button" id="metaTirar">${ico("lixo")}Excluir a meta</button>` : ""}</div>
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
  $("metaRetirar").onclick = () => guardarParaMeta(destino, 0, "Retirar"); $("metaJaTinha").onclick = () => guardarParaMeta(destino, 0, "Já tinha guardado");
  if ($("metaGuardar")) $("metaGuardar").onclick = () => guardarParaMeta(destino, s?.tipo === "guardar" ? s.valor : 0);
  $("metaForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const m = lido(), erro = $("metaErro");
    if (!(m.valor > 0) || m.valor > VALOR_MAX) { erro.hidden = false; erro.style.color = "var(--bad)"; erro.textContent = m.valor > VALOR_MAX ? ALTO_DEMAIS : "Digite quanto você quer juntar, por exemplo 6.000,00."; $("metaValor").focus(); return; }
    if (!m.plano) { delete m.plano; delete m.pulos; }
    S.prefs.metas = { ...metasDe(), [destino]: m }; await salvaPrefs();
    if ($("dlg").open) $("dlg").close();
    render();
    const pa = andamentoDaMeta(S.data, destino, m, hoje());
    toast(`${a ? "Meta salva" : "Meta criada"}: ${destino}, ${brl(m.valor)}${m.ate ? ` até ${mesAno(m.ate)}` : ""}.${pa && !pa.concluida && m.ate && pa.porMes ? ` Guarde ${brl(pa.porMes)} por mês.` : m.plano ? ` Combinado: ${brl(m.plano.valor)} por mês.` : ""}`);
  });
  if ($("metaNome")) $("metaNome").onclick = () => renomearCategoria("Reserva", destino, (novo) => detalheMeta(novo || destino));
  if ($("metaTirar")) armDelete($("metaTirar"), () => excluiMeta(destino), "Toque de novo para excluir");
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
  const metasMes = c.fase === "atual" && S.loaded ? metasAGuardarNoMes(S.data, S.prefs.metas, hoje()) : 0, contaMetas = metasMes > 0 && S.prefs.metasNoCusto === true;
  const s = sobraDoMes(c, contaMetas ? metasMes : 0), mes = nomeMes(S.mes), atual = c.fase === "atual";
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
    ${metasMes > 0 ? `<li class="opc${contaMetas ? "" : " desligada"}"><span><b>${contaMetas ? "− " : ""}Metas das caixinhas</b><small>falta guardar neste mês · opcional</small>
      <label class="check sm"><input type="checkbox" id="sobraMetas" ${contaMetas ? "checked" : ""}> Contar na conta do mês</label></span><b class="v">${contaMetas ? "− " : ""}${brl(metasMes)}</b></li>` : ""}
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
$("pane-m").addEventListener("change", (e) => {
  if (e.target.id !== "sobraMetas") return;
  S.prefs.metasNoCusto = e.target.checked; salvaPrefs(); render();
  toast(e.target.checked ? "As metas entram na conta do mês: a sobra já desconta o que falta guardar." : "As metas saíram da conta do mês.");
});
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
  const avisar = S.prefs.avisos?.limite !== false, t = u ? textoDoTeto(u) : null, lim = S.prefs.limites || {}, sobraLim = extrasDosLimites();
  const metasP = S.loaded ? metasEmAndamento(S.data, S.prefs.metas, hoje()) : [];
  host.innerHTML = `<div class="pl-analise"><button class="mais-item" type="button" data-analise><span class="ava">${ico("grafico")}</span><span class="tx"><b>Análise do mês</b><span>Gráficos, categorias e últimos meses</span></span>${ico("chev")}</button></div>${htmlSobra(c)}${htmlCaixinhas()}<h2 class="pl-h">Limite de gasto</h2><p class="hint" style="margin-top:0;font-size:13px">O máximo que você quer gastar no mês. O app avisa quando chegar perto.</p>
    <form id="tetoForm" class="teto-form" autocomplete="off">
      <label class="f">Limite de gastos por mês (R$)<input class="in money" id="tetoValor" inputmode="decimal" placeholder="Ex.: 3.500,00" value="${esc(dinheiro(Number(S.prefs.teto) || 0))}"></label>
      <button class="btn primary" type="submit">${u ? "Mudar limite" : "Salvar limite"}</button>${Number(S.prefs.teto) > 0 ? `<button class="btn perigo" type="button" id="tetoTirar">${ico("lixo")}Tirar o limite</button>` : ""}
      <p class="hint">Entra na conta tudo o que sai no mês: contas fixas, gastos do dia a dia e faturas de cartão. Dinheiro guardado não entra.${media ? ` Para se basear: ${antes.length === 1 ? "no último mês" : `nos últimos ${antes.length} meses`} seu custo foi de <b>${brl(media)}</b>${antes.length > 1 ? " em média" : ""}${atual.rec ? `, e neste mês entram ${brl(atual.rec)}` : ""}. <button class="link" type="button" id="tetoUsar">Usar ${brl0(Math.ceil(media / 50) * 50)}</button>` : ""}${u ? " Para tirar o limite, apague o valor e salve." : ""}</p>
    </form>
    ${htmlLimiteCabe()}
    ${u ? `<div class="teto ${t.cls} parado"><span class="topo"><span class="l">${ico("alvo")}Uso do limite em ${nomeMes(S.mes)}</span><span class="pill ${t.cls === "ok" ? "good" : t.cls}">${t.titulo}</span></span>
      <span class="num"><b>${brl(u.gasto)}</b> de ${brl(u.teto)} <em>${u.pct}%</em></span>${barraDoTeto(u)}<span class="n">${t.frase}</span></div>` : ""}
    <h3 class="sub-h">Limite por categoria</h3>
    <p class="hint" style="margin-top:0">Opcional. Deixe em branco as categorias que não precisam de limite.</p>
    <form id="limCats" class="lim-cats" autocomplete="off">
      ${catL.map((k, i) => `<label class="lc">${ava(k)}<span class="tx"><b>${esc(k)}</b><span>${brl(gasto.get(k) || 0)} em ${nomeMes(S.mes)}${sobraLim[k] ? ` · limite com +${brl0(sobraLim[k])} do mês passado` : ""}</span></span><input class="in money" data-cat="${i}" inputmode="decimal" placeholder="Sem limite" aria-label="Limite para ${esc(k)}" value="${esc(dinheiro(Number(lim[k]) || 0))}"></label>`).join("")}
      <button class="btn" type="submit">Salvar limites das categorias</button>
    </form>
    <label class="check" style="margin-top:10px"><input type="checkbox" id="limRolar" ${S.prefs.limitesRolagem ? "checked" : ""}> Somar ao limite o que sobrou no mês passado</label>
    <p class="hint" style="margin:6px 0 0">Se você não usou todo o limite de uma categoria no mês passado, a sobra vale a mais neste mês (só do mês anterior, sem acumular). Vale só dentro do app: os avisos por e-mail usam o limite normal.</p>
    <h3 class="sub-h">Avisos do limite</h3>
    <label class="check"><input type="checkbox" id="tetoAvisar" ${avisar ? "checked" : ""}> Avisar por e-mail e notificação no celular</label>
    <p class="hint" style="margin:6px 0 0">Você recebe um aviso de manhã quando chegar a <b>80%</b> do limite, outro quando <b>passar</b> e outro se passar em <b>mais de 20%</b>. Cada um chega uma vez no mês. Dentro do app, o quadro do início muda de cor na hora.
      ${S.store?.kind === "local" ? "Na demonstração os avisos por e-mail e notificação não são enviados." : `Os canais (e-mail e notificação neste aparelho) são os mesmos dos avisos de contas. <button class="link" type="button" id="tetoCanais">Ver em Ajustes</button>`}</p>`;
  if ($("tetoUsar")) $("tetoUsar").onclick = () => { $("tetoValor").value = dinheiro(Math.ceil(media / 50) * 50); $("tetoValor").focus(); };
  if ($("tetoCanais")) $("tetoCanais").onclick = () => $("btnAjustes").click();
  if ($("tetoTirar")) armDelete($("tetoTirar"), () => {
    const era = S.prefs.teto; S.prefs.teto = 0; salvaPrefs(); render();
    toastDesfazer("O mês ficou sem limite de gasto.", () => { S.prefs.teto = era; salvaPrefs(); render(); });
  }, "Toque de novo para tirar");
  $("tetoForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const v = parseMoney($("tetoValor").value); if (v > VALOR_MAX) { toast(ALTO_DEMAIS); return $("tetoValor").focus(); }
    S.prefs.teto = v > 0 ? round2(v) : 0;
    await salvaPrefs(); render();
    toastOuFlash(v > 0 ? `Limite do mês: ${brl(round2(v))}.` : "O mês ficou sem limite.");
  });
  $("limRolar").onchange = async (e) => { S.prefs.limitesRolagem = e.target.checked; await salvaPrefs(); render(); toastOuFlash(e.target.checked ? "A sobra do mês passado agora soma ao limite." : "Cada mês volta a ter só o limite normal."); };
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
/** Tocar numa conta de "Próximos vencimentos": o dia, o tipo, se o dinheiro cobre na data e os atalhos para pagar, editar e ver no calendário. */
function detalheVencimento(x) {
  const hj = hoje(), r = contasQueNaoFecham(S.data, hj), it = r.itens.find((y) => y.titulo === x.titulo && y.data === x.data && y.tipo === x.tipo);
  const tipo = x.semValor ? "Fatura de cartão sem valor informado" : x.tipo === "repetida" ? "Parece se repetir todo mês (ainda não é conta fixa)" : x.tipo === "fatura" ? "Fatura de cartão" : x.semanal ? "Conta fixa · toda " + DIAS_SEMANA[diaDaSemana(x.data)] : "Conta fixa";
  const dt = `${x.data.slice(8, 10)}/${x.data.slice(5, 7)}/${x.data.slice(0, 4)}`;
  let cobre = "";
  if (x.semValor || x.tipo === "repetida") cobre = `<p class="hint">${x.semValor ? "Informe o valor da fatura para o app saber se o dinheiro cobre." : "Vire conta fixa para o app contar essa despesa todo mês e avisar antes do vencimento."}</p>`;
  else if (!S.loaded || mKey(x.data) !== mKey(hj)) cobre = `<p class="hint">A conta de cobertura vale para o mês atual. Esse vencimento é de outro mês.</p>`;
  else if (it?.falta > 0) cobre = `<p class="det-cobre bad"><b>Faltam ${brl(it.falta)}</b> para pagar essa conta no dia ${dt.slice(0, 5)}. O dinheiro que você tem hoje (${brl(Math.max(0, r.caixa))}) já está contando as contas que vencem antes dela.</p><p class="hint">Dá para segurar o dia a dia, esperar uma entrada ou ver o jeito leve em Mais > Pôr o mês em ordem.</p>`;
  else cobre = `<p class="det-cobre ok"><b>O dinheiro cobre essa conta.</b> Mesmo pagando antes as que vencem primeiro, sobra para ela no dia ${dt.slice(0, 5)}.</p>`;
  const f = x.tipo === "fixo" ? S.data.fixos.find((z) => z.id === x.id) : null;
  openDlg(`<h3>${esc(x.titulo)}</h3>
    <div class="det"><ul class="itens">
      <li><span></span><span>Valor</span><b>${x.semValor ? "?" : (x.tipo === "repetida" ? "~ " : "") + brl(x.valor)}</b></li>
      <li><span></span><span>Vencimento</span><b>${dt}</b></li>
      <li><span></span><span>Quando</span><b>${quandoVence(x.dias)}</b></li>
      <li><span></span><span>Tipo</span><b>${tipo}${f?.ate ? " " + ateCurto(f.ate) : ""}</b></li></ul></div>
    ${cobre}
    <div class="actions">
      ${x.semValor ? `<button class="btn primary" type="button" id="dvAcao">Informar valor</button>` : x.tipo === "repetida" ? `<button class="btn primary" type="button" id="dvAcao">Virar conta fixa</button>` : `<button class="btn primary" type="button" id="dvPagar">Já paguei</button>${x.tipo === "fixo" || x.tipo === "fatura" ? `<button class="btn" type="button" id="dvEditar">Editar${x.tipo === "fixo" ? " conta" : " fatura"}</button>` : ""}`}
      <button class="btn" type="button" id="dvCal">Ver no calendário</button><button class="btn" type="button" data-close>Fechar</button></div>`);
  if ($("dvPagar")) $("dvPagar").onclick = () => { $("dvPagar").disabled = true; $("dlg").close(); pagarConta(x); };
  if ($("dvEditar")) $("dvEditar").onclick = () => abrirItem(x.tipo === "fixo" ? { k: "fixo", id: x.id } : { k: "fatura", id: x.id || null, cartao_id: x.cartao_id || null, cartao: x.cartao, venc: x.data });
  if ($("dvCal")) $("dvCal").onclick = () => calendario(mKey(x.data), x.data);
  if ($("dvAcao")) $("dvAcao").onclick = async () => {
    $("dlg").close();
    if (x.semValor) return editarFatura({ ...x, vencimento: x.data, itens: [], calculado: 0, valor: 0, valor_fixo: false, status: "Aberta" });
    if (await transformaEmFixas([x.achada])) toast(`${x.titulo} virou conta fixa. Os meses anteriores ficaram como pagos.`);
  };
}
/** "Esta semana": os últimos movimentos lançados, em linha do tempo. Toque abre o lançamento; "Ver extrato" abre a lista inteira. */
function renderSemanaIni() {
  const host = $("semanaIni"); if (!host) return;
  const l = S.loaded && S.mes === mKey(hoje()) ? linhaDaSemana(S.data.lancamentos, hoje()) : [];
  host.hidden = !l.length; if (!l.length) { host.innerHTML = ""; return; }
  host.innerHTML = `<div class="semana"><div class="semana-topo"><h2>Esta semana</h2><button type="button" class="link" id="semanaExtrato">Ver extrato</button></div>
    <ol class="tl-sem">${l.map((x) => `<li class="${x.tipo === "Receita" ? "entra" : x.tipo === "Reserva" ? "guarda" : "sai"}"><button type="button" class="tl-item" data-sem="${esc(x.id)}">
      <span class="tl-ponto" aria-hidden="true"></span><span class="tl-txt"><b>${esc(x.descricao)}</b><small>${x.rotulo}${x.categoria ? " · " + esc(x.categoria) : ""}</small></span>
      <span class="tl-val ocultavel">${x.tipo === "Receita" ? "+" : x.tipo === "Reserva" ? "" : "−"} ${brl(x.valor)}</span></button></li>`).join("")}</ol></div>`;
  host.querySelectorAll("[data-sem]").forEach((b) => (b.onclick = () => editarLancamento(b.dataset.sem)));
  $("semanaExtrato").onclick = () => abrirSub("l");
}
function renderVenc() {
  const host = $("venc"), reais = S.loaded ? proximosVencimentos(S.data, hoje(), 30) : [];
  // Além das contas já cadastradas: o cartão cadastrado que ainda não tem valor de fatura e as contas que o app achou que se repetem.
  const extras = S.loaded ? [...faturasSemValor(S.data, hoje(), 30), ...proximasRepetidas(contasQueSeRepetem(S.data.lancamentos, S.data.fixos, hoje()), hoje(), 30)] : [];
  const l = [...reais, ...extras].sort((a, b) => a.data.localeCompare(b.data) || a.titulo.localeCompare(b.titulo));
  const total = round2(reais.reduce((t, x) => t + x.valor, 0));
  const cab = (dir) => `<div class="sec-head"><h2>Próximos vencimentos</h2><span>${dir}</span></div>${S.loaded ? `<button class="link venc-cal" type="button" id="vencCal">${ico("agenda")}Ver no calendário</button>` : ""}`;
  // Alerta de saldo: uma linha acima da lista, só quando o mês está ou vai fechar no vermelho.
  const sd = S.loaded ? avisosDeHoje(S.data, hoje()).saldo : null;
  const ac = S.loaded && !semEntradaNoMes(calcMes(S.data, mKey(hoje()), hoje())) ? quandoOsDinheiroAcaba(S.data, hoje()) : null, faltaAte = ac?.minimo ? round2(-ac.minimo.saldo) : 0;
  const alerta = !ac?.diaZero ? "" : `<li class="alerta ${ac.diasAteZero === 0 ? "bad" : "warn"}"><span class="quando bad">dinheiro curto</span>
      <span class="oque"><b>${ac.diasAteZero === 0 ? "O dinheiro deste mês já acabou" : `No ritmo de agora, o dinheiro do mês acaba dia ${ac.diaZero.slice(8, 10)}`}</b>
      <span>Até o fim do mês faltam ${brl(faltaAte)}.${ac.proximaEntrada && ac.proximaEntrada.data > ac.diaZero ? ` A próxima entrada (${brl(ac.proximaEntrada.valor)}) é só no dia ${ac.proximaEntrada.data.slice(8, 10)}.` : ""} Em Mais > Pôr o mês em ordem tem um jeito leve de fechar.</span></span></li>`;
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
      : "Nenhuma conta para os próximos 30 dias. Cadastre as suas contas fixas e o cartão para ser avisado aqui."}</li></ul>`;
    ligaComb();
    return;
  }
  const cls = (d) => (d < 0 ? "bad" : d <= 7 ? "warn" : "ok");
  // No topo aparecem só as primeiras (2 no celular, 5 no computador); o resto abre no "Ver todas".
  // Mostra tudo o que está atrasado ou vence em 7 dias (até 5), mesmo no celular: é o que pede ação.
  const MAX = Math.max(noCelular() ? 2 : 5, Math.min(5, l.filter((x) => x.dias <= 7).length)), vis = S.vencTodas ? l : l.slice(0, MAX);
  const atras = reais.filter((x) => x.dias < 0), em7 = reais.filter((x) => x.dias >= 0 && x.dias <= 7), soma = (a) => brl(round2(a.reduce((t, x) => t + x.valor, 0)));
  const resumo = atras.length || em7.length
    ? [atras.length ? `<b class="txt-bad">${atras.length} ${atras.length === 1 ? "atrasada" : "atrasadas"}: ${soma(atras)}</b>` : "", em7.length ? `${em7.length} ${em7.length === 1 ? "vence" : "vencem"} em 7 dias: <b>${soma(em7)}</b>` : ""].filter(Boolean).join(" · ")
    : `${l.length} ${l.length === 1 ? "conta" : "contas"} em 30 dias, somando <b>${brl(total)}</b>`;
  host.innerHTML = cab(resumo) +
    `<ul class="venc">${alerta}${vis.map((x, i) => `<li class="toca" data-vd="${i}" data-u="${cls(x.dias)}">
      <span class="dt"><b>${x.data.slice(8, 10)}</b><span>${MES3[Number(x.data.slice(5, 7)) - 1]}</span></span>
      <span class="oque">${x.tipo === "fixo" && fotoDe("fixo", x.titulo) ? `<span class="mini-foto" style="background-image:url('${fotoDe("fixo", x.titulo)}')" aria-hidden="true"></span>` : ""}<button type="button" class="venc-tit" data-vda="${i}" aria-label="${esc(x.titulo)}: ver detalhes"><b>${esc(x.titulo)}</b></button><span>${x.semValor ? "Fatura de cartão · falta informar o valor" : x.tipo === "repetida" ? "Parece se repetir todo mês" : x.tipo === "fatura" ? "Fatura de cartão" : x.semanal ? "Conta fixa · toda " + DIAS_SEMANA[diaDaSemana(x.data)] : "Conta fixa"}</span></span>
      <span class="quando ${cls(x.dias)}">${quandoVence(x.dias)}</span>
      <span class="valor">${x.semValor ? "?" : x.tipo === "repetida" ? "~ " + brl(x.valor) : brl(x.valor)}</span>
      ${x.semValor ? `<button class="btn sm" type="button" data-iv="${i}">Informar valor</button>` : x.tipo === "repetida" ? `<button class="btn sm" type="button" data-vf="${i}">Virar conta fixa</button>` : `<button class="btn sm" type="button" data-pg="${i}">Já paguei</button>`}</li>`).join("")}${combHtml}
      ${l.length > MAX ? `<li class="vazio"><button class="link" type="button" id="vencMais">${S.vencTodas ? "Mostrar só as próximas" : `Ver todas as ${l.length} contas`}</button></li>` : ""}</ul>`;
  host.querySelectorAll("[data-vd]").forEach((li) => {
    // A linha toda abre o detalhe no toque; para teclado e leitor de tela, o nome da conta é o botão.
    li.onclick = (e) => { const b = e.target.closest("button"); if (b && !b.classList.contains("venc-tit")) return; detalheVencimento(vis[Number(li.dataset.vd)]); };
  });
  host.querySelectorAll("[data-pg]").forEach((b) => (b.onclick = () => { b.disabled = true; pagarConta(vis[Number(b.dataset.pg)]); }));
  host.querySelectorAll("[data-iv]").forEach((b) => (b.onclick = () => { const x = vis[Number(b.dataset.iv)]; editarFatura({ ...x, vencimento: x.data, itens: [], calculado: 0, valor: 0, valor_fixo: false, status: "Aberta" }); }));
  host.querySelectorAll("[data-vf]").forEach((b) => (b.onclick = async () => {
    const x = vis[Number(b.dataset.vf)]; b.disabled = true;
    if (await transformaEmFixas([x.achada])) toast(`${x.titulo} virou conta fixa. Os meses anteriores ficaram como pagos.`); else b.disabled = false;
  }));
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
    <p class="hint cal-res">${cal.aPagar || cal.pago ? `A pagar no mês: <b>${brl(cal.aPagar)}</b>. Já pago: <b>${brl(cal.pago)}</b>.` : "Nenhuma conta neste mês. Cadastre as contas fixas e o cartão para ver os vencimentos aqui."}${cal.entra ? ` Entradas fixas: <b>${brl(cal.entra)}</b>.` : ""}</p>
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
let filaPago = Promise.resolve();
let pagosPendentes = 0;   // "Já paguei" ainda indo para o banco: a atualização automática espera   // uma mudança de cada vez: o "Desfazer" só vai para o banco depois do "Já paguei"
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
  pagosPendentes++;
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
  }).finally(() => { pagosPendentes--; });
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
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", height: H, role: "img", "aria-label": "Gasto acumulado no mês" }, host);
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

/** A pílula do limite de uma categoria: quanto ainda cabe, "falta pouco" a partir de 80%, ou quanto passou. */
function pilulaDoLimite(u) {
  const e = estadoDoLimite(u);
  return e.nivel === "estourou" ? ` <span class="tag bad">passou ${brl0(u.passou)}</span>`
    // Curto, para caber no celular: a cor diz se está folgado (verde) ou se falta pouco (âmbar).
    : e.nivel === "perto" ? ` <span class="tag warn" title="Falta pouco para o limite"><span class="so-leitor">Falta pouco: </span>cabem ${brl0(e.sobra)}</span>` : ` <span class="tag ok">cabem ${brl0(e.sobra)}</span>`;
}
function renderCat(c) {
  const host = $("chCat"); host.innerHTML = "";
  const cats = catMap(c), tot = cats.reduce((s, x) => s + x[1], 0);
  if (!cats.length) { host.innerHTML = `<div class="empty">As categorias aparecem aqui assim que você lançar um gasto.</div>`; cartaoDoMes(c, host); return; }
  // Uma linha por categoria: nome, valor e uma barra na cor da categoria. Tocar abre a lista dos gastos.
  // Com limite definido, a barra mostra quanto do limite já foi usado e fica vermelha quando passa.
  const lim = new Map(usoDosLimites(c, S.prefs.limites, extrasDosLimites()).map((u) => [u.cat, u]));
  // Dia a dia de cada categoria contra o mês anterior (até o mesmo dia, no mês atual). Só aparece quando a diferença é relevante.
  const cmp = S.loaded ? comparaCategorias(S.data, c, S.mes) : null, m3 = cmp ? MES3[Number(cmp.mes.slice(5)) - 1].toLowerCase() : "";
  const delta = (k) => { const d = cmp?.por[k]; return d ? `<span class="cmp">${ico(d.dif > 0 ? "sobe" : "desce")}${brl0(Math.abs(d.dif))} ${d.dif > 0 ? "a mais" : "a menos"} que em ${m3}</span>` : ""; };
  const linhas = [...cats, ...[...lim.values()].filter((u) => !cats.some(([k]) => k === u.cat)).map((u) => [u.cat, 0])];
  const max = cats[0][1], box = document.createElement("div"); box.className = "cats";
  box.innerHTML = linhas.map(([k, v], i) => {
    const u = lim.get(k);
    return `<button type="button" class="cat-row${u?.passou ? " over" : ""}" data-i="${i}" style="--c:${corCat(k)}" aria-label="${esc(k)}: ${brl0(v)}${u ? ` de ${brl0(u.limite)} de limite` : ""}. Ver os gastos">
    <span class="nm"><i></i>${esc(k)}${u ? pilulaDoLimite(u) : ""}${u?.extra && !u.passou ? ` <span class="tag">+${brl0(u.extra)} do mês passado</span>` : ""}</span><span class="vl">${brl0(v)}<em>${u ? `de ${brl0(u.limite)}` : `${Math.round((v / tot) * 100)}%`}</em></span>
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
  let meses = S.loaded ? ultimosMeses(S.data, S.mes, hoje()) : [];
  let ini = 0; while (ini < meses.length - 2 && !(meses[ini].rec > 0) && !(meses[ini].custo > 0)) ini++;   // meses vazios no começo só atrapalham a leitura
  meses = meses.slice(ini);
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
    tip.innerHTML = `<b>${nomeMes(x.m)} de ${x.m.slice(0, 4)}${x.fase === "atual" ? " (até agora)" : ""}</b><div class="r"><span>Entradas</span><span>${brl0(x.rec)}</span></div><div class="r"><span>Gastos</span><span>${brl0(x.custo)}</span></div><div class="r"><span>${x.sobra >= 0 ? "Sobrou" : "Faltou"}</span><span>${brl0(Math.abs(x.sobra))}</span></div>`;
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
  ["l", "f", "r", "c", "m", "mot"].forEach((k) => { const p = $("pane-" + k); p.hidden = S.tab !== k; if (S.tab !== k) p.innerHTML = ""; });
  $("tab-mot").hidden = !(S.prefs.motorista?.usa || S.tab === "mot");   // a aba do motorista só aparece para quem usa
  if (S.tab === "l") paneL(c); else if (S.tab === "f") paneF(c, "Despesa"); else if (S.tab === "r") paneF(c, "Receita"); else if (S.tab === "m") paneM(c); else if (S.tab === "mot") paneMot(); else paneC(c);
}
function armDelete(b, fn, rotulo = "Confirmar") {
  b.addEventListener("click", () => {
    if (b.classList.contains("arm")) return fn();
    const orig = b.innerHTML; b.classList.add("arm"); b.textContent = rotulo;
    setTimeout(() => { if (b.isConnected) { b.classList.remove("arm"); b.innerHTML = orig; } }, 3000);
  });
}

/** Uma linha da lista de lançamentos. `comAno` mostra o ano junto da data (resultado de busca, que mistura meses). */
/** O tipo do lançamento em letras pequenas no extrato, como nos bancos: de onde ele vem. */
const tipoDoLanc = (x) => x.tipo === "Receita" ? "Entrada" : x.tipo === "Reserva" ? (x.forma === RETIRADA ? "Retirada" : x.forma === JA_TINHA ? "Já tinha" : "Guardado")
  : Number(x.parcelas) > 1 ? `${x.parcelas}x no cartão` : x.forma === CARTAO ? "No cartão" : "Dia a dia";
function linhaLanc(x, toque, comAno = false) {
  return `<tr data-id="${esc(x.id)}"${toque}><td class="d">${comAno ? ddmm(x.data) + "/" + x.data.slice(2, 4) : ddmm(x.data)}</td><td class="desc">${ava(x.categoria, x.tipo)}<span class="tx">${esc(x.descricao || x.categoria)}${x.pendente ? ` <span class="tag espera">aguardando internet</span>` : ""}${quemTag(x)}${marcaComprovante(x)}<span class="sub"><span class="tp">${tipoDoLanc(x)}</span>${esc(x.categoria)}${x.tipo === "Despesa" && x.forma ? " · " + esc(pagoCom(x)) : x.tipo === "Reserva" ? (x.forma === RETIRADA ? " · retirou" : " · guardou") : ""}</span></span></td><td class="hide-sm"><span class="tag">${esc(x.categoria)}</span></td>
      <td class="hide-sm" style="color:var(--ink-2);font-size:13px">${x.tipo === "Despesa" ? esc(pagoCom(x)) : x.tipo === "Receita" ? "Entrada" : x.forma === RETIRADA ? "Retirou" : x.forma === JA_TINHA ? "Já tinha" : "Guardou"}</td>
      <td class="num ${x.tipo === "Receita" ? "pos" : x.tipo === "Reserva" ? "res" : ""}">${x.tipo === "Receita" ? "+ " : x.tipo === "Reserva" ? (x.forma === RETIRADA ? "← " : "→ ") : "− "}${brl(x.valor)}</td>
      <td class="acts"><button class="act" type="button" data-ed="${esc(x.id)}" aria-label="Editar"><span class="hide-sm">Editar</span><span class="show-sm">${ico("editar")}</span></button><button class="del" type="button" data-del="${esc(x.id)}" aria-label="Excluir"><span class="hide-sm">Excluir</span><span class="show-sm">${ico("lixo")}</span></button></td></tr>`;
}
function paneL(c) {
  const host = $("pane-l");
  // A busca fica fora da parte que é redesenhada, para o teclado não fechar enquanto a pessoa digita.
  if (!$("lBusca")) {
    host.innerHTML = `<div class="busca"><label class="so-leitor" for="lBusca">Buscar lançamento</label>${ico("lupa")}<input class="in" id="lBusca" type="search" placeholder="Buscar em todos os meses" autocomplete="off" enterkeyhint="search" maxlength="60"><button type="button" class="busca-x" id="lBuscaX" aria-label="Limpar a busca" hidden>${ico("x")}</button></div><div class="filtros" id="lFiltros" role="group" aria-label="Filtrar o extrato"></div><div class="seg quem-filtro" id="lQuem" role="group" aria-label="De quem são os lançamentos" hidden></div><div id="lLista"></div>`;
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
  // Filtros: por tipo e por categoria, valem para o mês e também para a busca em todos os meses.
  const filtro = { tipo: S.fTipo || "", categoria: S.fCat || "" }, filtrando = Boolean(filtro.tipo || filtro.categoria);
  const catsDoExtrato = [...new Set(S.data.lancamentos.map((x) => x.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  $("lFiltros").innerHTML = `<div class="seg" role="group" aria-label="Tipo de lançamento">${[["", "Tudo"], ["Despesa", "Gastos"], ["Receita", "Entradas"], ["Reserva", "Guardado"]].map(([v, r]) => `<button type="button" data-ftipo="${v}" aria-pressed="${filtro.tipo === v}">${r}</button>`).join("")}</div>
    <details class="manual lf-mais"${filtro.categoria ? " open" : ""}><summary>Mais filtros${filtro.categoria ? ": " + esc(filtro.categoria) : ""}</summary>
    <label class="so-leitor" for="fCatSel">Categoria</label><select class="in" id="fCatSel"><option value="">Todas as categorias</option>${catsDoExtrato.map((c) => `<option${c === filtro.categoria ? " selected" : ""}>${esc(c)}</option>`).join("")}</select></details>
    ${filtrando ? `<button class="link" type="button" id="fLimpa">Limpar filtros</button>` : ""}`;
  $("lFiltros").querySelectorAll("[data-ftipo]").forEach((b) => (b.onclick = () => { S.fTipo = b.dataset.ftipo; listaL(calcMes(S.data, S.mes, hoje())); }));
  $("fCatSel").onchange = (e) => { S.fCat = e.target.value; listaL(calcMes(S.data, S.mes, hoje())); };
  if ($("fLimpa")) $("fLimpa").onclick = () => { S.fTipo = ""; S.fCat = ""; listaL(calcMes(S.data, S.mes, hoje())); };
  const cab = `<thead><tr><th>Dia</th><th>Descrição</th><th class="hide-sm">Categoria</th><th class="hide-sm">Pagamento</th><th class="num">Valor</th><th></th></tr></thead>`;
  if (q.length >= 2) {
    // Busca: todos os meses, do mais recente para o mais antigo, separados por mês.
    const r = buscaLancamentos(filtraLancamentos(S.data.lancamentos.filter(doQuem), filtro), q);
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
  const it = filtraLancamentos([...c.it, ...auto].filter(doQuem), filtro).sort((a, b) => b.data.localeCompare(a.data) || String(b.created_at || "").localeCompare(String(a.created_at || "")));
  if (!it.length && deQuem) { host.innerHTML = `<div class="welcome"><p><b>${deQuem === "eu" ? "Você não lançou nada" : `${esc(nomeDoOutro())} não lançou nada`} em ${nomeMes(S.mes)}.</b></p></div>`; return; }
  if (!it.length && filtrando) { host.innerHTML = `<div class="welcome"><p><b>Nenhum lançamento em ${nomeMes(S.mes)} com esse filtro.</b> Mude o tipo ou a categoria, ou toque em Limpar filtros.</p></div>`; return; }
  if (!it.length) {
    host.innerHTML = `<div class="welcome"><p><b>Nenhum lançamento em ${nomeMes(S.mes)}.</b> Anote cada gasto no formulário lá em cima assim que ele acontecer. O custo do mês e a projeção se atualizam na hora.</p><p>Usa cartão? Ao lançar uma compra, escolha <b>Cartão de crédito</b> e o cartão: ela entra na fatura certa, com parcelas.</p></div>`;
    return;
  }
  // No celular a lista é separada por dia, com o total gasto em cada um.
  const gastoDoDia = (d) => round2(it.filter((x) => !x.auto && x.tipo === "Despesa" && x.data === d).reduce((t, x) => t + x.valor, 0));
  const vhLista = minhaHora(), horasDoDia = (v) => { const t = vhLista && horasDeTrabalho(v, vhLista.valor); return t ? ` <small class="horas-dia">· ${t} de trabalho</small>` : ""; };
  const dia = (x, i) => i && it[i - 1].data === x.data ? "" : `<tr class="dia"><td colspan="6"><span>${rotuloDia(x.data)}</span>${gastoDoDia(x.data) ? `<b>− ${brl(gastoDoDia(x.data))}${horasDoDia(gastoDoDia(x.data))}</b>` : ""}</td></tr>`;
  host.innerHTML = `${dicaDoExtrato() ? `<p class="hint so-mobile" style="margin:-6px 0 10px">Toque para editar · deslize para a direita para repetir e para a esquerda para apagar (dá para desfazer).</p>` : ""}<div class="tbl"><table class="lanc">${cab}<tbody>${
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
    tr.addEventListener("click", (e) => { if (Date.now() - fimDeslizar < 450) return; if (noCelular() && !e.target.closest("button")) abre(); });
    tr.addEventListener("keydown", (e) => { if (noCelular() && e.target === tr && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); abre(); } });
  });
  if (noCelular()) ligaDeslizar($("pane-l"));
  $("pane-l").querySelectorAll("[data-del]").forEach((b) => armDelete(b, async () => {
    await apagaComDesfazer(b.dataset.del, () => conferirRepetidos());   // com "Desfazer", igual ao deslizar
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
    return `<tr class="toca-linha" data-frow="${esc(f.id)}"><td class="d">${quando}</td><td class="desc">${avaFoto("fixo", f.descricao) || ava(f.categoria, ent ? "Receita" : "Despesa")}<span class="tx">${esc(f.descricao)}${sem ? ` <span class="tag">semanal</span>` : ""}${prazo}<span class="sub">${quando} · ${esc(f.categoria)}${!ent && f.forma ? " · " + esc(pagoCom({ ...f, parcelas: 1 })) : ""}</span></span></td><td class="hide-sm"><span class="tag">${esc(f.categoria)}</span></td><td class="num ${ent ? "pos" : ""}">${ent ? "+ " : ""}${brl(f.valor)}</td>
      <td class="st">${status}</td>
      <td class="acts"><button class="act" type="button" data-fed="${esc(f.id)}" aria-label="Editar"><span class="hide-sm">Editar</span><span class="show-sm">${ico("editar")}</span></button><button class="del" type="button" data-end="${esc(f.id)}" title="Para de contar a partir deste mês">Encerrar</button></td></tr>`;
  }).join("");
  host.innerHTML = `<p class="hint" style="margin-top:0">${ent
      ? "Cadastre uma vez o que você recebe sempre, como o salário. A entrada é lançada sozinha, todo mês ou toda semana, no dia que você escolher."
      : "Cadastre uma vez o que se repete: todo mês, como o aluguel, ou toda semana, como o Uber de sexta ou a terapia. Entra no custo sozinho; é só marcar quando pagar. Acerto, acordo ou parcelamento: escolha até que mês vai."}</p>
   ${quadroDosPrazos(tipo)}
   ${fx.length ? `<div class="tbl"><table class="cards"><thead><tr><th>${ent ? "Recebe" : "Vence"}</th><th>Descrição</th><th class="hide-sm">Categoria</th><th class="num">Valor</th><th>${MES3[Number(S.mes.slice(5)) - 1]}</th><th></th></tr></thead><tbody>${rows}</tbody>
     <tfoot><tr><td class="d"></td><td style="font-weight:600">Total</td><td class="hide-sm"></td><td class="num" style="font-weight:600">${brl(ent ? c.frT : c.fxT)}</td><td colspan="2" class="vazio"></td></tr></tfoot></table></div>`
     : `<div class="empty">${ent ? "Nenhuma entrada fixa neste mês. Adicione seu salário, aposentadoria, aluguel que recebe…" : "Nenhuma conta fixa neste mês. Adicione aluguel, condomínio, internet, faculdade, parcelas…"}</div>`}
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
  host.querySelectorAll("tr[data-frow]").forEach((tr) => (tr.onclick = (e) => { if (!e.target.closest("button,a")) editarFixo(tr.dataset.frow); }));
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
    const ate = addM(S.mes, -1), { user_id, ...copia } = f, ateAntes = f.ate || null, ent = f.tipo === "Receita";
    const aviso = `${ent ? "Entrada" : "Conta"} ${f.descricao} encerrada a partir de ${nomeMes(S.mes)}.`;
    if (ate < mKey(f.desde)) {
      if (!(await grava(() => S.store.deleteFixo(f.id)))) return render();
      S.data.fixos = S.data.fixos.filter((z) => z.id !== f.id);
      render();
      toastDesfazer(aviso, async () => { let novo; if (await grava(async () => { novo = await S.store.addFixo(copia); })) { S.data.fixos.push(novo || copia); render(); } });
      return;
    }
    if (await grava(() => S.store.updateFixo(f.id, { ate: ate + "-01" }))) {
      f.ate = ate + "-01"; render();
      toastDesfazer(aviso, async () => { if (await grava(() => S.store.updateFixo(f.id, { ate: ateAntes }))) { f.ate = ateAntes; render(); } });
    } else render();
  }));
  $("formFx").addEventListener("submit", async (e) => {
    e.preventDefault();
    const v = parseMoney($("xVal").value); if (!(v > 0) || v > VALOR_MAX) { if (v > VALOR_MAX) toast(ALTO_DEMAIS); $("xVal").focus(); return; }
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
      const msg = `${row.ate ? (ent ? "Entrada com prazo adicionada" : "Conta com prazo adicionada") : ent ? "Entrada fixa adicionada" : "Conta fixa adicionada"}: ${row.descricao} · ${brl(row.valor)}${row.ate ? `, até ${mesAno(mKey(row.ate))} (${vezesTxt(nV)}, ${brl(round2(nV * row.valor))} no total)` : ""}.`;
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
    return `<li class="${off ? "off" : ""}" data-kid="${esc(k.id)}">${ava("", "Cartao")}<span class="oque"><b>${esc(k.nome)}${off ? ` <span class="tag">desativado</span>` : ""}</b>
      <span>Fecha dia ${pad(k.fechamento)} · vence dia ${pad(k.vencimento)}${prox ? ` · próxima fatura ${brl(prox.valor)} em ${ddmm(prox.vencimento)}` : ""}</span></span>
      <span class="acts"><button class="act" type="button" data-ked="${esc(k.id)}">Editar</button>${off ? `<button class="act" type="button" data-kon="${esc(k.id)}">Reativar</button>`
        : usados.has(k.id) ? `<button class="act" type="button" data-koff="${esc(k.id)}" title="Sai da lista de novas compras; as faturas continuam">Desativar</button>` : ""}<button class="del icone" type="button" data-kapaga="${esc(k.id)}" aria-label="Apagar o cartão ${esc(k.nome)}" title="Apagar o cartão">${ico("lixo")}</button></span></li>`;
  };
  const linhaFatura = (x, i) => {
    const venc = ddmmaa(x.vencimento), paga = x.status === "Paga";
    return `<tr class="toca-linha" data-frow2="${i}"><td class="d">${venc}</td><td class="desc">${ava("", "Cartao")}<span class="tx">${esc(x.cartao)}${mKey(x.vencimento) < S.mes ? ` <span class="tag">mês anterior</span>` : ""}${x.auto && x.valor_fixo ? ` <span class="tag">valor corrigido</span>` : ""}
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
   ${cartoes.length ? `<details class="novo-cartao"><summary>Adicionar outro cartão</summary>` : ""}<form class="addrow kc" id="formK" autocomplete="off">
     <label class="f">Nome do cartão<input class="in" id="kNome" required maxlength="40" placeholder="Ex.: Nubank"></label>
     <label class="f">Dia que a fatura fecha<input class="in" id="kFech" type="number" inputmode="numeric" min="1" max="31" required placeholder="Ex.: 3"></label>
     <label class="f">Dia que a fatura vence<input class="in" id="kVenc" type="number" inputmode="numeric" min="1" max="31" required placeholder="Ex.: 10"></label>
     <button class="btn primary" type="submit">Adicionar cartão</button>
     ${soltos.length ? `<label class="check"><input type="checkbox" id="kLigar" ${cartoes.length ? "" : "checked"}> Usar este cartão nas ${soltos.length} ${soltos.length === 1 ? "compra no cartão que já lancei" : "compras no cartão que já lancei"} sem cartão escolhido</label>` : ""}
   </form>${cartoes.length ? `</details>` : ""}
   <h3 class="sub-h">Faturas de ${nomeMes(S.mes)}</h3><div class="fat-acoes"><button class="btn sm ler" type="button" id="lerFatura">${ico("camera")}Ler fatura</button>${IMPORTA_EXTRATO ? `<button class="btn sm ler" type="button" id="impExtrato">${ico("subir")}Importar extrato</button>` : ""}<button class="btn sm ler" type="button" id="expCartao">${ico("baixar")}Exportar</button></div>
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
  host.querySelectorAll("tr[data-frow2]").forEach((tr) => (tr.onclick = (e) => { if (!e.target.closest("button,a")) editarFatura(vis[Number(tr.dataset.frow2)]); }));
  $("lerFatura").onclick = () => abrirLeitor("fatura");
  if ($("impExtrato")) $("impExtrato").onclick = abrirExtrato;
  $("expCartao").onclick = () => exportarCartao("", "fatura");
  host.querySelectorAll("[data-cdel]").forEach((b) => armDelete(b, async () => {
    const id = b.dataset.cdel;
    const { user_id, ...copiaF } = S.data.faturas.find((z) => z.id === id) || {};
    if (await grava(() => S.store.deleteFatura(id))) {
      S.data.faturas = S.data.faturas.filter((z) => z.id !== id); render();
      if (copiaF.id) toastDesfazer("Fatura apagada.", async () => { let nova; if (await grava(async () => { nova = await S.store.addFatura(copiaF); })) { S.data.faturas.push(nova || copiaF); render(); } });
    }
  }));
  host.querySelectorAll("[data-ked]").forEach((b) => (b.onclick = () => editarCartao(b.dataset.ked)));
  host.querySelectorAll("[data-kon]").forEach((b) => (b.onclick = async () => {
    const k = cartaoPorId(b.dataset.kon); if (k && await grava(() => S.store.updateCartao(k.id, { ativo: true }))) k.ativo = true; render();
  }));
  // Desativar: o cartão sai da lista de novas compras e as faturas dele continuam valendo. Apagar tira o cartão (e, se a pessoa quiser, as compras).
  host.querySelectorAll("[data-koff]").forEach((b) => (b.onclick = async () => {
    const k = cartaoPorId(b.dataset.koff); if (k && await grava(() => S.store.updateCartao(k.id, { ativo: false }))) k.ativo = false;
    render();
  }));
  host.querySelectorAll("[data-kapaga]").forEach((b) => (b.onclick = () => apagarCartao(b.dataset.kapaga)));
  ligaDeslizarLinha(host, "ul.cartoes li[data-kid]", (el) => apagarCartao(el.dataset.kid));
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
    const v = parseMoney($("cVal").value); if (!(v > 0) || v > VALOR_MAX) { if (v > VALOR_MAX) toast(ALTO_DEMAIS); $("cVal").focus(); return; }
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
ligaNovaCategoria($("fCat"), () => S.tipo, () => $("fDesc").value, (nome, nova) => {
  renderForm(); $("fCat").value = nome; S.catManual = true; render();
  const fl = $("flash"); fl.style.color = "var(--good)"; fl.textContent = nova ? `${S.tipo === "Reserva" ? "Caixinha" : "Categoria"} ${nome} criada e escolhida.` : `${nome} já existia: escolhida.`;
});
$("fCat").addEventListener("change", () => { S.catManual = true; });
$("fCartao").addEventListener("change", () => { S.formaManual = true; $("fNovo").hidden = $("fCartao").value !== NOVO_CARTAO; if (!$("fNovo").hidden) $("fNNome").focus(); });
$("fNovoHost").innerHTML = htmlNovoCartao("f");
/** No formulário de lançar: se a pessoa escolheu "+ Outro cartão", cadastra agora e deixa o novo escolhido. Devolve o aviso extra, ou null se deu erro (já mostrado). */
async function resolveNovoCartaoForm() {
  if (!(S.tipo === "Despesa" && $("fForma").value === CARTAO && $("fCartao").value === NOVO_CARTAO)) return "";
  const r = await criaCartaoRapido("f");
  if (r.erro) { const fl = $("flash"); fl.style.color = "var(--bad)"; fl.textContent = r.erro; return null; }
  const fk = $("fCartao"); fk.innerHTML = optsCartao(r.id, "", true); fk.value = r.id; fk.dataset.k = cartoesAtivos().map((z) => z.id + z.nome).join("|");
  $("fNovo").hidden = true; $("fNNome").value = ""; $("fNFech").value = ""; $("fNVenc").value = "";
  return avisoCartaoPadrao(r);
}
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
/* Data em três toques: quase tudo é lançado no próprio dia. "Outro dia" mostra o calendário do aparelho.
   O campo de data continua sendo a fonte da verdade; os botões só escrevem nele. */
const ontemISO = () => { const o = new Date(hoje() + "T12:00:00"); o.setDate(o.getDate() - 1); return toISO(o); };
let diaOutroAberto = false;
function syncDiaChips() {
  const v = $("fData").value || hoje(), qual = diaOutroAberto ? "outro" : v === hoje() ? "hoje" : v === ontemISO() ? "ontem" : "outro";
  $("fDiaChips").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.dia === qual)));
  $("fData").hidden = qual !== "outro";
}
$("fDiaChips").addEventListener("click", (e) => {
  const b = e.target.closest("[data-dia]"); if (!b) return;
  const fd = $("fData");
  if (b.dataset.dia === "outro") { diaOutroAberto = true; syncDiaChips(); try { fd.showPicker?.(); } catch { fd.focus(); } return; }
  diaOutroAberto = false; fd.value = b.dataset.dia === "hoje" ? hoje() : ontemISO(); renderForm(); mostraEfeito();
});
/** Ao abrir o formulário limpo, já vem marcada a forma de pagamento que a pessoa mais usa (se ela não escolheu outra). */
function formaDoCostume() {
  if (S.tipo !== "Despesa" || S.formaManual || $("fValor").value) return;
  const f = formaMaisUsada(S.data?.lancamentos, hoje());
  if (f && $("fForma").value !== f) { $("fForma").value = f; renderForm(); }
}
$("fForma").addEventListener("change", () => { S.formaManual = true; $("fComoAntes").hidden = true; renderForm(); mostraEfeito(); });
/** "12+8,50" vira 20,50 no campo (ao sair do campo, no "=" ou ao lançar). */
function normalizaConta() {
  const r = avaliaConta($("fValor").value);
  if (r !== null) { $("fValor").value = r.toLocaleString("pt-BR", { minimumFractionDigits: 2 }); mostraConta(); mostraEfeito(); }
  return r;
}
function mostraConta() {
  const r = avaliaConta($("fValor").value), el = $("fContaRes");
  el.hidden = r === null; if (r !== null) el.textContent = `= ${brl(r)}`;
}
$("fContaBtn").onclick = () => { const w = $("fContaWrap"); w.hidden = !w.hidden; if (!w.hidden) $("fValor").focus(); };
$("fContaWrap").addEventListener("click", (e) => {
  const b = e.target.closest("[data-op]"); if (!b) return;
  if (b.dataset.op === "=") { normalizaConta(); return $("fValor").focus(); }
  const v = $("fValor").value.trim();
  if (!v) return $("fValor").focus();
  $("fValor").value = v.replace(/\s*[+\-×÷x*/]$/, "") + " " + b.dataset.op + " "; mostraConta(); $("fValor").focus();
});
$("fValor").addEventListener("change", normalizaConta);
$("fValor").addEventListener("input", () => { mostraConta(); });
$("fValor").addEventListener("input", () => { rotuloDoOk(); mostraEfeito(); if (!$("fCartaoLinha").hidden || !$("fPrazoDica").hidden) renderForm(); });
/** "Livre agora → depois": o efeito do gasto na sobra do mês, antes de confirmar (só no mês atual, e só para gasto fora do cartão). */
function mostraEfeito() {
  mostraHoras();
  const el = $("fEfeito"), v = valorDoCampo(), d = $("fData").value || hoje();
  const jaTinha = S.tipo === "Reserva" && $("fForma").value === "Já tinha guardado";
  if (jaTinha) { el.hidden = false; el.textContent = "Dinheiro que você já tinha: não sai do seu saldo do mês"; return mostraContasSemCobrir(); }
  const conta = S.loaded && v > 0 && S.tipo !== "Receita" && mKey(d) === mKey(hoje()) && !(S.tipo === "Despesa" && $("fForma").value === CARTAO) && !$("fFixo").checked && !(S.tipo === "Reserva" && $("fForma").value === "Retirar");
  el.hidden = !conta; if (!conta) return mostraContasSemCobrir();
  const livre = raioX(calcMes(S.data, mKey(hoje()), hoje())).sobra, depois = round2(livre - v);
  el.innerHTML = `Livre agora ${brl(livre)} → depois <b class="${depois < 0 ? "txt-bad" : ""}">${brl(depois)}</b>`;
  mostraContasSemCobrir();
}
/** Quanto vale 1 hora da pessoa (informado em "Quanto vale minha hora" ou, sem isso, o lucro por hora dos turnos). */
function minhaHora() {
  const hj = hoje(), m = motDados();
  return valorDaHora(S.prefs.hora, m.turnos.length ? resumoTurnos(m.turnos, toISO(new Date(Date.now() - 30 * 864e5)), hj, S.prefs.veiculo || {}) : null);
}
/** " · X de trabalho" para somar ao resumo de um valor; vazio se a pessoa ainda não tem o valor da hora. */
function emHoras(valor, complemento = "") {
  const vh = valor > 0 ? minhaHora() : null, t = vh ? horasDeTrabalho(valor, vh.valor) : null;
  return t ? ` · ${t} de trabalho${complemento ? " " + complemento : ""}` : "";
}
/** Mostra "Isso é X de trabalho" embaixo do valor, só para gasto. */
function mostraHoras() {
  const el = $("fHoras"); if (!el) return;
  const v = valorDoCampo(), vh = S.tipo === "Despesa" && v > 0 && v <= VALOR_MAX ? minhaHora() : null, t = vh ? horasDeTrabalho(v, vh.valor) : null;
  el.hidden = !t; el.textContent = t ? `Isso é ${t} do seu trabalho (sua hora vale ${brl(vh.valor)})` : "";
}
/** Contas do mês que este gasto deixa sem cobrir (a conta só vale para gasto à vista, no mês de hoje). */
function contasSemCobrirDoForm() {
  const v = valorDoCampo(), d = $("fData").value || hoje();
  if (!S.loaded || motDados().ativo || !(v > 0) || v > VALOR_MAX || S.tipo !== "Despesa" || mKey(d) !== mKey(hoje()) || $("fForma").value === CARTAO || $("fFixo").checked) return null;
  const antes = contasQueNaoFecham(S.data, hoje(), 0), com = contasQueNaoFecham(S.data, hoje(), v);
  return com.totalQueFalta > antes.totalQueFalta ? { antes, com } : null;
}
const listaDeContas = (r) => r.naoFecham.map((x) => `${esc(x.titulo)} (${ddmm(x.data)})`).join(", ");
function mostraContasSemCobrir() {
  const el = $("fContas"); if (!el) return;
  const r = contasSemCobrirDoForm();
  el.hidden = !r; if (!r) { el.textContent = ""; return; }
  el.innerHTML = `Com esse gasto, não dá para pagar: <b>${listaDeContas(r.com)}</b>. Faltam ${brl(r.com.totalQueFalta)}${r.antes.totalQueFalta > 0 ? ` (antes já faltavam ${brl(r.antes.totalQueFalta)})` : ""}.`;
}
/** Na hora de lançar: se o gasto deixa conta sem cobrir, a pessoa vê quais e decide. Não bloqueia, porque o gasto já aconteceu. */
function confirmaSemCobrir(r) {
  return new Promise((responde) => {
    let resp = "voltar";
    openDlg(`<h3>Cuidado: o dinheiro do mês não cobre tudo</h3>
      <p class="hint" style="margin:0 0 8px;font-size:15px">Com este gasto, vão faltar <b>${brl(r.com.totalQueFalta)}</b> para pagar:</p>
      <ul class="itens" style="margin:0 0 12px">${r.com.naoFecham.map((x) => `<li><span></span><span>${esc(x.titulo)}</span><b>${ddmm(x.data)}</b></li>`).join("")}</ul>
      <p class="hint" style="margin:0 0 12px;font-size:15px">Se você quer cumprir suas metas, evite gastar assim agora. Se dá para adiar, adie. Se é necessário, lance e veja em <b>Pôr o mês em ordem</b> um jeito leve de fechar essa conta.</p>
      <div class="actions"><button class="btn" type="button" id="scSim">Lançar mesmo assim</button><button class="btn primary" type="button" id="scNao">Voltar</button></div>`);
    $("scSim").onclick = () => { resp = "lancar"; $("dlg").close(); };
    $("scNao").onclick = () => { resp = "voltar"; $("dlg").close(); };
    $("dlg").addEventListener("close", () => responde(resp), { once: true });
    $("scNao").focus();
  });
}   // atualiza o valor de cada parcela e o total do prazo
$("fRepete").addEventListener("change", renderForm);
$("fAte").addEventListener("change", renderForm);
// "Quantas vezes?" no formulário de lançar: a base é a mesma que monta as opções do "Vai até".
ligaVezes($("fVezes"), $("fAte"), () => { const dt = $("fData").value || hoje(), sem = $("fRepete").value === "semanal";
  return { tipo: S.tipo, desde: sem ? dt : mKey(dt) + "-01", dia: sem ? 1 : Number(dt.slice(8, 10)), ...(sem ? { repete: "semanal", dia_semana: diaDaSemana(dt) } : {}) }; });
$("fIrCartoes").onclick = () => { fecharLancar(); S.view = "listas"; S.tab = "c"; render(); $("kNome")?.focus(); };

/* ================= celular: navegação, lançamento em tela cheia e menu ================= */
let toastT;
/* Valor digitado: maior que zero e sem zero sobrando. O teto (quase R$ 10 milhões) cobre qualquer conta pessoal
   e pega o engano comum de digitar zeros a mais, que estragaria o mês inteiro e a tela. */
const ALTO_DEMAIS = `Esse valor passa de ${brl(VALOR_MAX)}. Confira se não sobrou algum zero.`;
const avisoValor = (v, ex = "25,90") => (!(v > 0) ? `Digite um valor maior que zero, por exemplo ${ex}.` : v > VALOR_MAX ? ALTO_DEMAIS : "");
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
/* Loja do Google: só existe depois de publicar o app (js/config.js → PLAY_PACOTE, e docs/google-play.md).
   Quando existe, é o caminho mais simples no Android, principalmente em Xiaomi, Redmi e Poco. */
const linkDaPlay = () => (PLAY_PACOTE ? `https://play.google.com/store/apps/details?id=${encodeURIComponent(PLAY_PACOTE)}` : "");
const temPlay = () => Boolean(PLAY_PACOTE) && /Android/.test(UA);
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
  const naPlay = temPlay()
    ? `<div class="actions" style="justify-content:flex-start;margin:0 0 10px"><a class="btn primary" href="${linkDaPlay()}" target="_blank" rel="noopener">Baixar no Google Play</a></div>
       <p class="hint" style="margin:0 0 14px;font-size:14px">Na loja do Google a instalação é igual à de qualquer aplicativo. Se preferir instalar pelo navegador, siga abaixo.</p>`
    : "";
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
  openDlg(`<h3>Instalar o Meus Gastos</h3>${naPlay}<p class="hint" style="margin:0 0 10px;font-size:14px">${corpo[0]}</p>${corpo[1]}
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
  document.body.classList.add("lancando"); ofereceCopiado(); $("flash").textContent = ""; diaOutroAberto = false; formaDoCostume(); syncDiaChips();
  try { if (!history.state?.lanc) history.pushState({ lanc: true }, ""); } catch { /* sem histórico: o ✕ fecha */ }   // o botão Voltar do celular fecha a tela
  // O foco vai para o valor na hora do toque: o iPhone só abre o teclado quando o foco vem direto do toque,
  // e não de um setTimeout. O setTimeout fica só para quando a tela abre sem toque (compartilhar, atalho).
  const v = $("fValor"); v.focus({ preventScroll: true });
  if (document.activeElement !== v) setTimeout(() => v.focus(), 50);
}
function fecharLancar(viaVoltar = false) {
  if (!document.body.classList.contains("lancando")) return;
  document.body.classList.remove("lancando");
  try { escuta.cancelar(); } catch { /* a escuta ainda não existe */ }   // sair da tela de lançar fecha o microfone
  try { if (!viaVoltar && history.state?.lanc) history.back(); } catch { /* nada */ }
}
/** Depois de salvar: no celular fecha a tela e mostra um aviso; no computador volta o foco para o valor. */
/** Nível do limite do mês atual: 0, 80, 100 ou 120 (ver usoDoTeto). */
const nivelDoTeto = () => usoDoTeto(calcMes(S.data, mKey(hoje()), hoje()), S.prefs.teto)?.nivel || 0;
function aposLancar(texto) { if (noCelular()) { fecharLancar(); toast(texto); } else $("fValor").focus(); }
/** Telas que, no celular, abrem a partir de Mais: contas fixas, entradas fixas e cartões. */
const SUBS = ["f", "r", "c", "m", "mot"];   // telas de uma função: abrem por cima, com Voltar no alto e sem a barra de baixo
// Botão Voltar do celular: fecha a tela de lançar; em uma tela aberta a partir de Mais, volta para Mais.
addEventListener("popstate", (e) => {
  if (S.ignoraPop) {   // foi o próprio app que voltou, ao fechar um quadro
    S.ignoraPop = false;
    // Um quadro novo abriu enquanto a volta acontecia: agora sim ganha a sua entrada no histórico.
    if (S.empurraQuadro) { S.empurraQuadro = false; if ($("dlg").open) try { history.pushState({ ...(history.state || {}), dlg: true }, ""); S.dlgNoHist = true; } catch { /* nada */ } }
    return;
  }
  if ($("dlg").open) { S.dlgPeloVoltar = true; S.dlgNoHist = false; return $("dlg").close(); }
  if (document.body.classList.contains("lancando")) return fecharLancar(true);
  if (S.view === "listas" && S.tab === "mot" && (motSub || motFechando)) { motSub = null; motFechando = false; render(); scrollTo(0, 0); return; }   // Voltar do celular dentro de uma subtela da jornada
  // Toque em Início com telas abertas por cima: volta o histórico até o começo, uma entrada por vez.
  if (S.paraInicio) { if (e.state?.aba || e.state?.sub) return history.back(); S.paraInicio = false; S.view = "inicio"; render(); scrollTo(0, 0); return; }
  if (!e.state?.sub && noCelular() && S.view === "analise") { sairDaAnalise(); return; }
  if (!e.state?.sub && noCelular() && S.view === "listas" && SUBS.includes(S.tab)) { S.view = S.origem === "mais" ? "mais" : "inicio"; render(); scrollTo(0, 0); }   // volta para onde a pessoa estava
  // Em Extrato, Planejar ou Mais, o Voltar leva ao Início (como nos apps de banco); só no Início ele sai do app.
  else if (!e.state?.sub && noCelular() && S.view !== "inicio" && !(e.state?.aba && S.view === "mais")) { S.view = "inicio"; render(); scrollTo(0, 0); }
});
$("lancFechar").onclick = () => fecharLancar();
$("bnav").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  const n = b.dataset.nav;
  if (n === "mais") return abrirLancar();
  if (n === "ferr") return ferramentas();   // calculadoras, carro, casa e as outras ferramentas
  if (n === "merc") return mercado();       // a lista de mercado abre direto, de qualquer tela
  if (n === "inicio") { if (history.state?.aba || history.state?.sub) { S.paraInicio = true; return history.back(); } S.view = "inicio"; }   // a volta leva ao Início (popstate)
  else {
    if (n === "menu") S.view = "mais"; else { S.view = "listas"; S.tab = n; }
    // Uma entrada no histórico para as abas: o Voltar do celular volta ao Início em vez de fechar o app.
    try { if (noCelular() && !history.state?.aba && !history.state?.sub) history.pushState({ aba: true }, ""); } catch { /* nada */ }
  }
  render(); scrollTo(0, 0);
});
/** Celular: abre a tela Análise do mês (a partir do Início ou do Planejar); o Voltar devolve para onde a pessoa estava. */
function abrirAnalise() {
  S.analiseDe = S.view === "listas" && S.tab === "m" ? "m" : S.view === "mais" ? "mais" : "inicio";
  S.view = "analise";
  try { if (!history.state?.sub) history.pushState({ sub: true }, ""); } catch { /* sem histórico: o botão Voltar da tela resolve */ }
  render(); scrollTo(0, 0);
}
function sairDaAnalise() {
  if (S.analiseDe === "m") { S.view = "listas"; S.tab = "m"; } else S.view = S.analiseDe === "mais" ? "mais" : "inicio";
  render(); scrollTo(0, 0);
}
$("irAnaliseBtn").onclick = abrirAnalise;
$("analiseVoltar").onclick = () => { if (history.state?.sub) history.back(); else sairDaAnalise(); };
$("pane-m").addEventListener("click", (e) => { if (e.target.closest("[data-analise]")) abrirAnalise(); });
function abrirSub(tab) {
  if (S.view !== "listas") S.origem = S.view === "mais" ? "mais" : "inicio";   // o Voltar leva de volta para onde a pessoa estava
  S.view = "listas"; S.tab = tab;
  try { if (!history.state?.sub) history.pushState({ sub: true }, ""); } catch { /* sem histórico: o botão Mais da tela volta */ }
  render(); scrollTo(0, 0);
}
$("listaVoltar").onclick = () => { if (S.tab === "mot" && (motSub || motFechando)) return motSai(); if (history.state?.sub) history.back(); else { S.view = S.origem === "mais" ? "mais" : "inicio"; render(); scrollTo(0, 0); } };

/** As ferramentas, em grupos. A tela Mais (celular) e o botão Ferramentas (computador) leem a mesma lista. */
const GRUPOS_FERR = [
  { titulo: "No dia a dia", itens: [
    { id: "motorista", k: "uber 99 indrive motorista aplicativo corrida turno rodar renda extra", ico: "carro", t: "Modo motorista", s: "Inicie o turno, veja o lucro do dia e quanto rodar para fechar o mês" },
    { id: "mercado", k: "supermercado compras feira carrinho comprar", ico: "carrinho", t: "Lista de mercado", s: "Anote o que comprar, estime o gasto e lance ao finalizar" },
    { id: "veiculo", k: "gasolina combustivel ipva seguro oficina moto", ico: "carro", t: "Custo do carro ou moto", s: "Quanto custa por mês, por dia e por km" },
    { id: "hora", k: "hora trabalho salario quanto vale quanto custa em horas tempo", ico: "alvo", t: "Quanto vale minha hora", s: "Veja quantas horas de trabalho cada compra custa" },
    { id: "casa", k: "aluguel condominio luz agua iptu moradia", ico: "casa", t: "Custo da casa", s: "Quanto a casa custa por mês e quanto pesa na renda" },
    { id: "msg", k: "sms notificacao banco colar importar", ico: "clipe", t: "Colar mensagem do banco", s: "A notificação ou o SMS vira um lançamento" },
    { id: "arrumar", k: "arrumar limpar corrigir transferencia propria conta categoria lote outros pix cartao", ico: "lupa", t: "Arrumar lançamentos", s: "Tirar transferências entre as suas contas e dar categoria a vários de uma vez" },
    { id: "revisar", k: "revisar conferir categoria outros classificar fila pendente", ico: "lupa", t: "Para revisar",
      get s() { const n = S.loaded ? paraRevisar(S.data, hoje(), { revisados: S.prefs.revisados || [] }).total : 0; return n ? `${n} ${n === 1 ? "lançamento ficou" : "lançamentos ficaram"} em "Outros"` : "Lançamentos sem categoria, para você conferir"; } }] },
  { titulo: "Guardar e planejar", itens: [
    { id: "ordem", k: "atraso atrasada devendo negativo vermelho recomecar zerar virar pagina equilibrar recuperar reserva imprevisto buraco", ico: "cofre", t: "Pôr o mês em ordem", s: "Contas, atrasos, um jeito leve de recomeçar e sua reserva" },
    { id: "revisao", k: "fechar mes balanco resumo", ico: "grafico", t: "Revisão do mês", s: "3 passos: como foi, onde ajustar e quanto guardar" },
    { id: "desafio", k: "economizar guardar semanal poupar cofrinho", ico: "alvo", t: "Desafio de economia", s: "Guarde um valor por semana e acompanhe" },
    { id: "calc", k: "ferias decimo terceiro juros parcelas rendimento investir divida simulador", ico: "calc", t: "Calculadoras", s: "Rendimento, parcelas, juros, férias e 13º" },
    { id: "dica", k: "habito economia ideia", ico: "luz", t: "Dicas para guardar dinheiro", s: "Um hábito pequeno por dia" }] },
  { titulo: "Entender e comemorar", itens: [
    { id: "graficos", k: "graficos grafico analise mes custo categoria sobra evolucao ultimos meses", ico: "grafico", t: "Gráficos do mês", s: "Sobra, custo acumulado, categorias e últimos meses" },
    { id: "ganhogasto", k: "ganho contra gasto horas trabalhadas quanto sobrou quanto trabalhei sobra mes quitado", ico: "grafico", t: "Ganho contra gasto", s: "Horas trabalhadas, ganho, gasto e quanto sobrou no mês" },
    { id: "pof", k: "para onde foi dinheiro gastei categoria mes anterior onde errei melhorar compara", ico: "grafico", t: "Para onde foi o dinheiro", s: "Quanto gastou, o que mudou desde o mês passado e o que fazer" },
    { id: "desemp", k: "comparar evolucao", ico: "rumo", t: "Meu desempenho", s: "O seu mês em frases, comparado com os outros" },
    { id: "ano", k: "anual relatorio ano", ico: "grafico", t: "Resumo do ano", s: "Mês a mês, melhor e pior mês e para onde foi o dinheiro" },
    { id: "assin", k: "assinaturas streaming netflix spotify recorrente mensalidade cobranca renovacao academia aplicativo", ico: "fixo", t: "Assinaturas", s: "O que se repete todo mês e quanto custa por ano" },
    { id: "conq", k: "medalhas premios", ico: "medalha", t: "Conquistas", s: "As medalhas que você já ganhou e as próximas" }] },
  { titulo: "Levar com você", itens: [
    { id: "share", k: "imagem compartilhar redes status", ico: "imagem", t: "Compartilhar o mês", s: "Uma imagem do seu mês, com ou sem os valores" },
    { id: "btnExport", k: "excel pdf csv planilha exportar baixar", ico: "baixar", t: "Exportar relatório", s: "Excel, PDF ou CSV" },
    { id: "copia", k: "backup restaurar seguranca", ico: "baixar", t: "Cópia de segurança", s: "Baixe tudo num arquivo e restaure quando precisar" }] },
];
/**
 * Telas que reúnem várias ferramentas parecidas, para o menu Mais não ter 30 linhas.
 * Cada uma abre uma tela cheia com as opções e uma frase dizendo para que serve cada uma.
 */
const HUBS = {
  conferir: { ico: "lupa", t: "Conferir meus lançamentos", s: "Tirar o que está repetido e dar categoria ao que ficou em \"Outros\"", k: "arrumar limpar corrigir revisar conferir repetido duplicado outros categoria transferencia",
    intro: "Deixe os lançamentos certos para os números do app baterem com a sua vida.", itens: ["arrumar", "revisar"] },
  analise: { ico: "rumo", t: "Resumo do mês", s: "Como foi, para onde foi, o que ajustar, o ano e as assinaturas", k: "analise relatorio resumo revisao fechar balanco atraso ordem comparar evolucao ano assinaturas conquistas onde gastei",
    intro: "Escolha o que você quer entender sobre o seu dinheiro.", itens: ["revisao", "graficos", "pof", "ordem", "ganhogasto", "desemp", "ano", "assin", "conq"] },
  baixar: { ico: "baixar", t: "Exportar e backup", s: "Relatório em Excel, PDF ou CSV e cópia de segurança", k: "excel pdf csv planilha exportar baixar backup restaurar seguranca",
    intro: "Leve os seus dados com você ou guarde uma cópia.", itens: ["btnExport", "copia"] },
  ajuda: { ico: "ajuda", t: "Ajuda", s: "Como usar, o que mudou e como falar com a gente", k: "ajuda duvida tutorial suporte novidades versao sugestao feedback problema",
    intro: "Dúvidas, novidades e sugestões.", itens: ["btnAjuda", "novidades", "btnSugerir"] },
};
const GRUPOS_MAIS = [
  { titulo: "Seu dia a dia", ids: ["motorista", "mercado", "veiculo", "casa"] },
  { titulo: "Meu mês", ids: ["analise", "conferir", "msg"] },
  { titulo: "Guardar e aprender", ids: ["desafio", "calc", "dica"] },
  { titulo: "Levar com você", ids: ["share", "baixar"] },
];
const TODAS_FERR = () => [...GRUPOS_FERR.flatMap((g) => g.itens), ...Object.entries(HUBS).map(([id, h]) => ({ id, ...h }))];
function hubTela(id) {
  const h = HUBS[id]; if (!h) return;
  const todas = [...TODAS_FERR(), ...DESTINOS], icoDe = { btnAjuda: "ajuda", novidades: "presente", btnSugerir: "editar" }, linha = (x) => `<button class="mais-item" type="button" data-go="${x.id}"><span class="ic-box">${ico(x.ico || icoDe[x.id] || "lupa")}</span><span class="tx"><b>${esc(x.t)}</b><span>${x.s}</span></span>${ico("chev")}</button>`;
  openDlg(`<h3>${esc(h.t)}</h3><p class="hint" style="margin:0 2px 12px">${esc(h.intro)}</p>
    <div class="caixa-mais">${h.itens.map((i) => todas.find((x) => x.id === i)).filter(Boolean).map(linha).join("")}</div>
    <div class="actions"><button class="btn" type="button" data-close>Fechar</button></div>`);
  $("dlg").querySelectorAll("[data-go]").forEach((b) => (b.onclick = () => { const alvo = b.dataset.go; $("dlg").close(); setTimeout(() => vaiPara(alvo), 120); }));
}
/* ---------- Pôr o mês em ordem: contas, atrasos, recomeço e reserva, sem culpa ---------- */
function equilibrioTela(mesPedido) {
  const hj = hoje(), m = mesPedido || (S.mes > mKey(hj) ? mKey(hj) : S.mes), mes = nomeMes(m), viradas = S.prefs.mesesVirados || [];
  const p = planoDoMes(S.data, m, hj, { desde: S.prefs.saldoDesde, inicial: S.prefs.saldoInicial, viradas, levar: S.prefs.levarSaldo });
  const at = contasEmAtraso(S.data, hj, S.prefs.saldoDesde), plural = (n, a, b) => `${n} ${n === 1 ? a : b}`;
  const li = (t, v, forte = false, sub = "") => `<li class="${forte ? "tot" : ""}"><span></span><span>${t}${sub ? `<span class="mini">${sub}</span>` : ""}</span><b>${v}</b></li>`;
  const dias1 = (v) => String(Math.round(v * 10) / 10).replace(".", ",");
  // 1) o mês
  const mesHtml = `<ul class="itens">${li("Entradas", "+ " + brl(p.entradas))}${li("Contas do mês", "− " + brl(p.contasDoMes), false, p.aPagar > 0 ? `${brl(p.aPagar)} ainda a pagar` : "tudo pago")}${li("Dia a dia", "− " + brl(p.diaADia))}${p.guardadoNoMes > 0 ? li("Guardado", "− " + brl(p.guardadoNoMes)) : ""}${li("Saldo do mês", sgn(p.saldoDoMes), true)}</ul>
    <p class="hint" style="margin:8px 0 0">${p.saldoDoMes >= 0 ? `${mes.charAt(0).toUpperCase() + mes.slice(1)} está fechando com sobra. Esse é o caminho.` : `Em ${mes}, as saídas passaram das entradas em ${brl(-p.saldoDoMes)}. Acontece, e dá para arrumar passo a passo.`}</p>`;
  // 2) atrasos
  const porMes = at.porMes.map((g) => `<details class="mes-bloco"${at.porMes.length === 1 ? " open" : ""}><summary><span class="mes-nome"><b>${nomeMes(g.mes)} de ${g.mes.slice(0, 4)}</b><span class="hint">${plural(g.n, "conta", "contas")} · ${brl(g.total)}</span></span></summary>
      <ul class="itens">${at.itens.map((i, k) => ({ i, k })).filter((x) => x.i.mes === g.mes).map(({ i, k }) => `<li><span></span><span>${esc(i.titulo)}<span class="mini">venceu dia ${ddmm(i.data)}</span></span><b>${brl(i.valor)}</b><button class="btn sm" type="button" data-pg="${k}">Já paguei</button></li>`).join("")}</ul>
      <p style="margin:6px 0 0"><button class="link" type="button" data-pgm="${g.mes}">Marcar ${nomeMes(g.mes)} todo como pago</button></p></details>`).join("");
  const atrasoHtml = at.itens.length ? `<p class="hint" style="margin:0 0 6px">${plural(at.itens.length, "conta venceu e ainda não foi marcada como paga", "contas venceram e ainda não foram marcadas como pagas")}. Se você já pagou, marque aqui para o app ficar certo.</p>${porMes}` : `<p class="hint" style="margin:0">Nenhuma conta em atraso. Tudo em dia.</p>`;
  // 3) o que falta
  let falta = "";
  if (p.fase === "atual" && p.faltaNoMes > 0) {
    falta += p.soCortarResolve
      ? `<p>Para fechar ${mes} sem faltar nada, dá para gastar cerca de <b>${brl(p.mediaDia - p.porDiaParaFechar)} por dia</b> no dia a dia (hoje a média é ${brl(p.mediaDia)}). Faltam ${plural(p.diasRestantes, "dia", "dias")}.</p>`
      : `<p>Mesmo sem gastar nada no dia a dia até o fim de ${mes}, ainda faltariam <b>${brl(p.faltaEntrar)}</b>. Nesse caso o caminho é entrar um dinheiro extra ou combinar o adiamento de uma conta.</p>`;
  }
  if (p.recomeco.length) {
    falta += `<p style="margin:10px 0 6px"><b>Um jeito calmo de repor ${brl(p.devido)}:</b></p><ul class="itens recomeco">${p.recomeco.map((o) => `<li class="${o.sugerida ? "sug" : ""}"><span></span><span>${o.meses === 1 ? "Em 1 mês" : `Em ${o.meses} meses`}${o.sugerida ? ` <span class="tag">sugerido</span>` : ""}<span class="mini">${brl(o.porMes)} por mês · ${brl(o.porSemana)} por semana · ${o.cabe ? "cabe no seu ritmo" : "mais do que costuma sobrar"}</span></span><b>${brl(o.porDia)}<small>/dia</small></b></li>`).join("")}</ul>
      <p class="hint" style="margin:8px 0 0">${p.sobraMedia > 0 ? `Nos últimos meses sobraram, em média, ${brl(p.sobraMedia)} por mês.` : "Nos últimos meses não sobrou dinheiro em média, por isso o prazo maior é o mais leve."} "Por dia" é quanto deixar sobrar a cada dia (o que você não gasta) para repor o que faltou.</p>`;
  }
  if (!falta) falta = `<p class="hint" style="margin:0">Nada falta por enquanto. Cada mês que fecha com sobra aumenta a sua tranquilidade.</p>`;
  // 4) reserva
  const un = p.gastoPorDia >= 50 ? 500 : 100;
  const reservaHtml = p.reserva > 0
    ? `<p>Você tem <b>${brl(p.reserva)}</b> guardado${p.diasDeReserva ? `. Isso paga cerca de <b>${plural(p.diasDeReserva, "dia", "dias")}</b> dos seus gastos` : ""}.${p.gastoPorDia > 0 ? ` Cada ${brl0(un)} que você guarda a mais compra mais ${dias1(un / p.gastoPorDia)} ${un / p.gastoPorDia >= 2 ? "dias" : "dia"} de tranquilidade.` : ""}</p>`
    : `<p>Você ainda não tem dinheiro guardado. Uma caixinha com só R$ 20 já começa a sua reserva para imprevistos.</p>`;
  // 5) virar a página
  const virar = p.virado
    ? `<p>Você virou a página de ${mes}. O saldo dele (${sgn(p.saldoDoMes)}) não passa para os próximos meses. Os lançamentos e as contas continuam todos aqui.</p><button class="btn" type="button" id="ordDesvirar" style="margin-left:0">Desfazer</button>`
    : p.saldoDoMes < 0 ? `<p>Virar a página tira o saldo de ${mes} (${sgn(p.saldoDoMes)}) da conta que passa para os meses seguintes, para você recomeçar limpo. Nada é apagado: lançamentos, contas e atrasos continuam aqui. Dá para desfazer quando quiser.</p><button class="btn primary" type="button" id="ordVirar" style="margin-left:0">Virar a página de ${mes}</button>`
    : `<p class="hint" style="margin:0">Se um mês fechar no vermelho, você pode virar a página dele aqui para recomeçar sem carregar esse saldo.</p>`;
  const bloco = (t, h) => `<h4 class="ferr-h">${t}</h4>${h}`;
  openDlg(`<h3>Pôr o mês em ordem</h3><p class="hint" style="margin:0 0 10px">Veja o tamanho das contas, o que ficou para trás e um jeito leve de recomeçar. Nada aqui apaga os seus lançamentos.</p>
    <div class="ordem">${bloco(`Como está ${mes}`, mesHtml)}${bloco("Contas em atraso", atrasoHtml)}${bloco("O que falta para sobrar", falta)}${bloco("Sua reserva para imprevistos", reservaHtml)}<p style="margin:6px 0 0"><button class="link" type="button" id="ordCaixinhas">Abrir minhas caixinhas</button></p>${bloco("Virar a página", virar)}</div>
    <div class="actions"><button class="btn" type="button" data-close>Fechar</button></div>`);
  const reabre = () => equilibrioTela(m);
  $("ordCaixinhas").onclick = () => { $("dlg").close(); setTimeout(() => vaiPara("m"), 120); };
  const salvaViradas = async (lista) => { S.prefs.mesesVirados = lista; await salvaPrefs(); render(); reabre(); };
  if ($("ordVirar")) $("ordVirar").onclick = () => salvaViradas([...new Set([...viradas, m])].sort()).then(() => toast(`Página de ${mes} virada. Recomeço limpo!`));
  if ($("ordDesvirar")) $("ordDesvirar").onclick = () => salvaViradas(viradas.filter((x) => x !== m));
  $("dlgBody").querySelectorAll("[data-pg]").forEach((b) => (b.onclick = async () => { b.disabled = true; await pagarConta(at.itens[Number(b.dataset.pg)]); reabre(); }));
  $("dlgBody").querySelectorAll("[data-pgm]").forEach((b) => (b.onclick = async () => {
    const lista = at.itens.filter((x) => x.mes === b.dataset.pgm); b.disabled = true; let n = 0;
    for (const x of lista) if (await mudaPago(x, true)) n++;
    toastDesfazer(`${plural(n, "conta marcada como paga", "contas marcadas como pagas")}.`, async () => { for (const x of lista) await mudaPago(x, false); toast("Voltaram para a lista."); });
    reabre();
  }));
}
function novidadesTela() {
  openDlg(`<h3>Novidades</h3><p class="hint" style="margin:0 0 12px">Você está na versão ${esc(APP_VERSAO)}. O app se atualiza sozinho.</p>
    ${NOVIDADES.slice(0, 3).map((v) => `<h4 class="ferr-h">Versão ${esc(v.versao)}</h4><ul class="casal-pontos">${v.itens.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`).join("")}
    <div class="actions"><button class="btn" type="button" data-close>Fechar</button></div>`);
}
/** Outras telas do app que a busca geral também sabe abrir. */
const DESTINOS = [
  { id: "l", t: "Lançamentos", s: "Todos os gastos e entradas do mês", k: "extrato lancamentos gastos historico lista" },
  { id: "f", t: "Contas fixas", s: "Aluguel, internet e o que se repete", k: "assinaturas recorrente mensal boleto" },
  { id: "r", t: "Entradas fixas", s: "Salário e o que entra todo mês", k: "salario renda receita" },
  { id: "c", t: "Cartões e faturas", s: "Cadastre o cartão e a fatura se monta sozinha", k: "cartao credito fatura parcelado" },
  { id: "cal", t: "Calendário de vencimentos", s: "O que vence e o que entra em cada dia", k: "agenda datas vencimento" },
  { id: "m", t: "Planejar: limites e metas", s: "Limite por categoria, metas e caixinhas", k: "planejar limite teto meta caixinha reserva guardar" },
  { id: "casal", t: "Conta de casal", s: "Divida as contas com outra pessoa", k: "casal parceiro dividir compartilhar" },
  { id: "btnAjustes", t: "Ajustes e categorias", s: "Categorias, avisos, tema, letra e a sua conta", k: "configuracoes tema escuro letra contraste notificacao categorias conta senha" },
  { id: "btnAjuda", t: "Como usar", s: "Respostas para as dúvidas mais comuns", k: "ajuda duvida tutorial suporte" },
  { id: "novidades", t: "Novidades", s: "O que mudou em cada versão", k: "novidades versao atualizacao mudou novo" },
  { id: "btnSugerir", t: "Sugerir melhoria ou correção", s: "Conte o que falta ou o que deu errado", k: "feedback problema erro sugestao" },
];
/** Abre uma tela ou ferramenta pelo id: usado pela tela Mais, pelo botão Ferramentas e pela busca geral. */
function vaiPara(k) {
  if (HUBS[k]) return hubTela(k);
  if (k === "novidades") return novidadesTela();
  const FER = { ordem: () => equilibrioTela(), graficos: () => (noCelular() ? abrirAnalise() : $("graficos").scrollIntoView({ block: "start" })), motorista: motoristaTela, desemp: meuDesempenho, ano: () => resumoAno(), desafio: () => desafioEconomia(), calc: () => calculadoras(), msg: colarMensagem, conq: conquistasTela, assin: assinaturasTela, revisar: () => paraRevisarTela(), arrumar: arrumarTela, pof: () => paraOndeFoiTela(S.mes), copia: copiaDeSeguranca, mercado, veiculo: meuVeiculo, hora: minhaHoraTela, ganhogasto: () => ganhoGastoTela(S.mes), casa: minhaCasa, dica: dicasTela, revisao: () => revisaoTela(), btnExport: baixarRelatorio, share: () => abrirFechamento(S.mes > mKey(hoje()) ? mKey(hoje()) : S.mes) };
  if (FER[k]) FER[k](); else if (k === "cal") calendario(mKey(hoje())); else if (k === "casal") abrirCasal(); else if (["f", "r", "c", "l", "m"].includes(k)) abrirSub(k); else $(k).click();
}
/* ---------- Busca geral: uma lupa que acha tanto telas e ferramentas quanto lançamentos ---------- */
function buscaGeral() {
  const todas = [...TODAS_FERR(), ...DESTINOS];
  const sugeridas = ["mercado", "calc", "l", "m", "f", "btnAjustes"].map((id) => todas.find((x) => x.id === id));
  const linha = (x) => `<button class="mais-item" type="button" data-go="${x.id}"><span class="ic-box">${ico(x.ico || "lupa")}</span><span class="tx"><b>${esc(x.t)}</b><span>${esc(x.s)}</span></span>${ico("chev")}</button>`;
  openDlg(`<h3>Buscar</h3>
    <div class="busca"><label class="so-leitor" for="bgQ">O que você procura?</label>${ico("lupa")}<input class="in" id="bgQ" type="search" placeholder="Ex.: mercado, férias, aluguel, cartão" autocomplete="off" enterkeyhint="search" maxlength="60"></div>
    <div id="bgRes" aria-live="polite"></div>
    <div class="actions"><button class="btn" type="button" data-close>Fechar</button></div>`);
  const desenha = () => {
    const q = $("bgQ").value.trim(), res = $("bgRes");
    if (!q) res.innerHTML = `<h4 class="ferr-h">Mais procurados</h4><div class="caixa-mais">${sugeridas.map(linha).join("")}</div>`;
    else {
      const fs = buscaDeFuncoes(q, todas), ls = q.length >= 2 && S.loaded ? buscaLancamentos(S.data.lancamentos, q, 5) : { itens: [], total: 0 };
      res.innerHTML = (fs.length ? `<h4 class="ferr-h">Telas e ferramentas</h4><div class="caixa-mais">${fs.map(linha).join("")}</div>` : "")
        + (ls.total ? `<h4 class="ferr-h">Lançamentos</h4><div class="caixa-mais">${ls.itens.map((x) => `<button class="mais-item" type="button" data-lanc="${esc(x.id)}"><span class="ic-box">${ava(x.categoria, x.tipo)}</span><span class="tx"><b>${esc(x.descricao || x.categoria)}</b><span>${ddmm(x.data)}/${x.data.slice(2, 4)} · ${esc(x.categoria)}</span></span><span class="bg-val">${x.tipo === "Receita" ? "+ " : ""}${brl(x.valor)}</span></button>`).join("")}</div>
          <button class="btn bg-todos" type="button" id="bgTodos">${ls.total > ls.itens.length ? `Ver os ${ls.total} lançamentos` : "Ver nos lançamentos"}</button>` : "")
        + (!fs.length && !ls.total ? `<p class="hint" style="margin:12px 2px">Nada encontrado para "${esc(q)}". Tente uma palavra mais curta, como "cartão", "meta" ou o nome de um gasto.</p>` : "");
    }
    res.querySelectorAll("[data-go]").forEach((b) => (b.onclick = () => { const id = b.dataset.go; $("dlg").close(); setTimeout(() => vaiPara(id), 120); }));
    res.querySelectorAll("[data-lanc]").forEach((b) => (b.onclick = () => { const id = b.dataset.lanc; $("dlg").close(); setTimeout(() => editarLancamento(id), 120); }));
    if ($("bgTodos")) $("bgTodos").onclick = () => { S.busca = $("bgQ").value.trim(); $("dlg").close(); setTimeout(() => abrirSub("l"), 120); };
  };
  $("bgQ").addEventListener("input", desenha); desenha(); $("bgQ").focus();
}
$("btnBuscar").onclick = $("btnBuscarM").onclick = buscaGeral;
document.addEventListener("keydown", (e) => {   // "/" abre a busca, como nos sites de busca (só fora de campos e janelas)
  if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey || $("dlg").open || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || $("app").hidden) return;
  e.preventDefault(); buscaGeral();
});
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
      linha("f", "fixo", "Contas e entradas fixas", contas.length || c.fr.length ? `${n(contas.length, "conta", "contas")} (${brl(round2(contas.reduce((t, o) => t + Number(o.valor), 0)))}) e entradas de ${brl(c.frT)} em ${nomeMes(S.mes)}` : "Aluguel, internet, salário e o que se repete todo mês"),
      linha("c", "cartao", "Cartões e faturas", cartoes.length ? `${n(cartoes.length, "cartão", "cartões")}${c.fatT ? `, ${brl(c.fatT)} em faturas neste mês` : ""}` : "Cadastre o cartão e a fatura se monta sozinha", "card"),
      linha("cal", "agenda", "Calendário de vencimentos", "O que vence e o que entra em cada dia"),
      linha("casal", "casal", "Conta de casal", esc(resumoDoCasal()), S.casal?.situacao === "convidado" ? "aviso" : "")])}
    ${GRUPOS_MAIS.map((g) => grupo(g.titulo, g.ids.map((id) => TODAS_FERR().find((x) => x.id === id)).filter(Boolean).map((i) => linha(i.id, i.ico, i.t, i.s)))).join("")}
    ${grupo("Ajustes e ajuda", [
      appInstalado() ? "" : linha("btnInstall", "instalar", "Instalar o app no celular", "Ícone na tela inicial, abre em tela cheia e funciona sem internet"),
      linha("btnAjustes", "ajustes", "Ajustes e categorias", naDemo ? "Categorias, tema e saldo" : "Categorias, avisos, tema e a sua conta"),
      linha("ajuda", "ajuda", "Ajuda", `Como usar, novidades da versão ${APP_VERSAO} e sugestões`),
      linha("btnSair", "sair", esc($("btnSair").textContent))])}`;
  host.querySelectorAll("[data-mais]").forEach((b) => (b.onclick = () => {
    vaiPara(b.dataset.mais);
  }));
}
/* ================= conta de casal =================
   Duas pessoas, cada uma com o seu login, nas mesmas contas (supabase/casal.sql). Cada linha continua sendo de quem lançou. */
const casalAtivo = () => S.casal?.situacao === "ativo";
const nomeDoOutro = () => S.casal?.dados?.nomes?.[S.casal.outro_id] || apelidoDoEmail(S.casal?.outro) || "a outra pessoa";
const quemTag = (x) => (casalAtivo() && x.user_id && x.user_id === S.casal.outro_id ? ` <span class="tag quem">${esc(nomeDoOutro())}</span>` : "");
/** Coloca nas preferências o que é dos dois: categorias, limites, metas e saldo. */
// Cópia funda: se as metas (ou categorias) da tela fossem o mesmo objeto guardado como "dados do casal",
// mudar uma meta mudava os dois juntos, o app achava que não havia nada novo para o casal e não enviava.
// Ao abrir de novo, a versão antiga do casal voltava por cima — a meta "não salvava".
const copia = (o) => (o == null ? o : JSON.parse(JSON.stringify(o)));
function aplicaCasal() { if (casalAtivo()) S.prefs = { ...S.prefs, ...copia(comumDoCasal(S.casal.dados)) }; }
const canonico = (o) => JSON.stringify(o, (_k, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]])) : v));
/** Guarda na conta de casal o que é dos dois, só quando mudou. */
async function salvaCasal() {
  if (!casalAtivo() || !S.store.casalSalvar) return;
  const novo = { ...comumDoCasal(S.prefs), nomes: S.casal.dados?.nomes || {} };
  if (canonico(novo) === canonico(S.casal.dados || {})) return;
  await S.store.casalSalvar(novo); S.casal.dados = copia(novo);
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
      <div class="casal-acerto" id="csAcerto"></div>
      <form id="csNomes" class="dlg-form" autocomplete="off">
        <label class="f">Seu nome<input class="in" id="csMeu" maxlength="20" placeholder="${esc(apelidoDoEmail($("whoName").textContent))}" value="${esc(nomes[c.eu] || "")}"></label>
        <label class="f">Nome de quem divide com você<input class="in" id="csDele" maxlength="20" placeholder="${esc(apelidoDoEmail(c.outro))}" value="${esc(nomes[c.outro_id] || "")}"></label>
        <p class="hint wide" style="margin:0">É o nome que aparece ao lado dos lançamentos de cada um.</p>
        <button class="btn" type="submit">Salvar nomes</button></form>
      ${msg}
      <div class="actions"><button class="link aj-excluir" type="button" id="csEncerrar" style="margin-right:auto">Encerrar a conta de casal</button>${fecha}</div>`);
    const desenhaAcerto = () => {
      const pct = Number($("csPct")?.value) || 50, r = acertoDoCasal(S.data.lancamentos, S.mes, S.casal.eu, pct), outro = esc(nomeDoOutro());
      const frase = !r.total ? "Ainda não há gastos lançados neste mês." : r.quem === "outro" ? `<b>${outro}</b> passa ${brl(r.valor)} para você.` : r.quem === "eu" ? `Você passa ${brl(r.valor)} para <b>${outro}</b>.` : "Vocês estão quites.";
      $("csAcerto").innerHTML = `<span class="t"><b>Acerto de ${nomeMes(S.mes)}</b></span><span>${frase}</span>
        <label class="f">Sua parte nos gastos<select class="in" id="csPct">${[[50, "50% (metade para cada um)"], [60, "60%"], [70, "70%"], [40, "40%"], [30, "30%"]].map(([v, t]) => `<option value="${v}"${v === pct ? " selected" : ""}>${t}</option>`).join("")}</select></label>
        <span class="hint" style="margin:0">Conta feita sobre os gastos que cada um lançou em ${nomeMes(S.mes)} (${brl(r.total)} no total). Funciona melhor quando cada um lança o que pagou.</span>`;
      $("csPct").onchange = desenhaAcerto;
    };
    desenhaAcerto();
    $("csNomes").addEventListener("submit", async (e) => {
      e.preventDefault();
      const novos = { ...nomes }; for (const [id, campo] of [[c.eu, "csMeu"], [c.outro_id, "csDele"]]) { const v = $(campo).value.trim().slice(0, 20); if (v) novos[id] = v; else delete novos[id]; }
      try { const dados = { ...comumDoCasal(S.prefs), nomes: novos }; await S.store.casalSalvar(dados); S.casal.dados = copia(dados); render(); abrirCasal("Nomes salvos."); }
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
/**
 * Ao voltar para o app (e, com ele aberto, a cada minuto), busca o que mudou em outro lugar: o que a outra pessoa da conta
 * de casal lançou, ou o que a própria pessoa mudou em outro aparelho (celular e computador). Antes isso só acontecia na
 * conta de casal, e o computador mostrava dados velhos até recarregar a página.
 * Não atualiza no meio de algo: quadro aberto, tela de lançar, campo sendo digitado ou lançamento ainda indo para o banco.
 */
async function atualizaDoCasal() {
  const antes = S.casal?.situacao;
  if (!S.loaded || S.store?.kind !== "supabase" || document.visibilityState !== "visible" || Date.now() - (S.carregadoEm || 0) < 45000) return;
  if (document.querySelector("dialog[open]") || document.body.classList.contains("lancando") || !$("acesso").hidden || $("app").hidden) return;
  if (envios.size || pagosPendentes || S.store.naFila?.() || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "")) return;
  S.carregadoEm = Date.now();
  try {
    const st = S.store;
    if (["ativo", "convidei"].includes(antes)) {
      const c = await st.casalMeu();
      if (S.store !== st) return;
      if (c.situacao !== antes) return void startApp(st, $("whoName").textContent);   // aceitaram o convite, ou a conta de casal acabou: recomeça com os dados certos
      S.casal = c;
    }
    const d = await st.loadAll();
    if (S.store !== st || d.daCopia || envios.size || pagosPendentes || st.naFila?.()) return;   // algo mudou aqui enquanto buscava: fica o daqui
    d.cartoes ||= []; S.data = d; aplicaCasal(); render();
  } catch (e) { console.warn("Não atualizou:", e?.message); }
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") atualizaDoCasal(); });
addEventListener("focus", atualizaDoCasal);
setInterval(atualizaDoCasal, 60000);

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
  ["kpis", "Guardado, fixos e faturas", "Os quadros com os totais do mês", ["kpis", "insight"]], ["graficos", "Gráficos do mês", "Quanto você gastou ao longo do mês e em quê", ["graficos"]],
  ["evo", "Últimos meses", "Entradas, custo e sobra mês a mês", ["evoPanel"]], ["desemp", "Meu desempenho", "O mês em frases, comparado com os outros", ["desempIni"]],
  ["conq", "Conquistas", "As medalhas ganhas e a próxima", ["conqIni"]]];
const NO_INICIO_CEL = ["dia", "venc", "desemp", "conq"];   // no celular, o resto fica em Planejar → Análise do mês
/** "Mais do seu mês" abre sozinho no computador (tem espaço) e fica fechado no celular. */
if ($("maisDoMes")) $("maisDoMes").open = !noCelular();
function aplicaInicio() {
  const fora = new Set(S.prefs.inicioFora || []);
  QUADROS.forEach(([k, , , ids]) => ids.forEach((id) => $(id)?.classList.toggle("fora", fora.has(k))));
}
$("btnOrganizar").onclick = () => {
  const fora = new Set(S.prefs.inicioFora || []);
  openDlg(`<h3>Organizar o início</h3><p class="hint" style="margin:0 0 6px">Escolha o que aparece na tela inicial. O resumo do mês fica sempre no topo. O que você esconder continua funcionando e pode voltar quando quiser.</p>
    <div class="org-lista">${QUADROS.filter(([k]) => !noCelular() || NO_INICIO_CEL.includes(k)).map(([k, t, d]) => `<label class="check org"><input type="checkbox" data-quadro="${k}" ${fora.has(k) ? "" : "checked"}><span class="tx"><b>${t}</b><span>${d}</span></span></label>`).join("")}</div>
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
  ["Qual a diferença entre conta fixa e lançamento?", `<b>Fixo</b> é o que se repete: aluguel, internet, salário. Você cadastra uma vez e ele entra sozinho em todo mês (ou em toda semana). <b>Lançamento</b> é um gasto que aconteceu uma vez, como o mercado de hoje.`],
  ["Tem um calendário das contas?", `Tem. No início, em <b>Próximos vencimentos</b>, toque em <b>Ver no calendário</b>. Cada dia mostra o que vence e o que entra; tocando no dia você vê as contas e pode marcar <b>Já paguei</b>.`],
  ["Como lanço um acerto, acordo ou parcelamento que tem data para acabar?", `Em <b>Lançar</b>, preencha o valor de cada vez, marque <b>Repete</b> e escolha até que mês vai (a lista mostra quantas vezes dá). Começa na data que você escolher e para sozinho no mês final. Em <b>Contas fixas</b> aparece quanto ainda falta de cada um e o total. Serve também para um valor que alguém vai te pagar por um prazo: use <b>Entrada</b>.`],
  ["Como marco uma conta como paga?", `No início, em <b>Próximos vencimentos</b>, toque em <b>Já paguei</b>. Também dá para marcar em <b>Contas fixas</b> e, para a fatura, em <b>Cartões</b>. No celular, os dois ficam em <b>Mais</b>.`],
  ["Como registro o dinheiro que guardei?", `Em Lançar, escolha <b>Guardar</b> e diga onde o dinheiro ficou (reserva, investimento). Ele sai do que sobra no mês e passa a somar nas <b>Caixinhas</b>. Para tirar, use o mesmo caminho e escolha Retirar.`],
  ["Como funciona a meta do dinheiro guardado?", `Em <b>Planejar</b>, toque na <b>caixinha</b> e crie uma meta para o lugar onde você guarda: quanto quer juntar e, se quiser, até quando. O app mostra quanto falta, em que mês você chega lá e quanto dá para guardar com o que deve sobrar no mês. Se você combinar um valor por mês, ele aparece em Próximos vencimentos para marcar <b>Guardei</b> ou <b>Pular</b>: não é uma conta e pular não tem problema. A previsão usa só o valor guardado e os meses: o app não calcula rendimento.`],
  ["Como funciona o limite de gastos?", `Na aba <b>Limites</b> você diz quanto quer gastar no máximo por mês e, se quiser, por categoria. O app mostra quanto já foi usado e avisa ao chegar a 80%, ao passar do limite e se passar em mais de 20%.`],
  ["Como acho um gasto antigo?", `No <b>Lançamentos</b>, use a <b>busca</b>: ela procura em todos os meses pela descrição, pela categoria, pela forma de pagamento ou pelo valor.`],
  ["Tem jeito mais rápido de lançar o que se repete?", `Tem. Em Lançar, os gastos que você mais repete aparecem em <b>Você costuma lançar</b>: um toque preenche tudo e você só confirma. E, ao abrir qualquer lançamento, <b>Lançar de novo hoje</b> cria uma cópia com a data de hoje. A categoria também se ajusta sozinha: o app usa a que você escolheu da última vez para aquele nome.`],
  ["Como vejo se estou melhorando?", `Em <b>Análise do mês</b> (no celular, dentro de <b>Planejar</b>), o quadro <b>Últimos meses</b> mostra o que entrou, o custo e quanto sobrou em cada mês. Em <b>Por categoria</b>, o app diz quando uma categoria está mais alta ou mais baixa do que no mês anterior.`],
  ["Errei um lançamento. Como corrijo?", `No <b>Lançamentos</b>, toque no lançamento para mudar o valor, a data, a categoria ou para excluir.`],
  ["Tem como não digitar tudo?", `Tem. Em Lançar, toque em <b>Câmera</b>: ela lê ao vivo o QR code do Pix ou do cupom de mercado e, no mesmo quadro, o botão <b>Foto ou PDF do comprovante</b> lê boleto, conta, fatura ou holerite; também dá para colar o Pix copia e cola. No cupom de mercado, o app busca o valor, a loja e os itens no site da Fazenda (testado com notas de São Paulo; em outros estados pode pedir o valor). Você sempre confere antes de salvar.`],
  ["Dá para mandar o comprovante direto do aplicativo do banco?", `No Android, com o app instalado: no comprovante, toque em <b>Compartilhar</b> e escolha <b>Meus Gastos</b>. O app abre já lendo o comprovante. Segurando o ícone do app também aparecem os atalhos <b>Lançar gasto</b> e <b>Ler QR code</b>. No iPhone esse caminho não existe: use Lançar → Ler foto ou PDF.`],
  ["E se eu estiver sem internet?", `Pode lançar normalmente. O gasto fica guardado no aparelho, aparece como <b>aguardando internet</b> e é enviado sozinho quando a conexão voltar. Alterar ou excluir o que já estava salvo precisa de conexão.`],
  ["O que é o resumo da semana e o lembrete das 20h?", `No <b>domingo à noite</b> o app manda um resumo: quanto você gastou na semana, onde pesou mais e as contas dos próximos 7 dias. O <b>lembrete das 20h</b> é uma notificação que só aparece nos dias em que você não anotou nada. Os dois se ligam e desligam em <b>Ajustes</b>, na parte Resumo e lembrete.`],
  ["Dá para usar a dois?", `Dá, com a <b>Conta de casal</b> (no celular, em <b>Mais</b>; no computador, em <b>Ajustes</b>). Você convida a outra pessoa pelo e-mail e ela aceita dentro do app, entrando com esse e-mail. Cada um continua com a sua senha. Os dois veem e lançam nas mesmas contas, e o app mostra quem lançou cada gasto. Qualquer um dos dois pode encerrar quando quiser: cada um fica com o que lançou.`],
  ["Onde ficam as contas fixas, os cartões e os ajustes no celular?", `Na barra de baixo: <b>Início</b>, o <b>+</b> para lançar, <b>Mercado</b> (a lista de compras) e <b>Mais</b>, onde ficam também as calculadoras, o carro, a casa e as outras ferramentas. No Início, a faixa <b>Ir para</b> leva ao <b>Lançamentos</b>, ao <b>Planejar</b> (limites e metas), aos <b>Cartões</b>, às <b>Contas fixas</b> e ao <b>Calendário</b>. Em Mais ficam as contas fixas, as entradas fixas, os cartões, o calendário, a conta de casal, o relatório, os ajustes e esta ajuda. No fim do Início, <b>Organizar o início</b> escolhe quais quadros aparecem.`],
  ["Como recebo avisos e instalo no celular?", `Em <b>Ajustes</b> você liga os avisos por e-mail e a notificação no aparelho. Para instalar, use <b>Instalar app</b> (no celular, em <b>Mais</b>); no iPhone, abra pelo Safari, toque em Compartilhar e em Adicionar à Tela de Início.`],
  ["Como colo a mensagem do banco, uso outra moeda ou crio uma subcategoria?", `<b>Mensagem do banco:</b> em <b>Mais → Colar mensagem do banco</b>, cole a notificação ou o SMS e o lançamento vem preenchido para você conferir. <b>Outra moeda:</b> na tela de lançar, toque em <b>Gastei em outra moeda</b>, digite o valor e a cotação, e o app põe o valor em reais. <b>Subcategoria:</b> ao criar uma categoria, escolha <b>Dentro de</b> (por exemplo, Feira dentro de Mercado). No resumo do ano, as subcategorias somam na categoria de cima.`],
  ["Como funcionam o desafio de economia, as calculadoras e o resumo do ano?", `Estão em <b>Mais</b>. No <b>desafio de economia</b> você escolhe uma caixinha e um valor por semana; a cada semana, toque em <b>Guardei</b> e o valor entra na caixinha. As <b>calculadoras</b> mostram rendimento, parcelas com juros, férias e 13º (valores brutos). O <b>resumo do ano</b> mostra mês a mês e para onde foi o dinheiro, e dá para baixar em PDF.`],
  ["Como troco a senha ou excluo a minha conta?", `Em <b>Ajustes</b>, na parte <b>Sua conta</b>. Para trocar a senha, você digita a atual e a nova. Excluir a conta apaga para sempre todos os seus registros e pede a senha para confirmar; antes, baixe o relatório se quiser guardar uma cópia. Excluir a conta não cancela a assinatura: o cancelamento é feito na Hotmart.`],
  ["Meus dados ficam seguros? Consigo levar embora?", `Cada conta só enxerga os próprios dados, e essa regra é aplicada no banco de dados. Fotos e PDFs são lidos no seu aparelho e não são enviados. Em <b>Baixar relatório</b> você leva tudo em planilha. Os detalhes estão na <a href="site/privacidade.html" target="_blank" rel="noopener">Política de privacidade</a>.`],
];
function ajuda() {
  openDlg(`<h3>Como usar</h3><p class="hint" style="margin:0 0 12px;font-size:13.5px">Toque em uma pergunta para ver a resposta.</p>
    <div class="ajuda">${AJUDA.map(([q, r]) => `<details><summary>${q}</summary><p>${r}</p></details>`).join("")}</div>
    <div class="aj-sec" style="margin-top:14px"><button class="link" type="button" id="ajudaPassos">Refazer os primeiros passos</button><button class="link" type="button" id="ajudaSug">Não achou? Sugerir melhoria ou correção</button>${suporteHtml()}</div>
    <div class="actions"><button class="btn primary" data-close>Fechar</button></div>`);
  $("ajudaSug").onclick = () => sugerir();
  $("ajudaPassos").onclick = () => { guiaDe().fechado = false; salvaPrefs(); guiaPasso("renda", true); };
}
$("btnAjuda").onclick = ajuda;

/* ================= pedidos de melhoria e correção =================
   A pessoa conta o que falta ou o que deu errado; o pedido chega na tabela "sugestoes" (supabase/sugestoes.sql),
   com a tela e a versão do app para facilitar achar o problema. Ela vê os próprios pedidos e a resposta de volta. */
const TIPOS_SUG = [["melhoria", "Melhoria", "Ex.: queria ver meus gastos por semana"], ["correcao", "Correção", "Ex.: ao salvar, a tela não fechou. O que você fez e o que apareceu?"], ["outro", "Outro", "Uma dúvida, um elogio ou qualquer outra coisa"]];
const STATUS_SUG = { nova: ["Recebido", "info"], analisando: ["Em análise", "warn"], feita: ["Feito", "good"], nao_vai: ["Não vai entrar", ""] };
let rascunhoSug = "";
function sugerir(tipo = "melhoria") {
  const naDemo = S.store?.kind === "local";
  openDlg(`<h3>Sugerir melhoria ou correção</h3>
    <p class="hint" style="margin:0 0 10px">Conte o que podemos melhorar ou o que não funcionou. Todo pedido é lido. Não escreva senha nem número de cartão.</p>
    <form id="sugForm" class="dlg-form" autocomplete="off">
      <div class="f wide"><span id="sugTipoLbl">O que é?</span><div class="seg" role="group" aria-labelledby="sugTipoLbl" id="sugTipo">${TIPOS_SUG.map(([v, r]) => `<button type="button" data-t="${v}" aria-pressed="${v === tipo}">${r}</button>`).join("")}</div></div>
      <label class="f wide">Seu pedido<textarea class="in" id="sugTexto" rows="5" maxlength="2000" required></textarea></label>
      <p class="hint wide" style="margin:0" id="sugCont"></p>
      ${naDemo ? `<p class="hint wide" style="margin:0">Na demonstração o pedido não é enviado por aqui: ao tocar em Enviar, abrimos o seu e-mail com o texto pronto.</p>` : ""}
      <p class="auth-msg err wide" id="sugMsg" role="alert"></p>
      <div class="actions wide"><button class="btn primary" type="submit" id="sugOk">Enviar pedido</button><button class="btn" type="button" data-close>Cancelar</button></div></form>
    <div id="sugLista"></div>`);
  const ta = $("sugTexto"), msg = $("sugMsg"), tipoAtual = () => $("sugTipo").querySelector('[aria-pressed="true"]').dataset.t;
  const dica = () => { ta.placeholder = TIPOS_SUG.find(([v]) => v === tipoAtual())[2]; };
  const conta = () => { const n = ta.value.length; $("sugCont").textContent = n > 1700 ? `${n} de 2000 letras` : ""; rascunhoSug = ta.value; };
  ta.value = rascunhoSug; dica(); conta();
  $("sugTipo").querySelectorAll("button").forEach((b) => (b.onclick = () => { $("sugTipo").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b)); dica(); ta.focus(); }));
  ta.addEventListener("input", () => { conta(); msg.textContent = ""; });
  const porEmail = (t, texto) => {
    if (!SUPORTE_CONTATO || /^https?:/.test(SUPORTE_CONTATO)) { if (/^https?:/.test(SUPORTE_CONTATO || "")) window.open(SUPORTE_CONTATO, "_blank", "noopener"); return false; }
    const rot = TIPOS_SUG.find(([v]) => v === t)[1];
    location.href = `mailto:${SUPORTE_CONTATO}?subject=${encodeURIComponent(`Meus Gastos — ${rot}`)}&body=${encodeURIComponent(`${texto}\n\n(app v${APP_VERSAO})`)}`; return true;
  };
  $("sugForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const texto = ta.value.trim(), t = tipoAtual();
    if (texto.length < 5) { msg.textContent = "Escreva um pouco mais, para a gente entender o pedido."; return ta.focus(); }
    if (naDemo) { if (porEmail(t, texto)) { rascunhoSug = ""; $("dlg").close(); } else msg.textContent = "Crie sua conta para enviar pedidos pelo app."; return; }
    const ok = $("sugOk"); ok.disabled = true; ok.textContent = "Enviando…";
    try {
      await comPrazo(S.store.sugestoesEnviar({ tipo: t, texto, tela: S.view + (S.view === "listas" ? "/" + S.tab : ""), versao: APP_VERSAO }), 15000);
      rascunhoSug = ""; $("dlg").close(); toast("Recebemos o seu pedido. Obrigado por ajudar a melhorar o app!");
    } catch (err) {
      ok.disabled = false; ok.textContent = "Enviar pedido";
      const m = String(err?.message || "") + String(err?.code || "");
      if (semRede(err)) msg.textContent = "Sem internet agora. O seu texto continua aqui: toque em Enviar quando o sinal voltar.";
      else if (/limite_diario/.test(m)) msg.textContent = "Você já enviou 10 pedidos hoje. Amanhã dá para enviar mais.";
      else if (/PGRST205|PGRST202|42P01|schema cache|does not exist/i.test(m)) { if (porEmail(t, texto)) { rascunhoSug = ""; $("dlg").close(); } else msg.textContent = "Não foi possível enviar agora. Tente de novo mais tarde."; }
      else msg.textContent = "Não foi possível enviar agora. Seu texto continua aqui: tente de novo em instantes.";
    }
  });
  ta.focus();
  // Os pedidos que a pessoa já fez e o que respondemos (some em silêncio se o banco ainda não tem a tabela).
  if (!naDemo && typeof S.store.sugestoesMinhas === "function") S.store.sugestoesMinhas().then((l) => {
    if (!l?.length || !$("sugLista")) return;
    $("sugLista").innerHTML = `<h4 class="meta-h">Seus pedidos</h4><ul class="sug-lista">${l.map((x) => {
      const [rot, cls] = STATUS_SUG[x.status] || STATUS_SUG.nova, tp = TIPOS_SUG.find(([v]) => v === x.tipo)?.[1] || "Outro";
      return `<li><span class="sug-topo"><span class="tag">${tp}</span><span class="pill ${cls}">${rot}</span><small>${ddmm(String(x.criado).slice(0, 10))}</small></span>
        <p>${esc(x.texto)}</p>${x.resposta ? `<p class="sug-resp"><b>Nossa resposta:</b> ${esc(x.resposta)}</p>` : ""}</li>`;
    }).join("")}</ul>`;
  }).catch(() => {});
}
$("btnSugerir").onclick = () => sugerir();
/* ================= ferramentas =================
   Meu desempenho, resumo do ano, calculadoras, desafio de economia, mensagem do banco, gasto em outra moeda e o relatório em Excel, PDF ou CSV.
   As contas ficam em js/extras.js (testadas); aqui só estão as telas. */
const opFerr = (id, icone, t, s) => `<button class="mais-item" type="button" id="${id}"><span class="ic-box">${ico(icone)}</span><span class="tx"><b>${t}</b><span>${s}</span></span>${ico("chev")}</button>`;
function ferramentas() {
  openDlg(`<h3>Ferramentas</h3>${GRUPOS_FERR.map((g) => `<h4 class="ferr-h">${g.titulo}</h4><div class="caixa-mais">${g.itens.map((i) => opFerr("fr_" + i.id, i.ico, i.t, i.s)).join("")}</div>`).join("")}
    <div class="actions"><button class="btn" type="button" data-close>Fechar</button></div>`);
  GRUPOS_FERR.forEach((g) => g.itens.forEach((i) => ($("fr_" + i.id).onclick = () => vaiPara(i.id))));
}
$("btnFerramentas").onclick = ferramentas;

/* ---------- Para onde foi o dinheiro: o mês em respostas simples (js/paraondefoi.js) ---------- */
const corDaCat = (i, nome) => (nome && nome !== "Demais" ? corCat(nome) : "#7fa0c4");
/** Anel de categorias (conic-gradient): cada fatia é uma categoria, na mesma ordem e cor da lista ao lado. */
function aneloDasCategorias(r) {
  let ate = 0;
  const fatias = r.categorias.map((x) => { const ini = ate; ate += x.pct; return `${corDaCat(0, x.nome)} ${ini}% ${Math.min(100, ate)}%`; });
  return `<span class="pof-anel" role="img" aria-label="${esc(r.categorias.slice(0, 4).map((x) => `${x.nome} ${x.pct}%`).join(", "))}" style="background:conic-gradient(${fatias.join(",")})"><b>${r.gasto ? brl0(r.base) : ""}</b></span>`;
}
/** "▲ 12% a mais que setembro": a seta e as palavras dizem o mesmo que a cor, para quem não distingue cores. */
function pilulaDaDiferenca(r) {
  if (!r.temAnterior || r.difPct === null) return `<span class="pof-pill neutro">Sem mês anterior para comparar</span>`;
  const sobe = r.dif > 0, igual = Math.abs(r.dif) < 1;
  return `<span class="pof-pill ${igual ? "neutro" : sobe ? "ruim" : "bom"}">${igual ? "Igual a" : sobe ? "▲ " + Math.abs(r.difPct) + "% a mais que" : "▼ " + Math.abs(r.difPct) + "% a menos que"} ${esc(nomeDoMes(r.anterior))}</span>`;
}
function renderParaOndeIni(c) {
  const host = $("paraOndeIni"), r = S.loaded && c.fase !== "futuro" ? paraOndeFoi(S.data, S.mes, hoje(), { teto: Number(S.prefs.teto) || 0 }) : null;
  host.hidden = !r || !(r.base > 0); if (host.hidden) { host.innerHTML = ""; return; }
  const top = r.categorias.slice(0, 3), cab = r.fase === "atual" ? "Previsão do mês" : "Gasto do mês";
  host.innerHTML = `<div class="teto pof-card"><span class="topo"><span class="l">${ico("grafico")}Para onde foi seu dinheiro</span>${pilulaDaDiferenca(r)}</span>
    <div class="pof-corpo">${aneloDasCategorias(r)}
      <ul class="pof-leg" aria-label="Onde mais gastou">${top.map((x) => `<li>${x.nome === "Demais" ? "" : ava(x.nome)}<span>${esc(x.nome)}</span><b>${brl(x.valor)}</b></li>`).join("")}</ul></div>
    <p class="pof-frase">${esc(r.leituras[0]?.titulo || cab)}</p>
    <button class="btn" type="button" id="pofVer">Ver o porquê e o que fazer</button></div>`;
  $("pofVer").onclick = () => paraOndeFoiTela(S.mes);
}
/** A meta pela realidade da pessoa: a média dos últimos 3 meses, ou quanto falta para o app ter base para sugerir. */
function blocoDaMeta(r) {
  const teto = Number(S.prefs.teto) || 0;
  if (r.meta) {
    const igual = teto === r.meta.sugestao;
    return `<h4 class="pof-h">Sua meta, pela sua realidade</h4><div class="pof-meta"><p>Nos últimos 3 meses você gastou, em média, <b>${brl(r.meta.media)}</b> por mês. Uma meta que cabe no seu jeito de viver, com 5% de economia: <b>${brl(r.meta.sugestao)}</b>.</p>
      ${igual ? `<span class="pof-pill bom">Este é o seu limite atual</span>` : `<button class="btn" type="button" data-usa-meta="${r.meta.sugestao}">Usar ${brl(r.meta.sugestao)} como limite do mês</button>${teto > 0 ? `<small>Seu limite atual é ${brl(teto)}.</small>` : ""}`}</div>`;
  }
  const fechados = r.meses.filter((x) => x.fase === "passado" && x.custo > 0).length;
  return `<h4 class="pof-h">Sua meta, pela sua realidade</h4><div class="pof-meta"><p>Depois de <b>3 meses fechados</b> de uso, o app calcula a sua média e sugere uma meta que cabe no seu jeito de viver. Você tem <b>${Math.min(fechados, 3)} de 3</b>.</p>
    <span class="pof-prog" role="img" aria-label="${Math.min(fechados, 3)} de 3 meses"><i style="width:${Math.min(100, Math.round((Math.min(fechados, 3) / 3) * 100))}%"></i></span></div>`;
}
async function usaMeta(valor, depois) {
  S.prefs.teto = valor; await salvaPrefs(); render(); toast(`Limite do mês: ${brl(valor)}.`); depois();
}
function paraOndeFoiTela(m) {
  const r = paraOndeFoi(S.data, m, hoje(), { teto: Number(S.prefs.teto) || 0 }); if (!r) { toast("Esse mês ainda não tem lançamentos."); return; }
  const maxMes = Math.max(...r.meses.map((x) => Math.max(x.rec, x.custo)), 1), atual = r.fase === "atual";
  const colunas = r.meses.map((x) => `<button type="button" class="pof-col${x.atual ? " sel" : ""}" data-m="${x.m}" aria-label="${nomeDoMes(x.m)}: gastou ${brl(x.custo)}, entrou ${brl(x.rec)}${x.atual ? " (mês aberto)" : ""}" aria-pressed="${x.atual}">
      <span class="pof-barras"><i class="ent" style="height:${Math.max(3, Math.round((x.rec / maxMes) * 100))}%"></i><i class="gas ${x.custo > x.rec ? "acima" : ""}" style="height:${Math.max(3, Math.round((x.custo / maxMes) * 100))}%"></i></span><span class="pof-mes">${nomeDoMes(x.m).slice(0, 3)}</span></button>`).join("");
  const maxCat = Math.max(...r.categorias.map((x) => x.valor), 1);
  const linhaCat = (x) => `<li><span class="pof-nome">${x.nome === "Demais" ? "" : `<button type="button" class="pof-ic" data-ic="${esc(x.nome)}" aria-label="Trocar o desenho de ${esc(x.nome)}">${ava(x.nome)}</button>`}${esc(x.nome)}${x.junta ? ` <small>(${x.junta} categorias)</small>` : ""}</span>
      <span class="pof-val"><b>${brl(x.valor)}</b><small>${x.pct}%</small></span>
      ${x.media3 > 0 ? `<span class="pof-media">Sua média nos últimos 3 meses: <b>${brl(x.media3)}</b>${x.acimaDaMedia ? ` · <em>acima da média</em>` : ""}</span>` : ""}
      <span class="pof-fio" aria-hidden="true"><em style="width:${Math.max(2, Math.round((x.valor / maxCat) * 100))}%;background:${corDaCat(0, x.nome)}"></em></span>
      ${r.temAnterior && x.difPct !== null && Math.abs(x.dif) >= 1 ? `<span class="pof-dif ${x.nome === "Outros" ? "neutro" : x.dif > 0 ? "ruim" : "bom"}">${x.dif > 0 ? "▲ " + brl(x.dif) + " a mais" : "▼ " + brl(-x.dif) + " a menos"} que em ${esc(nomeDoMes(r.anterior))}</span>` : ""}</li>`;
  const icTom = { erro: "▲", ok: "✓", info: "●" }, nomeTom = { erro: "Atenção", ok: "Bom sinal", info: "Para saber" };
  openDlg(`<div class="pof"><h3>Para onde foi o dinheiro</h3>
    <div class="pof-resumo"><span class="pof-q">${atual ? "Previsão para " : "Em "}${esc(nomeDoMes(r.m))}</span><b class="pof-grande">${brl(r.base)}</b>
      ${pilulaDaDiferenca(r)}<span class="pof-linha">Entrou <b>${brl(r.entra)}</b> · ${r.sobra < 0 ? `faltou <b class="ruim">${brl(-r.sobra)}</b>` : `sobrou <b class="bom">${brl(r.sobra)}</b>`}${atual ? ` · gasto até hoje <b>${brl(r.gasto)}</b>` : ""}</span></div>
    <h4 class="pof-h">Os últimos meses</h4>
    <div class="pof-cols" role="group" aria-label="Escolha um mês para ver">${colunas}</div>
    <p class="pof-leg2"><i class="ent"></i>Entrou <i class="gas"></i>Gastou <small>Toque num mês para ver esse mês.</small></p>
    <h4 class="pof-h">Para onde foi</h4>
    <p class="hint" style="margin:-4px 0 8px;font-size:12.5px">Toque no desenho de uma categoria para trocar.</p><ul class="pof-lista">${r.categorias.map(linhaCat).join("")}</ul>
    ${blocoDaMeta(r)}
    ${htmlLimiteCabe()}
    <h4 class="pof-h">Onde errei e o que ajudou</h4>
    ${r.leituras.length ? `<ul class="pof-leit">${r.leituras.map((x) => `<li class="${x.tom}"><span class="pof-sel" aria-hidden="true">${icTom[x.tom]}</span><span><small>${nomeTom[x.tom]}</small><b>${esc(x.titulo)}</b><span>${esc(x.texto)}</span></span></li>`).join("")}</ul>` : `<p class="hint">Nada fora do normal neste mês.</p>`}
    <h4 class="pof-h">O que fazer para melhorar</h4>
    <ol class="pof-passos">${r.passos.map((p, i) => `<li><span class="pof-n">${i + 1}</span><span class="pof-tx"><b>${esc(p.titulo)}</b><span>${esc(p.texto)}</span></span><button class="btn sm" type="button" data-passo="${p.id}"${p.valor ? ` data-valor="${p.valor}"` : ""}>${esc(p.acao)}</button></li>`).join("")}</ol>
    <div class="actions"><button class="btn" type="button" data-close>Fechar</button></div></div>`);
  document.querySelectorAll("#dlgBody [data-m]").forEach((b) => (b.onclick = () => paraOndeFoiTela(b.dataset.m)));
  document.querySelectorAll("#dlgBody [data-usa-meta]").forEach((b) => (b.onclick = () => usaMeta(Number(b.dataset.usaMeta), () => paraOndeFoiTela(m))));
  document.querySelectorAll("#dlgBody [data-ic]").forEach((b) => (b.onclick = () => escolheDesenho(b.dataset.ic, () => paraOndeFoiTela(m))));
  const vai = { arrumar: arrumarTela, cortar: () => abrirSub("m"), limite: () => abrirSub("m"), teto: () => abrirSub("m"), fixas: () => abrirSub("f"), manter: () => abrirSub("m") };
  document.querySelectorAll("#dlgBody [data-passo]").forEach((b) => (b.onclick = async () => { if (b.dataset.passo === "teto" && b.dataset.valor) return usaMeta(Number(b.dataset.valor), () => paraOndeFoiTela(m)); const f = vai[b.dataset.passo]; if (b.dataset.passo === "arrumar") return f(); $("dlg").close(); setTimeout(f, 150); }));
}
/** Uma linha com a meta sugerida pela média, quando já há 3 meses fechados e a pessoa ainda não definiu limite. */
function metaNota(c) {
  if (!S.loaded || c.fase === "passado" || Number(S.prefs.teto) > 0) return "";
  const meta = metaSugerida(S.data, S.mes, hoje()); if (!meta) return "";
  return `<p class="proj-nota">Você gasta em média <b>${brl0(meta.media)}</b> por mês. Meta sugerida: <button type="button" class="ln" id="usaMetaIni" data-valor="${meta.sugestao}">${brl0(meta.sugestao)}, usar</button></p>`;
}
/** "Como o mês vai fechar": uma barra só (o que já gastou, o que falta gastar pela previsão e onde está a entrada) e três números. */
function projecaoDoMes(c, est, rx, acum) {
  const atualM = c.fase === "atual", entra = c.rec, gasto = c.custo, previsto = atualM ? c.proj : c.custo;
  const topo = Math.max(entra, previsto, gasto, 1), p = (v) => Math.max(0, Math.min(100, (v / topo) * 100));
  const sobra = round2(entra - previsto), falta = sobra < 0 && entra > 0;
  const pill = entra > 0 ? `<span class="pof-pill ${falta ? "ruim" : "bom"}">${atualM ? (falta ? "Previsão: fecha " + brl0(-sobra) + " no vermelho" : "Previsão: sobram " + brl0(sobra)) : (falta ? "Fechou " + brl0(-sobra) + " no vermelho" : "Sobraram " + brl0(sobra))}</span>` : `<span class="pof-pill neutro">Sem entradas lançadas</span>`;
  const titulo = c.fase === "futuro" ? "Como o mês deve ser" : atualM ? "Como o mês vai fechar" : "Como o mês fechou";
  const legenda = atualM ? `Gasto até hoje <b>${brl0(gasto)}</b> · previsão <b>${brl0(previsto)}</b>` : `${c.fase === "futuro" ? "Gasto previsto" : "Gasto do mês"} <b>${brl0(gasto)}</b>`;
  const trilho = `<div class="proj-trilho" role="img" aria-label="${esc(`${legenda.replace(/<[^>]+>/g, "")}. ${entra > 0 ? "Entradas " + brl0(entra) + "." : ""}`)}">
      <i class="gasto${atualM ? "" : " fechado"}" style="width:${p(gasto)}%"></i>${atualM && previsto > gasto ? `<i class="falta" style="left:${p(gasto)}%;width:${p(previsto) - p(gasto)}%"></i>` : ""}
      ${entra > 0 ? `<u class="entra" style="left:${p(entra)}%"><s>entra</s></u>` : ""}</div>`;
  return `<div class="proj-topo"><b>${titulo}</b>${pill}</div>${trilho}
    <div class="proj-nums">
      <button type="button" data-det="entradas"><small>${atualM || c.fase === "futuro" ? "Entra" : "Entrou"}</small><b class="pos">${brl0(entra)}</b></button>
      <button type="button" data-det="custo"><small>${atualM ? "Gasto até hoje" : c.fase === "futuro" ? "Previsto" : "Gastou"}</small><b>${brl0(gasto)}</b></button>
      ${atualM ? `<button type="button" data-det="custo"><small>Previsão do mês</small><b>${brl0(previsto)}</b></button>` : `<button type="button" data-det="saldo"><small>${falta ? "Faltou" : "Sobrou"}</small><b class="${falta ? "neg" : "pos"}">${brl0(Math.abs(sobra))}</b></button>`}
    </div>${c.res > 0 ? `<p class="proj-nota">Guardado no mês: <button type="button" class="ln" data-det="guardado">${brl0(c.res)}</button></p>` : ""}
    ${metaNota(c)}
    ${acum !== c.saldo ? `<p class="proj-nota">Com os meses anteriores, o saldo acumulado é <b>${sgn(acum)}</b>.</p>` : ""}`;
}
/* ---------- Acessibilidade: títulos que o leitor de tela reconhece e janelas com nome ---------- */
// Os títulos dos quadros do Início são texto comum (span). Aqui eles ganham o papel de título (nível 2), para quem navega por títulos.
function marcaTitulos() {
  document.querySelectorAll("#app .teto > .topo > .l, #app .merc-topo > .l, #app .hero-top > .l").forEach((el) => {
    if (el.getAttribute("role")) return;
    el.setAttribute("role", "heading"); el.setAttribute("aria-level", el.closest(".hero") ? "1" : "2");
  });
}
let marcaTitulosAgendado = false;
new MutationObserver(() => { if (marcaTitulosAgendado) return; marcaTitulosAgendado = true; requestAnimationFrame(() => { marcaTitulosAgendado = false; marcaTitulos(); }); })
  .observe($("app"), { childList: true, subtree: true });
/* ---------- O seu limite cabe? Pelo uso dos últimos meses, diz se o limite se mantém e dá as médias de carro e casa como opção ---------- */
function htmlLimiteCabe() {
  if (!S.loaded) return "";
  const teto = Number(S.prefs.teto) || 0, r = limiteViavel(S.data, S.mes, hoje(), { teto, limites: S.prefs.limites || {} });
  if (!r) return `<div class="lim-cabe"><b>O seu limite cabe?</b><p>Depois de 1 mês fechado de uso, o app mostra aqui quanto você gasta em média e se o seu limite se mantém.</p></div>`;
  const meses = r.n === 1 ? "no último mês" : `nos últimos ${r.n} meses`, usa = (v, rot) => `<button class="btn" type="button" data-usa-limite="${v}">${rot}</button>`;
  const texto = {
    "sem-limite": `<p>${meses[0].toUpperCase() + meses.slice(1)} você gastou, em média, <b>${brl(r.media)}</b> por mês: <b>${brl(r.fixos)}</b> já têm dono (contas fixas e faturas) e <b>${brl(r.dia)}</b> vão para o dia a dia. Dois limites possíveis:</p>
      <div class="lim-botoes">${usa(r.realista, `${brl(r.realista)}: o que você gasta hoje`)}${usa(r.comEconomia, `${brl(r.comEconomia)}: com 5% de economia`)}</div>`,
    cabe: `<p class="bom">Com o limite de <b>${brl(teto)}</b>, cabe. ${meses[0].toUpperCase() + meses.slice(1)} você gastou, em média, ${brl(r.media)} por mês, então sobram cerca de <b>${brl(r.folga)}</b> por mês.</p>`,
    economizando: `<p class="aten">Para manter <b>${brl(teto)}</b>, você precisa gastar cerca de <b>${brl(r.corte)}</b> a menos por mês (uns ${brl(Math.round(r.corte / 30))} por dia), ${r.cortePct}% do que vai para o dia a dia. Dá, mas pede atenção. A média ${meses} foi ${brl(r.media)}.</p>
      <div class="lim-botoes">${usa(r.realista, `Usar ${brl(r.realista)}, o que você gasta hoje`)}</div>`,
    "nao-cabe": `<p class="ruim">Com <b>${brl(teto)}</b> não fecha: só as contas fixas e as faturas já levam <b>${brl(r.fixos)}</b> por mês. Mesmo cortando 20% do dia a dia, o mês ainda passa do limite. Para manter, é preciso reduzir as contas fixas ou subir o limite.</p>
      <div class="lim-botoes">${usa(r.realista, `Subir para ${brl(r.realista)}`)}</div>`,
  }[r.caso];
  const nomeGrupo = { carro: "Carro e moto", casa: "Casa" };
  const cats = r.categorias.length ? `<h5>Médias para usar como limite, se quiser</h5><ul class="lim-cats">${r.categorias.map((x) => `<li><span><b>${nomeGrupo[x.grupo]} · ${esc(x.nome)}</b><small>média de ${brl(x.media)} por mês${x.limite ? ` · limite atual ${brl(x.limite)}` : ""}</small></span>${x.limite === Math.round(x.media) ? `<em>é o seu limite</em>` : `<button class="btn sm" type="button" data-usa-cat="${esc(x.nome)}" data-valor="${Math.round(x.media)}">Usar ${brl(Math.round(x.media))}</button>`}</li>`).join("")}</ul>` : "";
  return `<div class="lim-cabe"><b>O seu limite cabe?</b>${texto}${r.mesAtual?.passa ? `<p class="ruim">Atenção: este mês já gastou ${brl(r.mesAtual.gasto)} e, no ritmo de agora, chega a ${brl(r.mesAtual.previsto)}: passa do limite de ${brl(teto)}.</p>` : ""}${r.outrosPct >= 25 ? `<p class="aten">${brl(r.outros)} da média (${r.outrosPct}%) está em "Outros", sem categoria. Dê categoria em Ferramentas, Arrumar lançamentos, para esta média ficar mais confiável.</p>` : ""}${r.passaDaRenda ? `<p class="ruim">Atenção: em média o seu gasto (${brl(r.media)}) passa do que entra (${brl(r.entra)}). Só mexer no limite não resolve; é preciso gastar menos ou ganhar mais.</p>` : ""}${cats}</div>`;
}
document.addEventListener("click", async (e) => {
  const lim = e.target.closest("[data-usa-limite]"), cat = e.target.closest("[data-usa-cat]"); if (!lim && !cat) return;
  if (lim) { S.prefs.teto = Number(lim.dataset.usaLimite); await salvaPrefs(); toast(`Limite do mês: ${brl(S.prefs.teto)}.`); }
  else { S.prefs.limites = { ...(S.prefs.limites || {}), [cat.dataset.usaCat]: Number(cat.dataset.valor) }; await salvaPrefs(); toast(`Limite de ${cat.dataset.usaCat}: ${brl(Number(cat.dataset.valor))}.`); }
  render(); if ($("dlg").open && $("dlgBody").querySelector(".pof")) paraOndeFoiTela(S.mes);
});
/* ---------- Conta de casal no Início: o mês de cada um e dos dois juntos (js/casalvisao.js) ---------- */
function renderCasalIni(c) {
  const host = $("casalIni"); if (!host) return;
  if (!S.loaded || !casalAtivo() || c.fase === "futuro") { host.hidden = true; host.innerHTML = ""; return; }
  const r = saldosDoCasal(S.data, S.mes, hoje(), S.casal.eu, S.casal.outro_id), outro = nomeDoOutro();
  const col = (k, titulo, quem) => {
    const x = r[k], falta = x.sobra < 0;
    return `<div class="cs-col${k === "juntos" ? " juntos" : ""}" role="group" aria-label="${esc(titulo)}">
      <b class="cs-nome">${esc(titulo)}</b>
      <span><small>Entra</small><i>${brl0(x.rec)}</i></span>
      <span><small>${c.fase === "atual" ? "Previsão do mês" : "Gastou"}</small><i>${brl0(x.custo)}</i></span>
      <span class="cs-sobra ${falta ? "ruim" : "bom"}"><small>${falta ? "Faltam" : "Sobram"}</small><i>${falta ? "▼ " : "▲ "}${brl0(Math.abs(x.sobra))}</i></span>
      ${quem !== null ? `<button class="link" type="button" data-cs-ver="${quem}">Ver lançamentos</button>` : ""}</div>`;
  };
  host.hidden = false;
  host.innerHTML = `<div class="teto casal-card"><span class="topo"><span class="l">${ico("casal")}Contas do casal</span></span>
    <p class="hint" style="margin:0 0 8px;font-size:13px">O mês de cada um e dos dois juntos. A sobra de cada um não soma o que o outro ganha. O Pix entre vocês dois (categoria Casal) não entra em Juntos.</p>
    <div class="cs-grade">${col("eu", "Eu", "eu")}${col("outro", String(outro || "").trim().split(/\s+/)[0] || "Outro", "outro")}${col("juntos", "Juntos", null)}</div></div>`;
  host.querySelectorAll("[data-cs-ver]").forEach((b) => (b.onclick = () => { S.quem = b.dataset.csVer; abrirSub("l"); }));
}
/* ---------- Meu desempenho ---------- */
const ICO_TOM = { good: "sobe", warn: "desce", info: "rumo" };
const desempHtml = (m, max = 5) => {
  const f = S.loaded ? desempenhoDoMes(S.data, m, hoje()).slice(0, max) : [];
  return f.length ? `<ul class="desemp">${f.map((x) => `<li class="${x.tom}"><span class="ic-box">${ico(ICO_TOM[x.tom])}</span><span>${esc(x.texto)}</span></li>`).join("")}</ul>` : "";
};
function renderDesempIni(c) {
  const host = $("desempIni"), html = c.fase !== "futuro" ? desempHtml(S.mes, 2) : "";
  host.hidden = !html; if (!html) { host.innerHTML = ""; return; }
  host.innerHTML = `<div class="teto desemp-card"><span class="topo"><span class="l">${ico("rumo")}Meu desempenho</span></span>${html}<button class="link" type="button" id="desempVer">Ver tudo</button></div>`;
  $("desempVer").onclick = meuDesempenho;
}
function meuDesempenho() {
  const html = desempHtml(S.mes, 5);
  openDlg(`<h3>Meu desempenho em ${nomeMes(S.mes)}</h3>
    ${html || `<p class="hint">Ainda não há com o que comparar. Depois de um mês inteiro de lançamentos, aqui aparece como o seu mês anda em relação aos anteriores.</p>`}
    <p class="hint" style="margin:10px 0 0">As comparações usam só o que você lançou no app.</p>
    <div class="actions"><button class="btn" type="button" data-close>Fechar</button></div>`);
}

/* ---------- Resumo do ano ---------- */
function resumoAno(ano = S.mes.slice(0, 4)) {
  const r = resumoDoAno(S.data, ano, hoje()), com = r.meses.filter((x) => x.tem), maxV = Math.max(1, ...com.map((x) => Math.max(x.rec, x.custo)));
  const mesNome = (x) => `${nomeMes(x.m)}`;
  openDlg(`<h3>Resumo de ${ano}</h3>
    <div class="ano-nav"><button class="btn sm" type="button" id="anoAnt">‹ ${Number(ano) - 1}</button><button class="btn sm" type="button" id="anoProx">${Number(ano) + 1} ›</button></div>
    ${com.length ? `<dl class="ano-tot"><div><dt>Entrou</dt><dd>${brl(r.rec)}</dd></div><div><dt>Gastos</dt><dd>${brl(r.custo)}</dd></div><div><dt>Guardado</dt><dd>${brl(r.guardado)}</dd></div>
      <div><dt>Sobrou</dt><dd class="${r.sobra < 0 ? "txt-bad" : ""}">${sgn(r.sobra)}</dd></div><div><dt>Gasto médio por mês</dt><dd>${brl(r.mediaCusto)}</dd></div></dl>
      ${r.melhor && r.pior && r.melhor.m !== r.pior.m ? `<p class="hint" style="margin:6px 0 10px">Melhor mês: <b>${mesNome(r.melhor)}</b> (${sgn(r.melhor.sobra)}). Mês mais apertado: <b>${mesNome(r.pior)}</b> (${sgn(r.pior.sobra)}).</p>` : ""}
      <h4 class="meta-h">Mês a mês</h4><ul class="ano-meses">${com.map((x) => `<li><span class="mm">${MES3[Number(x.m.slice(5)) - 1]}</span>
        <span class="bs"><i class="b-in" style="width:${(x.rec / maxV) * 100}%"></i><i class="b-out" style="width:${(x.custo / maxV) * 100}%"></i></span><span class="vv ${x.sobra < 0 ? "txt-bad" : ""}">${sgn(x.sobra)}</span></li>`).join("")}</ul>
      <p class="ano-leg"><span><i class="b-in"></i>entrou</span><span><i class="b-out"></i>custo</span></p>
      ${r.categorias.length ? `<h4 class="meta-h">Para onde foi o dinheiro</h4><ul class="ano-cats">${r.categorias.map((c) => `<li><span class="n">${esc(c.nome)}</span><span class="bs"><i style="width:${c.pct}%;background:${corCat(c.nome)}"></i></span><span class="vv">${c.pct}% · ${brl0(c.valor)}</span></li>`).join("")}</ul>` : ""}`
    : `<p class="hint">Não há lançamentos em ${ano}.</p>`}
    <div class="actions"><button class="btn" type="button" id="anoPdf">Baixar em PDF</button><button class="btn primary" type="button" data-close>Fechar</button></div>`);
  $("anoAnt").onclick = () => resumoAno(String(Number(ano) - 1)); $("anoProx").onclick = () => resumoAno(String(Number(ano) + 1));
  $("anoPdf").onclick = () => baixaPdf(ano);
}

/* ---------- Calculadoras ---------- */
const nm = (v) => { const n = parseMoney(String(v ?? "").replace("%", "")); return Number.isFinite(n) ? n : 0; };
const linhaRes = (rot, v, forte = false) => `<div${forte ? ' class="forte"' : ""}><dt>${rot}</dt><dd>${v}</dd></div>`;
const CALCS = [
  { id: "rende", ico: "sobe", curto: "Rendimento", pergunta: "Quanto rende guardar todo mês?", titulo: "Quanto rende guardar todo mês", campos: [["porMes", "Guardar por mês (R$)", "m", "200"], ["inicial", "Já tenho guardado (R$, opcional)", "m", ""], ["meses", "Por quantos meses", "n", "24"], ["taxa", "Taxa ao ano (%)", "n", "10"]],
    nota: "É só a conta da taxa que você digitou, para simular. Não é promessa de ganho nem indicação de investimento.",
    calc: (v) => { const r = rendimentoDeGuardar({ porMes: v.porMes, inicial: v.inicial, meses: v.meses, taxaAnual: v.taxa }); return r && linhaRes("Você terá", brl(r.total), true) + linhaRes("Você guardou", brl(r.aportado)) + linhaRes("Rendeu", brl(r.rendimento)); } },
  { id: "quanto", ico: "alvo", curto: "Quanto guardar", pergunta: "Quanto guardar por mês para juntar um valor?", titulo: "Quanto guardar por mês para chegar lá", campos: [["alvo", "Quanto quer juntar (R$)", "m", "6000"], ["meses", "Em quantos meses", "n", "12"], ["inicial", "Já tenho guardado (R$, opcional)", "m", ""], ["taxa", "Taxa ao ano (%, pode deixar 0)", "n", "0"]],
    nota: "Com taxa 0, a conta é só o que falta dividido pelos meses.",
    calc: (v) => { const r = quantoGuardarPorMes({ alvo: v.alvo, meses: v.meses, inicial: v.inicial, taxaAnual: v.taxa }); return r && (r.jaBasta ? linhaRes("Resultado", "O que você já tem basta", true) : linhaRes("Guarde por mês", brl(r.porMes), true)); } },
  { id: "parcela", ico: "cartao", curto: "Parcelado com juros", pergunta: "Quanto custa de verdade uma compra parcelada?", titulo: "Parcelado com juros: quanto custa", campos: [["valor", "Valor da compra (R$)", "m", "1000"], ["parcelas", "Número de parcelas", "n", "10"], ["taxa", "Juros ao mês (%)", "n", "2"]],
    nota: "Parcelas iguais. A taxa de juros está no contrato ou na simulação da loja.",
    calc: (v) => { const r = parcelaComJuros({ valor: v.valor, parcelas: v.parcelas, taxaMes: v.taxa }); return r && linhaRes("Cada parcela", brl(r.parcela), true) + linhaRes("Total pago", brl(r.total)) + linhaRes("Só de juros", brl(r.juros)); } },
  { id: "juros", ico: "grafico", curto: "Juros compostos", pergunta: "Quanto uma dívida ou um valor parado cresce?", titulo: "Juros compostos (dívida ou dinheiro parado)", campos: [["capital", "Valor (R$)", "m", "1000"], ["taxa", "Taxa ao mês (%)", "n", "3"], ["meses", "Meses", "n", "12"]],
    nota: "Mostra como uma dívida cresce quando fica sem pagar, ou quanto o dinheiro vira com aquela taxa.",
    calc: (v) => { const r = jurosCompostos({ capital: v.capital, taxaMes: v.taxa, meses: v.meses }); return r && linhaRes("Vira", brl(r.montante), true) + linhaRes("Só de juros", brl(r.juros)); } },
  { id: "ferias", ico: "sol", curto: "Férias", pergunta: "Quanto recebo de férias? (bruto)", titulo: "Férias (valor bruto)", campos: [["salario", "Salário (R$)", "m", "3000"], ["dias", "Dias de férias", "n", "30"], ["vender", "Vender 10 dias (abono)", "c", ""]],
    nota: "Valor bruto, antes de INSS e imposto de renda. O valor líquido depende dos seus descontos.",
    calc: (v) => { const r = ferias({ salario: v.salario, dias: v.dias, vender: v.vender }); return r && linhaRes("Total bruto", brl(r.total), true) + linhaRes(`${r.dias} dias de descanso`, brl(r.base)) + linhaRes("Um terço a mais", brl(r.terco)) + (r.abono ? linhaRes("10 dias vendidos (com o terço)", brl(r.abono)) : ""); } },
  { id: "decimo", ico: "presente", curto: "13º salário", pergunta: "Quanto recebo de 13º? (bruto)", titulo: "13º salário (valor bruto)", campos: [["salario", "Salário (R$)", "m", "3000"], ["meses", "Meses trabalhados no ano", "n", "12"]],
    nota: "Valor bruto, antes de INSS e imposto de renda. Pago em duas parcelas.",
    calc: (v) => { const r = decimoTerceiro({ salario: v.salario, meses: v.meses }); return r && linhaRes("Total bruto", brl(r.total), true) + linhaRes("1ª parcela (até 30/11)", brl(r.primeira)) + linhaRes("2ª parcela (até 20/12)", brl(r.segunda)); } },
];
function calculadoras(id = null) {
  const c = CALCS.find((x) => x.id === id);
  if (!c) { // porta de entrada: todas as calculadoras à vista, cada uma com a pergunta que responde
    openDlg(`<h3>Calculadoras</h3>
      <p class="hint" style="margin:0 0 12px">Escolha o que você quer descobrir. É uma simulação: nada do que você digita aqui é guardado.</p>
      <div class="calc-grade">${CALCS.map((x) => `<button type="button" class="calc-card" data-calc="${x.id}"><span class="ic-box">${ico(x.ico)}</span><b>${x.curto}</b><span>${x.pergunta}</span></button>`).join("")}</div>
      <div class="actions"><button class="btn primary" type="button" data-close>Fechar</button></div>`);
    document.querySelectorAll("[data-calc]").forEach((b) => (b.onclick = () => calculadoras(b.dataset.calc)));
    return;
  }
  const campo = ([k, rot, t, pad_]) => t === "c"
    ? `<label class="check wide"><input type="checkbox" data-k="${k}"> ${rot}</label>`
    : `<label class="f">${rot}<input class="in${t === "m" ? " money" : ""}" data-k="${k}" inputmode="decimal" value="${pad_}"></label>`;
  openDlg(`<button class="link calc-volta" type="button" id="calcVolta">${ico("esq")}Todas as calculadoras</button>
    <h3 style="margin-top:4px">${c.titulo}</h3>
    <div class="rc-card calc-topo" aria-live="polite"><dl class="calc-res" id="calcRes"></dl></div>
    <div class="rc-campos" id="calcCampos">${c.campos.map(campo).join("")}</div>
    <p class="hint" style="margin:12px 0 0">${c.nota}</p>
    <div class="actions"><button class="btn" type="button" id="calcOutra">Outra calculadora</button><button class="btn primary" type="button" data-close>Fechar</button></div>`);
  const le = () => Object.fromEntries([...document.querySelectorAll("#calcCampos [data-k]")].map((i) => [i.dataset.k, i.type === "checkbox" ? i.checked : nm(i.value)]));
  const conta = () => { const html = c.calc(le()); $("calcRes").innerHTML = html || `<p class="rc-vazio">Preencha os campos com números para ver o resultado.</p>`; };
  document.querySelectorAll("#calcCampos [data-k]").forEach((i) => i.addEventListener("input", conta));
  document.querySelectorAll("#calcCampos [data-k][type=checkbox]").forEach((i) => i.addEventListener("change", conta));
  $("calcVolta").onclick = $("calcOutra").onclick = () => calculadoras();
  conta();
}

/* ---------- Desafio de economia ---------- */
const desafiosDe = () => (S.prefs.desafios ||= {});
const nomeCurto = (iso) => ddmm(iso);
function desafioEconomia() {
  const ids = Object.keys(desafiosDe());
  if (!ids.length) return novoDesafio();
  const hj = hoje();
  openDlg(`<h3>Desafio de economia</h3>
    ${ids.map((id) => {
      const d = desafiosDe()[id], a = andamentoDoDesafio(d, hj);
      const proxRot = !a.comecou ? `Começa em ${nomeCurto(d.inicio)}` : a.concluido ? "Desafio completo!" : a.proxima > a.atual ? `Adiantar a semana ${a.proxima}: ${brl(a.valorProxima)}` : `Guardei a semana ${a.proxima}: ${brl(a.valorProxima)}`;
      return `<div class="desafio" data-d="${esc(id)}"><div class="d-topo"><b>${esc(d.nome)}</b><span class="pill ${a.concluido ? "good" : "info"}">${a.pct}%</span></div>
        <span class="tbar mbar"><i style="width:${a.pct}%"></i></span>
        <p class="hint" style="margin:6px 0 8px">${brl(a.guardado)} de ${brl(a.total)} em <b>${esc(d.caixinha)}</b>. ${a.comecou ? `Semana ${a.atual} de ${a.semanas}.` : ""}${a.atrasadas.length ? ` ${a.atrasadas.length === 1 ? "1 semana ficou" : a.atrasadas.length + " semanas ficaram"} para trás: sem problema, dá para guardar a qualquer momento.` : ""}</p>
        <div class="d-sem" role="group" aria-label="Semanas do desafio">${Array.from({ length: a.semanas }, (_, i) => i + 1).map((n) => {
          const feita = a.feitas.includes(n), cls = feita ? "feita" : n < a.atual ? "atras" : n === a.atual ? "atual" : "";
          return `<button type="button" class="${cls}" data-sem="${n}" ${feita ? "disabled" : ""} aria-label="Semana ${n}: ${brl(valorDaSemana(d, n))}${feita ? ", guardada" : ""}">${feita ? "✓" : n}</button>`;
        }).join("")}</div>
        <div class="actions"><button class="btn primary sm" type="button" data-prox="${a.proxima}" ${a.concluido || !a.comecou ? "disabled" : ""}>${proxRot}</button>
          ${a.feitas.length ? `<button class="btn sm" type="button" data-desfaz>Desfazer a última</button>` : ""}<button class="link" type="button" data-apaga>Apagar desafio</button></div></div>`;
    }).join("")}
    <div class="actions">${ids.length < 5 ? `<button class="btn" type="button" id="dNovo">Novo desafio</button>` : ""}<button class="btn primary" type="button" data-close>Fechar</button></div>`);
  const dlg = $("dlgBody");
  dlg.querySelectorAll(".desafio").forEach((box) => {
    const id = box.dataset.d;
    box.querySelectorAll("[data-sem]").forEach((b) => (b.onclick = () => marcaSemana(id, Number(b.dataset.sem))));
    box.querySelector("[data-prox]").onclick = (e) => marcaSemana(id, Number(e.currentTarget.dataset.prox));
    box.querySelector("[data-desfaz]")?.addEventListener("click", () => desfazSemana(id));
    box.querySelector("[data-apaga]").onclick = () => apagaDesafio(id);
  });
  if ($("dNovo")) $("dNovo").onclick = novoDesafio;
}
async function marcaSemana(id, n) {
  const d = desafiosDe()[id]; if (!d || d.feitas.includes(n)) return;
  const v = valorDaSemana(d, n), antes = andamentoDaMeta(S.data, d.caixinha, S.prefs.metas?.[d.caixinha], hoje());
  const row = { id: crypto.randomUUID(), data: hoje(), descricao: `${d.nome}: semana ${n}`, tipo: "Reserva", categoria: d.caixinha, forma: "", valor: v, import_key: null };
  let novo; const ok = await grava(async () => { [novo] = await S.store.addLancamentos([row]); });
  if (!ok) return;
  S.data.lancamentos.push(novo ? { ...novo, valor: Number(novo.valor) } : row);
  d.feitas = [...d.feitas, n]; d.ids = { ...(d.ids || {}), [n]: novo?.id || row.id }; salvaPrefs();
  render(); desafioEconomia();
  toast(`Semana ${n} guardada: ${brl(v)} em ${d.caixinha}.` + recadoDaMeta(antes, andamentoDaMeta(S.data, d.caixinha, S.prefs.metas?.[d.caixinha], hoje()), false));
}
async function desfazSemana(id) {
  const d = desafiosDe()[id]; if (!d?.feitas.length) return;
  const n = Math.max(...d.feitas), lid = d.ids?.[n];
  if (lid && S.data.lancamentos.some((x) => x.id === lid)) {
    const ok = await grava(() => S.store.deleteLancamento(lid)); if (!ok) return;
    S.data.lancamentos = S.data.lancamentos.filter((x) => x.id !== lid);
  }
  d.feitas = d.feitas.filter((x) => x !== n); if (d.ids) delete d.ids[n]; salvaPrefs();
  render(); desafioEconomia(); toast(`Semana ${n} desfeita: o lançamento saiu da caixinha ${d.caixinha}.`);
}
function apagaDesafio(id) {
  const d = desafiosDe()[id]; if (!d) return;
  openDlg(`<h3>Apagar o desafio?</h3><p class="hint" style="margin:0 0 12px">O desafio <b>${esc(d.nome)}</b> some desta lista. O dinheiro que você já guardou continua na caixinha ${esc(d.caixinha)}.</p>
    <div class="actions"><button class="btn" type="button" id="dSim">Apagar desafio</button><button class="btn" type="button" id="dNao">Voltar</button></div>`);
  $("dNao").onclick = () => desafioEconomia();
  $("dSim").onclick = () => { const o = { ...desafiosDe() }; delete o[id]; S.prefs.desafios = o; salvaPrefs(); desafioEconomia(); };
}
function novoDesafio() {
  const lista = cats("Reserva");
  openDlg(`<h3>Novo desafio de economia</h3>
    <p class="hint" style="margin:0 0 10px">Escolha quanto guardar por semana. No clássico, você guarda 1 real na primeira semana, 2 na segunda, e assim por diante.</p>
    <form id="dnForm" class="dlg-form" autocomplete="off">
      <label class="f wide">Nome<input class="in" id="dnNome" maxlength="40" placeholder="Ex.: Viagem de fim de ano"></label>
      <label class="f wide">Guardar em qual caixinha<select class="in" id="dnCx">${opts(lista)}</select></label>
      <label class="f wide">Como vai ser<select class="in" id="dnModo">${Object.entries(MODOS_DESAFIO).map(([k, t]) => `<option value="${k}">${t}</option>`).join("")}</select></label>
      <label class="f">Valor base (R$)<input class="in money" id="dnBase" inputmode="decimal" value="1,00"></label>
      <label class="f">Quantas semanas<input class="in" id="dnSem" inputmode="numeric" value="52"></label>
      <label class="f wide">Começa em<input class="in" id="dnIni" type="date" value="${hoje()}"></label>
      <p class="hint wide meta-conta" id="dnConta" aria-live="polite"></p>
      <p class="auth-msg err wide" id="dnMsg" role="alert"></p>
      <div class="actions wide"><button class="btn primary" type="submit">Começar desafio</button><button class="btn" type="button" id="dnVolta">${Object.keys(desafiosDe()).length ? "Voltar" : "Cancelar"}</button></div></form>`);
  const le = () => ({ nome: $("dnNome").value, caixinha: $("dnCx").value, modo: $("dnModo").value, base: nm($("dnBase").value), semanas: Number($("dnSem").value), inicio: $("dnIni").value });
  const conta = () => {
    const d = criaDesafio(le());
    $("dnConta").innerHTML = d ? `No fim das ${d.semanas} semanas você terá guardado <b>${brl(totalDoDesafio(d))}</b>. ${d.modo === "fixo" ? "" : `A primeira semana é ${brl(valorDaSemana(d, 1))} e a última, ${brl(valorDaSemana(d, d.semanas))}.`}` : "";
  };
  ["dnModo", "dnBase", "dnSem", "dnIni", "dnCx"].forEach((i) => $(i).addEventListener("input", conta)); conta();
  $("dnVolta").onclick = () => (Object.keys(desafiosDe()).length ? desafioEconomia() : $("dlg").close());
  $("dnForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const d = criaDesafio(le());
    if (!d) return void ($("dnMsg").textContent = "Confira os campos: o valor precisa ser maior que zero, e o desafio vai de 4 a 104 semanas.");
    if (d.base > VALOR_MAX) return void ($("dnMsg").textContent = ALTO_DEMAIS);
    S.prefs.desafios = { ...desafiosDe(), [crypto.randomUUID()]: d }; salvaPrefs(); desafioEconomia();
    toast("Desafio criado. Toque em Guardei a cada semana para registrar.");
  });
}

/* ---------- "Você copiou a mensagem do banco?": o gasto entra com um toque, sem digitar ---------- */
const resumoCopiado = (f) => `${f.tipo === "Receita" ? "Entrada" : "Gasto"} de ${brl(f.valor)}${f.descricao ? ` · ${f.descricao}` : ""}`;
async function ofereceCopiado() {
  const host = $("fCopiado"); if (!host) return;
  host.hidden = true; host.innerHTML = "";
  if (!navigator.clipboard?.readText || !S.loaded) return;
  let estado = "prompt"; try { estado = (await navigator.permissions.query({ name: "clipboard-read" })).state; } catch { /* Safari: pergunta na hora do toque */ }
  if (estado === "denied" || !document.body.classList.contains("lancando")) return;
  if (estado === "granted") {   // já deu licença antes: lê sozinho e só mostra se parece mensagem de banco com valor
    let txt = ""; try { txt = (await navigator.clipboard.readText()).trim().slice(0, 600); } catch { return; }
    const f = txt && txt !== S.copiadoVisto ? entendeMensagemBanco(txt, hoje()) : null;
    if (!f?.valor || !/\b(compra|pix|pagamento|debito|débito|credito|crédito|transfer|recebeu|enviou|boleto|cartao|cartão)\b/i.test(txt)) return;
    host.innerHTML = `<button type="button" class="copiado-bt" id="copiadoUsa"><span class="tx"><b>Você copiou uma mensagem do banco</b><span>${esc(resumoCopiado(f))}. Toque para anotar.</span></span></button><button type="button" class="copiado-x" id="copiadoX" aria-label="Agora não">✕</button>`;
    host.hidden = false;
    $("copiadoUsa").onclick = () => { S.copiadoVisto = txt; host.hidden = true; aplicaEntendido(f, txt, "mensagem"); };
    $("copiadoX").onclick = () => { S.copiadoVisto = txt; host.hidden = true; };
    return;
  }
  if (S.prefs.colarOculto) return;
  host.innerHTML = `<button type="button" class="copiado-bt leve" id="copiadoPede"><span class="tx"><b>Copiou a mensagem do banco?</b><span>Toque aqui: o app lê o valor e o nome da loja.</span></span></button><button type="button" class="copiado-x" id="copiadoX" aria-label="Não mostrar mais">✕</button>`;
  host.hidden = false;
  $("copiadoX").onclick = () => { host.hidden = true; S.prefs.colarOculto = true; salvaPrefs(); };
  $("copiadoPede").onclick = async () => {
    let txt = ""; try { txt = (await navigator.clipboard.readText()).trim().slice(0, 600); } catch { toast("Não consegui ler o que você copiou. Use Mais > Colar mensagem do banco."); return; }
    const f = txt ? entendeMensagemBanco(txt, hoje()) : null;
    if (!f?.valor) return toast("Não achei um valor em reais no que você copiou. Copie a mensagem do banco e toque de novo.");
    S.copiadoVisto = txt; host.hidden = true; aplicaEntendido(f, txt, "mensagem");
  };
}
document.addEventListener("visibilitychange", () => { if (!document.hidden && document.body.classList.contains("lancando")) ofereceCopiado(); });

/* ---------- Colar mensagem do banco ---------- */
function colarMensagem() {
  openDlg(`<h3>Colar mensagem do banco</h3>
    <p class="hint" style="margin:0 0 10px">Copie a notificação ou o SMS do banco e cole aqui. O app preenche o lançamento e você confere antes de lançar. O texto não é guardado nem enviado para lugar nenhum.</p>
    <form id="cmForm" class="dlg-form" autocomplete="off"><label class="f wide">Mensagem<textarea class="in" id="cmTexto" rows="4" maxlength="600" placeholder="Ex.: Compra aprovada no cartão final 1234 de R$ 32,50 em MERCADO SANTA LUZIA"></textarea></label>
      <p class="auth-msg err wide" id="cmMsg" role="alert"></p>
      <div class="actions wide"><button class="btn primary" type="submit">Preencher lançamento</button>${navigator.clipboard?.readText ? `<button class="btn" type="button" id="cmColar">Colar do que copiei</button>` : ""}<button class="btn" type="button" data-close>Cancelar</button></div></form>`);
  $("cmTexto").focus();
  if ($("cmColar")) $("cmColar").onclick = async () => { try { $("cmTexto").value = (await navigator.clipboard.readText()).slice(0, 600); } catch { $("cmMsg").textContent = "Não deu para colar sozinho. Toque no campo e use Colar."; } };
  $("cmForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const txt = $("cmTexto").value.trim(), f = entendeMensagemBanco(txt, hoje());
    if (!txt) return void ($("cmMsg").textContent = "Cole a mensagem do banco no campo acima.");
    if (!f.valor) return void ($("cmMsg").textContent = "Não achei um valor em reais (R$) nessa mensagem. Confira o texto ou lance à mão.");
    $("dlg").close(); S.view = "inicio";
    setTimeout(() => { if (noCelular()) abrirLancar(); aplicaEntendido(f, txt, "mensagem"); }, 250);
  });
}

/* ---------- Gasto em outra moeda (viagem) ---------- */
function outraMoeda() {
  const cot = S.prefs.cotacoes || {};
  openDlg(`<h3>Gasto em outra moeda</h3>
    <p class="hint" style="margin:0 0 10px">Digite o valor de fora e quantos reais vale 1 da moeda (a cotação do dia, do app do banco ou da casa de câmbio). O app converte e põe o valor em reais no lançamento.</p>
    <form id="omForm" class="dlg-form" autocomplete="off">
      <label class="f wide">Moeda<select class="in" id="omMoeda">${MOEDAS.map((m) => `<option value="${m.cod}">${m.nome} (${m.simbolo})</option>`).join("")}</select></label>
      <label class="f">Valor na moeda de fora<input class="in money" id="omValor" inputmode="decimal" placeholder="0,00"></label>
      <label class="f">Cotação (R$ por 1)<input class="in money" id="omCot" inputmode="decimal" placeholder="Ex.: 5,40"></label>
      <p class="hint wide meta-conta" id="omRes" aria-live="polite"></p>
      <p class="auth-msg err wide" id="omMsg" role="alert"></p>
      <div class="actions wide"><button class="btn primary" type="submit">Usar este valor</button><button class="btn" type="button" data-close>Cancelar</button></div></form>`);
  const poeCot = () => { const c = cot[$("omMoeda").value]; $("omCot").value = c ? Number(c).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : ""; conta(); };
  const conta = () => { const r = valorEmReais(nm($("omValor").value), nm($("omCot").value)); $("omRes").innerHTML = r ? `${textoDaMoeda($("omMoeda").value, nm($("omValor").value))} = <b>${brl(r)}</b>` : ""; };
  $("omMoeda").onchange = poeCot; $("omValor").addEventListener("input", conta); $("omCot").addEventListener("input", conta); poeCot(); $("omValor").focus();
  $("omForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const cod = $("omMoeda").value, vf = nm($("omValor").value), ct = nm($("omCot").value), r = valorEmReais(vf, ct);
    if (!r || r > VALOR_MAX) return void ($("omMsg").textContent = "Digite o valor e a cotação, com números maiores que zero.");
    S.prefs.cotacoes = { ...cot, [cod]: ct }; salvaPrefs();
    $("dlg").close();
    $("fValor").value = r.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
    const nota = `(${textoDaMoeda(cod, vf)})`, d = $("fDesc").value.trim();
    if (!d.includes(nota)) $("fDesc").value = (d ? d + " " : "") + nota;
    renderForm(); $("fValor").focus();
    toast(`${textoDaMoeda(cod, vf)} = ${brl(r)}. Confira e lance.`);
  });
}
$("fMoedaBtn").onclick = outraMoeda;

/* ---------- Relatório: Excel, PDF ou CSV ---------- */
function baixaArquivo(nome, blob) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nome; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function baixaPdf(ano) { baixaArquivo(`meus-gastos-${ano}.pdf`, new Blob([pdfDeLinhas(relatorioEmLinhas(S.data, ano, hoje()))], { type: "application/pdf" })); }
function baixaCsv(ano) { baixaArquivo(`meus-gastos-${ano}.csv`, new Blob([csvDoAno(S.data, ano, hoje())], { type: "text/csv;charset=utf-8" })); }
async function baixaExcel(btn) {
  if (btn) btn.disabled = true;
  try { await carregaXLSX(); } catch { /* cai na mensagem abaixo */ } finally { if (btn) btn.disabled = false; }
  if (typeof XLSX === "undefined") return showBanner("Não foi possível gerar a planilha do Excel. Confira a internet e tente de novo, ou baixe em PDF ou CSV.");
  const wb = buildWorkbook(XLSX, S.data, S.mes.slice(0, 4), calcMes, hoje());
  XLSX.writeFile(wb, `meus-gastos-relatorio-${S.mes.slice(0, 4)}.xlsx`);
}
function baixarRelatorio() {
  const ano = S.mes.slice(0, 4);
  openDlg(`<h3>Baixar relatório de ${ano}</h3><p class="hint" style="margin:0 0 12px">Escolha o formato. O arquivo é feito aqui no aparelho.</p>
    <div class="caixa-mais">${opFerr("rlXlsx", "baixar", "Planilha do Excel", "Lançamentos, contas fixas, faturas e o resumo de cada mês")}
      ${opFerr("rlPdf", "baixar", "PDF", "Resumo do ano, para onde foi o dinheiro e a lista de lançamentos")}
      ${opFerr("rlCsv", "baixar", "CSV", "Lista simples dos lançamentos, abre no Excel e no Google Planilhas")}</div>
    <div class="actions"><button class="btn" type="button" data-close>Fechar</button></div>`);
  $("rlXlsx").onclick = () => baixaExcel($("rlXlsx")); $("rlPdf").onclick = () => baixaPdf(ano); $("rlCsv").onclick = () => baixaCsv(ano);
}

/* ---------- Repetir um lançamento, apagar com desfazer e deslizar na lista ---------- */
/** Uma cópia do lançamento, de hoje, pronta para gravar (sem o que é só daquele lançamento). */
const copiaParaHoje = (x) => { const { id, created_at, enviando, pendente, comprovante, user_id, ...r } = x; return { ...r, data: hoje(), id: crypto.randomUUID(), import_key: null }; };
const vibra = (ms = 12) => { try { navigator.vibrate?.(ms); } catch { /* sem vibração */ } };
async function repeteLancamento(x) {
  if (!x || x.auto || x.forma === JA_TINHA) return;
  const row = copiaParaHoje(x); let novo;
  if (!(await grava(async () => { [novo] = await S.store.addLancamentos([row]); }))) return;
  const g = novo || row; S.data.lancamentos.push({ ...g, valor: Number(g.valor) });
  vibra(); render();
  toastDesfazer(`Lançado de novo: ${row.descricao || row.categoria} · ${brl(row.valor)}, hoje.`, async () => { if (await apagaLancamento(g.id)) render(); });
}
async function apagaComDesfazer(id, depois) {
  const x = lancPorId(id); if (!x) return;
  const { enviando, pendente, user_id, ...copia } = x;   // o comprovante (foto) fica na cópia: se desfizer, a foto volta junto
  if (!(await apagaLancamento(id, true))) return;
  let desfeito = false;
  if (x.comprovante) setTimeout(() => { if (!desfeito) Promise.resolve(S.store.apagaComprovante?.(x.comprovante)).catch(() => { /* nada */ }); }, 120000);
  vibra(); render(); depois?.();
  toastDesfazer(`Apagado: ${x.descricao || x.categoria} · ${brl(x.valor)}.`, async () => {
    let novo; if (await grava(async () => { [novo] = await S.store.addLancamentos([copia]); })) { desfeito = true; const g = novo || copia; S.data.lancamentos.push({ ...g, valor: Number(g.valor) }); render(); depois?.(); }
  });
}
/** Deslizar uma linha para a esquerda apaga (a tela decide o que fazer). Vale para qualquer lista: `seletor` diz quais linhas deslizam. */
function ligaDeslizarLinha(host, seletor, aoApagar) {
  host._desliza = { seletor, aoApagar };
  if (host.dataset.deslizaL) return; host.dataset.deslizaL = "1";
  let li = null, x0 = 0, y0 = 0, dx = 0, trava = false;
  const solta = () => { const el = li; li = null; dx = 0; trava = false; if (el) { el.style.transform = ""; el.classList.remove("desliza-apaga"); } return el; };
  host.addEventListener("touchstart", (e) => {
    const c = host._desliza; li = c && e.touches.length === 1 && !e.target.closest("button, a, input, select") ? e.target.closest(c.seletor) : null;
    if (li) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = 0; trava = false; }
  }, { passive: true });
  host.addEventListener("touchmove", (e) => {
    if (!li) return;
    const mx = e.touches[0].clientX - x0, my = e.touches[0].clientY - y0;
    if (!trava) { if (Math.abs(my) > 12 && Math.abs(my) > Math.abs(mx)) { li = null; return; } if (mx < -12 && Math.abs(mx) > Math.abs(my) * 1.5) trava = true; else return; }
    dx = Math.max(-140, Math.min(0, mx)); li.style.transform = `translateX(${dx}px)`; li.classList.add("desliza-apaga");
    if (e.cancelable) e.preventDefault();
  }, { passive: false });
  host.addEventListener("touchend", () => { const d = dx, foi = trava, el = solta(); if (el && foi && d < -90) { fimDeslizar = Date.now(); host._desliza.aoApagar(el); } });
  host.addEventListener("touchcancel", solta);
}
let fimDeslizar = 0;
/** Na lista do celular: deslizar para a direita repete o lançamento e para a esquerda apaga (com desfazer). */
function ligaDeslizar(host) {
  if (host.dataset.desliza) return; host.dataset.desliza = "1";
  let tr = null, x0 = 0, y0 = 0, dx = 0, trava = false;
  host.addEventListener("touchstart", (e) => {
    tr = e.touches.length === 1 && !e.target.closest("button") ? e.target.closest("tr[data-id],li[data-apaga]") : null;
    if (tr) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = 0; trava = false; }
  }, { passive: true });
  host.addEventListener("touchmove", (e) => {
    if (!tr) return;
    const mx = e.touches[0].clientX - x0, my = e.touches[0].clientY - y0;
    if (!trava) { if (Math.abs(my) > 12 && Math.abs(my) > Math.abs(mx)) { tr = null; return; } if (Math.abs(mx) > 12 && Math.abs(mx) > Math.abs(my) * 1.5) trava = true; else return; }
    dx = Math.max(-140, Math.min(140, mx)); tr.style.transform = `translateX(${dx}px)`;
    tr.classList.toggle("desliza-d", dx > 0); tr.classList.toggle("desliza-e", dx < 0);
    if (e.cancelable) e.preventDefault();
  }, { passive: false });
  const solta = () => {
    if (!tr) return; const el = tr, d = dx, foi = trava; tr = null; dx = 0; trava = false;
    el.style.transform = ""; el.classList.remove("desliza-d", "desliza-e");
    if (!foi) return;
    fimDeslizar = Date.now();
    if (d > 90 && el.dataset.id) repeteLancamento(lancPorId(el.dataset.id)); else if (d < -90) apagaComDesfazer(el.dataset.id || el.dataset.apaga, host._depois);
  };
  host.addEventListener("touchend", solta); host.addEventListener("touchcancel", () => { if (tr) { tr.style.transform = ""; tr.classList.remove("desliza-d", "desliza-e"); tr = null; } });
}

/* ---------- Comemoração ---------- */
/** Uns confetes rápidos na tela (some sozinho; não aparece para quem pediu menos movimento). */
function comemora() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const el = document.createElement("div"); el.className = "confete"; el.setAttribute("aria-hidden", "true");
  const cores = ["#3ecf74", "#f2b94b", "#6aa8ff", "#ff8fa3", "#c3b4ff"];
  for (let i = 0; i < 18; i++) {
    const p = document.createElement("i"), ang = (Math.PI * 2 * i) / 18 + Math.random() * 0.4, d = 90 + Math.random() * 110;
    p.style.cssText = `background:${cores[i % cores.length]};--dx:${Math.cos(ang) * d}px;--dy:${Math.sin(ang) * d + 40}px;--r:${Math.round(Math.random() * 540 - 270)}deg;animation-delay:${Math.round(Math.random() * 90)}ms`;
    el.append(p);
  }
  document.body.append(el); setTimeout(() => el.remove(), 1300);
}

/** Dias até o próximo fechamento da fatura do cartão (0 = fecha hoje). */
function diasParaFechar(k, hojeISO = hoje()) {
  const d = Number(hojeISO.slice(8, 10)), fecha = Math.max(1, Math.min(31, Number(k.fechamento) || 1)), dim = new Date(Number(hojeISO.slice(0, 4)), Number(hojeISO.slice(5, 7)), 0).getDate();
  return fecha >= d ? Math.min(fecha, dim) - d : dim - d + fecha;
}
/** Carrossel de cartões no Início: quanto está a fatura de cada um e quando fecha. Tocar abre Cartões. */
function htmlCartoesIni() {
  const ks = S.loaded ? cartoesAtivos() : []; if (!ks.length) return "";
  const fats = new Map(faturasDoMes(S.data, S.mes).filter((f) => f.cartao_id).map((f) => [f.cartao_id, f]));
  return `<section class="cart-ini" aria-label="Seus cartões"><ul class="cart-lista">${ks.map((k) => {
    const f = fats.get(k.id), n = diasParaFechar(k), quando = n === 0 ? "fecha hoje" : n === 1 ? "fecha amanhã" : `fecha em ${n} dias`;
    return `<li><button type="button" class="cart-card" data-cartao-ini="${esc(k.id)}">
      <span class="cart-nome">${ava("", "Cartao")}${esc(k.nome)}</span><b class="ocultavel">${brl(f ? f.valor : 0)}</b><small>Fatura de ${esc(nomeMes(S.mes))} · ${quando}</small></button></li>`;
  }).join("")}</ul></section>`;
}
/** Lista de mercado no Início: anota o item na hora e, no mercado, é só abrir a lista e colocar os valores. */
function htmlMercadoIni() {
  const l = listaDe(), falta = l.itens.filter((x) => !x.pego), precos = S.prefs.precosMercado || {};
  if (!l.itens.length && noCelular()) return "";   // lista vazia: no celular ela mora em Mais > Lista de mercado, o Início fica mais curto
  const e = estimativaDaLista(l.itens, precos, 0), nCar = l.itens.length - falta.length;
  const res = !l.itens.length ? "Anote o que falta. No mercado, é só colocar os valores."
    : `${falta.length} ${falta.length === 1 ? "item para pegar" : "itens para pegar"}${nCar ? ` · ${nCar} no carrinho` : ""}${e.estimado > 0 ? ` · estimativa ${brl(e.estimado)}` : ""}`;
  return `<section class="merc-ini" aria-label="Lista de mercado">
    <div class="merc-topo"><span class="l">${ico("carrinho")}<b>Lista de mercado</b></span><button class="btn sm" type="button" id="mercAbrir">${l.itens.length ? "Abrir a lista" : "Criar a lista"}</button></div>
    ${l.itens.length ? `<p class="merc-res">${res}</p>` : ""}
    ${falta.length ? `<ul class="merc-chips" aria-label="O que falta pegar">${falta.slice(0, 6).map((x) => `<li>${esc(x.nome || "Item")}</li>`).join("")}${falta.length > 6 ? `<li class="mais">+${falta.length - 6}</li>` : ""}</ul>` : ""}
    <form id="mercForm" class="merc-add" autocomplete="off"><input class="in" id="mercNome" maxlength="40" placeholder="Anotar item (ex.: arroz)" aria-label="Anotar item na lista de mercado" enterkeyhint="done">
      <button type="submit" aria-label="Adicionar à lista">${ico("mais")}</button></form></section>`;
}
function ligaMercadoIni() {
  if (!$("mercForm")) return;
  $("mercAbrir").onclick = mercado;
  $("mercForm").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const nome = $("mercNome").value.trim();
    if (!nome) return $("mercNome").focus();
    const l = listaDe(); if (l.itens.length >= 300) return void toast("A lista chegou a 300 itens. Finalize ou limpe antes de adicionar mais.");
    if (itemNaLista(l.itens, nome)) { $("mercNome").select(); return void toast(`${nome.slice(0, 40)} já está na lista.`); }
    l.itens.push({ id: crypto.randomUUID(), nome: nome.slice(0, 40), qtd: 1, preco: 0, pego: false, t: Date.now() });
    gravaLista(l); render();
    toast(`${nome.slice(0, 40)} anotado na lista de mercado.`);
    setTimeout(() => $("mercNome")?.focus(), 0);
  });
}
/* ---------- Compras no mercado ---------- */
const MERC_CHAVE = "cg-mercado";   // só para trazer a lista que a pessoa montou nas versões anteriores
const listaDe = () => {
  const l = S.prefs.listaMercado || {};
  return { itens: Array.isArray(l.itens) ? l.itens : [], apagados: Array.isArray(l.apagados) ? l.apagados : [], limite: Number(l.limite) || 0, tl: Number(l.tl) || 0, outraCat: Boolean(l.outraCat) };
};
const gravaLista = (l) => { S.prefs.listaMercado = { itens: l.itens.slice(0, 300), apagados: (l.apagados || []).slice(-200), limite: l.limite || 0, tl: l.tl || 0, outraCat: Boolean(l.outraCat) }; salvaPrefs(); };
/** Traz a lista de antes (guardada só neste aparelho) para dentro da conta, uma vez. */
function trazListaAntiga() {
  if (S.prefs.listaMercado) return;
  try {
    const j = JSON.parse(localStorage.getItem(MERC_CHAVE));
    if (j && Array.isArray(j.itens) && j.itens.length) {
      const t = Date.now(); S.prefs.listaMercado = { itens: j.itens.slice(0, 300).map((x) => ({ id: crypto.randomUUID(), nome: String(x.nome || "").slice(0, 40), qtd: Number(x.qtd) > 0 ? Number(x.qtd) : 1, preco: Number(x.preco) > 0 ? Number(x.preco) : 0, cat: x.cat, t })), apagados: [], limite: Number(j.limite) || 0, tl: t, outraCat: Boolean(j.outraCat) };
      salvaPrefs();
    }
    localStorage.removeItem(MERC_CHAVE);
  } catch { /* sem lista antiga */ }
}
/** Na conta de casal: busca a lista da outra pessoa e junta com a daqui. Devolve true se algo mudou. */
async function sincronizaLista() {
  if (!casalAtivo() || S.store?.kind !== "supabase") return false;
  try {
    const c = await S.store.casalMeu();
    if (c?.situacao !== "ativo" || !c.dados) return false;
    S.casal = c;
    const eu = listaDe(), j = juntaLista(eu, c.dados.listaMercado), nova = { ...j, outraCat: eu.outraCat };
    S.prefs.precosMercado = { ...(c.dados.precosMercado || {}), ...(S.prefs.precosMercado || {}) };
    const mudou = canonico(nova) !== canonico(eu);
    S.prefs.listaMercado = nova;
    if (mudou || canonico(nova) !== canonico({ ...(c.dados.listaMercado || {}), outraCat: eu.outraCat })) salvaPrefs();
    return mudou;
  } catch (e) { console.warn("Lista não atualizou:", e?.message); return false; }
}
/** Depois que o gasto da compra foi lançado: os itens do carrinho saem da lista e os preços ficam lembrados. */
function concluiLista() {
  const f = S.listaFinalizando; if (!f) return;
  S.listaFinalizando = null;
  const l = listaDe(), t = Date.now(), ids = new Set(f.ids), precos = { ...(S.prefs.precosMercado || {}) };
  for (const [k, v] of Object.entries(f.precos)) { delete precos[k]; precos[k] = v; }
  const chaves = Object.keys(precos); for (const k of chaves.slice(0, Math.max(0, chaves.length - 400))) delete precos[k];
  S.prefs.precosMercado = precos;
  S.prefs.historicoPrecos = registraPrecos(S.prefs.historicoPrecos, f.precos, hoje());
  S.prefs.ultimaCompraMercado = { data: hoje(), itens: l.itens.filter((x) => ids.has(x.id)).slice(0, 120).map((x) => ({ nome: x.nome, qtd: Number(x.qtd) > 0 ? Number(x.qtd) : 1 })) };
  gravaLista({ ...l, itens: l.itens.filter((x) => !ids.has(x.id)), apagados: [...l.apagados, ...[...ids].map((id) => ({ id, t }))], tl: t });
  toast("Compra lançada. Os itens do carrinho saíram da lista; o que ficou de fora continua nela." + resumoDaCompra(f.total, f.media));
}

function mercado() {
  trazListaAntiga(); S.listaFinalizando = null;
  const catsD = cats("Despesa"), padrao = catsD.includes("Mercado") ? "Mercado" : catsD[0];
  let timer = null, confirmaLimpar = false;
  const muda = (fn) => { const l = listaDe(); fn(l); gravaLista(l); };
  const agora = () => Date.now(), tarde = (f) => setTimeout(f, 0);   // redesenhar no meio de um "change" quebra o foco do campo
  const desenha = () => {
    const l = listaDe(), precos = S.prefs.precosMercado || {}, hist = S.prefs.historicoPrecos || {}, repetir = itensParaRepetir(S.prefs.ultimaCompraMercado, l.itens), c = calcMes(S.data, mKey(hoje()), hoje()), tk = ticketMedioMercado(S.data.lancamentos, hoje(), padrao);
    const e = estimativaDaLista(l.itens, precos, tk.media), noMes = new Map(catMap(c)).get(padrao) || 0, outro = casalAtivo() ? nomeDoOutro() : "";
    const cabe = l.limite > 0 ? round2(l.limite - e.noCarrinho) : null, semPrecoNoCarrinho = l.itens.filter((x) => x.pego && !(precoDoItem(x, precos).valor > 0)).length;
    const falta = l.itens.filter((x) => !x.pego), nocar = l.itens.filter((x) => x.pego);
    const aprendidas = S.prefs.catItens || {};
    const catDoItem = (x) => { if (x.cat) return x.cat; const ap = aprendidas[chaveDoItem(x.nome)]; if (ap && catsD.includes(ap)) return ap; const g = guessCat(x.nome || "", "Despesa"); return g && g !== "Outros" && catsD.includes(g) ? g : padrao; };
    const linha = (x) => {
      const pr = precoDoItem(x, precos), q = Number(x.qtd) > 0 ? Number(x.qtd) : 1, id = esc(x.id), qt = String(q).replace(".", ",");
      return `<li class="ml-item${x.pego ? " pego" : ""}">
        <button class="ml-check" type="button" data-pega="${id}" aria-pressed="${Boolean(x.pego)}" aria-label="${x.pego ? "Tirar do carrinho" : "Colocar no carrinho"}: ${esc(x.nome || "item")}">${ico("ok")}</button>
        <span class="ml-corpo"><b>${esc(x.nome || "Item")}</b><small>${pr.valor > 0 ? `${brl(pr.valor * q)}${q > 1 ? ` (${qt} × ${brl(pr.valor)})` : ""}${pr.de === "ultimo" ? " · último preço" : ""}${(() => { const vr = variacaoDoPreco(hist[chaveDoItem(x.nome)], pr.valor); return vr ? ` · ${vr.pct > 0 ? "subiu" : "baixou"} ${Math.abs(vr.pct)}% desde ${ddmm(vr.desde)}` : ""; })()}` : "informe o preço"}</small></span>
        <button class="mc-x" type="button" data-x="${id}" aria-label="Tirar da lista: ${esc(x.nome || "item")}">×</button>
        <span class="ml-ajuste">
          <span class="ml-qtd" role="group" aria-label="Quantidade de ${esc(x.nome || "item")}"><button type="button" data-menos="${id}" aria-label="Menos um">−</button><output>${qt}</output><button type="button" data-mais="${id}" aria-label="Mais um">+</button></span>
          <label class="ml-preco"><span>R$</span><input class="money" data-preco="${id}" inputmode="decimal" aria-label="Preço de cada ${esc(x.nome || "item")}" placeholder="${pr.de === "ultimo" ? esc(pr.valor.toFixed(2).replace(".", ",")) : "0,00"}" value="${Number(x.preco) > 0 ? esc(String(x.preco).replace(".", ",")) : ""}"><button class="ml-foto" type="button" data-foto="${id}" aria-label="Ler o preço de ${esc(x.nome || "item")} pela câmera">${ico("camera")}</button></label>
        </span>
        ${l.outraCat ? `<select class="in ml-cat" data-cat="${id}" aria-label="Categoria de ${esc(x.nome || "item")}">${(catsD.includes(catDoItem(x)) ? catsD : [catDoItem(x), ...catsD]).map((k) => `<option${k === catDoItem(x) ? " selected" : ""}>${esc(k)}</option>`).join("")}${optNova("Despesa")}</select>` : ""}
      </li>`;
    };
    const raiz = $("dlg"), rolou = raiz.scrollTop;
    openDlg(`<div id="mlRoot"><h3>Lista de mercado</h3>
      ${outro ? `<p class="ml-par">${ico("casal")}<span>Dividida com <b>${esc(outro)}</b>. O que um adiciona ou marca aparece para o outro em instantes.</span></p>` : ""}
      <div class="ml-resumo">
        <div><small>Estimativa da compra</small><b>${e.estimado > 0 ? brl(e.estimado) : e.pelaMedia > 0 ? "≈ " + brl(e.pelaMedia) : brl(0)}</b>
          <small>${e.estimado > 0 ? (e.semPreco ? `${e.semPreco} ${e.semPreco === 1 ? "item sem preço" : "itens sem preço"}` : "todos com preço") : e.pelaMedia > 0 ? "pela sua compra média" : "informe os preços"}</small></div>
        <div><small>No carrinho · ${e.pegos} de ${e.total}</small><b>${brl(e.noCarrinho)}</b>${cabe === null ? `<small>${e.pegos ? "o que você já pegou" : "nada ainda"}</small>` : `<small class="${cabe < 0 ? "neg" : ""}">${cabe >= 0 ? `ainda cabem ${brl(cabe)}` : `passou ${brl(-cabe)} do limite`}</small>`}</div>
      </div>
      ${tk.n > 0 ? `<p class="ml-hist">Você já lançou <b>${brl(noMes)}</b> em ${esc(padrao)} neste mês. Sua compra média é <b>${brl(tk.media)}</b> e o gasto, cerca de <b>${brl(tk.porMes)}</b> por mês.</p>` : ""}
      <form id="mlForm" class="ml-add" autocomplete="off">
        <input class="in" id="mlNome" maxlength="40" list="mlSug" placeholder="Adicionar item (ex.: arroz)" aria-label="Nome do item" enterkeyhint="done">
        <button class="ml-mais" type="submit" aria-label="Adicionar à lista">${ico("mais")}</button>
        <datalist id="mlSug">${Object.keys(precos).slice(-60).map((k) => `<option value="${esc(k)}">`).join("")}</datalist>
      </form>
      ${repetir.length ? `<button class="btn sm ml-repete" type="button" id="mlRepete">Repetir a última compra · ${repetir.length} ${repetir.length === 1 ? "item" : "itens"}</button>` : ""}
      ${falta.length ? `<h4 class="ml-h">Falta pegar <span>${falta.length}</span></h4>${falta.length >= 6 ? agrupaPorCorredor(falta).map((g) => `<h5 class="ml-corr">${esc(g.corredor)}</h5><ul class="ml-lista">${g.itens.map(linha).join("")}</ul>`).join("") : `<ul class="ml-lista">${falta.map(linha).join("")}</ul>`}` : l.itens.length ? `<p class="ml-vazio">Tudo no carrinho. Toque em Finalizar compra.</p>` : `<p class="ml-vazio">A lista está vazia.<br>Digite o que precisa comprar e toque em +.</p>`}
      ${nocar.length ? `<h4 class="ml-h">No carrinho <span>${nocar.length}</span></h4><ul class="ml-lista">${nocar.map(linha).join("")}</ul>` : ""}
      ${semPrecoNoCarrinho ? `<p class="ml-aviso">${semPrecoNoCarrinho} ${semPrecoNoCarrinho === 1 ? "item no carrinho está sem preço e não entra" : "itens no carrinho estão sem preço e não entram"} no total.</p>` : ""}
      <details class="ml-opc"><summary>Mais opções</summary>
        <label class="f">Quanto quero gastar (opcional)<input class="in money" id="mlLimite" inputmode="decimal" placeholder="Ex.: 300,00" value="${l.limite > 0 ? esc(l.limite.toLocaleString("pt-BR", { minimumFractionDigits: 2 })) : ""}"></label>
        <label class="check"><input type="checkbox" id="mlOutra" ${l.outraCat ? "checked" : ""}> Tem item de outra categoria (limpeza, higiene...)</label>
        ${outro ? "" : `<p class="hint">Para outra pessoa ver e marcar a lista junto com você dentro do app, use a <button class="link" type="button" id="mlCasal">Conta de casal</button>.</p>`}
        ${l.itens.length ? `<button class="btn" type="button" id="mlLimpa">${confirmaLimpar ? "Toque de novo para apagar tudo" : "Limpar a lista"}</button>` : ""}
      </details>
      <div class="ml-barra"><span><small>No carrinho</small><b>${brl(e.noCarrinho)}</b></span><button class="btn primary" type="button" id="mlOk"${e.noCarrinho > 0 ? "" : " disabled"}>Finalizar compra</button></div>
      <div class="actions"><button class="btn" type="button" id="mlManda"${falta.length ? "" : " disabled"}>Mandar a lista por mensagem</button><button class="btn" type="button" data-close>Fechar</button></div></div>`);
    raiz.scrollTop = rolou;
    const edita = (id, fn) => muda((m) => { const x = m.itens.find((z) => z.id === id); if (x) { fn(x); x.t = agora(); } });
    $("mlForm").addEventListener("submit", (ev) => {
      ev.preventDefault();
      const nome = $("mlNome").value.trim();
      if (!nome) { toast("Digite o nome do item, por exemplo arroz."); return $("mlNome").focus(); }
      if (listaDe().itens.length >= 300) return void toast("A lista chegou a 300 itens. Finalize ou limpe antes de adicionar mais.");
      if (itemNaLista(listaDe().itens, nome)) { toast(`${nome.slice(0, 40)} já está na lista.`); $("mlNome").select(); return; }
      muda((m) => { m.itens.push({ id: crypto.randomUUID(), nome: nome.slice(0, 40), qtd: 1, preco: 0, pego: false, t: agora() }); });
      desenha(); $("mlNome").focus();
    });
    $("dlgBody").querySelectorAll("[data-pega]").forEach((b) => (b.onclick = () => { edita(b.dataset.pega, (x) => { x.pego = !x.pego; }); vibra?.(); desenha(); }));
    $("dlgBody").querySelectorAll("[data-x]").forEach((b) => (b.onclick = () => { muda((m) => { m.itens = m.itens.filter((x) => x.id !== b.dataset.x); m.apagados = [...m.apagados, { id: b.dataset.x, t: agora() }]; }); desenha(); }));
    $("dlgBody").querySelectorAll("[data-menos]").forEach((b) => (b.onclick = () => { edita(b.dataset.menos, (x) => { x.qtd = Math.max(1, Math.round((Number(x.qtd) || 1) - 1)); }); desenha(); }));
    $("dlgBody").querySelectorAll("[data-mais]").forEach((b) => (b.onclick = () => { edita(b.dataset.mais, (x) => { x.qtd = Math.min(99, Math.round((Number(x.qtd) || 1) + 1)); }); desenha(); }));
    $("dlgBody").querySelectorAll("[data-preco]").forEach((i) => (i.onchange = () => { const v = avaliaConta(i.value) ?? parseMoney(i.value); edita(i.dataset.preco, (x) => { x.preco = v > 0 && v <= VALOR_MAX ? round2(v) : 0; }); tarde(desenha); }));
    $("dlgBody").querySelectorAll("[data-cat]").forEach((s) => {
      const item = () => listaDe().itens.find((z) => z.id === s.dataset.cat);
      const lembra = (cat) => { const k = chaveDoItem(item()?.nome); if (k && cat) { const m = { ...(S.prefs.catItens || {}) }; delete m[k]; m[k] = cat; for (const o of Object.keys(m).slice(0, Math.max(0, Object.keys(m).length - 300))) delete m[o]; S.prefs.catItens = m; } };
      ligaNovaCategoria(s, () => "Despesa", () => item()?.nome || "", (nome) => { lembra(nome); edita(s.dataset.cat, (x) => { x.cat = nome; }); tarde(desenha); });
      s.addEventListener("change", () => { lembra(s.value); edita(s.dataset.cat, (x) => { x.cat = s.value; }); tarde(desenha); });
    });
    // No celular: deslizar o item para a direita coloca no carrinho (ou tira de lá), igual a tocar na bolinha.
    if (!$("dlgBody").dataset.deslizaMl) {
      $("dlgBody").dataset.deslizaMl = "1";
      let li = null, x0 = 0, y0 = 0, dx = 0, trava = false;
      const corpo = $("dlgBody");
      corpo.addEventListener("touchstart", (e) => { li = e.touches.length === 1 && !e.target.closest("button, input, select, a") ? e.target.closest(".ml-item") : null; if (li) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = 0; trava = false; } }, { passive: true });
      corpo.addEventListener("touchmove", (e) => {
        if (!li) return; const mx = e.touches[0].clientX - x0, my = e.touches[0].clientY - y0;
        if (!trava) { if (Math.abs(my) > 12 && Math.abs(my) > Math.abs(mx)) { li = null; return; } if (mx > 12 && mx > Math.abs(my) * 1.5) trava = true; else return; }
        dx = Math.max(0, Math.min(120, mx)); li.style.transform = `translateX(${dx}px)`; if (e.cancelable) e.preventDefault();
      }, { passive: false });
      const solta = (fim) => { const el = li, d = dx; li = null; dx = 0; trava = false; if (!el) return; el.style.transform = ""; if (fim && d > 80) el.querySelector("[data-pega]")?.click(); };
      corpo.addEventListener("touchend", () => solta(true)); corpo.addEventListener("touchcancel", () => solta(false));
    }
    // Foto da etiqueta ou do cupom: o app lê o valor e põe no preço do item; a pessoa confere antes de seguir.
    $("dlgBody").querySelectorAll("[data-foto]").forEach((b) => (b.onclick = () => {
      const f = document.createElement("input"); f.type = "file"; f.accept = "image/*"; f.setAttribute("capture", "environment");
      f.onchange = async () => {
        const arq = f.files?.[0]; if (!arq) return;
        toastOuFlash("Lendo o preço da foto…");
        try {
          const { leitura } = await lerImagem(arq, () => {}, hoje()), v = Number(leitura?.valor) || 0;
          if (v > 0 && v <= VALOR_MAX) { edita(b.dataset.foto, (x) => { x.preco = round2(v); }); toastOuFlash(`Li ${brl(v)}. Confira o preço e ajuste se precisar.`); }
          else toastOuFlash("Não consegui ler o valor nessa foto. Digite o preço ou tente de perto, com boa luz.");
        } catch { toastOuFlash("Não consegui ler a foto agora. Digite o preço."); }
        tarde(desenha);
      };
      f.click();
    }));
    $("mlLimite").addEventListener("change", () => { const v = parseMoney($("mlLimite").value); muda((m) => { m.limite = v > 0 && v <= VALOR_MAX ? round2(v) : 0; m.tl = agora(); }); tarde(desenha); });
    if ($("mlRepete")) $("mlRepete").onclick = () => {
      const novos = itensParaRepetir(S.prefs.ultimaCompraMercado, listaDe().itens), cabem = Math.max(0, 300 - listaDe().itens.length);
      muda((m) => { novos.slice(0, cabem).forEach((x) => m.itens.push({ id: crypto.randomUUID(), nome: String(x.nome).slice(0, 40), qtd: Number(x.qtd) > 0 ? Number(x.qtd) : 1, preco: 0, pego: false, t: agora() })); });
      toast(`${Math.min(novos.length, cabem)} ${novos.length === 1 ? "item voltou" : "itens voltaram"} para a lista. Tire o que não precisa.`); desenha();
    };
    $("mlOutra").onchange = () => { muda((m) => { m.outraCat = $("mlOutra").checked; }); tarde(desenha); };
    if ($("mlCasal")) $("mlCasal").onclick = () => abrirCasal();
    if ($("mlLimpa")) $("mlLimpa").onclick = () => {
      if (!confirmaLimpar) { confirmaLimpar = true; desenha(); $("dlgBody").querySelector(".ml-opc").open = true; return void setTimeout(() => { if (confirmaLimpar) { confirmaLimpar = false; if ($("mlRoot")) desenha(); } }, 4000); }
      confirmaLimpar = false; const t = agora(); muda((m) => { m.apagados = [...m.apagados, ...m.itens.map((x) => ({ id: x.id, t }))]; m.itens = []; }); desenha();
    };
    if ($("mlManda")) $("mlManda").onclick = async () => {
      const texto = textoDaLista(listaDe().itens);
      try { if (navigator.share) await navigator.share({ text: texto }); else { await navigator.clipboard.writeText(texto); toast("Lista copiada. Cole no WhatsApp ou onde preferir."); } } catch { /* a pessoa desistiu */ }
    };
    $("mlOk").onclick = () => {
      const lista = listaDe(), pr = S.prefs.precosMercado || {}, compra = compraDoCarrinho(lista.itens, pr, padrao), tk0 = ticketMedioMercado(S.data.lancamentos, hoje(), padrao);
      if (!(compra.total > 0)) return void toast("Marque no carrinho ao menos um item com preço.");
      const partes = lista.outraCat ? compra.partes : [[padrao, compra.total]], umaSo = partes.length === 1, pegos = lista.itens.filter((x) => x.pego);
      S.listaFinalizando = { total: compra.total, media: tk0.media, ids: pegos.map((x) => x.id), precos: Object.fromEntries(pegos.filter((x) => precoDoItem(x, pr).valor > 0).map((x) => [chaveDoItem(x.nome), precoDoItem(x, pr).valor]).filter(([k]) => k)) };
      clearInterval(timer); $("dlg").close(); S.tipo = "Despesa"; renderForm();
      $("fValor").value = compra.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 }); $("fDesc").value = "Compra no mercado"; $("fCat").value = umaSo ? partes[0][0] : padrao; S.catManual = true; $("fData").value = hoje();
      S.divisaoPronta = umaSo ? null : partes; renderForm(); mostraEfeito();
      setTimeout(() => { if (noCelular()) abrirLancar(); else $("fValor").scrollIntoView({ block: "center" });
        const f = $("flash"); f.style.color = "var(--good)";
        f.textContent = umaSo ? `${brl(compra.total)} no formulário. Escolha a forma de pagamento e toque em Lançar.` : `${brl(compra.total)} no formulário. Escolha a forma de pagamento e toque em "Dividir em categorias" para separar como você marcou.`; }, 200);
    };
  };
  desenha(); setTimeout(() => $("mlNome")?.focus(), 50);
  // Na conta de casal, a lista da outra pessoa chega sozinha enquanto esta tela está aberta.
  const puxa = async () => {
    if (!$("dlg").open || !$("mlRoot")) return clearInterval(timer);
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "")) return;
    if (await sincronizaLista() && $("mlRoot") && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "")) desenha();
  };
  if (casalAtivo()) { puxa(); timer = setInterval(puxa, 12000); $("dlg").addEventListener("close", () => clearInterval(timer), { once: true }); }
}

/* ---------- Meu carro ou moto ---------- */
/** Tela de conta com o resultado fixo no topo (some o medo de "onde fica o total?") e os campos em duas colunas. */
function ferramentaDeConta({ titulo, intro, grupos, chave, semDinheiro = [], calcula }) {
  const salvo = S.prefs[chave] || {};
  const campo = ([k, rot, ex]) => `<label class="f">${rot}<input class="in${semDinheiro.includes(k) ? "" : " money"}" data-k="${k}" inputmode="decimal" placeholder="ex.: ${ex}" value="${salvo[k] ? esc(String(salvo[k]).replace(".", ",")) : ""}"></label>`;
  openDlg(`<h3>${titulo}</h3>
    <p class="hint" style="margin:0 0 12px">${intro}</p>
    <div class="rc-card" id="rcTopo" aria-live="polite" aria-atomic="true"></div>
    ${grupos.map(([t, l]) => `<section class="rc-grupo"><h4>${t}</h4><div class="rc-campos">${l.map(campo).join("")}</div></section>`).join("")}
    <div class="rc-fim" id="rcFim"></div>
    <div class="actions"><button class="btn primary" type="button" data-close>Fechar</button></div>`);
  const le = () => Object.fromEntries([...document.querySelectorAll("#dlgBody [data-k]")].map((i) => [i.dataset.k, nm(i.value)]));
  const conta = () => {
    const r = calcula(le());
    if (!r) { $("rcTopo").innerHTML = `<p class="rc-vazio">Preencha ao menos um gasto e o resultado aparece aqui.</p>`; $("rcFim").innerHTML = ""; return; }
    $("rcTopo").innerHTML = `<div class="rc-topo"><small>${r.rotulo}</small><b>${r.valor}</b></div><div class="rc-mini">${r.mini.map(([rot, v]) => `<div><small>${rot}</small><b>${v}</b></div>`).join("")}</div>`;
    $("rcFim").innerHTML = r.fim;
  };
  document.querySelectorAll("#dlgBody [data-k]").forEach((i) => { i.addEventListener("input", conta); i.addEventListener("change", () => { S.prefs[chave] = le(); salvaPrefs(); }); });
  conta();
}
const barrasDe = (partes) => `<h4 class="sub-h">Para onde vai o dinheiro</h4><div class="ve-partes">${partes.map((p) => `<div class="ve-p"><span>${esc(p.nome)}</span><b>${brl(p.valor)}</b><i style="width:${Math.max(3, p.pct)}%"></i></div>`).join("")}</div>`;
/** Ganho contra gasto do mês: o que entrou, o que saiu, as horas de trabalho e quanto sobrou. Só lê, não grava. */
function ganhoGastoTela(mes) {
  if (!S.loaded) return;
  const hj = hoje(), c = calcMes(S.data, mes, hj), m = motDados();
  const entradas = [...c.fr.map((f) => ({ data: f.data, valor: f.valor })), ...c.it.filter((x) => x.tipo === "Receita").map((x) => ({ data: x.data, valor: x.valor }))];
  const custos = itensDoCusto(c).map((i) => ({ data: i.data, valor: i.valor }));
  const horasTurnos = m.turnos.filter((t) => t.fim && mKey(isoLocal(t.ini)) === mes).reduce((s, t) => s + duracaoMs(t), 0) / 36e5;
  const r = ganhoContraGasto({ entradas, custos, horasTurnos, horasSemana: Number(S.prefs.hora?.horasSemana) || 0, mes, hojeISO: hj });
  const nome = nomeMes(mes);
  if (!r) return openDlg(`<h3>Ganho contra gasto</h3><p class="hint">Em ${nome} ainda não há entradas nem gastos. Quando houver, o app mostra aqui quanto você ganhou, quanto gastou e quanto sobrou.</p><div class="actions"><button class="btn primary" type="button" data-close>Fechar</button></div>`);
  const frase = `Em ${nome} ${r.horas ? `você trabalhou <b>${horasCurtas(r.horas * 36e5)}</b>, ` : ""}ganhou <b>${brl(r.ganho)}</b> e gastou <b>${brl(r.gasto)}</b>. ${r.sobra >= 0 ? `Sobraram <b>${brl(r.sobra)}</b>.` : `Faltaram <b>${brl(-r.sobra)}</b>.`}`;
  const quitado = r.diaQuitado ? `Dia ${Number(r.diaQuitado.slice(8, 10))}${r.previsto ? " (previsto)" : ""}: a partir daí, o que entrou já cobria todo o gasto do mês.` : (r.gasto > 0 && r.ganho > 0 ? "O que entrou ainda não cobriu todo o gasto do mês." : "");
  const li = (t, v) => `<li><span></span><span>${t}</span><b>${v}</b></li>`;
  openDlg(`<h3>Ganho contra gasto</h3><p class="rc-vazio" style="margin:0 0 12px">${frase}</p>
    <ul class="itens">${r.horas ? li(r.origemHoras === "turnos" ? "Horas trabalhadas (turnos)" : "Horas trabalhadas (estimadas)", horasCurtas(r.horas * 36e5)) : ""}${li("Ganho", "+ " + brl(r.ganho))}${li("Gasto", "− " + brl(r.gasto))}${li(r.sobra >= 0 ? "Sobra" : "Falta", sgn(r.sobra))}</ul>
    ${r.horasDoGasto != null ? `<p class="hint">O gasto do mês custou ${horasCurtas(r.horasDoGasto * 36e5)} de trabalho${r.horasDaSobra != null ? `; a sobra equivale a ${horasCurtas(r.horasDaSobra * 36e5)}` : ""}. Sua hora rendeu ${brl(r.valorHora)} em ${nome}.</p>` : `<p class="hint">Para ver tudo em horas de trabalho, use o Modo motorista ou informe as horas por semana em "Quanto vale minha hora".</p>`}
    ${quitado ? `<p class="hint">${quitado}</p>` : ""}
    <p class="hint">São só contas com o que você já lançou. Não é promessa de renda.</p>
    <div class="actions"><button class="btn primary" type="button" data-close>Fechar</button></div>`);
}
function minhaHoraTela() {
  const r30 = () => { const m = motDados(); return m.turnos.length ? resumoTurnos(m.turnos, toISO(new Date(Date.now() - 30 * 864e5)), hoje(), S.prefs.veiculo || {}) : null; };
  ferramentaDeConta({ titulo: "Quanto vale minha hora", chave: "hora", semDinheiro: ["horasSemana"],
    intro: "Veja quanto custa cada compra em horas do seu trabalho. Informe o que você recebe por mês, já líquido, e quantas horas trabalha por semana. Quem dirige por aplicativo pode deixar em branco: o app usa o lucro por hora dos turnos.",
    grupos: [["Seu trabalho", [["renda", "Quanto você recebe por mês (R$)", "3.000"], ["horasSemana", "Horas trabalhadas por semana", "44"]]]],
    calcula: (v) => {
      const r = valorDaHora(v, r30()); if (!r) return null;
      const ex = [50, 500, 3920].map((x) => [brl(x), horasDeTrabalho(x, r.valor)]);
      return { rotulo: "Sua hora vale", valor: brl(r.valor), mini: ex,
        fim: `<p class="hint" style="margin:10px 0 0">${r.origem === "turnos" ? "Calculado pelo lucro por hora dos seus turnos nos últimos 30 dias." : "Calculado com a renda e as horas por semana que você informou."} Ao lançar um gasto, o app mostra quanto tempo de trabalho ele custou.</p>` };
    } });
}
function meuVeiculo() {
  const c = calcMes(S.data, mKey(hoje()), hoje());
  ferramentaDeConta({ titulo: "Meu carro ou moto", chave: "veiculo", semDinheiro: ["desvalPct", "restantes"],
    intro: "Descubra quanto o seu veículo custa de verdade. Preencha o que souber: o que ficar em branco não entra na conta, e o que você digitar fica salvo.",
    grupos: [
      ["Combustível", [["kmMes", "Km rodados por mês", "1000"], ["consumo", "Km por litro", "10"], ["precoLitro", "Preço do litro (R$)", "6,00"]]],
      ["Gastos do ano (R$)", [["ipvaAno", "IPVA", "1.200"], ["seguroAno", "Seguro", "2.400"], ["licAno", "Licenciamento", "180"], ["manutAno", "Manutenção e pneus", "2.000"]]],
      ["Gastos do mês (R$)", [["outrosMes", "Estacionamento, pedágio e lavagem", "150"]]],
      ["Financiamento (em branco se já quitou)", [["parcela", "Parcela por mês (R$)", "900"], ["restantes", "Parcelas que faltam", "24"]]],
      ["Valor do veículo", [["valor", "Quanto vale hoje (R$)", "50.000"], ["desvalPct", "Perde por ano (%)", "10"]]],
    ],
    calcula: (v) => {
      const r = custoDoVeiculo(v); if (!r) return null;
      const transp = new Map(catMap(c)).get("Transporte") || 0, pctRenda = c.rec > 0 ? Math.round((r.bolso / c.rec) * 100) : null;
      const real = kmRealPorMes(motDados().turnos, hoje()), usado = Number(v.kmMes) || 0;
      const aviso = real && Math.abs(real - usado) / Math.max(usado, 1) >= 0.1 ? `<p class="hint" style="margin:10px 0 0">Pelos seus turnos, você roda cerca de <b>${real.toLocaleString("pt-BR")} km por mês</b>${usado ? ` (aqui está ${usado.toLocaleString("pt-BR")})` : ""}. <button class="link" type="button" data-usa-km="${real}">Usar ${real.toLocaleString("pt-BR")} km</button></p>` : "";
      return { rotulo: "Custa por mês", valor: brl(r.total), mini: [["Por dia", brl(r.porDia)], [r.porKm ? "Por km" : "Por ano", r.porKm ? brl(r.porKm) : brl(r.porAno)], ["Do seu bolso", brl(r.bolso)]],
        fim: aviso + barrasDe(r.partes) + `<p class="hint" style="margin:10px 0 0">${r.desval > 0 ? `Dos ${brl(r.total)}, ${brl(r.desval)} é o valor que o veículo perde (não sai do bolso). ` : ""}${r.faltaFinanciamento > 0 ? `Ainda falta pagar ${brl(r.faltaFinanciamento)} do financiamento. ` : ""}${pctRenda !== null ? `O que sai do bolso equivale a <b>${pctRenda}%</b> do que entrou neste mês. ` : ""}${transp > 0 ? `No app, você lançou ${brl(transp)} em Transporte neste mês.` : ""}</p>` };
    } });
  // "Usar N km": atualiza o campo e a conta na hora, e guarda.
  $("rcFim").addEventListener("click", (e) => {
    const b = e.target.closest("[data-usa-km]"); if (!b) return;
    const campo = document.querySelector('#dlgBody [data-k="kmMes"]'); if (!campo) return;
    campo.value = b.dataset.usaKm; campo.dispatchEvent(new Event("input", { bubbles: true })); campo.dispatchEvent(new Event("change", { bubbles: true }));
    toast("Km por mês atualizado. O custo do carro foi recalculado.");
  });
}

/* ---------- Modo motorista de aplicativo ---------- */
/* Fica à parte do resto do app: só aparece em Mais (e no início, depois do primeiro uso). Os ganhos viram entradas e os
   gastos do turno (combustível, pedágio...) viram gastos no extrato, então o saldo do mês já conta tudo. Os turnos ficam nas preferências da conta. */
const motDados = () => {
  const m = S.prefs.motorista || {}, a = m.ativo;
  return { ativo: a?.ini ? { ini: Number(a.ini), parcial: Math.max(0, Number(a.parcial) || 0), antes: Array.isArray(a.antes) ? a.antes : [], pausado: Math.max(0, Number(a.pausado) || 0), pausaIni: Number(a.pausaIni) > 0 ? Number(a.pausaIni) : null } : null,
    turnos: Array.isArray(m.turnos) ? m.turnos : [], diasSemana: Math.min(7, Math.max(1, Math.round(Number(m.diasSemana)) || 6)),
    horasDia: Math.min(16, Math.max(1, Math.round(Number(m.horasDia)) || 8)), extra: Math.max(0, Number(m.extra) || 0) };
};
const gravaMot = (m) => { S.prefs.motorista = { usa: true, ativo: m.ativo || null, turnos: m.turnos.slice(-MAX_TURNOS), diasSemana: m.diasSemana, horasDia: m.horasDia, extra: m.extra }; salvaPrefs(); };
/** O que foi gasto durante a jornada: as despesas lançadas no app (Lançar, escanear nota ou QR) depois que ela começou. Nada é digitado duas vezes. */
const gastosDaJornada = (a) => round2(S.data.lancamentos.filter((x) => x.tipo === "Despesa" && x.data >= isoLocal(a.ini) && x.data <= hoje() && !a.antes.includes(x.id)).reduce((t, x) => t + Number(x.valor), 0));
const hhmm = (ms) => new Date(ms).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const virg = (n) => String(n).replace(".", ",");
/** Soma por chave do que foi lançado durante o turno: { uber: 120, ... } ou { comb: 60, ... }. */
const somaPor = (lista, chave) => lista.reduce((o, x) => { o[x[chave]] = round2((o[x[chave]] || 0) + Number(x.valor)); return o; }, {});
let motPer = "dia", motRelogio = 0, motFechando = false, motSub = null;   // motSub: a subtela aberta ("ganho", "gasto" ou "ajustes")
/** A tela do Modo motorista (uma aba de Extrato/Planejar, no mesmo jeito): abre pelo Mais, pelo Início ou pela busca. */
function motoristaTela() { motSub = null; abrirSub("mot"); if (!noCelular()) $("listas").scrollIntoView({ block: "start" }); }
/** Imagem do resultado do motorista (1080 × 1350), feita no aparelho. Com "esconder valores" mostra só horas, km, viagens e a parte do faturamento que vira lucro. */
function desenhaResultadoMot(titulo, r, semValores) {
  const W = 1080, H = 1350, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const g = cv.getContext("2d"), fonte = (peso, tam) => `${peso} ${tam}px "Bricolage Grotesque","IBM Plex Sans",system-ui,sans-serif`;
  const fundo = g.createLinearGradient(0, 0, W, H); fundo.addColorStop(0, "#12161c"); fundo.addColorStop(1, "#1f2a3a");
  g.fillStyle = fundo; g.fillRect(0, 0, W, H);
  g.fillStyle = "rgba(255,200,40,.10)"; g.beginPath(); g.arc(W - 100, 150, 330, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#fff"; g.textBaseline = "alphabetic";
  g.font = fonte(600, 40); g.globalAlpha = 0.9; g.fillText("Meus Gastos · Modo motorista", 90, 130); g.globalAlpha = 1;
  g.font = fonte(700, 66); g.fillText(titulo, 90, 240);
  const pct = r.ganho > 0 ? Math.round((r.lucro / r.ganho) * 100) : 0;
  g.font = fonte(600, 50); g.globalAlpha = 0.9; g.fillText(semValores ? "Do que entrou, sobrou" : "Lucro", 90, 370); g.globalAlpha = 1;
  g.fillStyle = "#ffc828"; g.font = fonte(800, 170); g.fillText(semValores ? `${pct}%` : brl0(r.lucro), 84, 530); g.fillStyle = "#fff";
  const linhas = semValores
    ? [["Horas rodadas", horasCurtas(r.ms)], ["Km rodados", `${virg(r.km)} km`], ["Viagens", String(r.viagens)]]
    : [["Ganho", brl0(r.ganho)], ["Horas rodadas", horasCurtas(r.ms)], ["Lucro por hora", r.lucroPorHora !== null ? brl(r.lucroPorHora) : "—"], ["Km rodados", `${virg(r.km)} km`], ["Viagens", String(r.viagens)]];
  let y = 680;
  linhas.forEach(([rot, v]) => { g.font = fonte(500, 44); g.globalAlpha = 0.85; g.fillText(rot, 90, y); g.globalAlpha = 1; g.textAlign = "right"; g.font = fonte(700, 46); g.fillText(v, W - 90, y); g.textAlign = "left"; y += 78; g.fillStyle = "rgba(255,255,255,.12)"; g.fillRect(90, y - 52, W - 180, 2); g.fillStyle = "#fff"; });
  g.font = fonte(500, 34); g.globalAlpha = 0.85; g.fillText("meugastos.com.br/#motorista", 90, H - 70); g.globalAlpha = 1;
  return cv;
}
function compartilharResultadoMot(titulo, r) {
  let semValores = false;
  const pinta = () => { const cv = desenhaResultadoMot(titulo, r, semValores); $("motImg").src = cv.toDataURL("image/png"); return cv; };
  openDlg(`<h3>Meu resultado</h3><p class="hint" style="margin:0 0 10px">Uma imagem para mandar no grupo de motoristas ou guardar. Ela é feita aqui no aparelho.</p>
    <img id="motImg" class="fech-img" alt="Resultado do motorista: ${esc(titulo)}">
    <label class="check" style="margin:10px 0 0"><input type="checkbox" id="motSem"> Esconder os valores (mostrar só horas, km e porcentagem)</label>
    <div class="actions"><button class="btn" type="button" id="motBaixar">Baixar imagem</button><button class="btn primary" type="button" id="motShare">Compartilhar</button></div>`);
  pinta();
  $("motSem").onchange = () => { semValores = $("motSem").checked; pinta(); };
  const arquivo = () => new Promise((ok) => pinta().toBlob((b) => ok(new File([b], "meu-resultado-motorista.png", { type: "image/png" })), "image/png"));
  const baixa = async () => { const f = await arquivo(), a = document.createElement("a"); a.href = URL.createObjectURL(f); a.download = f.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
  $("motBaixar").onclick = baixa;
  $("motShare").onclick = async () => {
    const f = await arquivo();
    if (navigator.canShare?.({ files: [f] })) { try { await navigator.share({ files: [f], text: "Meu resultado rodando de aplicativo, no Meus Gastos" }); } catch { /* a pessoa desistiu */ } }
    else { await baixa(); toast("Este aparelho não compartilha imagens direto daqui. A imagem foi baixada: é só enviar pelo app que quiser."); }
  };
}
/** A meta cabe no ritmo real da pessoa? Diz a verdade, mesmo quando a conta do mês não fecha só rodando. */
function blocoRealidade(alc, hist, meta) {
  if (alc.nivel === "sem-historico") return `<p class="mot-real">Ainda não dá para saber se essa meta é possível: depois de 2 dias rodados, o app compara com o seu ritmo real.</p>`;
  if (alc.nivel === "ok") return `<p class="mot-real ok"><b>Cabe no seu ritmo:</b> você faz em média ${brl(hist.ganhoMedioDia)} por dia.</p>`;
  if (alc.nivel === "puxado") return `<p class="mot-real"><b>É puxada:</b> fica acima da sua média (${brl(hist.ganhoMedioDia)} por dia), mas dentro do seu melhor dia (${brl(hist.melhorDia)}). Pede dias fortes.</p>`;
  if (alc.nivel === "fora") return `<p class="mot-real longe"><b>Maior que o seu melhor dia (${brl(hist.melhorDia)}).</b> No seu ritmo normal, de ${brl(hist.ganhoMedioDia)} por dia, rodando esses ${meta.dias} dias sobrariam cerca de ${brl(alc.projeta)} e ainda faltariam ${brl(alc.faltaAinda)}. Só rodar não fecha o mês: vale rever os gastos ou as entradas.</p>`;
  return "";
}
/** Quanto cada aplicativo rendeu e qual dia da semana rende mais por hora (só aparece com dados suficientes). */
function blocoPorApp(turnos, de, ate) {
  const apps = ganhoPorApp(turnos, de, ate), nomeApp = Object.fromEntries(APPS), melhor = melhorDiaDaSemana(turnos, "0000-01-01", ate);
  const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  if (!apps.length && !melhor) return "";
  return `<h4 class="mot-h">Por aplicativo</h4>${apps.length ? `<ul class="mot-apps">${apps.map((a) => `<li><span>${esc(nomeApp[a.app] || a.app)}</span><b>${brl(a.ganho)}</b><small>${a.pct}%</small><i style="width:${Math.max(3, a.pct)}%"></i></li>`).join("")}</ul>` : ""}
    ${melhor ? `<p class="hint">Nos seus turnos, ${DIAS[melhor.dia] === "sábado" || DIAS[melhor.dia] === "domingo" ? "o" : "a"} <b>${DIAS[melhor.dia]}</b> rende mais por hora: ${brl(melhor.ganhoPorHora)} de faturamento.</p>` : ""}`;
}
function paneMot() {
  clearInterval(motRelogio); const host = $("pane-mot");
  if (motFechando && motDados().ativo) return paneFechar(host);
  motFechando = false;
  if (motSub) return paneMotSub(host);
  const m = motDados(), hj = hoje(), agora = Date.now(), mes = mKey(hj);
  const veicD = S.prefs.veiculo || {}, cvk = custoVariavelPorKm(veicD) || 0, c = calcMes(S.data, mes, hj);
  const doDia = resumoTurnos(m.turnos, hj, hj, veicD);
  const caixaHoje = round2(m.turnos.filter((t) => t.fim && isoLocal(t.ini) === hj).reduce((s, t) => s + ganhoDoTurno(t) - (Number(t.comb) || 0), 0));
  const meta = metaDoDia({ saldoSemHoje: round2(c.saldo - caixaHoje), extra: m.extra, restam: c.n - c.dias + 1, diasSemana: m.diasSemana, kmDia: kmPorDia(m.turnos, veicD, m.diasSemana), custoKm: cvk });
  const ritmo = ritmoHistorico(m.turnos, hj), alc = alcanceDaMeta({ meta, hist: ritmo, custoDia: meta.custoDia });
  // Se a meta está acima do melhor dia da pessoa, o "está valendo a pena?" compara com o ritmo normal dela: cobrar um número que ela não alcança só desanima.
  const liqRef = alc.nivel === "fora" && alc.liquidoMedioDia > 0 ? alc.liquidoMedioDia : meta.liquidoDia, refNormal = alc.nivel === "fora" && alc.liquidoMedioDia > 0;
  // Regra para decorar: com o outro app na tela não dá para abrir este e calcular no tempo da corrida.
  const r30 = resumoTurnos(m.turnos, toISO(new Date(Date.now() - 30 * 864e5)), hj, veicD), kmh = r30.ms >= 3600000 && r30.km > 0 ? r30.km / (r30.ms / 3600000) : 0;
  const regra = regraDeAceite({ custoKm: cvk, minimoHora: liqRef > 0 && m.horasDia > 0 ? round2(liqRef / m.horasDia) : 0, kmPorHora: kmh });
  const htmlRegraDeAceite = regra ? `<div class="mot-regra" role="note"><small>Regra para decorar</small><p>Aceite se pagar <b>${brl(regra.aceita)} por km</b> ou mais. Abaixo de <b>${brl(regra.recusa)} por km</b>, recuse.</p><span>${regra.base === "meta" ? `Feita com a sua meta do dia e a sua média de ${virg(Math.round(kmh))} km por hora.` : regra.base === "minimo" ? "Feita só com o mínimo de R$ 1,00 por km. Preencha o Meu carro ou moto e rode alguns dias para ela ficar mais certa." : "Feita só com o custo do seu carro por km. Com a meta e uns dias rodados, ela fica mais certa."} Conte o caminho até o passageiro nos km.</span></div>` : "";
  const ganhoHoje = round2(doDia.ganho + (m.ativo ? m.ativo.parcial : 0));   // inclui o turno que ainda está rolando
  const pctHoje = meta.brutoDia > 0 ? Math.min(100, Math.round((ganhoHoje / meta.brutoDia) * 100)) : 100;
  const de = motPer === "dia" ? hj : motPer === "semana" ? toISO(new Date(agora - 6 * 864e5)) : `${mes}-01`;
  const temCarro = custoTotalPorKm(veicD) !== null, r = resumoTurnos(m.turnos, de, hj, veicD), tracos = (v, f) => (v === null ? "—" : f(v));
  // O quadro do turno em andamento: refeito a cada segundo, sem mexer nos campos de digitar.
  const vivo = () => {
    const ganho = m.ativo.parcial, gastos = gastosDaJornada(m.ativo), ms = msAndamento(m.ativo);
    const v = ritmoAoVivo({ ganho, gastos, ms, liquidoDia: liqRef, horasDia: m.horasDia });
    const alvo = refNormal ? "o seu ritmo normal" : "o que você precisa";
    const frase = v.veredito === "bom" ? `Está valendo a pena: ${brl(v.liquidoPorHora)} por hora, acima de ${alvo} (${brl(v.minimo)}).`
      : v.veredito === "abaixo" ? `Abaixo de ${alvo}: ${brl(v.liquidoPorHora)} por hora, contra ${brl(v.minimo)}. Vale olhar horário e região.`
      : v.minimo > 0 ? `${refNormal ? "Seu ritmo normal" : "Meta do dia"}: ${brl(v.minimo)} líquidos por hora, rodando ${m.horasDia}h. Depois de 15 minutos o app diz se está valendo a pena.` : "Suas contas do mês estão cobertas: o que entrar agora é sobra.";
    const totalHoje = round2(doDia.ganho + ganho), bateu = meta.brutoDia > 0 && totalHoje >= meta.brutoDia, cobriu = ganho > 0 && ganho >= gastos && gastos > 0;
    const aviso = bateu ? `<p class="mot-ver bom"><b>Meta do dia batida:</b> você fez ${brl(totalHoje)} e a meta era ${brl(meta.brutoDia)}. O que entrar agora é sobra.</p>`
      : cobriu ? `<p class="mot-ver bom"><b>Os gastos de hoje já estão pagos.</b> Daqui para a frente é lucro.${meta.brutoDia > 0 ? ` Faltam ${brl(round2(meta.brutoDia - totalHoje))} para a meta do dia.` : ""}</p>` : "";
    return `<div class="mot-vivo"><div><small>Ganho</small><b>${brl(ganho)}</b></div><div><small>Gastos</small><b>${brl(gastos)}</b></div><div class="forte"><small>Líquido por hora</small><b>${tracos(v.liquidoPorHora, brl)}</b></div></div>
      ${aviso}<p class="mot-ver ${v.veredito || ""}">${frase}</p>`;
  };
  if (m.ativo) {   // jornada em andamento: uma tela só com o cronômetro, no estilo "dirigindo"
    const a = m.ativo, pausada = Boolean(a.pausaIni), gastosTot = gastosDaJornada(a);
    host.innerHTML = `<div id="motRoot" class="mot-jornada${pausada ? " em-pausa" : ""}">
      <h3 class="mot-estado">${pausada ? "Jornada pausada" : "Em jornada"}</h3>
      <b class="mot-cron" id="motCron">${relogio(msAndamento(a))}</b><span class="mot-cron-leg">Tempo decorrido de trabalho · começou às ${hhmm(a.ini)}</span>
      <div id="motVivo" class="mot-vivo-box">${vivo()}</div>
      <div class="mot-rapidos">
        <button class="mot-rap" type="button" data-mot-sub="ganho"><small>Ganho do dia</small><b>${a.parcial ? brl(a.parcial) : "Informar"}</b></button>
        <button class="mot-rap" type="button" data-mot-acao="lancar"><small>Gastos da jornada · lançar</small><b>${gastosTot ? brl(gastosTot) : "Lançar gasto"}</b></button>
        <button class="mot-rap larga" type="button" data-mot-acao="ler"><b>Escanear nota ou QR code</b></button>
      </div>
      <div class="mot-fim"><button class="link" type="button" id="motDescartar">Descartar esta jornada</button></div>
      <div class="mot-barra-fixa" role="group" aria-label="Controle da jornada">
        <button class="btn mot-pausa" type="button" id="motPausa" aria-label="${pausada ? "Continuar a jornada" : "Pausar a jornada"}">${pausada ? "Continuar" : "Pausar"}</button>
        <button class="btn mot-grande parar" type="button" id="motParar">Encerrar jornada</button></div></div>`;
    host.querySelectorAll("[data-mot-acao]").forEach((b) => (b.onclick = () => acaoRapida(b.dataset.motAcao)));
    host.querySelectorAll("[data-mot-sub]").forEach((b) => (b.onclick = () => motEntra(b.dataset.motSub)));
    $("motPausa").onclick = () => {
      const mm = motDados(), t = Date.now();
      if (mm.ativo.pausaIni) { mm.ativo.pausado += t - mm.ativo.pausaIni; mm.ativo.pausaIni = null; } else mm.ativo.pausaIni = t;
      gravaMot(mm); vibra(30); render();
    };
    $("motParar").onclick = () => fecharTurno();
    armDelete($("motDescartar"), () => { gravaMot({ ...motDados(), ativo: null }); render(); }, "Toque de novo para descartar");
    motRelogio = setInterval(() => { const el = $("motCron"); if (!el || S.view !== "listas" || S.tab !== "mot") return clearInterval(motRelogio); const ag = motDados().ativo; if (!ag) return clearInterval(motRelogio); el.textContent = relogio(msAndamento(ag)); $("motVivo").innerHTML = vivo(); }, 1000);
    return;
  }
  const turno = `<div class="mot-turno"><small>${doDia.n ? `Hoje: ${brl(doDia.ganho)} em ${horasCurtas(doDia.ms)}` : "Pronto para rodar?"}</small>
      <button class="mot-bola inicio" type="button" id="motIniciar" aria-label="Iniciar a jornada">Iniciar</button>
      <div class="mot-atalhos"><button class="btn sm" type="button" data-mot-acao="ler">Escanear nota ou QR</button><button class="btn sm" type="button" data-mot-acao="lancar">Lançar um gasto</button></div></div>`;
  const metaHtml = meta.coberto
    ? `<section class="mot-meta ok"><small>Meta do mês</small><b>Contas do mês cobertas</b><p>Com o que já entrou, dá para pagar tudo o que vence até o fim de ${nomeMes(mes)}. O que você rodar agora é sobra.</p></section>`
    : `<section class="mot-meta"><small>Para fechar ${nomeMes(mes)} sem ficar no vermelho</small><b>${brl(meta.brutoDia)} <span>por dia rodado</span></b>
        <p>Faltam <b>${brl(meta.falta)}</b> para cobrir as contas em aberto. Rodando ${meta.dias} ${meta.dias === 1 ? "dia" : "dias"} (${m.diasSemana} por semana), são ${brl(meta.liquidoDia)} livres por dia${meta.custoDia > 0 ? `, mais ${brl(meta.custoDia)} que o carro gasta` : ""}. É uma estimativa.</p>
        ${blocoRealidade(alc, ritmo, meta)}
        <div class="tbar"><i style="width:${pctHoje}%"></i></div><small>Hoje: ${brl(ganhoHoje)} de ${brl(meta.brutoDia)} (${pctHoje}%)</small></section>`;
  const tile = (rot, v, cls = "") => `<div class="mot-t ${cls}"><small>${rot}</small><b>${v}</b></div>`;
  // Ganho dos últimos 7 dias em barras: a parte cheia é o lucro, para ver de relance os dias que valeram a pena.
  const dias7 = ganhosPorDia(m.turnos, hj, veicD), max7 = Math.max(1, ...dias7.map((x) => x.ganho)), pct = (v) => Math.max(0, Math.round((v / max7) * 100));
  const grafico7 = dias7.some((x) => x.n) ? `<section class="mot-graf"><h4 class="mot-h">Ganho dos últimos 7 dias</h4>
    <ol class="mg-barras">${dias7.map((x) => `<li aria-label="${DIAS3[diaDaSemana(x.iso)]}, ${ddmm(x.iso)}: ${x.n ? `ganho ${brl(x.ganho)}, lucro ${brl(x.lucro)}` : "sem turno"}">
      <span class="mg-v" aria-hidden="true">${x.n ? brl0(x.ganho).replace("R$ ", "") : ""}</span>
      <span class="mg-col" aria-hidden="true"><i class="g" style="height:${pct(x.ganho)}%"></i><i class="l" style="height:${pct(Math.max(0, x.lucro))}%"></i></span>
      <span class="mg-d${x.iso === hj ? " hoje" : ""}" aria-hidden="true">${x.iso === hj ? "hoje" : DIAS3[diaDaSemana(x.iso)]}</span></li>`).join("")}</ol>
    <p class="hint mg-leg"><i class="g"></i>ganho <i class="l"></i>lucro</p></section>` : "";
  const hist = m.turnos.filter((t) => t.fim).slice(-8).reverse().map((t) => { const rr = resumoTurnos([t], isoLocal(t.ini), isoLocal(t.ini), veicD);
    return `<li><span class="d">${ddmm(isoLocal(t.ini))}</span><button type="button" class="hist-abrir" data-medit="${esc(t.id)}" aria-label="Editar o turno de ${ddmm(isoLocal(t.ini))}"><span>${horasCurtas(duracaoMs(t))}${Number(t.km) > 0 ? ` · ${virg(t.km)} km` : ""}<small>lucro ${brl(rr.lucro)}${rr.lucroPorHora !== null ? ` · ${brl(rr.lucroPorHora)} por hora` : ""}</small></span></button><b>${brl(ganhoDoTurno(t))}</b>
      <button class="del x" type="button" data-mdel="${esc(t.id)}" aria-label="Apagar o turno de ${ddmm(isoLocal(t.ini))}" title="Apaga o turno e os lançamentos que ele criou">×</button></li>`; }).join("");
  host.innerHTML = `<div id="motRoot"><p class="mot-sub">Seu painel de corrida: horas, ganho e quanto sobra de verdade.</p>
    ${turno}${metaHtml}
    ${htmlRegraDeAceite}
    <button class="mot-rap larga" type="button" data-mot-sub="ajustes"><small>Minha meta</small><b>Ajustar dias, horas e quanto quero sobrar</b></button>
    <h4 class="mot-h">Seu resultado</h4>
    <div class="mot-per" role="group" aria-label="Período">${[["dia", "Hoje"], ["semana", "7 dias"], ["mes", nomeMes(mes)]].map(([k, n]) => `<button type="button" data-per="${k}" aria-pressed="${motPer === k}">${n}</button>`).join("")}</div>
    <div class="mot-grid">
      ${tile("Ganho", brl(r.ganho), "fat")}
      ${tile(temCarro ? "Custo do carro" : "Gastos do turno", brl(r.custo), "gasto")}${tile("Lucro", brl(r.lucro), "luc")}
      ${tile("Horas", horasCurtas(r.ms))}${tile("Lucro por hora", tracos(r.lucroPorHora, brl))}
      ${tile("Km rodados", virg(r.km))}${tile("Lucro por km", tracos(r.lucroPorKm, brl))}
      ${tile("Viagens", String(r.viagens))}${tile("Ganho por viagem", tracos(r.ganhoPorViagem, brl))}
    </div>
    ${grafico7}
    ${blocoPorApp(m.turnos, de, hj)}
    ${temCarro ? `<p class="hint">O lucro já desconta o custo do carro, ${brl(custoDoVeiculo(veicD)?.total || 0)} por mês, do <b>Meu carro ou moto</b>.</p>`
      : `<p class="hint">Por enquanto o lucro desconta só os gastos que você lança no turno. Preencha o <b>Meu carro ou moto</b>, com os km por mês, e o app desconta o custo real do carro. <button class="link" type="button" id="motVeic">Preencher agora</button></p>`}
    ${r.n ? `<button class="btn mot-compartilha" type="button" id="motImagem">Compartilhar meu resultado</button>` : ""}
    ${hist ? `<h4 class="mot-h">Últimos turnos</h4><ul class="itens apagaveis mot-hist">${hist}</ul>` : ""}
  </div>`;
  host.querySelectorAll("[data-mot-acao]").forEach((b) => (b.onclick = () => acaoRapida(b.dataset.motAcao)));
  host.querySelectorAll("[data-mot-sub]").forEach((b) => (b.onclick = () => motEntra(b.dataset.motSub)));
  host.querySelectorAll("[data-per]").forEach((b) => (b.onclick = () => { motPer = b.dataset.per; render(); }));
  $("motIniciar").onclick = () => { const ini = Date.now(); gravaMot({ ...motDados(), ativo: { ini, parcial: 0, antes: S.data.lancamentos.filter((x) => x.data >= isoLocal(ini)).map((x) => x.id), pausado: 0, pausaIni: null } }); vibra(30); render(); scrollTo(0, 0); };
  if ($("motVeic")) $("motVeic").onclick = () => meuVeiculo();
  if ($("motImagem")) $("motImagem").onclick = () => compartilharResultadoMot(motPer === "dia" ? "Hoje" : motPer === "semana" ? "Últimos 7 dias" : `${nomeMes(mes)[0].toUpperCase()}${nomeMes(mes).slice(1)}`, r);
  host.querySelectorAll("[data-medit]").forEach((b) => (b.onclick = () => motEntra("edit-" + b.dataset.medit)));
  host.querySelectorAll("[data-mdel]").forEach((b) => armDelete(b, async () => {
    const mm = motDados(), t = mm.turnos.find((x) => x.id === b.dataset.mdel); if (!t) return;
    for (const id of [t.rid, ...(t.cids || [t.cid])].filter(Boolean)) if (lancPorId(id)) await apagaLancamento(id);
    gravaMot({ ...mm, turnos: mm.turnos.filter((x) => x.id !== t.id) }); render(); toast("Turno apagado, junto com a entrada e os gastos dele."); render();
  }, "Toque de novo"));
}
/** Ao parar o turno: confere o que foi lançado e cria a entrada e os gastos no extrato. */
/** Entra numa subtela da jornada (ganho, gastos, ajustes ou fechamento): ganha uma entrada no histórico para o Voltar do celular. */
function motEntra(sub) {
  if (sub === "fechar") motFechando = true; else motSub = sub;
  try { history.pushState({ sub: true, motsub: true }, ""); } catch { /* sem histórico: o Voltar da tela resolve */ }
  render(); scrollTo(0, 0);
}
/** Sai da subtela, pelo botão da tela ou ao salvar. */
function motSai() {
  motSub = null; motFechando = false;
  if (history.state?.motsub) { S.ignoraPop = true; try { history.back(); } catch { S.ignoraPop = false; } }
  render(); scrollTo(0, 0);
}
function fecharTurno() {
  const mm = motDados();
  if (mm.ativo?.pausaIni) { mm.ativo.pausado += Date.now() - mm.ativo.pausaIni; mm.ativo.pausaIni = null; gravaMot(mm); }   // encerrar durante a pausa: a pausa termina agora
  motEntra("fechar");
}
/** Subtelas da jornada: cada uma ocupa a tela inteira, com Voltar no alto. */
function paneMotSub(host) {
  const m = motDados(), volta = motSai;
  const topo = (t, intro) => `<div id="motRoot"><button class="mot-voltar" type="button" id="motVolta"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>Voltar</button><h3 class="mot-h" style="margin:6px 0 4px">${t}</h3><p class="hint" style="margin:0 0 14px">${intro}</p>`;
  if (String(motSub).startsWith("edit-")) {
    const t = m.turnos.find((x) => x.id === motSub.slice(5));
    if (!t) { motSub = null; return render(); }
    const hm = (ms) => `${pad(new Date(ms).getHours())}:${pad(new Date(ms).getMinutes())}`;
    host.innerHTML = topo("Editar o turno", `Turno de ${ddmm(isoLocal(t.ini))}. Corrija o que faltou ou errou; o ganho também muda no extrato. Os gastos lançados nesse turno ficam como estão (mude-os no Extrato).`) +
      `<form id="meForm" class="dlg-form" autocomplete="off">
      ${APPS.map(([k, n]) => `<label class="f">${n} (R$)<input class="in money" data-eapp="${k}" inputmode="decimal" placeholder="0,00" value="${t.apps?.[k] > 0 ? esc(String(t.apps[k]).replace(".", ",")) : ""}"></label>`).join("")}
      <p class="hint wide mt-tot" id="meTot" aria-live="polite"></p>
      <label class="f">Viagens<input class="in" id="meViag" inputmode="numeric" maxlength="3" placeholder="ex.: 12" value="${Number(t.viagens) > 0 ? t.viagens : ""}"></label>
      <label class="f">Km rodados<input class="in" id="meKm" inputmode="decimal" maxlength="6" placeholder="ex.: 140" value="${Number(t.km) > 0 ? esc(String(t.km).replace(".", ",")) : ""}"></label>
      <label class="f wide">Dia<input class="in" type="date" id="meDia" max="${hoje()}" value="${isoLocal(t.ini)}"></label>
      <label class="f">Começou às<input class="in" type="time" id="meDe" value="${hm(t.ini)}"></label>
      <label class="f">Terminou às<input class="in" type="time" id="meAte" value="${hm(t.fim)}"></label>
      <p class="auth-msg err wide" id="meMsg"></p>
      <div class="actions wide"><button class="btn primary" type="submit">Salvar alterações</button><button class="btn" type="button" id="meVolta">Cancelar</button></div></form></div>`;
    $("motVolta").onclick = motSai; $("meVolta").onclick = motSai;
    const soma = () => { const v = round2([...host.querySelectorAll("[data-eapp]")].reduce((a, i) => a + (nm(i.value) > 0 ? nm(i.value) : 0), 0)); $("meTot").innerHTML = `Total do dia: <b>${brl(v)}</b>`; };
    host.querySelectorAll("[data-eapp]").forEach((i) => i.addEventListener("input", soma)); soma();
    $("meForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const erro = (x) => { $("meMsg").textContent = x; };
      const apps = {}; host.querySelectorAll("[data-eapp]").forEach((i) => { const v = nm(i.value); if (v > 0) apps[i.dataset.eapp] = round2(v); });
      const ganho = somaValores(apps), km = Math.max(0, nm($("meKm").value)), viagens = Math.max(0, Math.round(nm($("meViag").value)));
      if (ganho <= 0 && !(km > 0)) return erro("Informe o total que ganhou em cada app, ou os km rodados.");
      if (ganho > VALOR_MAX) return erro(ALTO_DEMAIS);
      if (km > 3000) return erro("Esse turno tem km demais. Confira o número.");
      const dia = $("meDia").value, [h1, m1] = $("meDe").value.split(":").map(Number), [h2, m2] = $("meAte").value.split(":").map(Number);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || [h1, m1, h2, m2].some((n) => !Number.isFinite(n))) return erro("Confira o dia e os horários.");
      const [ya, ma, da] = dia.split("-").map(Number), a = new Date(ya, ma - 1, da, h1, m1, 0, 0), b = new Date(ya, ma - 1, da, h2, m2, 0, 0); if (b <= a) b.setDate(b.getDate() + 1);
      if (b - a > 24 * 3600 * 1000 || b.getTime() > Date.now() + 60000) return erro("Confira o horário: o turno passou de 24 horas ou termina no futuro.");
      const catR = cats("Receita").find((x) => /extra|app|motor/i.test(x)) || cats("Receita")[0], desc = "Ganhos: " + APPS.filter(([k]) => apps[k]).map(([, n]) => n).join(" + ");
      let rid = t.rid || null; const l = rid ? lancPorId(rid) : null;
      if (ganho > 0 && l) { const patch = { valor: ganho, descricao: desc, data: dia }; if (!(await grava(() => S.store.updateLancamento(l.id, patch)))) return; Object.assign(l, patch); }
      else if (ganho > 0) { let criados = []; if (!(await grava(async () => { criados = await S.store.addLancamentos([{ data: dia, import_key: null, cartao_id: null, parcelas: 1, descricao: desc, tipo: "Receita", categoria: catR, forma: "", valor: ganho }]); }))) return; criados.forEach((g) => S.data.lancamentos.push({ ...g, valor: Number(g.valor) })); rid = criados[0]?.id || null; }
      else if (l) { if (!(await grava(() => S.store.deleteLancamento(l.id)))) return; S.data.lancamentos = S.data.lancamentos.filter((z) => z.id !== l.id); rid = null; }
      const mm = motDados(); gravaMot({ ...mm, turnos: mm.turnos.map((x) => (x.id === t.id ? { ...x, ini: a.getTime(), fim: b.getTime(), apps, viagens, km: round2(km), rid } : x)) });
      motSai(); toast("Turno atualizado.");
    });
    return;
  }
  if (motSub === "ajustes" || !m.ativo) {
    host.innerHTML = topo("Minha meta", "O app usa isso para dizer quanto você precisa rodar por dia e quanto precisa render por hora.") +
      `<form id="motAjForm" class="dlg-form" autocomplete="off"><label class="f">Dias rodando por semana<select class="in" id="motDias">${[1, 2, 3, 4, 5, 6, 7].map((n) => `<option${n === m.diasSemana ? " selected" : ""}>${n}</option>`).join("")}</select></label>
      <label class="f">Horas por dia<select class="in" id="motHoras">${[4, 5, 6, 7, 8, 9, 10, 11, 12, 14].map((n) => `<option${n === m.horasDia ? " selected" : ""}>${n}</option>`).join("")}</select></label>
      <label class="f wide">Quero sobrar a mais no mês (R$)<input class="in money" id="motExtra" inputmode="decimal" placeholder="0,00" value="${m.extra ? esc(virg(m.extra)) : ""}"></label>
      <div class="actions wide"><button class="btn primary" type="submit">Salvar</button></div></form></div>`;
    $("motAjForm").addEventListener("submit", (e) => { e.preventDefault(); gravaMot({ ...motDados(), diasSemana: Number($("motDias").value) || 6, horasDia: Number($("motHoras").value) || 8, extra: Math.max(0, nm($("motExtra").value)) }); toast("Meta salva."); volta(); });
  } else if (motSub === "ganho") {
    host.innerHTML = topo("Ganho do dia", "Some o que os apps (Uber, 99, iFood...) e as corridas particulares renderam até agora e digite aqui. Assim o app diz quanto você está rendendo por hora. No fim, você informa o total de cada app.") +
      `<form id="motGanho" class="dlg-form" autocomplete="off"><label class="f wide">Ganho do dia até agora (R$)<input class="in money" id="mgnVal" inputmode="decimal" placeholder="0,00" value="${m.ativo.parcial ? esc(virg(m.ativo.parcial)) : ""}"></label>
      <div class="actions wide"><button class="btn primary" type="submit">Salvar</button></div></form></div>`;
    $("motGanho").addEventListener("submit", (e) => {
      e.preventDefault(); const v = round2(nm($("mgnVal").value));
      if (v < 0 || v > VALOR_MAX) { toast(ALTO_DEMAIS); return; }
      const mm = motDados(); mm.ativo.parcial = v; gravaMot(mm); vibra(15); volta();
    });
  }
  $("motVolta").onclick = volta;
}
/** O fechamento do turno é parte da própria tela (não um quadro por cima): a pessoa continua vendo onde está. */
function paneFechar(host) {
  const m = motDados(); if (!m.ativo) { motFechando = false; return; }
  const ini = m.ativo.ini, fim = Date.now(), pausado = m.ativo.pausado || 0, tempo = (ms) => `${pad(new Date(ms).getHours())}:${pad(new Date(ms).getMinutes())}`;
  const gastosJ = gastosDaJornada(m.ativo);
  host.innerHTML = `<div id="motRoot"><h3 class="mot-h" style="margin-top:0">Encerrar a jornada</h3><p class="hint" style="margin:0 0 10px">Você trabalhou <b>${horasCurtas(fim - ini - pausado)}</b>${pausado > 60000 ? ` (sem contar ${horasCurtas(pausado)} de pausa)` : ""}. Informe o <b>total de cada app</b>: o ganho entra no extrato como entrada.${m.ativo.parcial > 0 ? ` Você anotou ${brl(m.ativo.parcial)} até agora.` : ""}${gastosJ > 0 ? ` Os ${brl(gastosJ)} que você gastou na jornada já estão no extrato, não precisa lançar de novo.` : ""}</p>
    <form id="mtForm" class="dlg-form" autocomplete="off">
      ${APPS.map(([k, n]) => `<label class="f">${n} (R$)<input class="in money" data-app="${k}" inputmode="decimal" placeholder="0,00"></label>`).join("")}
      <p class="hint wide mt-tot" id="mtTot" aria-live="polite">Total do dia: <b>R$ 0,00</b></p>
      <label class="f">Viagens<input class="in" id="mtViag" inputmode="numeric" maxlength="3" placeholder="ex.: 12"></label>
      <label class="f">Km rodados<input class="in" id="mtKm" inputmode="decimal" maxlength="6" placeholder="ex.: 140"></label>
      <label class="f">Começou às<input class="in" type="time" id="mtDe" value="${tempo(ini)}"></label>
      <label class="f">Terminou às<input class="in" type="time" id="mtAte" value="${tempo(fim)}"></label>
      <p class="auth-msg err wide" id="mtMsg"></p>
      <div class="actions wide"><button class="btn primary" type="submit">Salvar jornada</button><button class="btn" type="button" id="mtVolta">Voltar à jornada</button></div></form></div>`;
  $("mtVolta").onclick = motSai;
  // Soma dos apps enquanto a pessoa digita, para conferir com o que os apps mostram.
  const somaApps = () => { const t = round2([...host.querySelectorAll("[data-app]")].reduce((s2, i) => s2 + (Number(parseMoney(i.value)) > 0 ? parseMoney(i.value) : 0), 0)); $("mtTot").innerHTML = `Total do dia: <b>${brl(t)}</b>`; };
  host.querySelectorAll("[data-app]").forEach((i) => i.addEventListener("input", somaApps));
  $("mtForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const erro = (t) => { $("mtMsg").textContent = t; };
    const le = (attr) => { const o = {}; document.querySelectorAll(`#mtForm [data-${attr}]`).forEach((i) => { const v = nm(i.value); if (v > 0) o[i.dataset[attr]] = round2(v); }); return o; };
    const apps = le("app"), gastos = {}, ganho = somaValores(apps), comb = gastosJ, km = Math.max(0, nm($("mtKm").value)), viagens = Math.max(0, Math.round(nm($("mtViag").value)));
    if (ganho <= 0 && !(km > 0)) return erro("Informe o total que ganhou em cada app, ou os km rodados.");
    if (ganho > VALOR_MAX || comb > VALOR_MAX) return erro(ALTO_DEMAIS);
    if (km > 3000) return erro("Esse turno tem km demais. Confira o número.");
    let i2 = ini, f2 = fim;
    if ($("mtDe").value !== tempo(ini) || $("mtAte").value !== tempo(fim)) {
      const [h1, m1] = $("mtDe").value.split(":").map(Number), [h2, m2] = $("mtAte").value.split(":").map(Number);
      if ([h1, m1, h2, m2].some((n) => !Number.isFinite(n))) return erro("Confira o horário de início e de fim.");
      const a = new Date(ini); a.setHours(h1, m1, 0, 0); const b = new Date(a); b.setHours(h2, m2, 0, 0); if (b <= a) b.setDate(b.getDate() + 1);
      i2 = a.getTime(); f2 = b.getTime();
    }
    if (f2 - i2 > 24 * 3600 * 1000 || f2 > Date.now() + 60000) return erro("Confira o horário: o turno passou de 24 horas ou termina no futuro.");
    const dia = isoLocal(i2), catR = cats("Receita").find((x) => /extra|app|motor/i.test(x)) || cats("Receita")[0];
    const base = { data: dia, import_key: null, cartao_id: null, parcelas: 1 }, rows = [];
    if (ganho > 0) rows.push({ ...base, descricao: "Ganhos: " + APPS.filter(([k]) => apps[k]).map(([, n]) => n).join(" + "), tipo: "Receita", categoria: catR, forma: "", valor: ganho });
    let criados = [];
    if (rows.length && !(await grava(async () => { criados = await S.store.addLancamentos(rows); }))) return;
    criados.forEach((g) => S.data.lancamentos.push({ ...g, valor: Number(g.valor) }));
    const turno = { id: crypto.randomUUID(), ini: i2, fim: f2, pausado: Math.round(pausado), apps, gastos, viagens, km: round2(km), comb, rid: criados.find((g) => g.tipo === "Receita")?.id || null, cids: criados.filter((g) => g.tipo === "Despesa").map((g) => g.id) };
    const mm = motDados(); gravaMot({ ...mm, ativo: null, turnos: [...mm.turnos, turno] });
    motSai(); vibra(30);
    toast(`Jornada salva: ${brl(ganho)} em ${horasCurtas(f2 - i2 - pausado)}${comb > 0 ? `, com ${brl(comb)} de gastos` : ""}.`);
  });
}

/* ---------- Minha casa ---------- */
function minhaCasa() {
  const c = calcMes(S.data, mKey(hoje()), hoje());
  ferramentaDeConta({ titulo: "Minha casa", chave: "casa", semDinheiro: ["moradores", "area"],
    intro: "Descubra quanto a casa custa por mês e quanto isso pesa na sua renda. Preencha o que souber: o que ficar em branco não entra na conta, e o que você digitar fica salvo.",
    grupos: [
      ["Moradia (por mês)", [["aluguel", "Aluguel", "1.500"], ["financia", "Financiamento", "1.200"], ["condominio", "Condomínio", "350"]]],
      ["Gastos do ano (R$)", [["iptuAno", "IPTU", "1.200"], ["manutAno", "Manutenção e consertos", "1.000"]]],
      ["Contas do mês (R$)", [["luz", "Luz", "150"], ["agua", "Água e esgoto", "90"], ["gas", "Gás", "110"], ["internet", "Internet, TV e celular", "180"], ["limpeza", "Limpeza e faxina", "200"], ["outrosMes", "Outros gastos", "100"]]],
      ["Para comparar (opcional)", [["moradores", "Pessoas na casa", "3"], ["area", "Tamanho (m²)", "60"]]],
    ],
    calcula: (v) => {
      const r = custoDaCasa(v); if (!r) return null;
      const lancado = [...catMap(c)].filter(([k]) => k === "Moradia" || k === "Contas da casa").reduce((t, [, x]) => t + x, 0), peso = pesoDaCasa(r.total, c.rec);
      const frase = !peso ? "" : peso.nivel === "ok" ? `Está dentro do que se costuma recomendar (até 30% da renda, ou ${brl(peso.teto30)}).` : peso.nivel === "atencao" ? `Está um pouco acima de 30% da renda (${brl(peso.teto30)}). Vale olhar o que dá para reduzir.` : `Pesa bastante: o comum é até 30% da renda (${brl(peso.teto30)}). Revise as contas de consumo e o que dá para renegociar.`;
      return { rotulo: "A casa custa por mês", valor: brl(r.total), mini: [["Por dia", brl(r.porDia)], [r.porPessoa ? "Por pessoa" : "Por ano", r.porPessoa ? brl(r.porPessoa) : brl(r.porAno)], [peso ? "Da renda" : r.porM2 ? "Por m²" : "Fixos", peso ? peso.pct + "%" : r.porM2 ? brl(r.porM2) : brl(r.fixos)]],
        fim: barrasDe(r.partes) + `<p class="hint" style="margin:10px 0 0">${peso ? `Isso equivale a <b>${peso.pct}%</b> do que entrou neste mês. ${frase} ` : ""}${lancado > 0 ? `No app, você lançou ${brl(lancado)} em Moradia e Contas da casa neste mês.` : ""}</p>` };
    } });
}

/* ---------- Revisão do mês em 3 passos ---------- */
function revisaoTela(m = S.mes) {
  const hojeM = mKey(hoje()), mes = m > hojeM ? hojeM : m;
  const r = revisaoDoMes(S.data, mes, hoje(), S.prefs.limites || {});
  if (!r) return void toast("Esse mês ainda não começou.");
  let passo = 1, valorGuardar = r.guardar > 0 ? r.guardar : 20;
  const antes = nomeMes(addM(mes, -1)).toLowerCase(), esteMes = nomeMes(mes).toLowerCase(), parcial = r.fase === "atual";
  const desenha = () => {
    const pontos = [1, 2, 3].map((n) => `<li class="${n === passo ? "atual" : n < passo ? "feito" : ""}" ${n === passo ? 'aria-current="step"' : ""}><span>${n}</span></li>`).join("");
    let corpo = "";
    if (passo === 1) {
      const v = r.variacao;
      corpo = `<h4 class="rv-t">Como foi ${esc(esteMes)}${parcial ? " (até hoje)" : ""}</h4>
        <div class="rv-cards"><div><small>Entrou</small><b class="pos">${brl0(r.rec)}</b></div><div><small>Saiu</small><b>${brl0(r.custo)}</b></div><div><small>${r.sobra >= 0 ? "Sobrou" : "Faltou"}</small><b class="${r.sobra >= 0 ? "pos" : "neg"}">${brl0(Math.abs(r.sobra))}</b></div></div>
        ${v === null ? "" : `<p class="rv-frase">Você gastou <b>${Math.abs(v)}% ${v >= 0 ? "a mais" : "a menos"}</b> do que em ${esc(antes)} (${brl(r.custoAnt)}).</p>`}
        ${r.top.length ? `<h4 class="sub-h">Para onde foi o dinheiro</h4><div class="ve-partes">${r.top.map((p) => `<div class="ve-p"><span>${esc(p.cat)}</span><b>${brl(p.valor)}</b><i style="width:${Math.max(3, p.pct)}%"></i></div>`).join("")}</div>` : `<p class="hint">Nenhum gasto neste mês.</p>`}`;
    } else if (passo === 2) {
      const lim = r.passaram.map((u) => `<li><b>${esc(u.cat)}</b> passou ${brl(u.passou)} do limite de ${brl(u.limite)}.</li>`).join("");
      const sub = r.subiu.map((x) => `<li><b>${esc(x.cat)}</b> subiu ${brl(x.dif)} (de ${brl(x.antes)} para ${brl(x.agora)}). <button class="link" type="button" data-lim="${esc(x.cat)}" data-v="${Math.ceil(x.antes / 10) * 10}">Pôr limite de ${brl(Math.ceil(x.antes / 10) * 10)}</button></li>`).join("");
      corpo = `<h4 class="rv-t">Onde dá para ajustar</h4>${lim || sub ? `<ul class="rv-lista">${lim}${sub}</ul><p class="hint">Um limite por categoria avisa antes de passar. Você pode mudar depois em Planejar.</p>` : `<p class="rv-frase">Nada fugiu do controle: nenhuma categoria passou do limite nem subiu muito. Mantenha o ritmo.</p>`}`;
    } else {
      corpo = `<h4 class="rv-t">Quanto guardar no próximo mês</h4>
        <p class="rv-frase">${r.guardar > 0 ? `Pelo que entrou e sobrou, uma boa meta é <b>${brl(r.guardar)}</b> (até 10% do que entrou, ${brl(r.dezPorCento)}).` : `Neste mês não sobrou. Comece pequeno: ${brl(20)} já cria o hábito.`}</p>
        <label class="f">Valor para guardar (R$)<input class="in money" id="rvValor" inputmode="decimal" value="${esc(valorGuardar.toLocaleString("pt-BR", { minimumFractionDigits: 2 }))}"></label>
        <p class="hint">Guardar primeiro, assim que o dinheiro entrar, funciona melhor do que esperar sobrar.</p>`;
    }
    openDlg(`<h3>Revisão do mês</h3>
      <ol class="rv-passos" aria-label="Passo ${passo} de 3">${pontos}</ol>
      ${corpo}
      <div class="actions">${passo > 1 ? `<button class="btn" type="button" id="rvVolta">Voltar</button>` : ""}
        ${passo < 3 ? `<button class="btn primary" type="button" id="rvProx">Próximo</button>` : `<button class="btn primary" type="button" id="rvGuarda">Guardar ${brl(valorGuardar)} agora</button><button class="btn" type="button" id="rvFim">Concluir sem guardar</button>`}
        <button class="btn" type="button" data-close>Fechar</button></div>`);
    if ($("rvVolta")) $("rvVolta").onclick = () => { passo--; desenha(); };
    if ($("rvProx")) $("rvProx").onclick = () => { passo++; desenha(); };
    $("dlgBody").querySelectorAll("[data-lim]").forEach((b) => (b.onclick = () => { S.prefs.limites = { ...(S.prefs.limites || {}), [b.dataset.lim]: Number(b.dataset.v) }; salvaPrefs(); b.replaceWith(Object.assign(document.createElement("span"), { textContent: "Limite definido.", className: "pill good" })); }));
    if ($("rvValor")) $("rvValor").addEventListener("input", () => { const v = parseMoney($("rvValor").value); if (v > 0 && v <= VALOR_MAX) { valorGuardar = round2(v); $("rvGuarda").textContent = `Guardar ${brl(valorGuardar)} agora`; } });
    const feito = () => { const o = { ...(S.prefs.revisoes || {}), [mes]: true }; S.prefs.revisoes = Object.fromEntries(Object.entries(o).sort().slice(-24)); salvaPrefs(); };
    if ($("rvFim")) $("rvFim").onclick = () => { feito(); $("dlg").close(); comemora(); toast("Revisão feita. Mês que vem você já começa com um plano."); render(); };
    if ($("rvGuarda")) $("rvGuarda").onclick = () => {
      feito(); const dest = cats("Reserva")[0];
      if (!dest) { $("dlg").close(); return void toast("Crie uma caixinha em Planejar para guardar."); }
      $("dlg").close(); S.tipo = "Reserva"; renderForm(); $("fCat").value = dest; $("fForma").value = "Guardar"; S.catManual = true; renderForm();
      $("fValor").value = valorGuardar.toLocaleString("pt-BR", { minimumFractionDigits: 2 }); mostraEfeito();
      setTimeout(() => { if (noCelular()) abrirLancar(); else $("fValor").scrollIntoView({ block: "center" }); }, 200);
    };
  };
  desenha();
}

/* ---------- Dica do dia ---------- */
const dicasFeitas = () => (Array.isArray(S.prefs.dicasFeitas) ? S.prefs.dicasFeitas : []);
function abreDaDica(acao) {
  ({ desafio: desafioEconomia, mercado, casa: minhaCasa, veiculo: meuVeiculo, hora: minhaHoraTela, calc: () => calculadoras(), caixa: () => { $("dlg").close(); S.view = "listas"; S.tab = "m"; render(); noCelular() ? scrollTo(0, 0) : $("listas").scrollIntoView({ block: "start" }); } })[acao]?.();
}
function marcaDica(feita) {
  const h = hoje(), l = dicasFeitas().filter((d) => d !== h);
  S.prefs.dicasFeitas = (feita ? [...l, h] : l).sort().slice(-90); salvaPrefs();
}
function renderDicaIni(c) {
  const host = $("dicaIni");
  if (!host) return;
  if (!S.loaded || c.fase === "futuro" || !S.data.lancamentos.length) { host.hidden = true; host.innerHTML = ""; return; }
  const d = dicaDoDia(hoje()), feita = dicasFeitas().includes(hoje());
  host.hidden = false;
  host.innerHTML = `<div class="teto dica-card"><span class="topo"><span class="l">${ico("luz")}Dica do dia</span>${feita ? `<span class="pill good">Feito</span>` : ""}</span>
    <span class="n"><b>${esc(d.titulo)}</b></span><span class="t dica-t">${esc(d.texto)}</span>
    <span class="dica-ac">${d.acao ? `<button class="btn" type="button" id="dicaAbre">Ver como fazer</button>` : ""}<button class="btn${feita ? "" : " primary"}" type="button" id="dicaFeita">${feita ? "Desmarcar" : "Já fiz hoje"}</button></span>
    <button class="link" type="button" id="dicaMais">Ver as dicas dos últimos dias</button></div>`;
  if ($("dicaAbre")) $("dicaAbre").onclick = () => abreDaDica(d.acao);
  $("dicaFeita").onclick = () => { marcaDica(!feita); if (!feita) toast("Boa! Um hábito de cada vez leva longe."); renderDicaIni(c); };
  $("dicaMais").onclick = dicasTela;
}
function dicasTela() {
  const base = new Date(`${hoje()}T12:00:00Z`), dias = [];
  for (let k = 0; k < 7; k++) { const x = new Date(base.getTime() - k * 86400000), iso = x.toISOString().slice(0, 10); dias.push([iso, dicaDoDia(iso)]); }
  const feitas = dicasFeitas();
  openDlg(`<h3>Dicas para guardar dinheiro</h3>
    <p class="hint" style="margin:0 0 10px">Uma dica nova por dia. Você já marcou <b>${feitas.length}</b> ${feitas.length === 1 ? "dia" : "dias"} em que colocou uma dica em prática.</p>
    <ul class="conq-lista">${dias.map(([iso, d]) => `<li class="${feitas.includes(iso) ? "feita" : ""}"><span class="medalha">${ico(feitas.includes(iso) ? "medalha" : "luz")}</span><span><b>${esc(d.titulo)}</b><span class="t">${esc(ddmm(iso))}${iso === hoje() ? " (hoje)" : ""}</span><span class="t">${esc(d.texto)}</span></span></li>`).join("")}</ul>
    <div class="actions"><button class="btn" type="button" data-close>Fechar</button></div>`);
}

/* ---------- Conquistas ---------- */
const dadosDeConquistas = () => conquistas(S.data, hoje(), { semGasto: S.prefs.semGasto || [], metas: S.prefs.metas, desafios: S.prefs.desafios });
const nConq = (c, v) => (c.de >= 1000 ? brl0(v) : String(Math.floor(v)));
function renderConqIni(c) {
  const host = $("conqIni");
  if (!S.loaded || c.fase === "futuro" || !S.data.lancamentos.length) { host.hidden = true; host.innerHTML = ""; return; }
  const l = dadosDeConquistas(), ganhas = l.filter((x) => x.feita).length, prox = l.filter((x) => !x.feita).sort((x, y) => y.n / y.de - x.n / x.de)[0];
  host.hidden = false;
  host.innerHTML = `<div class="teto conq-card"><span class="topo"><span class="l">${ico("medalha")}Conquistas</span><span class="pill ${ganhas ? "good" : ""}">${ganhas} de ${l.length}</span></span>
    ${prox ? `<span class="n">Próxima: <b>${esc(prox.titulo)}</b> (${nConq(prox, prox.n)} de ${nConq(prox, prox.de)})</span><span class="conq-barra"><i style="width:${Math.max(3, Math.round((prox.n / prox.de) * 100))}%"></i></span>` : `<span class="n">Você ganhou todas as medalhas. Parabéns!</span>`}
    <button class="link" type="button" id="conqVer">Ver as medalhas</button></div>`;
  $("conqVer").onclick = conquistasTela;
}
function conquistasTela() {
  const l = dadosDeConquistas(), item = (c) => `<li class="${c.feita ? "feita" : ""}"><span class="medalha">${ico(c.feita ? c.icone : "medalha")}</span><span><b>${esc(c.titulo)}</b><span class="t">${esc(c.texto)}</span>${c.feita ? "" : `<span class="conq-barra"><i style="width:${Math.max(2, Math.round((c.n / c.de) * 100))}%"></i></span><span class="t">${nConq(c, c.n)} de ${nConq(c, c.de)}</span>`}</span></li>`;
  const ganhas = l.filter((x) => x.feita), falta = l.filter((x) => !x.feita).sort((x, y) => y.n / y.de - x.n / x.de);
  openDlg(`<h3>Conquistas (${ganhas.length} de ${l.length})</h3>
    ${ganhas.length ? `<ul class="conq-lista">${ganhas.map(item).join("")}</ul>` : `<p class="hint">Ainda nenhuma. A primeira vem com o primeiro lançamento.</p>`}
    ${falta.length ? `<h4 class="sub-h">Para ganhar</h4><ul class="conq-lista">${falta.map(item).join("")}</ul>` : ""}
    <div class="actions"><button class="btn" type="button" data-close>Fechar</button></div>`);
}
/* ---------- Assinaturas e cobranças que se repetem ---------- */
function assinaturasTela() {
  const ocultas = S.prefs.naoAssinaturas || [], r = assinaturasDetectadas(S.data, hoje(), { ocultas });
  const cartoes = new Map((S.data.cartoes || []).map((k) => [k.id, k.nome]));
  const onde = (a) => (cartoes.get(a.cartao_id) ? ` · ${esc(cartoes.get(a.cartao_id))}` : a.forma === CARTAO ? " · no cartão" : a.forma ? ` · ${esc(a.forma)}` : "");
  const linha = (a) => `<li class="assin-linha">${ava(a.categoria)}
    <span class="assin-tx"><b>${esc(a.nome)}</b>
      <span class="t">Todo dia ${a.dia} · ${a.meses} meses seguidos${onde(a)}</span>
      <span class="t">Próxima por volta de ${ddmm(a.proximo)}</span>
      ${a.subiu ? `<span class="pill warn">Subiu de ${brl(a.subiu.de)} para ${brl(a.subiu.para)} em ${ddmm(a.subiu.em)}</span>` : ""}
      ${a.jaFixa ? `<span class="pill info">Já está em Contas fixas</span>` : ""}</span>
    <span class="assin-val"><b>${brl(a.mensal)}</b><span class="t">${brl0(a.anual)} por ano</span><button class="link" type="button" data-oculta="${esc(a.chave)}">Não é assinatura</button></span></li>`;
  openDlg(`<h3>Assinaturas</h3>
    ${r.itens.length ? `<div class="assin-resumo"><span class="t">Você paga cerca de</span><b>${brl(r.totalMes)} por mês</b><span class="t">${brl0(r.totalAno)} por ano em ${r.itens.length} ${r.itens.length === 1 ? "cobrança que se repete" : "cobranças que se repetem"}</span></div>
      <ul class="assin-lista">${r.itens.map(linha).join("")}</ul>
      <p class="hint">O app acha cobranças com o mesmo nome, uma por mês, nos últimos 3 meses ou mais. Se uma delas não é assinatura, toque em "Não é assinatura".</p>`
      : `<p class="hint" style="margin:0 0 10px">Ainda não achei nenhuma assinatura.</p>
      <p class="hint">Para aparecer aqui, a cobrança precisa ter sido lançada com o mesmo nome (por exemplo, "Netflix") em 3 meses seguidos, uma vez por mês.</p>`}
    ${r.ocultas.length ? `<h4 class="sub-h">Que você tirou da lista</h4><ul class="assin-lista">${r.ocultas.map((a) => `<li class="assin-linha oculta"><span class="assin-tx"><b>${esc(a.nome)}</b><span class="t">${brl(a.mensal)} por mês</span></span><span class="assin-val"><button class="link" type="button" data-volta="${esc(a.chave)}">Mostrar de novo</button></span></li>`).join("")}</ul>` : ""}
    <div class="actions"><button class="btn" type="button" data-close>Fechar</button></div>`);
  const muda = async (chave, lista) => { S.prefs.naoAssinaturas = lista; await salvaPrefs(); assinaturasTela(); };
  document.querySelectorAll("#dlgBody [data-oculta]").forEach((b) => (b.onclick = async () => {
    const chave = b.dataset.oculta, nome = r.itens.find((a) => a.chave === chave)?.nome || "A cobrança";
    await muda(chave, [...new Set([...ocultas, chave])]);
    toastAcao(`${nome} saiu da lista`, "Desfazer", () => muda(chave, (S.prefs.naoAssinaturas || []).filter((k) => k !== chave)), 6000);
  }));
  document.querySelectorAll("#dlgBody [data-volta]").forEach((b) => (b.onclick = () => muda(b.dataset.volta, ocultas.filter((k) => k !== b.dataset.volta))));
}
/* ---------- Para revisar: gastos e entradas que ficaram em "Outros" ---------- */
function paraRevisarTela() {
  const r = paraRevisar(S.data, hoje(), { revisados: S.prefs.revisados || [] }), lista = r.itens.slice(0, 40);
  const linha = (x) => `<li class="assin-linha rev-linha">${ava(x.categoria, x.tipo === "Receita" ? "Receita" : "Despesa")}
    <button type="button" class="rev-tx" data-ed="${esc(x.id)}" aria-label="${esc(x.descricao || "Sem descrição")}: escolher a categoria"><b>${esc(x.descricao || "Sem descrição")}</b><span class="t">${ddmm(x.data)} · ${esc(x.forma || (x.tipo === "Receita" ? "Entrada" : "Gasto"))} · toque para escolher a categoria</span></button>
    <span class="assin-val"><b>${x.tipo === "Receita" ? "+ " : ""}${brl(Number(x.valor))}</b><button class="link" type="button" data-ok="${esc(x.id)}">Está certo</button></span></li>`;
  openDlg(`<h3>Para revisar</h3>
    ${r.total ? `<div class="assin-resumo"><span class="t">Ficaram em "Outros" nos últimos 60 dias</span><b>${r.total} ${r.total === 1 ? "lançamento" : "lançamentos"}</b><span class="t">${brl(r.soma)} no total. Escolha a categoria certa ou toque em "Está certo".</span></div>
      <ul class="assin-lista">${lista.map(linha).join("")}</ul>${r.total > lista.length ? `<p class="hint">Mostrando os ${lista.length} mais recentes.</p>` : ""}
      <div class="actions"><button class="btn" type="button" id="revTodos">Marcar todos como certos</button><button class="btn" type="button" data-close>Fechar</button></div>`
      : `<p class="hint" style="margin:0 0 10px">Nada para revisar.</p><p class="hint">Aqui aparecem os gastos e as entradas que ficaram em "Outros", como os que vêm do extrato do cartão e da leitura por foto quando o app não acha a categoria.</p>
      <div class="actions"><button class="btn" type="button" data-close>Fechar</button></div>`}`);
  const marca = async (ids) => { S.prefs.revisados = [...new Set([...(S.prefs.revisados || []), ...ids])].slice(-300); await salvaPrefs(); paraRevisarTela(); };
  document.querySelectorAll("#dlgBody [data-ok]").forEach((b) => (b.onclick = () => marca([b.dataset.ok])));
  if ($("revTodos")) $("revTodos").onclick = () => marca(r.itens.map((x) => x.id));
  // Tocar na linha abre a edição; ao salvar ou cancelar, a fila abre de novo.
  document.querySelectorAll("#dlgBody [data-ed]").forEach((b) => (b.onclick = () => {
    editarLancamento(b.dataset.ed);
    $("dlg").addEventListener("close", () => { if (!$("dlg").open) setTimeout(paraRevisarTela, 0); }, { once: true });
  }));
}
/** A barra de cima do celular (cor do tema) acompanha uma tela de cor própria, como o Modo motorista, e volta ao normal ao sair. */
function corDaBarra(escura) {
  const m = document.querySelector('meta[name="theme-color"]'); if (!m) return;
  if (!m.dataset.orig) m.dataset.orig = m.getAttribute("content") || "";
  m.setAttribute("content", escura ? "#12161c" : (document.documentElement.dataset.tema === "claro" ? "#0b2545" : m.dataset.orig));
}
/** Os jeitos de chamar a pessoa da conta casal (para reconhecer o dinheiro que passa de um para o outro); vazio sem conta de casal. */
const nomesDoParceiro = () => (casalAtivo() ? [nomeDoOutro(), nomeDoEmail(S.casal.outro)].filter(Boolean) : []);
/* ---------- Arrumar lançamentos: o que já foi lançado e atrapalha as contas ---------- */
// Três arrumações, cada uma mostrando o que vai mudar antes de mudar: transferências entre as contas da própria pessoa,
// Pix e débito que entraram como compra de cartão e o que ficou em "Outros" (por nome, de uma vez). Lógica em js/arrumar.js.
function arrumarTela() {
  const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`, ls = S.data.lancamentos, nome = S.prefs.meuNome || "";
  const a = entreMinhasContas(ls, [nome, nomeDoEmail($("whoName").textContent)].filter(Boolean), nomesDoParceiro()), b = pixComoCartao(ls), c = gruposEmOutros(ls), d = repetidosDeImportacao(ls), nCopias = d.reduce((s, g) => s + g.copias.length, 0), fixas = contasQueSeRepetem(ls, S.data.fixos, hoje());
  openDlg(`<h3>Arrumar lançamentos</h3>
    <p class="hint" style="margin:0 0 12px">Veja o que atrapalha as suas contas e arrume de uma vez. Nada muda sem você confirmar.</p>
    <div class="caixa-mais">
      ${opFerr("arA", "pessoa", casalAtivo() ? "Transferências entre as minhas contas e com o casal" : "Transferências entre as minhas contas", a.itens.length ? `${plural(a.itens.length, "lançamento", "lançamentos")}: entradas ${brl(a.entradas)} e saídas ${brl(a.saidas)} que não são ganho nem gasto` : nome ? "Nenhuma encontrada" : "Diga o seu nome para procurar")}
      ${opFerr("arB", "cartao", "Pix e débito que entraram como cartão", b.length ? `${plural(b.length, "lançamento", "lançamentos")} que não são compra de cartão` : "Nenhum encontrado")}
      ${opFerr("arC", "lupa", "Categorias em \"Outros\", por nome", c.length ? `${plural(c.length, "nome se repete", "nomes se repetem")}: escolha a categoria uma vez só` : "Nada repetido em Outros")}</div>
      ${opFerr("arE", "fixo", "Contas que se repetem todo mês", fixas.length ? `${plural(fixas.length, "achada", "achadas")}: deixe como conta fixa e pare de lançar` : "Nenhuma encontrada")}
      ${opFerr("arD", "lixo", "Lançamentos em dobro", nCopias ? `${plural(nCopias, "cópia", "cópias")} de importação com o mesmo valor e dia` : "Nenhum em dobro")}</div>
    <div class="actions"><button class="btn" type="button" data-close>Fechar</button></div>`);
  $("arA").onclick = arrumarMinhasContas; $("arB").onclick = arrumarPixComoCartao; $("arC").onclick = arrumarOutros; $("arD").onclick = arrumarRepetidos; $("arE").onclick = arrumarFixas;
}
/**
 * Contas que se repetem todo mês (achadas nos lançamentos, sobretudo nos que vieram do extrato): a pessoa escolhe quais viram conta fixa.
 * Os lançamentos antigos viram "pago" na conta fixa, para o mesmo gasto não contar duas vezes, e as chaves deles ficam guardadas para o mesmo
 * extrato, se for importado de novo, não trazer tudo de volta.
 */
function arrumarFixas() {
  const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`, achadas = contasQueSeRepetem(S.data.lancamentos, S.data.fixos, hoje()), marcados = new Set(achadas.map((g) => g.chave));
  const linha = (g) => `<li><input type="checkbox" data-k="${esc(g.chave)}" checked aria-label="Virar conta fixa: ${esc(g.nome)}">
    <span class="oque"><b>${esc(g.nome)}</b><span>${g.tipo === "Receita" ? "Entra" : "Sai"} todo mês, perto do dia ${g.dia} · ${plural(g.itens.length, "mês seguido", "meses seguidos")}${g.variavel ? " · o valor muda um pouco" : ""}</span></span>
    <b class="v ${g.tipo === "Receita" ? "pos" : ""}">${brl(g.valor)}</b></li>`;
  openDlg(`<div class="ext"><h3>Contas que se repetem</h3>
    <p class="hint" style="margin:0 0 10px;font-size:13px">O app achou lançamentos que aparecem todo mês, no mesmo valor e perto do mesmo dia. Como conta fixa, eles entram sozinhos nos próximos meses e aparecem nos vencimentos. Os lançamentos antigos ficam marcados como pagos, sem contar duas vezes. Gastos do dia a dia, como mercado e Pix, não entram aqui.</p>
    ${achadas.length ? `<ul class="ext-lista">${achadas.map(linha).join("")}</ul>
      <p class="auth-msg err" id="arFxMsg" style="margin:8px 0 0"></p>
      <div class="actions" style="margin-top:12px"><button class="btn primary" type="button" id="arFxOk"></button>${voltaArrumar}</div>`
      : `<div class="empty" style="margin-top:12px">Não achei contas que se repetem. Elas aparecem quando o mesmo lançamento vem em 2 meses seguidos.</div><div class="actions" style="margin-top:12px">${voltaArrumar}</div>`}</div>`);
  $("arVolta").onclick = arrumarTela;
  if (!achadas.length) return;
  const conta = () => { $("arFxOk").textContent = marcados.size ? `Deixar ${plural(marcados.size, "conta", "contas")} como fixa${marcados.size === 1 ? "" : "s"}` : "Escolha ao menos uma"; $("arFxOk").disabled = !marcados.size; };
  document.querySelectorAll("#dlgBody [data-k]").forEach((b) => (b.onchange = () => { b.checked ? marcados.add(b.dataset.k) : marcados.delete(b.dataset.k); conta(); }));
  conta();
  $("arFxOk").onclick = async () => {
    const sel = achadas.filter((g) => marcados.has(g.chave)); if (!sel.length) return;
    $("arFxOk").disabled = true; $("arFxOk").textContent = "Salvando…";
    const ok = await transformaEmFixas(sel);
    if (!ok) { $("arFxMsg").textContent = "Não consegui salvar tudo. O que já foi feito está na tela; tente de novo para o resto."; $("arFxOk").disabled = false; conta(); return; }
    $("dlg").close(); toast(`${plural(sel.length, "conta virou fixa", "contas viraram fixas")}. Os meses anteriores ficaram como pagos.`);
  };
}
/** Vira conta fixa o que o app achou que se repete: cria o fixo, marca os meses antigos como pagos e tira o lançamento solto (sem contar duas vezes). */
async function transformaEmFixas(sel) {
  const chaves = [], apagados = new Set(), novosFixos = [], novosPagos = [];
  const ok = await grava(async () => {
    for (const g of sel) {
      const criado = await S.store.addFixo({ tipo: g.tipo, descricao: g.nome, categoria: g.categoria, dia: g.dia, valor: g.valor, forma: g.tipo === "Receita" ? "" : (g.forma || "Pix"), desde: g.desde, ate: null });
      novosFixos.push(criado);
      for (const x of g.itens) {
        const mes = `${mKey(x.data)}-01`; await S.store.setPago(criado.id, mes, true); novosPagos.push({ fixo_id: criado.id, mes });
        await S.store.deleteLancamento(x.id); apagados.add(x.id); if (x.import_key) chaves.push(x.import_key);
      }
    }
  });
  // Mesmo se parou no meio, o que já foi feito entra na tela: nada fica pela metade sem aparecer.
  S.data.fixos.push(...novosFixos); S.data.pagos.push(...novosPagos); S.data.lancamentos = S.data.lancamentos.filter((x) => !apagados.has(x.id));
  if (chaves.length) { S.prefs.chavesLigadas = [...new Set([...(S.prefs.chavesLigadas || []), ...chaves])].slice(-800); await salvaPrefs(); }
  render();
  return ok;
}
/** Volta para o menu de arrumar quando a janela atual é fechada pelo botão Voltar. */
const voltaArrumar = `<button class="btn" type="button" id="arVolta">Voltar</button>`;
function arrumarRepetidos() {
  const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`, grupos = repetidosDeImportacao(S.data.lancamentos);
  const marcados = new Set(grupos.filter((g) => g.igual).flatMap((g) => g.copias.map((c) => c.id)));
  const linha = (g) => g.copias.map((c) => `<li><input type="checkbox" data-k="${esc(c.id)}"${marcados.has(c.id) ? " checked" : ""} aria-label="Apagar a cópia: ${esc(nomeDoLancamento(c.descricao))}">
    <span class="oque"><b>${esc(arrumaNome(nomeDoLancamento(c.descricao)) || "Sem nome")}</b><span>${ddmm(g.data)} · fica: ${esc(arrumaNome(nomeDoLancamento(g.manter.descricao)) || "Sem nome")}${g.igual ? "" : " · nomes diferentes, confira"}</span></span>
    <b class="v">${brl(g.valor)}</b></li>`).join("");
  openDlg(`<div class="ext"><h3>Lançamentos em dobro</h3>
    <p class="hint" style="margin:0 0 10px;font-size:13px">Estes lançamentos vieram de importação, têm o mesmo valor e o mesmo dia, e um deles fica. O que tem o mesmo nome já vem marcado para apagar; o que tem nome diferente pode ser um gasto de verdade, então confira.</p>
    ${grupos.length ? `<div class="ext-topo"><b id="arRepSoma"></b></div><ul class="ext-lista">${grupos.map(linha).join("")}</ul>
      <p class="hint" style="margin:8px 0 0">Apagar não dá para desfazer; baixe uma cópia antes se quiser.</p>
      <div class="actions" style="margin-top:12px"><button class="btn" type="button" id="arRepApaga"></button><button class="btn" type="button" id="arRepCopia">${ico("baixar")}Baixar cópia</button>${voltaArrumar}</div>`
      : `<div class="empty" style="margin-top:12px">Não achei lançamentos em dobro.</div><div class="actions" style="margin-top:12px">${voltaArrumar}</div>`}</div>`);
  $("arVolta").onclick = arrumarTela;
  if (!grupos.length) return;
  const todos = grupos.flatMap((g) => g.copias), sel = () => todos.filter((x) => marcados.has(x.id));
  const conta = () => {
    const s = sel(); $("arRepSoma").textContent = `${plural(s.length, "marcado", "marcados")} · ${brl(round2(s.reduce((t, x) => t + Number(x.valor), 0)))}`;
    $("arRepApaga").textContent = s.length ? `Apagar ${plural(s.length, "cópia", "cópias")}` : "Apagar"; $("arRepApaga").disabled = !s.length; $("arRepCopia").disabled = !s.length;
  };
  document.querySelectorAll("#dlgBody [data-k]").forEach((b) => (b.onchange = () => { b.checked ? marcados.add(b.dataset.k) : marcados.delete(b.dataset.k); conta(); }));
  $("arRepCopia").onclick = () => baixaCopiaDeLancamentos(sel(), "lancamentos-em-dobro");
  armDelete($("arRepApaga"), async () => {
    const s = sel(), ids = new Set(s.map((x) => x.id));
    $("arRepApaga").disabled = true;
    const ok = await grava(async () => { for (let i = 0; i < s.length; i += 10) await Promise.all(s.slice(i, i + 10).map((x) => S.store.deleteLancamento(x.id))); });
    if (!ok) { conta(); return; }
    S.data.lancamentos = S.data.lancamentos.filter((x) => !ids.has(x.id));
    render(); arrumarTela(); toast(`${plural(s.length, "cópia apagada", "cópias apagadas")}.`);
  }, "Toque de novo para apagar");
  conta();
}
function arrumarMinhasContas() {
  const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`, nome = S.prefs.meuNome || "", r = entreMinhasContas(S.data.lancamentos, [nome, nomeDoEmail($("whoName").textContent)].filter(Boolean), nomesDoParceiro()), marcados = new Set(r.itens.map((x) => x.id));
  const linha = (x) => `<li><input type="checkbox" data-k="${esc(x.id)}" checked aria-label="${esc(x.descricao)}">
    <span class="oque"><b>${esc(nomeDoLancamento(x.descricao))}</b><span>${ddmm(x.data)} · ${x.tipo === "Receita" ? "entrada" : "gasto"}${x.forma === CARTAO ? " · no cartão" : ""}</span></span>
    <b class="v ${x.tipo === "Receita" ? "pos" : ""}">${x.tipo === "Receita" ? "+ " : ""}${brl(Number(x.valor))}</b></li>`;
  openDlg(`<div class="ext"><h3>Entre as minhas contas</h3>
    <p class="hint" style="margin:0 0 10px;font-size:13px">Quando você passa dinheiro de uma conta sua para outra${casalAtivo() ? ` ou para ${esc(nomeDoOutro())}` : ""}, o app conta uma entrada e um gasto. Isso não é ganho nem gasto de verdade e faz as contas parecerem maiores.</p>
    <form id="arNomeForm" class="dlg-form"><label class="f wide">Seu nome completo, como no banco<input class="in" id="arNome" maxlength="60" autocomplete="off" value="${esc(nome)}" placeholder="Ex.: Maria Souza Lima"></label>
      <button class="btn" type="submit">Procurar</button></form>
    ${r.itens.length ? `<div class="ext-topo"><b id="arSoma"></b></div><ul class="ext-lista">${r.itens.map(linha).join("")}</ul>
      <p class="hint" style="margin:8px 0 0">Se o nome for muito comum, olhe a lista: desmarque o que não é seu. Apagar não dá para desfazer; baixe uma cópia antes se quiser.</p>
      <div class="actions" style="margin-top:12px"><button class="btn" type="button" id="arApaga"></button><button class="btn" type="button" id="arCopia">${ico("baixar")}Baixar cópia</button>${voltaArrumar}</div>`
      : `<div class="empty" style="margin-top:12px">${nome ? "Não achei transferências entre as suas contas." : "Digite o seu nome para o app procurar."}</div><div class="actions" style="margin-top:12px">${voltaArrumar}</div>`}</div>`);
  $("arVolta").onclick = arrumarTela;
  $("arNomeForm").onsubmit = async (e) => { e.preventDefault(); S.prefs.meuNome = $("arNome").value.trim(); await salvaPrefs(); arrumarMinhasContas(); };
  if (!r.itens.length) return;
  const sel = () => r.itens.filter((x) => marcados.has(x.id));
  const conta = () => {
    const s = sel(), soma = (t) => brl(round2(s.filter((x) => x.tipo === t).reduce((q, x) => q + Number(x.valor), 0)));
    $("arSoma").textContent = `${plural(s.length, "marcado", "marcados")} · entradas ${soma("Receita")} · saídas ${soma("Despesa")}`;
    $("arApaga").textContent = s.length ? `Apagar ${plural(s.length, "lançamento", "lançamentos")}` : "Apagar"; $("arApaga").disabled = !s.length; $("arCopia").disabled = !s.length;
  };
  document.querySelectorAll("#dlgBody [data-k]").forEach((b) => (b.onchange = () => { b.checked ? marcados.add(b.dataset.k) : marcados.delete(b.dataset.k); conta(); }));
  $("arCopia").onclick = () => baixaCopiaDeLancamentos(sel(), "transferencias-entre-minhas-contas");
  armDelete($("arApaga"), async () => {
    const s = sel(), ids = new Set(s.map((x) => x.id));
    $("arApaga").disabled = true;
    const ok = await grava(async () => { for (let i = 0; i < s.length; i += 10) await Promise.all(s.slice(i, i + 10).map((x) => S.store.deleteLancamento(x.id))); });
    if (!ok) { conta(); return; }
    S.data.lancamentos = S.data.lancamentos.filter((x) => !ids.has(x.id));
    render(); arrumarTela(); toast(`${plural(s.length, "lançamento apagado", "lançamentos apagados")}.`);
  }, "Toque de novo para apagar");
  conta();
}
/** Cópia em CSV (abre no Excel) dos lançamentos que vão mudar. */
function baixaCopiaDeLancamentos(itens, nome) {
  const cel = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const linhas = [["Data", "Tipo", "Descrição", "Categoria", "Forma", "Valor"], ...itens.map((x) => [x.data, x.tipo, x.descricao, x.categoria, x.forma, String(Number(x.valor).toFixed(2)).replace(".", ",")])];
  baixaArquivo(`${nome}.csv`, new Blob(["﻿" + linhas.map((l) => l.map(cel).join(";")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
}
function arrumarPixComoCartao() {
  const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`, b = pixComoCartao(S.data.lancamentos);
  openDlg(`<div class="ext"><h3>Pix e débito lançados como cartão</h3>
    <p class="hint" style="margin:0 0 10px;font-size:13px">Estes lançamentos vieram do extrato da <b>conta</b> e entraram como compra de cartão. Eles vão para o dia a dia (Pix ou débito), com o nome curto, e saem da fatura.</p>
    ${b.length ? `<ul class="ext-lista">${b.slice(0, 60).map((x) => `<li><span class="oque" style="grid-column:1 / span 2"><b>${esc(x.descricao)} <span class="tag">${esc(x.forma)}</span></b><span>${ddmm(x.de.data)} · antes: ${esc(String(x.de.descricao).slice(0, 70))}${String(x.de.descricao).length > 70 ? "…" : ""}</span></span><b class="v">${brl(Number(x.de.valor))}</b></li>`).join("")}</ul>
      ${b.length > 60 ? `<p class="hint">Mostrando 60 de ${b.length}. Todos serão arrumados.</p>` : ""}
      <div class="actions" style="margin-top:12px"><button class="btn primary" type="button" id="arPixOk">Arrumar ${plural(b.length, "lançamento", "lançamentos")}</button>${voltaArrumar}</div>`
      : `<div class="empty" style="margin-top:12px">Nenhum lançamento nessa situação.</div><div class="actions" style="margin-top:12px">${voltaArrumar}</div>`}</div>`);
  $("arVolta").onclick = arrumarTela;
  if (!$("arPixOk")) return;
  $("arPixOk").onclick = async () => {
    $("arPixOk").disabled = true;
    const ok = await grava(async () => {
      for (let i = 0; i < b.length; i += 10) await Promise.all(b.slice(i, i + 10).map((x) => S.store.updateLancamento(x.id, { forma: x.forma, descricao: x.descricao, cartao_id: null, parcelas: 1 })));
    });
    if (!ok) { $("arPixOk").disabled = false; return; }
    b.forEach((x) => Object.assign(S.data.lancamentos.find((l) => l.id === x.id) || {}, { forma: x.forma, descricao: x.descricao, cartao_id: null, parcelas: 1 }));
    render(); arrumarTela(); toast(`${plural(b.length, "lançamento arrumado", "lançamentos arrumados")}.`);
  };
}
function arrumarOutros() {
  const grupos = gruposEmOutros(S.data.lancamentos), lista = grupos.slice(0, 25);
  const linha = (g, i) => `<li class="ar-grupo"><span class="oque"><b>${esc(g.nome)}</b><span>${g.n} lançamentos · ${g.tipo === "Receita" ? "entradas" : "gastos"} de ${brl(g.total)}</span></span>
    <select class="in" data-g="${i}" aria-label="Categoria de ${esc(g.nome)}"><option value="">Escolher…</option>${cats(g.tipo).filter((c) => c !== "Outros").map((c) => `<option>${esc(c)}</option>`).join("")}</select></li>`;
  openDlg(`<div class="ext"><h3>Categorias em "Outros"</h3>
    <p class="hint" style="margin:0 0 10px;font-size:13px">Estes nomes aparecem várias vezes em "Outros". Escolha a categoria uma vez e o app muda todos os lançamentos do nome. Dá para desfazer logo depois.</p>
    ${lista.length ? `<ul class="ext-lista ar-lista">${lista.map(linha).join("")}</ul>${grupos.length > lista.length ? `<p class="hint">Mostrando os ${lista.length} que mais pesam.</p>` : ""}`
      : `<div class="empty" style="margin-top:12px">Nada repetido em "Outros".</div>`}
    <div class="actions" style="margin-top:12px">${voltaArrumar}</div></div>`);
  $("arVolta").onclick = arrumarTela;
  document.querySelectorAll("#dlgBody [data-g]").forEach((sel) => (sel.onchange = async () => {
    const g = lista[Number(sel.dataset.g)], nova = sel.value; if (!nova) return;
    sel.disabled = true;
    const ok = await grava(async () => { for (let i = 0; i < g.ids.length; i += 10) await Promise.all(g.ids.slice(i, i + 10).map((id) => S.store.updateLancamento(id, { categoria: nova }))); });
    if (!ok) { sel.disabled = false; sel.value = ""; return; }
    const poe = (cat) => g.ids.forEach((id) => Object.assign(S.data.lancamentos.find((l) => l.id === id) || {}, { categoria: cat }));
    poe(nova); render(); arrumarOutros();
    toastAcao(`${g.nome}: ${g.n} lançamentos em ${nova}.`, "Desfazer", async () => {
      if (await grava(async () => { for (const id of g.ids) await S.store.updateLancamento(id, { categoria: "Outros" }); })) { poe("Outros"); render(); }
    }, 9000);
  }));
}
/** Avisa das medalhas novas. Na primeira vez que o app olha, só anota o que já estava ganho (sem festa por coisa antiga). */
function avisaConquistas() {
  if (!S.loaded || $("app").hidden) return;
  const l = dadosDeConquistas(), vistas = S.prefs.conquistas;
  if (!Array.isArray(vistas)) { S.prefs.conquistas = l.filter((x) => x.feita).map((x) => x.id); salvaPrefs(); return; }
  const novas = novasConquistas(l, vistas); if (!novas.length) return;
  S.prefs.conquistas = [...vistas, ...novas.map((x) => x.id)]; salvaPrefs();
  comemora();
  toastAcao(`Conquista nova: ${novas[0].titulo}${novas.length > 1 ? ` e mais ${novas.length - 1}` : ""}`, "Ver", conquistasTela, 9000);
}

/* ---------- Dividir uma compra em categorias ---------- */
function dividirCompra() {
  const total = valorDoCampo();
  if (!(total > 0)) { toast("Digite primeiro o valor total da compra."); return $("fValor").focus(); }
  if (total > VALOR_MAX) { toast(ALTO_DEMAIS); return $("fValor").focus(); }
  const lista = cats("Despesa"), inicial = $("fCat").value;
  let partes = [{ categoria: inicial, valor: "" }, { categoria: lista.find((k) => k !== inicial) || inicial, valor: "" }];
  // Vindo do Mercado: as categorias e os valores já separados (só vale se a soma for o total que está no campo).
  const pronta = S.divisaoPronta; S.divisaoPronta = null;
  if (pronta && round2(pronta.reduce((t, p) => t + p[1], 0)) === round2(total) && pronta.length >= 2) partes = pronta.map(([k, v]) => ({ categoria: lista.includes(k) ? k : inicial, valor: v.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) }));
  const leDom = () => { partes = [...document.querySelectorAll("#dvForm .dv-linha")].map((el) => ({ categoria: el.querySelector("select").value, valor: el.querySelector("input").value })); };
  const confere = () => conferirDivisao(total, partes.map((p) => ({ categoria: p.categoria, valor: parseMoney(p.valor) })));
  const resumo = () => {
    leDom(); const r = confere(), el = $("dvRes");
    el.className = "dv-res " + (r.certo ? "ok" : "falta");
    el.textContent = r.certo ? `Fechou: ${brl(total)} divididos.` : r.falta > 0 ? `Faltam ${brl(r.falta)} para chegar a ${brl(total)}.` : `Passou ${brl(-r.falta)} do total de ${brl(total)}.`;
    $("dvOk").disabled = !r.certo;
  };
  const desenha = () => {
    openDlg(`<h3>Dividir a compra de ${brl(total)}</h3><p class="hint" style="margin:0 0 10px">Ex.: no mercado, parte foi comida e parte limpeza. Escolha a categoria e quanto foi de cada uma. A soma precisa dar ${brl(total)}.</p>
      <form id="dvForm" class="dlg-form" autocomplete="off">${partes.map((p, i) => `<div class="dv-linha"><select class="in" aria-label="Categoria da parte ${i + 1}">${lista.map((k) => `<option${k === p.categoria ? " selected" : ""}>${esc(k)}</option>`).join("")}</select><input class="in money" inputmode="decimal" placeholder="0,00" aria-label="Valor da parte ${i + 1}" value="${esc(p.valor)}"></div>`).join("")}
        <p class="dv-res" id="dvRes" aria-live="polite"></p>
        <div class="actions"><button class="btn primary" type="submit" id="dvOk">Lançar dividido</button>${partes.length < 8 ? `<button class="btn" type="button" id="dvMais">+ Outra categoria</button>` : ""}<button class="btn" type="button" data-close>Cancelar</button></div></form>`);
    $("dvForm").addEventListener("input", resumo);
    if ($("dvMais")) $("dvMais").onclick = () => { leDom(); partes.push({ categoria: lista.find((k) => !partes.some((p) => p.categoria === k)) || inicial, valor: "" }); desenha(); };
    $("dvForm").addEventListener("submit", async (e) => {
      e.preventDefault(); leDom(); const r = confere(); if (!r.certo) return resumo();
      if ((await resolveNovoCartaoForm()) === null) { $("dlg").close(); return; }
      const data = $("fData").value || hoje(), base = { data, descricao: $("fDesc").value.trim(), tipo: "Despesa", forma: formaDe("Despesa", $("fForma").value), import_key: null, ...cartaoDoForm() };
      const rows = r.partes.map((p) => ({ ...base, categoria: p.categoria, valor: p.valor, id: crypto.randomUUID() }));
      $("dvOk").disabled = true;
      let novos = [];
      const ok = await grava(async () => { novos = await S.store.addLancamentos(rows); });
      if (!ok) return;
      for (const n of novos.length ? novos : rows) S.data.lancamentos.push({ ...n, valor: Number(n.valor) });
      $("dlg").close();
      $("fValor").value = ""; $("fDesc").value = ""; $("fParc").value = "1"; S.catManual = false; S.formaManual = false; limpaSugestoes(); renderForm();
      aposLancar(`Lançado em ${rows.length} categorias: ${brl(total)} em ${ddmm(data)}.`); if (S.listaFinalizando) concluiLista(); render();
    });
    resumo();
  };
  desenha();
}
$("fDividirBtn").onclick = dividirCompra;

/* ---------- Cópia de segurança ---------- */
function copiaDeSeguranca() {
  const real = S.store?.kind === "supabase";
  const ult = S.prefs.ultimaCopia, diasCopia = ult ? Math.max(0, Math.round((new Date(hoje()) - new Date(ult)) / 86400000)) : null;
  const quando = ult ? (diasCopia === 0 ? "Última cópia baixada: hoje." : `Última cópia baixada: há ${diasCopia} ${diasCopia === 1 ? "dia" : "dias"}${diasCopia > 30 ? ". Vale baixar uma nova" : ""}.`) : "Você ainda não baixou nenhuma cópia neste aparelho.";
  openDlg(`<h3>Cópia de segurança</h3><p class="hint" style="margin:0 0 6px">Um arquivo com tudo o que você tem aqui. Guarde no seu celular, no computador ou no e-mail. Se algo se perder, dá para trazer de volta.</p><p class="hint" style="margin:0 0 12px"><b>${quando}</b></p>
    <div class="caixa-mais">${opFerr("cpBaixar", "baixar", "Baixar a cópia", "Lançamentos, contas fixas, cartões, faturas e ajustes")}
      ${real ? opFerr("cpRest", "subir", "Restaurar de um arquivo", "Traz de volta só o que está faltando. Nada é apagado nem repetido") : ""}</div>
    ${real ? "" : `<p class="hint">Restaurar só funciona na sua conta. Na demonstração, os dados ficam só neste aparelho.</p>`}
    <div class="actions"><button class="btn" type="button" data-close>Fechar</button></div>`);
  $("cpBaixar").onclick = () => {
    const b = montaBackup(S.data, S.prefs, APP_VERSAO, new Date().toISOString());
    baixaArquivo(`meus-gastos-copia-${hoje()}.json`, new Blob([JSON.stringify(b)], { type: "application/json" }));
    S.prefs.ultimaCopia = hoje(); salvaPrefs();
    toast("Cópia baixada. Guarde o arquivo num lugar seguro.");
  };
  if (real) $("cpRest").onclick = () => {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".json,application/json";
    inp.onchange = async () => { const f = inp.files[0]; if (f) restauraCopia(f); };
    inp.click();
  };
}
async function restauraCopia(arquivo) {
  const fecha = `<button class="btn" type="button" data-close>Fechar</button>`;
  if (arquivo.size > 30e6) return openDlg(`<h3>Arquivo grande demais</h3><p class="hint">Esse arquivo não parece ser uma cópia do Meus Gastos.</p><div class="actions">${fecha}</div>`);
  const texto = await arquivo.text(), lido = leBackup(texto);
  if (!lido.ok) return openDlg(`<h3>Não deu para ler</h3><p class="hint">${esc(lido.erro)}</p><div class="actions">${fecha}</div>`);
  let prefsGuardadas = {}; try { prefsGuardadas = JSON.parse(texto).prefs || {}; } catch { /* sem ajustes no arquivo */ }
  const falta = faltaRestaurar(lido.dados, S.data, S.prefs.chavesLigadas || []), ajustes = ajustesRestauraveis(prefsGuardadas, S.prefs);
  const n = (k) => falta[k].length, tot = n("cartoes") + n("fixos") + n("lancamentos") + n("faturas") + n("pagos"), nAj = Object.keys(ajustes).length;
  if (!tot && !nAj) return openDlg(`<h3>Está tudo aqui</h3><p class="hint">Tudo o que está nesse arquivo${lido.criadoEm ? ` (de ${ddmmaaaa(lido.criadoEm)})` : ""} já existe na sua conta. Nada a restaurar.</p><div class="actions">${fecha}</div>`);
  const li = (q, s, p) => (q ? `<li><b>${q}</b> ${q === 1 ? s : p}</li>` : "");
  openDlg(`<h3>Restaurar a cópia${lido.criadoEm ? ` de ${ddmmaaaa(lido.criadoEm)}` : ""}?</h3>
    <p class="hint" style="margin:0 0 6px">Vai voltar só o que está no arquivo e não está na sua conta:</p>
    <ul class="casal-pontos">${li(n("lancamentos"), "lançamento", "lançamentos")}${li(n("fixos"), "conta ou entrada fixa", "contas e entradas fixas")}${li(n("cartoes"), "cartão", "cartões")}${li(n("faturas"), "fatura", "faturas")}${li(n("pagos"), "marcação de pago", "marcações de pago")}${nAj ? `<li><b>${nAj}</b> ${nAj === 1 ? "ajuste" : "ajustes"} (categorias, limites, metas) que você ainda não tem</li>` : ""}</ul>
    ${lido.descartados ? `<p class="hint">${lido.descartados} ${lido.descartados === 1 ? "item do arquivo foi ignorado" : "itens do arquivo foram ignorados"} por estarem incompletos.</p>` : ""}
    <p class="hint">O que já existe não muda e nada é apagado.</p><p class="auth-msg err" id="rsMsg" role="alert"></p>
    <div class="actions"><button class="btn primary" type="button" id="rsSim" style="margin-left:0">Restaurar</button><button class="btn" type="button" data-close>Cancelar</button></div>`);
  $("rsSim").onclick = async () => {
    $("rsSim").disabled = true; let falhas = 0, feitos = 0;
    const tenta = async (fn) => { try { await fn(); feitos++; } catch { falhas++; } };
    for (const x of falta.cartoes) await tenta(async () => { const r = await S.store.addCartao(x); S.data.cartoes.push(r); });
    for (const x of falta.fixos) await tenta(async () => { const r = await S.store.addFixo(x); S.data.fixos.push(r); });
    for (let i = 0; i < falta.lancamentos.length; i += 200) {
      const lote = falta.lancamentos.slice(i, i + 200);
      try { const novos = await S.store.addLancamentos(lote); S.data.lancamentos.push(...novos.map((z) => ({ ...z, valor: Number(z.valor) }))); feitos += lote.length; }
      catch { for (const x of lote) await tenta(async () => { const [r] = await S.store.addLancamentos([x]); if (r) S.data.lancamentos.push({ ...r, valor: Number(r.valor) }); }); }
    }
    for (const x of falta.faturas) await tenta(async () => { const r = await S.store.addFatura(x); S.data.faturas.push(r); });
    for (const x of falta.pagos) await tenta(async () => { await S.store.setPago(x.fixo_id, x.mes, true); S.data.pagos.push({ fixo_id: x.fixo_id, mes: x.mes }); });
    if (nAj) { Object.assign(S.prefs, ajustes); await salvaPrefs(); }
    render();
    openDlg(`<h3>${falhas ? "Restaurei quase tudo" : "Pronto!"}</h3><p class="hint">${feitos} ${feitos === 1 ? "item voltou" : "itens voltaram"} para a sua conta.${falhas ? ` ${falhas} não ${falhas === 1 ? "pôde ser restaurado" : "puderam ser restaurados"}. Tente de novo mais tarde: o que já voltou não se repete.` : ""}</p><div class="actions">${fecha}</div>`);
  };
}

/* ---------- Tour da primeira vez ---------- */
const TOUR = [
  ["plus", "Lance em segundos", "Toque no + para anotar um gasto. Dá para digitar, falar, ler um comprovante pela câmera, ler um QR code ou colar a mensagem do banco. No Android, com o app instalado, também dá para compartilhar o comprovante do banco direto para cá."],
  ["saldo", "Veja quanto sobra", "O número grande do início é quanto sobra no mês, já descontando contas fixas e faturas. A cor diz se está tudo bem: verde, laranja ou vermelho."],
  ["cofre", "Guarde para o que importa", "Crie uma caixinha com uma meta e o app calcula quanto guardar por mês. Se quiser um empurrão, tem o desafio de economia."],
];
/** Primeiro ensinamento da demonstração: o que a pessoa está vendo e o que fazer primeiro. O último passo leva a criar a conta. */
const TOUR_DEMO = [
  ["pessoa", "Este é um mês de exemplo", "Tudo aqui é de mentira e fica só neste aparelho, então pode mexer à vontade. Para voltar ao começo, toque em Recomeçar, no aviso do topo."],
  ["saldo", "Veja quanto sobra", "O número grande é quanto ainda dá para gastar no mês, depois das contas fixas e das faturas. Ao lado dele aparece quanto dá por dia."],
  ["mais", "Lance um gasto em segundos", "Toque em Lançar gasto, ou em Por voz para falar. Anote um café e veja o número do início mudar na hora."],
  ["calc", "Veja o que vem pela frente", "Mais abaixo, em Próximos vencimentos, ficam as contas e as faturas com a data. Em Planejar estão os limites e as metas, e em Mais, as ferramentas e a busca."],
  ["cofre", "Gostou? Use com os seus dados", "Crie a sua conta e comece com o mês em branco: o app guia os primeiros passos. Se preferir, continue explorando a demonstração.", ["Criar minha conta", () => contaAPartirDaDemo()]],
];
function tourInicial(depois, passos = TOUR) {
  S.prefs.tourVisto = true; salvaPrefs();
  const TOUR = passos;
  let i = 0, fim = false;
  const fechou = () => { if (fim) return; fim = true; $("dlg").removeEventListener("close", fechou); depois?.(); };
  const passo = () => {
    const [icone, titulo, texto] = TOUR[i], ultimo = i === TOUR.length - 1;
    openDlg(`<div class="tour"><span class="tour-ic">${ico(icone === "plus" ? "mais" : icone)}</span><p class="guia-etapa">${i + 1} de ${TOUR.length}</p><h3>${titulo}</h3><p class="tour-tx">${texto}</p>
      <div class="tour-pts" aria-hidden="true">${TOUR.map((_, k) => `<i class="${k === i ? "on" : ""}"></i>`).join("")}</div>
      <div class="actions">${i ? `<button class="btn" type="button" id="tVolta">Voltar</button>` : `<button class="btn" type="button" data-close>Pular</button>`}${ultimo && TOUR[i][3] ? `<button class="btn" type="button" id="tExtra">${TOUR[i][3][0]}</button>` : ""}<button class="btn primary" type="button" id="tProx">${ultimo ? (passos === TOUR_DEMO ? "Continuar explorando" : "Começar") : "Próximo"}</button></div></div>`);
    if ($("tVolta")) $("tVolta").onclick = () => { i--; passo(); };
    if ($("tExtra")) $("tExtra").onclick = () => { const f = TOUR[i][3][1]; $("dlg").close(); f(); };
    $("tProx").onclick = () => { if (ultimo) $("dlg").close(); else { i++; passo(); } };
  };
  passo();
  $("dlg").addEventListener("close", fechou);
}

/* ================= gráfico da sobra dia a dia (como nos apps de investimento) =================
   A linha cheia é quanto restava da sobra no fim de cada dia; a tracejada clara é o ritmo ideal (gastar por igual até o dia 31);
   a tracejada colorida, a partir de hoje, é a previsão de onde o mês termina. */
function graficoDaSobra(c) {
  const g = sobraDiaADia(c), W = 340, H = 132, top = 10, bot = 18;
  const vals = [g.livre, 0, ...g.pontos.map((p) => p.resta), ...(g.fim ? [g.fim.resta] : [])], max = Math.max(...vals), min = Math.min(...vals), faixa = max - min || 1;
  const X = (d) => ((d / g.n) * W).toFixed(1), Y = (v) => (top + ((max - v) / faixa) * (H - top - bot)).toFixed(1);
  const ult = g.pontos.at(-1), linha = g.pontos.map((p) => `${X(p.d)},${Y(p.resta)}`).join(" ");
  const area = `${X(0)},${Y(min)} ${linha} ${X(ult.d)},${Y(min)}`;
  const ruim = (g.fim ? g.fim.resta : ult.resta) < 0, cor = ruim ? "var(--bad)" : "var(--good)";
  return `<button type="button" class="graf-sobra ocultavel" id="grafSobra" aria-label="Sua sobra no mês: hoje restam ${brl(ult.resta)}${g.fim ? `; a previsão é terminar com ${brl(g.fim.resta)}` : ""}. Abrir O que sobra">
    <span class="gs-h"><b>Sua sobra no mês</b><span>${c.fase === "atual" ? "hoje" : "no fim"} ${ult.resta < 0 ? "faltam " : ""}<b class="${ult.resta < 0 ? "txt-bad" : ""}">${brl0(Math.abs(ult.resta))}</b></span></span>
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
      <line x1="0" x2="${W}" y1="${Y(0)}" y2="${Y(0)}" class="gs-zero"/>
      <line x1="${X(0)}" y1="${Y(g.livre)}" x2="${X(g.n)}" y2="${Y(0)}" class="gs-ideal"/>
      <polygon points="${area}" style="fill:${cor};opacity:.12"/>
      <polyline points="${linha}" style="fill:none;stroke:${cor};stroke-width:2.5;stroke-linejoin:round;stroke-linecap:round"/>
      ${g.fim ? `<line x1="${X(ult.d)}" y1="${Y(ult.resta)}" x2="${X(g.fim.d)}" y2="${Y(g.fim.resta)}" style="stroke:${cor};stroke-width:2;stroke-dasharray:5 5"/>` : ""}
      <circle cx="${X(ult.d)}" cy="${Y(ult.resta)}" r="4.5" style="fill:${cor};stroke:var(--surface);stroke-width:2"/>
    </svg>
    <span class="gs-leg"><span><i class="l1" style="background:${cor}"></i>sobra</span><span><i class="l2"></i>ritmo ideal</span>${g.fim ? `<span class="gs-fim">fim do mês: <b class="${ruim ? "txt-bad" : ""}">${g.fim.resta < 0 ? "− " : ""}${brl0(Math.abs(g.fim.resta))}</b></span>` : ""}</span>
  </button>`;
}
$("grafSobraSec").addEventListener("click", (e) => { if (e.target.closest("#grafSobra")) { S.view = "listas"; S.tab = "m"; render(); scrollTo(0, 0); } });

/* ================= fotos: capas das caixinhas e das contas fixas =================
   A foto é reduzida no aparelho (quadrada, 320 px, JPEG) e guardada nas preferências, que na conta de casal valem para os dois.
   A chave é o nome (sem acento e caixa): a foto continua quando a conta muda de valor e vira uma versão nova. */
const chaveFoto = (tipo, nome) => `${tipo}:${norm(nome)}`;
// Só vale imagem guardada pelo próprio app (JPEG/PNG/WebP em base64). As fotos são divididas na conta de casal,
// então qualquer outra coisa é ignorada: um texto estranho ali entraria no HTML da tela do outro.
const FOTO_OK = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const fotoDe = (tipo, nome) => { const f = S.prefs.fotos?.[chaveFoto(tipo, nome)]; return typeof f === "string" && FOTO_OK.test(f) ? f : ""; };
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

/* ================= comprovante: a foto do recibo junto do lançamento =================
   Nada é guardado sem a pessoa dizer que sim: depois de lançar pela foto ou pelo PDF, o app pergunta.
   A imagem é reduzida no próprio aparelho (lado maior de 1200 px, JPEG) e vai para um balde privado
   do Supabase; o lançamento guarda só o caminho do arquivo (supabase/comprovante.sql).
   Para ver, o app pede um endereço assinado que vale uma hora — o balde não é aberto a ninguém. */
const temComprovante = (x) => Boolean(x?.comprovante);
const lancPorId = (id) => S.data.lancamentos.find((z) => z.id === id);
/** Marca de clipe nas listas: este lançamento tem comprovante guardado. */
const marcaComprovante = (x) => (temComprovante(x) ? `<span class="clipe" title="Tem comprovante guardado">${ico("clipe")}</span>` : "");
/** Apaga o lançamento e, junto, o comprovante dele. Usado em todos os lugares que excluem um lançamento. */
async function apagaLancamento(id, guardaArquivo = false) {
  if (envios.has(id) && !(await envios.get(id))) return true;   // o envio falhou: o lançamento já saiu da tela e nunca chegou ao banco
  const comp = lancPorId(id)?.comprovante;
  if (!(await grava(() => S.store.deleteLancamento(id)))) return false;
  S.data.lancamentos = S.data.lancamentos.filter((z) => z.id !== id);
  // Se o arquivo não for apagado, fica solto no balde: a consulta que acha os soltos está em supabase/comprovante.sql.
  // Com "Desfazer" no ar (guardaArquivo), o arquivo só sai depois que o prazo de desfazer passa; quem chama cuida disso.
  if (comp && !guardaArquivo) Promise.resolve(S.store.apagaComprovante?.(comp)).catch(() => { /* nada */ });
  return true;
}
/** Reduz a imagem (arquivo ou endereço de imagem) e devolve o JPEG pronto para mandar. */
async function jpegDoComprovante(fonte) {
  const img = typeof fonte === "string"
    ? await new Promise((pronto, nao) => { const i = new Image(); i.onload = () => pronto(i); i.onerror = () => nao(new Error("sem-imagem")); i.src = fonte; })
    : await createImageBitmap(fonte);
  const maior = Math.max(img.width, img.height), f = maior > 1200 ? 1200 / maior : 1;
  const cv = document.createElement("canvas");
  cv.width = Math.max(1, Math.round(img.width * f)); cv.height = Math.max(1, Math.round(img.height * f));
  cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
  const blob = await new Promise((pronto) => cv.toBlob(pronto, "image/jpeg", 0.75));
  if (!blob) throw new Error("sem-imagem");
  return blob;
}
/** Manda a imagem e anota o caminho no lançamento. Devolve se deu certo. */
async function salvaComprovante(lanc, blob, avisa = toast) {
  try {
    const antigo = lanc.comprovante, caminho = await S.store.guardaComprovante(lanc.id, blob);
    await S.store.updateLancamento(lanc.id, { comprovante: caminho });
    lanc.comprovante = caminho;
    // Trocou a foto e a nova ficou em outro lugar (foi a outra pessoa da conta de casal que trocou): a antiga não fica solta.
    if (antigo && antigo !== caminho) Promise.resolve(S.store.apagaComprovante(antigo)).catch(() => { /* nada */ });
    return true;
  } catch (e) {
    console.error(e);
    avisa(semRede(e)
      ? "Sem internet agora. O lançamento está salvo; guarde o comprovante depois, abrindo o lançamento."
      : "Não deu para guardar o comprovante. O lançamento está salvo — tente de novo abrindo o lançamento.");
    return false;
  }
}
/** A pergunta, depois de lançar pela leitura: guardar aquele comprovante ou não. */
function pedeComprovante(lanc, blob, depois) {
  const url = URL.createObjectURL(blob);
  openDlg(`<h3>Guardar esse comprovante?</h3>
    <p class="hint" style="margin:0 0 12px;font-size:14px"><b>${esc(lanc.descricao || lanc.categoria)} · ${brl(lanc.valor)}</b> já está lançado. Quer guardar a foto junto, para consultar depois? Ela fica no lançamento, e só você${S.casal?.situacao === "ativo" ? " e quem divide as contas com você" : ""} pode ver.</p>
    <div class="comp-foto"><img src="${url}" alt="Comprovante lido"></div>
    <p class="auth-msg err" id="compMsg"></p>
    <div class="actions"><button class="btn primary" type="button" id="compSim">Guardar comprovante</button><button class="btn" type="button" id="compNao">Não guardar</button></div>`);
  // O aviso de "lançado" sai uma vez só, de qualquer jeito que o quadro feche (Não guardar, Fechar, Voltar do celular),
  // e com o comprovante citado quando ele foi guardado.
  let guardou = false;
  $("dlg").addEventListener("close", () => {
    URL.revokeObjectURL(url);
    setTimeout(() => (depois ? depois(guardou ? " Comprovante guardado junto." : "") : guardou && toast("Comprovante guardado no lançamento.")), 0);
  }, { once: true });
  $("compNao").onclick = () => $("dlg").close();
  $("compSim").onclick = async () => {
    $("compSim").disabled = true; $("compMsg").textContent = "";
    const deu = await salvaComprovante(lanc, blob, (t) => { $("compMsg").textContent = t; });
    if (!deu) { $("compSim").disabled = false; return; }
    guardou = true; render(); $("dlg").close();
  };
}
/** Anexar um comprovante a um lançamento que já existe: a pessoa já pediu, então salva direto. */
function anexaComprovante(lanc, depois) {
  const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*";
  inp.onchange = async () => {
    const arq = inp.files?.[0]; if (!arq) return;
    let blob;
    try { blob = await jpegDoComprovante(arq); } catch { return toast("Não deu para abrir essa imagem. Tente outra."); }
    toast("Guardando o comprovante…");
    if (await salvaComprovante(lanc, blob)) { render(); toast("Comprovante guardado no lançamento."); }
    depois?.();
  };
  inp.click();
}
/** Mostra o comprovante guardado, com a opção de remover. */
async function verComprovante(lanc, depois) {
  openDlg(`<h3>Comprovante</h3><p class="hint" style="margin:0">Abrindo…</p>`);
  let url = "";
  try { url = await S.store.linkComprovante(lanc.comprovante); } catch (e) { console.error(e); }
  if (!url) {
    return openDlg(`<h3>Comprovante</h3>
      <p style="color:var(--ink-2);margin:0 0 14px">${navigator.onLine === false ? "Sem internet agora: a foto está guardada online. Tente de novo quando a conexão voltar." : "Não consegui abrir essa foto agora. Tente de novo em instantes."}</p>
      <div class="actions"><button class="btn primary" type="button" data-close>Fechar</button></div>`);
  }
  // Na demonstração a foto vem como texto (data:), que o navegador não abre em outra aba: vira um endereço de arquivo.
  if (url.startsWith("data:")) {
    try { url = URL.createObjectURL(await (await fetch(url)).blob()); const u = url; $("dlg").addEventListener("close", () => URL.revokeObjectURL(u), { once: true }); } catch { /* fica o data: */ }
  }
  openDlg(`<h3>Comprovante</h3>
    <p class="hint" style="margin:0 0 10px;font-size:13.5px">${esc(lanc.descricao || lanc.categoria)} · ${brl(lanc.valor)} em ${ddmm(lanc.data)}</p>
    <div class="comp-foto grande"><img src="${esc(url)}" alt="Comprovante do lançamento"></div>
    <div class="actions"><a class="btn" href="${esc(url)}" target="_blank" rel="noopener">Abrir a foto inteira</a><button class="btn" type="button" id="compTroca">Trocar a foto</button><button class="btn perigo" type="button" id="compTira">${ico("lixo")}Remover</button><button class="btn primary" type="button" data-close>Fechar</button></div>`);
  $("compTroca").onclick = () => anexaComprovante(lanc, () => depois?.());
  armDelete($("compTira"), async () => {
    const caminho = lanc.comprovante;
    try {
      await S.store.updateLancamento(lanc.id, { comprovante: null });
      lanc.comprovante = null;
      try { await S.store.apagaComprovante(caminho); } catch { /* o arquivo fica solto, mas o lançamento já não aponta para ele */ }
      $("dlg").close(); render(); toast("Comprovante removido.");
      depois?.();
    } catch (e) { console.error(e); toast("Não deu para remover agora. Confira a internet e tente de novo."); }
  });
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
    <p class="hint" style="margin:0 0 8px;font-size:13px">Dinheiro separado para um objetivo, como viagem ou reserva.</p>
    <div class="caixas-grid">${nomes.map(card).join("")}
      <button type="button" class="caixa nova" data-caixa-nova="1"><span class="capa"><b>+</b></span><span class="info"><b class="nome">Nova caixinha</b><small>viagem, carro, reserva…</small></span></button></div></section>`;
}
function abrirCaixa(nome) {
  const v = (guardadoPorDestino(S.data, mKey(hoje())).find(([k]) => k === nome) || [0, 0])[1], foto = fotoDe("dest", nome);
  const guardar = (mov) => { $("dlg").close(); S.tipo = "Reserva"; renderForm(); $("fCat").value = nome; $("fForma").value = mov; S.catManual = true; renderForm(); mostraEfeito();
    setTimeout(() => { if (noCelular()) abrirLancar(); else { $("fValor").scrollIntoView({ block: "center" }); $("fValor").focus(); } }, 200); };
  openDlg(`<div class="caixa-capa${foto ? " com" : ""}" style="${foto ? `background-image:url('${foto}')` : ""}"><h3>${esc(nome)}</h3></div>
    <p class="caixa-valor ocultavel">${brl(v)}</p><p class="hint" style="margin:0 0 12px">guardados nesta caixinha</p>
    <div class="caixa-acoes"><button class="btn primary" type="button" id="cxGuardar">Guardar</button><button class="btn" type="button" id="cxRetirar">Retirar</button></div>
    <button class="link" type="button" id="cxJaTinha" style="margin:-4px 0 12px">Já tinha dinheiro aqui? Informe o valor</button>
    <div class="caixa-mais">
      <button class="mais-item" type="button" id="cxMeta"><span class="tx"><b>${metasDe()[nome] ? "Ver e mudar a meta" : "Criar uma meta"}</b><span>quanto quer juntar e até quando</span></span>${ico("chev")}</button>
      <button class="mais-item" type="button" id="cxFoto"><span class="tx"><b>${foto ? "Trocar a foto" : "Colocar uma foto"}</b><span>a capa da caixinha, como nos bancos</span></span>${ico("chev")}</button>
      ${foto ? `<button class="mais-item" type="button" id="cxSemFoto"><span class="tx"><b>Tirar a foto</b></span>${ico("chev")}</button>` : ""}
      ${metasDe()[nome] ? `<button class="mais-item perigo" type="button" id="cxSemMeta"><span class="tx"><b>Excluir a meta</b><span>o dinheiro guardado continua aqui</span></span>${ico("lixo")}</button>` : ""}
    </div>
    <div class="actions"><button class="btn" type="button" data-close>Fechar</button></div>`);
  $("cxGuardar").onclick = () => guardar("Guardar"); $("cxRetirar").onclick = () => guardar("Retirar"); $("cxJaTinha").onclick = () => guardar("Já tinha guardado");
  $("cxMeta").onclick = () => detalheMeta(nome);
  $("cxFoto").onclick = () => trocaFoto("dest", nome, () => abrirCaixa(nome));
  if ($("cxSemFoto")) $("cxSemFoto").onclick = () => tiraFoto("dest", nome, () => abrirCaixa(nome));
  if ($("cxSemMeta")) armDelete($("cxSemMeta"), () => excluiMeta(nome), "Toque de novo para excluir a meta");
}
$("pane-m").addEventListener("click", (e) => {
  const b = e.target.closest("[data-caixa]"); if (b) return abrirCaixa(b.dataset.caixa);
  if (e.target.closest("[data-caixa-nova]")) novaCaixinha();
});

/* ================= esconder os valores e ações rápidas do início =================
   O olho do topo esconde os valores (fica guardado neste aparelho), para abrir o app em público sem mostrar quanto tem. */
const valoresOcultos = () => { try { return localStorage.getItem("cg-ocultar") === "1"; } catch { return false; } };
function ocultaValores(sim) { try { sim ? localStorage.setItem("cg-ocultar", "1") : localStorage.removeItem("cg-ocultar"); } catch { /* vale só agora */ } document.body.classList.toggle("ocultar", sim); }
document.body.classList.toggle("ocultar", valoresOcultos());
/** "Escanear e importar": tudo o que traz gastos de fora, num lugar só. */
function escanearEImportar() {
  const op = (id, icone, t, s) => `<button class="mais-item" type="button" id="${id}"><span class="ic-box">${ico(icone)}</span><span class="tx"><b>${t}</b><span>${s}</span></span>${ico("chev")}</button>`;
  openDlg(`<h3>Ler comprovante e exportar</h3><p class="hint" style="margin:0 0 12px">O app lê no próprio aparelho e mostra tudo para você conferir antes de lançar.</p>
    <div class="caixa-mais">${IMPORTA_EXTRATO ? op("esExtrato", "subir", "Importar extrato do banco", "Fatura do cartão ou extrato da conta. O app descobre qual é.") : ""}
      ${op("esQr", "camera", "Ler com a câmera", "QR code, boleto, nota fiscal, comprovante ou fatura")}
      ${op("esMsg", "clipe", "Colar mensagem do banco", "a notificação ou o SMS de uma compra, Pix ou pagamento")}</div>
    <h4 class="ferr-h" style="margin:16px 0 6px">Exportar</h4>
    <div class="caixa-mais">${op("esExpMes", "baixar", "Extrato do mês", `${nomeMes(S.mes)} de ${S.mes.slice(0, 4)}, em Excel, PDF ou CSV`)}
      ${op("esExpCartao", "baixar", "Cartão", "A fatura do mês ou todas as compras, em Excel, PDF ou CSV")}</div>
    <div class="actions"><button class="btn" type="button" data-close>Fechar</button></div>`);
  $("esQr").onclick = () => { $("dlg").close(); setTimeout(() => { abrirLancar(); abrirQr(); }, 200); };
  if ($("esExtrato")) $("esExtrato").onclick = () => { $("dlg").close(); setTimeout(() => abrirExtrato(), 200); };
  $("esMsg").onclick = () => colarMensagem();
  $("esExpMes").onclick = () => exportarExtratoMes(escanearEImportar);
  $("esExpCartao").onclick = () => exportarCartao("", "fatura", escanearEImportar);
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
  g.font = fonte(700, 64); g.fillText(`${nomeMes(m)[0].toUpperCase() + nomeMes(m).slice(1)} de ${m.slice(0, 4)}${c.fase === "atual" ? " (até hoje)" : ""}`, 90, 240);
  g.font = fonte(600, 52); g.globalAlpha = 0.92; g.fillText(sobra >= 0 ? "Sobrou" : "Faltou", 90, 360); g.globalAlpha = 1;
  g.font = fonte(800, semValores ? 170 : 150);
  g.fillText(semValores ? pct(Math.abs(sobra)) : brl0(Math.abs(sobra)), 84, 510);
  if (semValores) { g.font = fonte(500, 40); g.globalAlpha = 0.9; g.fillText("do que entrou no mês", 90, 575); g.globalAlpha = 1; }
  // Entrou, custo e guardado
  const linhas = [["Entrou", semValores ? "100%" : brl0(c.rec)], ["Gasto do mês", val(c.custo)], ...(c.res > 0 ? [["Guardado", val(c.res)]] : [])];
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
const escuta = criaEscuta({
  Reconhecedor,
  aoMudar: (m) => {
    if (m.texto) $("vozTexto").textContent = `“${m.texto}”`;
    else if (m.dica) $("vozTexto").textContent = "Ainda não ouvi nada. Se o microfone não responder, toque em Parar e digite o gasto.";
  },
  // Sempre chamada uma vez por escuta, mesmo quando o navegador não avisa que acabou (ver js/escuta.js).
  aoFinalizar: (r) => {
    $("vozPainel").hidden = true; $("btnVoz").classList.remove("ativo"); $("btnVoz").querySelector("span").textContent = "Falar";
    if (r.motivo === "cancelado") return;   // a pessoa saiu da tela: não mexe no formulário
    if (r.texto) return aplicaFala(r.texto);
    const msg = mensagemDeErro(r);
    $("flash").style.color = "var(--warn)"; $("flash").textContent = msg; if (noCelular()) toast(msg);
  },
});
$("btnVoz").hidden = !Reconhecedor;
$("btnVoz").onclick = () => (escuta.ativa ? escuta.parar() : ouvirGasto());
$("vozParar").onclick = () => escuta.parar();
// Sair do app (ou da tela) fecha o microfone: a escuta não fica ligada em segundo plano.
// Com 3 segundos de tolerância: alguns celulares mostram uma tela de voz por cima do app, e isso não pode cortar a fala.
let vozEmSegundoPlano = null;
document.addEventListener("visibilitychange", () => {
  clearTimeout(vozEmSegundoPlano);
  if (document.visibilityState === "hidden" && escuta.ativa) vozEmSegundoPlano = setTimeout(() => escuta.cancelar(), 3000);
});
addEventListener("pagehide", () => escuta.cancelar());
function ouvirGasto() {
  if (!Reconhecedor) return toast("Este navegador não entende fala. No Android, use o Chrome; no iPhone, o Safari.");
  if (escuta.ativa) return;
  $("vozPainel").hidden = false; $("vozTitulo").textContent = "Ouvindo…"; $("vozTexto").textContent = "Fale o gasto, por exemplo: “gastei 32 no mercado no débito”.";
  $("btnVoz").classList.add("ativo"); $("btnVoz").querySelector("span").textContent = "Parar";
  escuta.iniciar();   // se não abrir, o aoFinalizar já limpa a tela e dá a mensagem
}
/** Preenche o formulário com o que foi entendido da fala e diz o que entendeu. */
function aplicaFala(txt) { return aplicaEntendido(entendeFala(txt, hoje()), txt, "fala"); }
/** Preenche o formulário com o que foi entendido (da fala ou da mensagem do banco) e diz o que entendeu. */
function aplicaEntendido(f, txt, fonte = "fala") {
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
  if (!f.valor) { flash.style.color = "var(--warn)"; flash.textContent = fonte === "mensagem" ? "Li a mensagem, mas não achei o valor. Digite o valor e confira o resto." : `Ouvi “${txt}”, mas não entendi o valor. Digite o valor e confira o resto.`; $("fValor").focus(); return; }
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
/**
 * Valor muito acima do costume: pergunta antes de lançar. Quando parece faltar a vírgula (3890 em vez de 38,90),
 * oferece o valor corrigido num toque. Responde "lancar", o valor corrigido (número) ou "voltar".
 */
function confirmaValorAlto(v, fora, cat) {
  return new Promise((responde) => {
    let resp = "voltar";
    const comp = fora.maior > 0 ? ` O maior gasto em ${esc(cat)} nos últimos meses foi de ${brl(fora.maior)}.` : "";
    openDlg(`<h3>Confira o valor</h3>
      <p class="hint" style="margin:0 0 12px;font-size:14px">Você digitou <b>${brl(v)}</b>.${comp}${fora.sugestao !== null ? ` Quis dizer <b>${brl(fora.sugestao)}</b>?` : " Está certo?"}</p>
      <div class="actions">${fora.sugestao !== null ? `<button class="btn primary" type="button" id="vaCorrige">Era ${brl(fora.sugestao)}</button>` : ""}
        <button class="btn${fora.sugestao !== null ? "" : " primary"}" type="button" id="vaSim">Está certo, lançar ${brl(v)}</button>
        <button class="btn" type="button" id="vaVolta">Corrigir</button></div>`);
    if ($("vaCorrige")) $("vaCorrige").onclick = () => { resp = fora.sugestao; $("dlg").close(); };
    $("vaSim").onclick = () => { resp = "lancar"; $("dlg").close(); };
    $("vaVolta").onclick = () => { resp = "voltar"; $("dlg").close(); };
    $("dlg").addEventListener("close", () => responde(resp), { once: true });
    ($("vaCorrige") || $("vaVolta")).focus();
  });
}
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
      } else await apagaLancamento(x.id);
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
  const flash = $("flash"); normalizaConta(); let v = parseMoney($("fValor").value);
  if (avisoValor(v)) { flash.style.color = "var(--bad)"; flash.textContent = avisoValor(v); $("fValor").focus(); return; }
  // Data com ano digitado errado (ex.: 2062 em vez de 2026): o lançamento sumiria para um mês que ninguém olha.
  const dtForm = $("fData").value || hoje(), anoForm = Number(dtForm.slice(0, 4)), anoHoje = Number(hoje().slice(0, 4));
  if (anoForm > anoHoje + 2 || anoForm < anoHoje - 10) { flash.style.color = "var(--bad)"; flash.textContent = `A data ${ddmm(dtForm)}/${dtForm.slice(0, 4)} parece errada (ano ${anoForm}). Confira o ano.`; $("fData").hidden = false; $("fData").focus(); return; }
  // Valor muito acima do costume (ex.: 3890 em vez de 38,90): confere antes de lançar.
  const fora = valorForaDoComum(S.data.lancamentos, { tipo: S.tipo, valor: round2(v), categoria: $("fCat").value }, hoje(), $("fValor").value);
  if (fora) {
    const r = await confirmaValorAlto(round2(v), fora, $("fCat").value);
    if (r === "voltar") return $("fValor").focus();
    if (typeof r === "number") { v = r; $("fValor").value = r.toLocaleString("pt-BR", { minimumFractionDigits: 2 }); mostraEfeito(); }
  }
  const extraCartao = await resolveNovoCartaoForm(); if (extraCartao === null) return;
  const data = $("fData").value || hoje();
  if (S.tipo !== "Reserva" && $("fFixo").checked) {
    // Vira um fixo: conta em todo mês a partir do mês da data, no mesmo dia.
    const dia = Number(data.slice(8, 10)), ent = S.tipo === "Receita", sem = $("fRepete").value === "semanal", wd = diaDaSemana(data);
    const fx = { tipo: S.tipo, descricao: $("fDesc").value.trim() || $("fCat").value, categoria: $("fCat").value, dia: sem ? 1 : dia, valor: round2(v),
      forma: ent ? "" : $("fForma").value, desde: sem ? data : mKey(data) + "-01", ate: $("fAte").value ? $("fAte").value + "-01" : null, ...(sem ? { repete: "semanal", dia_semana: wd } : {}),
      ...(cartaoDoForm().cartao_id ? { cartao_id: cartaoDoForm().cartao_id } : {}) };
    const igual = fixoRepetido(S.data.fixos, fx);
    if (igual) { const r = await confirmaRepetido(igual, true); if (r === "nao") return naoLancouRepetido(); if (r === "voltar") return $("fValor").focus(); }
    const duas = $("fRepete").value === "duas", dia2 = Number($("fDia2").value);
    if (duas && !(Number.isInteger(dia2) && dia2 >= 1 && dia2 <= 31 && dia2 !== dia)) { flash.style.color = "var(--bad)"; flash.textContent = `Digite o outro dia do mês (de 1 a 31), diferente do dia ${pad(dia)}.`; $("fDia2").focus(); return; }
    $("fOk").disabled = true;
    // Duas vezes no mês: são duas contas fixas iguais, cada uma no seu dia. Cada uma entra na tela assim que o banco guarda.
    const ok = await grava(async () => { S.data.fixos.push(await S.store.addFixo(fx)); if (duas) S.data.fixos.push(await S.store.addFixo({ ...fx, dia: dia2 })); });
    $("fOk").disabled = false;
    if (!ok) return render();
    flash.style.color = "var(--good)";
    const nVezes = fx.ate ? vezesNoPrazo(fx, mKey(fx.ate)) * (duas ? 2 : 1) : 0;
    flash.textContent = `${fx.ate ? (ent ? "Entrada com prazo cadastrada" : "Conta com prazo cadastrada") : ent ? "Entrada fixa cadastrada" : "Conta fixa cadastrada"}: ${fx.descricao} · ${brl(fx.valor)}, ${sem ? "toda semana, " + DIAS_SEMANA[wd] : duas ? `todo mês, nos dias ${pad(dia)} e ${pad(dia2)}` : "todo dia " + pad(dia)}${fx.ate ? `, até ${mesAno(mKey(fx.ate))} (${vezesTxt(nVezes)}, ${brl(round2(nVezes * fx.valor))} no total)` : ""}. Para alterar, abra ${ent ? "Entradas fixas" : "Contas fixas"}.`;
    $("fValor").value = ""; $("fDesc").value = ""; S.catManual = false; S.formaManual = false; limpaSugestoes(); $("fFixo").checked = false; $("fRepete").value = "mensal"; $("fDia2").value = ""; $("fAte").value = ""; $("fVezes").value = "";
    aposLancar(flash.textContent);
    return render();
  }
  const row = { data, descricao: $("fDesc").value.trim(), tipo: S.tipo, categoria: $("fCat").value,
    forma: formaDe(S.tipo, $("fForma").value), valor: round2(v), import_key: null, ...cartaoDoForm() };
  const parecido = lancamentoRepetido(S.data.lancamentos.map(comAutor), comAutor(row)), igual = parecido && S.data.lancamentos.find((z) => z.id === parecido.id);
  if (igual) { const r = await confirmaRepetido(igual, false); if (r === "nao") return naoLancouRepetido(); if (r === "voltar") return $("fValor").focus(); }
  const semCobrir = row.tipo === "Despesa" ? contasSemCobrirDoForm() : null;
  if (semCobrir && (await confirmaSemCobrir(semCobrir)) === "voltar") return $("fValor").focus();
  const nivelAntes = nivelDoTeto(), ehMeta = S.tipo === "Reserva", metaAntes = ehMeta ? andamentoDaMeta(S.data, row.categoria, S.prefs.metas?.[row.categoria], hoje()) : null;
  const combinar = ehMeta && row.forma !== RETIRADA && row.forma !== JA_TINHA && $("fFixo").checked;
  // O lançamento entra na tela no mesmo toque, já com o id definitivo; o envio acontece por trás.
  // Sem conexão (ou com sinal fraco) ele fica na fila do aparelho; se o banco recusar, ele sai da tela e o aviso explica.
  row.id = crypto.randomUUID();
  const naTela = { ...row, created_at: new Date().toISOString(), enviando: true };   // "aguardando internet" só aparece se cair na fila
  S.data.lancamentos.push(naTela);
  const envio = grava(async () => {
    const [novo] = await S.store.addLancamentos([row]);
    const i = S.data.lancamentos.indexOf(naTela);
    if (i >= 0) S.data.lancamentos[i] = novo ? { ...novo, valor: Number(novo.valor) } : { ...naTela, enviando: undefined };
  }, { aviso: false }).then((ok) => {
    if (!ok) { const i = S.data.lancamentos.indexOf(naTela); if (i >= 0) S.data.lancamentos.splice(i, 1); $("toast").hidden = true; }
    render(); avisoDaFila();
    return ok;
  });
  // Enquanto o envio não termina, editar ou excluir esperam por ele (senão mexeriam em um lançamento que o banco ainda não tem).
  envios.set(row.id, envio); envio.finally(() => envios.delete(row.id));
  flash.style.color = "var(--good)"; vibra();
  const kc = cartaoPorId(row.cartao_id || "");
  flash.textContent = `Lançado: ${row.descricao || row.categoria} · ${brl(row.valor)} em ${ddmm(data)}${mKey(data) !== S.mes ? " (outro mês)" : ""}.`
    + (kc ? ` ${row.parcelas > 1 ? `Em ${row.parcelas}x no ${kc.nome}: a primeira parcela vem` : `No ${kc.nome}: vem`} na fatura de ${nomeMes(mesDaFatura(kc, data))}.` : "");
  // Aviso na hora, quando este lançamento fez o mês chegar perto do limite ou passar dele.
  if (extraCartao) flash.textContent += extraCartao;
  const nivelDepois = nivelDoTeto();
  if (nivelDepois > nivelAntes) { const u = usoDoTeto(calcMes(S.data, mKey(hoje()), hoje()), S.prefs.teto), t = textoDoTeto(u); flash.style.color = "var(--warn)"; flash.textContent += ` ${t.titulo} do mês: ${u.pct}% usado. ${t.frase}`; }
  if (ehMeta && row.forma !== RETIRADA) { const dp = andamentoDaMeta(S.data, row.categoria, S.prefs.metas?.[row.categoria], hoje()); if (dp?.concluida && !metaAntes?.concluida) comemora(); }
  if (ehMeta) flash.textContent += recadoDaMeta(metaAntes, andamentoDaMeta(S.data, row.categoria, S.prefs.metas?.[row.categoria], hoje()), row.forma === RETIRADA);
  // A data volta para o padrão (hoje): uma data antiga escolhida para este gasto não passa para o próximo sem a pessoa ver.
  $("fValor").value = ""; $("fDesc").value = ""; $("fParc").value = "1"; $("fData").value = mKey(hoje()) === S.mes ? hoje() : S.mes + "-01"; S.catManual = false; S.formaManual = false; limpaSugestoes();
  diaOutroAberto = false; formaDoCostume(); syncDiaChips();
  aposLancar(flash.textContent);
  if (S.listaFinalizando) concluiLista();
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
// A biblioteca de planilhas (quase 1 MB) só é baixada quando a pessoa gera o relatório ou importa um Excel,
// para o app abrir mais rápido no celular. Usa a versão atual da SheetJS (corrige falhas de segurança da 0.18.5);
// se o endereço oficial falhar, tenta a cópia antiga do jsDelivr.
const XLSX_URLS = ["https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js", "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"];
let carregandoXLSX = null;
function carregaXLSX() {
  if (globalThis.XLSX) return Promise.resolve(globalThis.XLSX);
  const tenta = (i) => new Promise((ok, erro) => {
    const s = document.createElement("script"); s.src = XLSX_URLS[i];
    s.onload = () => (globalThis.XLSX ? ok(globalThis.XLSX) : erro(new Error("xlsx")));
    s.onerror = () => { s.remove(); erro(new Error("xlsx")); };
    document.head.appendChild(s);
  }).catch((e) => (i + 1 < XLSX_URLS.length ? tenta(i + 1) : Promise.reject(e)));
  carregandoXLSX ||= tenta(0).catch((e) => { carregandoXLSX = null; throw e; });
  return carregandoXLSX;
}
$("btnExport").onclick = baixarRelatorio;   // o quadro pergunta o formato: Excel, PDF ou CSV
function openDlg(html) {
  $("dlgBody").innerHTML = html;
  const tit = $("dlgBody").querySelector("h3"); if (tit) { tit.id = "dlgTitulo"; $("dlg").setAttribute("aria-labelledby", "dlgTitulo"); } else $("dlg").removeAttribute("aria-labelledby");
  $("dlgBody").querySelectorAll("[data-close]").forEach((b) => (b.onclick = () => $("dlg").close()));
  // Um "Fechar" sozinho embaixo repete o "Fechar" do canto de cima: some, para a tela ter uma saída só.
  $("dlgBody").querySelectorAll(".actions").forEach((a) => { const f = a.children; if (f.length === 1 && f[0].matches("[data-close]") && f[0].textContent.trim() === "Fechar") a.classList.add("so-fecha"); });
  if (!$("dlg").open) {   // trocar o conteúdo de um quadro já aberto não precisa abrir de novo
    $("dlg").showModal(); $("dlg").scrollTop = 0;
    // O botão Voltar do celular fecha o quadro (e não a tela que está atrás dele).
    // Se o quadro anterior acabou de fechar, o histórico ainda está voltando: a entrada deste é posta quando a volta terminar,
    // senão ela seria desfeita pela volta e o próximo Voltar sairia do app.
    if (S.ignoraPop) S.empurraQuadro = true;
    else try { if (!history.state?.dlg) { history.pushState({ ...(history.state || {}), dlg: true }, ""); S.dlgNoHist = true; } } catch { /* sem histórico: o Fechar resolve */ }
  }
}
// Editou um item que veio de um quadro de detalhe (Entradas, Contas fixas, Faturas...): ao fechar a edição, volta para o quadro.
$("dlg").addEventListener("close", () => {
  const volta = S.voltaDet; S.voltaDet = "";
  if (volta) setTimeout(() => { if (!$("dlg").open) detalheKpi(volta); }, 60);
});
// "Pular e lançar um gasto agora", nos primeiros passos: fecha o guia e abre o lançamento, já no valor.
$("dlgBody").addEventListener("click", (e) => {
  if (!e.target.closest("[data-ja-lancar]")) return;
  $("dlg").close(); S.tipo = "Despesa"; renderForm();
  setTimeout(() => { if (noCelular()) abrirLancar(); else { $("fValor").scrollIntoView({ block: "center" }); $("fValor").focus(); } }, 200);   // depois de o Voltar do quadro terminar
});
// Todo quadro tem o mesmo "Fechar" no canto de cima, além do botão de baixo.
$("dlgX").onclick = () => $("dlg").close();
$("dlg").addEventListener("close", () => {
  // Fechado e aberto de novo no mesmo instante (um quadro que leva a outro): a entrada do histórico fica para o novo.
  if ($("dlg").open) { S.dlgPeloVoltar = false; return; }
  if (S.dlgNoHist && !S.dlgPeloVoltar) { S.dlgNoHist = false; S.ignoraPop = true; try { history.back(); } catch { S.ignoraPop = false; } }
  S.dlgNoHist = false; S.dlgPeloVoltar = false;
});

/* ================= editar ================= */
const TIPOS = [["Despesa", "Gasto"], ["Receita", "Entrada"], ["Reserva", "Guardado"]];
/** Lançamentos que acabaram de ser feitos e ainda estão indo para o banco: id → promessa do envio. */
const envios = new Map();
function editarLancamento(id) {
  if (envios.has(id)) { toast("Terminando de salvar esse lançamento…"); return void envios.get(id).then((ok) => { if (ok) editarLancamento(id); }); }
  const x = S.data.lancamentos.find((z) => z.id === id); if (!x) return;
  const catOpts = (tipo, atual) => { const l = cats(tipo); return opts(l.includes(atual) || !atual ? l : [atual, ...l], atual) + optNova(tipo); };
  openDlg(`<h3>Editar lançamento</h3><form id="edForm" class="dlg-form" autocomplete="off">
    <label class="f">Tipo<select class="in" id="eTipo">${TIPOS.map(([v, r]) => `<option value="${v}"${v === x.tipo ? " selected" : ""}>${r}</option>`).join("")}</select></label>
    <label class="f">Valor (R$)<input class="in money" id="eValor" inputmode="decimal" required value="${esc(x.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 }))}"></label>
    <p class="hint wide" id="eHoras" aria-live="polite" hidden></p>
    <label class="f wide">Descrição<input class="in" id="eDesc" maxlength="80" value="${esc(x.descricao)}"></label>
    <label class="f"><span id="eCatLbl">Categoria</span><select class="in" id="eCat">${catOpts(x.tipo, x.categoria)}</select></label>
    <label class="f" id="eFormaWrap"><span id="eFormaLbl">Forma de pagamento</span><select class="in" id="eForma"></select></label>
    <label class="f" id="eCartaoWrap" hidden>Cartão<select class="in" id="eCartao">${optsCartao(x.cartao_id, cartaoPorId(x.cartao_id) ? "" : "Sem cartão escolhido")}</select></label>
    <label class="f" id="eParcWrap" hidden>Parcelas<select class="in" id="eParc">${optsParcelas(x.valor, x.parcelas || 1)}</select></label>
    <label class="f">Data<input class="in" type="date" id="eData" required value="${esc(x.data)}"></label>
    <div class="f wide meta-inline" id="eMetaWrap" hidden><b id="eMetaTit">Meta da caixinha</b>
      <div class="meta-inline-campos"><label class="f">Quanto quer juntar (R$)<input class="in money" id="eMetaValor" inputmode="decimal" placeholder="Ex.: 6.000,00"></label>
      <label class="f">Até quando<select class="in" id="eMetaAte"></select></label></div>
      <p class="hint meta-conta" id="eMetaConta" aria-live="polite"></p></div>
    ${x.pendente || typeof S.store.guardaComprovante !== "function" ? "" : `<div class="f wide foto-linha"><span class="ava">${ico(temComprovante(x) ? "clipe" : "imagem")}</span>
      <span><b>Comprovante</b><small>${temComprovante(x) ? "a foto do recibo está guardada neste lançamento" : "guarde a foto do recibo para consultar depois"}</small></span>
      <button class="btn sm" type="button" id="eComp">${temComprovante(x) ? "Ver" : "Anexar"}</button></div>`}
    <p class="auth-msg err wide" id="edMsg"></p>
    <div class="actions wide"><button class="btn primary" type="submit">Salvar alteração</button><button class="btn" type="button" id="eDeNovo">Lançar de novo hoje</button><button class="btn" type="button" data-close>Cancelar</button><button class="btn perigo" type="button" id="eExcluir">${ico("lixo")}Excluir</button></div></form>`);
  const horasDoEditar = () => {
    const el = $("eHoras"), vh = $("eTipo").value === "Despesa" ? minhaHora() : null, v = parseMoney($("eValor").value), t = vh && v > 0 && v <= VALOR_MAX ? horasDeTrabalho(v, vh.valor) : null;
    el.hidden = !t; el.textContent = t ? `Isso é ${t} do seu trabalho (sua hora vale ${brl(vh.valor)})` : "";
  };
  $("eValor").addEventListener("input", horasDoEditar); $("eTipo").addEventListener("change", horasDoEditar); horasDoEditar();
  // Mesmo lançamento, com a data de hoje: para o gasto que se repete.
  $("eDeNovo").onclick = async () => {
    const { id: _id, created_at: _c, user_id: _u, pendente: _p, enviando: _e, comprovante: _cp, ...copia } = x;   // o comprovante é daquele gasto, não da cópia
    const row = { ...copia, data: hoje(), import_key: null };
    $("eDeNovo").disabled = true;
    let novos; const ok = await grava(async () => { novos = await S.store.addLancamentos([row]); });
    if (!ok) { $("eDeNovo").disabled = false; return; }
    S.data.lancamentos.push(...novos); S.mes = mKey(hoje()); $("dlg").close(); render();
    toast(`Lançado de novo hoje: ${x.descricao || x.categoria}, ${brl(x.valor)}.`);
  };
  // Comprovante: ver o que está guardado, ou anexar a foto do recibo depois.
  if ($("eComp")) $("eComp").onclick = () => (temComprovante(x)
    ? verComprovante(x, () => editarLancamento(id))
    : anexaComprovante(x, () => editarLancamento(id)));
  armDelete($("eExcluir"), async () => {
    if (await apagaLancamento(id)) { $("dlg").close(); render(); }
  });
  const sync = (atual) => {
    const t = $("eTipo").value, mov = t === "Reserva";
    $("eFormaWrap").hidden = t === "Receita";
    $("eFormaLbl").textContent = mov ? "Movimento" : "Forma de pagamento";
    $("eCatLbl").textContent = mov ? "Onde guardar" : "Categoria";
    $("eForma").innerHTML = mov ? opts(MOVS, movDe(atual)) : opts(FORMAS, atual);
    syncCartao();
  };
  // Cartão e parcelas só aparecem para gasto no cartão de crédito, e quando há cartão cadastrado.
  const noCartao = () => $("eTipo").value === "Despesa" && $("eForma").value === CARTAO && S.data.cartoes.length > 0;
  const syncCartao = () => { $("eCartaoWrap").hidden = !noCartao(); $("eParcWrap").hidden = !noCartao(); };
  $("eForma").onchange = syncCartao;
  $("eValor").oninput = () => { $("eParc").innerHTML = optsParcelas(parseMoney($("eValor").value), $("eParc").value); };
  $("eTipo").onchange = () => { $("eCat").innerHTML = catOpts($("eTipo").value, ""); sync(""); enchMeta(); };
  ligaNovaCategoria($("eCat"), () => $("eTipo").value, () => $("eDesc").value, (nome) => { $("eCat").innerHTML = catOpts($("eTipo").value, nome); $("eCat").value = nome; enchMeta(); });
  // Guardado: a meta da caixinha (quanto juntar e até quando) pode ser mudada aqui mesmo, com a conta de quanto guardar por mês.
  const enchMeta = () => {
    const guard = $("eTipo").value === "Reserva", cx = $("eCat").value; $("eMetaWrap").hidden = !guard; if (!guard) return;
    const m = metasDe()[cx], cur = mKey(hoje()), meses = Array.from({ length: 121 }, (_, i) => addM(cur, i));
    if (m?.ate && !meses.includes(m.ate)) meses.unshift(m.ate);
    $("eMetaTit").textContent = `Meta da caixinha ${cx}`;
    $("eMetaValor").value = Number(m?.valor) > 0 ? Number(m.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "";
    $("eMetaAte").innerHTML = `<option value="">Sem data</option>` + meses.map((k) => `<option value="${k}"${k === m?.ate ? " selected" : ""}>${mesAno(k)}</option>`).join("");
    contaMeta();
  };
  const contaMeta = () => {
    const host = $("eMetaConta"), v = parseMoney($("eMetaValor").value), ate = $("eMetaAte").value, cx = $("eCat").value;
    if (!(v > 0)) { host.textContent = "Diga quanto quer juntar e até quando: o app calcula quanto guardar por mês."; return; }
    const a = andamentoDaMeta(S.data, cx, { ...(metasDe()[cx] || {}), valor: round2(v), ate }, hoje());
    if (!a) { host.textContent = ""; return; }
    if (a.concluida) { host.innerHTML = `Você já tem <b>${brl(a.guardado)}</b> aqui: a meta está batida.`; return; }
    const base = `Já tem <b>${brl(a.guardado)}</b>, faltam <b>${brl(a.falta)}</b>.`;
    if (!ate) { host.innerHTML = `${base} Escolha até quando para ver quanto guardar por mês.`; return; }
    const cur0 = mKey(hoje()), n = (Number(ate.slice(0, 4)) - Number(cur0.slice(0, 4))) * 12 + Number(ate.slice(5, 7)) - Number(cur0.slice(5, 7)) + 1;
    host.innerHTML = a.prazoPassou ? `${base} Esse mês já passou: escolha uma data daqui para frente.`
      : `${base} Para chegar lá até <b>${mesAno(ate)}</b> (${n} ${n === 1 ? "mês" : "meses"}, contando este), guarde mais ou menos <b>${brl(a.porMes)} por mês</b>. ${a.esteMes > 0 ? `Neste mês ainda faltam ${brl(a.esteMes)}.` : "Este mês já está feito."}`;
  };
  $("eCat").addEventListener("change", enchMeta); $("eMetaValor").addEventListener("input", contaMeta); $("eMetaAte").onchange = contaMeta;
  sync(x.forma); enchMeta();
  $("edForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const v = parseMoney($("eValor").value);
    if (avisoValor(v)) { $("edMsg").textContent = avisoValor(v); return; }
    const anoEd = Number(($("eData").value || hoje()).slice(0, 4)), anoAgora = Number(hoje().slice(0, 4));
    if (anoEd > anoAgora + 2 || anoEd < anoAgora - 10) { $("edMsg").textContent = `A data parece errada (ano ${anoEd}). Confira o ano.`; $("eData").focus(); return; }
    const mv = $("eTipo").value === "Reserva" ? parseMoney($("eMetaValor").value) : 0;
    if (mv > VALOR_MAX) { $("edMsg").textContent = ALTO_DEMAIS; return $("eMetaValor").focus(); }
    const tipo = $("eTipo").value;
    const patch = { data: $("eData").value, descricao: $("eDesc").value.trim(), tipo, categoria: $("eCat").value,
      forma: formaDe(tipo, $("eForma").value), valor: round2(v),
      import_key: String(x.import_key || "").startsWith("ext|") ? x.import_key : null,   // compra vinda do extrato continua marcada, para não voltar na próxima importação
      ...(S.data.cartoes.length || x.cartao_id ? { cartao_id: noCartao() ? $("eCartao").value || null : null, parcelas: noCartao() && $("eCartao").value ? Number($("eParc").value) || 1 : 1 } : {}) };
    if (await grava(() => S.store.updateLancamento(id, patch))) {
      Object.assign(x, patch);
      if (mv > 0) {   // só cria ou muda a meta quando há valor; apagar a meta continua na tela da meta
        const cx = patch.categoria, m = metasDe()[cx] || {}, nova = { ...m, valor: round2(mv), ate: $("eMetaAte").value };
        if (nova.valor !== m.valor || (nova.ate || "") !== (m.ate || "")) { metasDe()[cx] = nova; salvaPrefs(); toast(`Meta de ${cx} salva: ${brl(nova.valor)}${nova.ate ? ` até ${mesAno(nova.ate)}` : ""}.`); }
      }
      $("dlg").close(); render();
    }
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
      if (avisoValor(v, "350,00")) { $("edMsg").textContent = avisoValor(v, "350,00"); return; }
      const patch = { cartao: $("eNome").value.trim(), vencimento: $("eVenc").value, valor: round2(v), status: $("eSt").value };
      if (await grava(() => S.store.updateFatura(f.id, patch))) { Object.assign(f, patch); $("dlg").close(); render(); }
    });
    return;
  }
  const k = cartaoPorId(x.cartao_id), per = k ? periodoDaFatura(k, mKey(x.vencimento)) : null;
  // Compra: toque abre a edição, o X (ou deslizar para a esquerda) apaga com Desfazer. Conta fixa no cartão se edita em Contas fixas.
  const linhaItem = (i) => (i.origem === "compra"
    ? `<li class="toca com-x" data-ic="${esc(i.id)}" tabindex="0" role="button" aria-label="Editar ${esc(i.descricao)}"><span class="d">${ddmm(i.data)}</span><span>${esc(i.descricao)}${i.de > 1 ? ` <span class="tag">${i.parcela}/${i.de}</span>` : ""}<span class="mini">toque para editar · deslize para apagar</span></span><b>${brl(i.valor)}</b><button class="item-x" type="button" data-xc="${esc(i.id)}" aria-label="Apagar ${esc(i.descricao)}">${ico("x")}</button></li>`
    : `<li class="com-x"><span class="d">${ddmm(i.data)}</span><span>${esc(i.descricao)} <span class="tag">fixo</span><span class="mini">é uma conta fixa: edite em Contas fixas</span></span><b>${brl(i.valor)}</b><span></span></li>`);
  openDlg(`<h3>Fatura ${esc(x.cartao)}</h3>
    <p class="hint" style="margin:0">Vence em ${ddmmaa(x.vencimento)}${per ? ` · compras de ${ddmm(per.de)} a ${ddmm(per.ate)}` : ""}</p>
    <ul class="itens">${x.itens.map(linhaItem).join("")
      || `<li class="com-x"><span></span><span style="color:var(--muted)">Nenhuma compra lançada nesta fatura.</span><b></b><span></span></li>`}
      <li class="tot com-x"><span></span><span>Soma das compras</span><b>${brl(x.calculado)}</b><span></span></li></ul>
    <form id="edForm" class="dlg-form" autocomplete="off">
      <label class="f">Valor da fatura (R$)<input class="in money" id="eValor" inputmode="decimal" required value="${valorTxt(x.valor)}"></label>
      ${situacao}
      <p class="hint wide" style="margin:0">O banco cobrou outro valor (juros, anuidade, alguma compra que faltou lançar)? Corrija o valor acima: ele passa a valer no lugar da soma.${x.valor_fixo ? ` <button class="link" type="button" id="eVoltar">Voltar ao valor calculado</button>` : ""}</p>
      <p class="auth-msg err wide" id="edMsg"></p>
      <div class="actions wide"><button class="btn primary" type="submit">Salvar</button><button class="btn" type="button" data-close>Fechar</button></div></form>`);
  // Depois de apagar ou editar uma compra, a fatura abre de novo com o valor novo (ou fecha, se não sobrou compra).
  const refaz = () => { const nova = faturasDoMes(S.data, mKey(x.vencimento)).find((f) => f.auto && f.cartao_id === x.cartao_id); if (nova) editarFatura(nova); else $("dlg").close(); };
  $("dlgBody").querySelectorAll("[data-xc]").forEach((b) => (b.onclick = (e) => { e.stopPropagation(); apagaComDesfazer(b.dataset.xc, refaz); }));
  const editaItem = (id) => { editarLancamento(id); $("dlg").addEventListener("close", () => { if (!$("dlg").open) setTimeout(refaz, 0); }, { once: true }); };
  $("dlgBody").querySelectorAll("[data-ic]").forEach((li) => {
    li.onclick = (e) => { if (!e.target.closest("button") && Date.now() - fimDeslizar > 400) editaItem(li.dataset.ic); };
    li.onkeydown = (e) => { if ((e.key === "Enter" || e.key === " ") && e.target === li) { e.preventDefault(); editaItem(li.dataset.ic); } };
  });
  ligaDeslizarLinha($("dlgBody"), "ul.itens li[data-ic]", (el) => apagaComDesfazer(el.dataset.ic, refaz));
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
    if (avisoValor(v, "350,00")) { $("edMsg").textContent = avisoValor(v, "350,00"); return; }
    salvar(round2(v), $("eSt").value);
  });
  if ($("eVoltar")) $("eVoltar").onclick = () => {
    if (!(x.calculado > 0)) { $("edMsg").textContent = "Esta fatura não tem compras lançadas, então não há valor calculado para voltar."; return; }
    salvar(x.calculado, $("eSt").value);
  };
}
/* ---------- Apagar um cartão ---------- */
/** Mostra o que depende do cartão e deixa escolher: apagar tudo, só o cartão (as compras ficam sem cartão) ou baixar antes. */
function apagarCartao(id) {
  const k = cartaoPorId(id); if (!k) return;
  const d = dependentesDoCartao(S.data, id), tem = d.compras.length + d.fixos.length > 0, plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;
  const resumo = tem ? `Este cartão tem <b>${plural(d.compras.length, "compra lançada", "compras lançadas")}</b>${d.total ? ` (${brl(d.total)})` : ""}${d.fixos.length ? ` e <b>${plural(d.fixos.length, "conta fixa cobrada", "contas fixas cobradas")}</b> nele` : ""}.` : "Nenhuma compra nem conta fixa está ligada a este cartão.";
  openDlg(`<h3>Apagar ${esc(k.nome)}?</h3>
    <p style="margin:0 0 8px;color:var(--ink-2)">${resumo}</p>
    <p class="hint" style="margin:0 0 12px">Apagar não dá para desfazer.${tem ? " Se quiser guardar uma cópia, baixe antes." : ""}</p>
    <div class="caixa-mais">${tem ? `${opFerr("apTudo", "lixo", "Apagar o cartão e tudo dele", `${plural(d.compras.length, "compra", "compras")}${d.fixos.length ? ` e ${plural(d.fixos.length, "conta fixa", "contas fixas")}` : ""} também saem do app`)}
      ${opFerr("apSo", "lixo", "Apagar só o cartão", "As compras ficam no extrato, sem cartão escolhido (não entram em nenhuma fatura)")}
      ${opFerr("apBaixar", "baixar", "Baixar as compras antes", "Em Excel, PDF ou CSV")}` : opFerr("apSo", "lixo", "Apagar o cartão", "Ele some da lista de cartões")}</div>
    <div class="actions"><button class="btn" type="button" data-close>Cancelar</button></div>`);
  const aposApagar = (msg) => { $("dlg").close(); render(); toast(msg); };
  $("apSo").onclick = async () => {
    if (!(await grava(() => S.store.deleteCartao(id)))) return;
    // Como no banco: as compras ficam sem cartão e os registros de fatura daquele cartão somem.
    S.data.cartoes = S.data.cartoes.filter((z) => z.id !== id); S.data.faturas = S.data.faturas.filter((z) => z.cartao_id !== id);
    [...S.data.lancamentos, ...S.data.fixos].forEach((x) => { if (x.cartao_id === id) x.cartao_id = null; });
    aposApagar(`${k.nome} apagado.${tem ? " As compras continuam no extrato, sem cartão escolhido." : ""}`);
  };
  if ($("apTudo")) $("apTudo").onclick = async () => {
    $("apTudo").disabled = true;
    const ok = await grava(async () => {
      for (let i = 0; i < d.compras.length; i += 10) await Promise.all(d.compras.slice(i, i + 10).map((x) => S.store.deleteLancamento(x.id)));
      for (const f of d.fixos) await S.store.deleteFixo(f.id);
      await S.store.deleteCartao(id);
    });
    if (!ok) { $("apTudo").disabled = false; return; }
    d.compras.forEach((x) => { if (x.comprovante) Promise.resolve(S.store.apagaComprovante?.(x.comprovante)).catch(() => { /* nada */ }); });
    const fixosIds = new Set(d.fixos.map((f) => f.id)), comprasIds = new Set(d.compras.map((x) => x.id));
    S.data.lancamentos = S.data.lancamentos.filter((x) => !comprasIds.has(x.id)); S.data.fixos = S.data.fixos.filter((f) => !fixosIds.has(f.id));
    S.data.pagos = (S.data.pagos || []).filter((p) => !fixosIds.has(p.fixo_id));
    S.data.cartoes = S.data.cartoes.filter((z) => z.id !== id); S.data.faturas = S.data.faturas.filter((z) => z.cartao_id !== id);
    aposApagar(`${k.nome} apagado, com ${plural(d.compras.length, "compra", "compras")}${d.fixos.length ? ` e ${plural(d.fixos.length, "conta fixa", "contas fixas")}` : ""}.`);
  };
  if ($("apBaixar")) $("apBaixar").onclick = () => exportarCartao(id, "todas", () => apagarCartao(id));
}

/* ---------- Exportar o extrato do mês e o cartão (Excel, PDF ou CSV) ---------- */
const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "cartao";
/** Planilha do Excel com uma aba: cabeçalho, linhas e as colunas indicadas como número com duas casas. */
async function baixaTabelaExcel(btn, arquivo, aba, cab, linhas, numericas = []) {
  if (btn) btn.disabled = true;
  try { await carregaXLSX(); } catch { /* cai na mensagem abaixo */ } finally { if (btn) btn.disabled = false; }
  if (typeof XLSX === "undefined") return showBanner("Não foi possível gerar a planilha do Excel. Confira a internet e tente de novo, ou baixe em PDF ou CSV.");
  const ws = XLSX.utils.aoa_to_sheet([cab, ...linhas]);
  ws["!cols"] = cab.map((c) => ({ wch: /descri/i.test(c) ? 36 : /categoria/i.test(c) ? 22 : /forma/i.test(c) ? 20 : 14 }));
  linhas.forEach((_l, r) => numericas.forEach((c) => { const cel = ws[XLSX.utils.encode_cell({ r: r + 1, c })]; if (cel && typeof cel.v === "number") cel.z = "#,##0.00"; }));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, aba.slice(0, 31)); XLSX.writeFile(wb, arquivo);
}
const opcoesDeArquivo = (sx, sp, sc) => `<div class="caixa-mais">${opFerr("exX", "baixar", "Planilha do Excel", sx)}${opFerr("exP", "baixar", "PDF", sp)}${opFerr("exC", "baixar", "CSV", sc)}</div>`;
/** O extrato do mês que está na tela: lançamentos, contas fixas e as faturas que vencem nele. */
function exportarExtratoMes(voltar) {
  const m = S.mes, linhas = linhasDoMes(S.data, m), nome = `${nomeMes(m)} de ${m.slice(0, 4)}`;
  openDlg(`<h3>Extrato de ${nome}</h3>
    <p class="hint" style="margin:0 0 12px">${linhas.length ? `${linhas.length} ${linhas.length === 1 ? "linha" : "linhas"}: lançamentos, contas fixas e as faturas que vencem no mês.` : "Este mês ainda não tem lançamentos."} O arquivo é feito aqui no aparelho. Para outro mês, troque o mês na tela antes.</p>
    ${opcoesDeArquivo("Uma aba com todas as linhas, valores como número", "Resumo do mês, lançamentos e faturas", "Lista simples, abre no Excel e no Google Planilhas")}
    <div class="actions">${voltar ? `<button class="btn" type="button" id="exVolta">Voltar</button>` : ""}<button class="btn" type="button" data-close>Fechar</button></div>`);
  if (voltar) $("exVolta").onclick = voltar;
  $("exC").onclick = () => baixaArquivo(`meus-gastos-extrato-${m}.csv`, new Blob([csvDoMes(S.data, m)], { type: "text/csv;charset=utf-8" }));
  $("exP").onclick = () => baixaArquivo(`meus-gastos-extrato-${m}.pdf`, new Blob([pdfDeLinhas(extratoDoMesEmLinhas(S.data, m, hoje()))], { type: "application/pdf" }));
  $("exX").onclick = () => baixaTabelaExcel($("exX"), `meus-gastos-extrato-${m}.xlsx`, nome, CAB_EXTRATO, linhas.map((x) => [ddmmaaaa(x.data), x.tipo, x.categoria, x.descricao, x.forma, x.valor, x.origem]), [5]);
}
/** As compras de um cartão: as da fatura que vence no mês da tela, ou todas as compras lançadas nele. */
function exportarCartao(idInicial = "", escopo = "fatura", voltar) {
  const cartoes = S.data.cartoes;
  if (!cartoes.length) {
    openDlg(`<h3>Exportar cartão</h3><p class="hint" style="margin:0 0 12px">Você ainda não cadastrou nenhum cartão.</p>
      <div class="actions"><button class="btn primary" type="button" id="exCad">Cadastrar cartão</button><button class="btn" type="button" data-close>Fechar</button></div>`);
    $("exCad").onclick = () => { $("dlg").close(); S.view = "listas"; S.tab = "c"; render(); };
    return;
  }
  const est = { id: cartoes.some((k) => k.id === idInicial) ? idInicial : (cartoes.find((k) => k.ativo !== false) || cartoes[0]).id, escopo };
  const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;
  const monta = () => {
    const k = cartaoPorId(est.id), m = est.escopo === "fatura" ? S.mes : "", linhas = linhasDoCartao(S.data, k.id, m), total = round2(linhas.reduce((t, x) => t + x.valor, 0));
    const rotuloMes = `${nomeMes(S.mes)} de ${S.mes.slice(0, 4)}`, base = `meus-gastos-${slug(k.nome)}-${m || "todas-as-compras"}`;
    openDlg(`<h3>Exportar cartão</h3>
      <div class="dlg-form"><label class="f">Cartão<select class="in" id="exCartao">${cartoes.map((c) => `<option value="${esc(c.id)}"${c.id === k.id ? " selected" : ""}>${esc(c.nome)}${c.ativo === false ? " (desativado)" : ""}</option>`).join("")}</select></label>
        <label class="f">O que baixar<select class="in" id="exEscopo"><option value="fatura"${est.escopo === "fatura" ? " selected" : ""}>Fatura que vence em ${rotuloMes}</option><option value="todas"${est.escopo === "todas" ? " selected" : ""}>Todas as compras do cartão</option></select></label></div>
      <p class="hint" style="margin:8px 0 12px">${linhas.length ? `${plural(linhas.length, "item", "itens")}, ${brl(total)}.` : est.escopo === "fatura" ? "Esse cartão não tem compras na fatura deste mês." : "Esse cartão ainda não tem compras lançadas."} Para outra fatura, troque o mês na tela antes.</p>
      ${opcoesDeArquivo("Uma aba com as compras e o total", "As compras e o total", "Lista simples, abre no Excel e no Google Planilhas")}
      <div class="actions">${voltar ? `<button class="btn" type="button" id="exVolta">Voltar</button>` : ""}<button class="btn" type="button" data-close>Fechar</button></div>`);
    if (voltar) $("exVolta").onclick = voltar;
    $("exCartao").onchange = (e) => { est.id = e.target.value; monta(); };
    $("exEscopo").onchange = (e) => { est.escopo = e.target.value; monta(); };
    $("exC").onclick = () => baixaArquivo(`${base}.csv`, new Blob([csvDoCartao(S.data, k.id, m)], { type: "text/csv;charset=utf-8" }));
    $("exP").onclick = () => baixaArquivo(`${base}.pdf`, new Blob([pdfDeLinhas(cartaoEmLinhas(S.data, k.id, k.nome, m, hoje()))], { type: "application/pdf" }));
    $("exX").onclick = () => baixaTabelaExcel($("exX"), `${base}.xlsx`, k.nome, CAB_CARTAO, [...linhas.map((x) => [ddmmaaaa(x.data), x.descricao, x.categoria, x.parcela, x.valor, x.origem]), ["", "Total", "", "", total, ""]], [4]);
  };
  monta();
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
  openDlg(`<h3>${ent ? "Editar entrada fixa" : "Editar conta fixa"}</h3><form id="edForm" class="dlg-form" autocomplete="off">
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
    if (avisoValor(v, "350,00")) { $("edMsg").textContent = avisoValor(v, "350,00"); return; }
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
  ? `<ul class="itens">${l.map((i) => `<li${i.ref ? ` class="toca" role="button" tabindex="0" data-ref="${esc(JSON.stringify(i.ref))}" aria-label="${esc(i.t)}: editar"` : ""}><span class="d">${i.d}</span><span>${esc(i.t)}${i.tag ? ` <span class="tag ${i.tagCls || ""}">${esc(i.tag)}</span>` : ""}${i.ref?.k === "lanc" ? marcaComprovante(lancPorId(i.ref.id)) : ""}${i.s ? `<span class="mini">${esc(i.s)}</span>` : ""}</span><b class="${i.cls || ""}">${i.v}</b></li>`).join("")}</ul>`
  : `<p class="hint" style="margin:6px 0 10px">${vazio}</p>`;
/** Abre o quadro de detalhes. secoes: [{titulo?, total?, itens?, vazio?, html?}]; ir: [rótulo do botão, aba para abrir]. */
function abreDetalhe(titulo, sub, secoes, ir) {
  const de = S.detDe || ""; S.detDe = "";
  openDlg(`<h3>${titulo}</h3>${sub ? `<p class="hint" style="margin:0 0 4px;font-size:13px">${sub}</p>` : ""}
    <div class="det">${secoes.map((s) => `${s.titulo ? `<h4><span>${s.titulo}</span><b>${s.total ?? ""}</b></h4>` : ""}${s.html ?? linhasDet(s.itens, s.vazio)}`).join("")}</div>
    ${secoes.some((s) => s.itens?.some((i) => i.ref)) ? `<p class="hint det-toque">Toque em um item para editar.</p>` : ""}
    <div class="actions">${ir ? `<button class="btn primary" type="button" id="detIr">${ir[0]}</button>` : ""}${de ? `<button class="btn" type="button" id="detVoltar">Voltar ao saldo</button>` : ""}<button class="btn" type="button" data-close>Fechar</button></div>`);
  if (de) $("detVoltar").onclick = () => detalheKpi(de);
  if (ir) $("detIr").onclick = () => { $("dlg").close(); S.view = "listas"; S.tab = ir[1]; render(); noCelular() ? scrollTo(0, 0) : $("listas").scrollIntoView({ block: "start" }); };
  $("dlgBody").querySelectorAll("[data-ref]").forEach((li) => {
    const abre = () => { S.voltaDet = S.detTipo || ""; abrirItem(JSON.parse(li.dataset.ref)); };
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
const origemTxt = (i) => i.origem === "cartao" ? `na fatura do ${i.cartao}` : i.origem === "fixo" ? `conta fixa${i.forma ? " · " + i.forma : ""}` : i.origem === "fatura" ? "fatura de cartão" : i.forma || "";
const formaTxt = (i) => (i.origem === "cartao" || i.origem === "fatura" ? i.cartao : i.forma || "");
const linhaCusto = (i) => { const [tag, tagCls] = tipoDoItem(i); return { d: ddmm(i.data), t: i.descricao, tag, tagCls, s: [i.categoria, formaTxt(i)].filter(Boolean).join(" · "), v: brl(i.valor), ref: i.ref }; };

function detalheKpi(tipo, de = "") {
  if (!S.loaded) return;
  S.detDe = de;   // quem abriu (ex.: "saldo"): o quadro mostra um "Voltar" para lá
  S.detTipo = tipo; S.voltaDet = "";
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
    return abreDetalhe(`Custo de ${mes}`, `Total: <b>${brl(c.custo)}</b>${emHoras(c.custo)}${c.fase === "atual" ? ` · previsão de fechar em ${brl0(c.proj)}` : ""}`, [
      { titulo: "Gastos do dia a dia", total: brl(c.vari), itens: de("gasto"), vazio: "Nenhum gasto lançado fora do cartão." },
      { titulo: "Contas fixas", total: brl(c.fxCusto), itens: de("fixo"), vazio: "Nenhuma conta fixa fora do cartão." },
      { titulo: "Faturas de cartão", total: brl(c.fatT), itens: c.fat.map(linhaFaturaDet(hj)), vazio: "Nenhuma fatura vence neste mês." }], ["Ver nos lançamentos", "l"]);
  }
  if (tipo === "saldo") {
    const viradas = S.prefs.mesesVirados || [], virado = viradas.includes(S.mes);
    const ini = Number(S.prefs.saldoInicial) || 0, ant = S.prefs.levarSaldo ? saldoAnterior(S.data, S.mes, hj, S.prefs.saldoDesde, viradas) : 0;
    const acum = S.prefs.levarSaldo ? saldoAcumulado(S.data, S.mes, hj, { desde: S.prefs.saldoDesde, inicial: ini, viradas }) : (virado ? 0 : c.saldo), iniVale = round2(acum - ant - (virado ? 0 : c.saldo));
    const li = (t, v, forte = false, abre = "") => abre
      ? `<li class="toca" role="button" tabindex="0" data-saldo-det="${abre}" aria-label="${t}: ver os lançamentos"><span></span><span>${t}<span class="mini">Toque para ver e editar</span></span><b>${v}</b></li>`
      : `<li class="${forte ? "tot" : ""}"><span></span><span>${t}</span><b>${v}</b></li>`;
    const atrasoN = contasEmAtraso(S.data, hj, S.prefs.saldoDesde).itens.length;
    const pedeOrdem = c.saldo < 0 || acum < 0 || virado || atrasoN > 0;
    abreDetalhe(`Saldo de ${mes}`, "Entradas menos o gasto do mês e menos o que você guardou.", [
      { html: `<ul class="itens">${li("Entradas", "+ " + brl(c.rec), false, "entradas")}${li("Gasto do mês", "− " + brl(c.custo), false, "custo")}${c.res ? li(c.res > 0 ? "Guardado neste mês" : "Retirado do guardado", (c.res > 0 ? "− " : "+ ") + brl(Math.abs(c.res)), false, "guardado") : ""}${li("Saldo do mês", sgn(c.saldo), true)}</ul>` },
      ...(S.prefs.levarSaldo ? [{ titulo: "Saldo somando os meses anteriores", total: sgn(acum),
        html: `<ul class="itens">${iniVale ? li("Saldo inicial", sgn(iniVale)) : ""}${li("Saldo dos meses anteriores", sgn(ant))}${virado ? li(`Saldo de ${mes} (virado: não é levado adiante)`, "virado") : li(`Saldo de ${mes}`, sgn(c.saldo))}${li("Saldo até aqui", sgn(acum), true)}</ul>` }] : []),
      ...(pedeOrdem ? [{ html: `<div class="ordem-cta"><p class="hint" style="margin:10px 0 8px">${virado ? `Você virou a página de ${mes}: o saldo dele não passa para os próximos meses.` : acum < 0 || c.saldo < 0 ? "Acontece com todo mundo. Dá para ver as contas, o que ficou para trás e um jeito leve de recomeçar." : atrasoN ? `Você tem ${atrasoN} ${atrasoN === 1 ? "conta" : "contas"} em atraso para ver com calma.` : ""}</p><button class="btn primary" type="button" id="detOrdem" style="margin-left:0">Pôr o mês em ordem</button></div>` }] : [])]);
    if ($("detOrdem")) $("detOrdem").onclick = () => { $("dlg").close(); setTimeout(() => equilibrioTela(S.mes), 120); };
    $("dlgBody").querySelectorAll("[data-saldo-det]").forEach((li) => {
      const abre = () => detalheKpi(li.dataset.saldoDet, "saldo");
      li.onclick = abre; li.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abre(); } };
    });
    return;
  }
  if (tipo === "guardado") {
    const dest = guardadoPorDestino(S.data, S.mes), mov = c.it.filter((x) => x.tipo === "Reserva").sort(porData), tem = new Map(dest);
    const nomes = [...new Set([...dest.map(([k]) => k), ...cats("Reserva"), ...Object.keys(S.prefs.metas || {})])];
    abreDetalhe("Caixinhas", `Total até ${mes}: <b>${brl(reservaAcumulada(S.data, S.mes))}</b>`, [
      { titulo: "Onde está e as metas", html: `<ul class="itens metas-lista">${nomes.map((k, i) => { const a = andamentoDaMeta(S.data, k, S.prefs.metas?.[k], hj);
          return `<li><span>${esc(k)}<span class="mini">${a ? (a.concluida ? `Meta de ${brl0(a.alvo)} completa` : `${a.pct}% da meta de ${brl0(a.alvo)}`) : "Sem meta"}</span></span><b>${brl(tem.get(k) || 0)}</b><button class="btn sm" type="button" data-meta-d="${i}">${a ? "Ver meta" : "Criar meta"}</button></li>`; }).join("")}</ul>` },
      { titulo: `Movimentos de ${mes}`, total: sgn(c.res), itens: mov.map((x) => ({ d: ddmm(x.data), t: x.descricao || x.categoria, s: x.categoria, ref: { k: "lanc", id: x.id },
          tag: x.forma === RETIRADA ? "retirou" : x.forma === JA_TINHA ? "já tinha" : "guardou", v: (x.forma === RETIRADA ? "− " : "+ ") + brl(x.valor), cls: "res" })), vazio: "Nada guardado nem retirado neste mês." }], ["Ver nos lançamentos", "l"]);
    $("dlgBody").querySelectorAll("[data-meta-d]").forEach((b) => (b.onclick = () => detalheMeta(nomes[Number(b.dataset.metaD)])));
    return;
  }
  if (tipo === "fixos") {
    const st = (f) => f.forma === CARTAO ? ["na fatura", ""] : c.pagosSet.has(f.id + "|" + f.chave) ? ["pago", "ok"] : f.data < hj ? ["atrasado", "bad"] : ["a pagar", ""];
    return abreDetalhe(`Contas fixas de ${mes}`, `Total: <b>${brl(c.fxT)}</b>${emHoras(c.fxT, "só para pagar as contas fixas")}${c.fxPend ? ` · ${brl(c.fxPend)} ainda a pagar` : ""}`,
      [{ itens: c.fx.map((f) => ({ d: ddmm(f.data), t: f.descricao, tag: st(f)[0], tagCls: st(f)[1], s: [tipoDoFixo(f)[0] + (f.ate ? " " + ateCurto(f.ate) : ""), f.categoria, f.forma ? pagoCom({ ...f, parcelas: 1 }) : ""].filter(Boolean).join(" · "), v: brl(f.valor), ref: { k: "fixo", id: f.id } })),
        vazio: "Nenhuma conta fixa neste mês." }], ["Abrir contas fixas", "f"]);
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
    if (v > VALOR_MAX) { toast(ALTO_DEMAIS); return $("limValor").focus(); }
    if (v > 0) lim[nome] = round2(v); else delete lim[nome];
    S.prefs.limites = lim; salvaPrefs(); $("dlg").close(); render();
    toastOuFlash(v > 0 ? `Limite de ${brl(round2(v))} por mês para ${nome}.` : `${nome} ficou sem limite.`);
  });
}
["resumo", "resumo2", "kpis"].forEach((id) => {
  $(id).addEventListener("click", (e) => { const k = e.target.closest("[data-det]"); if (k) detalheKpi(k.dataset.det); });
  $(id).addEventListener("keydown", (e) => { const k = e.target.closest("[data-det]"); if (k && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); detalheKpi(k.dataset.det); } });
});

/* ================= ajustes e boas-vindas ================= */
const suporteHtml = () => {
  if (!SUPORTE_CONTATO) return "";
  const link = /^https?:/.test(SUPORTE_CONTATO);
  return `<p class="hint" style="margin:0">Precisa de ajuda? ${link ? `<a href="${esc(SUPORTE_CONTATO)}" target="_blank" rel="noopener">Fale com o suporte</a>` : `Escreva para <a href="mailto:${esc(SUPORTE_CONTATO)}">${esc(SUPORTE_CONTATO)}</a>`}.</p>`;
};
/**
 * Mudar o nome de uma categoria ou caixinha. Tudo o que já usa o nome antigo passa para o novo:
 * lançamentos, contas fixas, a meta, o limite e a foto. Se o nome novo já existe, junta as duas.
 */
function renomearCategoria(tipo, antigo, depois = ajustes) {
  const caixa = tipo === "Reserva", oque = caixa ? "caixinha" : "categoria";
  const usam = S.data.lancamentos.filter((x) => x.tipo === tipo && x.categoria === antigo).length
    + (tipo === "Reserva" ? 0 : S.data.fixos.filter((f) => (f.tipo === "Receita" ? "Receita" : "Despesa") === tipo && f.categoria === antigo).length);
  openDlg(`<h3>Mudar o nome da ${oque}</h3>
    <form id="rnForm" class="dlg-form" autocomplete="off">
      <label class="f wide">Novo nome<input class="in" id="rnNome" required maxlength="40" value="${esc(antigo)}"></label>
      <p class="hint wide" style="margin:0">${usam ? `${usam === 1 ? "1 lançamento usa" : `${usam} lançamentos e contas usam`} <b>${esc(antigo)}</b>: ${usam === 1 ? "ele passa" : "todos passam"} para o nome novo.` : `Nenhum lançamento usa <b>${esc(antigo)}</b> ainda.`}${caixa && metasDe()[antigo] ? " A meta vai junto." : ""}</p>
      <p class="auth-msg err wide" id="rnMsg"></p>
      <div class="actions wide"><button class="btn primary" type="submit">Salvar nome</button><button class="btn" type="button" id="rnVoltar">Voltar</button></div></form>`);
  const inp = $("rnNome"); inp.focus(); inp.select();
  $("rnVoltar").onclick = () => depois();
  $("rnForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const novo = inp.value.trim().replace(/\s+/g, " ");
    if (!novo) { $("rnMsg").textContent = "Escreva o nome."; return inp.focus(); }
    if (novo === antigo) return depois();
    const l = cats(tipo), igual = l.find((c) => c !== antigo && norm(c) === norm(novo));
    const destino = igual || novo;
    if (igual && !$("rnForm").dataset.junta) {
      $("rnForm").dataset.junta = "1";
      $("rnMsg").textContent = `Já existe ${igual}. Toque em Salvar nome de novo para juntar ${antigo} com ${igual}.`; return;
    }
    const btn = $("rnForm").querySelector("[type=submit]"); btn.disabled = true; btn.textContent = "Salvando…";
    const lancs = S.data.lancamentos.filter((x) => x.tipo === tipo && x.categoria === antigo);
    const fixos = tipo === "Reserva" ? [] : S.data.fixos.filter((f) => (f.tipo === "Receita" ? "Receita" : "Despesa") === tipo && f.categoria === antigo);
    const ok = await grava(async () => {
      for (const x of lancs) { await S.store.updateLancamento(x.id, { categoria: destino }); x.categoria = destino; }
      for (const f of fixos) { await S.store.updateFixo(f.id, { categoria: destino }); f.categoria = destino; }
    });
    if (!ok) { btn.disabled = false; btn.textContent = "Salvar nome"; render(); return; }
    // A lista fica na mesma ordem, com o nome novo no lugar do antigo (ou some, se juntou com outra).
    S.prefs.categorias = { ...(S.prefs.categorias || categoriasIniciais(S.data)), [tipo]: igual ? l.filter((c) => c !== antigo) : l.map((c) => (c === antigo ? novo : c)) };
    if (tipo === "Despesa" && S.prefs.limites?.[antigo] !== undefined) {
      const lim = { ...S.prefs.limites }; if (lim[destino] === undefined) lim[destino] = lim[antigo]; delete lim[antigo]; S.prefs.limites = lim;
    }
    if (caixa && metasDe()[antigo]) { const ms = metasDe(); if (!ms[destino]) ms[destino] = ms[antigo]; delete ms[antigo]; }
    if (caixa && S.prefs.metaPrincipal === antigo) S.prefs.metaPrincipal = destino;
    const fa = S.prefs.fotos?.[chaveFoto(tipo, antigo)];
    if (fa) { const f = { ...S.prefs.fotos }; if (!f[chaveFoto(tipo, destino)]) f[chaveFoto(tipo, destino)] = fa; delete f[chaveFoto(tipo, antigo)]; S.prefs.fotos = f; }
    salvaPrefs(); render(); depois(destino);
    toast(igual ? `${antigo} juntou com ${igual}.` : `Nome mudado: ${antigo} agora é ${novo}.`);
  });
}
/** A pessoa escolhe o desenho de uma categoria de gasto. "Voltar ao padrão" tira a escolha e volta o que o nome sugere. */
function escolheDesenho(cat, voltar = null) {
  const atual = iconeDaCategoria(cat, S.prefs.iconesCat), c = corCat(cat), padrao = iconeDaCategoria(cat, {});
  openDlg(`<h3>Desenho de ${esc(cat)}</h3>
    <p class="hint" style="margin:0 0 10px">Aparece ao lado de cada gasto dessa categoria, no Extrato e nas listas.</p>
    <div class="ic-grid" role="group" aria-label="Desenhos">${ICONES_CATEGORIA.map((i) => `<button type="button" class="ic-op${i === atual ? " sel" : ""}" data-i="${i}" style="--c:${c}" aria-pressed="${i === atual}" aria-label="${i}">${ico(i)}</button>`).join("")}</div>
    <div class="actions"><button class="btn" type="button" id="icPadrao"${S.prefs.iconesCat?.[cat] ? "" : " disabled"}>Voltar ao padrão</button><button class="btn" type="button" id="icVolta">Cancelar</button></div>`);
  const grava = async (i) => {
    const m = { ...(S.prefs.iconesCat || {}) };
    if (i && i !== padrao) m[cat] = i; else delete m[cat];
    S.prefs.iconesCat = m; await salvaPrefs(); render(); voltar ? voltar() : ajustes();
  };
  $("dlgBody").querySelectorAll("[data-i]").forEach((b) => (b.onclick = () => grava(b.dataset.i)));
  $("icPadrao").onclick = () => grava(null);
  $("icVolta").onclick = () => (voltar ? voltar() : ajustes());
}
function ajustes() {
  const first = primeiroMes(S.data) || mKey(hoje()), cur = mKey(hoje()), meses = [];
  for (let m = first, i = 0; m <= cur && i < 120; m = addM(m, 1), i++) meses.push(m);
  const desde = S.prefs.saldoDesde && meses.includes(S.prefs.saldoDesde) ? S.prefs.saldoDesde : first;
  const ini = Number(S.prefs.saldoInicial) || 0;
  const bloco = (tipo, titulo) => `<div class="aj-sec"><h4>${titulo}</h4><div class="chips">${
    cats(tipo).map((c) => `<span class="chip">${tipo === "Despesa" ? `<button type="button" class="chip-ic" data-ic="${esc(c)}" style="--c:${corCat(c)}" aria-label="Trocar o desenho de ${esc(c)}">${ico(iconeDaCategoria(c, S.prefs.iconesCat))}</button>` : ""}<button type="button" class="chip-nome" data-rn="${esc(c)}" data-tipo="${tipo}" aria-label="Mudar o nome de ${esc(c)}">${esc(c)}</button><button type="button" data-rm="${esc(c)}" data-tipo="${tipo}" aria-label="Remover ${esc(c)}">${ico("x")}</button></span>`).join("")}</div>
    <form class="aj-add" data-add="${tipo}" autocomplete="off"><input class="in" maxlength="30" placeholder="${tipo === "Reserva" ? "Novo destino" : "Nova categoria"}" aria-label="Adicionar em ${titulo.toLowerCase()}">${tipo === "Despesa" ? `<select class="in" data-pai aria-label="Dentro de qual categoria (opcional)"><option value="">Categoria própria</option>${cats(tipo).filter((c) => !c.includes(SEP)).map((c) => `<option>${esc(c)}</option>`).join("")}</select>` : ""}<button class="btn" type="submit">Adicionar</button></form></div>`;
  openDlg(`<h3>Ajustes</h3>
    ${bloco("Despesa", "Categorias de gasto")}${bloco("Receita", "Categorias de entrada")}${bloco("Reserva", "Onde você guarda dinheiro")}
    <p class="hint" style="margin:-4px 0 0">Toque no nome para mudar. Remover uma categoria não apaga os lançamentos que já usam ela.</p>
    <div class="aj-sec"><h4>Aparência</h4>
      <label class="f">Tema<select class="in" id="ajTema"><option value="escuro">Escuro</option><option value="claro"${document.documentElement.dataset.tema === "claro" ? " selected" : ""}>Claro</option></select></label>
      <label class="f">Tamanho da letra<select class="in" id="ajLetra"><option value="">Normal</option><option value="grande"${document.documentElement.dataset.letra === "grande" ? " selected" : ""}>Grande</option><option value="maior"${document.documentElement.dataset.letra === "maior" ? " selected" : ""}>Maior</option></select></label>
      <label class="check"><input type="checkbox" id="ajContraste" ${document.documentElement.dataset.contraste === "alto" ? "checked" : ""}> Contraste alto (letras mais escuras e bordas mais fortes)</label>
    </div>
    ${S.store?.kind === "supabase" ? `<div class="aj-sec" id="ajSeg" hidden><h4>Segurança</h4>
      <label class="check"><input type="checkbox" id="ajTrava" ${travaId() ? "checked" : ""}> Pedir a digital ou o rosto ao abrir o app</label>
      <p class="hint" style="margin:4px 0 0">Vale para este celular. Se não conseguir desbloquear, dá para entrar com o e-mail e a senha.</p><p class="hint" id="ajTravaMsg" role="alert"></p></div>` : ""}
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
  body.querySelectorAll("[data-rn]").forEach((b) => (b.onclick = () => renomearCategoria(b.dataset.tipo, b.dataset.rn)));
  body.querySelectorAll("[data-ic]").forEach((b) => (b.onclick = () => escolheDesenho(b.dataset.ic)));
  body.querySelectorAll("[data-rm]").forEach((b) => (b.onclick = async () => {
    const t = b.dataset.tipo, l = cats(t);
    if (l.length <= 1) return;
    const nome = b.dataset.rm, antes = S.prefs.categorias, usos = S.data.lancamentos.filter((x) => x.categoria === nome).length;
    S.prefs.categorias = { ...S.prefs.categorias, [t]: l.filter((c) => c !== nome) };
    await salvaPrefs(); render(); ajustes();
    // Um toque sem querer no × tirava a categoria de vez: agora dá para desfazer (a ordem volta igual).
    toastDesfazer(`Categoria ${nome} removida${usos ? `. Os ${usos} ${usos === 1 ? "lançamento que usa" : "lançamentos que usam"} ela continuam salvos` : ""}.`, async () => { S.prefs.categorias = antes; await salvaPrefs(); render(); ajustes(); });
  }));
  body.querySelectorAll("[data-add]").forEach((f) => f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const t = f.dataset.add, pai = f.querySelector("[data-pai]")?.value || "", bruto = f.querySelector("input").value.trim(), nome = pai && bruto ? nomeDeSub(pai, bruto.replace(/^.*›\s*/, "")) : bruto, l = cats(t);
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
  if ($("ajSeg")) biometriaDisponivel().then((ok) => { if ($("ajSeg")) $("ajSeg").hidden = !ok; });
  if ($("ajTrava")) $("ajTrava").onchange = async (e) => {
    if (!e.target.checked) { try { localStorage.removeItem("cg-trava"); } catch { /* nada */ } return toast("Bloqueio desligado neste celular."); }
    try { await ligaTrava($("whoName").textContent); toast("Pronto: o app vai pedir a digital ou o rosto ao abrir."); }
    catch { e.target.checked = false; $("ajTravaMsg").textContent = "Não deu para ligar agora. Confira se o celular tem digital ou rosto cadastrados e tente de novo."; }
  };
  $("ajTema").onchange = (e) => {
    const claro = e.target.value === "claro";
    if (claro) document.documentElement.dataset.tema = "claro"; else delete document.documentElement.dataset.tema;
    try { localStorage.setItem("cg-tema", claro ? "claro" : "escuro"); } catch { /* sem armazenamento: vale só agora */ }
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", claro ? "#0b2545" : "#0a0f16");
  };
  $("ajLetra").onchange = (e) => {
    const v = e.target.value; if (v) document.documentElement.dataset.letra = v; else delete document.documentElement.dataset.letra;
    try { if (v) localStorage.setItem("cg-letra", v); else localStorage.removeItem("cg-letra"); } catch { /* vale só agora */ }
  };
  $("ajContraste").onchange = (e) => {
    if (e.target.checked) document.documentElement.dataset.contraste = "alto"; else delete document.documentElement.dataset.contraste;
    try { if (e.target.checked) localStorage.setItem("cg-contraste", "alto"); else localStorage.removeItem("cg-contraste"); } catch { /* vale só agora */ }
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
    <p class="ec-txt">Isso apaga <b>para sempre</b> a conta <b>${esc(email)}</b> e tudo o que está nela: lançamentos, contas fixas, cartões e faturas, metas, limites, categorias e avisos. Não dá para desfazer.</p>
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
    <div class="menu-lista" style="display:grid;gap:8px"><button class="btn primary" type="button" id="lerFoto">${ico("camera")}Tirar foto</button><button class="btn" type="button" id="lerEscolher">${ico("imagem")}Escolher imagem ou PDF</button><button class="btn" type="button" id="lerQr">${ico("qr")}Ler QR code do Pix ou da nota</button>${IMPORTA_EXTRATO ? `<button class="btn" type="button" id="lerExtrato">${ico("subir")}Importar extrato do banco</button>` : ""}<button class="btn ghost" type="button" data-close>Cancelar</button></div>`);
  $("lerFoto").onclick = () => $("lerCamera").click();
  $("lerEscolher").onclick = () => $("lerGaleria").click();
  $("lerQr").onclick = abrirQr;
  if ($("lerExtrato")) $("lerExtrato").onclick = abrirExtrato;
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
  openDlg(`<h3>Ler com a câmera</h3>
    <p class="hint" style="margin:0 0 10px;font-size:13px">Aponte para o QR code do Pix ou do cupom fiscal: o app lê sozinho. Para comprovante da maquininha, boleto, fatura ou holerite, deixe o papel inteiro na tela e toque em Fotografar. O app mostra o que leu para você conferir antes de lançar. ${S.store?.kind === "supabase" ? "O código é lido no aparelho; na nota de mercado, o app busca o valor no site da Fazenda." : "Na demonstração, a nota de mercado vem sem o valor: com a sua conta, o app busca o valor no site da Fazenda."}</p>
    <div class="qr-cam" id="qrCam"><video id="qrVideo" playsinline muted></video><i aria-hidden="true"></i></div>
    <p class="auth-msg" id="qrMsg" role="status">Abrindo a câmera…</p>
    <div class="menu-lista" style="display:grid;gap:8px">
      <button class="btn primary" type="button" id="qrFoto" disabled>${ico("camera")}Fotografar o comprovante agora</button>
      <button class="btn" type="button" id="qrImagem">${ico("imagem")}Escolher foto ou PDF da galeria</button>
      <details class="qr-colar"><summary>Colar o código do Pix (copia e cola)</summary>
        <textarea class="in" id="qrTexto" rows="3" spellcheck="false" autocapitalize="none" placeholder="Cole aqui o código que começa com 000201…" aria-label="Código do Pix copia e cola"></textarea>
        <button class="btn" type="button" id="qrUsar">Usar este código</button></details>
      <button class="btn ghost" type="button" data-close>Cancelar</button></div>
    <input type="file" id="qrArquivo" accept="image/*" hidden>`);
  const msg = (t, kind = "") => { if ($("qrMsg")) { $("qrMsg").textContent = t; $("qrMsg").className = "auth-msg " + kind; } };
  // Tira a foto direto da câmera que já está aberta aqui: sem ir escolher a câmera do celular nem a galeria.
  $("qrFoto").onclick = () => {
    const v = $("qrVideo"); if (!v || v.readyState < 2 || !v.videoWidth) return msg("A câmera ainda está abrindo. Espere um instante.", "err");
    const tela = document.createElement("canvas"); tela.width = v.videoWidth; tela.height = v.videoHeight; tela.getContext("2d").drawImage(v, 0, 0);
    $("qrFoto").disabled = true; msg("Lendo o comprovante…");
    tela.toBlob((blob) => {
      if (!blob) { $("qrFoto").disabled = false; return msg("Não consegui tirar a foto. Tente de novo.", "err"); }
      desligaCamera(); processaLeitura(new File([blob], "comprovante.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.92);
  };
  $("qrImagem").onclick = () => $("lerGaleria").click();   // processaLeitura procura o QR code antes e, se não achar, lê o texto
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
    if ($("qrFoto")) $("qrFoto").disabled = false;
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
  openDlg(`<h3>Importar extrato do banco</h3>
    <p class="hint" style="margin:0 0 10px;font-size:13px">No app do seu banco, exporte o <b>extrato da conta</b> ou a <b>fatura do cartão</b> (CSV, OFX ou Excel) e escolha o arquivo aqui. O app vê sozinho qual é e mostra tudo para você conferir antes de lançar.</p>
    <ul class="dicas"><li>Extrato da conta: Pix, débito, boletos e entradas viram gastos e receitas do mês. Compra no crédito fica só na fatura, sem contar duas vezes.</li><li>Fatura do cartão: as compras entram no cartão e a fatura é montada sozinha.</li><li>Importar de novo não repete o que já entrou. O arquivo é lido no seu aparelho.</li></ul>
    <div class="menu-lista" style="display:grid;gap:8px"><button class="btn primary" type="button" id="extEscolher">${ico("subir")}Escolher o arquivo</button><button class="btn ghost" type="button" data-close>Cancelar</button></div>`);
  $("extEscolher").onclick = () => $("extratoIn").click();
}
$("btnLer").onclick = () => abrirQr();   // uma câmera só: QR code ao vivo e, no mesmo quadro, foto ou PDF do comprovante
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

/** O PDF tem muitas linhas (fatura ou extrato) e o app não sabe lê-las uma a uma: diz do que parece ser e o que fazer, em vez de tratar como um comprovante só. */
function pdfDeVariasLinhas(tipo, arquivo) {
  const fatura = tipo === "fatura";
  openDlg(`<h3>Este PDF tem várias linhas</h3>
    <p style="color:var(--ink-2);margin:0 0 10px">Parece ${fatura ? "uma <b>fatura de cartão</b>" : "um <b>extrato da conta</b>"}, com várias compras ou movimentos. Um comprovante tem um valor só; aqui o app não consegue separar cada linha com segurança.</p>
    ${IMPORTA_EXTRATO ? `<p class="hint" style="margin:0 0 12px">Para lançar tudo de uma vez, baixe ${fatura ? "a fatura" : "o extrato"} em <b>CSV</b> ou <b>OFX</b> no app do seu banco (procure Exportar ou Enviar por e-mail) e escolha esse arquivo em Importar extrato do banco.</p>` : `<p class="hint" style="margin:0 0 12px">Você pode lançar ${fatura ? "o total da fatura de uma vez" : "cada movimento"} à mão, ou ler só o total deste PDF.</p>`}
    <div class="menu-lista" style="display:grid;gap:8px">${IMPORTA_EXTRATO ? `<button class="btn primary" type="button" id="pdfImportar">${ico("subir")}Importar CSV ou OFX</button>` : ""}
      <button class="btn ${IMPORTA_EXTRATO ? "" : "primary"}" type="button" id="pdfUnico">Ler só o total como comprovante</button><button class="btn ghost" type="button" data-close>Cancelar</button></div>`);
  if ($("pdfImportar")) $("pdfImportar").onclick = abrirExtrato;
  $("pdfUnico").onclick = () => processaLeitura(arquivo, "", false, true);
}
async function processaLeitura(arquivo, senha = "", semCodigo = false, comoUnico = false) {
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
      const r = await lerPdf(arquivo, { senha, aoProgredir: anda("Lendo o PDF…"), parar: comoUnico ? null : (txt) => { const l = txt.split("\n"); return ehExtratoDeContaPdf(l) || ehExtratoNubankPdf(l) || Boolean(documentoDeVariasLinhas(l)); } });
      if (vez !== leitura) return;
      // Extrato da conta em PDF (o do Itaú junta vários meses): lê todas as páginas e vai para a conferência dos movimentos.
      if (!r.tela) {
        const todas = await textoDoPdf(arquivo, { senha, aoProgredir: anda("Lendo o extrato, todas as páginas…") });
        if (vez !== leitura) return;
        if (!IMPORTA_EXTRATO) return pdfDeVariasLinhas(documentoDeVariasLinhas(todas) || "extrato", arquivo);
        const ex = ehExtratoDeContaPdf(todas) ? leExtratoDeContaPdf(todas) : ehExtratoNubankPdf(todas) ? leExtratoNubankPdf(todas) : null;
        if (ex && ex.linhas.length > 1) return conferirConta({ linhas: ex.linhas, titular: ex.titular }, arquivo.name || "extrato.pdf");
        const tipo = documentoDeVariasLinhas(todas) || "extrato";
        if (tipo === "fatura") {   // fatura em PDF: as compras vão para a mesma tela da fatura do cartão
          const fp = leFaturaPdf(todas, hoje());
          if (fp.n >= 3) return importarExtrato(new File([fp.csv], (arquivo.name || "fatura").replace(/\.pdf$/i, "") + ".csv", { type: "text/csv" }));
        }
        return pdfDeVariasLinhas(tipo, arquivo);
      }
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
      <label class="f" data-g="gasto" id="lCartaoWrap" hidden>Cartão<select class="in" id="lCartao">${optsCartao(sugerido?.id, "", true)}</select></label>
      ${htmlNovoCartao("l", "gasto")}
      <label class="f" data-g="gasto" id="lParcWrap" hidden>Parcelas<select class="in" id="lParc">${optsParcelas(r.valor || 0, r.parcelas || 1)}</select></label>
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
    if (tipo === "gasto") { const cc = $("lForma").value === CARTAO; $("lCartaoWrap").hidden = !cc; $("lParcWrap").hidden = !cc; $("lNovo").hidden = !(cc && $("lCartao").value === NOVO_CARTAO); }
    else if (tipo === "fatura") { const k = $("lfCartao").value; $("lfNomeWrap").hidden = k !== ""; $("lfDica").hidden = k === "" || k === "?"; }
    $("lDataLbl").textContent = tipo === "entrada" ? "Dia em que recebeu" : "Data";
    $("lerSalvar").textContent = tipo === "fatura" ? "Salvar fatura" : tipo === "entrada" ? "Lançar entrada" : "Lançar gasto"; $("lerMsg").textContent = ""; avisado = "";
  };
  $("lTipoSeg").onclick = (e) => { const b = e.target.closest("button"); if (b) { tipo = b.dataset.lt; sync(); } };
  $("lForma").onchange = sync; $("lfCartao").onchange = sync; $("lCartao").onchange = sync;
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
      if (avisoValor(v)) return msg(avisoValor(v));
      if (!data) return msg(ent ? "Escolha o dia em que você recebeu." : "Escolha a data do gasto.");
      const chave = [tipo, data, round2(v)].join("|");
      // Mesmo valor no mesmo dia já lançado: pode ser o mesmo comprovante lido duas vezes.
      if (S.data.lancamentos.some((x) => x.tipo === T && x.data === data && round2(x.valor) === round2(v))
        && !confirma(chave, `Já existe ${ent ? "uma entrada" : "um gasto"} de ${brl(v)} em ${ddmm(data)}. Se for ${ent ? "outro recebimento" : "outra compra"}, toque em Salvar mesmo assim.`)) return;
      // Entrada fixa (como o salário cadastrado) já é lançada sozinha todo mês: lançar o holerite também contaria em dobro.
      const fixas = ent ? calcMes(S.data, mKey(data), hoje()).fr : [];
      if (fixas.length && !confirma(chave, `Você já tem entrada fixa em ${nomeMes(mKey(data))} (${fixas.map((f) => `${f.descricao} ${brl(f.valor)}`).join(", ")}), que o app lança sozinho. Se for o mesmo dinheiro, não lance de novo: ajuste o valor em Entradas fixas. Se for outro recebimento, toque em Salvar mesmo assim.`)) return;
      const forma = ent ? "" : $("lForma").value, cc = !ent && forma === CARTAO;
      let cartaoId = cc ? $("lCartao").value : "", extraCartao = "";
      if (cc && cartaoId === NOVO_CARTAO) {
        $("lerSalvar").disabled = true;
        const rc = await criaCartaoRapido("l"); $("lerSalvar").disabled = false;
        if (rc.erro) return msg(rc.erro);
        cartaoId = rc.id; extraCartao = avisoCartaoPadrao(rc);
      }
      const row = { data, descricao: $("lDesc").value.trim(), tipo: T, categoria: $(ent ? "leCat" : "lCat").value, forma, valor: round2(v), import_key: null,
        ...(cc ? { cartao_id: cartaoId || null, parcelas: Number($("lParc").value) || 1 } : {}) };
      $("lerSalvar").disabled = true;
      // O comprovante é reduzido agora, enquanto o endereço da miniatura ainda vale (ele é desfeito ao fechar o quadro).
      const comp = previa ? await jpegDoComprovante(previa).catch(() => null) : null;
      let novos; const ok = await grava(async () => { novos = await S.store.addLancamentos([row]); });
      if (!ok) { $("lerSalvar").disabled = false; return; }
      S.data.lancamentos.push(...novos); S.mes = mKey(data);
      const feito = (extra = "") => toastOuFlash(`${ent ? "Entrada lançada" : "Lançado"} pela leitura: ${row.descricao || row.categoria} · ${brl(row.valor)} em ${ddmm(data)}.${extra}${extraCartao}`);
      // Comprovante: nunca é guardado sozinho. Lançamento esperando internet ainda não existe no servidor,
      // então nem pergunta: a foto pode ser anexada depois, abrindo o lançamento.
      const lanc = novos[0], pede = comp && lanc && !lanc.pendente && typeof S.store.guardaComprovante === "function";
      render();
      if (pede) {
        // A tela de lançar só fecha depois da pergunta: fechar agora faria o celular voltar no histórico,
        // e essa volta fecharia a pergunta antes de a pessoa responder.
        $("dlg").addEventListener("close", () => setTimeout(() => fecharLancar(), 250), { once: true });
        pedeComprovante(lanc, comp, feito);
      } else { $("dlg").close(); fecharLancar(); feito(); }
      return;
    }
    const v = parseMoney($("lfValor").value), venc = $("lfVenc").value, id = $("lfCartao").value, status = $("lfSt").value;
    if (avisoValor(v, "350,00")) return msg(avisoValor(v, "350,00"));
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
  if (ehPdf(arquivo) || /^image\//.test(arquivo.type || "")) { try { $("dlg").close(); } catch { /* já fechado */ } return processaLeitura(arquivo); }   // fatura em PDF ou foto: vai para o leitor por foto
  let ext = null, fonteConta = null;
  try {
    if (ehPlanilha(arquivo)) {
      try { await carregaXLSX(); } catch { /* cai na mensagem abaixo */ }
      if (typeof XLSX === "undefined") return showBanner("Não foi possível abrir o leitor de Excel. Confira a internet e tente de novo.");
      const wb = XLSX.read(await arquivo.arrayBuffer(), { type: "array" });
      const folhas = wb.SheetNames.map((n) => XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: null }));
      const daConta = folhas.find((l) => pareceConta(l));
      // Fica com a aba que tem mais compras.
      if (daConta) fonteConta = { linhas: daConta };
      else ext = folhas.map((linhas) => leExtrato({ linhas, hoje: hoje(), nome: arquivo.name })).sort((a, b) => b.compras.length - a.compras.length)[0];
    } else {
      const texto = decodifica(new Uint8Array(await arquivo.arrayBuffer()));
      // O extrato da conta (Pix, débito, entradas) tem o sinal ao contrário do cartão: lê à parte, para não virar compra de cartão.
      if (pareceConta(separaCsv(texto))) fonteConta = { texto }; else ext = leExtrato({ texto, hoje: hoje(), nome: arquivo.name });
    }
  } catch (e) { console.error(e); }
  if (fonteConta) return conferirConta(fonteConta, arquivo.name || "extrato");
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
      ext.estornos.length ? `${plural(ext.estornos.length, "estorno", "estornos")} (${brl(soma(ext.estornos))})` : "",
      ext.saldos?.length ? `o saldo da fatura anterior, ${brl(soma(ext.saldos))} (já foi contado no mês em que aquela fatura venceu)` : ""].filter(Boolean).join(" e ");
    openDlg(`<div class="ext"><h3>Fatura do cartão</h3>
      <p class="hint" style="margin:0 0 12px;font-size:13px"><b>${plural(est.itens.length, "compra", "compras")}</b> em ${esc(nomeArquivo)}. Não é a fatura do cartão? <button class="link" type="button" id="extOutro">Escolher outro arquivo</button></p>
      <form id="extForm" autocomplete="off">
      <div class="dlg-form">
        <label class="f">Cartão<select class="in" id="extCartao">${ativos.map((c) => `<option value="${esc(c.id)}"${c.id === k.id ? " selected" : ""}>${esc(c.nome)}</option>`).join("")}</select></label>
        <label class="f">Fatura<select class="in" id="extMes">${meses.map((m) => `<option value="${m}"${m === est.mes ? " selected" : ""}>vence em ${ddmmaa(vence(m))}</option>`).join("")}<option value="datas"${est.mes === "datas" ? " selected" : ""}>Pela data de cada compra</option></select></label>
      </div>
      ${info.fecha ? `<p class="hint" style="margin:8px 0 0">No arquivo${info.banco ? ` do ${esc(info.banco)}` : ""}: fatura de ${info.inicio ? ddmm(info.inicio) + " a " : ""}${ddmm(info.fecha)}${info.vencimento ? `, vence em ${ddmm(info.vencimento)}` : ""}.</p>` : ""}
      ${difere ? `<p class="aviso" style="margin:8px 0 0">No cadastro, o ${esc(k.nome)} ${dFech ? `fecha dia ${pad(k.fechamento)} e ` : ""}vence dia ${pad(k.vencimento)}. Pelo arquivo, ${[dFech ? `a fatura fecha dia ${pad(dFech)}` : "", dVenc ? `vence dia ${pad(dVenc)}` : ""].filter(Boolean).join(" e ")}. Se o arquivo é mesmo desse cartão, acerte o cadastro para as próximas faturas caírem no mês certo. <button class="link" type="button" id="extAcerta">Acertar o cartão</button></p>` : ""}
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
    if ($("extOutro")) $("extOutro").onclick = () => $("extratoIn").click();
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

/**
 * Extrato da conta (Pix, débito e entradas): lista os movimentos para conferir e lança tudo de uma vez.
 * Ficam de fora, com o motivo, o pagamento da fatura do cartão, o Pix pago no crédito e (se a pessoa disser o nome dela)
 * as transferências entre contas dela. Quem quiser pode incluir qualquer um deles mesmo assim.
 */
/** As categorias do tipo, mais as que o leitor do extrato sugere e a pessoa ainda não tem (Pix para pessoas, Casal): aparecem na escolha e entram na lista dela ao lançar. */
const comSugeridas = (tipo, extras) => { const l = cats(tipo), novas = extras.filter((c) => !l.includes(c)); if (!novas.length) return l; const i = l.lastIndexOf("Outros"); return i >= 0 ? [...l.slice(0, i), ...novas, ...l.slice(i)] : [...l, ...novas]; };
async function guardaCategoriasNovas(itens) {
  let mudou = false;
  for (const tipo of ["Despesa", "Receita"]) {
    const atuais = cats(tipo), novas = [...new Set(itens.filter((x) => x.tipo === tipo && x.categoria && !atuais.includes(x.categoria)).map((x) => x.categoria))];
    if (!novas.length) continue;
    const i = atuais.lastIndexOf("Outros"), lista = i >= 0 ? [...atuais.slice(0, i), ...novas, ...atuais.slice(i)] : [...atuais, ...novas];
    S.prefs.categorias = { ...(S.prefs.categorias || {}), [tipo]: lista }; mudou = true;
  }
  if (mudou) await salvaPrefs();
}
function conferirConta(fonte, nomeArquivo) {
  const catD = comSugeridas("Despesa", [CATEGORIA_PIX_PESSOA.Despesa, CATEGORIA_CASAL]), catR = comSugeridas("Receita", [CATEGORIA_PIX_PESSOA.Receita, CATEGORIA_CASAL]), est = { meuNome: S.prefs.meuNome || fonte.titular || "", marcados: new Map(), cats: new Map() };
  // Categoria: primeiro o que a pessoa já usou para a mesma descrição; depois o palpite pelo nome.
  const historico = new Map();
  [...S.data.lancamentos].sort((a, b) => a.data.localeCompare(b.data)).forEach((x) => { if (x.descricao && x.tipo !== "Reserva") historico.set(`${x.tipo}|${norm(x.descricao)}`, x.categoria); });
  const chaves = new Set([...S.data.lancamentos.map((x) => x.import_key), ...(S.prefs.chavesLigadas || [])].filter(Boolean));   // inclui o que já virou conta fixa
  const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;
  const formaDe = (m) => (m.tipo === "Receita" ? "" : m.forma === "Débito" ? "Débito" : m.forma === "Pix" || m.forma === "Transferência" ? "Pix" : /boleto/i.test(m.original) ? "Boleto" : "Débito");
  const monta = () => {
    const conta = leConta({ ...fonte, hoje: hoje(), meuNome: [est.meuNome, fonte.titular, nomeDoEmail($("whoName").textContent)].filter(Boolean), parceiro: nomesDoParceiro() });
    const doArquivo = new Set(conta.movimentos.map((m) => m.chave));
    const jaLancados = movimentosJaLancados(conta.movimentos.filter((m) => !chaves.has(m.chave) && !m.ignorar), S.data.lancamentos.filter((x) => !(x.import_key && doArquivo.has(x.import_key))));
    // O pagamento de uma conta fixa que já está cadastrada não vira gasto novo (contaria duas vezes): a conta fixa é marcada como paga.
    const fixas = movimentosDeContasFixas(conta.movimentos.filter((m) => !chaves.has(m.chave) && !m.ignorar && !jaLancados.has(m.chave)), S.data.fixos, S.data.pagos);
    const itens = conta.movimentos.map((m) => {
      // O que a pessoa já usou para a mesma descrição vale mais, a menos que fosse "Outros": isso é só o que ficou sem categoria, e a sugestão nova sabe mais.
      const antes = historico.get(`${m.tipo}|${norm(m.descricao)}`), lista = m.tipo === "Receita" ? catR : catD, c = antes && antes !== "Outros" ? antes : m.categoria;
      return { ...m, cat: est.cats.get(m.chave) || (lista.includes(c) ? c : lista.includes("Outros") ? "Outros" : lista[0]), estado: chaves.has(m.chave) ? "importada" : m.ignorar ? "fora" : jaLancados.has(m.chave) ? "parecida" : fixas.has(m.chave) ? "fixa" : "nova", fixa: fixas.get(m.chave) };
    });
    if (!itens.length) return openDlg(`<h3>Não achei movimentos nesse arquivo</h3><p style="color:var(--ink-2);margin:0 0 14px">O arquivo precisa ter data, valor e descrição em cada linha.</p><div class="actions"><button class="btn" type="button" data-close>Fechar</button></div>`);
    const ligado = (it) => (est.marcados.has(it.chave) ? est.marcados.get(it.chave) : it.estado === "nova" && !it.suspeita);
    const vis = itens.filter((it) => it.estado === "nova" || it.estado === "parecida" || it.estado === "fixa"), fora = itens.filter((it) => it.estado === "fora"), antigas = itens.filter((it) => it.estado === "importada").length;
    const linha = (it, extra = "") => `<li class="${it.estado}">
        <input type="checkbox" data-k="${esc(it.chave)}" ${ligado(it) ? "checked" : ""} aria-label="${it.tipo === "Receita" ? "Lançar entrada" : "Lançar gasto"}: ${esc(it.descricao)}">
        <span class="oque"><b>${esc(it.descricao)}${it.forma ? ` <span class="tag">${esc(it.forma)}</span>` : ""}</b>
          <span>${ddmm(it.data)}${it.estado === "parecida" ? ` · <em>parece já estar lançado</em>` : ""}${it.estado === "fixa" ? ` · <em>é a conta fixa ${esc(it.fixa.nome)}${it.fixa.jaPaga ? " (já paga)" : ""}</em>` : ""}${it.suspeita && it.estado === "nova" ? ` · <em>parece ida e volta</em>` : ""}${extra}</span></span>
        <b class="v ${it.tipo === "Receita" ? "pos" : ""}">${it.tipo === "Receita" ? "+ " : ""}${brl(it.valor)}</b>
        <select class="in" data-c="${esc(it.chave)}" aria-label="Categoria de ${esc(it.descricao)}">${opts(it.tipo === "Receita" ? catR : catD, it.cat)}</select></li>`;
    // Vários meses no mesmo arquivo (o extrato do Itaú junta 3 ou mais): um bloco por mês, fechado, com o total e uma caixa para marcar o mês inteiro.
    const mesesVis = [...new Set(vis.map((it) => it.data.slice(0, 7)))].sort().reverse();
    const listaVis = () => mesesVis.length < 2 ? `<ul class="ext-lista">${vis.map((it) => linha(it)).join("")}</ul>`
      : `<p class="hint" style="margin:0 0 6px">${mesesVis.length} meses no arquivo. Toque num mês para ver os movimentos ou marque o mês inteiro.</p>` + mesesVis.map((m) => `<details class="mes-bloco"><summary><input type="checkbox" data-mes="${m}" aria-label="Marcar ${nomeMes(m)} de ${m.slice(0, 4)} inteiro"><span class="mes-nome"><b>${nomeMes(m)} de ${m.slice(0, 4)}</b><span class="hint" data-mes-res="${m}"></span></span></summary><ul class="ext-lista">${vis.filter((it) => it.data.startsWith(m)).map((it) => linha(it)).join("")}</ul></details>`).join("");
    openDlg(`<div class="ext"><h3>Extrato da conta</h3>
      <p class="hint" style="margin:0 0 10px;font-size:13px"><b>${plural(itens.length, "movimento", "movimentos")}</b> de ${ddmm(conta.periodo.de)} a ${ddmm(conta.periodo.ate)} em ${esc(nomeArquivo)}. Não é o extrato da conta? <button class="link" type="button" id="extOutro">Escolher outro arquivo</button></p>
      <form id="ctForm">
      <details class="manual ct-nome" style="margin:0 0 10px"><summary>${est.meuNome ? "Seu nome: " + esc(est.meuNome) : "Passa dinheiro entre as suas contas? Diga o seu nome"}</summary>
        <label class="f wide" style="margin-top:8px">Seu nome completo, como no banco (opcional)<input class="in" id="ctNome" maxlength="60" autocomplete="off" value="${esc(est.meuNome)}" placeholder="Ex.: Maria da Silva"></label>
        <p class="hint" style="margin:4px 0 0">Com o seu nome, o dinheiro que você passa entre as suas próprias contas não conta como entrada nem como gasto.${casalAtivo() ? ` O mesmo vale para o que passa entre você e ${esc(nomeDoOutro())}, da conta de casal.` : ""}</p></details>
      ${vis.length ? `<div class="ext-topo"><b id="ctSoma"></b><button class="link" type="button" id="ctTodas"></button></div>
      ${listaVis()}` : `<div class="empty" style="margin-top:12px">Todos os movimentos desse arquivo já foram importados antes.</div>`}
      ${vis.some((it) => it.estado === "fixa") ? `<p class="hint" style="margin:8px 0 0">${plural(vis.filter((it) => it.estado === "fixa").length, "movimento é o pagamento de uma conta fixa que você já cadastrou", "movimentos são pagamentos de contas fixas que você já cadastrou")}. Eles começam desmarcados para o gasto não contar duas vezes, e a conta fixa é marcada como paga ao lançar.</p>` : ""}
      ${vis.some((it) => it.estado === "parecida") ? `<p class="hint" style="margin:8px 0 0">${plural(vis.filter((it) => it.estado === "parecida").length, "movimento parece já estar lançado", "movimentos parecem já estar lançados")} e começa${vis.filter((it) => it.estado === "parecida").length === 1 ? "" : "m"} desmarcado${vis.filter((it) => it.estado === "parecida").length === 1 ? "" : "s"}, para não duplicar. Marque se quiser lançar mesmo assim.</p>` : ""}
      ${vis.some((it) => it.suspeita && it.estado === "nova") ? `<p class="hint" style="margin:8px 0 0">${plural(vis.filter((it) => it.suspeita && it.estado === "nova").length, "movimento parece ida e volta", "movimentos parecem ida e volta")}: o mesmo valor saiu e entrou com a mesma pessoa em poucos dias, o que costuma ser dinheiro entre as suas contas. ${vis.filter((it) => it.suspeita && it.estado === "nova").length === 1 ? "Começa desmarcado" : "Começam desmarcados"}. Marque se for um gasto ou uma entrada de verdade.</p>` : ""}
      ${antigas ? `<p class="hint" style="margin:10px 0 0">${plural(antigas, "movimento já tinha sido importado","movimentos já tinham sido importados")} antes e ${antigas === 1 ? "ficou" : "ficaram"} de fora.</p>` : ""}
      ${fora.length ? `<details class="manual" style="margin-top:10px"><summary>${plural(fora.length, "movimento não entra", "movimentos não entram")} (por padrão)</summary>
        <p class="hint" style="margin:6px 0">Marque se quiser incluir algum mesmo assim.</p><ul class="ext-lista">${fora.map((it) => linha(it, ` · ${esc(it.motivo)}`)).join("")}</ul></details>` : ""}
      <p class="auth-msg err" id="ctMsg" style="margin:8px 0 0"></p>
      <div class="actions" style="margin-top:12px">${itens.some((x) => x.estado !== "importada") ? `<button class="btn primary" type="submit" id="ctSalvar">Lançar</button>` : ""}<button class="btn" type="button" data-close>Cancelar</button></div>
      </form></div>`);
    $("ctNome").onchange = async (e) => { est.meuNome = e.target.value.trim(); est.marcados.clear(); S.prefs.meuNome = est.meuNome; salvaPrefs(); monta(); };
    const paraMarcar = () => vis.filter((it) => it.estado === "fixa" && !ligado(it) && it.tipo === "Despesa" && !it.fixa.jaPaga);
    const todos = [...vis, ...fora], porChave = new Map(todos.map((it) => [it.chave, it])), conta2 = () => {
      const sel = todos.filter(ligado), saidas = round2(sel.filter((x) => x.tipo === "Despesa").reduce((t, x) => t + x.valor, 0)), entradas = round2(sel.filter((x) => x.tipo === "Receita").reduce((t, x) => t + x.valor, 0));
      if ($("ctSoma")) $("ctSoma").textContent = `${plural(sel.length, "marcado", "marcados")} · saídas ${brl(saidas)} · entradas ${brl(entradas)}`;
      const marcar = paraMarcar();
      if ($("ctSalvar")) { $("ctSalvar").textContent = sel.length || marcar.length ? `${sel.length ? `Lançar ${plural(sel.length, "movimento", "movimentos")}` : "Marcar"}${marcar.length ? `${sel.length ? " e marcar " : " "}${plural(marcar.length, "conta fixa", "contas fixas")} como ${marcar.length === 1 ? "paga" : "pagas"}` : ""}` : "Lançar"; $("ctSalvar").disabled = !sel.length && !marcar.length; }
      if ($("ctTodas")) $("ctTodas").textContent = vis.every(ligado) ? "Desmarcar todos" : "Marcar todos";
      $("dlgBody").querySelectorAll("[data-k]").forEach((b) => { const it = porChave.get(b.dataset.k); if (it) b.checked = ligado(it); });
      $("dlgBody").querySelectorAll("[data-mes]").forEach((cb) => {
        const l = vis.filter((it) => it.data.startsWith(cb.dataset.mes)), s = l.filter(ligado), soma = (tp) => brl(round2(s.filter((x) => x.tipo === tp).reduce((q, x) => q + x.valor, 0)));
        cb.checked = s.length === l.length; cb.indeterminate = s.length > 0 && s.length < l.length;
        $("dlgBody").querySelector(`[data-mes-res="${cb.dataset.mes}"]`).textContent = `${s.length} de ${l.length} · saídas ${soma("Despesa")} · entradas ${soma("Receita")}`;
      });
    };
    $("dlgBody").querySelectorAll("[data-k]").forEach((b) => (b.onchange = () => { est.marcados.set(b.dataset.k, b.checked); conta2(); }));
    $("dlgBody").querySelectorAll("[data-c]").forEach((b) => (b.onchange = () => est.cats.set(b.dataset.c, b.value)));
    if ($("extOutro")) $("extOutro").onclick = () => $("extratoIn").click();
    if ($("ctTodas")) $("ctTodas").onclick = () => { const tudo = vis.every(ligado); vis.forEach((it) => est.marcados.set(it.chave, !tudo)); conta2(); };
    $("dlgBody").querySelectorAll("[data-mes]").forEach((cb) => (cb.onchange = () => { vis.filter((it) => it.data.startsWith(cb.dataset.mes)).forEach((it) => est.marcados.set(it.chave, cb.checked)); conta2(); }));
    conta2();
    $("ctForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const sel = todos.filter(ligado), marcar = paraMarcar(); if (!sel.length && !marcar.length) return;
      const linhas = sel.map((it) => ({ data: it.data, descricao: it.descricao, tipo: it.tipo, categoria: it.cat, forma: formaDe(it), valor: it.valor, cartao_id: null, parcelas: 1, import_key: it.chave }));
      $("ctSalvar").disabled = true; $("ctSalvar").textContent = "Lançando…";
      await guardaCategoriasNovas(linhas);
      let novos = []; const ok = await grava(async () => { if (linhas.length) novos = await S.store.addLancamentos(linhas); for (const x of marcar) await S.store.setPago(x.fixa.fixoId, x.fixa.mes, true); });
      if (!ok) { $("ctSalvar").disabled = false; conta2(); return; }
      S.data.lancamentos.push(...novos);
      marcar.forEach((x) => { if (!S.data.pagos.some((p) => p.fixo_id === x.fixa.fixoId && p.mes === x.fixa.mes)) S.data.pagos.push({ fixo_id: x.fixa.fixoId, mes: x.fixa.mes }); });
      const ultimo = [...sel, ...marcar].map((x) => x.data).sort().pop();
      S.mes = mKey(ultimo); S.view = "listas"; S.tab = "l";
      $("dlg").close(); fecharLancar(); render();
      const s = sel.filter((x) => x.tipo === "Despesa").length, en = sel.length - s;
      setTimeout(() => { const n = contasQueSeRepetem(S.data.lancamentos, S.data.fixos, hoje()).length; if (n) showBanner(`Achei ${plural(n, "conta que se repete", "contas que se repetem")} todo mês. Quer deixar como conta fixa?`, [["Ver", () => { showBanner(""); arrumarFixas(); }], ["Agora não", () => showBanner("")]]); }, 900);
      const nMeses = new Set(sel.map((x) => x.data.slice(0, 7))).size; toastOuFlash(`${plural(novos.length, "movimento lançado", "movimentos lançados")}: ${plural(s, "gasto", "gastos")} e ${plural(en, "entrada", "entradas")}${nMeses > 1 ? `, em ${nMeses} meses` : ""}.${marcar.length ? ` ${plural(marcar.length, "conta fixa marcada como paga", "contas fixas marcadas como pagas")}.` : ""}`);
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
  if (!r.ok || !j.chavePublica) throw new Error("O serviço de avisos ainda não está no ar. Tente de novo mais tarde.");
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
      if (!r.ok) throw new Error(j.erro === "Pedido não reconhecido." ? "O serviço de avisos ainda está na versão antiga. Tente de novo mais tarde." : j.erro || "O serviço de avisos ainda não está no ar.");
      const email = j.email === "enviado" ? "E-mail enviado (olhe também o spam)." : j.email === "desligado" ? "E-mail desligado." : j.email === "não configurado" ? "O envio de e-mail ainda não foi configurado." : "O e-mail não saiu: " + j.email;
      const push = j.push.aparelhos ? `Notificação enviada para ${j.push.entregues} de ${j.push.aparelhos} ${j.push.aparelhos === 1 ? "aparelho" : "aparelhos"}.` : "Nenhum aparelho com notificação ligada.";
      diz(`${email} ${push}`, /não saiu/.test(email));
    } catch (err) { diz(/fetch|network/i.test(String(err?.message)) ? "Não consegui falar com o serviço de avisos. Confira a internet." : String(err?.message || err), true); }
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
    ${ja.length ? `<p class="gja">Já cadastrado: ${esc(lista3(ja.map((f) => f.descricao)))}. Para mudar um valor, use a aba ${ent ? "Entradas fixas" : "Contas fixas"}.</p>` : ""}
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
    ${nada ? "" : `<h4 class="sub-h">Qual é o seu foco agora?</h4><div class="gfoco" role="group" aria-label="Escolha um foco">
      <button type="button" data-foco="guardar">${ico("cofre")}Guardar dinheiro</button><button type="button" data-foco="gastos">${ico("grafico")}Controlar os gastos</button>
      <button type="button" data-foco="dividas">${ico("alvo")}Sair das dívidas</button><button type="button" data-foco="casa">${ico("casa")}Organizar a casa</button></div>`}
    ${suporteHtml()}
    <div class="actions">${temGasto ? `<button class="btn primary" data-close>Ver meu mês</button>` : `<button class="btn primary" type="button" id="gLancar">Lançar meu primeiro gasto</button><button class="btn" data-close>Ver meu mês</button>`}</div></div>`);
  if ($("gLancar")) $("gLancar").onclick = () => { $("dlg").close(); guiaLancar(); };
  $("dlgBody").querySelectorAll("[data-foco]").forEach((b) => (b.onclick = () => {
    const f = b.dataset.foco; S.prefs.foco = f; salvaPrefs(); $("dlg").close();
    const vaiPlanejar = () => { S.view = "listas"; S.tab = "m"; render(); noCelular() ? scrollTo(0, 0) : $("listas").scrollIntoView({ block: "start" }); };
    if (f === "guardar" || f === "gastos") { vaiPlanejar(); toast(f === "guardar" ? "Aqui você cria uma caixinha com meta e data." : "Aqui você define limites por categoria."); }
    else if (f === "dividas") calculadoras(); else minhaCasa();
  }));
  $("dlg").addEventListener("close", conviteAvisos, { once: true });
}
$("btnAjustes").onclick = ajustes;

/* ================= Aviso de erros ================= */
// Se o app quebrar no aparelho de alguém, o servidor recebe um aviso sem dado pessoal. Sem a tabela no banco, nada acontece.
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  ligaCapturaDeErros({ versao: APP_VERSAO, tela: () => [S.view, S.tab].filter(Boolean).join("/"),
    envia: (linha) => fetch(SUPABASE_URL + "/rest/v1/erros_app", { method: "POST", keepalive: true,
      headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify(linha) }) });
}
/* ================= PWA ================= */
let installEvt = null;
addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installEvt = e; if (S.loaded) renderInstalar(); });
addEventListener("appinstalled", () => { installEvt = null; if (S.loaded) render(); toast("Pronto! O Meus Gastos está instalado. Procure o ícone na tela inicial ou na lista de apps."); });
$("btnInstall").hidden = appInstalado();
$("btnInstall").onclick = () => instalarApp();
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
  // O app abre com a cópia guardada (sw.js) e a versão nova baixa por trás. Para ninguém ficar para sempre na versão velha:
  //  - se ela chega logo depois de abrir (a pessoa ainda não fez nada), o app recarrega sozinho;
  //  - senão, avisa e recarrega quando a pessoa voltar ao app depois de largá-lo, e só se não houver quadro aberto nem lançamento em andamento.
  const tinhaVersao = Boolean(navigator.serviceWorker.controller), abriuEm = Date.now();
  let versaoNova = false;
  const ocupado = () => document.querySelector("dialog[open]") || document.body.classList.contains("lancando") || (document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName));
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!tinhaVersao) return;   // primeira instalação: a tela já é a mais nova
    versaoNova = true;
    if (Date.now() - abriuEm < 15000 && !ocupado()) return location.reload();
    toastAcao("Tem uma versão nova do app.", "Atualizar", () => location.reload(), 0);
  });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && versaoNova && !ocupado()) location.reload(); });
  // Tocou numa notificação com o app já aberto: o lembrete do fim do dia leva direto para o lançamento.
  navigator.serviceWorker.addEventListener("message", (e) => {
    if (e.data?.tipo !== "notificacao" || !/[?&]atalho=lancar\b/.test(String(e.data.url || ""))) return;
    if (S.loaded && S.store && !$("app").hidden && !document.querySelector("dialog[open]")) { S.atalho = "lancar"; aoChegar(); }
  });
}

addEventListener("load", boot);
