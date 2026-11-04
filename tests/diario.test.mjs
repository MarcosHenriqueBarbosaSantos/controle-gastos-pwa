// Gasto fixo de todo dia: uma ocorrência por dia, marcada como "mandei" (paga) ou "não mandei" (fora do mês).
import test from "node:test";
import assert from "node:assert/strict";
import { ocorrencias, calcMes, proximosVencimentos, contasEmAtraso, pendenciasParaAviso, diariosDeHoje, vezesNoPrazo, mesmoFixo } from "../js/calc.js";

const base = () => ({ lancamentos: [], fixos: [], pagos: [], faturas: [], cartoes: [], foraDoMes: [] });
const envio = (extra = {}) => ({ id: "d1", tipo: "Despesa", descricao: "Envio diário", categoria: "Outros", dia: 1, valor: 40, forma: "Pix", repete: "diario", desde: "2026-11-01", ate: null, ...extra });

test("todo dia: uma ocorrência por dia do mês, a partir da data de início", () => {
  const o = ocorrencias([envio({ desde: "2026-11-10" })], "2026-11");
  assert.equal(o.length, 21);   // do dia 10 ao 30
  assert.deepEqual([o[0].data, o[0].chave, o.at(-1).data], ["2026-11-10", "2026-11-10", "2026-11-30"]);
  assert.equal(ocorrencias([envio()], "2026-10").length, 0);   // antes do início
  assert.equal(vezesNoPrazo(envio({ desde: "2026-11-01" }), "2026-12"), 61);   // novembro e dezembro
});

test("todo dia: o gasto do mês soma todos os dias, e o que ficou fora do mês sai da conta", () => {
  const st = base(); st.fixos.push(envio());
  assert.equal(calcMes(st, "2026-11", "2026-11-04").fxCusto, 1200);   // 30 dias x 40
  st.foraDoMes.push("d1|2026-11-02", "d1|2026-11-03");
  assert.equal(calcMes(st, "2026-11", "2026-11-04").fxCusto, 1120);   // dois dias que não mandou
});

test("todo dia: só pede atenção hoje e nos 3 dias anteriores, e não vai para o aviso por e-mail", () => {
  const st = base(); st.fixos.push(envio());
  const v = proximosVencimentos(st, "2026-11-10", 30).map((x) => x.data);
  assert.deepEqual(v, ["2026-11-07", "2026-11-08", "2026-11-09", "2026-11-10"]);
  assert.equal(contasEmAtraso(st, "2026-11-10").itens.length, 3);   // dias 7, 8 e 9; os mais antigos não viram atraso
  assert.equal(pendenciasParaAviso(st, "2026-11-10").itens.length, 0);
});

test("o que mandar hoje: hoje (com a situação) e os dias recentes sem marca", () => {
  const st = base(); st.fixos.push(envio());
  st.pagos.push({ fixo_id: "d1", mes: "2026-11-09" }); st.foraDoMes.push("d1|2026-11-08");
  let l = diariosDeHoje(st, "2026-11-10");
  assert.deepEqual(l.map((x) => [x.data, x.estado]), [["2026-11-10", "falta"], ["2026-11-07", "falta"]]);   // 9 foi mandado e 8 ficou fora
  st.pagos.push({ fixo_id: "d1", mes: "2026-11-10" });
  l = diariosDeHoje(st, "2026-11-10");
  assert.deepEqual(l.map((x) => [x.data, x.estado]), [["2026-11-10", "mandei"], ["2026-11-07", "falta"]]);
  // virada de mês: o dia 30 aparece quando hoje é dia 1
  assert.deepEqual(diariosDeHoje(st, "2026-12-01").map((x) => x.data), ["2026-12-01", "2026-11-30", "2026-11-29", "2026-11-28"]);
});

test("dois gastos de todo dia parecidos são o mesmo; de todo dia e semanal não", () => {
  assert.equal(mesmoFixo(envio(), envio({ id: "d2" })), true);
  assert.equal(mesmoFixo(envio(), envio({ id: "d2", descricao: "Terapia", repete: "semanal", dia_semana: 2 })), false);
});
