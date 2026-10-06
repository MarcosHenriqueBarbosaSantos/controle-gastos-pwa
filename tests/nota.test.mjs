// Testes do servidor que consulta a nota fiscal pelo endereço do QR code (supabase/functions/nota). Rode com: node --test
import test from "node:test";
import assert from "node:assert/strict";
import { chaveOk, siteAceito, enderecoDaNota, formaDoApp, leNota, buscaPagina, criaHandler } from "../supabase/functions/nota/handler.js";

/** Chave de acesso de exemplo, com o dígito verificador certo. */
const chave = (() => { const c = "3526101234567800019565001000012345112345678"; let s = 0, w = 2; for (let i = c.length - 1; i >= 0; i--) { s += Number(c[i]) * w; w = w === 9 ? 2 : w + 1; } const r = 11 - (s % 11); return c + (r >= 10 ? 0 : r); })();
const QR = `https://www.nfce.fazenda.sp.gov.br/qrcode?p=${chave}|2|1|1|0A1B2C3D4E5F60718293A4B5C6D7E8F901234567`;

/** Página no modelo "Consulta resumida da NFC-e" (o mesmo de São Paulo), com dados inventados. */
const item = (nome, qtd, un, unit, total) => `<tr id="Item + 1"> <td valign="top"> <span class="txtTit">${nome}</span> <span class="RCod"> (Código: 0001 ) </span> <br> <span class="Rqtd"> <strong>Qtde.:</strong>${qtd}</span> <span class="RUN"> <strong>UN: </strong>${un}</span> <span class="RvlUnit"> <strong>Vl. Unit.:</strong> ${unit}</span> </td> <td align="right" valign="top" class="txtTit noWrap"> Vl. Total <br><span class="valor">${total}</span></td> </tr>`;
const pagina = ({ loja = "MERCADO EXEMPLO LTDA", itens = [item("ARROZ BRANCO T1 5KG", "1", "UN", "24,9", "24,90"), item("P&Atilde;O FRANC&Ecirc;S", "0,685", "KG", "14,9", "10,21"), item("LEITE INTEGRAL 1L", "6", "UN", "5,49", "32,94")],
  totais = `<div id="linhaTotal"> <label>Qtd. total de itens:</label> <span class="totalNumb">3</span> </div> <div id="linhaTotal"> <label>Valor total R$:</label> <span class="totalNumb">68,05</span> </div> <div id="linhaTotal"> <label>Descontos R$:</label> <span class="totalNumb">1,05</span> </div> <div id="linhaTotal" class="linhaShade"> <label>Valor a pagar R$:</label> <span class="totalNumb txtMax">67,00</span> </div>`,
  pagamentos = `<div id="linhaTotal"> <label class="tx"> Cartão de Débito </label> <span class="totalNumb">50,00</span> </div> <div id="linhaTotal"> <label class="tx"> Dinheiro </label> <span class="totalNumb">20,00</span> </div> <div id="linhaTotal"> <label class="tx">Troco </label> <span class="totalNumb">3,00</span> </div>`,
  emissao = "04/10/2026 15:10:09" } = {}) => `<!DOCTYPE html><html lang="pt-br"><head><title>Consulta Resumida NFC-e</title><script>var x = "Valor a pagar R$: 999,99";</script><style>.a{}</style></head><body>
  <div class="txtCenter"> <div id="u20" class="txtTopo">${loja}</div> <div class="text"> CNPJ: 12.345.678/0001-95</div> <div class="text">RUA DE EXEMPLO , 10 , SÃO PAULO , SP</div> </div>
  <table id="tabResult">${itens.join("")}</table>
  <div id="totalNota" class="txtRight">${totais}<div id="linhaForma"> <label>Forma de pagamento:</label> <span class="totalNumb txtTitR">Valor pago R$:</span> </div>${pagamentos}</div>
  <div id="infos"><h4>Informações gerais da Nota</h4><ul><li><strong>EMISSÃO NORMAL</strong><br><strong>Número: </strong>4042<strong> Série: </strong>123<strong> Emissão: </strong>${emissao} - Via Consumidor</li></ul></div></body></html>`;

