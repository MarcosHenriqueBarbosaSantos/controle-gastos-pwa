// Revisão do app: reimportar extrato sem duplicar e transferências que não são ganho nem gasto.
import test from "node:test";
import assert from "node:assert/strict";
import { leConta } from "../js/conta.js";
import { movimentosJaLancados, entreMinhasContas } from "../js/arrumar.js";
import { calcMes } from "../js/calc.js";

const H = ["Data", "Valor", "Identificador", "Descrição"], HOJE = "2026-10-21";
const ME = ["Marcos Henrique Barbosa Santos"], PARC = ["Julia", "Julia Gabrielle Ferreira"];
const nu = (rows, extra = {}) => leConta({ linhas: [H, ...rows], hoje: HOJE, meuNome: ME, parceiro: PARC, ...extra });
const MES = [
  ["01/10/2026", "-14,50", "id1", "Compra no débito - PADARIA PAO QUENTE"],
  ["02/10/2026", "-300,00", "id2", "Transferência enviada pelo Pix - Julia Gabrielle Ferreira da Silva - 111.222.333-44 - NU PAGAMENTOS"],
  ["03/10/2026", "1200,00", "id3", "Transferência recebida pelo Pix - Julia Gabrielle Ferreira da Silva - 111.222.333-44 - NU PAGAMENTOS"],
  ["04/10/2026", "-500,00", "id4", "Transferência enviada pelo Pix - Marcos Henrique Barbosa Santos - 999.888.777-66 - ITAU"],
  ["05/10/2026", "500,00", "id5", "Transferência recebida pelo Pix - Marcos Henrique Barbosa Santos - 999.888.777-66 - NU PAGAMENTOS"],
  ["06/10/2026", "-20,00", "id6", "Transferência enviada pelo Pix - Joao Pedro Lima - 123.456.789-00 - NU PAGAMENTOS"],
  ["06/10/2026", "2500,00", "id7", "Transferência recebida pelo Pix - EMPRESA TAL LTDA - 12.345.678/0001-90 - ITAU"],
];

test("transferência com a pessoa da conta casal fica de fora, com o motivo, e não entra nas somas", () => {
  const r = nu(MES), por = (id) => r.movimentos.find((m) => m.id === id);
  for (const id of ["id2", "id3"]) { assert.equal(por(id).ignorar, true); assert.match(por(id).motivo, /conta casal/); assert.equal(por(id).categoria, "Casal"); }
  assert.equal(por("id4").ignorar, true); assert.equal(por("id5").ignorar, true);   // entre as contas dele
  assert.equal(por("id1").ignorar, false); assert.equal(por("id6").ignorar, false); assert.equal(por("id7").ignorar, false);
  assert.equal(r.resumo.saidas, 34.5); assert.equal(r.resumo.entradas, 2500); assert.equal(r.resumo.ignorados, 4);
});

test("sem conta de casal ligada, o Pix para a Júlia é um Pix como os outros", () => {
  const r = nu(MES, { parceiro: [] });
  assert.equal(r.movimentos.find((m) => m.id === "id2").ignorar, false);
});

test("só o primeiro nome igual não basta para uma compra: loja com o nome dela não é transferência", () => {
  const r = nu([["02/10/2026", "-50,00", "x1", "Compra no débito - JULIA MODAS LTDA"]]);
  assert.equal(r.movimentos[0].ignorar, false);
});

test("reimportar o mesmo mês: as chaves são as mesmas, nada vira lançamento novo", () => {
  const a = nu(MES).movimentos.map((m) => m.chave), b = nu(MES).movimentos.map((m) => m.chave);
  assert.deepEqual(a, b);
  const guardadas = new Set(a); assert.equal(nu(MES).movimentos.filter((m) => !guardadas.has(m.chave)).length, 0);
});

test("dois extratos que se cruzam: só o que é novo aparece", () => {
  const ja = new Set(nu(MES).movimentos.map((m) => m.chave));
  const B = [...MES.slice(3), ["10/10/2026", "-30,00", "id9", "Compra no débito - FARMACIA X"]];
  assert.deepEqual(nu(B).movimentos.filter((m) => !ja.has(m.chave)).map((m) => m.valor), [30]);
});

