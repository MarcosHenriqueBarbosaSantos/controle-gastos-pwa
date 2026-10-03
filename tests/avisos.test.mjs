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
  assert.deepEqual(await autoteste(), { ok: true, conferidos: 7, falhas: [] });
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
  const fetchFn = async (url, init) => { enviados.push({ url, init }); return { ok: true, status: url.includes("brevo") ? 201 : url.includes("morto") ? 410 : 201, text: async () => "" }; };
  const cfg = { SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "k", BREVO_API_KEY: "chave-brevo", AVISOS_REMETENTE: "avisos@exemplo.com" };
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
  const emails = amb.enviados.filter((e) => e.url.includes("brevo")), pushes = amb.enviados.filter((e) => e.url.includes("fcm"));
  assert.equal(emails.length, 1);
  const corpo = JSON.parse(emails[0].init.body);
  assert.deepEqual(corpo.to, [{ email: "ana@exemplo.com" }]); assert.equal(corpo.sender.email, "avisos@exemplo.com");
  assert.equal(emails[0].init.headers["api-key"], "chave-brevo"); assert.ok(corpo.htmlContent.includes("Aluguel"));
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
  assert.deepEqual(r, { pendencias: 0, email: "enviado", push: { aparelhos: 1, entregues: 1 } });
  assert.equal(JSON.parse(amb.enviados.find((e) => e.url.includes("brevo")).init.body).subject, "Meus Gastos: aviso de teste");
  assert.equal((await amb.handler(pedido("POST", { authorization: "Bearer tok-ana" }, { teste: true }))).status, 429);   // um por minuto
  amb.avanca(61000);
  assert.equal((await amb.handler(pedido("POST", { authorization: "Bearer tok-ana" }, { teste: true }))).status, 200);
  // sem a chave do Brevo, o e-mail fica como "não configurado" e a notificação segue
  amb.avanca(61000); delete amb.cfg.BREVO_API_KEY;
  assert.equal((await (await amb.handler(pedido("POST", { authorization: "Bearer tok-ana" }, { teste: true }))).json()).email, "não configurado");
});
