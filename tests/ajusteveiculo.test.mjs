import test from "node:test";
import assert from "node:assert/strict";
import { ajusteDoVeiculo, custoLancavelPorKm, ehGastoDoVeiculo, metaDoDia } from "../js/motorista.js";

const carro = { kmMes: 3000, consumo: 12, precoLitro: 6, manutAno: 3600, seguroAno: 2400 };
const t = (dia, km) => ({ id: "t" + dia, ini: new Date(`2026-11-${String(dia).padStart(2, "0")}T08:00:00`).getTime(), fim: new Date(`2026-11-${String(dia).padStart(2, "0")}T16:00:00`).getTime(), km, apps: { uber: 100 } });
const gasto = (data, valor, descricao = "Combustível") => ({ id: data + descricao, tipo: "Despesa", categoria: "Transporte", descricao, data, valor });

test("custo por km que vira lançamento: só combustível, estacionamento e pedágio (sem manutenção)", () => {
  assert.equal(custoLancavelPorKm(carro), 0.5);
  assert.equal(custoLancavelPorKm({}), null);
});
test("combustível, pedágio e estacionamento são gasto do veículo; mercado não é", () => {
  assert.ok(ehGastoDoVeiculo(gasto("2026-11-02", 10, "Pedágio")));
  assert.ok(ehGastoDoVeiculo(gasto("2026-11-02", 10, "Estacionamento")));
  assert.ok(!ehGastoDoVeiculo({ tipo: "Despesa", categoria: "Mercado", descricao: "Compras", data: "2026-11-02", valor: 10 }));
  assert.ok(!ehGastoDoVeiculo({ tipo: "Receita", categoria: "Renda", descricao: "Combustível", data: "2026-11-02", valor: 10 }));
});
test("abastecer a mais que o rodado adianta os próximos km (ajuste positivo)", () => {
  const r = ajusteDoVeiculo({ lancamentos: [gasto("2026-11-02", 200)], turnos: [t(3, 300)], veic: carro, hoje: "2026-11-04" });
  assert.deepEqual(r, { ajuste: 50, lancado: 200, km: 300, rodado: 150, custoKm: 0.5 });
});
test("rodar mais do que abasteceu sobe a meta (ajuste negativo)", () => {
  const r = ajusteDoVeiculo({ lancamentos: [gasto("2026-11-02", 100)], turnos: [t(2, 200), t(3, 300)], veic: carro, hoje: "2026-11-04" });
  assert.equal(r.ajuste, -150);
});
test("abastecer hoje não muda a meta de hoje: o ajuste soma o lançado, e a meta cai em vez de subir", () => {
  const sem = ajusteDoVeiculo({ lancamentos: [], turnos: [t(3, 300)], veic: carro, hoje: "2026-11-04" });
  const com = ajusteDoVeiculo({ lancamentos: [gasto("2026-11-04", 250)], turnos: [t(3, 300)], veic: carro, hoje: "2026-11-04" });
  assert.equal(com.ajuste - sem.ajuste, 250);   // o dinheiro do tanque entra como adiantado
  // saldo do caixa cai 250 ao abastecer, o ajuste sobe 250: a meta fica igual
  const base = metaDoDia({ saldoSemHoje: 1000 + sem.ajuste, restam: 20, diasSemana: 6, extra: 5000, kmDia: 100, custoKm: 0.6 });
  const depois = metaDoDia({ saldoSemHoje: 1000 - 250 + com.ajuste, restam: 20, diasSemana: 6, extra: 5000, kmDia: 100, custoKm: 0.6 });
  assert.equal(depois.brutoDia, base.brutoDia);
});
test("dia de jornada sem km usa o km estimado; outro mês e dias futuros não contam", () => {
  const r = ajusteDoVeiculo({ lancamentos: [gasto("2026-10-30", 500), gasto("2026-11-09", 500), gasto("2026-11-03", 80)], turnos: [t(3, 0)], veic: carro, hoje: "2026-11-04", kmDiaEstimado: 100 });
  assert.equal(r.lancado, 80); assert.equal(r.km, 100); assert.equal(r.ajuste, 30);
});
test("sem o carro preenchido não ajusta nada", () => {
  assert.deepEqual(ajusteDoVeiculo({ lancamentos: [gasto("2026-11-02", 200)], turnos: [t(3, 300)], veic: {}, hoje: "2026-11-04" }), { ajuste: 0, lancado: 0, km: 0, rodado: 0, custoKm: 0 });
});