test("extrato sem identificador (outros bancos): mesmo arquivo de novo e período cruzado também não duplicam", () => {
  const sem = (rows) => leConta({ linhas: [["Data", "Valor", "Descrição"], ...rows.map((r) => [r[0], r[1], r[3]])], hoje: HOJE });
  const a = sem(MES), ja = new Set(a.movimentos.map((m) => m.chave));
  assert.equal(sem(MES).movimentos.filter((m) => !ja.has(m.chave)).length, 0);
  assert.equal(sem(MES.slice(2)).movimentos.filter((m) => !ja.has(m.chave)).length, 0);
});

test("duas compras iguais no mesmo dia continuam sendo duas", () => {
  const dois = [["07/10/2026", "-8,00", "", "Compra no débito - CAFE CENTRAL"], ["07/10/2026", "-8,00", "", "Compra no débito - CAFE CENTRAL"]];
  assert.equal(new Set(leConta({ linhas: [["Data", "Valor", "Descrição"], ...dois.map((r) => [r[0], r[1], r[3]])], hoje: HOJE }).movimentos.map((m) => m.chave)).size, 2);
});

test("o que foi lançado à mão e aparece no extrato é avisado, um para um", () => {
  const mov = nu(MES).movimentos.filter((m) => !m.ignorar), manual = [{ id: "m1", data: "2026-10-01", tipo: "Despesa", valor: 14.5, descricao: "padaria", import_key: null }];
  assert.deepEqual([...movimentosJaLancados(mov, manual)], ["nu-id1-s"]);
  const doisPix = [["06/10/2026", "-20,00", "a", "Transferência enviada pelo Pix - A B - 111.222.333-44 - X"], ["06/10/2026", "-20,00", "b", "Transferência enviada pelo Pix - C D - 111.222.333-45 - X"]];
  const m2 = leConta({ linhas: [H, ...doisPix], hoje: HOJE }).movimentos;
  assert.equal(movimentosJaLancados(m2, [{ id: "z", data: "2026-10-06", tipo: "Despesa", valor: 20 }]).size, 1);   // um já lançado, o outro é novo
});

test("Arrumar lançamentos acha as transferências do casal já lançadas, e só as que o banco escreveu como transferência", () => {
  const ls = [
    { id: "1", data: "2026-10-02", tipo: "Despesa", categoria: "Casal", valor: 300, descricao: "Transferência enviada pelo Pix - Julia Gabrielle Ferreira da Silva - 111.222.333-44 - NU" },
    { id: "2", data: "2026-10-03", tipo: "Receita", categoria: "Casal", valor: 1200, descricao: "Transferência recebida pelo Pix - Julia Gabrielle Ferreira da Silva - 111.222.333-44 - NU" },
    { id: "3", data: "2026-10-04", tipo: "Despesa", categoria: "Lazer", valor: 80, descricao: "Jantar com a Julia" },
    { id: "4", data: "2026-10-05", tipo: "Despesa", categoria: "Outros", valor: 20, descricao: "Transferência enviada pelo Pix - Joao Pedro Lima - 123.456.789-00 - NU" },
  ];
  const r = entreMinhasContas(ls, ME, PARC);
  assert.deepEqual(r.itens.map((x) => x.id), ["1", "2"]); assert.equal(r.entradas, 1200); assert.equal(r.saidas, 300);
  assert.equal(entreMinhasContas(ls, ME).itens.length, 0);   // sem conta de casal, não mexe
});

test("depois de deixar as transferências de fora, o saldo do mês é o de verdade", () => {
  const lanc = nu(MES).movimentos.filter((m) => !m.ignorar).map((m, i) => ({ id: String(i), data: m.data, tipo: m.tipo, categoria: m.categoria, valor: m.valor, forma: m.tipo === "Despesa" ? "Pix" : "", descricao: m.descricao }));
  const c = calcMes({ lancamentos: lanc, fixos: [], pagos: [], cartoes: [], faturas: [] }, "2026-10", HOJE);
  assert.equal(c.rec, 2500); assert.equal(c.custo, 34.5); assert.equal(c.saldo, 2465.5);
});
