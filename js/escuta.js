// A escuta do "Lançar por voz": liga o reconhecimento de fala do navegador e garante que ele sempre termina.
// Em alguns celulares o reconhecimento não avisa que acabou (o microfone ocupado por um gravador de tela, o serviço de voz
// do Google desligado, um navegador diferente do Chrome). Se a tela esperasse esse aviso, ficaria "Ouvindo…" para sempre.
// Aqui a tela nunca depende dele: tudo tem prazo, e o microfone é fechado à força quando o prazo acaba.
// Função pura em relação à tela (testada em tests/escuta.test.mjs, com um reconhecedor falso).

/** Prazos em milissegundos. */
export const TEMPOS = {
  dica: 6000,       // sem nada ouvido: mostra "se não responder, toque em Parar"
  semFala: 10000,   // sem nenhuma fala: desiste
  silencio: 3500,   // depois de ouvir algo, o silêncio que encerra
  aposParar: 1500,  // depois de pedir para parar, o prazo para o navegador avisar que acabou
  total: 30000,     // nenhuma escuta passa disso
};

/**
 * Cria o controlador da escuta.
 * @param {object} o
 * @param {Function} o.Reconhecedor  SpeechRecognition ou webkitSpeechRecognition
 * @param {(e:{texto?:string, dica?:boolean})=>void} o.aoMudar  texto parcial ouvido, ou a dica de que nada foi ouvido ainda
 * @param {(r:{texto:string, erro:string, motivo:string, audio:boolean})=>void} o.aoFinalizar  sempre chamada uma vez por escuta.
 *   motivo: "fim" (o navegador terminou), "sem-fala", "travou", "tempo", "nao-abriu" ou "cancelado" (a pessoa saiu da tela: ignore o texto)
 * @param {{set:Function, clear:Function}} [o.relogio]  para testar sem esperar
 */
export function criaEscuta({ Reconhecedor, aoMudar = () => {}, aoFinalizar = () => {}, lang = "pt-BR", tempos = {}, relogio = { set: (f, ms) => setTimeout(f, ms), clear: (t) => clearTimeout(t) } }) {
  const T = { ...TEMPOS, ...tempos };
  let atual = null;
  const iniciar = () => {
    if (atual || !Reconhecedor) return false;
    let r;
    try { r = new Reconhecedor(); } catch { aoFinalizar({ texto: "", erro: "", motivo: "nao-abriu", audio: false }); return false; }
    r.lang = lang; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
    let parcial = "", final = "", erro = "", audio = false, fim = false;
    const prazos = {};
    const limpa = () => { for (const k of Object.keys(prazos)) { relogio.clear(prazos[k]); delete prazos[k]; } };
    const termina = (motivo) => {
      if (fim) return;
      fim = true; limpa(); if (atual === sessao) atual = null;
      for (const ev of ["onresult", "onerror", "onend", "onaudiostart", "onspeechstart"]) { try { r[ev] = null; } catch { /* nada */ } }
      aoFinalizar({ texto: (final || parcial).trim(), erro, motivo, audio });
    };
    // Fecha o microfone à força (abort) e termina, aconteça o que acontecer com o aviso do navegador.
    const forca = (motivo) => { try { r.abort(); } catch { /* nada */ } termina(motivo); };
    const pede = () => { try { r.stop(); } catch { /* nada */ } relogio.clear(prazos.fim); prazos.fim = relogio.set(() => forca("travou"), T.aposParar); };
    const sessao = {
      parar: () => { if (!fim) pede(); },
      cancelar: () => { if (!fim) forca("cancelado"); },
    };
    r.onaudiostart = () => { audio = true; };
    r.onspeechstart = () => { relogio.clear(prazos.semFala); };
    r.onresult = (e) => {
      parcial = [...e.results].map((x) => x[0].transcript).join(" ").trim();
      if ([...e.results].every((x) => x.isFinal)) final = parcial;
      relogio.clear(prazos.semFala); relogio.clear(prazos.dica);
      // Depois de ouvir algo, um silêncio encerra: assim a escuta não espera para sempre por mais fala.
      relogio.clear(prazos.silencio); prazos.silencio = relogio.set(pede, T.silencio);
      aoMudar({ texto: parcial });
    };
    r.onerror = (e) => { erro = (e && e.error) || "erro"; };
    r.onend = () => termina("fim");
    prazos.dica = relogio.set(() => aoMudar({ dica: true }), T.dica);
    prazos.semFala = relogio.set(() => forca("sem-fala"), T.semFala);
    prazos.total = relogio.set(() => forca("tempo"), T.total);
    atual = sessao;
    try { r.start(); } catch { termina("nao-abriu"); return false; }
    return true;
  };
  return {
    iniciar,
    get ativa() { return Boolean(atual); },
    parar: () => atual?.parar(),
    cancelar: () => atual?.cancelar(),
  };
}

/** O que dizer à pessoa quando a escuta terminou sem nenhum texto. */
export function mensagemDeErro({ erro = "", motivo = "", audio = false } = {}) {
  if (erro === "not-allowed" || erro === "service-not-allowed") return "Para lançar por voz, permita o microfone para o Meus Gastos (no aviso do navegador ou nas permissões do app).";
  if (erro === "network") return "O reconhecimento de fala precisa de internet. Sem conexão, digite o gasto.";
  if (erro === "audio-capture") return "Não encontrei o microfone. Feche o que estiver usando ele (gravador de tela, ligação ou outro app) e tente de novo.";
  if (motivo === "nao-abriu") return "Não deu para abrir o microfone agora. Tente de novo.";
  if (motivo === "travou" || motivo === "tempo") return "O reconhecimento de voz travou neste celular. Digite o gasto, ou use o microfone do teclado, e tente de novo mais tarde.";
  if (motivo === "sem-fala" && !audio) return "O microfone não abriu. Se algum app estiver gravando a tela ou o áudio, pare a gravação e tente de novo. Ou digite o gasto.";
  if (erro === "no-speech" || motivo === "sem-fala" || motivo === "fim") return "Não ouvi nada. Toque em Falar e diga, por exemplo: “gastei 32 no mercado no débito”.";
  return "Não deu para ouvir agora. Tente de novo ou digite o gasto.";
}
