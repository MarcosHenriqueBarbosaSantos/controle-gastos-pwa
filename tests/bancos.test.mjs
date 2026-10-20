// Extratos de conta de vários bancos e QR codes de nota em formatos variados: o app reconhece o que é e lê com o sinal certo.
import test from "node:test";
import assert from "node:assert/strict";
import { separaCsv, leExtrato } from "../js/extrato.js";
import { pareceConta, leConta, descricaoGeral } from "../js/conta.js";
import { leNotaQr } from "../js/qr.js";

const HOJE = "2026-10-20";
// Modelos de cabeçalho dos bancos (montados a partir do que cada um costuma exportar; nomes e valores inventados).
const CONTAS = {
  "Bradesco (crédito e débito em colunas separadas)": "Extrato de: Ag: 1234 | Conta: 56789-0\nData;Histórico;Docto.;Crédito (R$);Débito (R$);Saldo (R$)\n02/10/2026;PIX RECEBIDO FULANO DE TAL;123;150,00;;1.150,00\n03/10/2026;COMPRA CARTAO DEB MERCADO X;456;;45,90;1.104,10\n05/10/2026;PIX ENVIADO CICLANO SILVA;789;;30,00;1.074,10\n06/10/2026;SALARIO EMPRESA SA;1;3.000,00;;4.074,10\n",
  "C6 (entrada e saída em colunas)": "Data Lançamento;Data Contábil;Título;Descrição;Entrada(R$);Saída(R$);Saldo do Dia(R$)\n02/10/2026;02/10/2026;Pix recebido;Pix recebido de FULANO;150,00;0,00;1.150,00\n03/10/2026;03/10/2026;Compra débito;MERCADO X;0,00;45,90;1.104,10\n05/10/2026;05/10/2026;Pix enviado;Pix enviado para CICLANO;0,00;30,00;1.074,10\n",
  "Inter (linhas de apresentação antes dos títulos)": "Extrato Conta Corrente\nConta;12345\nPeríodo;01/10/2026 a 18/10/2026\nSaldo;1000,00\n\nData Lançamento;Histórico;Descrição;Valor;Saldo\n02/10/2026;Pix recebido;PIX RECEBIDO - Cp :00000000-FULANO DE TAL;150,00;1150,00\n03/10/2026;Compra no débito;COMPRA NO DEBITO: MERCADO X;-45,90;1104,10\n05/10/2026;Pix enviado;PIX ENVIADO - Cp :11111111-CICLANO SILVA;-30,00;1074,10\n",
  "Caixa (coluna D ou C)": "Conta;Data_Mov;Nr_Doc;Historico;Valor;Deb_Cred\n123;02/10/2026;1;CRED PIX;150,00;C\n123;03/10/2026;2;COMPRA COM CARTAO DEBITO;45,90;D\n123;05/10/2026;3;PIX ENVIADO;30,00;D\n",
  "Banco do Brasil (aspas e vírgula no fim)": "\"Data\",\"Dependencia Origem\",\"Histórico\",\"Data do Balancete\",\"Número do documento\",\"Valor\",\n\"02/10/2026\",\"0000\",\"Pix - Recebido\",\"00/00/0000\",\"1\",\"150,00\",\n\"03/10/2026\",\"0000\",\"Compra com Cartão\",\"00/00/0000\",\"2\",\"-45,90\",\n\"05/10/2026\",\"0000\",\"Pix - Enviado\",\"00/00/0000\",\"3\",\"-30,00\",\n\"06/10/2026\",\"0000\",\"Pix - Recebido\",\"00/00/0000\",\"4\",\"80,00\",\n",
  "Itaú (planilha como CSV)": "Data;Lançamento;Ag./Origem;Valor (R$);Saldos (R$)\n02/10/2026;PIX TRANSF FULANO02/10;;150,00;\n03/10/2026;PIX QRS MERCADO X03/10;;-45,90;\n",
  "Mercado Pago": "RELEASE_DATE;TRANSACTION_TYPE;REFERENCE_ID;TRANSACTION_NET_AMOUNT;PARTIAL_BALANCE\n2026-10-02;Pix recebido FULANO;111;150,00;1150,00\n2026-10-03;Pagamento MERCADO X;222;-45,90;1104,10\n",
  "Santander": "Data;Descrição;Nº Documento;Valor\n02/10/2026;PIX RECEBIDO FULANO;1;150,00\n03/10/2026;COMPRA DEBITO MERCADO X;2;-45,90\n04/10/2026;PIX ENVIADO CICLANO;3;-20,00\n05/10/2026;PAGAMENTO FATURA CARTAO;4;-500,00\n",
};

