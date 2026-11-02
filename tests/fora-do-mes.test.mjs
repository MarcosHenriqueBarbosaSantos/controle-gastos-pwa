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
  assert.equal(r.semLucro, false);
  assert.equal(reservasDoMotorista({}, {}).itens.length, 0);
  assert.equal(reservasDoMotorista(veic, { lucroMes: 0 }).semLucro, true);
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