test("chave de acesso: só vale com 44 números e o dígito certo", () => {
  assert.equal(chaveOk(chave), true);
  assert.equal(chaveOk(chave.slice(0, 43) + ((Number(chave[43]) + 1) % 10)), false);
  assert.equal(chaveOk(chave.slice(1)), false);
  assert.equal(chaveOk(""), false);
});

test("endereço aceito: só https de site de Fazenda estadual, com a chave da nota", () => {
  assert.equal(enderecoDaNota(QR), QR.replace(/\|/g, "%7C"), "a barra vertical vai codificada");
  assert.ok(enderecoDaNota(`https://www.sefaz.rs.gov.br/NFCE/NFCE-COM.aspx?p=${chave}|2|1|1|ABC`));
  assert.ok(enderecoDaNota(`https://nfce.sefaz.pe.gov.br/nfce/consulta?p=${chave}|2|1`));
  assert.ok(enderecoDaNota(`https://sat.sef.sc.gov.br/nfce/consulta?p=${chave}|2|1|1|ABC`));
  assert.ok(enderecoDaNota(`https://www.fazenda.pr.gov.br/nfce/qrcode?chNFe=${chave}&nVersao=100`), "modelo antigo, com a chave em chNFe");
});

test("endereço recusado: tudo o que não é a consulta de uma nota em site de Fazenda", () => {
  const ruins = [
    QR.replace("https:", "http:"),                                         // sem criptografia
    `https://www.nfce.fazenda.sp.gov.br.exemplo.com/qrcode?p=${chave}|2|1`,  // domínio que só parece do governo
    `https://exemplo.com/qrcode?p=${chave}|2|1`,
    `https://www.prefeitura.sp.gov.br/qrcode?p=${chave}|2|1`,               // governo, mas não é Fazenda
    `https://gov.br/?p=${chave}|2|1`,
    `https://www.nfce.fazenda.sp.gov.br:8443/qrcode?p=${chave}|2|1`,        // porta diferente
    `https://usuario:senha@www.nfce.fazenda.sp.gov.br/qrcode?p=${chave}|2|1`,
    `https://10.0.0.1/qrcode?p=${chave}|2|1`, `https://localhost/qrcode?p=${chave}|2|1`,
    "https://www.nfce.fazenda.sp.gov.br/qrcode?p=123|2|1",                  // sem chave válida
    "https://www.nfce.fazenda.sp.gov.br/", "file:///etc/passwd", "isso não é um endereço", "", null, undefined,
  ];
  for (const r of ruins) assert.equal(enderecoDaNota(r), null, String(r));
  assert.equal(siteAceito("https://www.nfce.fazenda.sp.gov.br/"), false, "só aceita o endereço já interpretado");
});

test("forma de pagamento: do nome da nota para as formas do app", () => {
  assert.deepEqual(["Dinheiro", "Cartão de Crédito", "Cartão de Débito", "Pagamento Instantâneo (PIX)", "PIX", "Boleto Bancário", "Vale Alimentação", "Crédito Loja", "Outros", ""].map(formaDoApp),
    ["Dinheiro", "Cartão de crédito", "Débito", "Pix", "Pix", "Boleto", "", "", "", ""]);
});

test("página da nota: loja, valor a pagar, data, forma de pagamento e itens", () => {
  const n = leNota(pagina());
  assert.equal(n.loja, "MERCADO EXEMPLO LTDA");
  assert.equal(n.valor, 67, "vale o valor a pagar, já com o desconto, e não o que está dentro de um script");
  assert.equal(n.data, "2026-10-04");
  assert.equal(n.forma, "Débito", "a forma de maior valor; o troco não conta");
  assert.equal(n.qtdItens, 3);
  assert.deepEqual(n.itens, [{ nome: "ARROZ BRANCO T1 5KG", qtd: 1, un: "UN", valor: 24.9 }, { nome: "PÃO FRANCÊS", qtd: 0.685, un: "KG", valor: 10.21 }, { nome: "LEITE INTEGRAL 1L", qtd: 6, un: "UN", valor: 32.94 }]);
});

