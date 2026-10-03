// Camada de dados. O app conversa só com esta interface e não sabe
// se os dados estão no Supabase ou guardados no próprio aparelho (demo).
//
// Interface comum:
//   loadAll()                      → { lancamentos, fixos, pagos, faturas, cartoes }
//   addLancamentos(rows)           → linhas inseridas (ignora import_key repetido)
//   updateLancamento(id, patch) / deleteLancamento(id)
//   loadPrefs() / savePrefs(dados)   → categorias e ajustes do usuário
//   addFixo(row) / updateFixo(id, patch) / deleteFixo(id)
//   setPago(fixoId, mes, pago)
//   addFatura(row) / updateFatura(id, patch) / deleteFatura(id)
//   addCartao(row) / updateCartao(id, patch) / deleteCartao(id)
//   salvaPush(row) / removePush(endpoint) / token()   → só na conta de verdade (avisos no celular)

const num = (r) => ({ ...r, valor: Number(r.valor) });

export function createSupabaseStore(client) {
  const ok = ({ data, error }) => { if (error) throw error; return data; };
  const prefsKey = async () => "cg-prefs-" + ((await client.auth.getSession()).data.session?.user.id || "anon");
  return {
    kind: "supabase",
    async loadAll() {
      const [l, f, p, c, k] = await Promise.all([
        client.from("lancamentos").select("*").order("data"),
        client.from("fixos").select("*").order("dia"),
        client.from("fixos_pagos").select("fixo_id, mes"),
        client.from("faturas").select("*").order("vencimento"),
        client.from("cartoes").select("*").order("created_at"),
      ]);
      // Se a tabela de cartões ainda não existe no banco, o app abre mesmo assim, sem cartões cadastrados.
      if (k.error) console.warn("Cartões indisponíveis:", k.error.message);
      return { lancamentos: ok(l).map(num), fixos: ok(f).map(num), pagos: ok(p), faturas: ok(c).map(num), cartoes: k.error ? [] : k.data, semCartoes: Boolean(k.error) };
    },
    async addLancamentos(rows) {
      const withKey = rows.filter((r) => r.import_key), plain = rows.filter((r) => !r.import_key);
      const out = [];
      if (plain.length) out.push(...ok(await client.from("lancamentos").insert(plain).select()));
      if (withKey.length) out.push(...ok(await client.from("lancamentos")
        .upsert(withKey, { onConflict: "user_id,import_key", ignoreDuplicates: true }).select()));
      return out.map(num);
    },
    async updateLancamento(id, patch) { ok(await client.from("lancamentos").update(patch).eq("id", id)); },
    async deleteLancamento(id) { ok(await client.from("lancamentos").delete().eq("id", id)); },
    // Preferências: uma linha por usuário. Uma cópia fica neste aparelho, para o caso de
    // a tabela ainda não existir no banco ou de faltar conexão.
    async loadPrefs() {
      try { const r = ok(await client.from("preferencias").select("dados").maybeSingle()); if (r) return r.dados; }
      catch { /* usa a cópia local */ }
      try { return JSON.parse(localStorage.getItem(await prefsKey())); } catch { return null; }
    },
    async savePrefs(dados) {
      try { localStorage.setItem(await prefsKey(), JSON.stringify(dados)); } catch { /* nada */ }
      const { error } = await client.from("preferencias").upsert({ dados, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) console.warn("Preferências salvas só neste aparelho:", error.message);
    },
    async addFixo(row) { return num(ok(await client.from("fixos").insert(row).select().single())); },
    async updateFixo(id, patch) { ok(await client.from("fixos").update(patch).eq("id", id)); },
    async deleteFixo(id) { ok(await client.from("fixos").delete().eq("id", id)); },
    async setPago(fixo_id, mes, pago) {
      if (pago) ok(await client.from("fixos_pagos").upsert({ fixo_id, mes }, { onConflict: "fixo_id,mes" }));
      else ok(await client.from("fixos_pagos").delete().eq("fixo_id", fixo_id).eq("mes", mes));
    },
    async addFatura(row) { return num(ok(await client.from("faturas").insert(row).select().single())); },
    async updateFatura(id, patch) { ok(await client.from("faturas").update(patch).eq("id", id)); },
    async deleteFatura(id) { ok(await client.from("faturas").delete().eq("id", id)); },
    async addCartao(row) { return ok(await client.from("cartoes").insert(row).select().single()); },
    async updateCartao(id, patch) { ok(await client.from("cartoes").update(patch).eq("id", id)); },
    async deleteCartao(id) { ok(await client.from("cartoes").delete().eq("id", id)); },
    // Notificações: guarda (ou apaga) a inscrição deste aparelho para o servidor de avisos.
    async salvaPush(row) { ok(await client.from("avisos_push").upsert(row, { onConflict: "user_id,endpoint" })); },
    async removePush(endpoint) { ok(await client.from("avisos_push").delete().eq("endpoint", endpoint)); },
    async token() { return (await client.auth.getSession()).data.session?.access_token || ""; },
  };
}

/** Guarda tudo no localStorage deste aparelho. Usado no modo demonstração. */
export function createLocalStore(key, seedFn) {
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
  let db;
  try { db = JSON.parse(localStorage.getItem(key)); } catch { db = null; }
  if (!db) db = seedFn ? seedFn(uuid) : { lancamentos: [], fixos: [], pagos: [], faturas: [], cartoes: [] };
  db.cartoes ||= [];
  const persist = () => { try { localStorage.setItem(key, JSON.stringify(db)); } catch { /* armazenamento indisponível: segue em memória */ } };
  persist();
  return {
    kind: "local",
    async loadAll() { const { prefs, ...dados } = db; return structuredClone(dados); },
    async addLancamentos(rows) {
      const keys = new Set(db.lancamentos.map((r) => r.import_key).filter(Boolean));
      const out = rows.filter((r) => !r.import_key || !keys.has(r.import_key))
        .map((r) => ({ ...r, id: uuid(), created_at: new Date().toISOString() }));
      db.lancamentos.push(...out); persist(); return structuredClone(out);
    },
    async updateLancamento(id, patch) { Object.assign(db.lancamentos.find((r) => r.id === id) || {}, patch); persist(); },
    async deleteLancamento(id) { db.lancamentos = db.lancamentos.filter((r) => r.id !== id); persist(); },
    async loadPrefs() { return db.prefs ? structuredClone(db.prefs) : null; },
    async savePrefs(dados) { db.prefs = structuredClone(dados); persist(); },
    async addFixo(row) { const r = { ...row, id: uuid() }; db.fixos.push(r); persist(); return { ...r }; },
    async updateFixo(id, patch) { Object.assign(db.fixos.find((r) => r.id === id) || {}, patch); persist(); },
    async deleteFixo(id) { db.fixos = db.fixos.filter((r) => r.id !== id); db.pagos = db.pagos.filter((p) => p.fixo_id !== id); persist(); },
    async setPago(fixo_id, mes, pago) {
      db.pagos = db.pagos.filter((p) => !(p.fixo_id === fixo_id && p.mes === mes));
      if (pago) db.pagos.push({ fixo_id, mes });
      persist();
    },
    async addFatura(row) { const r = { ...row, id: uuid() }; db.faturas.push(r); persist(); return { ...r }; },
    async updateFatura(id, patch) { Object.assign(db.faturas.find((r) => r.id === id) || {}, patch); persist(); },
    async deleteFatura(id) { db.faturas = db.faturas.filter((r) => r.id !== id); persist(); },
    async addCartao(row) { const r = { ativo: true, ...row, id: uuid(), created_at: new Date().toISOString() }; db.cartoes.push(r); persist(); return { ...r }; },
    async updateCartao(id, patch) { Object.assign(db.cartoes.find((r) => r.id === id) || {}, patch); persist(); },
    // Como no banco: as compras ficam sem cartão e os registros de fatura daquele cartão somem.
    async deleteCartao(id) {
      db.cartoes = db.cartoes.filter((r) => r.id !== id); db.faturas = db.faturas.filter((r) => r.cartao_id !== id);
      [...db.lancamentos, ...db.fixos].forEach((r) => { if (r.cartao_id === id) r.cartao_id = null; });
      persist();
    },
    reset() { try { localStorage.removeItem(key); } catch { /* nada */ } },
  };
}

/** Dados de exemplo para a demonstração, relativos ao mês atual. */
export function demoSeed(hojeISO) {
  return (uuid) => {
    const [y, m, d] = hojeISO.split("-").map(Number);
    const mes = (k) => { const dt = new Date(y, m - 1 + k, 1); return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`; };
    const cur = mes(0), prev = mes(-1);
    // Cartão de exemplo: fecha no dia 1 e vence no dia 8. As faturas são montadas pelas compras.
    const roxo = { id: uuid(), nome: "Cartão roxo", fechamento: 1, vencimento: 8, ativo: true, created_at: `${prev}-01T12:00:00Z` };
    const L = [], add = (mm, dia, descricao, tipo, categoria, forma, valor, parcelas = 1) =>
      L.push({ id: uuid(), data: `${mm}-${String(dia).padStart(2, "0")}`, descricao, tipo, categoria, forma, valor, import_key: null,
        cartao_id: forma === "Cartão de crédito" ? roxo.id : null, parcelas });
    // mês anterior (completo)
    add(prev, 20, "Freela de planilha", "Receita", "Renda extra", "", 450);
    add(prev, 3, "Mercado do mês", "Despesa", "Mercado", "Débito", 612.4);
    add(prev, 8, "Uber", "Despesa", "Transporte", "Pix", 38.9);
    add(prev, 12, "Almoço fora", "Despesa", "Alimentação", "Cartão de crédito", 54);
    add(prev, 17, "Cinema", "Despesa", "Lazer", "Cartão de crédito", 72);
    add(prev, 19, "Tênis", "Despesa", "Roupas", "Cartão de crédito", 359.7, 3);   // parcelado em 3 vezes
    add(prev, 22, "Farmácia", "Despesa", "Saúde", "Pix", 47.3);
    add(prev, 26, "Feira", "Despesa", "Mercado", "Dinheiro", 86);
    add(prev, 28, "Reserva do mês", "Reserva", "Reserva de emergência", "", 300);
    add(prev, 28, "Tesouro Direto", "Reserva", "Investimentos", "", 200);
    // mês atual (só até hoje)
    const cand = [[1, "Padaria", "Despesa", "Alimentação", "Pix", 18.5],
      [2, "Mercado do mês", "Despesa", "Mercado", "Débito", 578.2], [3, "Farmácia", "Despesa", "Saúde", "Pix", 42.9], [6, "Reserva do mês", "Reserva", "Reserva de emergência", "", 150], [7, "Gasolina", "Despesa", "Transporte", "Cartão de crédito", 150],
      [9, "Delivery", "Despesa", "Alimentação", "Cartão de crédito", 62.9], [13, "Presente de aniversário", "Despesa", "Outros", "Pix", 95],
      [16, "Show", "Despesa", "Lazer", "Cartão de crédito", 140], [19, "Uber", "Despesa", "Transporte", "Pix", 27.6],
      [21, "Mercado", "Despesa", "Mercado", "Débito", 134.8], [24, "Cabeleireiro", "Despesa", "Beleza", "Pix", 60]];
    cand.filter((c) => c[0] <= d).forEach((c) => add(cur, ...c));
    const F = [["Aluguel", "Moradia", 10, 1100, "Boleto"], ["Internet", "Contas da casa", 15, 99.9, "Débito"],
      ["Faculdade", "Educação", 20, 349, "Boleto"], ["Celular", "Contas da casa", 12, 55, "Cartão de crédito"]]
      .map(([descricao, categoria, dia, valor, forma]) => ({ id: uuid(), tipo: "Despesa", descricao, categoria, dia, valor, forma, desde: `${prev}-01`, ate: null,
        cartao_id: forma === "Cartão de crédito" ? roxo.id : null }));
    // Exemplo de gasto semanal: terapia toda quinta-feira, desde o mês anterior.
    F.push({ id: uuid(), tipo: "Despesa", repete: "semanal", dia_semana: 4, descricao: "Terapia", categoria: "Saúde", dia: 1, valor: 90, forma: "Pix", desde: `${prev}-01`, ate: null });
    const salario = { id: uuid(), tipo: "Receita", descricao: "Salário", categoria: "Salário", dia: 5, valor: 3900, forma: "", desde: `${prev}-01`, ate: null };
    const P = [];
    F.filter((f) => f.repete !== "semanal" && !f.cartao_id).forEach((f) => { P.push({ fixo_id: f.id, mes: `${prev}-01` }); if (f.dia <= d) P.push({ fixo_id: f.id, mes: `${cur}-01` }); });
    // A fatura que vence neste mês (compras do mês passado) já aparece paga depois do dia 8.
    const C = d >= 8 ? [{ id: uuid(), cartao_id: roxo.id, cartao: roxo.nome, vencimento: `${cur}-08`, valor: 300.9, status: "Paga", valor_fixo: false }] : [];
    return { lancamentos: L, fixos: [...F, salario], pagos: P, faturas: C, cartoes: [roxo] };
  };
}