test("extrato da conta de cada banco: é reconhecido como conta (não como fatura) e o dinheiro entra e sai com o sinal certo", () => {
  for (const [banco, csv] of Object.entries(CONTAS)) {
    const linhas = separaCsv(csv);
    assert.equal(pareceConta(linhas), true, `${banco}: deveria ser extrato da conta`);
    const mov = leConta({ linhas, hoje: HOJE }).movimentos.filter((m) => !m.ignorar);
    assert.ok(mov.length >= 2, `${banco}: poucos movimentos`);
    assert.ok(mov.some((m) => m.tipo === "Receita" && m.valor === 150), `${banco}: a entrada de 150 sumiu ou ficou como gasto`);
    assert.ok(mov.some((m) => m.tipo === "Despesa" && m.valor === 45.9), `${banco}: o gasto de 45,90 sumiu ou ficou como entrada`);
    assert.ok(mov.every((m) => m.valor < 5000 && m.valor !== 1150 && m.valor !== 1104.1), `${banco}: o saldo foi lido como movimento`);
  }
});

test("extrato da conta: pagamento de fatura fica de fora e os nomes saem limpos", () => {
  const c = leConta({ linhas: separaCsv(CONTAS["Santander"]), hoje: HOJE });
  assert.equal(c.movimentos.find((m) => /fatura/i.test(m.original)).ignorar, true);
  assert.deepEqual(c.movimentos.filter((m) => !m.ignorar).map((m) => m.descricao), ["Fulano", "Compra no débito em Mercado X", "Ciclano"]);
  const b = leConta({ linhas: separaCsv(CONTAS["Bradesco (crédito e débito em colunas separadas)"]), hoje: HOJE });
  assert.equal(b.movimentos.find((m) => m.valor === 3000).categoria, "Salário");
  assert.equal(b.movimentos.find((m) => /Mercado/.test(m.descricao)).forma, "Débito");
  const i = leConta({ linhas: separaCsv(CONTAS["Itaú (planilha como CSV)"]), hoje: HOJE });
  assert.equal(i.movimentos[0].descricao, "Fulano");   // o dia colado no fim do nome do Itaú sai
});

test("fatura de cartão de cada banco continua sendo fatura, com as compras certas", () => {
  const CARTOES = {
    "Itaú": "data;lançamento;valor\n02/10/2026;MERCADO X;45,90\n03/10/2026;UBER *TRIP;23,90\n10/10/2026;PAGAMENTO EFETUADO;-500,00\n",
    "Bradesco": "Data;Histórico;Valor(US$);Valor(R$)\n02/10/2026;MERCADO X;0,00;45,90\n03/10/2026;UBER TRIP;0,00;23,90\n",
    "Banco do Brasil": "Data;Descrição;Valor\n02/10/2026;MERCADO X;45,90\n03/10/2026;UBER TRIP;23,90\n",
    "Nubank": "date,title,amount\n2026-10-02,Mercado X,\"45,90\"\n2026-10-03,Uber Trip,\"23,90\"\n",
  };
  for (const [banco, csv] of Object.entries(CARTOES)) {
    assert.equal(pareceConta(separaCsv(csv)), false, `${banco}: fatura não pode virar extrato da conta`);
    const e = leExtrato({ texto: csv, hoje: HOJE, nome: "x.csv" });
    assert.deepEqual(e.compras.map((x) => x.valor), [45.9, 23.9], banco);
  }
});

test("descrição de qualquer banco vira o jeito que o leitor entende, sem mexer no que já está certo", () => {
  assert.equal(descricaoGeral("PIX ENVIADO CICLANO SILVA", -30), "Transferência enviada pelo Pix - CICLANO SILVA");
  assert.equal(descricaoGeral("PIX RECEBIDO FULANO", 10), "Transferência recebida pelo Pix - FULANO");
  assert.equal(descricaoGeral("PAGTO CARTAO CREDITO", -500), "Pagamento de fatura");
  assert.equal(descricaoGeral("Transferência enviada pelo Pix - A - 1 - B", -5), "Transferência enviada pelo Pix - A - 1 - B");
  assert.equal(descricaoGeral("Compra no débito - LOJA", -5), "Compra no débito - LOJA");
  assert.equal(descricaoGeral("TARIFA PACOTE SERVICOS", -9), "TARIFA PACOTE SERVICOS");
});

// Chave de acesso válida (44 números, dígito verificador módulo 11) para os testes de nota.
function chaveValida(p43) { let s = 0, p = 2; for (let i = 42; i >= 0; i--) { s += Number(p43[i]) * p; p = p === 9 ? 2 : p + 1; } const r = 11 - (s % 11); return p43 + (r >= 10 ? 0 : r); }

test("QR de nota em outros formatos de endereço: a chave de 44 números basta", () => {
  const chave = chaveValida("35" + "2610" + "12345678000195" + "65" + "001" + "000012345" + "1" + "12345678");   // UF, AAMM, CNPJ, modelo, série, número, emissão, código
  assert.equal(chave.length, 44);
  assert.ok(leNotaQr(`https://www.nfce.fazenda.gov.br/consulta?chave=${chave}`), "parâmetro com outro nome");
  assert.ok(leNotaQr(`https://nfce.sefaz.exemplo.gov.br/portal/${chave}/consulta`), "chave no caminho do endereço");
  assert.equal(leNotaQr(`NFe${chave}`)?.cnpj, chave.slice(6, 20));
  assert.equal(leNotaQr(`https://nfce.sefaz.exemplo.gov.br/?p=${chave}|2|1|1|ABCDEF`)?.chave, chave);   // formato atual, sem valor
  assert.equal(leNotaQr(chave), null, "só números pode ser código de barras: não vira nota");
  assert.equal(leNotaQr("https://exemplo.com/?id=12345"), null);
});

