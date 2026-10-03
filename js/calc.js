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

export const DIAS_SEMANA = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
export const DIAS3 = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
/** Dia da semana (0 = domingo) de uma data "AAAA-MM-DD". */
export const diaDaSemana = (iso) => new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))).getDay();

/**
 * Ocorrências dos fixos no mês m: cada vez que um fixo acontece.
 * - Mensal: uma vez, no dia do vencimento. A chave de "pago" é o dia 1 do mês.
 * - Semanal (repete = "semanal"): uma vez em cada dia da semana escolhido, a partir da data de início.
 *   A chave de "pago" é a própria data.
 * Cada ocorrência traz os campos do fixo mais `data` e `chave`.
 */
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
export const CAT_FATURA = "Faturas de cartão";
const noCartao = (x) => x.forma === CARTAO;

/* ===================== Cartões e faturas ===================== */
const diaNoMes = (m, d) => `${m}-${pad(Math.min(dim(m), Math.max(1, Number(d) || 1)))}`;
/** Quantos meses de a até b ("AAAA-MM"). */
const mesesEntre = (a, b) => (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + Number(b.slice(5, 7)) - Number(a.slice(5, 7));

/**
 * Mês ("AAAA-MM") em que vence a fatura de uma compra feita em `data`.
 * A fatura fecha no dia `fechamento`: compras antes desse dia entram na fatura que fecha no mês;
 * compras do dia do fechamento em diante vão para a seguinte. O vencimento é o próximo dia
 * `vencimento` depois do fechamento (no mesmo mês, ou no mês seguinte se o dia for menor).
 */
export function mesDaFatura(cartao, data) {
  const m = mKey(data), d = Number(data.slice(8, 10));
  const fecha = d < Math.min(Number(cartao.fechamento), dim(m)) ? m : addM(m, 1);
  return Number(cartao.vencimento) > Number(cartao.fechamento) ? fecha : addM(fecha, 1);
}

/** Período de compras de uma fatura que vence no mês m: do fechamento anterior até a véspera do fechamento. */
export function periodoDaFatura(cartao, m) {
  const fim = Number(cartao.vencimento) > Number(cartao.fechamento) ? m : addM(m, -1), ini = addM(fim, -1);
  const d = (mm) => Math.min(Number(cartao.fechamento), dim(mm));
  return { de: `${ini}-${pad(d(ini))}`, ate: toISO(new Date(Number(fim.slice(0, 4)), Number(fim.slice(5)) - 1, d(fim) - 1)), fecha: `${fim}-${pad(d(fim))}` };
}

/** Valor de cada parcela. Os centavos que sobram da divisão ficam na primeira. */
export function valorDasParcelas(valor, n) {
  n = Math.max(1, Math.floor(Number(n) || 1));
  const base = Math.floor((Number(valor) * 100) / n + 1e-6) / 100, out = Array(n).fill(base);
  out[0] = round2(Number(valor) - base * (n - 1));
  return out;
}

/**
 * Faturas que vencem no mês m.
 * - Lançadas à mão (sem cartão cadastrado): valem pelo valor digitado.
 * - Calculadas: uma por cartão cadastrado, somando as parcelas das compras e os gastos fixos
 *   daquele cartão que caem nessa fatura. Se existe um registro em st.faturas para o cartão e o mês,
 *   ele guarda a situação (Paga/Aberta) e, quando valor_fixo é verdadeiro, o valor corrigido à mão.
 * Cada fatura calculada traz `itens` (o que compõe o valor) e `calculado` (a soma dos itens).
 */
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
    // Um gasto fixo no cartão conta como uma compra em cada data em que acontece.
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

/** Todas as faturas (à mão e calculadas) do primeiro mês com movimento de cartão até o mês `ate`. */
export function faturasAte(st, ate) {
  const ms = st.faturas.map((f) => mKey(f.vencimento));
  st.lancamentos.forEach((x) => { if (x.forma === CARTAO && x.cartao_id) ms.push(mKey(x.data)); });
  st.fixos.forEach((f) => { if (f.forma === CARTAO && f.cartao_id) ms.push(mKey(f.desde)); });
  const out = [];
  if (!ms.length) return out;
  for (let m = ms.sort()[0], g = 0; m <= ate && g < 600; m = addM(m, 1), g++) out.push(...faturasDoMes(st, m));
  return out;
}

/**
 * Compras e fixos no cartão, feitos no mês m, que não estão ligados a nenhum cartão cadastrado.
 * Esses valores não entram em fatura calculada: só contam se a pessoa lançar a fatura à mão.
 */
export function semCartaoNoMes(st, m) {
  const ids = new Set((st.cartoes || []).map((c) => c.id)), solto = (x) => x.forma === CARTAO && !ids.has(x.cartao_id);
  const a = st.lancamentos.filter((x) => x.tipo === "Despesa" && mKey(x.data) === m && solto(x));
  const b = ocorrencias(st.fixos, m).filter(solto);
  return round2([...a, ...b].reduce((t, x) => t + Number(x.valor), 0));
}

/**
 * Mudar um fixo "a partir do mês m" sem mexer no passado: o fixo antigo é encerrado no mês anterior
 * e nasce um novo, com os dados alterados, começando em m. Devolve o que gravar em cada um.
 */
export function novaVersaoDeFixo(f, patch, m) {
  const campos = ["tipo", "descricao", "categoria", "dia", "valor", "forma", "ate", "repete", "dia_semana", "cartao_id"];
  const novo = {};
  campos.forEach((k) => { if (f[k] !== undefined) novo[k] = f[k]; });
  return { encerra: { ate: addM(m, -1) + "-01" }, novo: { ...novo, tipo: f.tipo || "Despesa", ...patch, desde: m + "-01" } };
}

/**
 * Números de um mês.
 *
 * Regra do cartão: o que é comprado no cartão (lançamento ou fixo com forma "Cartão de crédito")
 * NÃO entra no custo do mês da compra. A cobrança entra no mês em que a fatura vence.
 *
 * @param {{lancamentos:any[], fixos:any[], pagos:any[], faturas:any[], cartoes?:any[]}} st
 * @param {string} m   mês "AAAA-MM"
 * @param {string} hoje data de hoje "AAAA-MM-DD"
 */
export function calcMes(st, m, hoje) {
  const sum = (a) => round2(a.reduce((s, x) => s + Number(x.valor), 0));
  const it = st.lancamentos.filter((x) => mKey(x.data) === m);
  const recLanc = sum(it.filter((x) => x.tipo === "Receita"));   // entradas lançadas à mão
  const fr = ocorrencias(st.fixos, m, "Receita");                 // entradas fixas: entram sozinhas, por mês ou por semana
  const frT = sum(fr);
  const rec = round2(recLanc + frT);
  const desp = it.filter((x) => x.tipo === "Despesa");
  const vari = sum(desp.filter((x) => !noCartao(x)));          // dia a dia pago fora do cartão
  const comprasCartao = sum(desp.filter(noCartao));            // vai para uma fatura futura
  // Guardado do mês = o que foi guardado menos o que foi retirado (pode ficar negativo).
  const resIn = sum(it.filter((x) => x.tipo === "Reserva" && x.forma !== RETIRADA));
  const resOut = sum(it.filter((x) => x.tipo === "Reserva" && x.forma === RETIRADA));
  const res = round2(resIn - resOut);
  const fx = ocorrencias(st.fixos, m);                          // cada vez que um gasto fixo acontece no mês
  const fxT = sum(fx);                                          // todos os fixos do mês
  const fxCartao = sum(fx.filter(noCartao));                    // fixos cobrados na fatura
  const fxCusto = round2(fxT - fxCartao);                       // fixos pagos fora do cartão
  const pagosSet = new Set(st.pagos.map((p) => p.fixo_id + "|" + p.mes));   // "id|chave" de cada ocorrência paga
  // A pagar: só os fixos fora do cartão. Os que vão no cartão são pagos junto com a fatura.
  const fxPend = sum(fx.filter((o) => !noCartao(o) && !pagosSet.has(o.id + "|" + o.chave)));
  const fat = faturasDoMes(st, m);                               // faturas que vencem neste mês (à mão e calculadas)
  const fatT = sum(fat);
  const fatAberta = sum(fat.filter((c) => c.status !== "Paga"));
  const custo = round2(vari + fxCusto + fatT);
  const saldo = round2(rec - custo - res);
  const cur = mKey(hoje), n = dim(m);
  const fase = m < cur ? "passado" : m > cur ? "futuro" : "atual";
  const dias = fase === "atual" ? Number(hoje.slice(8, 10)) : fase === "passado" ? n : 0;
  const proj = fase === "atual" && dias > 0
    ? round2(projetaDiaADia(st, m, desp.filter((x) => !noCartao(x)), dias, n) + fxCusto + fatT) : custo;
  // Entradas fixas que ainda não chegaram: no mês atual, as de dia posterior a hoje; em mês futuro, todas.
  const frAReceber = fase === "futuro" ? frT : fase === "atual" ? sum(fr.filter((o) => Number(o.data.slice(8, 10)) > dias)) : 0;
  return { it, rec, recLanc, fr, frT, frAReceber, vari, comprasCartao, res, resIn, resOut, fx, fxT, fxCartao, fxCusto, fxPend, pagosSet,
    fat, fatT, fatAberta, custo, saldo, fase, dias, n, proj };
}

/**
 * Previsão dos gastos do dia a dia até o fim do mês.
 * - Com histórico (até 3 meses anteriores com gastos): mistura o ritmo atual com a média desses meses.
 *   No começo do mês pesa mais o histórico; no fim, pesa mais o ritmo atual.
 * - Sem histórico: mantém a média diária, mas não repete compras pontuais grandes
 *   (acima de 5 vezes o gasto típico), como a compra do mês no mercado. Nos primeiros dias,
 *   ou com poucos lançamentos, não projeta nada além do que já foi gasto.
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
  // Com poucos dados (menos de 5 dias ou de 5 gastos) não dá para falar em ritmo: não extrapola.
  if (dias < 5 || gastos.length < 5) return total;
  const vals = gastos.map((x) => Number(x.valor)).sort((a, b) => a - b);
  const mediana = vals.length ? vals[Math.floor((vals.length - 1) / 2)] : 0;
  const rotina = vals.filter((v) => v <= 5 * mediana).reduce((t, v) => t + v, 0);
  return total + (rotina / dias) * (n - dias);
}

/**
 * Tudo o que compõe o custo do mês, item por item, cada um com a sua categoria.
 * - Gastos do dia a dia e fixos pagos fora do cartão.
 * - Fatura calculada: o app sabe o que tem dentro, então cada compra entra na sua categoria; se o valor foi
 *   corrigido para mais, a diferença fica em "Faturas de cartão".
 * - Fatura lançada à mão (ou corrigida para menos que a soma): entra inteira em "Faturas de cartão".
 * origem: "gasto" | "fixo" | "cartao" (compra dentro de uma fatura) | "fatura".
 */
export function itensDoCusto(c) {
  const out = [];
  c.it.filter((x) => x.tipo === "Despesa" && !noCartao(x)).forEach((x) =>
    out.push({ origem: "gasto", data: x.data, descricao: x.descricao || x.categoria, categoria: x.categoria, valor: Number(x.valor), forma: x.forma || "" }));
  c.fx.filter((f) => !noCartao(f)).forEach((f) =>
    out.push({ origem: "fixo", data: f.data, descricao: f.descricao, categoria: f.categoria, valor: Number(f.valor), forma: f.forma || "" }));
  c.fat.forEach((f) => {
    const dif = f.auto ? round2(f.valor - f.calculado) : 0;
    if (!f.auto || dif < 0) return out.push({ origem: "fatura", data: f.vencimento, descricao: `Fatura ${f.cartao}`, categoria: CAT_FATURA, valor: Number(f.valor), cartao: f.cartao });
    f.itens.forEach((i) => out.push({ origem: "cartao", data: i.data, descricao: i.descricao, categoria: i.categoria, valor: i.valor, cartao: f.cartao, parcela: i.parcela, de: i.de }));
    if (dif > 0) out.push({ origem: "fatura", data: f.vencimento, descricao: `Fatura ${f.cartao}: diferença do valor corrigido`, categoria: CAT_FATURA, valor: dif, cartao: f.cartao });
  });
  return out;
}

/** Para onde foi o custo do mês, por categoria, do maior para o menor. */
export function catMap(c) {
  const m = {};
  itensDoCusto(c).forEach((i) => { m[i.categoria] = (m[i.categoria] || 0) + i.valor; });
  return Object.entries(m).map(([k, v]) => [k, round2(v)]).filter((x) => x[1] > 0).sort((a, b) => b[1] - a[1]);
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
    const d = Number(f.data.slice(8, 10));
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

/**
 * Saldo acumulado até o fim do mês m: o que a pessoa já tinha quando começou (`inicial`),
 * mais o saldo dos meses anteriores, mais o saldo do próprio mês.
 * O saldo inicial só vale do mês de início em diante.
 */
export function saldoAcumulado(st, m, hoje, { desde = null, inicial = 0 } = {}) {
  const first = primeiroMes(st), inicio = desde && (!first || desde > first) ? desde : first;
  const base = !inicio || m >= inicio ? Number(inicial) || 0 : 0;
  return round2(base + saldoAnterior(st, m, hoje, desde) + calcMes(st, m, hoje).saldo);
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
 * @returns {{tipo:"fatura"|"fixo", id:string, titulo:string, valor:number, data:string, dias:number, mes:string, chave?:string}[]}
 */
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
      if (noCartao(o) || pagos.has(o.id + "|" + o.chave)) return;   // fixo no cartão é pago junto com a fatura
      const dias = diasEntre(hoje, o.data);
      if (dias <= janela) out.push({ tipo: "fixo", id: o.id, titulo: o.descricao, valor: Number(o.valor), data: o.data, dias, mes: m, chave: o.chave, semanal: o.repete === "semanal" });
    });
  });
  return out.sort((a, b) => a.data.localeCompare(b.data) || a.titulo.localeCompare(b.titulo));
}

