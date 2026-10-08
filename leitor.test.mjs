// Testes do leitor: a parte que transforma o texto lido da foto em valor, data e descrição.
// Os textos de tests/fixtures/leitor-ocr.json são saídas reais de um leitor (Tesseract) em imagens de exemplo.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { interpretaTexto, linhasDoPdf, ehPdf, leCodigoDePagamento, lePix, valorPorExtenso, juntaLeituras, limpaFundo, inclinacao, ehImagemDeTela } from "../js/leitor.js";

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

/* ---------- holerite e PDF ---------- */
// Os textos de tests/fixtures/leitor-pdf.json foram tirados de PDFs de exemplo pelo pdf.js (o mesmo leitor do app);
// os que começam com "foto_" são os mesmos holerites fotografados e lidos pelo Tesseract.
const pdfs = JSON.parse(readFileSync(new URL("./fixtures/leitor-pdf.json", import.meta.url), "utf8"));
const lePdf = (nome) => interpretaTexto(pdfs[nome], HOJE);

test("holerite em PDF: pega o valor líquido, não o bruto nem os descontos", () => {
  for (const [nome, liquido] of [["holerite_tabela", 2056.46], ["holerite_simples", 3227.55], ["holerite_colunas", 2927.53]]) {
    const r = lePdf(nome);
    assert.equal(r.tipo, "holerite", nome); assert.equal(r.valor, liquido, nome); assert.equal(r.descricao, "Salário"); assert.equal(r.forma, ""); assert.equal(r.cartao, "");
    assert.ok(!r.valores.includes(r.valor));
  }
});

test("holerite: a data só vem quando o documento diz o dia do pagamento (a de admissão não serve)", () => {
  assert.equal(lePdf("holerite_simples").data, "2026-10-05");   // "Data de pagamento: 05/10/2026" (amanhã ainda vale)
  assert.equal(lePdf("holerite_tabela").data, null);            // só tem a data de admissão
  assert.equal(lePdf("holerite_colunas").data, null);
});

test("holerite fotografado: mesmo com as colunas separadas pelo leitor, acha o líquido", () => {
  assert.equal(lePdf("foto_holerite_tabela").valor, 2056.46);
  assert.equal(lePdf("foto_holerite_colunas").valor, 2927.53);
  const r = lePdf("foto_holerite_simples");   // nomes em uma coluna, valores em outra: o líquido é o último da fila
  assert.equal(r.tipo, "holerite"); assert.equal(r.valor, 3227.55); assert.ok(r.valores.includes(4000));
});

test("holerite sem a palavra líquido: usa a conta vencimentos − descontos", () => {
  const r = interpretaTexto(["CONTRACHEQUE", "Funcionário: Ana Lima  Matrícula 77", "Salário base 2.500,00", "INSS 197,32", "Total de vencimentos 2.500,00", "Total de descontos 197,32", "Valor a receber 2.302,68", "FGTS 200,00"].join("\n"), HOJE);
  assert.equal(r.tipo, "holerite"); assert.equal(r.valor, 2302.68);
});

test("fatura e comprovante em PDF continuam sendo fatura e comprovante", () => {
  let r = lePdf("fatura_cartao");
  assert.equal(r.tipo, "fatura"); assert.equal(r.valor, 1482.37); assert.equal(r.vencimento, "2026-10-08"); assert.equal(r.cartao, "Nubank");
  r = lePdf("fatura_senha");
  assert.equal(r.tipo, "fatura"); assert.equal(r.valor, 2540); assert.equal(r.vencimento, "2026-11-10"); assert.equal(r.cartao, "Itaucard");
  r = lePdf("comprovante_pix");
  assert.equal(r.tipo, "comprovante"); assert.equal(r.valor, 250); assert.equal(r.data, "2026-10-03"); assert.equal(r.descricao, "Oficina Mecânica Dois Irmãos"); assert.equal(r.forma, "Pix");
});

test("comprovante de Pix de um salário recebido não vira holerite", () => {
  const r = interpretaTexto("Comprovante de transferência Pix\nValor R$ 1.800,00\n03/10/2026\nDescrição: pagamento de salário\nDestino\nNome: José Carlos", HOJE);
  assert.equal(r.tipo, "comprovante"); assert.equal(r.valor, 1800);
});

