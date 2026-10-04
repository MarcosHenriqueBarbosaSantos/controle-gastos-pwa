// Testes do servidor de avisos (supabase/functions/avisos). Rode com: node --test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cifra, b64u, deB64u, gerarChaves, cabecalhoVapid } from "../supabase/functions/avisos/webpush.js";

import { geraRegras } from "../supabase/functions/avisos/gera-regras.mjs";

test("as regras do servidor (regras.js) estão em dia com o calc.js do app", () => {
  const ler = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
  assert.equal(ler("../supabase/functions/avisos/regras.js"), geraRegras(ler("../js/calc.js")), "rode: node supabase/functions/avisos/gera-regras.mjs");
});

test("criptografia da notificação reproduz o exemplo oficial (RFC 8291, apêndice A)", async () => {
  const asPub = deB64u("BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8");
  const jwk = { kty: "EC", crv: "P-256", d: "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw", x: b64u(asPub.slice(1, 33)), y: b64u(asPub.slice(33)) };
  const efemera = { privateKey: await crypto.subtle.importKey("jwk", jwk, { name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]),
    publicKey: await crypto.subtle.importKey("raw", asPub, { name: "ECDH", namedCurve: "P-256" }, true, []) };
  const out = await cifra("When I grow up, I want to be a watermelon",
    "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4", "BTBZMqHH6r4Tts7J_aSIgg",
    { efemera, salt: deB64u("DGv6ra1nlYgDCS1FRnbzlw") });
  assert.equal(b64u(out), "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN");
});

test("identificação do servidor (VAPID): o token é assinado com a chave gerada e aponta para o serviço certo", async () => {
  const chaves = await gerarChaves();
  assert.equal(deB64u(chaves.publica).length, 65);
  const h = await cabecalhoVapid("https://fcm.googleapis.com/fcm/send/abc", chaves, "mailto:x@exemplo.com", 1_000_000_000_000);
  const [, t, k] = h.match(/^vapid t=([^,]+), k=(.+)$/), [a, b, sig] = t.split(".");
  assert.equal(k, chaves.publica);
  assert.deepEqual(JSON.parse(new TextDecoder().decode(deB64u(b))), { aud: "https://fcm.googleapis.com", exp: 1_000_000_000 + 43200, sub: "mailto:x@exemplo.com" });
  const pub = await crypto.subtle.importKey("raw", deB64u(chaves.publica), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  assert.ok(await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, pub, deB64u(sig), new TextEncoder().encode(`${a}.${b}`)));
});

import { pendenciasParaAviso } from "../js/calc.js";
import { montaAviso, quando } from "../supabase/functions/avisos/mensagem.js";
import { criaHandler, autoteste } from "../supabase/functions/avisos/handler.js";
import * as regras from "../supabase/functions/avisos/regras.js";

test("autoteste do servidor passa, e as regras do servidor dão o mesmo resultado que as do app", async () => {
  const { assinatura, ...auto } = await autoteste();
  assert.deepEqual(auto, { ok: true, conferidos: 9, falhas: [] }); assert.match(assinatura, /^\d+-[a-z0-9]+$/);
  const st = { lancamentos: [], pagos: [], cartoes: [], fixos: [{ id: "a", tipo: "Despesa", descricao: "Aluguel", categoria: "Moradia", dia: 5, valor: 1000, forma: "Boleto", desde: "2026-08-01", ate: null }],
    faturas: [{ id: "n", cartao: "Loja", vencimento: "2026-10-03", valor: 120, status: "Aberta" }] };
  assert.deepEqual(regras.pendenciasParaAviso(st, "2026-10-03"), pendenciasParaAviso(st, "2026-10-03"));
});

const fixo = (id, descricao, dia, valor, forma = "Boleto") => ({ id, user_id: "u1", tipo: "Despesa", descricao, categoria: "Moradia", dia, valor, forma, desde: "2026-08-01", ate: null });
const limpa = (s) => s.replace(/ /g, " ");

