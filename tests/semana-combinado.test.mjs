import { test } from "node:test";
import assert from "node:assert/strict";
import { calcMes, semanaNoCombinado } from "../js/calc.js";

// Novembro de 2026: entra 3.000, aluguel 900 → sobra livre 2.100, ou 70 por dia (30 dias).
const base = (lancs) => ({ lancamentos: lancs, cartoes: [], faturas: [], pagos: [],
  fixos: [{ id: "s", tipo: "Receita", descricao: "Salário", categoria: "Salário", dia: 1, valor: 3000, forma: "", desde: "2026-01-01", ate: null },
    { id: "a", tipo: "Despesa", descricao: "Aluguel", categoria: "Moradia", dia: 1, valor: 900, forma: "Boleto", desde: "2026-01-01", ate: null }] });
const g = (data, valor) => ({ id: data + valor, tipo: "Despesa", data, valor, categoria: "Mercado", forma: "Pix" });

test("semana no combinado: na segunda, olha de domingo a sábado da semana que passou", () => {
  const st = base([g("2026-11-02", 100), g("2026-11-05", 200), g("2026-10-31", 999)]), hj = "2026-11-09";
  const r = semanaNoCombinado(st, calcMes(st, "2026-11", hj), hj);
  assert.deepEqual([r.de, r.ate, r.dias, r.gasto, r.combinado, r.sobrou, r.ok], ["2026-11-01", "2026-11-07", 7, 300, 490, 190, true]);
});
test("semana no combinado: passou do combinado, outro dia da semana e semana que caiu no mês passado", () => {
  const st = base([g("2026-11-03", 600)]);
  assert.equal(semanaNoCombinado(st, calcMes(st, "2026-11", "2026-11-08"), "2026-11-08").ok, false, "domingo: 600 > 490");
  assert.equal(semanaNoCombinado(st, calcMes(st, "2026-11", "2026-11-10"), "2026-11-10"), null, "terça não mostra");
  assert.equal(semanaNoCombinado(st, calcMes(st, "2026-11", "2026-11-02"), "2026-11-02"), null, "só o dia 1 caiu em novembro");
});