test("linhasDoPdf: monta as linhas de cima para baixo e da esquerda para a direita", () => {
  const itens = [   // y cresce para cima, como no PDF; os itens chegam fora de ordem
    { str: "2.056,46", x: 480, y: 508, h: 12 }, { str: "Valor Líquido", x: 400, y: 508.4, h: 10 },
    { str: "RECIBO", x: 300, y: 800, h: 11 }, { str: "EMPRESA", x: 40, y: 800, h: 12 }, { str: " ", x: 100, y: 800, h: 12 },
    { str: "Total", x: 40, y: 546, h: 8 }, { str: "", x: 60, y: 520, h: 8 },
  ];
  assert.deepEqual(linhasDoPdf(itens), ["EMPRESA RECIBO", "Total", "Valor Líquido 2.056,46"]);
  assert.deepEqual(linhasDoPdf([]), []);
});

test("ehPdf reconhece pelo tipo ou pelo nome do arquivo", () => {
  assert.equal(ehPdf({ type: "application/pdf", name: "x" }), true); assert.equal(ehPdf({ type: "", name: "Fatura.PDF" }), true);
  assert.equal(ehPdf({ type: "image/png", name: "foto.png" }), false); assert.equal(ehPdf(null), false);
});

/* ---------- boleto, guia e conta: fotos difíceis ---------- */
// Dígitos verificadores, para montar códigos válidos nos testes (as mesmas contas que o leitor confere).
const dv10 = (n) => { let s = 0, p = 2; for (let i = n.length - 1; i >= 0; i--) { const x = Number(n[i]) * p; s += x > 9 ? x - 9 : x; p = p === 2 ? 1 : 2; } return (10 - (s % 10)) % 10; };
const dv11 = (n) => { let s = 0, p = 2; for (let i = n.length - 1; i >= 0; i--) { s += Number(n[i]) * p; p = p === 9 ? 2 : p + 1; } const r = s % 11; return r < 2 ? 0 : 11 - r; };
/** Linha digitável de conta ou tributo (48 números) para um valor em centavos. id "6": dígitos pelo módulo 10; "8": pelo módulo 11. */
function linhaDeConta(centavos, id = "6", resto = "0478202401221012407030000000") {
  const semDv = "81" + id + String(centavos).padStart(11, "0") + resto.padEnd(29, "0").slice(0, 29), dv = id === "6" ? dv10 : dv11;
  const barras = semDv.slice(0, 3) + dv(semDv) + semDv.slice(3);
  return [0, 11, 22, 33].map((i) => barras.slice(i, i + 11)).map((b) => `${b}-${dv(b)}`).join(" ");
}
/** Linha digitável de boleto de banco (47 números). */
function linhaDeBoleto(centavos, fator) {
  const c = (x) => x + dv10(x), c1 = c("001905009"), c2 = c("0123456789"), c3 = c("9876543210");
  return `${c1.slice(0, 5)}.${c1.slice(5)} ${c2.slice(0, 5)}.${c2.slice(5)} ${c3.slice(0, 5)}.${c3.slice(5)} 7 ${String(fator).padStart(4, "0")}${String(centavos).padStart(10, "0")}`;
}

test("linha digitável de conta ou tributo: o valor sai dos números, com os dígitos conferidos", () => {
  for (const id of ["6", "8"]) {
    const r = leCodigoDePagamento("qualquer coisa\n" + linhaDeConta(212413, id) + "\nfim", HOJE);
    assert.equal(r.valor, 2124.13); assert.equal(r.conferido, true); assert.equal(r.tipo, "conta");
  }
  // O leitor troca o traço por ponto ou some com ele: continua valendo.
  const torta = linhaDeConta(18743).replace(/-/g, (x, i) => (i % 2 ? "." : " "));
  assert.equal(leCodigoDePagamento(torta, HOJE).valor, 187.43);
  // Um dígito lido errado: o código deixa de conferir e o valor vira só uma pista.
  const errada = linhaDeConta(212413).replace(/^8(\d)/, (x, d) => "8" + ((Number(d) + 1) % 10));
  assert.notEqual(leCodigoDePagamento(errada, HOJE)?.conferido, true);
  assert.equal(leCodigoDePagamento("Protocolo 12345678901234567890", HOJE), null);
});