test("pendências do aviso: atrasadas e até 3 dias; atraso antigo deixa de ser lembrado", () => {
  const st = { lancamentos: [], pagos: [], cartoes: [], fixos: [fixo("a", "Aluguel", 1, 1000), fixo("i", "Internet", 6, 100), fixo("f", "Faculdade", 20, 349), fixo("c", "Celular", 4, 55, "Cartão de crédito")],
    faturas: [{ id: "v", cartao: "Velha", vencimento: "2026-08-10", valor: 80, status: "Aberta" }, { id: "n", cartao: "Loja", vencimento: "2026-10-03", valor: 120, status: "Aberta" }] };
  const p = pendenciasParaAviso(st, "2026-10-03");
  assert.deepEqual(p.itens.map((x) => [x.titulo, x.dias]), [["Aluguel", -2], ["Fatura Loja", 0], ["Internet", 3]]);   // sem a fatura de agosto, sem o dia 20 e sem o fixo no cartão
  assert.equal(p.atrasadas, 1); assert.equal(p.hoje, 1); assert.equal(p.total, 1220);
  const a = montaAviso(p, "https://app.exemplo/");
  assert.equal(a.titulo, "1 conta atrasada e 2 para vencer");
  assert.equal(limpa(a.corpo), "Aluguel: R$ 1.000,00, atrasada há 2 dias\nFatura Loja: R$ 120,00, vence hoje\nInternet: R$ 100,00, vence em 3 dias");
  assert.equal(limpa(a.assunto), "Meus Gastos: 1 conta atrasada e 2 para vencer (R$ 1.220,00)");
  assert.ok(a.html.includes("https://app.exemplo/") && a.html.includes("Fatura Loja") && a.texto.includes("Internet"));
  assert.equal(quando(1), "vence amanhã");
  assert.equal(montaAviso(pendenciasParaAviso({ ...st, fixos: [st.fixos[1]], faturas: [] }, "2026-10-03"), "x").titulo, "1 conta vence nos próximos dias");
  assert.deepEqual(pendenciasParaAviso({ lancamentos: [], fixos: [], pagos: [], faturas: [] }, "2026-10-03"), { itens: [], atrasadas: 0, hoje: 0, total: 0 });
});

/** Banco e serviços de mentira, para testar a rotina sem internet. */
function ambiente(tabelas, usuarios) {
  const enviados = [], t = { avisos_chaves: [], avisos_push: [], avisos_enviados: [], preferencias: [], lancamentos: [], fixos: [], fixos_pagos: [], faturas: [], cartoes: [], ...tabelas };
  const from = (nome) => { let op = "select", payload, filtros = [], um = false, faixa = null;
    const run = () => { const casa = (r) => filtros.every(([k, v]) => r[k] === v);
      if (op === "select") { let l = t[nome].filter(casa); if (faixa) l = l.slice(faixa[0], faixa[1] + 1); return { data: um ? l[0] ?? null : l, error: null }; }
      if (op === "insert" || op === "upsert") { for (const r of [].concat(payload)) if (!(op === "upsert" && t[nome].some((x) => x.id === r.id))) t[nome].push({ ...r }); return { data: null, error: null }; }
      if (op === "delete") { t[nome] = t[nome].filter((r) => !casa(r)); return { data: null, error: null }; } };
    const o = { select: () => o, eq: (k, v) => { filtros.push([k, v]); return o; }, range: (a, b) => { faixa = [a, b]; return o; }, maybeSingle: () => { um = true; return o; },
      insert: (p) => { op = "insert"; payload = p; return o; }, upsert: (p) => { op = "upsert"; payload = p; return o; }, delete: () => { op = "delete"; return o; },
      then: (ok, err) => Promise.resolve(run()).then(ok, err) }; return o; };
  const db = { from, rpc: async (_n, { s }) => ({ data: s === "segredo-certo" }),
    auth: { admin: { listUsers: async () => ({ data: { users: usuarios }, error: null }) }, getUser: async (tk) => ({ data: { user: usuarios.find((u) => u.token === tk) || null } }) } };
  const fetchFn = async (url, init) => { enviados.push({ url, init }); return { ok: true, status: url.includes("morto") ? 410 : 201, text: async () => "" }; };
  const cfg = { SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "k", RESEND_API_KEY: "re_chave", AVISOS_REMETENTE: "avisos@exemplo.com" };
  let relogio = new Date("2026-10-03T11:00:00Z");
  const handler = criaHandler({ createClient: () => db, env: (k) => cfg[k], fetchFn, agora: () => relogio });
  return { handler, t, enviados, cfg, avanca: (ms) => { relogio = new Date(relogio.getTime() + ms); } };
}
const P256DH = "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4", AUTH = "BTBZMqHH6r4Tts7J_aSIgg";
const pedido = (method, headers = {}, body) => new Request("https://x.supabase.co/functions/v1/avisos", { method, headers, body: body ? JSON.stringify(body) : undefined });