test("página da nota: variações que não podem atrapalhar", () => {
  assert.equal(leNota(pagina({ totais: `<div id="linhaTotal"> <label>Valor total R$:</label> <span class="totalNumb">1.234,56</span> </div>` })).valor, 1234.56, "sem desconto, só há o valor total; milhar com ponto");
  assert.equal(leNota(pagina({ pagamentos: `<div id="linhaTotal"> <label class="tx"> Vale Alimentação </label> <span class="totalNumb">67,00</span> </div> <div id="linhaTotal"> <label class="tx">Troco </label> <span class="totalNumb">NaN</span> </div>` })).forma, "", "forma que o app não tem fica em branco");
  assert.equal(leNota(pagina({ emissao: "99/99/2026 10:00:00" })).data, null, "data impossível é descartada");
  assert.equal(leNota(pagina({ loja: "LOJA <b>DO</b> Z&Eacute; &amp; CIA" })).loja, "LOJA DO ZÉ & CIA");
  assert.equal(leNota(pagina({ itens: [] })).itens.length, 0);
});

test("página que não é a nota (não encontrada, outro modelo, erro do site): devolve nada", () => {
  for (const h of ["", "<html><body>Nota não encontrada</body></html>", "<html><body><h2>Bad Request</h2></body></html>", pagina({ totais: "" }), null, undefined]) assert.equal(leNota(h), null);
});

/* ---------- busca da página ---------- */
const resp = (status, corpo = "", headers = {}) => ({ status, headers: { get: (k) => headers[k.toLowerCase()] ?? null }, text: async () => corpo });

test("busca: segue redirecionamento só para site aceito, e desiste nos outros casos", async () => {
  const pedidos = [];
  const fetchOk = async (u, o) => { pedidos.push([u, o.redirect]); return u.includes("/qrcode") ? resp(302, "", { location: "/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx?p=" + chave + "|2|1" }) : resp(200, "pagina"); };
  assert.equal(await buscaPagina(enderecoDaNota(QR), fetchOk), "pagina");
  assert.equal(pedidos.length, 2); assert.equal(pedidos[0][1], "manual");
  assert.ok(pedidos[1][0].startsWith("https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/") && !pedidos[1][0].includes("|"), "o segundo pedido continua no site da Fazenda, com a barra codificada");
  assert.equal(await buscaPagina(enderecoDaNota(QR), async () => resp(302, "", { location: "https://exemplo.com/roubo" })), null, "redirecionamento para fora é recusado");
  assert.equal(await buscaPagina(enderecoDaNota(QR), async () => resp(302, "", { location: "http://www.nfce.fazenda.sp.gov.br/x" })), null, "nem para http");
  assert.equal(await buscaPagina(enderecoDaNota(QR), async () => resp(302, "", { location: "/de-novo" })), null, "redirecionamento sem fim");
  assert.equal(await buscaPagina(enderecoDaNota(QR), async () => resp(500, "erro")), null);
  assert.equal(await buscaPagina(enderecoDaNota(QR), async () => resp(200, "x".repeat(1_500_001))), null, "página grande demais");
  assert.equal(await buscaPagina(enderecoDaNota(QR), async () => { throw new Error("sem rede"); }), null);
});

