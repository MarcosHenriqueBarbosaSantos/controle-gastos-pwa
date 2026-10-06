import { test } from "node:test";
import assert from "node:assert/strict";
import { crc16, lePixQr, leNotaQr, interpretaQr, nomeDaLoja, categoriaDaNota, itensEmTexto, leituraDaNota } from "../js/qr.js";

const HOJE = "2026-10-06";
const tlv = (id, v) => id + String(v.length).padStart(2, "0") + v;
/** Monta um Pix "copia e cola" como os bancos montam, com o código de verificação no fim. */
const pix = ({ valor = "", nome = "PADARIA DO ZE", cidade = "SAO PAULO", chave = "padaria@exemplo.com", url = "" } = {}) => {
  const conta = tlv("00", "br.gov.bcb.pix") + (url ? tlv("25", url) : tlv("01", chave));
  const s = tlv("00", "01") + (url ? tlv("01", "12") : "") + tlv("26", conta) + tlv("52", "0000") + tlv("53", "986") + (valor ? tlv("54", valor) : "") + tlv("58", "BR") + tlv("59", nome) + tlv("60", cidade) + tlv("62", tlv("05", "***")) + "6304";
  return s + crc16(s);
};
/** Chave de acesso de nota com o dígito verificador certo (conta feita aqui de outro jeito, para conferir a do app). */
const chave = ({ uf = "35", aamm = "2610", cnpj = "12345678000195", modelo = "65", resto = "0010000012341123456789" } = {}) => {
  const c = (uf + aamm + cnpj + modelo + resto).slice(0, 43).padEnd(43, "0");
  const pesos = [2, 3, 4, 5, 6, 7, 8, 9]; let soma = 0;
  [...c].reverse().forEach((d, i) => { soma += Number(d) * pesos[i % 8]; });
  const r = 11 - (soma % 11);
  return c + (r >= 10 ? 0 : r);
};

test("crc16: valores conhecidos", () => {
  assert.equal(crc16("123456789"), "29B1");
  // exemplo do manual do Banco Central para o Pix estático
  const bc = "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304";
  assert.equal(crc16(bc), "1D3D");
});

test("Pix com valor: valor exato, nome de quem recebe e conferência", () => {
  const p = lePixQr(pix({ valor: "32.50" }));
  assert.deepEqual(p, { valor: 32.5, nome: "Padaria Do Ze", conferido: true });
  const r = interpretaQr(pix({ valor: "32.50" }), HOJE);
  assert.equal(r.origem, "pix"); assert.equal(r.valor, 32.5); assert.equal(r.forma, "Pix"); assert.equal(r.data, HOJE); assert.equal(r.descricao, "Padaria Do Ze");
  assert.equal(r.firme, true);
  assert.match(r.aviso, /Li o Pix: R\$\s32,50 para Padaria Do Ze\./);
});

test("Pix sem valor (QR fixo de balcão ou cobrança que guarda o valor no banco): pede o valor", () => {
  const r = interpretaQr(pix(), HOJE);
  assert.equal(r.valor, null); assert.equal(r.forma, "Pix");
  assert.match(r.aviso, /não traz o valor\. Digite quanto você pagou/);
  const d = interpretaQr(pix({ url: "pix.banco.com.br/qr/v2/cobv/9d36b84fc70b478fb95c12729b90ca25" }), HOJE);
  assert.equal(d.origem, "pix"); assert.equal(d.valor, null);
});

test("Pix com o código alterado: lê, mas avisa para conferir", () => {
  const bom = pix({ valor: "150.00" }), ruim = bom.replace("150.00", "950.00");
  assert.equal(lePixQr(ruim).conferido, false);
  const r = interpretaQr(ruim, HOJE);
  assert.equal(r.firme, false); assert.match(r.aviso, /parece incompleto\. Confira o valor/);
});

test("Pix colado com espaços em volta continua valendo", () => {
  assert.equal(lePixQr("  \n" + pix({ valor: "10.00" }) + " \n").conferido, true);
});

test("nota fiscal atual (NFC-e): diz o mês e a loja, mas não o valor", () => {
  const k = chave(), url = `https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx?p=${k}|2|1|1|A1B2C3D4E5F60718293A4B5C6D7E8F9012345678`;
  const n = leNotaQr(url);
  assert.equal(n.chave, k); assert.equal(n.cnpj, "12345678000195"); assert.equal(n.mes, "2026-10"); assert.equal(n.valor, null); assert.equal(n.data, null);
  assert.equal(n.link, url);
  const r = interpretaQr(url, HOJE);
  assert.equal(r.origem, "nota"); assert.equal(r.valor, null); assert.equal(r.data, HOJE); assert.equal(r.descricao, "Compra com nota fiscal");
  assert.match(r.aviso, /nota fiscal de outubro de 2026, mas o QR code dela não traz o valor/);
});