test("rotina diária: avisa só quem tem pendência, por e-mail e notificação, uma vez por dia", async () => {
  const amb = ambiente({
    fixos: [fixo("a", "Aluguel", 5, 1000), { ...fixo("b", "Condomínio", 20, 300), user_id: "u2" }, { ...fixo("c", "Luz", 4, 90), user_id: "u3" }],
    preferencias: [{ user_id: "u3", dados: { avisos: { email: false } } }],
    avisos_push: [{ id: 1, user_id: "u1", endpoint: "https://fcm.googleapis.com/fcm/send/vivo", p256dh: P256DH, auth: AUTH },
      { id: 2, user_id: "u1", endpoint: "https://fcm.googleapis.com/fcm/send/morto", p256dh: P256DH, auth: AUTH }],
  }, [{ id: "u1", email: "ana@exemplo.com" }, { id: "u2", email: "bia@exemplo.com" }, { id: "u3", email: "caio@exemplo.com" }]);
  assert.equal((await amb.handler(pedido("POST", { "x-avisos-segredo": "errado" }))).status, 401);
  const r = await (await amb.handler(pedido("POST", { "x-avisos-segredo": "segredo-certo" }))).json();
  assert.deepEqual(r, { dia: "2026-10-03", usuarios: 3, avisados: 2, emails: 1, notificacoes: 1, erros: [] });   // u2 só vence dia 20; u3 desligou o e-mail
  const emails = amb.enviados.filter((e) => e.url.includes("resend")), pushes = amb.enviados.filter((e) => e.url.includes("fcm"));
  assert.equal(emails.length, 1);
  assert.equal(emails[0].url, "https://api.resend.com/emails");
  const corpo = JSON.parse(emails[0].init.body);
  assert.deepEqual(corpo.to, ["ana@exemplo.com"]); assert.equal(corpo.from, "Meus Gastos <avisos@exemplo.com>");
  assert.equal(emails[0].init.headers.Authorization, "Bearer re_chave"); assert.ok(corpo.html.includes("Aluguel") && corpo.text.includes("Aluguel"));
  assert.equal(pushes.length, 2);
  assert.match(pushes[0].init.headers.Authorization, /^vapid t=.+, k=.+$/); assert.equal(pushes[0].init.headers["Content-Encoding"], "aes128gcm");
  assert.deepEqual(amb.t.avisos_push.map((s) => s.id), [1]);                 // a inscrição morta (410) foi apagada
  assert.equal(amb.t.avisos_chaves.length, 1);                              // chaves criadas na primeira vez
  assert.deepEqual(amb.t.avisos_enviados.map((x) => x.user_id), ["u1", "u3"]);
  // rodar de novo no mesmo dia não manda nada
  const antes = amb.enviados.length;
  const r2 = await (await amb.handler(pedido("POST", { "x-avisos-segredo": "segredo-certo" }))).json();
  assert.equal(r2.avisados, 0); assert.equal(amb.enviados.length, antes);
});

test("chave pública para o app e aviso de teste só para quem está logado", async () => {
  const amb = ambiente({ avisos_push: [{ id: 1, user_id: "u1", endpoint: "https://fcm.googleapis.com/fcm/send/vivo", p256dh: P256DH, auth: AUTH }] },
    [{ id: "u1", email: "ana@exemplo.com", token: "tok-ana" }]);
  const g = await amb.handler(pedido("GET"));
  const { chavePublica } = await g.json();
  assert.equal(deB64u(chavePublica).length, 65); assert.equal(g.headers.get("Access-Control-Allow-Origin"), "*");
  assert.equal((await (await amb.handler(pedido("GET"))).json()).chavePublica, chavePublica);       // sempre a mesma
  assert.equal((await amb.handler(pedido("POST", { authorization: "Bearer falso" }, { teste: true }))).status, 401);
  const r = await (await amb.handler(pedido("POST", { authorization: "Bearer tok-ana" }, { teste: true }))).json();
  assert.deepEqual(r, { pendencias: 0, limite: 0, email: "enviado", push: { aparelhos: 1, entregues: 1 } });
  assert.equal(JSON.parse(amb.enviados.find((e) => e.url.includes("resend")).init.body).subject, "Meus Gastos: aviso de teste");
  assert.equal((await amb.handler(pedido("POST", { authorization: "Bearer tok-ana" }, { teste: true }))).status, 429);   // um por minuto
  amb.avanca(61000);
  assert.equal((await amb.handler(pedido("POST", { authorization: "Bearer tok-ana" }, { teste: true }))).status, 200);
  // com a chave do Brevo no lugar da do Resend, o envio vai pelo Brevo
  amb.avanca(61000); delete amb.cfg.RESEND_API_KEY; amb.cfg.BREVO_API_KEY = "chave-brevo";
  assert.equal((await (await amb.handler(pedido("POST", { authorization: "Bearer tok-ana" }, { teste: true }))).json()).email, "enviado");
  const viaBrevo = amb.enviados.filter((e) => e.url.includes("brevo"));
  assert.equal(viaBrevo.length, 1); assert.equal(viaBrevo[0].init.headers["api-key"], "chave-brevo");
  assert.deepEqual(JSON.parse(viaBrevo[0].init.body).to, [{ email: "ana@exemplo.com" }]);
  // sem nenhuma chave, o e-mail fica como "não configurado" e a notificação segue
  amb.avanca(61000); delete amb.cfg.BREVO_API_KEY;
  assert.equal((await (await amb.handler(pedido("POST", { authorization: "Bearer tok-ana" }, { teste: true }))).json()).email, "não configurado");
});

