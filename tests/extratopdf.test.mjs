// Extrato da conta em PDF (modelo do Itaú, que junta vários meses): as linhas do PDF viram movimentos da conta.
import test from "node:test";
import assert from "node:assert/strict";
import { ehExtratoDeContaPdf, leExtratoDeContaPdf, titularDoPdf, ehExtratoNubankPdf, leExtratoNubankPdf, documentoDeVariasLinhas } from "../js/extratopdf.js";
import { leConta } from "../js/conta.js";

// Linhas como o leitor de PDF entrega (texto de cada linha da página). Nomes e valores inventados.
const PDF = [
  "Maria Souza Lima 123.456.789-09 agência: 0001 conta: 000000-0",
  "extrato conta / lançamentos",
  "período de visualização: 22/07/2026 até 20/10/2026",
  "data lançamentos valor (R$) saldo (R$)",
  "20/10/2026 SALDO DO DIA 13,22",
  "19/10/2026 PIX QRS POSTO DE SE19/10 -90,00",
  "19/10/2026 PIX TRANSF UBER DO19/10 111,80",
  "19/10/2026 SALDO DO DIA 13,22",
  "13/10/2026 PIX QRS GRANJA BEBI10/10 -20,00",
  "13/10/2026 PIX TRANSF Maria S13/10 -50,00",
  "02/10/2026 IOF -0,03",
  "29/09/2026 RESGATE COFRINHOS 300,01",
  "28/09/2026 APLICACAO COFRINHOS -550,00",
  "09/09/2026 TED 104.0000.CAIXA E F 2.111,00",
  "02/01/2027 PIX QRS LOJA X30/12 -15,50",
  "Os saldos acima são baseados nas informações disponíveis até esse instante.",
];

test("reconhece o extrato da conta em PDF e não confunde com outros PDFs", () => {
  assert.equal(ehExtratoDeContaPdf(PDF), true);
  assert.equal(ehExtratoDeContaPdf(["Fatura do cartão", "Vencimento 10/10/2026", "Total R$ 1.200,00"]), false);
  assert.equal(ehExtratoDeContaPdf(["Comprovante de Pix", "20/10/2026 PIX TRANSF Joao -10,00"]), false);   // sem o título e sem vários lançamentos
  assert.equal(ehExtratoDeContaPdf([]), false);
});

test("lê o titular, os meses e deixa os saldos de fora", () => {
  const r = leExtratoDeContaPdf(PDF);
  assert.equal(r.titular, "Maria Souza Lima");
  assert.deepEqual(r.meses, ["2026-09", "2026-10", "2026-12"]);
  assert.equal(r.linhas.length - 1, 9);   // 9 movimentos; 2 saldos do dia ficam de fora
  assert.ok(r.linhas.slice(1).every((l) => !/saldo/i.test(l[3])));
});

test("a data da operação (colada no fim da descrição) vale mais que a data do lançamento, inclusive na virada do ano", () => {
  const r = leExtratoDeContaPdf(PDF), por = (txt) => r.linhas.find((l) => l[3].includes(txt));
  assert.equal(por("GRANJA")[0], "2026-10-10");   // lançado dia 13, comprado dia 10 (fim de semana)
  assert.equal(por("LOJA X")[0], "2026-12-30");   // lançado em 02/01/2027, comprado em 30/12
  assert.equal(por("POSTO")[0], "2026-10-19");
});

test("os movimentos entram no leitor de conta: Pix, entradas, tarifa e o que fica de fora", () => {
  const { linhas, titular } = leExtratoDeContaPdf(PDF), c = leConta({ linhas, hoje: "2026-10-20", meuNome: titular });
  const m = (txt) => c.movimentos.find((x) => x.original.includes(txt));
  assert.equal(m("POSTO").tipo, "Despesa"); assert.equal(m("POSTO").valor, 90); assert.equal(m("POSTO").ignorar, false);
  assert.equal(m("POSTO").categoria, "Transporte");   // pago por QR code: é loja, não pessoa
  assert.equal(m("UBER").tipo, "Receita");
  assert.equal(m("Maria S").ignorar, true); assert.match(m("Maria S").motivo, /suas/);   // nome cortado pelo banco, é o começo do nome do titular
  assert.equal(m("RESGATE").ignorar, true); assert.equal(m("APLICACAO").ignorar, true);
  assert.equal(m("CAIXA").tipo, "Receita"); assert.equal(m("CAIXA").valor, 2111);
  assert.equal(c.movimentos.length, 9);
});

