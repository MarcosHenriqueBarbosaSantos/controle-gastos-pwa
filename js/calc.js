// Regras de cálculo do app. Funções puras, sem acesso a tela ou banco,
// para poderem ser testadas isoladamente (ver tests/calc.test.mjs).

// Categorias iniciais. Cada pessoa pode mudar as suas em Ajustes.
export const CATS_PADRAO = {
  Despesa: ["Mercado", "Alimentação", "Transporte", "Moradia", "Contas da casa",
    "Parcelas e financiamentos", "Educação", "Saúde", "Beleza", "Lazer", "Roupas", "Outros"],
  Receita: ["Salário", "Adiantamento", "Renda extra", "Outros"],
  Reserva: ["Reserva de emergência", "Investimentos", "Outros"],   // onde o dinheiro guardado fica
};
// Dinheiro guardado usa o tipo "Reserva": a categoria diz onde ele fica e a forma diz o movimento.
// forma "" = guardou (sai do saldo); forma RETIRADA = retirou (volta para o saldo).
export const RETIRADA = "Retirada";
const sinalRes = (x) => (x.forma === RETIRADA ? -1 : 1);
export const FORMAS = ["Pix", "Débito", "Dinheiro", "Boleto", "Cartão de crédito"];
export const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho",
  "agosto", "setembro", "outubro", "novembro", "dezembro"];
export const MES3 = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export const pad = (n) => String(n).padStart(2, "0");
export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** "2026-03-15" → "2026-03" */
export const mKey = (iso) => iso.slice(0, 7);
/** Soma k meses a uma chave "AAAA-MM". */
export function addM(m, k) {
  let [y, mo] = m.split("-").map(Number);
  mo += k;
  while (mo > 12) { mo -= 12; y++; }
  while (mo < 1) { mo += 12; y--; }
  return `${y}-${pad(mo)}`;
}
/** Dias no mês "AAAA-MM". */
export const dim = (m) => { const [y, mo] = m.split("-").map(Number); return new Date(y, mo, 0).getDate(); };

/** Aceita "1.234,56", "1234,56", "1234.56", "1.200" e números. */
export function parseMoney(s) {
  if (typeof s === "number") return s;
  s = String(s ?? "").replace(/[R$\s]/g, "");
  if (!s) return NaN;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  return Number(s);
}
export const round2 = (v) => Math.round(v * 100) / 100;

/**
 * Fixos que contam no mês m ("AAAA-MM"). desde/ate são datas "AAAA-MM-01".
 * tipo "Despesa" = gastos fixos; tipo "Receita" = entradas fixas (ex.: salário todo dia 30).
 */
export function fixosDoMes(fixos, m, tipo = "Despesa") {
  return fixos.filter((f) => (f.tipo || "Despesa") === tipo && mKey(f.desde) <= m && (!f.ate || m <= mKey(f.ate)));
}

export const CARTAO = "Cartão de crédito";
export const CAT_FATURA = "Faturas de cartão";
const noCartao = (x) => x.forma === CARTAO;

/**
 * Números de um mês.
 *
 * Regra do cartão: o que é comprado no cartão (lançamento ou fixo com forma "Cartão de crédito")
 * NÃO entra no custo do mês da compra. A cobrança entra no mês em que a fatura vence.
 *
 * @param {{lancamentos:any[], fixos:any[], pagos:any[], faturas:any[]}} st
 * @param {string} m   mês "AAAA-MM"
 * @param {string} hoje data de hoje "AAAA-MM-DD"
 */