/* ---------- limite de gastos do mês ---------- */
import { calcMes, usoDoTeto } from "../js/calc.js";
import { avisoDoLimite } from "../supabase/functions/avisos/mensagem.js";

test("limite do mês: níveis de 80%, passou e muito acima; e a previsão de passar", () => {
  const st = (v) => ({ lancamentos: [{ id: "g", data: "2026-10-02", descricao: "Gasto", tipo: "Despesa", categoria: "Outros", forma: "Pix", valor: v }], fixos: [], pagos: [], faturas: [], cartoes: [] });
  const u = (v, teto = 1000) => usoDoTeto(calcMes(st(v), "2026-10", "2026-10-03"), teto);
  assert.deepEqual([u(500).nivel, u(799.99).nivel, u(800).nivel, u(1000).nivel, u(1000.01).nivel, u(1200).nivel, u(1200.01).nivel], [0, 0, 80, 80, 100, 100, 120]);
  assert.deepEqual(u(850), { teto: 1000, gasto: 850, pct: 85, resta: 150, nivel: 80, projecao: 850, vaiPassar: false });
  assert.equal(u(1250).resta, -250); assert.equal(u(1250).pct, 125);
  assert.equal(usoDoTeto(calcMes(st(500), "2026-10", "2026-10-03"), 0), null); assert.equal(usoDoTeto(calcMes(st(500), "2026-10", "2026-10-03"), ""), null);
  // Com histórico de gasto alto nos meses anteriores, a previsão passa do limite antes de o gasto passar.
  const hist = st(300); hist.lancamentos.push({ id: "h", data: "2026-09-10", descricao: "Antes", tipo: "Despesa", categoria: "Outros", forma: "Pix", valor: 3000 });
  const r = usoDoTeto(calcMes(hist, "2026-10", "2026-10-03"), 1000);
  assert.equal(r.nivel, 0); assert.ok(r.projecao > 1000); assert.equal(r.vaiPassar, true);
  assert.equal(regras.usoDoTeto(regras.calcMes(hist, "2026-10", "2026-10-03"), 1000).projecao, r.projecao);   // servidor e app fazem a mesma conta
});

