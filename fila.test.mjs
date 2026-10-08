// Testes do funcionamento sem internet: fila de lançamentos e cópia dos dados (js/store.js). Rode com: node --test
import test from "node:test";
import assert from "node:assert/strict";
import { comFila, semRede } from "../js/store.js";

const SEM_REDE = () => Object.assign(new Error("TypeError: Failed to fetch"), {});
/** Uma conta de mentira: guarda em memória e pode "ficar sem internet". */
function conta() {
  const servidor = { lancamentos: [{ id: "s1", data: "2026-10-01", descricao: "Mercado", tipo: "Despesa", categoria: "Mercado", forma: "Pix", valor: 100 }], fixos: [], pagos: [], faturas: [], cartoes: [] };
  const c = { fora: false, recusa: null, chamadas: [], servidor,
    base: { kind: "supabase",
      async loadAll() { c.chamadas.push("loadAll"); if (c.fora) throw SEM_REDE(); return structuredClone(servidor); },
      async addLancamentos(rows) { c.chamadas.push(["add", rows.map((r) => r.id || "novo")]); if (c.fora) throw SEM_REDE(); if (c.recusa) throw c.recusa;
        const out = rows.map((r) => { if (r.id && servidor.lancamentos.some((x) => x.id === r.id)) throw Object.assign(new Error("duplicate key value violates unique constraint"), { code: "23505" }); const n = { ...r, id: r.id || "srv-" + (servidor.lancamentos.length + 1) }; servidor.lancamentos.push(n); return n; });
        return out; },
      async updateLancamento(id, patch) { c.chamadas.push(["update", id]); if (c.fora) throw SEM_REDE(); Object.assign(servidor.lancamentos.find((x) => x.id === id), patch); },
      async deleteLancamento(id) { c.chamadas.push(["delete", id]); if (c.fora) throw SEM_REDE(); servidor.lancamentos = servidor.lancamentos.filter((x) => x.id !== id); },
      async outra() { return "passa direto"; } } };
  return c;
}
function gaveta() { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m }; }
const novo = (descricao, valor) => ({ data: "2026-10-06", descricao, tipo: "Despesa", categoria: "Outros", forma: "Pix", valor, import_key: null });
const monta = (c, g = gaveta()) => { let n = 0; return [comFila(c.base, { chave: "cg-u1", guarda: g, uuid: () => "fila-" + ++n, agora: () => "2026-10-06T15:00:00.000Z" }), g]; };

test("erro de conexão é diferente de recusa do banco", () => {
  assert.equal(semRede(new Error("TypeError: Failed to fetch")), true);
  assert.equal(semRede({ message: "NetworkError when attempting to fetch resource." }), true);
  assert.equal(semRede({ message: "Load failed" }), true);
  assert.equal(semRede({ message: 'new row violates row-level security policy for table "lancamentos"', code: "42501" }), false);
  assert.equal(semRede({ message: "duplicate key value", code: "23505" }), false);
});

test("com internet, tudo passa direto e a cópia dos dados é guardada", async () => {
  const c = conta(), [s, g] = monta(c);
  const d = await s.loadAll();
  assert.equal(d.lancamentos.length, 1); assert.equal(d.daCopia, undefined); assert.equal(s.semRede, false);
  assert.equal(JSON.parse(g.getItem("cg-u1-copia")).lancamentos[0].id, "s1");
  const [l] = await s.addLancamentos([novo("Café", 5)]);
  assert.equal(l.pendente, undefined); assert.equal(s.naFila(), 0); assert.equal(c.servidor.lancamentos.length, 2);
  assert.equal(await s.outra(), "passa direto"); assert.equal(s.kind, "supabase");
});

