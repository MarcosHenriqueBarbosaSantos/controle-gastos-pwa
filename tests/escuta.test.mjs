// Testes da escuta do "Lançar por voz": ela sempre termina, mesmo quando o navegador nunca avisa que acabou.
import test from "node:test";
import assert from "node:assert/strict";
import { criaEscuta, mensagemDeErro, TEMPOS } from "../js/escuta.js";

/** Um relógio que só anda quando o teste manda. */
function relogio() {
  let t = 0, id = 0; const fila = new Map();
  return {
    set: (f, ms) => { const i = ++id; fila.set(i, { f, em: t + ms }); return i; },
    clear: (i) => { fila.delete(i); },
    avanca(ms) {
      const alvo = t + ms;
      for (;;) {
        const prox = [...fila.entries()].filter(([, x]) => x.em <= alvo).sort((a, b) => a[1].em - b[1].em)[0];
        if (!prox) break;
        t = prox[1].em; fila.delete(prox[0]); prox[1].f();
      }
      t = alvo;
    },
    pendentes: () => fila.size,
  };
}
/** Um reconhecimento de fala de mentira. `comportamento` diz o que acontece quando a escuta é parada. */
function falso(comportamento = {}) {
  const instancias = [];
  class Falso {
    constructor() { if (comportamento.falhaNoConstrutor) throw new Error("sem suporte"); this.chamadas = []; instancias.push(this); }
    start() { this.chamadas.push("start"); if (comportamento.falhaNoStart) throw new Error("microfone ocupado"); }
    stop() { this.chamadas.push("stop"); if (comportamento.avisaFimAoParar) this.onend?.(); }
    abort() { this.chamadas.push("abort"); }
    fala(texto, final = false) { const x = [{ transcript: texto }]; x.isFinal = final; this.onresult?.({ results: [x] }); }
  }
  return { Falso, instancias };
}
function monta(comportamento, tempos) {
  const rel = relogio(), { Falso, instancias } = falso(comportamento), fins = [], mudancas = [];
  const escuta = criaEscuta({ Reconhecedor: Falso, relogio: rel, tempos, aoMudar: (m) => mudancas.push(m), aoFinalizar: (f) => fins.push(f) });
  return { escuta, rel, instancias, fins, mudancas, r: () => instancias.at(-1) };
}

test("uso normal: ouve, o navegador avisa o fim e o texto chega uma vez só", () => {
  const { escuta, rel, fins, r } = monta();
  assert.equal(escuta.iniciar(), true); assert.equal(escuta.ativa, true);
  r().onaudiostart(); r().onspeechstart(); r().fala("gastei 32", false); r().fala("gastei 32 no mercado", true); r().onend();
  assert.deepEqual(fins, [{ texto: "gastei 32 no mercado", erro: "", motivo: "fim", audio: true }]);
  assert.equal(escuta.ativa, false); assert.equal(rel.pendentes(), 0);
  rel.avanca(60000); assert.equal(fins.length, 1);   // nenhum prazo sobrou para repetir o fim
});

test("o navegador nunca avisa que acabou: depois do silêncio ele é parado e, se não responder, fechado à força", () => {
  const { escuta, rel, fins, r } = monta();
  escuta.iniciar(); r().onaudiostart(); r().fala("paguei 150 de luz");
  rel.avanca(TEMPOS.silencio - 1); assert.equal(fins.length, 0); assert.deepEqual(r().chamadas, ["start"]);
  rel.avanca(1); assert.deepEqual(r().chamadas, ["start", "stop"]); assert.equal(fins.length, 0);
  rel.avanca(TEMPOS.aposParar);
  assert.deepEqual(r().chamadas, ["start", "stop", "abort"]);
  assert.equal(fins.length, 1); assert.equal(fins[0].texto, "paguei 150 de luz"); assert.equal(fins[0].motivo, "travou");
  assert.equal(escuta.ativa, false); assert.equal(rel.pendentes(), 0);
});

test("nada é ouvido e nenhum aviso chega (o caso do vídeo): mostra a dica e desiste sozinho", () => {
  const { escuta, rel, fins, mudancas, r } = monta();
  escuta.iniciar();
  rel.avanca(TEMPOS.dica); assert.deepEqual(mudancas, [{ dica: true }]);
  rel.avanca(TEMPOS.semFala - TEMPOS.dica - 1); assert.equal(fins.length, 0); assert.equal(escuta.ativa, true);
  rel.avanca(1);
  assert.deepEqual(fins, [{ texto: "", erro: "", motivo: "sem-fala", audio: false }]);
  assert.ok(r().chamadas.includes("abort")); assert.equal(escuta.ativa, false);
  assert.match(mensagemDeErro(fins[0]), /gravando a tela/);   // o microfone nem chegou a abrir
});

