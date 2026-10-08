// Testes das metas do dinheiro guardado: andamento, previsão, quanto guardar por mês, sugestão com a sobra e lembretes.
import test from "node:test";
import assert from "node:assert/strict";
import { RETIRADA, calcMes, andamentoDaMeta, metasEmAndamento, sugestaoDaMeta, lembreteDaMeta, combinadosDoMes, parabensDaMeta } from "../js/calc.js";
import * as regras from "../supabase/functions/avisos/regras.js";

const HOJE = "2026-10-20", RES = "Reserva de emergência";
const G = (data, valor, destino = RES, forma = "") => ({ id: data + destino + valor, data, descricao: "", tipo: "Reserva", categoria: destino, forma, valor });
const fixo = (id, tipo, descricao, dia, valor) => ({ id, tipo, descricao, categoria: tipo === "Receita" ? "Salário" : "Moradia", dia, valor, forma: tipo === "Receita" ? "" : "Boleto", desde: "2026-01-01", ate: null });
const base = (lanc = [G("2026-07-28", 300), G("2026-08-28", 300), G("2026-09-28", 300)], custoFixo = 1100) => ({ lancamentos: lanc,
  fixos: [fixo("r", "Receita", "Salário", 5, 3900), fixo("a", "Despesa", "Aluguel", 10, custoFixo)], pagos: [], faturas: [], cartoes: [] });

test("meta sem data: progresso, ritmo dos últimos meses e previsão de quando fica pronta", () => {
  const a = andamentoDaMeta(base(), RES, { valor: 3000 }, HOJE);
  assert.deepEqual([a.guardado, a.falta, a.pct, a.marco, a.concluida], [900, 2100, 30, 25, false]);
  assert.deepEqual([a.ritmo, a.mesesDeBase, a.noMes], [300, 3, 0]);
  assert.equal(a.previsao, "2027-04");   // 900 + 7 meses de 300 (outubro a abril) = 3.000
  assert.deepEqual([a.ate, a.porMes, a.noPrazo, a.prazoPassou], ["", null, null, false]);
  assert.deepEqual([a.ref, a.esteMes], [300, 300]);
});

test("meta com data: quanto guardar por mês, e o valor não muda no meio do mês", () => {
  let a = andamentoDaMeta(base(), RES, { valor: 3000, ate: "2026-12" }, HOJE);
  assert.equal(a.porMes, 700);   // faltam 2.100 para outubro, novembro e dezembro
  assert.equal(a.noPrazo, false); assert.equal(a.previsao, "2027-04");
  assert.deepEqual([a.ref, a.esteMes], [700, 700]);
  const st = base(); st.lancamentos.push(G("2026-10-10", 200));
  a = andamentoDaMeta(st, RES, { valor: 3000, ate: "2026-12" }, HOJE);
  assert.deepEqual([a.guardado, a.falta, a.noMes, a.porMes, a.esteMes], [1100, 1900, 200, 700, 500]);
  a = andamentoDaMeta(base(), RES, { valor: 3000, ate: "2027-12" }, HOJE);
  assert.equal(a.porMes, 140); assert.equal(a.noPrazo, true);   // 2.100 em 15 meses; no ritmo de 300 chega antes
  a = andamentoDaMeta(base(), RES, { valor: 1000, ate: "2026-12" }, HOJE);
  assert.equal(a.porMes, 33.34);   // 100 em 3 meses, arredondado para cima para não faltar centavo
});

test("meta: prazo que já passou não cobra nada, só avisa; data inválida é ignorada", () => {
  const a = andamentoDaMeta(base(), RES, { valor: 3000, ate: "2026-08" }, HOJE);
  assert.deepEqual([a.prazoPassou, a.porMes, a.noPrazo, a.ref], [true, null, null, 300]);
  assert.equal(andamentoDaMeta(base(), RES, { valor: 3000, ate: "dezembro" }, HOJE).ate, "");
});

test("meta: ritmo conta só a partir do primeiro mês guardado; começando agora, vale o que entrou neste mês", () => {
  let a = andamentoDaMeta(base([G("2026-09-28", 400)]), RES, { valor: 2000 }, HOJE);
  assert.deepEqual([a.ritmo, a.mesesDeBase], [400, 1]);
  a = andamentoDaMeta(base([G("2026-10-05", 250)]), RES, { valor: 1000 }, HOJE);
  assert.deepEqual([a.ritmo, a.mesesDeBase, a.noMes, a.falta], [250, 0, 250, 750]);
  assert.equal(a.previsao, "2027-01");   // novembro, dezembro e janeiro
  assert.equal(a.esteMes, 0);
  a = andamentoDaMeta(base([]), RES, { valor: 1000 }, HOJE);
  assert.deepEqual([a.guardado, a.ritmo, a.previsao, a.ref, a.esteMes], [0, 0, null, null, null]);   // sem nada guardado não há previsão
});