test("sem internet: o lançamento fica na fila, marcado como pendente, e sobrevive a fechar o app", async () => {
  const c = conta(), [s, g] = monta(c);
  await s.loadAll(); c.fora = true;
  const [a] = await s.addLancamentos([novo("Almoço", 30)]), [b] = await s.addLancamentos([novo("Ônibus", 5)]);
  assert.deepEqual([a.id, a.pendente, a.created_at, b.id], ["fila-1", true, "2026-10-06T15:00:00.000Z", "fila-2"]);
  assert.equal(s.naFila(), 2); assert.equal(s.semRede, true); assert.equal(c.servidor.lancamentos.length, 1);
  assert.equal(JSON.parse(g.getItem("cg-u1-fila")).some((x) => "pendente" in x), false, "a marca de pendente não vai para a fila nem para o servidor");
  // app fechado e aberto de novo, ainda sem internet: abre com a cópia e com a fila
  const [s2] = monta(c, g), d = await s2.loadAll();
  assert.equal(d.daCopia, true); assert.equal(s2.naFila(), 2);
  assert.deepEqual(d.lancamentos.map((x) => [x.id, Boolean(x.pendente)]), [["s1", false], ["fila-1", true], ["fila-2", true]]);
});

test("a conexão voltou: a fila é enviada na ordem, com o mesmo id, e esvazia", async () => {
  const c = conta(), [s, g] = monta(c);
  await s.loadAll(); c.fora = true;
  await s.addLancamentos([novo("Almoço", 30)]); await s.addLancamentos([novo("Ônibus", 5)]);
  assert.deepEqual(await s.enviaFila(), { enviados: [], faltam: 2, erro: "" }, "ainda sem conexão: nada muda");
  c.fora = false;
  const r = await s.enviaFila();
  assert.deepEqual(r.enviados.map((x) => [x.id, x.descricao, x.pendente]), [["fila-1", "Almoço", undefined], ["fila-2", "Ônibus", undefined]]);
  assert.equal(r.faltam, 0); assert.equal(s.naFila(), 0); assert.equal(s.semRede, false); assert.equal(g.getItem("cg-u1-fila"), "[]");
  assert.deepEqual(c.servidor.lancamentos.map((x) => x.id), ["s1", "fila-1", "fila-2"]);
  assert.deepEqual((await s.loadAll()).lancamentos.map((x) => x.id), ["s1", "fila-1", "fila-2"], "depois de enviado, não aparece em dobro");
});

test("resposta que se perdeu no caminho: mandar de novo não duplica", async () => {
  const c = conta(), [s] = monta(c);
  await s.loadAll(); c.fora = true; await s.addLancamentos([novo("Almoço", 30)]); c.fora = false;
  c.servidor.lancamentos.push({ ...novo("Almoço", 30), id: "fila-1" });   // o servidor recebeu, mas o app não soube
  const r = await s.enviaFila();
  assert.equal(r.enviados.length, 1); assert.equal(r.faltam, 0); assert.equal(c.servidor.lancamentos.filter((x) => x.id === "fila-1").length, 1);
});

test("servidor recusou (acesso vencido, por exemplo): o lançamento continua na fila e o motivo aparece", async () => {
  const c = conta(), [s] = monta(c);
  await s.loadAll(); c.fora = true; await s.addLancamentos([novo("Almoço", 30)]); await s.addLancamentos([novo("Ônibus", 5)]); c.fora = false;
  c.recusa = Object.assign(new Error("new row violates row-level security policy"), { code: "42501" });
  const r = await s.enviaFila();
  assert.equal(r.enviados.length, 0); assert.equal(r.faltam, 2); assert.match(r.erro, /row-level security/);
  c.recusa = null; assert.equal((await s.enviaFila()).faltam, 0);
});

test("editar e excluir o que está na fila funciona sem internet; o que já está no servidor precisa de conexão", async () => {
  const c = conta(), [s, g] = monta(c);
  await s.loadAll(); c.fora = true;
  await s.addLancamentos([novo("Almoço", 30)]); await s.addLancamentos([novo("Ônibus", 5)]);
  await s.updateLancamento("fila-1", { valor: 32.5, pendente: true });
  await s.deleteLancamento("fila-2");
  assert.deepEqual(JSON.parse(g.getItem("cg-u1-fila")).map((x) => [x.id, x.valor, "pendente" in x]), [["fila-1", 32.5, false]]);
  await assert.rejects(() => s.updateLancamento("s1", { valor: 1 }), /Failed to fetch/);
  await assert.rejects(() => s.deleteLancamento("s1"), /Failed to fetch/);
  c.fora = false; await s.enviaFila();
  assert.equal(c.servidor.lancamentos.find((x) => x.id === "fila-1").valor, 32.5);
});

