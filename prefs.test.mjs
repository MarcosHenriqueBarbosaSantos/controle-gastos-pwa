// Preferências (metas, limites, categorias): vale a cópia mais nova, do aparelho ou do servidor (js/store.js).
import test from "node:test";
import assert from "node:assert/strict";
import { createSupabaseStore } from "../js/store.js";

function ambiente() {
  const m = new Map();
  globalThis.localStorage = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
  const srv = { dados: null, fora: false, upserts: 0 };
  const client = {
    auth: { getSession: async () => ({ data: { session: { user: { id: "u1" } } } }) },
    from: () => ({
      select: () => ({ maybeSingle: async () => (srv.fora ? { data: null, error: { message: "TypeError: Failed to fetch" } } : { data: srv.dados ? { dados: srv.dados } : null, error: null }) }),
      upsert: async (row) => { if (srv.fora) return { error: { message: "TypeError: Failed to fetch" } }; srv.upserts++; srv.dados = row.dados; return { error: null }; },
    }),
  };
  return { srv, st: createSupabaseStore(client), m };
}

test("a mudança feita sem internet não é desfeita pela cópia velha do servidor, e é reenviada", async () => {
  const { srv, st } = ambiente();
  await st.savePrefs({ teto: 3000 });
  assert.equal(srv.dados.teto, 3000);
  srv.fora = true;
  await assert.rejects(() => st.savePrefs({ teto: 2500, metas: {} }), "sem internet, o app fica sabendo (e não avisa como erro do banco)");
  srv.fora = false;
  const p = await st.loadPrefs();
  assert.equal(p.teto, 2500, "vale a do aparelho, que é mais nova");
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(srv.dados.teto, 2500, "e ela é reenviada para o servidor");
});

test("mudança mais nova feita em outro aparelho vale sobre a cópia daqui", async () => {
  const { srv, st } = ambiente();
  await st.savePrefs({ teto: 3000 });
  srv.dados = { teto: 4000, _em: Date.now() + 60000 };   // o computador mudou depois
  assert.equal((await st.loadPrefs()).teto, 4000);
});

test("servidor sem a hora (dados antigos) e aparelho sem cópia: vale o servidor", async () => {
  const { srv, st } = ambiente();
  srv.dados = { teto: 1000 };
  assert.equal((await st.loadPrefs()).teto, 1000);
});

test("sem internet ao abrir: vale a cópia do aparelho", async () => {
  const { srv, st } = ambiente();
  await st.savePrefs({ teto: 3000 });
  srv.fora = true;
  assert.equal((await st.loadPrefs()).teto, 3000);
});
