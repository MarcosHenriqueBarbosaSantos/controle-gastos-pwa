import test from "node:test";
import assert from "node:assert/strict";
import { msAndamento, ritmoAoVivo, somaValores, custoTotalPorKm, ganhoDoTurno, duracaoMs, relogio, horasCurtas, custoVariavelPorKm, resumoTurnos, kmPorDia, metaDoDia, isoLocal, valeAPena, ganhoPorApp, melhorDiaDaSemana, ritmoHistorico, alcanceDaMeta, kmRealPorMes } from "../js/motorista.js";

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

test("vale a pena: desconta o custo do km e compara com o mínimo por hora", () => {
  const a = valeAPena({ valor: 20, km: 8, min: 20, custoKm: 0.5, minimoHora: 25 });   // 20 - 4 = 16 líquidos em 20 min = 48/h
  assert.equal(a.liquido, 16); assert.equal(a.liquidoPorHora, 48); assert.equal(a.porKm, 2.5); assert.equal(a.nivel, "boa");
  const b = valeAPena({ valor: 12, km: 10, min: 30, custoKm: 0.5, minimoHora: 25 });   // 12 - 5 = 7 em 30 min = 14/h
  assert.equal(b.nivel, "ruim");
  assert.equal(valeAPena({ valor: 5, km: 12, min: 20, custoKm: 0.6 }).nivel, "ruim");   // não cobre nem o custo do carro
  assert.equal(valeAPena({ valor: 18, km: 6, min: 0, custoKm: 0.5 }).nivel, "boa");   // sem minutos, compara por km: 3,00 contra 0,50
  assert.equal(valeAPena({ valor: 18, km: 6 }).nivel, "sem-base");
  assert.equal(valeAPena({ valor: 0, km: 6 }), null); assert.equal(valeAPena({ valor: 10, km: 0 }), null);
});

test("ganho por app: soma só turnos encerrados do período, do maior para o menor", () => {
  const ts = [turno(h(8), h(12), { uber: 100, "99": 50 }), turno(h(8, 0, 6), h(12, 0, 6), { uber: 40, indrive: 30 }), turno(h(8, 0, 20), h(12, 0, 20), { uber: 999 }), { id: "x", ini: h(9, 0, 5), apps: { uber: 500 } }];
  const r = ganhoPorApp(ts, "2026-10-01", "2026-10-10");
  assert.deepEqual(r.map((x) => [x.app, x.ganho, x.pct]), [["uber", 140, 64], ["99", 50, 23], ["indrive", 30, 14]]);
  assert.deepEqual(ganhoPorApp([], "2026-10-01", "2026-10-31"), []);
});

test("melhor dia da semana: exige dois dias e pelo menos 1 hora em cada", () => {
  // 5/10/2026 é segunda; 6/10 terça
  const ts = [turno(h(8), h(12), { uber: 80 }), turno(h(8, 0, 6), h(12, 0, 6), { uber: 160 })];
  assert.deepEqual(melhorDiaDaSemana(ts, "2026-10-01", "2026-10-31"), { dia: 2, ganhoPorHora: 40 });
  assert.equal(melhorDiaDaSemana([ts[0]], "2026-10-01", "2026-10-31"), null);
});

test("ritmo histórico: média e melhor dia só com 2 dias ou mais, nos últimos 30 dias", () => {
  const ts = [turno(h(8), h(14), { uber: 200 }), turno(h(8, 0, 6), h(14, 0, 6), { uber: 300 }), turno(h(8, 0, 6), h(10, 0, 6), { "99": 100 }), turno(h(8, 0, 1), h(12, 0, 1), { uber: 9999 })];
  assert.equal(ritmoHistorico([ts[0]], "2026-10-20"), null);
  const r = ritmoHistorico(ts, "2026-10-20");   // 1/10 também entra (19 dias antes); dias: 1, 5 e 6
  assert.equal(r.dias, 3); assert.equal(r.melhorDia, 9999);
  const r2_ = ritmoHistorico(ts.slice(0, 3), "2026-10-20");
  assert.equal(r2_.dias, 2); assert.equal(r2_.ganhoMedioDia, 300); assert.equal(r2_.melhorDia, 400); assert.equal(r2_.ganhoPorHora, 42.86);
  assert.equal(ritmoHistorico(ts.slice(0, 3), "2026-12-31"), null);   // fora da janela
});

test("alcance da meta: compara o bruto pedido com o ritmo real da pessoa", () => {
  const meta = { brutoDia: 633, falta: 4964, dias: 10, coberto: false };
  const hist = { dias: 10, ganhoMedioDia: 250, melhorDia: 400, ganhoPorHora: 40 };
  const a = alcanceDaMeta({ meta, hist, custoDia: 100 });
  assert.equal(a.nivel, "fora"); assert.equal(a.liquidoMedioDia, 150); assert.equal(a.projeta, 1500); assert.equal(a.faltaAinda, 3464);
  assert.equal(alcanceDaMeta({ meta: { ...meta, brutoDia: 300 }, hist, custoDia: 100 }).nivel, "puxado");
  assert.equal(alcanceDaMeta({ meta: { ...meta, brutoDia: 260 }, hist, custoDia: 100 }).nivel, "ok");
  assert.equal(alcanceDaMeta({ meta, hist: null }).nivel, "sem-historico");
  assert.equal(alcanceDaMeta({ meta: { ...meta, coberto: true, brutoDia: 0 }, hist }).nivel, "coberta");
});

test("km reais por mês: só com 14 dias de uso e projeta para 30 dias", () => {
  const dia = (d, km) => turno(h(8, 0, d), h(14, 0, d), { uber: 100 }, { km });
  assert.equal(kmRealPorMes([dia(5, 200), dia(6, 200)], "2026-10-10"), null);   // poucos dias de uso
  const ts = [dia(1, 250), dia(2, 250), dia(8, 250), dia(15, 250)];   // 15 dias de uso, 1000 km: 1000/15*30 = 2000
  assert.equal(kmRealPorMes(ts, "2026-10-15"), 2000);
  assert.equal(kmRealPorMes([], "2026-10-15"), null);
});