test("o que não entra na fila: compra do extrato, erro do banco e aparelho sem espaço", async () => {
  const c = conta(), [s] = monta(c);
  await s.loadAll(); c.fora = true;
  await assert.rejects(() => s.addLancamentos([{ ...novo("IFOOD", 40), import_key: "ext|1" }]), /Failed to fetch/);
  c.fora = false; c.recusa = Object.assign(new Error("column x does not exist"), { code: "42703" });
  await assert.rejects(() => s.addLancamentos([novo("Café", 5)]), /column/);
  assert.equal(s.naFila(), 0);
  const cheia = gaveta(); cheia.setItem = () => { throw new Error("QuotaExceededError"); };
  const c2 = conta(), [s2] = monta(c2, cheia); c2.fora = true;
  await assert.rejects(() => s2.addLancamentos([novo("Café", 5)]), /Failed to fetch/); assert.equal(s2.naFila(), 0);
});

test("sem internet e sem cópia guardada: não inventa dados", async () => {
  const c = conta(), [s] = monta(c); c.fora = true;
  await assert.rejects(() => s.loadAll(), /Failed to fetch/);
});

test("a cópia não guarda o que está pendente, e some ao sair da conta; a fila fica", async () => {
  const c = conta(), [s, g] = monta(c);
  const d = await s.loadAll(); c.fora = true;
  const [a] = await s.addLancamentos([novo("Almoço", 30)]);
  s.guardaCopia({ ...d, lancamentos: [...d.lancamentos, a] });
  assert.deepEqual(JSON.parse(g.getItem("cg-u1-copia")).lancamentos.map((x) => x.id), ["s1"]);
  s.esqueceCopia();
  assert.equal(g.getItem("cg-u1-copia"), null); assert.equal(s.naFila(), 1);
});

test("sinal fraco: sem resposta no prazo, o lançamento vai para a fila com o mesmo id e não duplica quando o envio lento chega", async () => {
  const c = conta(), g = gaveta(); let n = 0, libera;
  const lento = { ...c.base, addLancamentos: (rows) => new Promise((ok) => { libera = () => ok(c.base.addLancamentos(rows)); }) };
  const s = comFila(lento, { chave: "cg-u1", guarda: g, uuid: () => "id-" + ++n, agora: () => "2026-10-06T15:00:00.000Z", espera: 20 });
  const [l] = await s.addLancamentos([novo("Café", 5)]);
  assert.equal(l.pendente, true); assert.equal(l.id, "id-1"); assert.equal(s.naFila(), 1);
  libera(); await new Promise((r) => setTimeout(r, 5));   // o envio que demorou chega ao servidor
  assert.equal(c.servidor.lancamentos.filter((x) => x.id === "id-1").length, 1);
  const s2 = comFila(c.base, { chave: "cg-u1", guarda: g });   // mais tarde, com conexão boa
  const r = await s2.enviaFila();
  assert.equal(r.enviados.length, 1); assert.equal(r.faltam, 0); assert.equal(r.erro, "");
  assert.equal(c.servidor.lancamentos.filter((x) => x.id === "id-1").length, 1, "o reenvio dá 'já existe' e conta como entregue");
});

test("o id escolhido pela tela é mantido, com e sem internet", async () => {
  const c = conta(), [s] = monta(c);
  const [a] = await s.addLancamentos([{ ...novo("Pão", 8), id: "tela-1" }]);
  assert.equal(a.id, "tela-1");
  c.fora = true;
  const [b] = await s.addLancamentos([{ ...novo("Uber", 20), id: "tela-2" }]);
  assert.equal(b.id, "tela-2"); assert.equal(b.pendente, true);
});
