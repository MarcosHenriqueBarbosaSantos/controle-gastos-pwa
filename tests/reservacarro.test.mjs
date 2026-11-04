// Reserva do carro e meta contra os km (modo motorista).
import test from "node:test";
import assert from "node:assert/strict";
import { reservaDoCarro, metaVsKm, reservasDoMotorista } from "../js/motorista.js";

// Carro: 1.200 km por mês. Manutenção R$ 1.200/ano, seguro R$ 2.400/ano e IPVA R$ 1.200/ano = R$ 400 por mês.
const veic = { kmMes: 1200, consumoGas: 10, precoGas: 6, manutAno: 1200, seguroAno: 2400, ipvaAno: 1200 };
const turno = (dia, km, ganho = 200) => ({ id: "t" + dia, ini: new Date(`2026-11-${String(dia).padStart(2, "0")}T08:00:00`).getTime(), fim: new Date(`2026-11-${String(dia).padStart(2, "0")}T16:00:00`).getTime(), apps: { uber: ganho }, km });
const guarda = (id, categoria, valor, extra = {}) => ({ id, data: "2026-11-03", tipo: "Reserva", categoria, forma: "", valor, ...extra });

test("reserva do carro: sem nada ligado nem guardado, o estado é 'sem' e o custo por dia rodado aparece", () => {
  const r = reservaDoCarro(veic, { turnos: [turno(2, 100), turnos3()], lancamentos: [], hoje: "2026-11-04", diasSemana: 6 });
  assert.equal(r.estado, "sem");
  assert.equal(r.porMes, 400);
  assert.equal(r.diasRodados, 2);
  assert.equal(r.devia, r.porDia * 2);
  assert.ok(r.porDia > 15 && r.porDia < 20);   // 400 / 26 dias de trabalho no mês
  function turnos3() { return turno(3, 100); }
});

test("reserva do carro: guardou menos do que devia (abaixo) e em dia (ok)", () => {
  const nomes = reservasDoMotorista(veic, { diasSemana: 6 }).itens.map((x) => x.nome);
  const turnos = [2, 3, 4].map((d) => turno(d, 100));
  const ativas = { manut: { nome: nomes[0], porMes: 100 } };
  let r = reservaDoCarro(veic, { turnos, lancamentos: [guarda("a", nomes[0], 10)], hoje: "2026-11-04", ativas });
  assert.equal(r.estado, "abaixo"); assert.equal(r.guardou, 10); assert.equal(r.falta, r.devia - 10);
  r = reservaDoCarro(veic, { turnos, lancamentos: [guarda("a", nomes[0], r.devia + 5)], hoje: "2026-11-04", ativas });
  assert.equal(r.estado, "ok"); assert.equal(r.falta, 0);
  // retirada tira do guardado; guardado em outro mês ou em outra caixinha não conta
  r = reservaDoCarro(veic, { turnos, lancamentos: [guarda("a", nomes[0], 100), guarda("b", nomes[0], 30, { forma: "Retirada" }), guarda("c", nomes[0], 500, { data: "2026-10-30" }), guarda("d", "Viagem", 500)], hoje: "2026-11-04", ativas });
  assert.equal(r.guardou, 70);
});

test("reserva do carro: sem o carro preenchido não há o que guardar", () => {
  assert.equal(reservaDoCarro({}, { turnos: [turno(2, 100)], lancamentos: [], hoje: "2026-11-04" }), null);
});

test("meta contra os km: no ritmo de hoje não fecha, e diz quantos km ou quanto por km faltam", () => {
  // 3 dias de 100 km e R$ 200 = R$ 2,00 por km e R$ 200 por dia. Meta de R$ 300 por dia.
  const turnos = [2, 3, 4].map((d) => turno(d, 100));
  const k = metaVsKm({ meta: { brutoDia: 300, coberto: false }, turnos, hoje: "2026-11-04", veic, diasSemana: 6 });
  assert.equal(k.ganhoPorKm, 2); assert.equal(k.kmAtual, 100); assert.equal(k.fazPorDia, 200);
  assert.equal(k.kmPreciso, 150); assert.equal(k.faltaKm, 50); assert.equal(k.ganhoKmPreciso, 3);
});

test("meta contra os km: sem aviso quando cabe, quando está coberta ou sem histórico", () => {
  const turnos = [2, 3, 4].map((d) => turno(d, 100));
  assert.equal(metaVsKm({ meta: { brutoDia: 150, coberto: false }, turnos, hoje: "2026-11-04", veic }), null);   // faz 200: cabe
  assert.equal(metaVsKm({ meta: { brutoDia: 0, coberto: true }, turnos, hoje: "2026-11-04", veic }), null);
  assert.equal(metaVsKm({ meta: { brutoDia: 300, coberto: false }, turnos: [], hoje: "2026-11-04", veic: {} }), null);
});

import { NOME_RESERVA_CARRO, PARTES_PADRAO } from "../js/motorista.js";

test("reserva do carro numa caixinha só: conta o que foi guardado em 'Reserva do carro' e as partes ligadas", () => {
  const turnos = [2, 3, 4].map((d) => turno(d, 100));
  const ativas = { carro: { nome: NOME_RESERVA_CARRO, porMes: 400 } };
  // só as partes do carro ligadas por padrão; ligando férias e 13º o valor sobe
  const padrao = reservaDoCarro(veic, { turnos, lancamentos: [], hoje: "2026-11-04", ativas, lucroMes: 6000 });
  const com = reservaDoCarro(veic, { turnos, lancamentos: [], hoje: "2026-11-04", ativas, lucroMes: 6000, partes: { ferias: true, decimo: true } });
  assert.equal(PARTES_PADRAO.ferias, false);
  assert.ok(com.porMes > padrao.porMes);
  assert.deepEqual(padrao.itens.map((x) => x.k), ["manut", "docs", "seguro"]);   // sem desvalorização no carro de teste
  // o guardado vem da categoria única, e as caixinhas antigas deixam de contar quando a reserva única está ligada
  const g = (id, categoria, valor) => ({ id, data: "2026-11-03", tipo: "Reserva", categoria, forma: "", valor });
  const r = reservaDoCarro(veic, { turnos, lancamentos: [g("a", NOME_RESERVA_CARRO, 30), g("b", "Seguro", 500)], hoje: "2026-11-04", ativas });
  assert.equal(r.guardou, 30); assert.equal(r.ligado, true);
  const antigo = reservaDoCarro(veic, { turnos, lancamentos: [g("b", "Seguro", 500)], hoje: "2026-11-04", ativas: {} });
  assert.equal(antigo.guardou, 500);   // quem ainda tem a caixinha antiga continua contando
});