/* ---------- o servidor ---------- */
function servidor({ pag = pagina(), usuario = { id: "u1" }, segredoCerto = "s3gr3d0" } = {}) {
  const buscas = [];
  const createClient = () => ({ auth: { getUser: async (t) => ({ data: t === "token-bom" ? { user: usuario } : { user: null } }) }, rpc: async (n, a) => ({ data: n === "avisos_confere_segredo" && a.s === segredoCerto }) });
  let t = Date.parse("2026-10-06T16:00:00Z");
  const h = criaHandler({ createClient, env: () => "x", fetchFn: async (u) => { buscas.push(u); return pag === null ? resp(503) : resp(200, pag); }, agora: () => new Date(t) });
  const pede = async (corpo, headers = { authorization: "Bearer token-bom" }, method = "POST") => { const r = await h(new Request("https://x.supabase.co/functions/v1/nota", { method, headers, body: method === "POST" ? JSON.stringify(corpo) : undefined })); return [r.status, await r.json().catch(() => null)]; };
  return { pede, buscas, anda: (ms) => { t += ms; } };
}

test("servidor: quem está logado recebe a nota lida, e nada além dos campos", async () => {
  const s = servidor(), [st, r] = await s.pede({ url: QR });
  assert.equal(st, 200); assert.equal(r.ok, true);
  assert.deepEqual(Object.keys(r.nota).sort(), ["data", "forma", "itens", "loja", "qtdItens", "valor"]);
  assert.equal(r.nota.valor, 67); assert.equal(r.nota.loja, "MERCADO EXEMPLO LTDA");
  assert.deepEqual(s.buscas, [QR.replace(/\|/g, "%7C")]);
});

test("servidor: sem login não consulta nada", async () => {
  const s = servidor();
  assert.equal((await s.pede({ url: QR }, {}))[0], 401);
  assert.equal((await s.pede({ url: QR }, { authorization: "Bearer token-falso" }))[0], 401);
  assert.equal((await s.pede({ url: QR }, { "x-avisos-segredo": "errado" }))[0], 401);
  assert.equal(s.buscas.length, 0);
  assert.equal((await s.pede({ url: QR }, { "x-avisos-segredo": "s3gr3d0" }))[1].ok, true, "o segredo do agendamento serve para o teste de funcionamento");
});

test("servidor: endereço que não é de nota não sai do servidor", async () => {
  const s = servidor();
  for (const url of ["https://exemplo.com/?p=" + chave, "http://169.254.169.254/latest/meta-data", "https://www.nfce.fazenda.sp.gov.br/qrcode?p=1", "", undefined]) assert.deepEqual((await s.pede({ url }))[1], { ok: false, motivo: "endereco" });
  assert.deepEqual((await s.pede("texto solto"))[1], { ok: false, motivo: "endereco" });
  assert.equal(s.buscas.length, 0);
});

test("servidor: site da Fazenda fora do ar ou página diferente viram um motivo, não um erro", async () => {
  assert.deepEqual((await servidor({ pag: null }).pede({ url: QR }))[1], { ok: false, motivo: "fora-do-ar" });
  assert.deepEqual((await servidor({ pag: "<html><body>Nota não localizada</body></html>" }).pede({ url: QR }))[1], { ok: false, motivo: "nao-entendi" });
});

test("servidor: limite de consultas por pessoa, que se renova com o tempo", async () => {
  const s = servidor();
  for (let i = 0; i < 20; i++) assert.equal((await s.pede({ url: QR }))[1].ok, true);
  const [st, r] = await s.pede({ url: QR });
  assert.equal(st, 429); assert.deepEqual(r, { ok: false, motivo: "limite" });
  assert.equal(s.buscas.length, 20, "a consulta barrada não chega ao site da Fazenda");
  s.anda(10 * 60 * 1000 + 1);
  assert.equal((await s.pede({ url: QR }))[1].ok, true);
});

test("servidor: outros métodos", async () => {
  const s = servidor();
  assert.deepEqual(await s.pede(null, {}, "GET"), [200, { ok: true, servico: "nota" }]);
  assert.equal((await s.pede(null, {}, "DELETE"))[0], 405);
});