test("linha digitável e código de barras de boleto: valor e vencimento (o fator recomeçou em 22/02/2025)", () => {
  const r = leCodigoDePagamento(linhaDeBoleto(35990, 1600), HOJE);          // 1600 − 1000 = 600 dias depois de 22/02/2025
  assert.equal(r.valor, 359.9); assert.equal(r.conferido, true); assert.equal(r.tipo, "boleto"); assert.equal(r.vencimento, "2026-10-15");
  assert.equal(leCodigoDePagamento(linhaDeBoleto(10000, 9600), "2024-01-10").vencimento, "2024-01-19");   // contagem antiga, de 07/10/1997
  assert.equal(leCodigoDePagamento(linhaDeBoleto(0, 1600), HOJE), null, "boleto sem valor não inventa valor");
  // Os 44 números do código de barras, como chegam da câmera.
  const semDv = "0019" + "1600" + "0000035990" + "0".repeat(25), geral = (() => { const x = dv11(semDv); return x === 0 ? 1 : x; })();
  const barras = semDv.slice(0, 4) + geral + semDv.slice(4);
  const b = leCodigoDePagamento(barras, HOJE);
  assert.equal(b.valor, 359.9); assert.equal(b.conferido, true); assert.equal(b.vencimento, "2026-10-15");
});

test("Pix copia e cola: valor e nome de quem recebe", () => {
  const campo = (id, v) => id + String(v.length).padStart(2, "0") + v;
  const pix = campo("00", "01") + campo("26", campo("00", "br.gov.bcb.pix") + campo("01", "chave@exemplo.com")) + campo("52", "0000") + campo("53", "986") + campo("54", "89.90") + campo("58", "BR") + campo("59", "PADARIA DOCE PAO") + campo("60", "SAO PAULO") + "6304ABCD";
  const r = lePix("texto antes\n" + pix);
  assert.equal(r.valor, 89.9); assert.equal(r.nome, "Padaria Doce Pao");
  const lido = interpretaTexto(pix, HOJE);
  assert.equal(lido.valor, 89.9); assert.equal(lido.descricao, "Padaria Doce Pao"); assert.equal(lido.forma, "Pix"); assert.equal(lido.firme, true);
  assert.equal(lePix("000201 nada a ver"), null);
});

test("guia de IPTU fotografada: nome do campo em cima, valor embaixo, colunas misturadas pelo leitor", () => {
  // Texto real devolvido pelo leitor (Tesseract) para a foto de uma guia de tributo, com a coluna ao lado colada nas linhas.
  const texto = ["MUNICIPIO DE COTIA ;", ", LOCAL DE PAGAMENTO", "PARCELA VENCIMENTO : PAGAVEL NA REDE BANCARIA AUTORIZADF", "UNICA 22/01/2024", "' CEDENTE", "N° DOCUMENTO : PREFEITURA DO MUNICIPIO DE COTIA—A\\", "1258",
    "| DATA DO DOCUMENTO", "CODIGO BAIXA + 02/01/2024", "101240703 « __", "V INSTRUGOES", "VALOR DO DOCUMENTO 1 APOS O VENCIMENTO, COBRAR MULTA DE 2% — a", "2.124,13 ' NAO RECEBER APOS 30 DIAS DO CIMENTC",
    "| inscrig&o: 23142.63.94.0123.00.000 8", "( DESCONTO ' re a", "(+) MULTA fr — —", "(+) JUROS 6727-000 C", "TRIBUTO IPTU 2024", "VALOR COBRADO +.", "2. 13 |", "SACADO 3", "MARIA APARECIDA DA SILVA S"].join("\n");
  const r = interpretaTexto(texto, HOJE);
  assert.equal(r.tipo, "comprovante"); assert.equal(r.valor, 2124.13); assert.equal(r.firme, true);
  assert.equal(r.data, "2024-01-22", "o dia é o do vencimento, não o da emissão do documento");
  assert.equal(r.descricao, "IPTU"); assert.equal(r.forma, "Boleto");
});

