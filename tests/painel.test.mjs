import test from "node:test";
import assert from "node:assert/strict";
import { painelAtual, avisoOleo } from "../js/motorista.js";

test("painelAtual pega o maior km conhecido entre o anotado e as jornadas", () => {
  assert.equal(painelAtual(null, []), null);
  assert.deepEqual(painelAtual({ odo: 84000, em: 1 }, []), { odo: 84000, em: 1 });
  const turnos = [{ ini: 10, fim: 20, odoIni: 84000, odoFim: 84230 }, { ini: 30, fim: 40, odoIni: 84230 }];
  assert.deepEqual(painelAtual({ odo: 83000, em: 5 }, turnos), { odo: 84230, em: 20 });
  assert.deepEqual(painelAtual({ odo: 90000, em: 50 }, turnos), { odo: 90000, em: 50 });
});

test("avisoOleo avisa perto da troca e quando já passou", () => {
  assert.equal(avisoOleo(85000, null), null);
  assert.equal(avisoOleo(0, { oleoKm: 80000 }), null);
  assert.deepEqual(avisoOleo(85000, { oleoKm: 80000 }), { prox: 90000, falta: 5000, cada: 10000, nivel: "ok" });
  assert.equal(avisoOleo(89200, { oleoKm: 80000 }).nivel, "perto");
  assert.equal(avisoOleo(90100, { oleoKm: 80000 }).nivel, "passou");
  assert.equal(avisoOleo(84500, { oleoKm: 80000, oleoCada: 5000 }).nivel, "perto");
});
