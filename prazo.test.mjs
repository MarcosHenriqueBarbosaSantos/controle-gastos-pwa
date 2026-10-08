// Contas com data para acabar (acerto, acordo, parcelamento). Rode com: node --test
import { test } from "node:test";
import assert from "node:assert/strict";
import { vezesNoPrazo, restanteDoPrazo, prazosEmAndamento, calcMes, proximosVencimentos, novaVersaoDeFixo } from "../js/calc.js";

const fx = (id, descricao, dia, valor, desde, ate, extra = {}) => ({ id, tipo: "Despesa", descricao, categoria: "Outros", dia, valor, forma: "Pix", desde, ate, ...extra });

test("quantas vezes cabe no prazo: mensal conta os meses; semanal conta as semanas desde o início", () => {
  assert.equal(vezesNoPrazo(fx("a", "Acerto", 6, 150, "2026-10-01"), "2027-03"), 6);
  assert.equal(vezesNoPrazo(fx("a", "Acerto", 6, 150, "2026-10-01"), "2026-10"), 1);
  assert.equal(vezesNoPrazo(fx("a", "Acerto", 6, 150, "2026-10-01"), "2026-09"), 0);
  // toda terça a partir de 06/10/2026: 4 em outubro (6, 13, 20, 27) e 4 em novembro (3, 10, 17, 24)
  const sem = fx("s", "Aula", 1, 50, "2026-10-06", null, { repete: "semanal", dia_semana: 2 });
  assert.equal(vezesNoPrazo(sem, "2026-10"), 4); assert.equal(vezesNoPrazo(sem, "2026-11"), 8);
  assert.equal(vezesNoPrazo({ ...fx("r", "Recebo", 10, 200, "2026-10-01"), tipo: "Receita" }, "2026-12"), 3);
});

test("o que falta de um acerto: tira o que já foi pago, conta o que venceu e não foi pago, e para no fim do prazo", () => {
  const f = fx("a", "Acerto com o João", 6, 150, "2026-10-01", "2027-03-01");
  const st = (pagos = []) => ({ fixos: [f], pagos: pagos.map((mes) => ({ fixo_id: "a", mes })), lancamentos: [], faturas: [], cartoes: [] });
  assert.deepEqual(restanteDoPrazo(st(), f, "2026-10-06"), { vezes: 6, total: 900, ate: "2027-03", ultima: "2027-03-06" });
  assert.deepEqual(restanteDoPrazo(st(["2026-10-01"]), f, "2026-10-20"), { vezes: 5, total: 750, ate: "2027-03", ultima: "2027-03-06" });
  assert.equal(restanteDoPrazo(st(), f, "2026-10-20").vezes, 6);                        // venceu dia 6 e não foi pago: continua faltando
  assert.equal(restanteDoPrazo(st(["2026-10-01", "2026-11-01", "2026-12-01"]), f, "2027-01-02").vezes, 3);
  assert.deepEqual(restanteDoPrazo(st(["2027-03-01"]), f, "2027-03-10"), { vezes: 0, total: 0, ate: "2027-03", ultima: "2027-03-06" });   // última paga
  assert.equal(restanteDoPrazo(st(), f, "2027-04-01"), null);                             // o prazo acabou
  assert.equal(restanteDoPrazo(st(), { ...f, ate: null }, "2026-10-06"), null);           // conta sem data para acabar
  // no mês seguinte ao fim, o acerto deixa de entrar no custo e nos vencimentos
  assert.equal(calcMes(st(), "2027-03", "2026-10-06").fxT, 150); assert.equal(calcMes(st(), "2027-04", "2026-10-06").fxT, 0);
  assert.equal(proximosVencimentos(st(), "2027-03-25", 30).filter((x) => x.dias >= 0).length, 0);
});

test("entrada com prazo e fixo no cartão: falta o que ainda vai acontecer", () => {
  const r = { ...fx("r", "Ana me paga", 10, 200, "2026-10-01", "2026-12-01"), tipo: "Receita", forma: "" };
  const st = { fixos: [r], pagos: [], lancamentos: [], faturas: [], cartoes: [] };
  assert.deepEqual(restanteDoPrazo(st, r, "2026-10-06"), { vezes: 3, total: 600, ate: "2026-12", ultima: "2026-12-10" });
  assert.equal(restanteDoPrazo(st, r, "2026-10-11").vezes, 2);    // a de outubro já entrou
  const k = fx("k", "Curso", 15, 99, "2026-10-01", "2026-11-01", { forma: "Cartão de crédito", cartao_id: "c1" });
  assert.equal(restanteDoPrazo({ ...st, fixos: [k] }, k, "2026-10-16").vezes, 1);
  // semanal: toda terça de 06/10 até o fim de novembro, olhando em 14/10 (já passou o dia 6, que não foi pago, e o 13)
  const s = fx("s", "Aula", 1, 50, "2026-10-06", "2026-11-01", { repete: "semanal", dia_semana: 2 });
  const comPago = { ...st, fixos: [s], pagos: [{ fixo_id: "s", mes: "2026-10-06" }] };
  assert.deepEqual(restanteDoPrazo(comPago, s, "2026-10-14"), { vezes: 7, total: 350, ate: "2026-11", ultima: "2026-11-24" });
});

test("acertos em andamento: só os com prazo que ainda não acabou, do que termina antes para o que termina depois", () => {
  const st = { pagos: [{ fixo_id: "b", mes: "2026-10-01" }], lancamentos: [], faturas: [], cartoes: [], fixos: [
    fx("a", "Aluguel", 5, 1000, "2026-01-01", null), fx("b", "Acordo do banco", 10, 200, "2026-08-01", "2027-01-01"), fx("c", "Acerto com o João", 6, 150, "2026-10-01", "2026-11-01"),
    fx("d", "Encerrado em setembro", 5, 80, "2026-01-01", "2026-09-01"), fx("e", "Começa em janeiro", 5, 300, "2027-01-01", "2027-02-01"),
    { ...fx("r", "Ana me paga", 10, 200, "2026-10-01", "2026-12-01"), tipo: "Receita" }] };
  const p = prazosEmAndamento(st, "2026-10-06");
  assert.deepEqual(p.itens.map((x) => [x.f.descricao, x.vezes, x.total, x.ate]), [["Acerto com o João", 2, 300, "2026-11"], ["Acordo do banco", 3, 600, "2027-01"], ["Começa em janeiro", 2, 600, "2027-02"]]);
  assert.equal(p.total, 1500);
  assert.deepEqual(prazosEmAndamento(st, "2026-10-06", "Receita").itens.map((x) => [x.f.descricao, x.vezes]), [["Ana me paga", 3]]);
  assert.deepEqual(prazosEmAndamento({ ...st, fixos: [] }, "2026-10-06"), { itens: [], total: 0 });
});

test("mudar um acerto de um mês em diante mantém a data em que ele acaba", () => {
  const f = fx("a", "Acerto", 6, 150, "2026-10-01", "2027-03-01");
  const { encerra, novo } = novaVersaoDeFixo(f, { valor: 180 }, "2026-12");
  assert.deepEqual(encerra, { ate: "2026-11-01" }); assert.equal(novo.ate, "2027-03-01"); assert.equal(novo.desde, "2026-12-01"); assert.equal(novo.valor, 180);
  assert.equal(novaVersaoDeFixo(f, { ate: "2027-06-01" }, "2026-12").novo.ate, "2027-06-01");   // e dá para mudar o fim junto
});