test("texto do aviso do limite, sozinho e junto com as contas a vencer", () => {
  const u80 = { teto: 3500, gasto: 2939.4, pct: 84, resta: 560.6, nivel: 80 }, u100 = { teto: 3500, gasto: 3650, pct: 104, resta: -150, nivel: 100 }, u120 = { teto: 3500, gasto: 4375, pct: 125, resta: -875, nivel: 120 };
  assert.equal(avisoDoLimite(u80, "2026-10-03").titulo, "Você já usou 84% do limite de outubro");
  assert.equal(limpa(avisoDoLimite(u80, "2026-10-03").frase), "Seu custo de outubro está em R$ 2.939,40, e o limite que você definiu é R$ 3.500,00. Ainda cabem R$ 560,60.");
  assert.equal(avisoDoLimite(u100, "2026-10-03").titulo, "Você passou do limite de outubro"); assert.ok(limpa(avisoDoLimite(u100, "2026-10-03").frase).endsWith("Passou R$ 150,00."));
  assert.equal(avisoDoLimite(u120, "2026-10-03").titulo, "Gastos muito acima do limite de outubro"); assert.ok(limpa(avisoDoLimite(u120, "2026-10-03").frase).endsWith("Já são R$ 875,00 a mais (25% acima)."));
  const vazio = { itens: [], atrasadas: 0, hoje: 0, total: 0 }, so = montaAviso(vazio, "https://app/", avisoDoLimite(u100, "2026-10-03"));
  assert.equal(so.titulo, "Você passou do limite de outubro"); assert.equal(so.assunto, "Meus Gastos: Você passou do limite de outubro"); assert.ok(so.html.includes("Passou") && so.texto.includes("https://app/"));
  const p = pendenciasParaAviso({ lancamentos: [], pagos: [], cartoes: [], fixos: [fixo("a", "Aluguel", 5, 1000)], faturas: [] }, "2026-10-03");
  const junto = montaAviso(p, "https://app/", avisoDoLimite(u80, "2026-10-03"));
  assert.equal(junto.titulo, "1 conta vence nos próximos dias"); assert.ok(junto.corpo.endsWith("Você já usou 84% do limite de outubro"));
  assert.ok(junto.html.includes("84% do limite") && junto.html.includes("Aluguel") && junto.texto.startsWith("Você já usou 84% do limite de outubro"));
});

test("rotina diária: avisa do limite uma vez por nível no mês, e respeita quem desligou", async () => {
  const gasto = (id, uid, data, valor) => ({ id, user_id: uid, data, descricao: "Gasto", tipo: "Despesa", categoria: "Outros", forma: "Pix", valor });
  const amb = ambiente({
    lancamentos: [gasto("g1", "u1", "2026-10-02", 850), gasto("g2", "u2", "2026-10-02", 500), gasto("g3", "u3", "2026-10-02", 2000), gasto("g4", "u4", "2026-10-02", 900)],
    preferencias: [{ user_id: "u1", dados: { teto: 1000 } }, { user_id: "u2", dados: { teto: 1000 } }, { user_id: "u3", dados: { teto: 1000, avisos: { limite: false } } }, { user_id: "u4", dados: {} }],
  }, ["u1", "u2", "u3", "u4"].map((id) => ({ id, email: id + "@exemplo.com" })));
  const roda = async () => (await amb.handler(pedido("POST", { "x-avisos-segredo": "segredo-certo" }))).json();
  const emails = () => amb.enviados.filter((e) => e.url.includes("resend")).map((e) => JSON.parse(e.init.body));
  let r = await roda();
  assert.equal(r.avisados, 1);   // só u1: u2 está em 50%, u3 desligou o aviso do limite, u4 não definiu limite
  assert.deepEqual(emails().map((e) => [e.to[0], e.subject]), [["u1@exemplo.com", "Meus Gastos: Você já usou 85% do limite de outubro"]]);
  assert.match(amb.t.avisos_enviados[0].canais, /^limite: 80; email: enviado/);
  // dia seguinte, mesmo nível: não repete
  amb.avanca(86400000); r = await roda(); assert.equal(r.avisados, 0); assert.equal(emails().length, 1);
  // passou do limite: avisa de novo, uma vez
  amb.t.lancamentos.push(gasto("g5", "u1", "2026-10-04", 200));
  amb.avanca(86400000); r = await roda(); assert.equal(r.avisados, 1); assert.equal(emails()[1].subject, "Meus Gastos: Você passou do limite de outubro");
  amb.avanca(86400000); r = await roda(); assert.equal(r.avisados, 0);
  // muito acima: mais um aviso
  amb.t.lancamentos.push(gasto("g6", "u1", "2026-10-06", 300));
  amb.avanca(86400000); r = await roda(); assert.equal(r.avisados, 1); assert.equal(emails()[2].subject, "Meus Gastos: Gastos muito acima do limite de outubro");
  amb.avanca(86400000); r = await roda(); assert.equal(r.avisados, 0); assert.equal(emails().length, 3);
  // mês novo: a contagem recomeça (novembro, com um gasto que já passa de 80%)
  amb.t.lancamentos.push(gasto("g7", "u1", "2026-11-01", 900));
  amb.avanca(86400000 * 25); r = await roda(); assert.equal(r.dia, "2026-11-02"); assert.equal(emails()[3].subject, "Meus Gastos: Você já usou 90% do limite de novembro");
});
