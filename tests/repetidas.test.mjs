import test from "node:test";
import assert from "node:assert/strict";
import { contasQueSeRepetem } from "../js/arrumar.js";

const L = (id, data, descricao, valor, extra = {}) => ({ id, data, descricao, valor, tipo: "Despesa", categoria: "Outros", forma: "Pix", ...extra });
const HOJE = "2026-10-21";

test("aluguel que sai todo mês, no mesmo valor e perto do mesmo dia, vira sugestão de conta fixa", () => {
  const r = contasQueSeRepetem([L("a", "2026-08-05", "Transferência enviada pelo Pix - IMOBILIARIA SOL - 123", 1100), L("b", "2026-09-05", "Transferência enviada pelo Pix - IMOBILIARIA SOL - 123", 1100), L("c", "2026-10-06", "Transferência enviada pelo Pix - IMOBILIARIA SOL - 123", 1100)], [], HOJE);
  assert.equal(r.length, 1); assert.equal(r[0].valor, 1100); assert.equal(r[0].dia, 5); assert.equal(r[0].desde, "2026-08-01"); assert.equal(r[0].itens.length, 3);
});

test("gasto do dia a dia não vira conta fixa: várias vezes no mês ou valores soltos", () => {
  const mercado = [L("1", "2026-09-03", "Mercado Bom Preço", 80), L("2", "2026-09-17", "Mercado Bom Preço", 95), L("3", "2026-10-02", "Mercado Bom Preço", 70)];
  assert.equal(contasQueSeRepetem(mercado, [], HOJE).length, 0);
  const solto = [L("4", "2026-09-10", "Farmácia Vida", 40), L("5", "2026-10-11", "Farmácia Vida", 210)];
  assert.equal(contasQueSeRepetem(solto, [], HOJE).length, 0);
  const diasLonge = [L("6", "2026-09-02", "Academia Forte", 100), L("7", "2026-10-25", "Academia Forte", 100)];
  assert.equal(contasQueSeRepetem(diasLonge, [], HOJE).length, 0);
});

test("conta de luz e internet podem variar; o mercado não", () => {
  const luz = [L("1", "2026-08-12", "ENEL Distribuicao", 180), L("2", "2026-09-12", "ENEL Distribuicao", 230), L("3", "2026-10-13", "ENEL Distribuicao", 210)];
  const r = contasQueSeRepetem(luz, [], HOJE); assert.equal(r.length, 1); assert.equal(r[0].variavel, true); assert.equal(r[0].valor, 210);
});

test("o que já é conta fixa cadastrada fica de fora, e série antiga também", () => {
  const net = [L("1", "2026-08-10", "Vivo Internet", 120), L("2", "2026-09-10", "Vivo Internet", 120), L("3", "2026-10-10", "Vivo Internet", 120)];
  assert.equal(contasQueSeRepetem(net, [{ tipo: "Despesa", descricao: "Internet Vivo", valor: 120, dia: 10 }], HOJE).length, 0);
  const velha = [L("4", "2026-03-10", "Curso Inglês", 300), L("5", "2026-04-10", "Curso Inglês", 300)];
  assert.equal(contasQueSeRepetem(velha, [], HOJE).length, 0);
});

test("com um mês faltando no meio, só a parte seguida até hoje conta, e salário vira entrada fixa", () => {
  const r = contasQueSeRepetem([L("1", "2026-05-05", "Condomínio Jardim", 500), L("2", "2026-07-05", "Condomínio Jardim", 500), L("3", "2026-08-05", "Condomínio Jardim", 500), L("4", "2026-09-05", "Condomínio Jardim", 500)], [], HOJE);
  assert.equal(r[0].desde, "2026-07-01"); assert.equal(r[0].itens.length, 3);
  const sal = contasQueSeRepetem([L("a", "2026-09-30", "SALARIO EMPRESA XYZ", 3900, { tipo: "Receita" }), L("b", "2026-10-01", "SALARIO EMPRESA XYZ", 3900, { tipo: "Receita" })], [], HOJE);
  assert.equal(sal.length, 1); assert.equal(sal[0].tipo, "Receita");
});

test("compra no cartão e movimento sem nome ficam de fora", () => {
  const c = [L("1", "2026-09-05", "Netflix", 40, { forma: "Cartão de crédito" }), L("2", "2026-10-05", "Netflix", 40, { forma: "Cartão de crédito" })];
  assert.equal(contasQueSeRepetem(c, [], HOJE).length, 0);
});

test("o mercado do mês e o posto não viram conta fixa, mesmo repetindo valor e dia", () => {
  const m = [L("1", "2026-09-03", "Mercado do Mês", 578.2, { categoria: "Mercado" }), L("2", "2026-10-03", "Mercado do Mês", 578.2, { categoria: "Mercado" })];
  assert.equal(contasQueSeRepetem(m, [], HOJE).length, 0);
  const posto = [L("3", "2026-09-04", "Posto Shell Centro", 200), L("4", "2026-10-04", "Posto Shell Centro", 200)];
  assert.equal(contasQueSeRepetem(posto, [], HOJE).length, 0);
});

test("o nome sugerido não leva o texto do banco", () => {
  const r = contasQueSeRepetem([L("1", "2026-09-08", "Pagamento de boleto efetuado - COLEGIO ABC LTDA", 450), L("2", "2026-10-08", "Pagamento de boleto efetuado - COLEGIO ABC LTDA", 450)], [], HOJE);
  assert.match(r[0].nome, /^Col[eé]gio Abc/i); assert.ok(!/boleto/i.test(r[0].nome));
});

import { proximasRepetidas } from "../js/arrumar.js";
test("próximas das repetidas: dia habitual ainda por vir, e só se o mês ainda não tem o lançamento", () => {
  const g = { chave: "d|colegio", nome: "Colégio", tipo: "Despesa", valor: 800, dia: 25, itens: [{ data: "2026-08-25" }, { data: "2026-09-25" }] };
  const r = proximasRepetidas([g], "2026-10-22");
  assert.equal(r.length, 1); assert.equal(r[0].data, "2026-10-25"); assert.equal(r[0].dias, 3); assert.equal(r[0].titulo, "Colégio");
  assert.equal(proximasRepetidas([g], "2026-10-26")[0].data, "2026-11-25");                    // já passou: vale o próximo mês, se couber na janela
  assert.equal(proximasRepetidas([g], "2026-10-26", 20).length, 0);                            // fora da janela
  assert.equal(proximasRepetidas([{ ...g, itens: [...g.itens, { data: "2026-10-25" }] }], "2026-10-22").length, 0);   // já veio este mês
  assert.equal(proximasRepetidas([{ ...g, tipo: "Receita" }], "2026-10-22").length, 0);       // entrada não é vencimento
});