test("a pessoa toca em Parar e o navegador não responde: termina em 1,5 segundo", () => {
  const { escuta, rel, fins, r } = monta();
  escuta.iniciar(); escuta.parar();
  assert.deepEqual(r().chamadas, ["start", "stop"]); assert.equal(fins.length, 0);
  rel.avanca(TEMPOS.aposParar - 1); assert.equal(fins.length, 0);
  rel.avanca(1); assert.equal(fins.length, 1); assert.equal(fins[0].motivo, "travou"); assert.equal(escuta.ativa, false);
});

test("Parar com o navegador respondendo: termina na hora e não repete no prazo", () => {
  const { escuta, rel, fins } = monta({ avisaFimAoParar: true });
  escuta.iniciar(); escuta.parar();
  assert.equal(fins.length, 1); assert.equal(fins[0].motivo, "fim");
  rel.avanca(60000); assert.equal(fins.length, 1);
});

test("sair da tela cancela: fecha o microfone, avisa com 'cancelado' e ignora o que vier depois", () => {
  const { escuta, fins, r } = monta();
  escuta.iniciar(); const inst = r(); inst.fala("gastei 10");
  escuta.cancelar();
  assert.equal(fins.length, 1); assert.equal(fins[0].motivo, "cancelado"); assert.ok(inst.chamadas.includes("abort")); assert.equal(escuta.ativa, false);
  inst.fala("e mais um"); inst.onend?.(); assert.equal(fins.length, 1);   // eventos tardios não fazem nada
  escuta.cancelar(); escuta.parar(); assert.equal(fins.length, 1);   // sem escuta, não faz nada
});

test("nenhuma escuta passa de 30 segundos, mesmo ouvindo fala sem parar", () => {
  const { escuta, rel, fins, r } = monta();
  escuta.iniciar(); r().onaudiostart();
  let passou = 0;
  while (!fins.length && passou < 60000) { rel.avanca(2000); passou += 2000; r().fala?.(`palavra ${passou}`); }
  assert.equal(fins[0].motivo, "tempo"); assert.ok(passou <= TEMPOS.total + 2000, `parou aos ${passou} ms`);
  assert.equal(escuta.ativa, false);
});

test("microfone que não abre: start() falha, ou o construtor falha", () => {
  const a = monta({ falhaNoStart: true });
  assert.equal(a.escuta.iniciar(), false); assert.equal(a.fins[0].motivo, "nao-abriu"); assert.equal(a.escuta.ativa, false); assert.equal(a.rel.pendentes(), 0);
  const b = monta({ falhaNoConstrutor: true });
  assert.equal(b.escuta.iniciar(), false); assert.equal(b.fins[0].motivo, "nao-abriu"); assert.equal(b.escuta.ativa, false);
  assert.equal(criaEscuta({ Reconhecedor: undefined }).iniciar(), false);   // navegador sem reconhecimento de fala
});

test("só uma escuta por vez, e dá para começar outra depois que a primeira termina", () => {
  const { escuta, instancias, r } = monta();
  assert.equal(escuta.iniciar(), true); assert.equal(escuta.iniciar(), false); assert.equal(instancias.length, 1);
  r().onend();
  assert.equal(escuta.iniciar(), true); assert.equal(instancias.length, 2);
});

test("o erro do navegador chega junto no fim e muda a mensagem", () => {
  for (const [erro, trecho] of [["not-allowed", /permita o microfone/], ["service-not-allowed", /permita o microfone/], ["network", /precisa de internet/], ["audio-capture", /gravador de tela/], ["no-speech", /Não ouvi nada/]]) {
    const { escuta, fins, r } = monta();
    escuta.iniciar(); r().onerror({ error: erro }); r().onend();
    assert.equal(fins[0].erro, erro); assert.match(mensagemDeErro(fins[0]), trecho, erro);
  }
});

test("mensagens: cada situação diz o que fazer", () => {
  assert.match(mensagemDeErro({ motivo: "travou" }), /travou neste celular/);
  assert.match(mensagemDeErro({ motivo: "tempo" }), /travou neste celular/);
  assert.match(mensagemDeErro({ motivo: "nao-abriu" }), /abrir o microfone/);
  assert.match(mensagemDeErro({ motivo: "sem-fala", audio: false }), /gravando a tela/);
  assert.match(mensagemDeErro({ motivo: "sem-fala", audio: true }), /Não ouvi nada/);
  assert.match(mensagemDeErro({ motivo: "fim" }), /Não ouvi nada/);
  assert.match(mensagemDeErro({ erro: "aborted", motivo: "fim" }), /Não ouvi nada/);   // fim sem texto nem erro conhecido
  assert.match(mensagemDeErro({ erro: "language-not-supported", motivo: "cancelado" }), /Não deu para ouvir/);
  assert.match(mensagemDeErro(), /Não deu para ouvir/);
});
