// Aviso de combustível: o que os km rodados deveriam ter custado contra o que foi lançado como combustível.
import test from "node:test";
import assert from "node:assert/strict";
import { combustivelDoMes, ehCombustivel, COMB_MIN_AVISO } from "../js/motorista.js";

// Carro: 1.000 km por mês, 10 km por litro e gasolina a R$ 6 = R$ 0,60 de combustível por km.
const veic = { kmMes: "1000", consumoGas: "10", precoGas: "6.00" };
const turno = (dia, km) => ({ id: "t" + dia, ini: new Date(`2026-11-${String(dia).padStart(2, "0")}T08:00:00`).getTime(), fim: new Date(`2026-11-${String(dia).padStart(2, "0")}T16:00:00`).getTime(), apps: { uber: 200 }, km });
const gasto = (id, valor, extra = {}) => ({ id, data: "2026-11-02", tipo: "Despesa", categoria: "Transporte", descricao: "Combustível do turno", valor, forma: "Pix", ...extra });

test("reconhece lançamentos de combustível pela categoria ou pela descrição", () => {
  assert.equal(ehCombustivel(gasto("a", 10)), true);
  assert.equal(ehCombustivel(gasto("b", 10, { descricao: "", categoria: "Transporte › Combustível" })), true);
  assert.equal(ehCombustivel(gasto("c", 10, { descricao: "Abastecer", categoria: "Transporte" })), true);
  assert.equal(ehCombustivel(gasto("d", 10, { descricao: "Pedágio", categoria: "Transporte › Pedágio" })), false);
  assert.equal(ehCombustivel(gasto("e", 10, { tipo: "Receita" })), false);
});

test("combustível do mês: estima pelos km e mostra o que falta lançar", () => {
  const r = combustivelDoMes([turno(2, 200), turno(3, 150)], veic, [gasto("a", 100)], "2026-11-04");
  assert.equal(r.km, 350);
  assert.equal(r.porKm, 0.6);
  assert.equal(r.estimado, 210);      // 350 km x R$ 0,60
  assert.equal(r.lancado, 100);
  assert.equal(r.falta, 110);
  assert.equal(r.passouDoKm, false);
  assert.ok(r.falta >= COMB_MIN_AVISO);
});

test("combustível do mês: o que já foi lançado cobre, ou o carro e os km não estão preenchidos", () => {
  assert.equal(combustivelDoMes([turno(2, 200)], veic, [gasto("a", 300)], "2026-11-04").falta, 0);   // lançou mais do que o estimado
  assert.equal(combustivelDoMes([turno(2, 200)], {}, [], "2026-11-04"), null);                       // sem carro
  assert.equal(combustivelDoMes([], veic, [], "2026-11-04"), null);                                   // sem km rodados
  // só conta o mês de hoje
  assert.equal(combustivelDoMes([turno(2, 200)], veic, [gasto("o", 120, { data: "2026-10-02" })], "2026-11-04").lancado, 0);
});

test("combustível do mês: passou dos km por mês do carro", () => {
  const r = combustivelDoMes([turno(2, 700), turno(3, 400)], veic, [], "2026-11-04");
  assert.equal(r.km, 1100); assert.equal(r.passouDoKm, true); assert.equal(r.estimado, 660);
});