test("nota emitida sem internet traz o dia e o valor", () => {
  const k = chave({ aamm: "2609" }), url = `https://www.fazenda.pr.gov.br/nfce/qrcode?p=${k}|2|1|17|89.90|6449564E4E574C4E69704D3D|1|ABCDEF0123456789ABCDEF0123456789ABCDEF01`;
  const r = interpretaQr(url, HOJE);
  assert.equal(r.valor, 89.9); assert.equal(r.data, "2026-09-17"); assert.equal(r.achouData, true);
  assert.match(r.aviso, /Li a nota fiscal: R\$\s89,90, de 17\/09\./);
});

test("nota antiga: valor e data nos campos do endereço", () => {
  const k = chave({ aamm: "2608", uf: "43" });
  const hex = [..."2026-08-21T14:03:11-03:00"].map((c) => c.charCodeAt(0).toString(16)).join("");
  const r = interpretaQr(`https://www.sefaz.rs.gov.br/NFCE/NFCE-COM.aspx?chNFe=${k}&nVersao=100&tpAmb=1&dhEmi=${hex}&vNF=215.37&vICMS=0.00&digVal=abc&cIdToken=000001&cHashQRCode=abc`, HOJE);
  assert.equal(r.valor, 215.37); assert.equal(r.data, "2026-08-21");
});

test("cupom SAT (São Paulo): valor e data vêm no próprio código", () => {
  const k = chave({ modelo: "59" });
  const r = interpretaQr(`${k}|20261004183055|49.00|12345678909|AbCdEf0123456789+/==`, HOJE);
  assert.equal(r.origem, "nota"); assert.equal(r.valor, 49); assert.equal(r.data, "2026-10-04"); assert.equal(r.link, "");
});

test("nota de outro mês sem o dia: cai no dia 1º daquele mês, e o aviso diz o mês", () => {
  const k = chave({ aamm: "2607" });
  const r = interpretaQr(`https://www.nfce.fazenda.sp.gov.br/qrcode?p=${k}|2|1|1|ABC`, HOJE);
  assert.equal(r.data, "2026-07-01"); assert.match(r.aviso, /julho de 2026/);
});

test("nota: chave com dígito errado ou endereço sem chave não é aceita", () => {
  const k = chave(), errada = k.slice(0, 43) + ((Number(k[43]) + 1) % 10);
  assert.equal(leNotaQr(`https://www.nfce.fazenda.sp.gov.br/qrcode?p=${errada}|2|1|1|ABC`), null);
  assert.equal(leNotaQr("https://www.nfce.fazenda.sp.gov.br/qrcode?p=123|2|1|1|ABC"), null);
  assert.equal(interpretaQr("https://exemplo.com/promocao", HOJE), null);
});

test("nota: o link só é oferecido quando é https e de site do governo", () => {
  const k = chave();
  assert.equal(leNotaQr(`https://site-falso.com/nfce?p=${k}|2|1|1|ABC`).link, "");
  assert.equal(leNotaQr(`http://www.nfce.fazenda.sp.gov.br/qrcode?p=${k}|2|1|1|ABC`).link, "");
  assert.equal(leNotaQr(`https://gov.br.site-falso.com/nfce?p=${k}|2|1|1|ABC`).link, "");
  assert.notEqual(leNotaQr(`https://www.nfce.fazenda.sp.gov.br/qrcode?p=${k}|2|1|1|ABC`).link, "");
});

test("código de barras de boleto: valor e vencimento", () => {
  // linha digitável de exemplo usada nos testes do leitor de fotos
  const r = interpretaQr("00190.00009 01234.567891 23456.789012 3 98760000212413", HOJE);
  if (r) { assert.equal(r.origem, "boleto"); assert.equal(r.valor, 2124.13); assert.equal(r.forma, "Boleto"); assert.match(r.aviso, /Li o código de barras: R\$\s2\.124,13/); }
  else assert.fail("não leu o boleto");
});

test("outros códigos (um link qualquer, um texto, um número curto) não viram lançamento", () => {
  for (const t of ["https://wa.me/5511999999999", "WIFI:S:MinhaRede;T:WPA;P:senha;;", "1234567890", "", null, "Olá!"]) assert.equal(interpretaQr(t, HOJE), null);
});