test("pontuação do valor estragada pelo leitor: ainda acha, e a linha digitável decide", () => {
  // Nenhum valor saiu inteiro: "212413", "124,13", "2.12413". A linha digitável saiu certa e confere.
  const linha = linhaDeConta(212413);
  const texto = ["MUNICIPIO DE CoTiA : " + linha.replace(/-/g, "."), "VALOR OO DocuaENT APOS 0 VENCIMENTO, COBRAR MULTA DE 2% 212413", "124,13 ; NAO RECEBER APCS", "VENCIMENTO 22/01/2024", "2.12413}"].join("\n");
  const r = interpretaTexto(texto, HOJE);
  assert.equal(r.valor, 2124.13); assert.equal(r.firme, true); assert.equal(r.data, "2024-01-22");
  // Sem a linha digitável: fica com o valor reconstruído ("2.12413" → 2.124,13) só como sugestão ou palpite, nunca escondido.
  const sem = interpretaTexto(texto.split("\n").slice(1).join("\n"), HOJE);
  assert.ok([sem.valor, ...sem.valores].includes(2124.13));
  // Outras formas estragadas do mesmo valor.
  for (const v of ["Valor do documento 2.124, 13", "Valor do documento 2.124.13"]) assert.equal(interpretaTexto(v, HOJE).valor, 2124.13, v);
  // "2 124,13" tanto pode ser 2.124,13 quanto um 2 solto antes de 124,13: os dois ficam à mão.
  const duvida = interpretaTexto("Valor do documento 2 124,13", HOJE);
  assert.deepEqual([duvida.valor, ...duvida.valores].sort((a, b) => a - b), [124.13, 2124.13]);
  // Tarifa com cinco casas e inscrição não viram valor.
  assert.equal(interpretaTexto("Tarifa 0,72514 kWh\nInscrição 23142.63.94.0123", HOJE).valor, null);
});

test("sem nenhuma palavra que ajude, ainda sugere um valor em vez de voltar vazio", () => {
  const r = interpretaTexto("Rua das Flores 100\n1258\n359,90\n12/09/2026\n359,90", HOJE);
  assert.equal(r.valor, 359.9); assert.equal(r.firme, false);
  const neg = interpretaTexto("Saldo em conta R$ 1.000,00\nLimite disponível R$ 500,00", HOJE);
  assert.equal(neg.valor, null, "saldo e limite não são gasto"); assert.deepEqual(neg.valores, [500, 1000], "mas ficam como sugestão para tocar");
});

test("conta de luz para pagar: total a pagar, vencimento e descrição", () => {
  const texto = ["Companhia de Energia do Estado S.A.", "CNPJ 00.000.000/0001-00 — Nota Fiscal / Conta de Energia Elétrica nº 012.345.678", "MÊS DE REFERÊNCIA VENCIMENTO TOTAL A PAGAR", "09/2026 15/09/2026 R$ 187,43",
    "Consumo kWh 212 0,72514 153,73", "Contribuição de iluminação pública 21,90", "Leitura anterior 03/08/2026 — Leitura atual 02/09/2026", "Saldo devedor anterior: R$ 0,00", linhaDeConta(18743)].join("\n");
  const r = interpretaTexto(texto, HOJE);
  assert.equal(r.valor, 187.43); assert.equal(r.firme, true); assert.equal(r.descricao, "Conta de luz"); assert.equal(r.forma, "Boleto");
  assert.equal(r.vencimento, "2026-09-15"); assert.equal(r.data, "2026-09-15");
  // Vencimento ainda no futuro: o gasto fica com a data de hoje (data vazia) e o vencimento vai à parte.
  const futura = interpretaTexto(texto.replace("15/09/2026", "15/11/2026"), HOJE);
  assert.equal(futura.data, null); assert.equal(futura.vencimento, "2026-11-15");
});

