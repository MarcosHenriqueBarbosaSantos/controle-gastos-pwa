// GERADO a partir de js/calc.js por gera-regras.mjs. Não edite: mude o calc.js e gere de novo.
export const RETIRADA = "Retirada";
const sinalRes = (x) => (x.forma === RETIRADA ? -1 : 1);
export const pad = (n) => String(n).padStart(2, "0");
export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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
export function calcMes(st, m, hoje) {
  const sum = (a) => round2(a.reduce((s, x) => s + Number(x.valor), 0));
  const it = st.lancamentos.filter((x) => mKey(x.data) === m);
  const recLanc = sum(it.filter((x) => x.tipo === "Receita"));
  const fr = ocorrencias(st.fixos, m, "Receita");
  const frT = sum(fr);
  const rec = round2(recLanc + frT);
  const desp = it.filter((x) => x.tipo === "Despesa");
  const vari = sum(desp.filter((x) => !noCartao(x)));
  const comprasCartao = sum(desp.filter(noCartao));
  const resIn = sum(it.filter((x) => x.tipo === "Reserva" && x.forma !== RETIRADA));
  const resOut = sum(it.filter((x) => x.tipo === "Reserva" && x.forma === RETIRADA));
  const res = round2(resIn - resOut);
  const fx = ocorrencias(st.fixos, m);
  const fxT = sum(fx);
  const fxCartao = sum(fx.filter(noCartao));
  const fxCusto = round2(fxT - fxCartao);
  const pagosSet = new Set(st.pagos.map((p) => p.fixo_id + "|" + p.mes));
  const fxPend = sum(fx.filter((o) => !noCartao(o) && !pagosSet.has(o.id + "|" + o.chave)));
  const fat = faturasDoMes(st, m);
  const fatT = sum(fat);
  const fatAberta = sum(fat.filter((c) => c.status !== "Paga"));
  const custo = round2(vari + fxCusto + fatT);
  const saldo = round2(rec - custo - res);
  const cur = mKey(hoje), n = dim(m);
  const fase = m < cur ? "passado" : m > cur ? "futuro" : "atual";
  const dias = fase === "atual" ? Number(hoje.slice(8, 10)) : fase === "passado" ? n : 0;
  const proj = fase === "atual" && dias > 0
    ? round2(projetaDiaADia(st, m, desp.filter((x) => !noCartao(x)), dias, n) + fxCusto + fatT) : custo;
  const frAReceber = fase === "futuro" ? frT : fase === "atual" ? sum(fr.filter((o) => Number(o.data.slice(8, 10)) > dias)) : 0;
  return { it, rec, recLanc, fr, frT, frAReceber, vari, comprasCartao, res, resIn, resOut, fx, fxT, fxCartao, fxCusto, fxPend, pagosSet,
    fat, fatT, fatAberta, custo, saldo, fase, dias, n, proj };
}
export function sequenciaDeDias(st, hoje, semGasto = []) {
  const dias = new Set([...st.lancamentos.map((x) => x.data), ...semGasto]), feitoHoje = dias.has(hoje);
  const d = new Date(hoje + "T12:00:00"); if (!feitoHoje) d.setDate(d.getDate() - 1);
  let n = 0; while (n < 3650 && dias.has(toISO(d))) { n++; d.setDate(d.getDate() - 1); }
  return { dias: n, feitoHoje };
}
export function usoDoTeto(c, teto) {
  const t = round2(Number(teto) || 0);
  if (!(t > 0)) return null;
  const nivel = c.custo > t * 1.2 ? 120 : c.custo > t ? 100 : c.custo >= t * 0.8 ? 80 : 0, projecao = c.fase === "atual" ? c.proj : c.custo;
  return { teto: t, gasto: c.custo, pct: Math.round((c.custo / t) * 100), resta: round2(t - c.custo), nivel, projecao, vaiPassar: c.custo <= t && projecao > t };
}
export function projetaDiaADia(st, m, gastos, dias, n) {
  const total = gastos.reduce((t, x) => t + Number(x.valor), 0);
  const porMes = {};
  st.lancamentos.filter((x) => x.tipo === "Despesa" && !noCartao(x) && mKey(x.data) < m)
    .forEach((x) => { const k = mKey(x.data); porMes[k] = (porMes[k] || 0) + Number(x.valor); });
  const ult = Object.keys(porMes).sort().slice(-3);
  if (ult.length) {
    const hist = ult.reduce((t, k) => t + porMes[k], 0) / ult.length, w = dias / n;
    return Math.max(total, w * (total / dias) * n + (1 - w) * hist);
  }
  if (dias < 5 || gastos.length < 5) return total;
  const vals = gastos.map((x) => Number(x.valor)).sort((a, b) => a - b);
  const mediana = vals.length ? vals[Math.floor((vals.length - 1) / 2)] : 0;
  const rotina = vals.filter((v) => v <= 5 * mediana).reduce((t, v) => t + v, 0);
  return total + (rotina / dias) * (n - dias);
}
function guardadoPorMes(st, destino) {
  const out = {};
  st.lancamentos.filter((x) => x.tipo === "Reserva" && x.categoria === destino)
    .forEach((x) => { const k = mKey(x.data); out[k] = round2((out[k] || 0) + sinalRes(x) * Number(x.valor)); });
  return out;
}
export function andamentoDaMeta(st, destino, meta, hoje) {
  const alvo = round2(Number(meta?.valor) || 0);
  if (!(alvo > 0)) return null;
  const cur = mKey(hoje), mapa = guardadoPorMes(st, destino), meses = Object.keys(mapa).sort();
  const guardado = round2(meses.filter((k) => k <= cur).reduce((t, k) => t + mapa[k], 0));
  const falta = round2(Math.max(0, alvo - guardado)), concluida = falta === 0;
  const pct = Math.max(0, Math.min(100, Math.floor((guardado / alvo) * 100)));
  const marco = [100, 75, 50, 25].find((x) => pct >= x) || 0, noMes = mapa[cur] || 0;
  const janela = [1, 2, 3].map((k) => addM(cur, -k)).filter((m) => meses.length && m >= meses[0]);
  const ritmo = round2(Math.max(0, janela.length ? janela.reduce((t, m) => t + (mapa[m] || 0), 0) / janela.length : noMes));
  const plano = round2(Math.max(0, Number(meta?.plano?.valor) || 0)), diaDoPlano = Math.min(31, Math.max(1, Math.round(Number(meta?.plano?.dia)) || 1));
  const pulou = plano > 0 && (meta?.pulos || []).includes(cur), passo = plano > 0 ? plano : ritmo;
  let previsao = null;
  if (!concluida && passo > 0) {
    const depois = round2(falta - (pulou ? 0 : Math.max(0, passo - Math.max(0, noMes))));
    const n = depois <= 0 ? 0 : Math.ceil(depois / passo);
    previsao = n <= 600 ? addM(cur, n) : null;
  }
  const ate = /^\d{4}-\d{2}$/.test(meta?.ate || "") ? meta.ate : "";
  let porMes = null, prazoPassou = false, noPrazo = null;
  if (ate && !concluida) {
    if (ate < cur) prazoPassou = true;
    else {
      const faltavaNoComeco = Math.max(0, alvo - (guardado - noMes));
      porMes = Math.ceil((faltavaNoComeco / (mesesEntre(cur, ate) + 1)) * 100) / 100;
      noPrazo = previsao !== null && previsao <= ate;
    }
  }
  const ref = concluida ? null : plano > 0 ? plano : porMes ?? (ritmo > 0 ? ritmo : null);
  const esteMes = ref === null ? null : round2(Math.min(falta, Math.max(0, ref - Math.max(0, noMes))));
  return { destino, alvo, guardado, falta, pct, marco, concluida, noMes, ritmo, mesesDeBase: janela.length, plano, diaDoPlano, pulou, previsao, ate, porMes, prazoPassou, noPrazo, ref, esteMes };
}
export function metasEmAndamento(st, metas, hoje) {
  return Object.entries(metas || {}).map(([destino, m]) => andamentoDaMeta(st, destino, m, hoje)).filter(Boolean)
    .sort((a, b) => Number(a.concluida) - Number(b.concluida) || (a.ate || "9999-99").localeCompare(b.ate || "9999-99") || b.pct - a.pct || a.destino.localeCompare(b.destino));
}
export function sugestaoDaMeta(a, c) {
  if (!a || c.fase !== "atual") return null;
  if (a.concluida) return { tipo: "feita" };
  if (a.ref !== null && a.esteMes <= 0) return { tipo: "feito", guardado: a.noMes };
  if (a.pulou) return { tipo: "pulou" };
  const sobra = Math.floor(round2(c.rec - c.proj - c.res));
  if (sobra < 10) return { tipo: "apertado" };
  if (a.ref === null) return { tipo: "livre", sobra };
  const completo = sobra >= a.esteMes;
  return { tipo: "guardar", valor: completo ? a.esteMes : sobra, sobra, completo };
}
export function lembreteDaMeta(st, metas, hoje) {
  const c = calcMes(st, mKey(hoje), hoje), dia = Number(hoje.slice(8, 10));
  const d = new Date(Date.UTC(Number(hoje.slice(0, 4)), Number(hoje.slice(5, 7)) - 1, dia - 1)), ontem = d.toISOString().slice(0, 10);
  const entrou = c.fr.some((o) => o.data === hoje) || st.lancamentos.some((x) => x.tipo === "Receita" && x.data === ontem);
  const quando = entrou ? "entrou" : dia === c.n - 2 ? "sobra" : null;
  if (!quando) return null;
  for (const a of metasEmAndamento(st, metas, hoje)) {
    const s = sugestaoDaMeta(a, c);
    if (s?.tipo === "guardar") return { quando, meta: a, valor: s.valor, sobra: s.sobra, completo: s.completo };
  }
  return null;
}
export function parabensDaMeta(st, metas, hoje) {
  const d = new Date(Date.UTC(Number(hoje.slice(0, 4)), Number(hoje.slice(5, 7)) - 1, Number(hoje.slice(8, 10)) - 1)), ontem = d.toISOString().slice(0, 10);
  const marcoDe = (v, alvo) => [100, 75, 50, 25].find((x) => Math.floor((v / alvo) * 100) >= x) || 0;
  const out = [];
  for (const [destino, meta] of Object.entries(metas || {})) {
    const alvo = round2(Number(meta?.valor) || 0);
    if (!(alvo > 0)) continue;
    const l = st.lancamentos.filter((x) => x.tipo === "Reserva" && x.categoria === destino && x.data <= ontem);
    const valor = round2(l.filter((x) => x.data === ontem && x.forma !== RETIRADA).reduce((t, x) => t + Number(x.valor), 0));
    if (!(valor > 0)) continue;
    const guardado = round2(l.reduce((t, x) => t + sinalRes(x) * Number(x.valor), 0));
    const antes = round2(guardado - l.filter((x) => x.data === ontem).reduce((t, x) => t + sinalRes(x) * Number(x.valor), 0));
    if (guardado <= antes) continue;
    const depois = marcoDe(guardado, alvo), falta = round2(Math.max(0, alvo - guardado));
    out.push({ destino, valor, guardado, alvo, falta, pct: Math.max(0, Math.min(100, Math.floor((guardado / alvo) * 100))), marco: depois > marcoDe(antes, alvo) ? depois : 0, concluida: falta === 0 });
  }
  return out.sort((a, b) => b.marco - a.marco || b.valor - a.valor || a.destino.localeCompare(b.destino))[0] || null;
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
const maisDias = (iso, n) => { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return toISO(d); };
export function resumoDaSemana(st, hoje, semGasto = []) {
  const de = maisDias(hoje, -6), soma = (l) => round2(l.reduce((t, x) => t + Number(x.valor), 0));
  const gastos = (a, b) => st.lancamentos.filter((x) => x.tipo === "Despesa" && x.data >= a && x.data <= b);
  const l = gastos(de, hoje), total = soma(l), antes = soma(gastos(maisDias(hoje, -13), maisDias(hoje, -7)));
  const porCat = new Map(); l.forEach((x) => porCat.set(x.categoria || "Outros", (porCat.get(x.categoria || "Outros") || 0) + Number(x.valor)));
  const cats = [...porCat].map(([cat, valor]) => ({ cat, valor: round2(valor) })).sort((a, b) => b.valor - a.valor || a.cat.localeCompare(b.cat));
  const m = [...l].sort((a, b) => Number(b.valor) - Number(a.valor) || b.data.localeCompare(a.data))[0];
  const comAlgo = new Set([...st.lancamentos.map((x) => x.data), ...semGasto]);
  const dias = Array.from({ length: 7 }, (_, i) => { const iso = maisDias(de, i); return { iso, total: soma(l.filter((x) => x.data === iso)) }; });
  const itens = proximosVencimentos(st, hoje, 7).filter((x) => x.dias >= -30);
  const c = calcMes(st, mKey(hoje), hoje);
  return { de, ate: hoje, total, n: l.length, antes, dif: antes > 0 ? round2(total - antes) : null, cats: cats.slice(0, 3), outras: soma(cats.slice(3)),
    maior: m ? { descricao: m.descricao || m.categoria, categoria: m.categoria, valor: Number(m.valor), data: m.data } : null,
    dias, anotados: dias.filter((d) => comAlgo.has(d.iso)).length,
    proximas: { itens, total: soma(itens), atrasadas: itens.filter((x) => x.dias < 0).length },
    mes: { custo: c.custo, rec: c.rec, previsto: round2(c.rec - c.proj - c.res) } };
}
export function lembreteDoDia(st, hoje, { semGasto = [], anotouHoje = false, desde = "" } = {}) {
  if (anotouHoje || semGasto.includes(hoje) || st.lancamentos.some((x) => x.data === hoje)) return null;
  const ultima = [...st.lancamentos.map((x) => x.data), ...semGasto, desde].filter((d) => d && d <= hoje).sort().pop();
  if (!ultima) return null;
  const parado = diasEntre(ultima, hoje);
  if (parado > 7) return null;
  return { seq: sequenciaDeDias(st, hoje, semGasto).dias, parado };
}
export const COMUM_DO_CASAL = ["categorias", "limites", "teto", "metas", "levarSaldo", "saldoDesde", "saldoInicial", "semGasto"];
export function comumDoCasal(prefs) {
  const out = {};
  for (const k of COMUM_DO_CASAL) if (prefs && prefs[k] !== undefined && prefs[k] !== null) out[k] = prefs[k];
  return out;
}