test("importar o mesmo arquivo de novo gera as mesmas chaves, sem repetir", () => {
  const a = leConta({ linhas: leExtratoDeContaPdf(PDF).linhas, hoje: "2026-10-20" }), b = leConta({ linhas: leExtratoDeContaPdf(PDF).linhas, hoje: "2026-10-20" });
  assert.deepEqual(a.movimentos.map((x) => x.chave), b.movimentos.map((x) => x.chave));
  assert.equal(new Set(a.movimentos.map((x) => x.chave)).size, a.movimentos.length);
});

test("titularDoPdf não confunde o título com o nome", () => {
  assert.equal(titularDoPdf(["extrato conta / lançamentos", "data lançamentos valor"]), "");
});

// Linhas como o leitor de PDF entrega para o extrato da conta do Nubank (texto do vídeo do usuário, com nomes inventados).
const NU = [
  "Extrato da conta", "Período: 01 de Outubro de 2026 a 19 de Outubro de 2026",
  "19 OUT 2026 Total de saídas - 110,29",
  "Transferência enviada pelo Pix 99 TECNOLOGIA LTDA - 18.033.552/0001-61 - 15,00",
  "99PAY IP S.A. (0769) Agência: 1 Conta: 31845594-3",
  "Transferência enviada pelo Pix UBER DO BRASIL TECNOLOGIA LTDA. - 17.895.646 39,29 /0001-87 - ADYEN DO BRASIL IP LTDA. Agência: 1",
  "Conta: 160000056-0",
  "Compra no débito NP *POKEEBAR 39,00",
  "Transferência enviada pelo Pix Fulano de Tal - •••.119.378-•• - BCO 17,00",
  "18 OUT 2026 Total de entradas + 50,00",
  "Transferência recebida pelo Pix Beltrana de Tal - •••.222.333-•• - NU PAGAMENTOS 50,00",
  "Total de saídas - 20,00",
  "Pagamento de fatura 20,00",
  "Nu Pagamentos S.A. - Instituição de Pagamento",
];

test("extrato da conta do Nubank em PDF: reconhece e separa cada movimento, mesmo com o valor no meio do documento", () => {
  assert.equal(ehExtratoNubankPdf(NU), true);
  assert.equal(ehExtratoNubankPdf(PDF), false);   // o do Itaú é outro formato
  const r = leExtratoNubankPdf(NU);
  assert.equal(r.linhas.length - 1, 6);
  const v = r.linhas.slice(1).map((l) => [l[0], l[1]]);
  assert.deepEqual(v, [["2026-10-19", -15], ["2026-10-19", -39.29], ["2026-10-19", -39], ["2026-10-19", -17], ["2026-10-18", 50], ["2026-10-18", -20]]);
  assert.match(r.linhas[2][3], /UBER DO BRASIL TECNOLOGIA LTDA\. - 17\.895\.646\/0001-87 - ADYEN/);   // o documento volta inteiro
  assert.deepEqual(r.meses, ["2026-10"]);
});

test("o extrato do Nubank em PDF entra no leitor de conta: Pix de loja, Pix de pessoa, débito, entrada e pagamento de fatura de fora", () => {
  const c = leConta({ linhas: leExtratoNubankPdf(NU).linhas, hoje: "2026-10-20" }), m = (t) => c.movimentos.find((x) => x.original.includes(t));
  assert.equal(m("UBER").tipo, "Despesa"); assert.equal(m("UBER").pessoa, false);   // tem CNPJ: é empresa
  assert.equal(m("Fulano").pessoa, true);
  assert.equal(m("POKEEBAR").forma, "Débito"); assert.equal(m("POKEEBAR").valor, 39);
  assert.equal(m("Beltrana").tipo, "Receita"); assert.equal(m("Beltrana").valor, 50);
  assert.equal(m("Pagamento de fatura").ignorar, true);
});

test("PDF com muitas linhas que o app não lê por linha: diz se parece fatura ou extrato", () => {
  const fatura = ["Fatura do cartão", "Vencimento 10 OUT 2026", ...Array.from({ length: 10 }, (_, i) => `0${(i % 9) + 1} SET Loja ${i} R$ ${10 + i},90`)];
  assert.equal(documentoDeVariasLinhas(fatura), "fatura");
  const extrato = ["Extrato da conta", ...Array.from({ length: 10 }, (_, i) => `0${(i % 9) + 1}/09/2026 Movimento ${i} ${100 + i},00`)];
  assert.equal(documentoDeVariasLinhas(extrato), "extrato");
  assert.equal(documentoDeVariasLinhas(["Comprovante", "Valor R$ 50,00", "20/10/2026"]), null);   // comprovante comum: continua indo para a leitura de um só valor
});
