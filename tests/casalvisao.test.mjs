// Conta de casal: o mês de cada um e dos dois juntos.
import test from "node:test";
import assert from "node:assert/strict";
import { dadosDe, saldosDoCasal } from "../js/casalvisao.js";

const EU = "u-eu", ELA = "u-julia", HOJE = "2026-10-20";
let n = 0;
const L = (user_id, data, valor, categoria, tipo = "Despesa") => ({ id: `l${++n}`, user_id, data, valor, categoria, tipo, descricao: categoria, forma: "Pix" });
const st = () => ({
  lancamentos: [L(EU, "2026-10-01", 3000, "Salário", "Receita"), L(EU, "2026-10-05", 800, "Mercado"), L(ELA, "2026-10-01", 2000, "Salário", "Receita"), L(ELA, "2026-10-06", 300, "Lazer")],
  fixos: [{ id: "f1", user_id: EU, descricao: "Aluguel", valor: 1000, categoria: "Moradia", dia: 10, desde: "2026-01-01", ate: null, forma: "Pix", tipo: "Despesa" },
    { id: "f2", user_id: ELA, descricao: "Academia", valor: 100, categoria: "Saúde", dia: 12, desde: "2026-01-01", ate: null, forma: "Pix", tipo: "Despesa" }],
  pagos: [{ fixo_id: "f1", mes: "2026-10-01" }], faturas: [], cartoes: [],
});

test("dados de cada pessoa: só o que é dela, e o que não diz de quem é fica com quem está olhando", () => {
  const s = st(); s.lancamentos.push({ id: "sem", data: "2026-10-07", valor: 10, categoria: "Outros", tipo: "Despesa", descricao: "x", forma: "Pix" });
  const eu = dadosDe(s, EU, EU), ela = dadosDe(s, ELA, EU);
  assert.equal(eu.lancamentos.length, 3); assert.equal(ela.lancamentos.length, 2);   // 2 dele + o sem dono, e 2 dela
  assert.deepEqual(eu.fixos.map((f) => f.id), ["f1"]); assert.deepEqual(ela.fixos.map((f) => f.id), ["f2"]);
  assert.deepEqual(eu.pagos.map((p) => p.fixo_id), ["f1"]); assert.equal(ela.pagos.length, 0);
});

test("o mês de cada um e dos dois juntos: entra, gasto e sobra", () => {
  const r = saldosDoCasal(st(), "2026-10", HOJE, EU, ELA);
  assert.equal(r.eu.rec, 3000); assert.equal(r.outro.rec, 2000); assert.equal(r.juntos.rec, 5000);
  assert.equal(r.eu.gasto, 1800); assert.equal(r.outro.gasto, 400);   // 800 + aluguel 1000 ; 300 + academia 100
  assert.equal(r.juntos.gasto, r.eu.gasto + r.outro.gasto);
  assert.ok(r.eu.sobra > 0 && r.outro.sobra > 0);
  assert.ok(Math.abs(r.juntos.sobra - (r.eu.sobra + r.outro.sobra)) < 1);   // a soma dos dois fecha com os dois juntos (a previsão do mês junta o ritmo de cada um)
});

test("um dos dois no vermelho aparece com sobra negativa, mesmo que juntos estejam no azul", () => {
  const s = st(); s.lancamentos.push(L(ELA, "2026-10-08", 3000, "Viagem"));
  const r = saldosDoCasal(s, "2026-10", HOJE, EU, ELA);
  assert.ok(r.outro.sobra < 0); assert.ok(r.eu.sobra > 0);
});
