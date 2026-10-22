import test from "node:test";
import assert from "node:assert/strict";
import { msAndamento, ritmoAoVivo, somaValores, custoTotalPorKm, ganhoDoTurno, duracaoMs, relogio, horasCurtas, custoVariavelPorKm, resumoTurnos, kmPorDia, metaDoDia, isoLocal } from "../js/motorista.js";

const h = (hh, mm = 0, dia = 5) => new Date(2026, 9, dia, hh, mm).getTime();   // outubro de 2026
const turno = (ini, fim, apps, extra = {}) => ({ id: String(ini), ini, fim, apps, ...extra });
const carro = { kmMes: 3000, consumo: 12, precoLitro: 6, manutAno: 3600, seguroAno: 2400 };

test("o ganho do turno soma os apps e ignora valor inválido", () => {
  assert.equal(ganhoDoTurno({ apps: { uber: 120.5, "99": 80, indrive: -5, outros: "x" } }), 200.5);
  assert.equal(ganhoDoTurno({}), 0);
});
test("relógio e horas curtas", () => {
  assert.equal(relogio(8130000), "02:15:30");
  assert.equal(horasCurtas(8100000), "2h15");
  assert.equal(horasCurtas(1800000), "30min");
  assert.equal(duracaoMs({ ini: 1000, fim: 4000 }), 3000);
  assert.equal(duracaoMs({ ini: 5000 }, 9000), 4000);
});
test("custo variável por km: combustível + manutenção, sem seguro", () => {
  // combustível 3000/12*6 = 1500; manutenção 300; total 1800 / 3000 km = 0,60
  assert.equal(custoVariavelPorKm(carro), 0.6);
  assert.equal(custoVariavelPorKm({}), null);
  assert.equal(custoVariavelPorKm({ consumo: 12, precoLitro: 6 }), null);   // sem km por mês não dá para dividir
});
test("resumo: lucro desconta o custo do carro por km; sem carro, só o combustível", () => {
  const t = [turno(h(18), h(23), { uber: 200, "99": 100 }, { km: 100, viagens: 10, comb: 50 }), turno(h(10, 0, 6), h(12, 0, 6), { uber: 50 }, { km: 40, viagens: 4 })];
  const r = resumoTurnos(t, "2026-10-05", "2026-10-05", carro);
  assert.equal(r.n, 1); assert.equal(r.ganho, 300); assert.equal(r.km, 100);
  // custo total por km = (1500+300+200+0)/3000 = 0,6667 -> 100 km = 66,67
  assert.equal(r.custo, 66.67); assert.equal(r.lucro, 233.33); assert.equal(r.comCarro, true);
  assert.equal(r.ganhoPorHora, 60); assert.equal(r.ganhoPorViagem, 30);
  const s = resumoTurnos(t, "2026-10-05", "2026-10-05", {});
  assert.equal(s.custo, 50); assert.equal(s.lucro, 250); assert.equal(s.comCarro, false);
  assert.equal(resumoTurnos(t, "2026-10-05", "2026-10-06", {}).n, 2);
});
test("turno em andamento não entra no resumo, e o dia é o do início", () => {
  const t = [{ id: "a", ini: h(23), apps: { uber: 10 } }, turno(h(22, 30), h(23, 59), { uber: 30 })];
  assert.equal(resumoTurnos(t, "2026-10-05", "2026-10-05", {}).n, 1);
  assert.equal(isoLocal(h(23)), "2026-10-05");
});
test("km por dia: média dos dias com histórico; sem histórico usa o veículo", () => {
  const t = [turno(h(10, 0, 1), h(12, 0, 1), {}, { km: 100 }), turno(h(10, 0, 2), h(12, 0, 2), {}, { km: 140 })];
  assert.equal(kmPorDia(t, carro, 6), 120);
  assert.equal(kmPorDia([], { kmMes: 2600 }, 6), 100.08);
  assert.equal(kmPorDia([], {}, 6), 0);
});
test("meta do dia: divide o que falta pelos dias que ele roda e soma o custo do carro", () => {
  // faltam 1.000; restam 10 dias, roda 6 por semana -> 9 dias (10*6/7=8,57 sobe para 9)
  const m = metaDoDia({ saldoSemHoje: -1000, restam: 10, diasSemana: 6, kmDia: 100, custoKm: 0.6 });
  assert.equal(m.falta, 1000); assert.equal(m.dias, 9); assert.equal(m.liquidoDia, 111.11); assert.equal(m.custoDia, 60); assert.equal(m.brutoDia, 171.11);
  assert.equal(m.coberto, false);
});
test("meta do dia: mês coberto não pede nada, e 'sobrar a mais' conta", () => {
  assert.equal(metaDoDia({ saldoSemHoje: 300, restam: 10 }).coberto, true);
  assert.equal(metaDoDia({ saldoSemHoje: 300, restam: 10 }).brutoDia, 0);
  const m = metaDoDia({ saldoSemHoje: 300, extra: 500, restam: 7, diasSemana: 7 });
  assert.equal(m.falta, 200); assert.equal(m.dias, 7);
  assert.equal(metaDoDia({ saldoSemHoje: -50, restam: 1, diasSemana: 1 }).dias, 1);
});

test("ritmo ao vivo: líquido por hora, mínimo da meta e veredito só depois de 15 minutos", () => {
  const h = 3600000;
  const a = ritmoAoVivo({ ganho: 150, gastos: 30, ms: 3 * h, liquidoDia: 200, horasDia: 8 });
  assert.equal(a.liquido, 120); assert.equal(a.porHora, 50); assert.equal(a.liquidoPorHora, 40); assert.equal(a.minimo, 25); assert.equal(a.veredito, "bom");
  assert.equal(ritmoAoVivo({ ganho: 60, gastos: 20, ms: 2 * h, liquidoDia: 200, horasDia: 8 }).veredito, "abaixo");
  assert.equal(ritmoAoVivo({ ganho: 30, gastos: 0, ms: 600000, liquidoDia: 200 }).veredito, null);   // 10 min: cedo demais
  assert.equal(ritmoAoVivo({ ganho: 0, gastos: 0, ms: 0, liquidoDia: 200 }).porHora, null);
  assert.equal(ritmoAoVivo({ ganho: 100, gastos: 0, ms: h, liquidoDia: 0 }).veredito, null);   // mês coberto: sem meta
  assert.equal(somaValores({ a: 10.5, b: "4", c: -2, d: "x" }), 14.5);
});

test("pausas não contam no tempo trabalhado", () => {
  const H = 3600000;
  assert.equal(duracaoMs({ ini: 0, fim: 5 * H, pausado: 1 * H }), 4 * H);
  assert.equal(msAndamento({ ini: 0, pausado: 0, pausaIni: null }, 2 * H), 2 * H);
  assert.equal(msAndamento({ ini: 0, pausado: H, pausaIni: 3 * H }, 5 * H), 2 * H);   // 5h no relógio, menos 1h já pausada e 2h de pausa agora
});
