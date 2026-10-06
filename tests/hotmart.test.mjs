// Testes do servidor que recebe os avisos da Hotmart (supabase/functions/hotmart). Rode com: node --test
import test from "node:test";
import assert from "node:assert/strict";
import { interpreta, dataDe, igual, criaHandler, GRACA_DIAS } from "../supabase/functions/hotmart/handler.js";

const AGORA = new Date("2026-10-06T12:00:00Z"), ms = (iso) => new Date(iso).getTime();
/** Aviso no formato da Hotmart 2.0.0. */
const compra = (event, extra = {}, sub = true) => ({ id: "ev-1", creation_date: ms("2026-10-06T12:00:00Z"), event, version: "2.0.0", data: {
  product: { id: 788921, name: "Meus Gastos" }, buyer: { email: " Ana@Exemplo.com ", name: "Ana", checkout_phone: "11999990000" },
  purchase: { transaction: "HP0001", status: "APPROVED", approved_date: ms("2026-10-06T11:59:00Z"), order_date: ms("2026-10-06T11:58:00Z"), price: { value: 49.9 },
    ...(sub ? { date_next_charge: ms("2027-10-06T11:59:00Z"), recurrence_number: 1 } : {}), ...extra },
  ...(sub ? { subscription: { status: "ACTIVE", plan: { name: "Anual" }, subscriber: { code: "SUB123" } } } : {}) } });
const cancelamento = { id: "ev-2", event: "SUBSCRIPTION_CANCELLATION", version: "2.0.0", data: { date_next_charge: ms("2027-10-06T11:59:00Z"), product: { id: 788921 },
  subscriber: { code: "SUB123", name: "Ana", email: "ana@exemplo.com" }, subscription: { id: 1, plan: { name: "Anual" } }, cancellation_date: ms("2026-12-01T10:00:00Z") } };

test("datas da Hotmart: milissegundos, segundos, texto e vazio", () => {
  assert.equal(dataDe(1791287940000).toISOString(), "2026-10-06T11:59:00.000Z");
  assert.equal(dataDe("1791287940000").toISOString(), "2026-10-06T11:59:00.000Z");
  assert.equal(dataDe(1791287940).toISOString(), "2026-10-06T11:59:00.000Z");
  assert.equal(dataDe("2026-10-06T11:59:00Z").toISOString(), "2026-10-06T11:59:00.000Z");
  assert.deepEqual([dataDe(null), dataDe(""), dataDe(undefined), dataDe("ontem")], [null, null, null, null]);
});

test("compra aprovada: libera até a próxima cobrança, com alguns dias de folga, e o e-mail vai em minúsculas", () => {
  const a = interpreta(compra("PURCHASE_APPROVED"), AGORA);
  assert.deepEqual(a, { evento: "PURCHASE_APPROVED", email: "ana@exemplo.com", transacao: "HP0001", assinante: "SUB123", produto: "788921", acao: "liberar", ate: "2027-10-09" });
  assert.equal(GRACA_DIAS, 3);
  assert.equal(interpreta(compra("PURCHASE_COMPLETE"), AGORA).acao, "liberar");
  assert.equal(interpreta(compra("purchase_approved"), AGORA).acao, "liberar");
});

test("compra sem data de renovação (ou com data já passada): vale 1 ano a partir da aprovação", () => {
  assert.equal(interpreta(compra("PURCHASE_APPROVED", {}, false), AGORA).ate, "2027-10-09");
  assert.equal(interpreta(compra("PURCHASE_APPROVED", { date_next_charge: ms("2026-01-01T00:00:00Z") }), AGORA).ate, "2027-10-09");
  const semDatas = compra("PURCHASE_APPROVED", { approved_date: undefined, order_date: undefined }, false);
  assert.equal(interpreta(semDatas, AGORA).ate, "2027-10-09");   // sem nenhuma data, conta de agora
});

