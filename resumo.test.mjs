// A cor do resumo no alto da tela (estadoDoMes).
import { test } from "node:test";
import assert from "node:assert/strict";
import { estadoDoMes } from "../js/calc.js";

// Mês de mentira: só os campos que o resumo usa. custo = fixos + dia a dia + faturas.
const mes = ({ rec = 3000, fixos = 1000, dia = 500, fat = 0, res = 0, proj, fase = "atual" } = {}) => {
  const custo = fixos + dia + fat;
  return { rec, fxCusto: fixos, vari: dia, fatT: fat, res, custo, proj: proj ?? custo, fase };
};

test("resumo: verde quando sobra e a previsão também sobra", () => {
  const e = estadoDoMes(mes({ proj: 2200 }));
  assert.equal(e.nivel, "ok"); assert.equal(e.projSobra, 800);
});

test("resumo: vermelho quando as saídas já passaram das entradas (o guardado conta como saída)", () => {
  assert.equal(estadoDoMes(mes({ rec: 1400 })).nivel, "estourado");
  const e = estadoDoMes(mes({ rec: 1600, res: 200 }));
  assert.equal(e.nivel, "estourado"); assert.match(e.motivo, /R\$ 100/);
});

test("resumo: laranja quando ainda sobra, mas no ritmo atual vai faltar", () => {
  const e = estadoDoMes(mes({ proj: 3300 }));
  assert.equal(e.nivel, "atencao"); assert.match(e.motivo, /faltam R\$ 300/);
});

test("resumo: o limite do mês também muda a cor", () => {
  assert.equal(estadoDoMes(mes({ proj: 1600 }), 1400).nivel, "estourado", "passou do limite");
  assert.equal(estadoDoMes(mes({ proj: 1600 }), 1800).nivel, "atencao", "83% do limite usado");
  assert.equal(estadoDoMes(mes({ dia: 100, proj: 1600 }), 1500).nivel, "atencao", "ainda dentro, mas a previsão passa do limite");
  assert.equal(estadoDoMes(mes({ dia: 100, proj: 1200 }), 3000).nivel, "ok");
});

test("resumo: mês fechado não olha a previsão; mês vazio fica neutro", () => {
  assert.equal(estadoDoMes(mes({ proj: 9000, fase: "passado" })).nivel, "ok");
  assert.equal(estadoDoMes(mes({ rec: 0, fixos: 0, dia: 0 })).nivel, "neutro");
  assert.equal(estadoDoMes(mes({ fase: "futuro" })).projSobra, null);
});
