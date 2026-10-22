// Testes do extrato da conta (Pix, débito e entradas) e dos ajustes no extrato do cartão (saldo do rotativo e vencimento pelo nome do arquivo).
// Os dados abaixo são inventados, só com o mesmo formato dos arquivos que o Nubank exporta.
import test from "node:test";
import assert from "node:assert/strict";
import { pareceConta, leConta } from "../js/conta.js";
import { leExtrato, vencimentoDoNome, separaCsv } from "../js/extrato.js";
import { guessCat } from "../js/excel.js";

const HOJE = "2026-10-20";
const CONTA = `Data,Valor,Identificador,Descrição
01/10/2026,109.65,id-par-1,Valor adicionado na conta por cartão de crédito - Valor adicionado para Pix no Crédito
01/10/2026,-109.65,id-par-1,Transferência enviada pelo Pix - POSTO EXEMPLO LTDA - 11.222.333/0001-44 - BANCO X (0001) Agência: 1 Conta: 2-3
02/10/2026,-30.00,id-2,Transferência enviada pelo Pix - Maria Exemplo - •••.111.222-•• - NU PAGAMENTOS - IP (0260) Agência: 1 Conta: 4-5
03/10/2026,150.00,id-3,Transferência Recebida - João Teste - •••.333.444-•• - NU PAGAMENTOS - IP (0260) Agência: 1 Conta: 6-7
04/10/2026,-4.20,id-4,Compra no débito - CIDADE EXEMPLO
05/10/2026,-125.73,id-5,Pagamento de fatura
06/10/2026,70.00,id-6,Transferência recebida pelo Pix - FULANO DE TAL EXEMPLO - •••.555.666-•• - ITAÚ UNIBANCO S.A. (0341) Agência: 1 Conta: 8-9
07/10/2026,-22.75,id-7,Transferência enviada pelo Pix - MERCEARIA E LANCHONETE EXEMPLO LTDA - 22.333.444/0001-55 - BCO SANTANDER (BRASIL) S.A. (0033) Agência: 1 Conta: 1-0
`;
const CARTAO = `date,title,amount
2026-10-06,Pagamento recebido,"- 22,63"
2026-10-06,Pedagio Rodovia Exemplo,"3,65"
2026-10-05,Loja Exemplo,"40,00"
2026-10-01,Pix no Crédito - POSTO EXEMPLO LTDA,"113,92"
2026-09-28,Juros de pagamento parcial da fatura (rotativo),"29,13"
2026-09-28,IOF de pagamento parcial da fatura (rotativo),"2,53"
2026-09-14,Valor pendente do mês anterior (rotativo),"401,29"
`;

test("reconhece o extrato da conta e não confunde com o do cartão", () => {
  assert.equal(pareceConta(separaCsv(CONTA)), true);
  assert.equal(pareceConta(separaCsv(CARTAO)), false);
  assert.equal(pareceConta([]), false);
  assert.equal(pareceConta(separaCsv("Data;Descrição;Valor\n01/10/2026;Mercado;50,00\n02/10/2026;Padaria;12,00")), false);   // cartão de outro banco
  assert.equal(pareceConta(separaCsv("coisa,outra\n1,2")), false);
});

test("conta: sinal da conta (negativo saiu, positivo entrou), valor sempre positivo", () => {
  const r = leConta({ texto: CONTA, hoje: HOJE }), por = (id) => r.movimentos.find((m) => m.id === id);
  assert.equal(r.movimentos.length, 8);
  assert.deepEqual([por("id-2").tipo, por("id-2").valor], ["Despesa", 30]);
  assert.deepEqual([por("id-3").tipo, por("id-3").valor], ["Receita", 150]);
  assert.deepEqual(r.periodo, { de: "2026-10-01", ate: "2026-10-07" });
});

