// A rota do mês: o que entra e sai em cada data e quanto falta ter para cada prazo.
import test from "node:test";
import assert from "node:assert/strict";
import { rotaDoMes } from "../js/calc.js";

const base = () => ({ lancamentos: [], fixos: [], pagos: [], faturas: [], cartoes: [] });
const conta = (id, descricao, dia, valor) => ({ id, tipo: "Despesa", descricao, categoria: "Moradia", dia, valor, forma: "Pix", desde: "2026-01-01", ate: null });
const entrada = (id, descricao, dia, valor) => ({ id, tipo: "Receita", descricao, categoria: "Salário", dia, valor, forma: "Pix", desde: "2026-01-01", ate: null });

// Casal: ela recebe dia 5 e dia 20; ele é motorista e ganha todo dia (não entra na rota). Hoje é dia 4.
function casal() {
  const st = base();
  st.fixos.push(entrada("e1", "Salário Júlia", 5, 1275), entrada("e2", "Adiantamento Júlia", 20, 1275));
  st.fixos.push(conta("c1", "Conta de luz", 10, 200), conta("c2", "Condomínio", 10, 360), conta("c3", "Internet e tv", 20, 180), conta("c4", "Parcela do carro", 24, 1900));
  return st;
}

test("rota do mês: o primeiro prazo sem dinheiro e quanto falta para ele", () => {
  const r = rotaDoMes(casal(), "2026-11-04", { comMedia: false });
  assert.equal(r.saldoHoje, 0);
  assert.deepEqual(r.pontos.map((p) => [p.data, p.saldo, p.precisa]), [
    ["2026-11-05", 1275, 0], ["2026-11-10", 715, 0], ["2026-11-20", 1810, 0], ["2026-11-24", -90, 90],
  ]);
  assert.equal(r.prazo.data, "2026-11-24");
  assert.equal(r.prazo.precisa, 90);
  assert.equal(r.prazo.dias, 20);
  assert.equal(r.proximo.data, "2026-11-10");
  assert.deepEqual(r.proximo.saidas.map((x) => x.titulo), ["Conta de luz", "Condomínio"]);
});

test("rota do mês: o prazo aparece cedo quando uma conta vence antes da entrada", () => {
  const st = casal();
  st.fixos.push(conta("c5", "Faculdade", 6, 400));    // vence um dia depois do salário: cabe
  st.fixos.push(conta("c6", "Escola", 4, 100));       // vence hoje, sem nada no caixa
  const r = rotaDoMes(st, "2026-11-04", { comMedia: false });
  assert.equal(r.prazo.data, "2026-11-04");
  assert.equal(r.prazo.precisa, 100);
  assert.equal(r.pior.data, "2026-11-24");   // o buraco maior vem na parcela do carro: 590 de falta, contando a escola e a faculdade
  assert.equal(r.pior.precisa, 590);
});

test("rota do mês: conta atrasada sai hoje e conta paga não entra", () => {
  const st = casal();
  st.fixos.push(conta("c7", "Seguro", 2, 50));          // venceu dia 2 e não foi paga
  st.pagos.push({ fixo_id: "c2", mes: "2026-11-01" });  // condomínio já pago (não sai de novo)
  const r = rotaDoMes(st, "2026-11-04", { comMedia: false });
  assert.equal(r.prazo.data, "2026-11-04");
  assert.deepEqual(r.prazo.saidas, [{ titulo: "Seguro", valor: 50 }]);
  assert.equal(r.pontos.find((p) => p.data === "2026-11-10").saidas.length, 1);
});

test("rota do mês: sem contas faltando, não há prazo e o próximo vencimento é só um aviso", () => {
  const st = base();
  st.fixos.push(entrada("e1", "Salário", 5, 3000), conta("c1", "Aluguel", 10, 1000));
  const r = rotaDoMes(st, "2026-11-04", { comMedia: false });
  assert.equal(r.prazo, null);
  assert.equal(r.proximo.data, "2026-11-10");
});

