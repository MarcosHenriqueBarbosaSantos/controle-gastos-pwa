import test from "node:test";
import assert from "node:assert/strict";
import { ganhoPorKmAgora, limpaGanhosPorApp } from "../js/motorista.js";

test("acima do mínimo: mostra a folga", () => {
  const r = ganhoPorKmAgora({ ganho: 200, km: 80, minimoKm: 1.82 });
  assert.equal(r.veredito, "acima"); assert.equal(r.porKm, 2.5); assert.equal(r.folga, 54.4); assert.equal(r.falta, 0);
});
test("abaixo do mínimo: mostra o que falta", () => {
  const r = ganhoPorKmAgora({ ganho: 100, km: 80, minimoKm: 1.82 });
  assert.equal(r.veredito, "abaixo"); assert.equal(r.porKm, 1.25); assert.equal(r.falta, 45.6); assert.equal(r.folga, 0);
});
test("exatamente no mínimo conta como acima, sem folga", () => {
  const r = ganhoPorKmAgora({ ganho: 100, km: 50, minimoKm: 2 });
  assert.equal(r.veredito, "acima"); assert.equal(r.folga, 0);
});
test("sem ganho, sem km ou valores estranhos: nada a dizer", () => {
  assert.equal(ganhoPorKmAgora({ ganho: 0, km: 10, minimoKm: 2 }), null);
  assert.equal(ganhoPorKmAgora({ ganho: 50, km: 0, minimoKm: 2 }), null);
  assert.equal(ganhoPorKmAgora({ ganho: "x", km: 10, minimoKm: 2 }), null);
});
test("sem mínimo por km: só o valor por km", () => {
  const r = ganhoPorKmAgora({ ganho: 90, km: 30, minimoKm: 0 });
  assert.equal(r.porKm, 3); assert.equal(r.veredito, null);
});
test("limpaGanhosPorApp tira app desconhecido, zero e negativo", () => {
  assert.deepEqual(limpaGanhosPorApp({ uber: 85.5, "99": 0, xx: 10, indrive: -3, ifood: "40" }), { uber: 85.5, ifood: 40 });
  assert.deepEqual(limpaGanhosPorApp(null), {});
});
