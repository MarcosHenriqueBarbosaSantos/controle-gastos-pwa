// GERADO a partir de js/calc.js por gera-regras.mjs. Não edite: mude o calc.js e gere de novo.
export const pad = (n) => String(n).padStart(2, "0");
export const mKey = (iso) => iso.slice(0, 7);
export function addM(m, k) {
  let [y, mo] = m.split("-").map(Number);
  mo += k;
  while (mo > 12) { mo -= 12; y++; }
  while (mo < 1) { mo += 12; y--; }
  return `${y}-${pad(mo)}`;
}
export const dim = (m) => { const [y, mo] = m.split("-").map(Number); return new Date(y, mo, 0).getDate(); };
export const round2 = (v) => Math.round(v * 100) / 100;
export function fixosDoMes(fixos, m, tipo = "Despesa") {
  return fixos.filter((f) => (f.tipo || "Despesa") === tipo && mKey(f.desde) <= m && (!f.ate || m <= mKey(f.ate)));
}
export const diaDaSemana = (iso) => new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))).getDay();
export function ocorrencias(fixos, m, tipo = "Despesa") {
  const n = dim(m), out = [];
  fixosDoMes(fixos, m, tipo).forEach((f) => {
    if (f.repete === "semanal") {
      for (let d = 1; d <= n; d++) {
        const data = `${m}-${pad(d)}`;
        if (diaDaSemana(data) === Number(f.dia_semana) && data >= f.desde) out.push({ ...f, data, chave: data });
      }
    } else out.push({ ...f, data: `${m}-${pad(Math.min(n, Math.max(1, f.dia || 1)))}`, chave: `${m}-01` });
  });
  return out.sort((a, b) => a.data.localeCompare(b.data));
}
export const CARTAO = "Cartão de crédito";
const noCartao = (x) => x.forma === CARTAO;
const diaNoMes = (m, d) => `${m}-${pad(Math.min(dim(m), Math.max(1, Number(d) || 1)))}`;
const mesesEntre = (a, b) => (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + Number(b.slice(5, 7)) - Number(a.slice(5, 7));
export function mesDaFatura(cartao, data) {
  const m = mKey(data), d = Number(data.slice(8, 10));
  const fecha = d < Math.min(Number(cartao.fechamento), dim(m)) ? m : addM(m, 1);
  return Number(cartao.vencimento) > Number(cartao.fechamento) ? fecha : addM(fecha, 1);
}
export function valorDasParcelas(valor, n) {
  n = Math.max(1, Math.floor(Number(n) || 1));
  const base = Math.floor((Number(valor) * 100) / n + 1e-6) / 100, out = Array(n).fill(base);
  out[0] = round2(Number(valor) - base * (n - 1));
  return out;
}
export function faturasDoMes(st, m) {
  const out = st.faturas.filter((f) => !f.cartao_id && mKey(f.vencimento) === m).map((f) => ({ ...f, valor: Number(f.valor), auto: false }));
  const cartoes = st.cartoes || [];
  if (cartoes.length) {
    const mapa = new Map(cartoes.map((c) => [c.id, c])), itens = new Map(cartoes.map((c) => [c.id, []]));
    for (const x of st.lancamentos) {
      if (x.tipo !== "Despesa" || x.forma !== CARTAO || !mapa.has(x.cartao_id)) continue;
      const n = Math.max(1, Number(x.parcelas) || 1), k = mesesEntre(mesDaFatura(mapa.get(x.cartao_id), x.data), m);
      if (k < 0 || k >= n) continue;
      itens.get(x.cartao_id).push({ origem: "compra", id: x.id, data: x.data, descricao: x.descricao || x.categoria, categoria: x.categoria,
        valor: valorDasParcelas(x.valor, n)[k], parcela: k + 1, de: n });
    }
    for (const mm of [addM(m, -2), addM(m, -1), m]) for (const o of ocorrencias(st.fixos, mm)) {
      if (o.forma !== CARTAO || !mapa.has(o.cartao_id) || mesDaFatura(mapa.get(o.cartao_id), o.data) !== m) continue;
      itens.get(o.cartao_id).push({ origem: "fixo", id: o.id, data: o.data, descricao: o.descricao, categoria: o.categoria, valor: Number(o.valor), parcela: 1, de: 1 });
    }
    for (const c of cartoes) {
      const l = itens.get(c.id).sort((a, b) => a.data.localeCompare(b.data));
      const calculado = round2(l.reduce((t, i) => t + i.valor, 0));
      const reg = st.faturas.find((f) => f.cartao_id === c.id && mKey(f.vencimento) === m), fixo = Boolean(reg?.valor_fixo);
      if (!l.length && !fixo) continue;
      out.push({ id: reg?.id ?? null, auto: true, cartao_id: c.id, cartao: c.nome, vencimento: diaNoMes(m, c.vencimento),
        valor: fixo ? Number(reg.valor) : calculado, calculado, valor_fixo: fixo, status: reg?.status || "Aberta", itens: l });
    }
  }
  return out.sort((a, b) => a.vencimento.localeCompare(b.vencimento) || String(a.cartao).localeCompare(String(b.cartao)));
}
export function faturasAte(st, ate) {
  const ms = st.faturas.map((f) => mKey(f.vencimento));
  st.lancamentos.forEach((x) => { if (x.forma === CARTAO && x.cartao_id) ms.push(mKey(x.data)); });
  st.fixos.forEach((f) => { if (f.forma === CARTAO && f.cartao_id) ms.push(mKey(f.desde)); });
  const out = [];
  if (!ms.length) return out;
  for (let m = ms.sort()[0], g = 0; m <= ate && g < 600; m = addM(m, 1), g++) out.push(...faturasDoMes(st, m));
  return out;
}
export function diasEntre(a, b) {
  const t = (iso) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
  return Math.round((t(b) - t(a)) / 86400000);
}
export function proximosVencimentos(st, hoje, janela = 30) {
  const out = [], cur = mKey(hoje);
  faturasAte(st, addM(cur, Math.max(1, Math.ceil(janela / 28)))).filter((f) => f.status !== "Paga").forEach((f) => {
    const dias = diasEntre(hoje, f.vencimento);
    if (dias <= janela) out.push({ tipo: "fatura", id: f.id, auto: f.auto, cartao_id: f.cartao_id || null, cartao: f.cartao, titulo: `Fatura ${f.cartao}`,
      valor: Number(f.valor), data: f.vencimento, dias, mes: mKey(f.vencimento) });
  });
  const pagos = new Set(st.pagos.map((p) => p.fixo_id + "|" + p.mes));
  [cur, addM(cur, 1)].forEach((m) => {
    ocorrencias(st.fixos, m).forEach((o) => {
      if (noCartao(o) || pagos.has(o.id + "|" + o.chave)) return;
      const dias = diasEntre(hoje, o.data);
      if (dias <= janela) out.push({ tipo: "fixo", id: o.id, titulo: o.descricao, valor: Number(o.valor), data: o.data, dias, mes: m, chave: o.chave, semanal: o.repete === "semanal" });
    });
  });
  return out.sort((a, b) => a.data.localeCompare(b.data) || a.titulo.localeCompare(b.titulo));
}
export function pendenciasParaAviso(st, hoje, { antes = 3, atrasoMax = 30 } = {}) {
  const itens = proximosVencimentos(st, hoje, antes).filter((x) => x.dias >= -atrasoMax);
  return { itens, atrasadas: itens.filter((x) => x.dias < 0).length, hoje: itens.filter((x) => x.dias === 0).length,
    total: round2(itens.reduce((t, x) => t + x.valor, 0)) };
}