/* ---------- a nota consultada na Fazenda ---------- */
const NOTA = { loja: "COMPANHIA EXEMPLO COMERCIO E INDUSTRIA LTDA", valor: 473.66, data: "2026-10-04", forma: "Dinheiro", qtdItens: 5,
  itens: [{ nome: "ARROZ BRANCO T1 5KG", qtd: 1, un: "UN", valor: 14.9 }, { nome: "LEITE PO INT 1KG", qtd: 2, un: "UN", valor: 79.8 }, { nome: "PAO FRANCES", qtd: 0.685, un: "KG", valor: 10.21 },
    { nome: "SAC PLAST 60X70", qtd: 5, un: "UN", valor: 1.5 }, { nome: "DES ORIGINAL 200ML", qtd: 1, un: "UN", valor: 22.9 }] };

test("nome da loja: sai da razão social em maiúsculas para um nome legível", () => {
  assert.equal(nomeDaLoja("COMPANHIA EXEMPLO COMERCIO E INDUSTRIA LTDA"), "Companhia Exemplo Comercio e Industria");
  assert.equal(nomeDaLoja("SUPERMERCADO DO  BAIRRO S.A."), "Supermercado do Bairro");
  assert.equal(nomeDaLoja("Padaria da Vila"), "Padaria da Vila", "nome que já vem escrito normal fica como está");
  assert.equal(nomeDaLoja("FARMACIA BEM ESTAR EIRELI"), "Farmacia Bem Estar");
  assert.equal(nomeDaLoja(""), ""); assert.equal(nomeDaLoja(null), "");
  assert.ok(nomeDaLoja("A".repeat(200)).length <= 60);
});

test("categoria pelos itens: supermercado vira Mercado; outras compras ficam sem palpite", () => {
  assert.equal(categoriaDaNota(NOTA), "Mercado");
  assert.equal(categoriaDaNota({ itens: [{ nome: "FEIJÃO CARIOCA 1KG" }, { nome: "AÇÚCAR REFINADO 1KG" }] }), "Mercado", "poucos itens, todos de mercado; acento não atrapalha");
  assert.equal(categoriaDaNota({ itens: [{ nome: "DIPIRONA 500MG" }, { nome: "PROTETOR SOLAR FPS50" }, { nome: "VITAMINA C" }] }), "");
  assert.equal(categoriaDaNota({ itens: [{ nome: "CAMISETA M" }, { nome: "LEITE DE COLONIA" }] }), "", "um item parecido não basta");
  assert.equal(categoriaDaNota({ itens: [] }), ""); assert.equal(categoriaDaNota(null), "");
});

test("itens em texto: uma linha por item, com quantidade e valor", () => {
  assert.equal(itensEmTexto(NOTA).split("\n")[0], "1 UN  ARROZ BRANCO T1 5KG  14,90");
  assert.equal(itensEmTexto(NOTA).split("\n")[2], "0,685 KG  PAO FRANCES  10,21");
  assert.equal(itensEmTexto({ itens: [{ nome: "ITEM SEM NUMEROS", qtd: null, un: "", valor: null }] }), "ITEM SEM NUMEROS");
  assert.equal(itensEmTexto({}), "");
});

test("leitura da nota consultada: valor, loja, data, forma e categoria prontos para conferir", () => {
  const base = interpretaQr(`https://www.nfce.fazenda.sp.gov.br/qrcode?p=${chave()}|2|1|1|0A1B2C3D4E5F60718293A4B5C6D7E8F901234567`, "2026-10-06");
  assert.equal(base.valor, null);
  const r = leituraDaNota(NOTA, base, "2026-10-06");
  assert.deepEqual([r.origem, r.consultada, r.valor, r.data, r.achouData, r.descricao, r.forma, r.categoria, r.firme], ["nota", true, 473.66, "2026-10-04", true, "Companhia Exemplo Comercio e Industria", "Dinheiro", "Mercado", true]);
  assert.equal(r.aviso.replace(/\s/g, " "), "Consultei a nota na Fazenda: R$ 473,66 em Companhia Exemplo Comercio e Industria, de 04/10, com 5 itens. Confira a categoria e a forma de pagamento.");
  assert.equal(r.link, base.link, "o link para abrir a nota continua");
  const s = leituraDaNota({ ...NOTA, data: null, forma: "", loja: "", qtdItens: 1 }, base, "2026-10-06");
  assert.deepEqual([s.data, s.achouData, s.descricao, s.forma], ["2026-10-06", false, "Compra com nota fiscal", ""]);
  assert.match(s.aviso, /com 1 item\. Confira a categoria e escolha a forma de pagamento\.$/);
});
