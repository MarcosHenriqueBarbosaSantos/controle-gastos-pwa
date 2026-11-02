import test from "node:test";
import assert from "node:assert/strict";
import { calcMes, contasEmAtraso, proximosVencimentos } from "../js/calc.js";

const base = () => ({ lancamentos: [], pagos: [], faturas: [], cartoes: [], fixos: [
  { id: "a", descricao: "Aluguel", categoria: "Moradia", tipo: "Despesa", valor: 1000, dia: 10, desde: "2026-09-01", repete: "mensal" },
  { id: "b", descricao: "Luz", categoria: "Casa", tipo: "Despesa", valor: 200, dia: 15, desde: "2026-09-01", repete: "mensal" },
] });

test("conta deixada de fora sai só daquele mês", () => {
  const st = { ...base(), foraDoMes: ["a|2026-11-01"] };
  const nov = calcMes(st, "2026-11", "2026-11-02"), dez = calcMes(st, "2026-12", "2026-11-02");
  assert.equal(nov.custo, 200);
  assert.equal(nov.foraFx.length, 1);
  assert.equal(dez.custo, 1200);
});
test("conta de fora não aparece nos atrasos nem nos vencimentos", () => {
  const st = { ...base(), foraDoMes: ["a|2026-10-01"] };
  const at = contasEmAtraso(st, "2026-11-02");
  assert.ok(!at.itens.some((x) => x.id === "a" && x.mes === "2026-10"));
  assert.ok(at.itens.some((x) => x.id === "b" && x.mes === "2026-10"));
  const fora = { ...base(), foraDoMes: ["a|2026-11-01"] };
  assert.ok(!proximosVencimentos(fora, "2026-11-02", 30).some((x) => x.id === "a" && x.data === "2026-11-10"));
});

import { combustivelPorKm, custoDoVeiculo } from "../js/extras.js";
test("álcool e gasolina: a conta usa o mais barato por km", () => {
  const d = { kmMes: 1000, consumo: 8, precoLitro: 4, consumoGas: 10, precoGas: 6 };
  assert.deepEqual(combustivelPorKm(d), { alcool: 0.5, gasolina: 0.6, melhor: "alcool", porKm: 0.5 });
  assert.equal(custoDoVeiculo(d).partes.find((p) => p.k === "comb").valor, 500);
  assert.equal(combustivelPorKm({ consumoGas: 10, precoGas: 6 }).melhor, "gasolina");
  assert.equal(combustivelPorKm({}).porKm, null);
});

import { CATEGORIAS_DESAFIO, categoriaPodeEntrar, totaisDoDesafio, regrasEmTexto } from "../js/motorista.js";
test("desafio: só entram e só contam as categorias permitidas", () => {
  assert.deepEqual(CATEGORIAS_DESAFIO.carro, ["UberX", "Comfort", "Black"]);
  const r = { gastos: true, carro: false, vence: "km", categorias: ["Black"] };
  assert.equal(categoriaPodeEntrar(r, "UberX"), false);
  assert.equal(categoriaPodeEntrar(r, "Black"), true);
  assert.equal(categoriaPodeEntrar({}, "UberX"), true);
  const [m] = totaisDoDesafio([{ apelido: "A", dias: [{ dia: "2026-11-02", categoria: "Black", ganho: 100, km: 10, ms: 3600000 }, { dia: "2026-11-02", categoria: "UberX", ganho: 50, km: 10, ms: 3600000 }] }], r);
  assert.equal(m.ganho, 100);
  assert.ok(regrasEmTexto(r).some((x) => x.includes("Quem pode entrar: Black")));
});

