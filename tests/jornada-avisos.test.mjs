import test from "node:test";
import assert from "node:assert/strict";
import { lembreteDaJornada, avisoDaJornada } from "../supabase/functions/avisos/mensagem.js";

const H = 3600000, ini = Date.UTC(2026, 10, 8, 12, 0, 0);
test("jornada: antes de 3 horas sem lançar, nada", () => {
  assert.equal(lembreteDaJornada({ ini }, ini + 2 * H), null);
  assert.equal(lembreteDaJornada(null, ini), null);
});
test("jornada: 3 horas sem lançar avisa, e a chave muda a cada 3 horas", () => {
  const a = lembreteDaJornada({ ini }, ini + 3 * H + 60000), b = lembreteDaJornada({ ini }, ini + 5 * H), c = lembreteDaJornada({ ini }, ini + 6 * H + 1);
  assert.equal(a.tipo, "lancar"); assert.equal(a.horas, 3);
  assert.equal(a.chave, b.chave); assert.notEqual(a.chave, c.chave);
});
test("jornada: conta desde o último lançamento", () => {
  assert.equal(lembreteDaJornada({ ini, parcialEm: ini + 2 * H }, ini + 4 * H), null);
  assert.equal(lembreteDaJornada({ ini, parcialEm: ini + 2 * H }, ini + 5 * H).tipo, "lancar");
});
test("jornada: pausada não avisa; esquecida com 14 horas, descontando a pausa", () => {
  assert.equal(lembreteDaJornada({ ini, pausaIni: ini + H }, ini + 10 * H), null);
  assert.equal(lembreteDaJornada({ ini }, ini + 14 * H).tipo, "esquecida");
  assert.equal(lembreteDaJornada({ ini, pausado: 2 * H, parcialEm: ini + 13 * H }, ini + 15 * H), null);
});
test("jornada: texto e atalho da notificação", () => {
  const n = avisoDaJornada({ tipo: "lancar", horas: 3 }, "https://app.exemplo/");
  assert.equal(n.titulo, "Faz 3 horas que você não lança"); assert.ok(n.url.endsWith("?atalho=jornada"));
  assert.equal(avisoDaJornada({ tipo: "esquecida", horas: 15 }, "https://app.exemplo/").titulo, "Esqueceu de encerrar a jornada?");
});
