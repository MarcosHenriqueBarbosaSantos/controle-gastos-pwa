/* Avisa o servidor quando o app quebra no aparelho de alguém, para a gente saber e consertar.
   Não manda nada pessoal: só a mensagem, o rastro do erro, a versão, a tela (sem os dados dela) e o navegador. */

const RUIDO = [/ResizeObserver loop/i, /^Script error\.?$/i, /Non-Error promise rejection/i, /chrome-extension:|moz-extension:|safari-extension:/i, /Failed to fetch|NetworkError|Load failed|AbortError/i];

/** Tira o que pode ser pessoal e corta o tamanho: números longos (CPF, cartão), e-mails e o que vem depois de "?" ou "#" no endereço. */
export function limpaTexto(t, max) {
  return String(t ?? "")
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[e-mail]")
    .replace(/\d[\d.\-/ ]{8,}\d/g, "[número]")
    .replace(/([?#])[^\s)]*/g, "$1")
    .slice(0, max);
}

/** Vale a pena avisar este erro? Ignora o barulho de extensões, internet caindo e avisos do navegador. */
export const vaiAvisar = (mensagem) => Boolean(mensagem) && !RUIDO.some((r) => r.test(String(mensagem)));

/** Monta a linha que vai para o servidor, ou null se for barulho. */
export function montaErro({ mensagem, pilha, versao, tela, navegador }) {
  if (!vaiAvisar(mensagem)) return null;
  return { versao: String(versao || "").slice(0, 20), mensagem: limpaTexto(mensagem, 500), pilha: limpaTexto(pilha, 2000) || null,
    tela: limpaTexto(tela, 100) || null, navegador: limpaTexto(navegador, 200) || null };
}

/**
 * Liga a captura de erros. `envia(linha)` leva a linha ao servidor (e pode falhar sem problema).
 * Manda no máximo `limite` erros diferentes por abertura do app, para um erro em laço não encher o servidor.
 */
export function ligaCapturaDeErros({ janela = globalThis, versao, envia, tela = () => "", limite = 5 }) {
  const vistos = new Set();
  const avisa = (mensagem, pilha) => {
    const linha = montaErro({ mensagem, pilha, versao, tela: tela(), navegador: janela.navigator?.userAgent });
    if (!linha || vistos.size >= limite || vistos.has(linha.mensagem)) return;
    vistos.add(linha.mensagem);
    try { Promise.resolve(envia(linha)).catch(() => {}); } catch { /* sem servidor: o app segue */ }
  };
  janela.addEventListener("error", (e) => avisa(e.message || e.error?.message, e.error?.stack));
  janela.addEventListener("unhandledrejection", (e) => avisa(e.reason?.message || String(e.reason ?? ""), e.reason?.stack));
  return avisa;
}