test("meta: retirada diminui o guardado e não vira ritmo negativo; cada destino tem a sua conta", () => {
  const st = base([G("2026-09-28", 300), G("2026-10-03", 100, RES, RETIRADA), G("2026-09-10", 5000, "Investimentos")]);
  const a = andamentoDaMeta(st, RES, { valor: 1000 }, HOJE);
  assert.deepEqual([a.guardado, a.noMes, a.ritmo, a.falta], [200, -100, 300, 800]);
  assert.equal(a.previsao, "2026-12");   // 200 + 300 em outubro, novembro e dezembro
  assert.equal(a.esteMes, 300);
  const soRetirou = andamentoDaMeta(base([G("2026-08-01", 500), G("2026-09-01", 600, RES, RETIRADA)]), RES, { valor: 1000 }, HOJE);
  assert.deepEqual([soRetirou.guardado, soRetirou.ritmo, soRetirou.previsao, soRetirou.pct], [-100, 0, null, 0]);
});

test("meta completa: 100%, sem previsão nem valor por mês; sem valor não existe meta", () => {
  const a = andamentoDaMeta(base(), RES, { valor: 900, ate: "2026-12" }, HOJE);
  assert.deepEqual([a.concluida, a.pct, a.marco, a.falta, a.previsao, a.porMes, a.ref, a.esteMes], [true, 100, 100, 0, null, null, null, null]);
  assert.equal(andamentoDaMeta(base(), RES, { valor: 0 }, HOJE), null);
  assert.equal(andamentoDaMeta(base(), RES, undefined, HOJE), null);
  assert.deepEqual([25, 49.9, 50, 75, 99.99].map((p) => andamentoDaMeta(base([G("2026-09-01", p * 10)]), RES, { valor: 1000 }, HOJE).marco), [25, 25, 50, 75, 75]);
});

test("várias metas: as que faltam primeiro, com data mais próxima na frente; completas no fim", () => {
  const st = base([G("2026-09-01", 300), G("2026-09-01", 2000, "Viagem"), G("2026-09-01", 100, "Carro")]);
  const l = metasEmAndamento(st, { [RES]: { valor: 3000 }, Viagem: { valor: 2000 }, Carro: { valor: 9000, ate: "2027-06" }, Nada: { valor: 0 } }, HOJE);
  assert.deepEqual(l.map((a) => a.destino), ["Carro", RES, "Viagem"]);
  assert.deepEqual(metasEmAndamento(st, undefined, HOJE), []);
});

test("sugestão com a sobra: valor da parte do mês quando cabe, o que sobra quando não cabe", () => {
  const st = base(), c = calcMes(st, "2026-10", HOJE);
  const a = andamentoDaMeta(st, RES, { valor: 3000 }, HOJE);
  assert.deepEqual(sugestaoDaMeta(a, c), { tipo: "guardar", valor: 300, sobra: 2800, completo: true });   // 3.900 − 1.100
  const justo = base(undefined, 3700), cj = calcMes(justo, "2026-10", HOJE);
  assert.deepEqual(sugestaoDaMeta(andamentoDaMeta(justo, RES, { valor: 3000 }, HOJE), cj), { tipo: "guardar", valor: 200, sobra: 200, completo: false });
  assert.equal(sugestaoDaMeta(a, calcMes(st, "2026-09", HOJE)), null);   // só no mês atual
  assert.equal(sugestaoDaMeta(null, c), null);
});

test("sugestão: mês apertado não sugere valor; parte do mês já guardada vira elogio; meta sem ritmo fica livre", () => {
  const apertado = base(undefined, 3895);
  assert.deepEqual(sugestaoDaMeta(andamentoDaMeta(apertado, RES, { valor: 3000 }, HOJE), calcMes(apertado, "2026-10", HOJE)), { tipo: "apertado" });
  const vermelho = base(undefined, 4500);
  assert.deepEqual(sugestaoDaMeta(andamentoDaMeta(vermelho, RES, { valor: 3000 }, HOJE), calcMes(vermelho, "2026-10", HOJE)), { tipo: "apertado" });
  const feito = base(); feito.lancamentos.push(G("2026-10-06", 300));
  assert.deepEqual(sugestaoDaMeta(andamentoDaMeta(feito, RES, { valor: 3000 }, HOJE), calcMes(feito, "2026-10", HOJE)), { tipo: "feito", guardado: 300 });
  const novo = base([]);
  assert.deepEqual(sugestaoDaMeta(andamentoDaMeta(novo, RES, { valor: 3000 }, HOJE), calcMes(novo, "2026-10", HOJE)), { tipo: "livre", sobra: 2800 });
  assert.deepEqual(sugestaoDaMeta(andamentoDaMeta(base(), RES, { valor: 900 }, HOJE), calcMes(base(), "2026-10", HOJE)), { tipo: "feita" });
});