test("valor por extenso: recibo sem o número legível", () => {
  assert.equal(valorPorExtenso("a importância de oitocentos e cinquenta reais, referente"), 850);
  assert.equal(valorPorExtenso("Recebi mil e duzentos reais e cinquenta centavos"), 1200.5);
  assert.equal(valorPorExtenso("a quantia de dois mil, trezentos e quarenta e cinco reais"), 2345);
  assert.equal(valorPorExtenso("dois mil trezentos e quarenta e cinco reais"), 2345);
  assert.equal(valorPorExtenso("cento e vinte e três mil reais"), 123000);
  assert.equal(valorPorExtenso("um real"), 1); assert.equal(valorPorExtenso("dezenove reais e noventa centavos"), 19.9);
  assert.equal(valorPorExtenso("pagamento em reais"), null); assert.equal(valorPorExtenso(""), null);
  const r = interpretaTexto("RECIBO\nRecebi de Marcos Henrique a importância de oitocentos e cinquenta reais, referente ao aluguel do mês de\nsetembro de 2026 do imóvel situado na Rua das Flores, 100.\nPara maior clareza, firmo o presente recibo.\nSão Paulo, 05 de setembro de 2026.", HOJE);
  assert.equal(r.valor, 850); assert.equal(r.firme, true); assert.equal(r.data, "2026-09-05"); assert.equal(r.descricao, "Aluguel do mês de setembro de 2026");
});

test("juntar leituras: a firme manda, a outra completa", () => {
  const a = interpretaTexto("VALOR DO DOCUMENTO\n2.124,13\nVENCIMENTO\n221012024 x", HOJE);                    // valor firme, data pela palavra ao lado
  const semData = interpretaTexto("VALOR DO DOCUMENTO\n2.124,13", HOJE), soData = interpretaTexto("PAGAVEL ATE O VENCIMENTO\nVENCIMENTO 22/01/2024\n17,00", HOJE);
  assert.equal(a.valor, 2124.13); assert.equal(a.data, "2024-01-22");
  const j = juntaLeituras(semData, soData);
  assert.equal(j.valor, 2124.13); assert.equal(j.firme, true); assert.equal(j.data, "2024-01-22"); assert.ok(j.valores.includes(17));
  // Palpite na primeira, firme na segunda: fica o firme, e o palpite vira sugestão.
  const k = juntaLeituras(interpretaTexto("359,00", HOJE), interpretaTexto("Total a pagar R$ 359,90", HOJE));
  assert.equal(k.valor, 359.9); assert.deepEqual(k.valores, [359]);
  assert.equal(juntaLeituras(null, a), a); assert.equal(juntaLeituras(a, null), a);
});

/* ---------- fotos de papel: textos reais do leitor em fotos tortas, com sombra, sobre a mesa ---------- */
const fotos = JSON.parse(readFileSync(new URL("./fixtures/leitor-fotos.json", import.meta.url), "utf8"));
test("fotos de papel (guia, conta, recibo, boleto, cupom): valor, data e descrição, olhando a foto de até três jeitos", () => {
  for (const [nome, f] of Object.entries(fotos)) {
    let r = null, n = 0;
    for (const texto of f.passadas) { n++; r = juntaLeituras(r, interpretaTexto(texto, HOJE)); if (r.firme && r.achouData) break; }   // como o app faz
    assert.equal(r.valor, f.valor, `${nome}: valor`);
    if (f.valor === null) continue;
    assert.equal(r.firme, true, `${nome}: firme`);
    assert.equal(r.data, f.data, `${nome}: data`);
    if (f.vencimento) assert.equal(r.vencimento, f.vencimento, `${nome}: vencimento`);
    if (f.descricao) assert.equal(r.descricao, f.descricao, `${nome}: descrição`);
  }
});

/* ---------- preparo da foto ---------- */
/** Monta uma "foto": mesa escura, papel claro girado, linhas de texto, sombra de um lado e chuvisco de câmera. */
function fotoDeTeste({ W = 480, H = 640, graus = 4, mesa = 70, margem = 60, sombra = 0.5 } = {}) {
  const lum = new Uint8ClampedArray(W * H), a = (graus * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  let semente = 7; const rnd = () => ((semente = (semente * 1103515245 + 12345) >>> 0) / 4294967296 - 0.5);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = x - W / 2, dy = y - H / 2, u = dx * c + dy * s, v = -dx * s + dy * c;          // posição no papel
    const noPapel = Math.abs(u) < W / 2 - margem && Math.abs(v) < H / 2 - margem;
    const texto = noPapel && Math.abs(u) < W / 2 - margem - 30 && ((v + H) % 26) < 7 && ((u + W) % 9) < 6;   // linhas de "letras"
    const luz = 1 - sombra * (x / W);                                                          // mais escuro à direita
    lum[y * W + x] = (noPapel ? (texto ? 35 : 235) : mesa) * (margem ? luz : luz) + rnd() * 10;
  }
  return { lum, W, H };
}
const mediaDe = (lum, W, x0, y0, x1, y1) => { let s = 0, n = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { s += lum[y * W + x]; n++; } return s / n; };