export function calcMes(st, m, hoje) {
  const sum = (a) => round2(a.reduce((s, x) => s + Number(x.valor), 0));
  const it = st.lancamentos.filter((x) => mKey(x.data) === m);
  const recLanc = sum(it.filter((x) => x.tipo === "Receita"));   // entradas lançadas à mão
  const fr = fixosDoMes(st.fixos, m, "Receita");                  // entradas fixas: entram sozinhas todo mês
  const frT = sum(fr);
  const rec = round2(recLanc + frT);
  const desp = it.filter((x) => x.tipo === "Despesa");
  const vari = sum(desp.filter((x) => !noCartao(x)));          // dia a dia pago fora do cartão
  const comprasCartao = sum(desp.filter(noCartao));            // vai para uma fatura futura
  // Guardado do mês = o que foi guardado menos o que foi retirado (pode ficar negativo).
  const resIn = sum(it.filter((x) => x.tipo === "Reserva" && x.forma !== RETIRADA));
  const resOut = sum(it.filter((x) => x.tipo === "Reserva" && x.forma === RETIRADA));
  const res = round2(resIn - resOut);
  const fx = fixosDoMes(st.fixos, m);
  const fxT = sum(fx);                                          // todos os fixos do mês
  const fxCartao = sum(fx.filter(noCartao));                    // fixos cobrados na fatura
  const fxCusto = round2(fxT - fxCartao);                       // fixos pagos fora do cartão
  const pagosSet = new Set(st.pagos.filter((p) => mKey(p.mes) === m).map((p) => p.fixo_id));
  const fxPend = sum(fx.filter((f) => !pagosSet.has(f.id)));
  const fat = st.faturas.filter((c) => mKey(c.vencimento) === m);   // faturas que vencem neste mês
  const fatT = sum(fat);
  const fatAberta = sum(fat.filter((c) => c.status !== "Paga"));
  const custo = round2(vari + fxCusto + fatT);
  const saldo = round2(rec - custo - res);
  const cur = mKey(hoje), n = dim(m);
  const fase = m < cur ? "passado" : m > cur ? "futuro" : "atual";
  const dias = fase === "atual" ? Number(hoje.slice(8, 10)) : fase === "passado" ? n : 0;
  const proj = fase === "atual" && dias > 0
    ? round2(projetaDiaADia(st, m, desp.filter((x) => !noCartao(x)), dias, n) + fxCusto + fatT) : custo;
  const ccAberto = sum(st.faturas.filter((c) => c.status !== "Paga"));   // todas as faturas em aberto
  // Entradas fixas que ainda não chegaram: no mês atual, as de dia posterior a hoje; em mês futuro, todas.
  const frAReceber = fase === "futuro" ? frT : fase === "atual" ? sum(fr.filter((f) => Math.min(n, f.dia || 1) > dias)) : 0;
  return { it, rec, recLanc, fr, frT, frAReceber, vari, comprasCartao, res, resIn, resOut, fx, fxT, fxCartao, fxCusto, fxPend, pagosSet,
    fat, fatT, fatAberta, custo, saldo, fase, dias, n, proj, ccAberto };
}

/**
 * Previsão dos gastos do dia a dia até o fim do mês.
 * - Com histórico (até 3 meses anteriores com gastos): mistura o ritmo atual com a média desses meses.
 *   No começo do mês pesa mais o histórico; no fim, pesa mais o ritmo atual.
 * - Sem histórico: mantém a média diária, mas não repete compras pontuais grandes
 *   (acima de 5 vezes o gasto típico), como a compra do mês no mercado.
 * Nunca fica abaixo do que já foi gasto.
 */
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
  const vals = gastos.map((x) => Number(x.valor)).sort((a, b) => a - b);
  const mediana = vals.length ? vals[Math.floor((vals.length - 1) / 2)] : 0;
  const rotina = vals.filter((v) => v <= 5 * mediana).reduce((t, v) => t + v, 0);
  return total + (rotina / dias) * (n - dias);
}

/** Para onde foi o custo do mês: dia a dia e fixos fora do cartão, mais as faturas. Do maior para o menor. */
export function catMap(c) {
  const m = {};
  c.it.filter((x) => x.tipo === "Despesa" && !noCartao(x)).forEach((x) => { m[x.categoria] = (m[x.categoria] || 0) + Number(x.valor); });
  c.fx.filter((f) => !noCartao(f)).forEach((f) => { m[f.categoria] = (m[f.categoria] || 0) + Number(f.valor); });
  if (c.fatT > 0) m[CAT_FATURA] = (m[CAT_FATURA] || 0) + c.fatT;
  return Object.entries(m).map(([k, v]) => [k, round2(v)]).sort((a, b) => b[1] - a[1]);
}

/** Compras feitas no cartão neste mês, por categoria (ainda não cobradas). */
export function comprasCartaoPorCategoria(c) {
  const m = {};
  c.it.filter((x) => x.tipo === "Despesa" && noCartao(x)).forEach((x) => { m[x.categoria] = (m[x.categoria] || 0) + Number(x.valor); });
  c.fx.filter(noCartao).forEach((f) => { m[f.categoria] = (m[f.categoria] || 0) + Number(f.valor); });
  return Object.entries(m).map(([k, v]) => [k, round2(v)]).sort((a, b) => b[1] - a[1]);
}

/** Custo acumulado dia a dia: gastos no dia do lançamento, fixos e faturas no dia do vencimento. */
export function custoAcumulado(c) {
  const n = c.n, byDay = Array(n + 1).fill(0), det = Array.from({ length: n + 1 }, () => []);
  const dia = (d) => Math.min(n, Math.max(1, d || 1));
  c.it.filter((x) => x.tipo === "Despesa" && !noCartao(x)).forEach((x) => {
    const d = Number(x.data.slice(8, 10));
    byDay[d] += Number(x.valor); det[d].push([x.descricao || x.categoria, Number(x.valor)]);
  });
  c.fx.filter((f) => !noCartao(f)).forEach((f) => {
    const d = dia(f.dia);
    byDay[d] += Number(f.valor); det[d].push([`${f.descricao} (fixo)`, Number(f.valor)]);
  });
  c.fat.forEach((f) => {
    const d = dia(Number(f.vencimento.slice(8, 10)));
    byDay[d] += Number(f.valor); det[d].push([`Fatura ${f.cartao}`, Number(f.valor)]);
  });
  const cum = [0];
  for (let d = 1; d <= n; d++) cum[d] = round2(cum[d - 1] + byDay[d]);
  return { cum, det };
}