test("lembretes: só no dia em que o dinheiro entra e dois dias antes de o mês acabar", () => {
  const metas = { [RES]: { valor: 3000 } }, st = base();
  const e = lembreteDaMeta(st, metas, "2026-10-05");   // dia do salário
  assert.deepEqual([e.quando, e.meta.destino, e.valor, e.completo], ["entrou", RES, 300, true]);
  assert.equal(lembreteDaMeta(st, metas, "2026-10-06"), null);
  assert.equal(lembreteDaMeta(st, metas, "2026-10-20"), null);
  const s = lembreteDaMeta(st, metas, "2026-10-29");   // outubro tem 31 dias
  assert.deepEqual([s.quando, s.valor, s.sobra], ["sobra", 300, 2800]);
  assert.equal(lembreteDaMeta(st, metas, "2026-10-31"), null);
  // Entrada lançada à mão ontem também conta como "o dinheiro entrou".
  const extra = base(); extra.lancamentos.push({ id: "x", data: "2026-10-19", descricao: "Freela", tipo: "Receita", categoria: "Renda extra", forma: "", valor: 400 });
  assert.equal(lembreteDaMeta(extra, metas, HOJE).quando, "entrou");
  assert.equal(lembreteDaMeta(extra, metas, "2026-10-21"), null);
});

test("lembretes: nenhum em mês apertado, com a parte do mês já guardada, com a meta completa ou sem meta", () => {
  const metas = { [RES]: { valor: 3000 } };
  assert.equal(lembreteDaMeta(base(undefined, 3895), metas, "2026-10-05"), null);
  assert.equal(lembreteDaMeta(base(undefined, 3895), metas, "2026-10-29"), null);
  const feito = base(); feito.lancamentos.push(G("2026-10-02", 300));
  assert.equal(lembreteDaMeta(feito, metas, "2026-10-05"), null);
  assert.equal(lembreteDaMeta(base(), { [RES]: { valor: 900 } }, "2026-10-05"), null);
  assert.equal(lembreteDaMeta(base(), {}, "2026-10-05"), null);
  assert.equal(lembreteDaMeta(base([]), metas, "2026-10-05"), null);   // sem ritmo nem data não há valor para sugerir
  // Com duas metas, o lembrete fala da primeira que ainda precisa da parte do mês.
  const duas = base([G("2026-09-01", 300), G("2026-10-02", 300), G("2026-09-01", 100, "Viagem")]);
  assert.equal(lembreteDaMeta(duas, { [RES]: { valor: 3000 }, Viagem: { valor: 1000 } }, "2026-10-05").meta.destino, "Viagem");
});

test("combinado mensal (plano): a previsão passa a usar o valor combinado; pular o mês empurra a previsão sem cobrar", () => {
  let a = andamentoDaMeta(base(), RES, { valor: 3000, plano: { valor: 500, dia: 5 } }, HOJE);
  assert.deepEqual([a.plano, a.diaDoPlano, a.pulou, a.ref, a.esteMes], [500, 5, false, 500, 500]);
  assert.equal(a.previsao, "2027-02");   // 900 + 500 de outubro a fevereiro passa de 3.000
  a = andamentoDaMeta(base(), RES, { valor: 3000, plano: { valor: 500, dia: 5 }, pulos: ["2026-10"] }, HOJE);
  assert.deepEqual([a.pulou, a.previsao], [true, "2027-03"]);
  assert.deepEqual(sugestaoDaMeta(a, calcMes(base(), "2026-10", HOJE)), { tipo: "pulou" });
  assert.equal(lembreteDaMeta(base(), { [RES]: { valor: 3000, plano: { valor: 500, dia: 5 }, pulos: ["2026-10"] } }, "2026-10-05"), null);   // quem pulou não é lembrado
  a = andamentoDaMeta(base(), RES, { valor: 3000, ate: "2026-12", plano: { valor: 500 } }, HOJE);
  assert.deepEqual([a.porMes, a.ref, a.noPrazo, a.diaDoPlano], [700, 500, false, 1]);   // o plano é o que a pessoa combinou; a data só informa
  assert.equal(andamentoDaMeta(base(), RES, { valor: 3000, plano: { valor: 0 } }, HOJE).ref, 300);   // plano zerado volta para o ritmo
  assert.equal(andamentoDaMeta(base(), RES, { valor: 3000, pulos: ["2026-10"] }, HOJE).pulou, false);   // sem plano não há o que pular
});

