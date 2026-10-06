// Conta de casal: o que é dos dois, como as preferências se juntam e quem lançou o quê. Rode com: node --test
import { test } from "node:test";
import assert from "node:assert/strict";
import { COMUM_DO_CASAL, comumDoCasal, juntaPrefsDoCasal, apelidoDoEmail, divisaoDoMes } from "../js/calc.js";

test("o que é dos dois: categorias, limites, metas e saldo; avisos e tema continuam de cada um", () => {
  const prefs = { categorias: { Despesa: ["Mercado"] }, limites: { Mercado: 800 }, teto: 3000, metas: { Viagem: { valor: 2000 } }, levarSaldo: true, saldoDesde: "2026-08", saldoInicial: 150, semGasto: ["2026-10-01"],
    avisos: { email: false }, boasVindas: true, inicioFora: ["evo"], guia: { fechado: true } };
  assert.deepEqual(Object.keys(comumDoCasal(prefs)), COMUM_DO_CASAL);
  assert.deepEqual(comumDoCasal({ teto: 0, categorias: null, avisos: {} }), { teto: 0 });   // zero conta (limite desligado); vazio não
  assert.deepEqual(comumDoCasal(null), {}); assert.deepEqual(comumDoCasal(undefined), {});
});

test("ao aceitar o convite: categorias e metas se somam; limite e saldo ficam os de quem convidou", () => {
  const convidou = { teto: 3000, limites: { Mercado: 800 }, saldoInicial: 100, categorias: { Despesa: ["Mercado", "Lazer"], Receita: ["Salário"] }, metas: { Carro: { valor: 9000 }, Viagem: { valor: 5000 } }, semGasto: ["2026-10-02"] };
  const aceitou = { teto: 500, limites: { Pets: 100 }, saldoInicial: 999, categorias: { Despesa: ["Mercado", "Pets"], Reserva: ["Reserva"] }, metas: { Viagem: { valor: 1 }, Casa: { valor: 50000 } }, semGasto: ["2026-10-01", "2026-10-02"], avisos: { email: false } };
  const j = juntaPrefsDoCasal(convidou, aceitou);
  assert.equal(j.teto, 3000); assert.deepEqual(j.limites, { Mercado: 800 }); assert.equal(j.saldoInicial, 100);
  assert.deepEqual(j.categorias, { Despesa: ["Mercado", "Lazer", "Pets"], Receita: ["Salário"], Reserva: ["Reserva"] });
  assert.deepEqual(j.metas, { Viagem: { valor: 5000 }, Casa: { valor: 50000 }, Carro: { valor: 9000 } });   // na meta de mesmo nome, vale a de quem convidou
  assert.deepEqual(j.semGasto, ["2026-10-01", "2026-10-02"]);
  assert.equal(j.avisos, undefined);   // o que é pessoal não entra
  // quem convidou nunca mexeu nas categorias: ficam as de quem aceitou; e o contrário
  assert.deepEqual(juntaPrefsDoCasal({ teto: 10 }, aceitou).categorias, aceitou.categorias);
  assert.deepEqual(juntaPrefsDoCasal(convidou, {}).categorias, convidou.categorias);
  assert.deepEqual(juntaPrefsDoCasal({}, {}), {});
  // quem convidou não tinha limite e quem aceitou tinha: fica o de quem aceitou (melhor do que perder)
  assert.equal(juntaPrefsDoCasal({}, { teto: 500 }).teto, 500);
});

test("nome curto a partir do e-mail", () => {
  assert.equal(apelidoDoEmail("bia.souza92@exemplo.com"), "Bia");
  assert.equal(apelidoDoEmail("MARCOS_henrique@x.com"), "Marcos");
  assert.equal(apelidoDoEmail("92joao@x.com"), "Joao");
  assert.equal(apelidoDoEmail("ana@x.com"), "Ana");
  assert.equal(apelidoDoEmail("123@x.com"), ""); assert.equal(apelidoDoEmail(""), ""); assert.equal(apelidoDoEmail(null), "");
});

test("quem lançou no mês: só gastos, pelo dono da linha", () => {
  const l = (user_id, data, valor, tipo = "Despesa") => ({ user_id, data, valor, tipo });
  const d = divisaoDoMes([l("eu", "2026-10-01", 10.1), l("eu", "2026-10-02", 20.2), l("ela", "2026-10-03", 300), l("ela", "2026-09-30", 999), l("ela", "2026-10-04", 5000, "Receita"),
    l(undefined, "2026-10-05", 1)], "2026-10", "eu");   // linha ainda sem dono (esperando a internet) conta como minha
  assert.deepEqual(d, { eu: { total: 31.3, n: 3 }, outro: { total: 300, n: 1 } });
  assert.deepEqual(divisaoDoMes([], "2026-10", "eu"), { eu: { total: 0, n: 0 }, outro: { total: 0, n: 0 } });
});