import { reservasDoMotorista } from "../js/motorista.js";
test("salário de autônomo: o que guardar por mês e por dia rodado", () => {
  const veic = { kmMes: 4000, manutAno: 2400, ipvaAno: 1200, licAno: 0, seguroAno: 1200, valor: 60000, desvalPct: 10 };
  const r = reservasDoMotorista(veic, { diasSemana: 6, lucroMes: 3600 });
  assert.equal(r.diasMes, 26);
  assert.deepEqual(r.itens.map((x) => [x.k, x.porMes]), [["manut", 200], ["docs", 100], ["seguro", 100], ["troca", 500], ["ferias", 300], ["decimo", 300]]);
  assert.equal(r.porMes, 1500);
  assert.equal(r.porDia, 57.69);
  assert.equal(r.temVeiculo, true);
  const sem = reservasDoMotorista({}, {});
  assert.equal(sem.temVeiculo, false);
  assert.deepEqual(sem.itens.map((x) => [x.k, x.porMes]), [["ferias", 291.67], ["decimo", 291.67]]);
  assert.equal(reservasDoMotorista(veic, { veiculo: "moto" }).itens[0].nome, "Manutenção da moto");
});

import { corridasPrevistas } from "../js/motorista.js";
test("previsão do motorista conta as corridas que faltam", () => {
  const turno = (dia, ganho) => { const ini = new Date(dia + "T08:00:00").getTime(); return { ini, fim: ini + 8 * 36e5, apps: { uber: ganho } }; };
  const turnos = [turno("2026-10-30", 300), turno("2026-10-31", 500)];
  assert.deepEqual(corridasPrevistas(turnos, "2026-11-02", 7), { valor: 11600, dias: 29, porDia: 400 });
  assert.equal(corridasPrevistas([...turnos, turno("2026-11-02", 400)], "2026-11-02", 7).dias, 28);
  assert.equal(corridasPrevistas([turnos[0]], "2026-11-02", 6).valor, 0);
  const st = { lancamentos: [], pagos: [], faturas: [], cartoes: [], corridasPrevistas: 1000, fixos: [{ id: "a", descricao: "Aluguel", categoria: "Moradia", tipo: "Despesa", valor: 1000, dia: 10, desde: "2026-09-01", repete: "mensal" }] };
  assert.equal(calcMes(st, "2026-11", "2026-11-02").entraPrevisto, 1000);
  assert.equal(calcMes(st, "2026-10", "2026-11-02").entraPrevisto, 0);
});

import { planosSugeridos } from "../js/extras.js";
test("planos sugeridos: reserva e férias com a conta feita", () => {
  const [reserva, ferias] = planosSugeridos({ custoMes: 2000, rendaMes: 3000, sobraMes: 400 });
  assert.equal(reserva.alvo, 12000); assert.equal(reserva.porMes, 500); assert.equal(reserva.cabe, false);
  assert.equal(ferias.alvo, 3000); assert.equal(ferias.porMes, 250); assert.equal(ferias.cabe, true);
  assert.equal(planosSugeridos({}).length, 0);
});

import { turnoValeNoDesafio, placarDosDias } from "../js/motorista.js";
test("desafio: só vale jornada iniciada no app e com números possíveis", () => {
  const ini = new Date("2026-11-02T08:00:00").getTime(), t = (o) => ({ ini, fim: ini + 8 * 36e5, apps: { uber: 400 }, km: 200, ...o });
  assert.equal(turnoValeNoDesafio(t()), true);
  assert.equal(turnoValeNoDesafio(t({ manual: true })), false);
  assert.equal(turnoValeNoDesafio(t({ fim: ini + 10 * 60000 })), false);
  assert.equal(turnoValeNoDesafio(t({ apps: { uber: 3000 } })), false);
  assert.equal(turnoValeNoDesafio(t({ km: 2000 })), false);
  assert.equal(placarDosDias([t({ manual: true })], ["2026-11-02"], {}, null).length, 0);
  assert.equal(placarDosDias([t()], ["2026-11-02"], {}, null).length, 1);
});