import { ehParceiro, CATEGORIA_CASAL } from "../js/conta.js";
import { guessCat } from "../js/excel.js";

const NUCONTA = "Data,Valor,Identificador,Descrição\n01/10/2026,-109.65,a1,Transferência enviada pelo Pix - AUTO POSTO SAO FRANCISCO LTDA - 62.711.312/0001-60 - ITAÚ UNIBANCO S.A. (0341) Agência: 1624 Conta: 8-7\n02/10/2026,-81.00,a2,Transferência enviada pelo Pix - Júlia Gabrielle Ferreira da Silva - •••.415.428-•• - NU PAGAMENTOS - IP (0260) Agência: 1 Conta: 565638929-2\n03/10/2026,-20.00,a3,Transferência enviada pelo Pix - Klauber Xandersoon Alves do Carmo - •••.199.098-•• - NU PAGAMENTOS - IP (0260) Agência: 1 Conta: 45936307-9\n04/10/2026,70.00,a4,Transferência Recebida - Júlia Gabrielle Ferreira da Silva - •••.415.428-•• - NU PAGAMENTOS - IP (0260) Agência: 1 Conta: 565638929-2\n05/10/2026,30.00,a5,Transferência recebida pelo Pix - Beltrano de Tal - •••.222.333-•• - BANCO\n06/10/2026,22.63,a6,Transferência recebida pelo Pix - MARCOS HENRIQUE BARBOSA SANTOS - •••.305.298-•• - ITAÚ UNIBANCO S.A. (0341) Agência: 7781 Conta: 35068-6\n";

test("cada real tem para onde ir: posto é Transporte, Pix para o parceiro é Casal, Pix para pessoas e de pessoas têm categoria, e a própria conta fica de fora", () => {
  const c = leConta({ texto: NUCONTA, hoje: HOJE, meuNome: ["Marcos Henrique"], parceiro: ["Júlia"] }), por = (t) => c.movimentos.find((m) => m.original.includes(t));
  assert.equal(por("AUTO POSTO").categoria, "Transporte");
  assert.equal(por("Júlia Gabrielle").categoria, CATEGORIA_CASAL); assert.equal(c.movimentos.filter((m) => m.categoria === CATEGORIA_CASAL).length, 2);   // o que foi e o que veio
  assert.equal(por("Klauber").categoria, "Pix para pessoas");
  assert.equal(por("Beltrano").categoria, "Pix de pessoas");
  assert.equal(por("MARCOS HENRIQUE").ignorar, true); assert.match(por("MARCOS HENRIQUE").motivo, /suas/);   // entre contas da própria pessoa
  // sem conta de casal, Júlia é uma pessoa como as outras
  assert.equal(leConta({ texto: NUCONTA, hoje: HOJE }).movimentos.find((m) => m.original.includes("Júlia Gabrielle") && m.tipo === "Despesa").categoria, "Pix para pessoas");
});

test("parceiro: primeiro nome igual ao apelido ou nome inteiro; outra pessoa não", () => {
  assert.equal(ehParceiro("Júlia Gabrielle Ferreira da Silva", "Júlia"), true);
  assert.equal(ehParceiro("Julia Gabrielle", ["Maria", "Júlia"]), true);
  assert.equal(ehParceiro("Maria Julia Santos", "Júlia"), false);   // o primeiro nome não é o dela
  assert.equal(ehParceiro("Ana Paula Souza", "Ana Paula"), true);
  assert.equal(ehParceiro("Qualquer", ""), false);
});

test("categoria de gasto do dia a dia: gasolina, oficina, pedágio, contas da casa e comida", () => {
  const casos = [["AUTO POSTO PARQUE VIANA LTDA", "Transporte"], ["Posto Shell", "Transporte"], ["Rosa de Saron Comercio de Combustiveis Ltda", "Transporte"], ["Genios Auto Vidros E Acessorios Automotivo Ltda", "Transporte"],
    ["Oficina do Zé", "Transporte"], ["Rodoanel Pedagio", "Transporte"], ["Lavenderia 60 Minutos", "Contas da casa"], ["Sabesp", "Contas da casa"], ["Padaria e Confeitaria Bela", "Alimentação"],
    ["WMS Supermercados do Brasil Ltda.", "Mercado"], ["Editora e Distribuidora Educacional S/A", "Educação"], ["Drogasil", "Saúde"]];
  for (const [nome, cat] of casos) assert.equal(guessCat(nome, "Despesa"), cat, nome);
});
