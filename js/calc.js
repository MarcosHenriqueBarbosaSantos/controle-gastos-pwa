// Regras de cálculo do app. Funções puras, sem acesso a tela ou banco,
// para poderem ser testadas isoladamente (ver tests/calc.test.mjs).

export const CATS = {
  Despesa: ["Mercado", "Alimentação", "Transporte", "Carro", "Moradia", "Contas da casa",
    "Parcelas e financiamentos", "Educação", "Saúde", "Beleza", "Lazer", "Terreiro", "Roupas", "Outros"],
  Receita: ["Salário", "Adiantamento", "Renda extra", "Outros"],
  Reserva: ["Reserva de emergência"],
};
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

/** Fixos que contam no mês m ("AAAA-MM"). desde/ate são datas "AAAA-MM-01". */
export function fixosDoMes(fixos, m) {
  return fixos.filter((f) => mKey(f.desde) <= m && (!f.ate || m <= mKey(f.ate)));
}

/**
 * Números de um mês.
 * @param {{lancamentos:any[], fixos:any[], pagos:any[], faturas:any[]}} st
 * @param {string} m   mês "AAAA-MM"
 * @param {string} hoje data de hoje "AAAA-MM-DD"
 */
export function calcMes(st, m, hoje) {
  const sum = (a) => round2(a.reduce((s, x) => s + Number(x.valor), 0));
  const it = st.lancamentos.filter((x) => mKey(x.data) === m);
  const rec = sum(it.filter((x) => x.tipo === "Receita"));
  const vari = sum(it.filter((x) => x.tipo === "Despesa"));
  const res = sum(it.filter((x) => x.tipo === "Reserva"));
  const fx = fixosDoMes(st.fixos, m);
  const fxT = sum(fx);
  const pagosSet = new Set(st.pagos.filter((p) => mKey(p.mes) === m).map((p) => p.fixo_id));
  const fxPend = sum(fx.filter((f) => !pagosSet.has(f.id)));
  const custo = round2(vari + fxT);
  const saldo = round2(rec - custo - res);
  const cur = mKey(hoje), n = dim(m);
  const fase = m < cur ? "passado" : m > cur ? "futuro" : "atual";
  const dias = fase === "atual" ? Number(hoje.slice(8, 10)) : fase === "passado" ? n : 0;
  // Projeção: mantém a média diária dos gastos do dia a dia até o fim do mês e soma os fixos.
  const proj = fase === "atual" && dias > 0 ? round2((vari / dias) * n + fxT) : custo;
  const ccAberto = sum(st.faturas.filter((c) => c.status !== "Paga"));
  const comprasCartao = sum(it.filter((x) => x.tipo === "Despesa" && x.forma === "Cartão de crédito"));
  return { it, rec, vari, res, fx, fxT, fxPend, pagosSet, custo, saldo, fase, dias, n, proj, ccAberto, comprasCartao };
}

/** Gastos por categoria no mês (dia a dia + fixos), do maior para o menor. */
export function catMap(c) {
  const m = {};
  c.it.filter((x) => x.tipo === "Despesa").forEach((x) => { m[x.categoria] = (m[x.categoria] || 0) + Number(x.valor); });
  c.fx.forEach((f) => { m[f.categoria] = (m[f.categoria] || 0) + Number(f.valor); });
  return Object.entries(m).map(([k, v]) => [k, round2(v)]).sort((a, b) => b[1] - a[1]);
}

/** Custo acumulado dia a dia: gastos no dia do lançamento, fixos no dia do vencimento. */
export function custoAcumulado(c) {
  const n = c.n, byDay = Array(n + 1).fill(0), det = Array.from({ length: n + 1 }, () => []);
  c.it.filter((x) => x.tipo === "Despesa").forEach((x) => {
    const d = Number(x.data.slice(8, 10));
    byDay[d] += Number(x.valor); det[d].push([x.descricao || x.categoria, Number(x.valor)]);
  });
  c.fx.forEach((f) => {
    const d = Math.min(n, Math.max(1, f.dia || 1));
    byDay[d] += Number(f.valor); det[d].push([`${f.descricao} (fixo)`, Number(f.valor)]);
  });
  const cum = [0];
  for (let d = 1; d <= n; d++) cum[d] = round2(cum[d - 1] + byDay[d]);
  return { cum, det };
}
