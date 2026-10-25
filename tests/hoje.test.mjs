// Cartão "Hoje" do Início: quanto ainda cabe hoje e o que pede ação agora.
import test from "node:test";
import assert from "node:assert/strict";
import { podeGastarHoje, oQueFazerAgora, gastoAVistaDoDia, calcMes } from "../js/calc.js";

const L = (id, data, tipo, valor, extra = {}) => ({ id, data, tipo, categoria: tipo === "Receita" ? "Salário" : "Mercado", forma: "Pix", valor, descricao: "x", ...extra });
const base = () => ({ lancamentos: [], fixos: [], pagos: [], faturas: [], cartoes: [] });

test("pode gastar hoje: devolve o gasto de hoje à fatia do dia", () => {
  const hj = "2026-10-20", st = base();
  st.lancamentos.push(L("a", "2026-10-02", "Receita", 3100));
  let c = calcMes(st, "2026-10", hj);                    // saldo 3100, restam 12 dias (20..31)
  let p = podeGastarHoje(c, 0);
  assert.equal(p.restam, 12);
  assert.equal(p.fatia, round(3100 / 12));
  assert.equal(p.resta, p.fatia);
  // gastou 100 hoje: a fatia do dia não muda, o que ainda cabe diminui
  st.lancamentos.push(L("b", hj, "Despesa", 100));
  c = calcMes(st, "2026-10", hj);
  p = podeGastarHoje(c, gastoAVistaDoDia(st, hj));
  assert.equal(p.fatia, round(3100 / 12));
  assert.equal(p.resta, round(3100 / 12 - 100));
});

test("pode gastar hoje: sem sobra no mês a fatia é zero; fora do mês atual não existe", () => {
  const hj = "2026-10-20", st = base();
  st.lancamentos.push(L("a", "2026-10-02", "Receita", 100), L("b", "2026-10-03", "Despesa", 500));
  const c = calcMes(st, "2026-10", hj);
  const p = podeGastarHoje(c, 0);
  assert.equal(p.fatia, 0);
  assert.equal(podeGastarHoje(calcMes(st, "2026-09", hj), 0), null);
});

test("compra no cartão de hoje não entra no gasto do dia da conta", () => {
  const st = base();
  st.lancamentos.push(L("a", "2026-10-20", "Despesa", 80), L("b", "2026-10-20", "Despesa", 300, { forma: "Cartão de crédito" }));
  assert.equal(gastoAVistaDoDia(st, "2026-10-20"), 80);
});

test("o que fazer agora: atrasada, vence hoje, fatura sem valor e dia sem anotação, no máximo 3", () => {
  const st = base();
  st.fixos.push({ id: "f1", tipo: "Despesa", descricao: "Luz", categoria: "Moradia", dia: 20, valor: 150, forma: "Pix", desde: "2026-01-01", ate: null });
  const r = oQueFazerAgora(st, "2026-10-20", []);
  assert.deepEqual(r.map((x) => x.tipo), ["hoje", "dia"]);
  assert.equal(r[0].valor, 150);
  // anotou algo hoje: o item do dia some
  st.lancamentos.push(L("a", "2026-10-20", "Despesa", 10));
  assert.deepEqual(oQueFazerAgora(st, "2026-10-20", []).map((x) => x.tipo), ["hoje"]);
  // marcar "não gastei nada" também conta como feito
  const st2 = base();
  assert.deepEqual(oQueFazerAgora(st2, "2026-10-20", ["2026-10-20"]), []);
  // conta paga sai da lista
  st.pagos.push({ fixo_id: "f1", mes: "2026-10-01" });
  assert.deepEqual(oQueFazerAgora(st, "2026-10-20", []), []);
});

function round(v) { return Math.round(v * 100) / 100; }