/** Categorias de quem ainda não personalizou: as padrão mais as que a pessoa já usou. */
export function categoriasIniciais(st) {
  const out = { Despesa: [...CATS_PADRAO.Despesa], Receita: [...CATS_PADRAO.Receita], Reserva: [...CATS_PADRAO.Reserva] };
  const add = (tipo, c) => { if (c && out[tipo] && !out[tipo].includes(c)) out[tipo].push(c); };
  st.lancamentos.forEach((x) => add(x.tipo, x.categoria));
  st.fixos.forEach((f) => add(f.tipo === "Receita" ? "Receita" : "Despesa", f.categoria));
  return out;
}

/** Primeiro mês ("AAAA-MM") com algum lançamento ou gasto fixo; null se não há nada. */
export function primeiroMes(st) {
  const ms = [...st.lancamentos.map((x) => mKey(x.data)), ...st.fixos.map((f) => mKey(f.desde))];
  return ms.length ? ms.sort()[0] : null;
}

/**
 * Soma dos saldos dos meses anteriores a m, a partir de `desde` (ou do primeiro mês com dados).
 * É o valor que "sobrou" ou "faltou" e passa para o mês m.
 */
export function saldoAnterior(st, m, hoje, desde = null) {
  const first = primeiroMes(st);
  if (!first) return 0;
  let cur = desde && desde > first ? desde : first, total = 0, guard = 0;
  while (cur < m && guard++ < 600) { total += calcMes(st, cur, hoje).saldo; cur = addM(cur, 1); }
  return round2(total);
}

/** Total guardado até o fim do mês m, somando todos os destinos (guardado menos retirado). */
export function reservaAcumulada(st, m) {
  return round2(guardadoPorDestino(st, m).reduce((s, x) => s + x[1], 0));
}

/** Quanto há guardado em cada destino até o fim do mês m: [["Investimentos", 500], ...], do maior para o menor. */
export function guardadoPorDestino(st, m) {
  const tot = {};
  st.lancamentos.filter((x) => x.tipo === "Reserva" && mKey(x.data) <= m)
    .forEach((x) => { tot[x.categoria] = (tot[x.categoria] || 0) + sinalRes(x) * Number(x.valor); });
  return Object.entries(tot).map(([k, v]) => [k, round2(v)]).filter((x) => x[1] !== 0).sort((a, b) => b[1] - a[1]);
}

/** Diferença em dias entre duas datas "AAAA-MM-DD" (b − a). */
export function diasEntre(a, b) {
  const t = (iso) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
  return Math.round((t(b) - t(a)) / 86400000);
}

/**
 * Contas a vencer: faturas em aberto e gastos fixos ainda não pagos, do mês atual e do próximo,
 * que vencem em até `janela` dias (as atrasadas também entram). Ordenadas pela data.
 * @returns {{tipo:"fatura"|"fixo", id:string, titulo:string, valor:number, data:string, dias:number, mes:string}[]}
 */
export function proximosVencimentos(st, hoje, janela = 30) {
  const out = [], cur = mKey(hoje);
  st.faturas.filter((f) => f.status !== "Paga").forEach((f) => {
    const dias = diasEntre(hoje, f.vencimento);
    if (dias <= janela) out.push({ tipo: "fatura", id: f.id, titulo: `Fatura ${f.cartao}`, valor: Number(f.valor), data: f.vencimento, dias, mes: mKey(f.vencimento) });
  });
  const pagos = new Set(st.pagos.map((p) => p.fixo_id + "|" + mKey(p.mes)));
  [cur, addM(cur, 1)].forEach((m) => {
    fixosDoMes(st.fixos, m).forEach((f) => {
      if (pagos.has(f.id + "|" + m)) return;
      const data = `${m}-${pad(Math.min(dim(m), Math.max(1, f.dia || 1)))}`, dias = diasEntre(hoje, data);
      if (dias <= janela) out.push({ tipo: "fixo", id: f.id, titulo: f.descricao, valor: Number(f.valor), data, dias, mes: m });
    });
  });
  return out.sort((a, b) => a.data.localeCompare(b.data) || a.titulo.localeCompare(b.titulo));
}
