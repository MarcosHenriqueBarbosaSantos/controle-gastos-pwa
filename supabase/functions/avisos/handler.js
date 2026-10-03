// Servidor de avisos do Meus Gastos (Supabase Edge Function).
//   GET                         → { chavePublica }: chave que o app usa para ligar as notificações no aparelho
//   GET ?autoteste=1            → confere, no próprio servidor, as regras e a criptografia com respostas conhecidas
//   POST + x-avisos-segredo     → rotina diária (chamada pelo agendamento do banco): avisa quem tem pendência
//   POST + login do usuário     → { teste: true }: manda um aviso de teste só para quem pediu
// As dependências chegam por parâmetro para o mesmo código rodar nos testes (Node) e no Supabase (Deno).
import { pendenciasParaAviso } from "./regras.js";
import { enviaPush, gerarChaves, cifra, b64u, deB64u } from "./webpush.js";
import { montaAviso, avisoDeTeste } from "./mensagem.js";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const APP_PADRAO = "https://marcoshenriquebarbosasantos.github.io/controle-gastos-pwa/";

/**
 * Autoteste: roda no servidor de verdade e compara com respostas conhecidas. Não usa o banco nem envia nada.
 * Serve para confirmar, depois de publicar, que o servidor está com o código certo.
 */
export async function autoteste() {
  const falhas = [], confere = (nome, obtido, esperado) => { if (JSON.stringify(obtido) !== JSON.stringify(esperado)) falhas.push({ nome, obtido, esperado }); };
  const fx = (id, descricao, dia, valor, forma = "Boleto", extra = {}) => ({ id, tipo: "Despesa", descricao, categoria: "Moradia", dia, valor, forma, desde: "2026-08-01", ate: null, ...extra });
  const st = { pagos: [{ fixo_id: "p", mes: "2026-10-01" }], cartoes: [{ id: "k", nome: "Roxo", fechamento: 3, vencimento: 5 }],
    lancamentos: [{ id: "l", data: "2026-09-10", descricao: "Geladeira", tipo: "Despesa", categoria: "Outros", forma: "Cartão de crédito", cartao_id: "k", parcelas: 3, valor: 900 }],
    fixos: [fx("a", "Aluguel", 1, 1000), fx("i", "Internet", 6, 100), fx("f", "Faculdade", 20, 349), fx("p", "Pago", 2, 50), fx("s", "Streaming", 15, 40, "Cartão de crédito", { cartao_id: "k", desde: "2026-09-01" }),
      fx("u", "Uber", 1, 30, "Pix", { repete: "semanal", dia_semana: 0, desde: "2026-10-01" })],
    faturas: [{ id: "v", cartao: "Velha", vencimento: "2026-08-10", valor: 80, status: "Aberta" }, { id: "n", cartao: "Loja", vencimento: "2026-10-03", valor: 120, status: "Aberta" }] };
  const p = pendenciasParaAviso(st, "2026-10-03");
  confere("pendências", p.itens.map((x) => [x.titulo, x.dias, x.valor]), [["Aluguel", -2, 1000], ["Fatura Loja", 0, 120], ["Uber", 1, 30], ["Fatura Roxo", 2, 340], ["Internet", 3, 100]]);
  confere("totais", [p.atrasadas, p.hoje, p.total], [1, 1, 1590]);
  const a = montaAviso(p, "https://app/");
  confere("título", a.titulo, "1 conta atrasada e 4 para vencer");
  confere("valor em reais", a.assunto.replace(/\u00a0/g, " "), "Meus Gastos: 1 conta atrasada e 4 para vencer (R$ 1.590,00)");
  confere("data de Brasília", new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date("2026-10-04T02:30:00Z")), "2026-10-03");
  // Criptografia: exemplo oficial da RFC 8291 (apêndice A).
  const asPub = deB64u("BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8");
  const jwk = { kty: "EC", crv: "P-256", d: "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw", x: b64u(asPub.slice(1, 33)), y: b64u(asPub.slice(33)) };
  const efemera = { privateKey: await crypto.subtle.importKey("jwk", jwk, { name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]),
    publicKey: await crypto.subtle.importKey("raw", asPub, { name: "ECDH", namedCurve: "P-256" }, true, []) };
  const cif = await cifra("When I grow up, I want to be a watermelon", "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4", "BTBZMqHH6r4Tts7J_aSIgg",
    { efemera, salt: deB64u("DGv6ra1nlYgDCS1FRnbzlw") });
  confere("criptografia", b64u(cif), "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN");
  const k = await gerarChaves();
  confere("chave gerada", deB64u(k.publica).length, 65);
  return { ok: falhas.length === 0, conferidos: 7, falhas };
}

