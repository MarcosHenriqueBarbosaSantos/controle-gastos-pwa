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