/**
 * O que entra no aviso diário (e-mail e notificação): contas atrasadas ou que vencem em até `antes` dias.
 * Contas atrasadas há mais de `atrasoMax` dias deixam de ser lembradas, para o aviso não virar ruído.
 */
export function pendenciasParaAviso(st, hoje, { antes = 3, atrasoMax = 30 } = {}) {
  const itens = proximosVencimentos(st, hoje, antes).filter((x) => x.dias >= -atrasoMax);
  return { itens, atrasadas: itens.filter((x) => x.dias < 0).length, hoje: itens.filter((x) => x.dias === 0).length,
    total: round2(itens.reduce((t, x) => t + x.valor, 0)) };
}

/**
 * O que pede atenção hoje, para aparecer no topo do app.
 * - contas: as atrasadas e as que vencem em até `urgencia` dias (da mais atrasada para a mais distante).
 * - saldo: alerta se o mês atual já está no vermelho, ou se a previsão é fechar no vermelho.
 * @returns {{contas: ReturnType<typeof proximosVencimentos>, atrasadas:number, totalContas:number,
 *            saldo: null | {nivel:"bad"|"warn", tipo:"vermelho"|"previsao", valor:number}}}
 */
export function avisosDeHoje(st, hoje, urgencia = 3) {
  const contas = proximosVencimentos(st, hoje, urgencia);
  const c = calcMes(st, mKey(hoje), hoje);
  const previsto = round2(c.rec - c.proj - c.res);
  let saldo = null;
  if (c.it.length || c.fx.length || c.fr.length || c.fat.length) {
    if (c.saldo < 0) saldo = { nivel: "bad", tipo: "vermelho", valor: -c.saldo };
    else if (previsto < 0) saldo = { nivel: "warn", tipo: "previsao", valor: -previsto };
  }
  return { contas, atrasadas: contas.filter((x) => x.dias < 0).length, totalContas: round2(contas.reduce((t, x) => t + x.valor, 0)), saldo };
}