import { resumoTurnos, kmTotalEstimado, porKmComVazio, vazioDoMotorista, periodoDe, andaPeriodo, barrasDoPeriodo, ganhoPorApp } from "../js/motorista.js";
const dia28 = () => { const ini = new Date("2026-10-28T06:00:00").getTime(); return { ini, fim: ini + 10.65 * 36e5, apps: { uber: 418.69, 99: 195.65, indrive: 104.62 }, viagensApp: { uber: 13, 99: 13, indrive: 2 }, viagens: 28, km: 300, kmPass: 180 }; };
test("km: o custo incide sobre tudo o que o carro andou, com ou sem passageiro", () => {
  const veic = { kmMes: 1000, manutAno: 12000 };
  const r = resumoTurnos([dia28()], "2026-10-28", "2026-10-28", veic);
  assert.equal(r.ganho, 718.96); assert.equal(r.km, 300); assert.equal(r.custo, 300);
  assert.equal(r.kmVazio, 120); assert.equal(r.pctVazio, 40); assert.equal(r.custoVazio, 120);
  assert.equal(r.ganhoPorKm, 2.4); assert.equal(r.ganhoPorKmPass, 3.99);
  const velho = resumoTurnos([{ ...dia28(), kmPass: undefined }], "2026-10-28", "2026-10-28", veic);
  assert.equal(velho.pctVazio, null); assert.equal(velho.custo, 300);
});
test("km: estimativa do total e corrida que paga o vazio", () => {
  assert.equal(kmTotalEstimado(60), 100); assert.equal(kmTotalEstimado(80, 20), 100);
  assert.equal(porKmComVazio(1.2, 40), 2);
  const t = (d) => ({ ...dia28(), ini: new Date(d + "T06:00:00").getTime(), fim: new Date(d + "T10:00:00").getTime() });
  assert.equal(vazioDoMotorista([t("2026-10-26"), t("2026-10-27")], "2026-10-28"), null);
  assert.equal(vazioDoMotorista([t("2026-10-26"), t("2026-10-27"), t("2026-10-28")], "2026-10-28"), 40);
});
test("ganhos: períodos, setas e barras", () => {
  assert.deepEqual(periodoDe("semana", "2026-10-28"), { de: "2026-10-26", ate: "2026-11-01" });
  assert.deepEqual(periodoDe("semana", "2026-11-01"), { de: "2026-10-26", ate: "2026-11-01" });
  assert.deepEqual(periodoDe("mes", "2026-02-10"), { de: "2026-02-01", ate: "2026-02-28" });
  assert.equal(andaPeriodo("dia", "2026-11-01", -1), "2026-10-31");
  assert.equal(andaPeriodo("semana", "2026-10-28", 1), "2026-11-04");
  assert.equal(andaPeriodo("mes", "2026-01-31", 1), "2026-02-01");
  assert.equal(andaPeriodo("ano", "2026-10-28", -1), "2025-01-01");
  const sem = barrasDoPeriodo([dia28()], "dia", "2026-10-28", {});
  assert.equal(sem.length, 7); assert.equal(sem[0].rot, "seg"); assert.equal(sem[2].ganho, 718.96); assert.equal(sem[2].atual, true); assert.equal(sem[6].iso, "2026-11-01");
  const mes = barrasDoPeriodo([dia28()], "mes", "2026-10-28", {});
  assert.equal(mes[0].de, "2026-10-01"); assert.equal(mes[0].ate, "2026-10-04"); assert.equal(mes.at(-1).ate, "2026-10-31"); assert.equal(mes.reduce((s, b) => s + b.ganho, 0), 718.96);
  assert.equal(barrasDoPeriodo([dia28()], "ano", "2026-10-28", {})[9].ganho, 718.96);
});
test("por aplicativo: quanto rendeu cada viagem", () => {
  const l = ganhoPorApp([dia28()], "2026-10-28", "2026-10-28");
  assert.equal(l[0].app, "uber"); assert.equal(l[0].porViagem, 32.21); assert.equal(l.find((x) => x.app === "99").porViagem, 15.05); assert.equal(l.find((x) => x.app === "indrive").viagens, 2);
});

import { linkDeCompra, parceiroValido } from "../js/extras.js";
test("compra com parceiro passa pelo hotlink dele", () => {
  const base = "https://pay.hotmart.com/X108304792E";
  assert.equal(linkDeCompra(base, "X95246702Y"), "https://go.hotmart.com/X95246702Y?dp=1");
  assert.equal(linkDeCompra(base, ""), base); assert.equal(linkDeCompra(base, undefined), base);
  assert.equal(linkDeCompra(base, "x/../evil"), base);
  assert.equal(parceiroValido("<script>"), false);
});