export function criaHandler({ createClient, env, fetchFn = fetch, agora = () => new Date() }) {
  const admin = () => createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false, autoRefreshToken: false } });
  const urlApp = () => env("AVISOS_URL_APP") || APP_PADRAO;
  // "Hoje" no horário de Brasília, que é o dos vencimentos.
  const hoje = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(agora());

  /** Chaves das notificações: criadas na primeira vez e guardadas numa tabela que só o servidor lê. */
  async function chaves(db) {
    const ler = async () => (await db.from("avisos_chaves").select("publica, privada").eq("id", 1).maybeSingle()).data;
    let k = await ler();
    if (!k) { const novas = await gerarChaves(); await db.from("avisos_chaves").upsert({ id: 1, ...novas }, { onConflict: "id", ignoreDuplicates: true }); k = await ler(); }
    if (!k) throw new Error("Não foi possível criar as chaves de notificação (a tabela avisos_chaves existe?).");
    return k;
  }

  /** Todas as linhas de uma tabela de um usuário (o banco devolve no máximo 1.000 por vez). */
  async function linhas(db, tabela, uid, colunas = "*") {
    const out = [];
    for (let de = 0; ; de += 1000) {
      const { data, error } = await db.from(tabela).select(colunas).eq("user_id", uid).range(de, de + 999);
      if (error) { if (tabela === "cartoes") return []; throw new Error(`${tabela}: ${error.message}`); }
      out.push(...data);
      if (data.length < 1000) return out;
    }
  }
  async function estado(db, uid) {
    const [lancamentos, fixos, pagos, faturas, cartoes] = await Promise.all([linhas(db, "lancamentos", uid), linhas(db, "fixos", uid),
      linhas(db, "fixos_pagos", uid, "fixo_id, mes"), linhas(db, "faturas", uid), linhas(db, "cartoes", uid)]);
    const num = (r) => ({ ...r, valor: Number(r.valor) });
    return { lancamentos: lancamentos.map(num), fixos: fixos.map(num), pagos, faturas: faturas.map(num), cartoes };
  }

  async function mandaEmail(para, aviso) {
    const chave = env("BREVO_API_KEY"), remetente = env("AVISOS_REMETENTE");
    if (!chave || !remetente) return "não configurado";
    const r = await fetchFn("https://api.brevo.com/v3/smtp/email", { method: "POST",
      headers: { "api-key": chave, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ sender: { name: "Meus Gastos", email: remetente }, to: [{ email: para }], subject: aviso.assunto, htmlContent: aviso.html, textContent: aviso.texto }) });
    if (r.ok) return "enviado";
    return `erro ${r.status}: ${(await r.text().catch(() => "")).slice(0, 200)}`;
  }

  /** Notifica todos os aparelhos do usuário. Inscrições que não existem mais são apagadas. */
  async function mandaPush(db, uid, aviso, k) {
    const { data: subs } = await db.from("avisos_push").select("id, endpoint, p256dh, auth").eq("user_id", uid);
    let ok = 0;
    for (const s of subs || []) {
      try {
        const st = await enviaPush(s, { titulo: aviso.titulo, corpo: aviso.corpo, url: aviso.url }, k, `mailto:${env("AVISOS_REMETENTE") || "avisos@meusgastos.app"}`, fetchFn);
        if (st >= 200 && st < 300) ok++;
        else if (st === 404 || st === 410) await db.from("avisos_push").delete().eq("id", s.id);
        else console.warn("push", st, s.endpoint.slice(0, 60));
      } catch (e) { console.warn("push falhou:", e?.message); }
    }
    return { aparelhos: (subs || []).length, entregues: ok };
  }

  async function avisaUsuario(db, user, k, { teste = false } = {}) {
    const p = pendenciasParaAviso(await estado(db, user.id), hoje());
    if (!p.itens.length && !teste) return null;
    const aviso = p.itens.length ? montaAviso(p, urlApp()) : avisoDeTeste(urlApp());
    const { data: pref } = await db.from("preferencias").select("dados").eq("user_id", user.id).maybeSingle();
    const querEmail = pref?.dados?.avisos?.email !== false;
    const email = user.email && querEmail ? await mandaEmail(user.email, aviso) : "desligado";
    const push = await mandaPush(db, user.id, aviso, k);
    return { pendencias: p.itens.length, email, push };
  }

  async function rotinaDiaria(db) {
    const k = await chaves(db), dia = hoje(), res = { dia, usuarios: 0, avisados: 0, emails: 0, notificacoes: 0, erros: [] };
    for (let page = 1; page <= 500; page++) {
      const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw new Error(error.message);
      for (const user of data.users) {
        res.usuarios++;
        try {
          // Um aviso por pessoa por dia, mesmo que a rotina rode duas vezes.
          const { data: ja } = await db.from("avisos_enviados").select("dia").eq("user_id", user.id).eq("dia", dia).maybeSingle();
          if (ja) continue;
          const r = await avisaUsuario(db, user, k);
          if (!r) continue;
          res.avisados++; if (r.email === "enviado") res.emails++; res.notificacoes += r.push.entregues;
          if (/^erro/.test(r.email)) res.erros.push(`e-mail: ${r.email}`);
          await db.from("avisos_enviados").insert({ user_id: user.id, dia, canais: `email: ${r.email}; push: ${r.push.entregues}/${r.push.aparelhos}`.slice(0, 300) });
        } catch (e) { res.erros.push(String(e?.message || e).slice(0, 200)); }
      }
      if (data.users.length < 200) break;
    }
    res.erros = res.erros.slice(0, 20);
    return res;
  }

  const ultimoTeste = new Map();
  return async function handler(req) {
    try {
      if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
      if (req.method === "GET" && new URL(req.url).searchParams.has("autoteste")) return json(await autoteste());
      const db = admin();
      if (req.method === "GET") return json({ chavePublica: (await chaves(db)).publica });
      if (req.method !== "POST") return json({ erro: "Método não aceito." }, 405);
      const segredo = req.headers.get("x-avisos-segredo");
      if (segredo) {
        const { data: confere } = await db.rpc("avisos_confere_segredo", { s: segredo });
        if (confere !== true) return json({ erro: "Segredo inválido." }, 401);
        return json(await rotinaDiaria(db));
      }
      const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
      const { data: quem } = token ? await db.auth.getUser(token) : { data: null };
      if (!quem?.user) return json({ erro: "Entre no app para pedir um aviso de teste." }, 401);
      const corpo = await req.json().catch(() => ({}));
      if (!corpo.teste) return json({ erro: "Pedido não reconhecido." }, 400);
      // Um teste por minuto por pessoa, para ninguém gastar a cota de e-mails apertando o botão sem parar.
      const ultimo = ultimoTeste.get(quem.user.id) || 0, t = agora().getTime();
      if (t - ultimo < 60000) return json({ erro: "Espere um minuto para pedir outro teste." }, 429);
      ultimoTeste.set(quem.user.id, t);
      return json(await avisaUsuario(db, quem.user, await chaves(db), { teste: true }));
    } catch (e) {
      console.error(e);
      return json({ erro: String(e?.message || e) }, 500);
    }
  };
}
