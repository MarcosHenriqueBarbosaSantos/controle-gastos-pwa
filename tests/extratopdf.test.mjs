// Extrato da conta em PDF (modelo do Itaú, que junta vários meses): as linhas do PDF viram movimentos da conta.
import test from "node:test";
import assert from "node:assert/strict";
import { ehExtratoDeContaPdf, leExtratoDeContaPdf, titularDoPdf } from "../js/extratopdf.js";
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
