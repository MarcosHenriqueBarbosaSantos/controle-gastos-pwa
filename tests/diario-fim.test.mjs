// Gasto de todo dia que acaba quando soma um valor: "R$ 250 por dia até somar R$ 7.500".
import test from "node:test";
import assert from "node:assert/strict";
import { ocorrencias, fimPorTotal, totalAteFim, calcMes, diariosDeHoje } from "../js/calc.js";

const base = () => ({ lancamentos: [], fixos: [], pagos: [], faturas: [], cartoes: [], foraDoMes: [] });
const parcela = (extra = {}) => ({ id: "p1", tipo: "Despesa", descricao: "Parcela Carro mãe", categoria: "Parcelas e financiamentos", dia: 1, valor: 250, forma: "Pix", repete: "diario", desde: "2026-11-04", ate: null, ...extra });

test("fim por total: quantos dias de R$ 250 somam R$ 7.500, e quando acaba", () => {
  assert.equal(fimPorTotal("2026-11-04", 250, 7500), "2026-12-03");   // 30 dias: 4/11 a 3/12
  assert.equal(totalAteFim("2026-11-04", 250, "2026-12-03"), 7500);
  assert.equal(fimPorTotal("2026-11-04", 250, 200), "2026-11-04");     // menos de um dia: um dia só
  assert.equal(fimPorTotal("2026-11-04", 250, 7510), "2026-12-04");    // sobra um pouco: mais um dia
});

test("todo dia com fim: só gera os dias até o último", () => {
  const f = parcela({ fim: "2026-12-03" });
  assert.equal(ocorrencias([f], "2026-11").length, 27);          // 4 a 30 de novembro
  assert.equal(ocorrencias([f], "2026-12").length, 3);           // 1 a 3 de dezembro
  assert.equal(ocorrencias([f], "2027-01").length, 0);           // acabou
  assert.equal(ocorrencias([parcela()], "2027-01").length, 31);  // sem fim: continua
});

test("todo dia com fim: o gasto do mês soma só os dias até o fim, e dia que não mandou sai do mês", () => {
  const st = base(); st.fixos.push(parcela({ fim: "2026-12-03" }));
  assert.equal(calcMes(st, "2026-11", "2026-11-10").fxCusto, 6750);   // 27 dias x 250
  assert.equal(calcMes(st, "2026-12", "2026-11-10").fxCusto, 750);    // 3 dias x 250
  st.foraDoMes.push("p1|2026-11-05");                                  // não mandou dia 5
  assert.equal(calcMes(st, "2026-11", "2026-11-10").fxCusto, 6500);
});

test("todo dia com fim: depois do último dia não pede mais nada hoje", () => {
  const st = base(); st.fixos.push(parcela({ fim: "2026-12-03" }));
  assert.equal(diariosDeHoje(st, "2026-12-03").length, 4);   // hoje e os 3 dias anteriores sem marca
  assert.equal(diariosDeHoje(st, "2026-12-10").length, 0);
});