import { semEntradaNoMes } from "../js/calc.js";
test("sem entrada no mês: com contas ou gastos e sem nenhuma entrada, o Início pede a entrada", () => {
  const hj = "2026-10-20", st = base();
  assert.equal(semEntradaNoMes(calcMes(st, "2026-10", hj)), false);                       // conta nova e vazia: tem o convite próprio
  st.lancamentos.push(L("a", "2026-10-05", "Despesa", 120));
  assert.equal(semEntradaNoMes(calcMes(st, "2026-10", hj)), true);                        // só gasto
  assert.equal(semEntradaNoMes(calcMes(st, "2026-09", hj)), false);                       // só vale no mês atual
  st.lancamentos.push(L("b", "2026-10-02", "Receita", 3000));
  assert.equal(semEntradaNoMes(calcMes(st, "2026-10", hj)), false);                       // com salário, volta ao normal
});

import { regraDeAceite } from "../js/motorista.js";
test("regraDeAceite: valor mínimo por km para decorar", () => {
  // custo 0,50/km, precisa de R$ 30 líquidos por hora, roda 25 km por hora: preciso = 0,5 + 1,2 = 1,7 por km
  const r = regraDeAceite({ custoKm: 0.5, minimoHora: 30, kmPorHora: 25 });
  assert.equal(r.aceita, 1.96); assert.equal(r.recusa, 1.45); assert.equal(r.base, "meta");
  // sem média de km por hora, só o custo do carro
  const c = regraDeAceite({ custoKm: 0.5, minimoHora: 30, kmPorHora: 0 });
  assert.equal(c.aceita, 1.3); assert.equal(c.recusa, 1); assert.equal(c.base, "carro", "o piso de R$ 1 por km sobe a recusa");
  const d = regraDeAceite({ custoKm: 1.2 }); assert.equal(d.aceita, 2.4); assert.equal(d.recusa, 1.56);
  const p = regraDeAceite({}); assert.equal(p.recusa, 1); assert.equal(p.aceita, 1.3); assert.equal(p.base, "minimo");
});

test("valorDaHora e horasDeTrabalho: informado, turnos, sem dados e formatos", async () => {
  const { valorDaHora, horasDeTrabalho } = await import("../js/motorista.js");
  const a = valorDaHora({ renda: 3000, horasSemana: 44 }, null);
  assert.equal(a.origem, "informado"); assert.equal(a.valor, 15.73);
  assert.equal(valorDaHora({}, { ms: 3600000, lucroPorHora: 20 }), null, "menos de 2 h de turno não vale");
  assert.deepEqual(valorDaHora({}, { ms: 8 * 3600000, lucroPorHora: 25 }), { valor: 25, origem: "turnos" });
  assert.equal(valorDaHora({ renda: 3000, horasSemana: 500 }, null), null);
  assert.equal(horasDeTrabalho(50, 25), "2h00");
  assert.equal(horasDeTrabalho(10, 25), "24 min");
  assert.equal(horasDeTrabalho(3920, 15.73), "249 h");
  assert.equal(horasDeTrabalho(100, 0), null);
  assert.equal(horasDeTrabalho(0, 20), null);
});

test("ganhosPorDia: sete dias em ordem, com zero no dia sem turno", async () => {
  const { ganhosPorDia } = await import("../js/motorista.js");
  const t = (dia, h, uber, comb = 0) => { const ini = new Date(2026, 9, dia, h).getTime(); return { ini, fim: ini + 3600000, apps: { uber }, comb }; };
  const l = ganhosPorDia([t(20, 8, 150, 40), t(22, 9, 200), t(22, 15, 50)], "2026-10-24", {});
  assert.equal(l.length, 7);
  assert.equal(l[0].iso, "2026-10-18"); assert.equal(l[6].iso, "2026-10-24");
  assert.deepEqual(l.find((x) => x.iso === "2026-10-20"), { iso: "2026-10-20", ganho: 150, lucro: 110, n: 1 });
  assert.equal(l.find((x) => x.iso === "2026-10-22").ganho, 250);
  assert.equal(l.find((x) => x.iso === "2026-10-21").ganho, 0);
});
