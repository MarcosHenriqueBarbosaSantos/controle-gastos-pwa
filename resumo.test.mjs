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
  assert.equal(e.nivel, "atencao"); assert.match(e.motivo, /fecha R\$ 300 no vermelho/);
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

test("o que sobra: entradas menos o que já tem dono; o dia a dia desconta; fecha com o resumo do início", async () => {
  const { sobraDoMes, raioX } = await import("../js/calc.js");
  const c = { rec: 6785, fxCusto: 5420, vari: 1228, fatT: 0, res: 300, custo: 6648, proj: 8061, fase: "atual", dias: 8, n: 31 };
  const s = sobraDoMes(c);
  assert.equal(s.comDono, 5720); assert.equal(s.livre, 1065); assert.equal(s.usado, 1228); assert.equal(s.resta, -163);
  assert.equal(s.resta, raioX(c).sobra);
  assert.equal(s.ideal, Math.round(1065 * 8 / 31 * 100) / 100); assert.equal(s.ritmo, "acima"); assert.equal(s.porDia, 0);
  const folga = sobraDoMes({ ...c, vari: 200 });
  assert.equal(folga.ritmo, "dentro"); assert.equal(folga.restam, 24); assert.equal(folga.porDia, Math.round(865 / 24 * 100) / 100);
  const retirou = sobraDoMes({ ...c, res: -100, vari: 0 });
  assert.equal(retirou.entra, 6885); assert.equal(retirou.resta, raioX({ ...c, res: -100, vari: 0 }).sobra);
});

test("sobra dia a dia: desce a cada gasto, termina onde o resumo diz e projeta o fim do mês", async () => {
  const { sobraDiaADia } = await import("../js/calc.js");
  const it = [{ tipo: "Despesa", data: "2026-10-01", valor: 100, forma: "Pix" }, { tipo: "Despesa", data: "2026-10-03", valor: 50, forma: "Débito" },
    { tipo: "Despesa", data: "2026-10-03", valor: 80, forma: "Cartão de crédito", cartao_id: "k" }, { tipo: "Receita", data: "2026-10-05", valor: 3000 }];
  const c = { rec: 3000, fxCusto: 2000, fatT: 0, res: 0, vari: 150, custo: 2150, proj: 2400, fase: "atual", dias: 4, n: 31, it };
  const g = sobraDiaADia(c);
  assert.deepEqual(g.pontos.map((p) => p.resta), [1000, 900, 900, 850, 850], "a compra no cartão não desce agora");
  assert.equal(g.pontos.at(-1).resta, 1000 - c.vari);
  assert.deepEqual(g.fim, { d: 31, resta: 600 }); assert.deepEqual(g.ideal[1], { d: 31, resta: 0 });
});