test("conta: pagamento da fatura e Pix pago no crédito ficam de fora, com o motivo", () => {
  const r = leConta({ texto: CONTA, hoje: HOJE }), fora = r.movimentos.filter((m) => m.ignorar);
  assert.equal(fora.length, 3);
  assert.deepEqual(fora.filter((m) => m.id === "id-par-1").map((m) => m.motivo), Array(2).fill("Pix pago no cartão de crédito: a compra está na fatura do cartão"));
  assert.match(fora.find((m) => m.id === "id-5").motivo, /Pagamento da fatura do cartão/);
  assert.deepEqual(r.resumo, { entradas: 220, saidas: 56.95, ignorados: 3 });   // 150 + 70 e 30 + 4,20 + 22,75
});

test("conta: descrição limpa, forma e categoria sugerida", () => {
  const r = leConta({ texto: CONTA, hoje: HOJE }), por = (id) => r.movimentos.find((m) => m.id === id);
  assert.deepEqual([por("id-2").descricao, por("id-2").forma, por("id-2").pessoa, por("id-2").categoria], ["Maria Exemplo", "Pix", true, "Pix para pessoas"]);
  assert.deepEqual([por("id-7").descricao, por("id-7").pessoa], ["Mercearia e Lanchonete Exemplo", false]);   // sem "LTDA", "e" em minúscula
  assert.notEqual(por("id-7").categoria, "Outros");
  assert.deepEqual([por("id-4").descricao, por("id-4").forma], ["Compra no débito em Cidade Exemplo", "Débito"]);
  assert.equal(por("id-3").forma, "Transferência"); assert.equal(por("id-6").forma, "Pix");
});

test("conta: com o nome da pessoa, as transferências entre contas dela ficam de fora", () => {
  const r = leConta({ texto: CONTA, hoje: HOJE, meuNome: "João Teste" }), j = r.movimentos.find((m) => m.id === "id-3");
  assert.equal(j.ignorar, true); assert.equal(j.motivo, "Transferência entre contas suas");
  assert.equal(r.resumo.entradas, 70);
  assert.equal(leConta({ texto: CONTA, hoje: HOJE, meuNome: "João" }).movimentos.find((m) => m.id === "id-3").ignorar, false);   // só um nome não basta
});

test("conta: a chave de cada movimento não muda ao abrir o arquivo de novo, e o par não repete a chave", () => {
  const a = leConta({ texto: CONTA, hoje: HOJE }).movimentos.map((m) => m.chave), b = leConta({ texto: CONTA, hoje: HOJE }).movimentos.map((m) => m.chave);
  assert.deepEqual(a, b); assert.equal(new Set(a).size, a.length);
  assert.ok(a.includes("nu-id-par-1-e") && a.includes("nu-id-par-1-s"));
  const igual = "Data,Valor,Identificador,Descrição\n01/10/2026,-5.00,,Transferência enviada pelo Pix - A B - •••.1.2-•• - X\n01/10/2026,-5.00,,Transferência enviada pelo Pix - A B - •••.1.2-•• - X\n";
  const k = leConta({ texto: igual, hoje: HOJE }).movimentos.map((m) => m.chave); assert.equal(new Set(k).size, 2);   // dois iguais no mesmo dia são dois movimentos
});

test("conta: arquivo sem as colunas devolve vazio, e valor com vírgula também é lido", () => {
  assert.deepEqual(leConta({ texto: "a,b\n1,2", hoje: HOJE }).movimentos, []);
  const br = "Data;Valor;Descrição\n03/10/2026;-1.234,50;Transferência enviada pelo Pix - Loja X Ltda - 11.222.333/0001-44 - B\n04/10/2026;2.000,00;Transferência recebida pelo Pix - Fulano - •••.1.2-•• - B\n";
  const m = leConta({ texto: br, hoje: HOJE }).movimentos;
  assert.deepEqual(m.map((x) => [x.tipo, x.valor]), [["Despesa", 1234.5], ["Receita", 2000]]);
});

test("cartão: o saldo do rotativo não é compra nova", () => {
  const r = leExtrato({ texto: CARTAO, hoje: HOJE, nome: "Nubank_2026-10-14.csv" });
  assert.equal(r.saldos.length, 1); assert.equal(r.saldos[0].valor, 401.29);
  assert.deepEqual(r.compras.map((c) => c.descricao).sort(), ["IOF de pagamento parcial da fatura (rotativo)", "Juros de pagamento parcial da fatura (rotativo)", "Loja Exemplo", "Pedagio Rodovia Exemplo", "Pix no Crédito - POSTO EXEMPLO LTDA"].sort());   // juros e IOF são custo novo
  assert.equal(r.pagamentos.length, 1);
});

