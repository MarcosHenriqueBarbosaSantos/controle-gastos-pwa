import test from "node:test";
import assert from "node:assert/strict";
import { ganhoContraGasto, diasDoMes } from "../js/ganhogasto.js";

const ent = [{ data: "2026-10-05", valor: 3000 }, { data: "2026-10-20", valor: 3100 }];
const cus = [{ data: "2026-10-06", valor: 2000 }, { data: "2026-10-15", valor: 2980 }];

test("sem ganho e sem gasto não há painel", () => {
  assert.equal(ganhoContraGasto({ mes: "2026-10", hojeISO: "2026-10-24" }), null);
});

test("ganho, gasto, sobra e o dia em que o ganho cobriu o gasto", () => {
  const r = ganhoContraGasto({ entradas: ent, custos: cus, horasTurnos: 61, mes: "2026-10", hojeISO: "2026-10-24" });
  assert.equal(r.ganho, 6100); assert.equal(r.gasto, 4980); assert.equal(r.sobra, 1120);
  assert.equal(r.diaQuitado, "2026-10-20"); assert.equal(r.previsto, false);
  assert.equal(r.origemHoras, "turnos"); assert.equal(r.valorHora, 100);
  assert.equal(r.horasDoGasto, 49.8); assert.equal(r.horasDaSobra, 11.2);
});

test("entrada que ainda vai chegar deixa o dia como previsto", () => {
  const r = ganhoContraGasto({ entradas: ent, custos: cus, mes: "2026-10", hojeISO: "2026-10-10" });
  assert.equal(r.diaQuitado, "2026-10-20"); assert.equal(r.previsto, true);
});

test("sem turnos usa as horas por semana informadas, só dos dias que já passaram", () => {
  const r = ganhoContraGasto({ entradas: ent, custos: cus, horasSemana: 44, mes: "2026-10", hojeISO: "2026-10-14" });
  assert.equal(r.origemHoras, "estimada"); assert.equal(r.horas, 88);
});

test("sem nenhuma hora, mostra só ganho, gasto e sobra", () => {
  const r = ganhoContraGasto({ entradas: ent, custos: cus, mes: "2026-10", hojeISO: "2026-10-24" });
  assert.equal(r.horas, null); assert.equal(r.horasDoGasto, null); assert.equal(r.sobra, 1120);
});

test("gasto maior que o ganho: sobra negativa e nenhum dia quitado", () => {
  const r = ganhoContraGasto({ entradas: [{ data: "2026-10-05", valor: 1000 }], custos: [{ data: "2026-10-06", valor: 1500 }], horasTurnos: 10, mes: "2026-10", hojeISO: "2026-10-24" });
  assert.equal(r.sobra, -500); assert.equal(r.diaQuitado, null); assert.equal(r.horasDaSobra, null);
});

test("dias do mês: passado inteiro, atual até hoje, futuro nenhum", () => {
  assert.deepEqual(diasDoMes("2026-02", "2026-10-24"), { total: 28, passados: 28 });
  assert.deepEqual(diasDoMes("2026-10", "2026-10-24"), { total: 31, passados: 24 });
  assert.deepEqual(diasDoMes("2026-11", "2026-10-24"), { total: 30, passados: 0 });
});