test("cancelamento, reembolso e os avisos que só ficam registrados", () => {
  assert.deepEqual(interpreta(cancelamento, AGORA), { evento: "SUBSCRIPTION_CANCELLATION", email: "ana@exemplo.com", transacao: null, assinante: "SUB123", produto: "788921", acao: "cancelar", ate: null });
  assert.equal(interpreta(compra("PURCHASE_REFUNDED"), AGORA).acao, "cortar");
  assert.equal(interpreta(compra("PURCHASE_CHARGEBACK"), AGORA).acao, "cortar");
  for (const e of ["PURCHASE_CANCELED", "PURCHASE_BILLET_PRINTED", "PURCHASE_PROTEST", "PURCHASE_DELAYED", "PURCHASE_EXPIRED", "PURCHASE_OUT_OF_SHOPPING_CART", "SWITCH_PLAN", "QUALQUER_OUTRO"])
    assert.equal(interpreta(compra(e), AGORA).acao, "nada", e);
  assert.deepEqual(interpreta({}, AGORA), { evento: "", email: "", transacao: null, assinante: null, produto: null, acao: "nada", ate: null });
  assert.equal(interpreta(null, AGORA).acao, "nada");
});

test("comparação do código de verificação", () => {
  assert.equal(igual("abc123", "abc123"), true);
  for (const [a, b] of [["abc123", "abc124"], ["abc123", "abc12"], ["", "abc"], [null, "abc"], ["abc", undefined]]) assert.equal(igual(a, b), false);
});

/** Banco de mentira com as duas tabelas que a função usa. */
function ambiente(acessos = [], cfg = {}) {
  const t = { acessos: acessos.map((x) => ({ ...x })), acesso_eventos: [] };
  const from = (nome) => { let op = "select", payload, filtros = [];
    const run = () => { const casa = (r) => filtros.every(([k, v]) => r[k] === v);
      if (op === "select") return { data: t[nome].find(casa) ?? null, error: null };
      if (op === "insert") { t[nome].push({ ...payload }); return { data: null, error: null }; }
      if (op === "upsert") { const i = t[nome].findIndex((r) => r.email === payload.email); if (i >= 0) t[nome][i] = { ...t[nome][i], ...payload }; else t[nome].push({ ...payload }); return { data: null, error: null }; }
      if (op === "update") { t[nome].filter(casa).forEach((r) => Object.assign(r, payload)); return { data: null, error: null }; } };
    const o = { select: () => o, eq: (k, v) => { filtros.push([k, v]); return o; }, maybeSingle: () => o,
      insert: (p) => { op = "insert"; payload = p; return o; }, upsert: (p) => { op = "upsert"; payload = p; return o; }, update: (p) => { op = "update"; payload = p; return o; },
      then: (ok, err) => Promise.resolve(run()).then(ok, err) }; return o; };
  const env = { SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "k", HOTMART_HOTTOK: "tok-certo", ...cfg };
  const handler = criaHandler({ createClient: () => ({ from }), env: (k) => env[k], agora: () => AGORA });
  const manda = async (corpo, tok = "tok-certo", method = "POST") => { const r = await handler(new Request("https://x.supabase.co/functions/v1/hotmart", { method,
    headers: tok ? { "X-HOTMART-HOTTOK": tok, "Content-Type": "application/json" } : {}, body: method === "POST" ? (typeof corpo === "string" ? corpo : JSON.stringify(corpo)) : undefined })); return { status: r.status, corpo: await r.json() }; };
  return { t, manda };
}

test("servidor: recusa quem não manda o código certo e não mexe em nada", async () => {
  const amb = ambiente();
  assert.equal((await amb.manda(compra("PURCHASE_APPROVED"), "errado")).status, 401);
  assert.equal((await amb.manda(compra("PURCHASE_APPROVED"), "")).status, 401);
  assert.equal((await amb.manda("isto não é json")).status, 400);
  assert.deepEqual([amb.t.acessos.length, amb.t.acesso_eventos.length], [0, 0]);
  assert.deepEqual(await amb.manda(null, "", "GET"), { status: 200, corpo: { ok: true, servico: "hotmart" } });
  assert.equal((await ambiente([], { HOTMART_HOTTOK: "" }).manda(compra("PURCHASE_APPROVED"))).status, 503);   // sem o segredo cadastrado, recusa tudo
});