test("cartão: outras formas de dizer 'saldo da fatura anterior'", () => {
  const csv = (d) => `date,title,amount\n2026-10-01,Loja,"10,00"\n2026-10-02,Padaria,"5,00"\n2026-09-10,${d},"80,00"\n`;
  for (const d of ["SALDO FATURA ANTERIOR", "Saldo anterior", "Saldo restante da fatura anterior", "Valor pendente da fatura anterior"])
    assert.equal(leExtrato({ texto: csv(d), hoje: HOJE }).saldos.length, 1, d);
  assert.equal(leExtrato({ texto: csv("Mercado do mês"), hoje: HOJE }).saldos.length, 0);
});

test("cartão: o vencimento vem do nome do arquivo quando a data cai logo depois da última compra", () => {
  assert.equal(leExtrato({ texto: CARTAO, hoje: HOJE, nome: "Nubank_2026-10-14.csv" }).info.vencimento, "2026-10-14");
  assert.equal(leExtrato({ texto: CARTAO, hoje: HOJE, nome: "extrato.csv" }).info.vencimento, null);
  assert.equal(vencimentoDoNome("Nubank_2026-10-14.ofx", "2026-10-07"), "2026-10-14");   // com o fechamento, como era
  assert.equal(vencimentoDoNome("Nubank_2026-10-14.csv", null, "2026-10-06"), "2026-10-14");
  assert.equal(vencimentoDoNome("Nubank_2026-10-14.csv", null, "2026-08-01"), null);   // longe demais da última compra
  assert.equal(vencimentoDoNome("Nubank_2026-10-14.csv", null, "2026-10-20"), null);   // antes da última compra
  assert.equal(vencimentoDoNome("Nubank.csv", null, "2026-10-06"), null);
});

test("categorias novas: pedágio, posto junto, mercearia e bebidas", () => {
  const esperado = { "Autopostoduque": "Transporte", "Rodoanel Pedagio": "Transporte", "Armazem da Vila Sp": "Mercado", "Granja Bebidas": "Alimentação", "Mercearia Dona Ana": "Mercado", "Ecovias Imigrantes": "Transporte" };
  for (const [nome, cat] of Object.entries(esperado)) assert.equal(guessCat(nome, "Despesa"), cat, nome);
  assert.equal(guessCat("Loja Qualquer", "Despesa"), "Outros");   // sem pista, continua Outros
});

test("ida e volta: mesma pessoa, mesmo valor, poucos dias → suspeita, sem precisar do nome", () => {
  const csv = `Data,Valor,Identificador,Descrição
02/10/2026,-500.00,a1,Transferência enviada pelo Pix - Marcos H B Santos - •••.111.222-•• - BANCO X (0001) Agência: 1 Conta: 2-3
03/10/2026,500.00,a2,Transferência recebida pelo Pix - Marcos H B Santos - •••.111.222-•• - BANCO X (0001) Agência: 1 Conta: 2-3
04/10/2026,-30.00,a3,Transferência enviada pelo Pix - Maria Exemplo - •••.333.444-•• - NU PAGAMENTOS - IP (0260) Agência: 1 Conta: 4-5
20/10/2026,-500.00,a4,Transferência enviada pelo Pix - Marcos H B Santos - •••.111.222-•• - BANCO X (0001) Agência: 1 Conta: 2-3`;
  const r = leConta({ texto: csv, hoje: "2026-10-21" });
  const por = (id) => r.movimentos.find((m) => m.id === id);
  assert.ok(por("a1").suspeita); assert.ok(por("a2").suspeita);
  assert.equal(por("a3").suspeita, undefined);
  assert.equal(por("a4").suspeita, undefined);   // longe demais para ser o mesmo par
  assert.equal(por("a1").ignorar, false);        // nada é descartado
});