test("combinados do mês: aparecem até serem guardados ou pulados, e nunca viram conta atrasada", () => {
  const metas = (extra = {}) => ({ [RES]: { valor: 3000, plano: { valor: 500, dia: 25 }, ...extra } });
  assert.deepEqual(combinadosDoMes(base(), metas(), HOJE), [{ destino: RES, valor: 500, data: "2026-10-25", chegou: false }]);
  assert.equal(combinadosDoMes(base(), metas(), "2026-10-25")[0].chegou, true);
  assert.equal(combinadosDoMes(base(), metas(), "2026-10-31")[0].chegou, true);
  const parte = base(); parte.lancamentos.push(G("2026-10-10", 200));
  assert.equal(combinadosDoMes(parte, metas(), HOJE)[0].valor, 300);
  parte.lancamentos.push(G("2026-10-12", 300));
  assert.deepEqual(combinadosDoMes(parte, metas(), HOJE), []);
  assert.deepEqual(combinadosDoMes(base(), metas({ pulos: ["2026-10"] }), HOJE), []);
  assert.equal(combinadosDoMes(base(), metas({ pulos: ["2026-10"] }), "2026-11-03").length, 1);   // no mês seguinte o combinado volta
  assert.deepEqual(combinadosDoMes(base(), { [RES]: { valor: 900, plano: { valor: 500, dia: 25 } } }, HOJE), []);   // meta completa
  assert.deepEqual(combinadosDoMes(base(), { [RES]: { valor: 3000 } }, HOJE), []);   // sem plano
  assert.equal(combinadosDoMes(base(), { [RES]: { valor: 3000, plano: { valor: 500, dia: 31 } } }, "2026-11-10")[0].data, "2026-11-30");
  assert.equal(combinadosDoMes(base(), { [RES]: { valor: 1000, plano: { valor: 500, dia: 1 } } }, HOJE)[0].valor, 100);   // só o que falta para completar
  // O combinado não mexe no custo nem no saldo do mês enquanto não for guardado.
  const c = calcMes(base(), "2026-10", HOJE); assert.deepEqual([c.custo, c.res, c.saldo], [1100, 0, 2800]);
});

test("parabéns: no dia seguinte a guardar, com o marco que foi cruzado", () => {
  const metas = { [RES]: { valor: 3000 } };
  let st = base(); st.lancamentos.push(G("2026-10-19", 600));
  assert.deepEqual(parabensDaMeta(st, metas, HOJE), { destino: RES, valor: 600, guardado: 1500, alvo: 3000, falta: 1500, pct: 50, marco: 50, concluida: false });
  assert.equal(parabensDaMeta(st, metas, "2026-10-21"), null);   // só no dia seguinte
  st = base(); st.lancamentos.push(G("2026-10-19", 100));
  assert.deepEqual([parabensDaMeta(st, metas, HOJE).marco, parabensDaMeta(st, metas, HOJE).pct], [0, 33]);
  st = base(); st.lancamentos.push(G("2026-10-19", 2100));
  assert.deepEqual([parabensDaMeta(st, metas, HOJE).marco, parabensDaMeta(st, metas, HOJE).concluida, parabensDaMeta(st, metas, HOJE).falta], [100, true, 0]);
  st = base(); st.lancamentos.push(G("2026-10-19", 100, RES, RETIRADA));
  assert.equal(parabensDaMeta(st, metas, HOJE), null);   // retirada não gera e-mail
  st.lancamentos.push(G("2026-10-19", 100));
  assert.equal(parabensDaMeta(st, metas, HOJE), null);   // guardou e retirou o mesmo valor no dia
  assert.equal(parabensDaMeta(base(), metas, HOJE), null);
  st = base(); st.lancamentos.push(G("2026-10-19", 50, "Viagem"));
  assert.equal(parabensDaMeta(st, metas, HOJE), null);   // destino sem meta
  st.lancamentos.push(G("2026-10-19", 80));
  assert.equal(parabensDaMeta(st, { ...metas, Viagem: { valor: 100 } }, HOJE).destino, "Viagem");   // a que cruzou um marco vem primeiro
});

test("servidor e app fazem a mesma conta da meta", () => {
  const metas = { [RES]: { valor: 3000, ate: "2027-03" } }, st = base();
  assert.deepEqual(regras.lembreteDaMeta(st, metas, "2026-10-05"), lembreteDaMeta(st, metas, "2026-10-05"));
  assert.deepEqual(regras.metasEmAndamento(st, metas, HOJE), metasEmAndamento(st, metas, HOJE));
  st.lancamentos.push(G("2026-10-19", 600));
  assert.deepEqual(regras.parabensDaMeta(st, metas, HOJE), parabensDaMeta(st, metas, HOJE));
});