test("preparo: acha a inclinação do texto (e não gira quando está reto)", () => {
  for (const graus of [4, -6, 9.5]) { const f = fotoDeTeste({ graus, margem: 0, sombra: 0 }); assert.ok(Math.abs(inclinacao(f.lum, f.W, f.H) - graus) <= 0.6, `${graus} graus → ${inclinacao(f.lum, f.W, f.H)}`); }
  const reto = fotoDeTeste({ graus: 0, margem: 0, sombra: 0 }); assert.equal(inclinacao(reto.lum, reto.W, reto.H), 0);
  assert.equal(inclinacao(new Uint8ClampedArray(100 * 100).fill(240), 100, 100), 0, "página em branco");
});

test("preparo: apaga a mesa em volta do papel, recorta no papel e iguala a sombra", () => {
  const f = fotoDeTeste({ graus: 3 }), caixa = limpaFundo(f.lum, f.W, f.H);
  assert.equal(caixa.fundo, true);
  assert.ok(caixa.x0 > 15 && caixa.x0 < 70 && caixa.x1 > f.W - 70 && caixa.x1 < f.W - 15 && caixa.y0 > 15 && caixa.y1 < f.H - 15, JSON.stringify(caixa));
  assert.ok(mediaDe(f.lum, f.W, 0, 0, 20, 20) > 250 && mediaDe(f.lum, f.W, f.W - 20, f.H - 20, f.W, f.H) > 250, "a mesa virou branco");
  // Papel sem texto: mesmo tom dos dois lados, apesar da sombra à direita.
  const esq = mediaDe(f.lum, f.W, 70, 300, 90, 306), dir = mediaDe(f.lum, f.W, f.W - 92, 300, f.W - 72, 306);
  assert.ok(Math.abs(esq - dir) < 25, `papel à esquerda ${esq.toFixed(0)} e à direita ${dir.toFixed(0)}`);
  let escuros = 0; for (let i = 0; i < f.lum.length; i++) if (f.lum[i] < 110) escuros++;
  assert.ok(escuros > f.lum.length * 0.03, "o texto continua lá");
});

test("preparo: foto só do papel, com sombra forte, não perde nenhum pedaço", () => {
  const f = fotoDeTeste({ graus: 0, margem: 0, sombra: 0.65 });
  let antes = 0; for (let i = 0; i < f.lum.length; i++) if (f.lum[i] < 60) antes++;
  const caixa = limpaFundo(f.lum, f.W, f.H);
  assert.equal(caixa.fundo, false); assert.deepEqual([caixa.x0, caixa.y0, caixa.x1, caixa.y1], [0, 0, f.W, f.H]);
  // O texto do lado escuro (à direita) continua escuro, e o papel de lá ficou claro.
  assert.ok(mediaDe(f.lum, f.W, f.W - 60, 0, f.W - 30, f.H) < 215, "texto do lado da sombra preservado");
  let claros = 0; for (let i = 0; i < f.lum.length; i++) if (f.lum[i] > 200) claros++;
  assert.ok(claros > f.lum.length * 0.6, "o papel ficou claro por inteiro");
});

test("preparo: print de tela é reconhecido e fica como está", () => {
  const W = 300, H = 400, tela = new Uint8ClampedArray(W * H).fill(18);
  for (let y = 40; y < 60; y++) for (let x = 30; x < 200; x += 3) tela[y * W + x] = 240;   // texto claro em fundo escuro, sem chuvisco
  assert.equal(ehImagemDeTela(tela, W, H), true);
  const f = fotoDeTeste(); assert.equal(ehImagemDeTela(f.lum, f.W, f.H), false);
});