test("rota do mês: com a média do dia a dia, o dinheiro pode acabar antes de uma conta", () => {
  const st = base();
  st.lancamentos.push({ id: "a", data: "2026-11-02", tipo: "Receita", categoria: "Salário", forma: "Pix", valor: 1000, descricao: "Salário" }, { id: "b", data: "2026-11-08", tipo: "Despesa", categoria: "Mercado", forma: "Pix", valor: 400, descricao: "Mercado" });
  st.fixos.push(conta("c1", "Aluguel", 25, 500));
  const r = rotaDoMes(st, "2026-11-10", { comMedia: true });   // sobram 600, média 40/dia: o aluguel do dia 25 não cabe
  assert.equal(r.mediaDia, 40);
  assert.equal(r.prazo.zera, true);
  assert.equal(rotaDoMes(st, "2026-11-10", { comMedia: false }).prazo, null);
});

import { agendaDaRota } from "../js/calc.js";
test("agenda da rota: atraso separado e janelas de 3, 7 e 15 dias com o valor por dia rodado", () => {
  const st = base();
  st.fixos.push(entrada("e1", "Entrada fixa", 20, 500));
  st.fixos.push(conta("a", "Parcela atrasada", 2, 1000), conta("b", "Luz", 6, 200), conta("c", "Internet", 10, 140), conta("d", "Seguro", 25, 300));
  const rota = rotaDoMes(st, "2026-11-04", { comMedia: false });
  const ag = agendaDaRota(rota, 6);
  assert.equal(ag.atraso.precisa, 1000);
  assert.deepEqual(ag.atraso.contas.map((x) => x.titulo), ["Parcela atrasada"]);
  // até 3 dias (dia 7): luz de 200 a mais; 3 dias corridos x 6/7 = 3 dias rodados (arredondado)
  assert.equal(ag.itens[0].ate, 3); assert.deepEqual(ag.itens[0].contas.map((x) => x.titulo), ["Luz"]);
  assert.equal(ag.itens[0].precisa, 200); assert.equal(ag.itens[0].diasRod, 3); assert.equal(ag.itens[0].porDia, 66.67);
  // até 7 dias (dia 11): internet de 140
  assert.equal(ag.itens[1].ate, 7); assert.equal(ag.itens[1].precisa, 140);
  // o resto do mês: o seguro, depois da entrada de 500 dia 20
  const fim = ag.itens[ag.itens.length - 1]; assert.equal(fim.ate, null); assert.deepEqual(fim.contas.map((x) => x.titulo), ["Seguro"]);
});
test("agenda da rota: conta coberta pelo dinheiro não pede nada a mais", () => {
  const st = base();
  st.fixos.push(entrada("e1", "Salário", 5, 3000), conta("c1", "Aluguel", 10, 1000));
  const ag = agendaDaRota(rotaDoMes(st, "2026-11-04", { comMedia: false }), 6);
  assert.equal(ag.atraso.precisa, 0); assert.equal(ag.itens[0].precisa, 0); assert.equal(ag.itens[0].porDia, 0);
});
test("agenda da rota: sem rota, nada", () => assert.equal(agendaDaRota(null), null));
test("agenda da rota: o ritmo por dia é o da data mais apertada, contado desde hoje", () => {
  const st = base();
  st.fixos.push(conta("b", "Luz", 6, 200), conta("c", "Internet", 10, 140), conta("d", "Seguro", 25, 300));
  const ag = agendaDaRota(rotaDoMes(st, "2026-11-04", { comMedia: false }), 6);
  assert.equal(ag.atraso.precisa, 0);
  assert.deepEqual(ag.itens.map((i) => [i.acumulado, i.diasRod, i.porDia]), [[200, 3, 66.67], [340, 6, 56.67], [640, 19, 33.68]]);
  assert.equal(ag.ritmo, 66.67);
});
