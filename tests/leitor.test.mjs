// Testes do leitor: a parte que transforma o texto lido da foto em valor, data e descrição.
// Os textos de tests/fixtures/leitor-ocr.json são saídas reais de um leitor (Tesseract) em imagens de exemplo.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { interpretaTexto } from "../js/leitor.js";

const HOJE = "2026-10-04";
const lidos = JSON.parse(readFileSync(new URL("./fixtures/leitor-ocr.json", import.meta.url), "utf8"));
const le = (nome) => { const v = lidos[nome]; return interpretaTexto(typeof v === "string" ? v : v.texto, HOJE); };

test("comprovante de Pix: valor, data, quem recebeu e forma", () => {
  for (const nome of ["pix_nubank", "pix_nubank_foto"]) {
    const r = le(nome);
    assert.equal(r.tipo, "comprovante"); assert.equal(r.valor, 150); assert.equal(r.data, "2026-10-03");
    assert.equal(r.descricao, "Maria Aparecida da Silva"); assert.equal(r.forma, "Pix"); assert.equal(r.cartao, "");
  }
  for (const nome of ["pix_itau", "pix_itau_foto"]) {
    const r = le(nome);
    assert.equal(r.tipo, "comprovante"); assert.equal(r.valor, 1100); assert.equal(r.data, "2026-10-02");
    assert.equal(r.descricao, "Imobiliaria Boa Morada Ltda"); assert.equal(r.forma, "Pix");
  }
});

test("cupom fiscal: pega o total (não o troco nem o dinheiro entregue) e o nome da loja", () => {
  const r = le("cupom");
  assert.equal(r.tipo, "comprovante"); assert.equal(r.valor, 60); assert.equal(r.data, "2026-10-01");
  assert.equal(r.descricao, "Supermercado Bom Preco Ltda"); assert.equal(r.forma, "Dinheiro");
});

test("foto ruim de cupom: mesmo com letra trocada pelo leitor, acha a linha do total, a data e a loja", () => {
  const r = le("cupom_foto");
  assert.equal(r.tipo, "comprovante"); assert.equal(r.data, "2026-10-01"); assert.equal(r.descricao, "Supermercado Bom Preco Ltda");
  assert.ok(r.valor >= 60 && r.valor < 61, "o leitor trocou um dígito dos centavos; por isso o app sempre pede conferência");
});

test("comprovante de maquininha: valor, data, loja e crédito", () => {
  for (const nome of ["maquininha", "maquininha_foto"]) {
    const r = le(nome);
    assert.equal(r.valor, 18.5); assert.equal(r.data, "2026-10-03"); assert.equal(r.descricao, "Padaria Doce Pao"); assert.equal(r.forma, "Cartão de crédito");
  }
});

test("fatura do cartão: só o total e o vencimento (não o mínimo nem o limite)", () => {
  for (const nome of ["fatura_nubank", "fatura_nubank_foto"]) {
    const r = le(nome);
    assert.equal(r.tipo, "fatura"); assert.equal(r.valor, 1234.56); assert.equal(r.vencimento, "2026-10-08");
    assert.equal(r.cartao, "Nubank"); assert.equal(r.data, null); assert.equal(r.descricao, "");
  }
  for (const nome of ["fatura_itau", "fatura_itau_foto"]) {
    const r = le(nome);
    assert.equal(r.tipo, "fatura"); assert.equal(r.valor, 2540); assert.equal(r.vencimento, "2026-11-10"); assert.equal(r.cartao, "Itaucard");
  }
});

test("fatura: o valor mínimo e o limite ficam de fora, mesmo sendo maiores ou vindo antes", () => {
  const r = interpretaTexto(["Banco Inter", "Limite disponível R$ 8.000,00", "Pagamento mínimo R$ 95,40", "Resumo da fatura", "Fatura anterior R$ 410,00", "Total desta fatura", "R$ 636,12", "Vencimento", "15 NOV"].join("\n"), HOJE);
  assert.equal(r.tipo, "fatura"); assert.equal(r.valor, 636.12); assert.equal(r.vencimento, "2026-11-15"); assert.equal(r.cartao, "Inter");
});

test("boleto pago: valor pago, data do pagamento e favorecido", () => {
  const r = interpretaTexto(["Comprovante de pagamento de boleto", "Beneficiário: COMPANHIA DE ENERGIA DO SUL", "CNPJ 12.345.678/0001-90", "Data de vencimento 10/10/2026", "Data do pagamento 02/10/2026", "Valor do documento R$ 187,35", "Desconto R$ 0,00", "Valor pago R$ 187,35", "Linha digitável 83660000001 9 87350048100 2"].join("\n"), HOJE);
  assert.equal(r.tipo, "comprovante"); assert.equal(r.valor, 187.35); assert.equal(r.data, "2026-10-02");
  assert.equal(r.descricao, "Companhia De Energia Do Sul"); assert.equal(r.forma, "Boleto");
});

test("data sem ano usa o ano mais perto de hoje (compra de dezembro lida em janeiro)", () => {
  const r = interpretaTexto("Comprovante\nPagamento realizado em 28/12\nValor R$ 40,00", "2027-01-03");
  assert.equal(r.data, "2026-12-28"); assert.equal(r.valor, 40);
});

test("valor com ponto no lugar da vírgula só vale quando tem R$", () => {
  assert.equal(interpretaTexto("Comprovante Pix\nValor R$ 45.90\n03/10/2026", HOJE).valor, 45.9);
  assert.equal(interpretaTexto("Comprovante\nData 03.10.2026\nHora 12.50", HOJE).valor, null);
});

test("não usa como data do gasto uma data no futuro", () => {
  const r = interpretaTexto("Comprovante\nValidade 20/12/2026\nValor R$ 10,00", HOJE);
  assert.equal(r.data, null); assert.equal(r.achouData, false);
});

test("texto vazio ou sem nada útil não quebra e não inventa valor", () => {
  for (const t of ["", null, undefined, "bom dia\ntudo bem"]) {
    const r = interpretaTexto(t, HOJE);
    assert.equal(r.valor, null); assert.equal(r.tipo, "comprovante"); assert.deepEqual(r.valores, []); assert.equal(r.achouData, false);
  }
});

test("outros valores lidos ficam como sugestão, sem repetir o escolhido", () => {
  const r = le("cupom");
  assert.ok(!r.valores.includes(r.valor)); assert.ok(r.valores.length <= 4);
});