test("servidor: compra libera, o mesmo aviso repetido não muda nada, e a renovação estende", async () => {
  const amb = ambiente();
  let r = await amb.manda(compra("PURCHASE_APPROVED"));
  assert.deepEqual(r, { status: 200, corpo: { ok: true, evento: "PURCHASE_APPROVED", efeito: "acesso até 2027-10-09" } });
  assert.deepEqual(amb.t.acessos.map((x) => [x.email, x.status, x.ate, x.origem, x.transacao, x.assinante]), [["ana@exemplo.com", "ativo", "2027-10-09", "hotmart", "HP0001", "SUB123"]]);
  await amb.manda(compra("PURCHASE_APPROVED")); await amb.manda(compra("PURCHASE_COMPLETE"));
  assert.equal(amb.t.acessos.length, 1); assert.equal(amb.t.acessos[0].ate, "2027-10-09");
  r = await amb.manda(compra("PURCHASE_APPROVED", { transaction: "HP0002", date_next_charge: ms("2028-10-06T11:59:00Z"), recurrence_number: 2 }));
  assert.equal(r.corpo.efeito, "acesso até 2028-10-09"); assert.equal(amb.t.acessos[0].transacao, "HP0002");
  // Um aviso antigo que chega atrasado não encurta o acesso.
  await amb.manda(compra("PURCHASE_APPROVED"));
  assert.equal(amb.t.acessos[0].ate, "2028-10-09");
  // O registro não guarda nome nem telefone de quem comprou.
  assert.deepEqual(Object.keys(amb.t.acesso_eventos[0]).sort(), ["efeito", "email", "evento", "transacao"]);
  assert.equal(amb.t.acesso_eventos.length, 5);
});

test("servidor: cancelar a renovação mantém o acesso até o fim do período; reembolso encerra; comprar de novo reabre", async () => {
  const amb = ambiente();
  await amb.manda(compra("PURCHASE_APPROVED"));
  let r = await amb.manda(cancelamento);
  assert.equal(r.corpo.efeito, "renovação cancelada: vale até 2027-10-09");
  assert.deepEqual([amb.t.acessos[0].status, amb.t.acessos[0].ate], ["cancelado", "2027-10-09"]);
  assert.equal((await amb.manda(cancelamento)).corpo.efeito, "já não estava ativo: nada mudou");
  r = await amb.manda(compra("PURCHASE_REFUNDED"));
  assert.equal(r.corpo.efeito, "acesso encerrado"); assert.equal(amb.t.acessos[0].status, "reembolsado");
  assert.equal((await amb.manda(compra("PURCHASE_COMPLETE"))).corpo.efeito, "compra já reembolsada: nada mudou");   // aviso repetido da compra devolvida
  assert.equal(amb.t.acessos[0].status, "reembolsado");
  r = await amb.manda(compra("PURCHASE_APPROVED", { transaction: "HP0003" }));
  assert.deepEqual([amb.t.acessos[0].status, amb.t.acessos[0].ate, amb.t.acessos[0].transacao], ["ativo", "2027-10-09", "HP0003"]);
});

test("servidor: cortesia não é derrubada pela Hotmart, avisos sem efeito só ficam registrados, outro produto é ignorado", async () => {
  const amb = ambiente([{ email: "ana@exemplo.com", status: "ativo", ate: null, origem: "cortesia", transacao: null, assinante: null }]);
  assert.equal((await amb.manda(compra("PURCHASE_REFUNDED"))).corpo.efeito, "cortesia: nada mudou");
  assert.equal((await amb.manda(cancelamento)).corpo.efeito, "cortesia: nada mudou");
  assert.equal((await amb.manda(compra("PURCHASE_APPROVED"))).corpo.efeito, "acesso sem data de fim (cortesia mantida)");
  assert.deepEqual([amb.t.acessos[0].ate, amb.t.acessos[0].origem, amb.t.acessos[0].status], [null, "cortesia", "ativo"]);
  assert.equal((await amb.manda(compra("PURCHASE_DELAYED"))).corpo.efeito, "só registrado");
  const outro = ambiente([], { HOTMART_PRODUTO: "111" });
  assert.equal((await outro.manda(compra("PURCHASE_APPROVED"))).corpo.efeito, "outro produto: ignorado"); assert.equal(outro.t.acessos.length, 0);
  const certo = ambiente([], { HOTMART_PRODUTO: "788921" });
  assert.equal((await certo.manda(compra("PURCHASE_APPROVED"))).corpo.efeito, "acesso até 2027-10-09");
  const semNada = ambiente();
  assert.equal((await semNada.manda(cancelamento)).corpo.efeito, "sem acesso anotado: nada feito");
  assert.equal((await semNada.manda({ event: "PURCHASE_APPROVED", data: {} })).corpo.efeito, "sem e-mail: nada feito");
});
