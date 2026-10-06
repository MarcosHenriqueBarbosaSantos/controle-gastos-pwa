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

/* ===================== Entender o mês ===================== */
/**
 * Para onde vai o dinheiro do mês: as partes do que sai, o que foi guardado e o que sobra (ou falta).
 * As partes somadas com a sobra dão o que entra; a sobra é o saldo do mês.
 * Quando a pessoa retirou mais do que guardou, a diferença conta como dinheiro que entrou.
 * @returns {{partes:{k:string,nome:string,valor:number,pct:number}[], entra:number, saidas:number, sobra:number, sobraPct:number, limitePct:number|null}}
 *   pct é a largura de cada parte em uma régua de 0 a 100; limitePct marca onde acaba o que entra, quando as saídas passam disso.
 */
export function raioX(c) {
  const partes = [{ k: "fixos", nome: "Contas fixas", valor: c.fxCusto }, { k: "dia", nome: "Dia a dia", valor: c.vari },
    { k: "faturas", nome: "Faturas", valor: c.fatT }, { k: "guardado", nome: "Guardado", valor: Math.max(0, c.res) }].filter((p) => p.valor > 0);
  const saidas = round2(partes.reduce((t, p) => t + p.valor, 0)), entra = round2(c.rec + Math.max(0, -c.res));
  const sobra = round2(entra - saidas), base = Math.max(entra, saidas, 0.01);
  return { partes: partes.map((p) => ({ ...p, pct: (p.valor / base) * 100 })), entra, saidas, sobra,
    sobraPct: sobra > 0 ? (sobra / base) * 100 : 0, limitePct: sobra < 0 && entra > 0 ? (entra / base) * 100 : null };
}

/**
 * Quanto dá para gastar por dia, de hoje até o fim do mês, sem o mês fechar no vermelho.
 * Parte do saldo do mês, que já desconta o que foi gasto, todas as contas fixas e as faturas. Só existe no mês atual.
 */
export function livrePorDia(c) {
  if (c.fase !== "atual") return null;
  const restam = c.n - c.dias + 1;   // contando hoje
  return { restam, valor: c.saldo > 0 ? round2(c.saldo / restam) : 0 };
}

/**
 * Dias seguidos com anotação, terminando hoje (ou ontem, se hoje ainda não tem nada).
 * Conta o dia que tem algum lançamento ou que a pessoa marcou como "não gastei nada".
 */
export function sequenciaDeDias(st, hoje, semGasto = []) {
  const dias = new Set([...st.lancamentos.map((x) => x.data), ...semGasto]), feitoHoje = dias.has(hoje);
  const d = new Date(hoje + "T12:00:00"); if (!feitoHoje) d.setDate(d.getDate() - 1);
  let n = 0; while (n < 3650 && dias.has(toISO(d))) { n++; d.setDate(d.getDate() - 1); }
  return { dias: n, feitoHoje };
}

/** O que foi gasto em um dia: total e quantidade de lançamentos (com o que foi no cartão). */
export function gastoDoDia(st, dia) {
  const l = st.lancamentos.filter((x) => x.tipo === "Despesa" && x.data === dia);
  return { total: round2(l.reduce((t, x) => t + Number(x.valor), 0)), n: l.length };
}

/**
 * Compara o gasto do dia a dia deste mês, até hoje, com o do mês anterior até o mesmo dia.
 * Devolve null quando o mês anterior não tem gastos até esse dia (não há com o que comparar) ou fora do mês atual.
 */
export function comparaComMesAnterior(st, c, m) {
  if (c.fase !== "atual") return null;
  const ant = addM(m, -1), ate = `${ant}-${pad(Math.min(c.dias, dim(ant)))}`;
  const l = st.lancamentos.filter((x) => x.tipo === "Despesa" && !noCartao(x) && mKey(x.data) === ant && x.data <= ate);
  if (!l.length) return null;
  const antes = round2(l.reduce((t, x) => t + Number(x.valor), 0));
  return { antes, agora: c.vari, dif: round2(c.vari - antes), mes: ant };
}

/**
 * Limite do mês: o máximo que a pessoa estimou gastar. Compara com o custo do mês (dia a dia, contas fixas e faturas).
 * nivel: 0 (tranquilo), 80 (chegou a 80% do limite), 100 (passou do limite) ou 120 (passou em mais de 20%).
 * vaiPassar: ainda não passou, mas no ritmo atual o mês fecha acima do limite.
 * Devolve null quando não há limite definido.
 */
/**
 * Primeiros passos: o que a pessoa já cadastrou e o que ainda falta para o app conseguir mostrar o mês dela.
 * @param {object} st    dados (lancamentos, fixos, faturas, cartoes)
 * @param {{semRenda?:boolean, semCartao?:boolean}} guia  o que a pessoa disse que não tem (renda fixa, cartão)
 * @returns {{itens:{k:string, feito:boolean, n:number}[], feitos:number, total:number, completo:boolean}}
 */
export function primeirosPassos(st, guia = {}) {
  const entradas = st.fixos.filter((f) => f.tipo === "Receita"), contas = st.fixos.filter((f) => (f.tipo || "Despesa") === "Despesa");
  const gastos = st.lancamentos.filter((x) => x.tipo === "Despesa"), cartoes = st.cartoes || [];
  const itens = [
    { k: "renda", feito: entradas.length > 0 || st.lancamentos.some((x) => x.tipo === "Receita") || Boolean(guia?.semRenda), n: entradas.length },
    { k: "contas", feito: contas.length > 0, n: contas.length },
    { k: "cartao", feito: cartoes.length > 0 || (st.faturas || []).length > 0 || Boolean(guia?.semCartao), n: cartoes.length },
    { k: "gasto", feito: gastos.length > 0, n: gastos.length },
  ];
  const feitos = itens.filter((i) => i.feito).length;
  return { itens, feitos, total: itens.length, completo: feitos === itens.length };
}

export function usoDoTeto(c, teto) {
  const t = round2(Number(teto) || 0);
  if (!(t > 0)) return null;
  const nivel = c.custo > t * 1.2 ? 120 : c.custo > t ? 100 : c.custo >= t * 0.8 ? 80 : 0, projecao = c.fase === "atual" ? c.proj : c.custo;
  return { teto: t, gasto: c.custo, pct: Math.round((c.custo / t) * 100), resta: round2(t - c.custo), nivel, projecao, vaiPassar: c.custo <= t && projecao > t };
}

/**
 * Limites de gasto por categoria: quanto já foi usado de cada limite no mês.
 * @param {object} limites  { "Mercado": 800, ... }
 * @returns {{cat:string, gasto:number, limite:number, pct:number, passou:number}[]}
 */
export function usoDosLimites(c, limites = {}) {
  const gasto = new Map(catMap(c));
  return Object.entries(limites || {}).filter(([, v]) => Number(v) > 0).map(([cat, v]) => {
    const g = gasto.get(cat) || 0, limite = round2(Number(v));
    return { cat, gasto: g, limite, pct: Math.round((g / limite) * 100), passou: g > limite ? round2(g - limite) : 0 };
  }).sort((a, b) => b.pct - a.pct);
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

/* ===================== Metas do dinheiro guardado ===================== */
/** Quanto entrou (menos o que saiu) em um destino, mês a mês: { "2026-09": 300, ... }. */
function guardadoPorMes(st, destino) {
  const out = {};
  st.lancamentos.filter((x) => x.tipo === "Reserva" && x.categoria === destino)
    .forEach((x) => { const k = mKey(x.data); out[k] = round2((out[k] || 0) + sinalRes(x) * Number(x.valor)); });
  return out;
}

/**
 * Andamento de uma meta: quanto a pessoa quer juntar em um destino ("Reserva de emergência") e, se quiser, até quando.
 * A conta é só valor e tempo: o que já tem, o que falta e em quantos meses. NÃO estima rendimento de investimento.
 * - ritmo: média do que foi guardado por mês nos últimos meses fechados (até 3), contando do primeiro mês em que a pessoa
 *   guardou ali. Sem mês fechado, vale o que foi guardado neste mês (mesesDeBase = 0).
 * - previsao: mês em que a meta fica pronta se o ritmo continuar; null quando não há ritmo.
 * - porMes: com data, quanto guardar por mês (deste mês até o da data) para chegar a tempo. Não muda ao longo do mês.
 * - plano: o combinado da pessoa ("guardar R$ 300 todo mês, no dia 5"). É opcional e não é uma conta: ela pode pular o mês.
 *   Quando existe, a previsão usa o valor do plano no lugar do ritmo.
 * - ref / esteMes: a parte de um mês (o plano; sem plano, o porMes; sem data, o ritmo) e quanto dela ainda falta guardar neste mês.
 * @param {{valor:number, ate?:string, plano?:{valor:number, dia?:number}, pulos?:string[]}} meta  ate é "AAAA-MM" ou vazio
 */
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
    const depois = round2(falta - (pulou ? 0 : Math.max(0, passo - Math.max(0, noMes))));   // o que ainda falta se este mês repetir o passo
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

/** Todas as metas com valor, com o andamento de cada uma: primeiro as que ainda faltam (as com data mais próxima na frente). */
export function metasEmAndamento(st, metas, hoje) {
  return Object.entries(metas || {}).map(([destino, m]) => andamentoDaMeta(st, destino, m, hoje)).filter(Boolean)
    .sort((a, b) => Number(a.concluida) - Number(b.concluida) || (a.ate || "9999-99").localeCompare(b.ate || "9999-99") || b.pct - a.pct || a.destino.localeCompare(b.destino));
}

/**
 * O que dá para fazer pela meta neste mês, olhando para o que deve sobrar.
 * A sobra usada é a prevista para o fim do mês (entradas − custo previsto − o que já foi guardado): a conta mais cautelosa.
 * tipo: "feita"    a meta está completa
 *       "feito"    a parte deste mês já foi guardada
 *       "pulou"    a pessoa escolheu pular o combinado deste mês
 *       "apertado" não deve sobrar dinheiro neste mês (o app não cobra: só informa)
 *       "guardar"  valor sugerido; completo = cobre a parte do mês
 *       "livre"    deve sobrar, mas ainda não há ritmo nem data para sugerir um valor
 * @param {ReturnType<typeof andamentoDaMeta>} a
 * @param {ReturnType<typeof calcMes>} c  números do mês atual
 */
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

/**
 * Lembrete da meta para o aviso diário. São poucos de propósito, só em dois momentos:
 * - "entrou": hoje cai uma entrada fixa (ou ontem foi lançada uma entrada) e a parte deste mês ainda não foi guardada;
 * - "sobra":  faltam 2 dias para o mês acabar e deve sobrar dinheiro.
 * Mês apertado não gera lembrete, e meta sem ritmo nem data também não (não há valor para sugerir).
 * Quem chama cuida de mandar cada tipo só uma vez por mês.
 */
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

/**
 * Combinados do mês: metas com plano ("guardar R$ 300 todo mês") cuja parte deste mês ainda não foi guardada nem pulada.
 * Não são contas: não entram no custo nem no total a pagar, e nunca ficam "atrasados".
 * @returns {{destino:string, valor:number, data:string, chegou:boolean}[]}  chegou: o dia combinado já é hoje ou já passou
 */
export function combinadosDoMes(st, metas, hoje) {
  const cur = mKey(hoje);
  return metasEmAndamento(st, metas, hoje).filter((a) => a.plano > 0 && !a.concluida && !a.pulou && a.esteMes > 0)
    .map((a) => { const data = diaNoMes(cur, a.diaDoPlano); return { destino: a.destino, valor: a.esteMes, data, chegou: data <= hoje }; })
    .sort((x, y) => x.data.localeCompare(y.data) || x.destino.localeCompare(y.destino));
}

/**
 * Parabéns do aviso diário: ontem a pessoa guardou dinheiro em um destino que tem meta.
 * Diz quanto entrou, como a meta ficou e se ela cruzou um marco (25, 50, 75 ou 100%) com esse dinheiro.
 * Com mais de uma meta, vale a que cruzou um marco; senão, a que recebeu mais.
 * @returns {null | {destino:string, valor:number, guardado:number, alvo:number, falta:number, pct:number, marco:number, concluida:boolean}}
 */
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
    if (guardado <= antes) continue;   // no mesmo dia retirou tanto quanto guardou: não há o que comemorar
    const depois = marcoDe(guardado, alvo), falta = round2(Math.max(0, alvo - guardado));
    out.push({ destino, valor, guardado, alvo, falta, pct: Math.max(0, Math.min(100, Math.floor((guardado / alvo) * 100))), marco: depois > marcoDe(antes, alvo) ? depois : 0, concluida: falta === 0 });
  }
  return out.sort((a, b) => b.marco - a.marco || b.valor - a.valor || a.destino.localeCompare(b.destino))[0] || null;
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

/* ===================== Atalhos do dia a dia: busca, mais usados, categoria aprendida, meses lado a lado ===================== */
const semAcento = (s) => String(s ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
const semParcela = (d) => String(d ?? "").replace(/\s*\(\d+\/\d+\)$/, "");   // "Tênis (2/3)" → "Tênis"

/**
 * Busca em todos os lançamentos, de qualquer mês. Cada palavra digitada precisa aparecer na descrição, na categoria ou na forma de pagamento;
 * um número ("32,50", "32") procura pelo valor. Acentos e maiúsculas não importam. Mais recentes primeiro.
 * @returns {{itens:object[], total:number, soma:number}} `total` conta todos os achados; `itens` traz até `limite`; `soma` é o total dos gastos achados.
 */
export function buscaLancamentos(lancs, q, limite = 200) {
  const termos = semAcento(q).split(/\s+/).filter(Boolean);
  if (!termos.length) return { itens: [], total: 0, soma: 0 };
  const achados = lancs.filter((x) => {
    const texto = semAcento([x.descricao, x.categoria, x.forma, x.tipo === "Receita" ? "entrada" : x.tipo === "Reserva" ? "guardado" : "gasto"].join(" "));
    const valor = Number(x.valor).toFixed(2).replace(".", ","), inteiro = valor.split(",")[0];
    // Número: "32" acha 32,50 (mas não 320,00); "32,5" e "32,50" acham 32,50.
    const numero = (t) => { const n = t.replace(".", ","); return n.includes(",") ? valor.startsWith(n) : inteiro === n; };
    return termos.every((t) => texto.includes(t) || (/^\d+([.,]\d{1,2})?$/.test(t) && numero(t)));
  }).sort((a, b) => b.data.localeCompare(a.data) || String(b.created_at || "").localeCompare(String(a.created_at || "")));
  const soma = round2(achados.reduce((t, x) => t + (x.tipo === "Despesa" ? Number(x.valor) : 0), 0));
  return { itens: achados.slice(0, limite), total: achados.length, soma };
}

/**
 * Os gastos que a pessoa mais repete, para lançar com um toque: mesma descrição pelo menos 2 vezes nos últimos 120 dias.
 * O valor sugerido é o que mais apareceu (no empate, o mais recente). Compras parceladas e importadas do extrato ficam de fora.
 * @returns {{descricao:string, categoria:string, forma:string, valor:number, vezes:number}[]}
 */
export function maisUsados(lancs, hoje, n = 4) {
  const desde = toISO(new Date(new Date(hoje + "T12:00:00").getTime() - 120 * 86400000)), grupos = new Map();
  lancs.filter((x) => x.tipo === "Despesa" && x.descricao && x.data >= desde && x.data <= hoje && !x.import_key && !(Number(x.parcelas) > 1))
    .sort((a, b) => a.data.localeCompare(b.data))
    .forEach((x) => { const k = semAcento(x.descricao); const g = grupos.get(k) || { itens: [] }; g.itens.push(x); grupos.set(k, g); });
  return [...grupos.values()].filter((g) => g.itens.length >= 2).map((g) => {
    const ult = g.itens.at(-1), conta = new Map();
    g.itens.forEach((x, i) => { const v = round2(Number(x.valor)), c = conta.get(v) || { n: 0, i: 0 }; conta.set(v, { n: c.n + 1, i }); });
    const valor = [...conta.entries()].sort((a, b) => b[1].n - a[1].n || b[1].i - a[1].i)[0][0];
    return { descricao: ult.descricao, categoria: ult.categoria, forma: ult.forma || "Pix", valor, vezes: g.itens.length, ultima: ult.data };
  }).sort((a, b) => b.vezes - a.vezes || b.ultima.localeCompare(a.ultima)).slice(0, n).map(({ ultima, ...r }) => r);
}

/**
 * A categoria que a pessoa costuma dar a essa descrição. Vale a escolha mais recente: se ela corrigiu, o app aprende.
 * Primeiro procura a descrição igual; depois, uma que comece com as mesmas duas palavras ("Uber viagem" ~ "Uber centro" não; "Mercado Zaffari" ~ "Mercado Zaffari Centro" sim).
 * @returns {string} "" quando não há histórico.
 */
export function categoriaAprendida(lancs, descricao, tipo = "Despesa") {
  const alvo = semAcento(semParcela(descricao));
  if (alvo.length < 3) return "";
  const doTipo = lancs.filter((x) => x.tipo === tipo && x.descricao && x.categoria).sort((a, b) => b.data.localeCompare(a.data) || String(b.created_at || "").localeCompare(String(a.created_at || "")));
  const igual = doTipo.find((x) => semAcento(semParcela(x.descricao)) === alvo);
  if (igual) return igual.categoria;
  const duas = alvo.split(/\s+/).slice(0, 2).join(" ");
  if (duas.includes(" ") && duas.length >= 6) { const p = doTipo.find((x) => (semAcento(semParcela(x.descricao)) + " ").startsWith(duas + " ")); if (p) return p.categoria; }
  return "";
}

/**
 * Os últimos `n` meses até `m`, lado a lado: o que entrou, o custo e o que sobrou em cada um. Só entram meses a partir do primeiro com dados.
 * @returns {{m:string, rec:number, custo:number, sobra:number, fase:string}[]} do mais antigo para o mais recente
 */
export function ultimosMeses(st, m, hoje, n = 6) {
  const primeiro = primeiroMes(st), out = [];
  if (!primeiro) return out;
  for (let k = n - 1; k >= 0; k--) {
    const mm = addM(m, -k);
    if (mm < primeiro) continue;
    const c = calcMes(st, mm, hoje);
    out.push({ m: mm, rec: c.rec, custo: c.custo, sobra: c.saldo, fase: c.fase });
  }
  return out;
}

/**
 * Gasto do dia a dia por categoria, comparado com o mês anterior. No mês atual, compara até o mesmo dia; em mês passado, o mês inteiro.
 * Só entra categoria com diferença que vale a pena mostrar: pelo menos R$ 10 e 10% do que era.
 * @returns {{mes:string, ate:number|null, por:Record<string,{antes:number, agora:number, dif:number}>}|null}
 */
export function comparaCategorias(st, c, m) {
  if (c.fase === "futuro") return null;
  const ant = addM(m, -1), dia = c.fase === "atual" ? Math.min(c.dias, dim(ant)) : null, ate = dia ? `${ant}-${pad(dia)}` : `${ant}-31`;
  const soma = (l) => { const o = {}; l.forEach((x) => { o[x.categoria] = (o[x.categoria] || 0) + Number(x.valor); }); return o; };
  const antes = soma(st.lancamentos.filter((x) => x.tipo === "Despesa" && !noCartao(x) && mKey(x.data) === ant && x.data <= ate));
  if (!Object.keys(antes).length) return null;
  const agora = soma(c.it.filter((x) => x.tipo === "Despesa" && !noCartao(x))), por = {};
  for (const k of new Set([...Object.keys(antes), ...Object.keys(agora)])) {
    const a = round2(antes[k] || 0), b = round2(agora[k] || 0), dif = round2(b - a);
    if (a > 0 && Math.abs(dif) >= 10 && Math.abs(dif) >= a * 0.1) por[k] = { antes: a, agora: b, dif };
  }
  return { mes: ant, ate: dia, por };
}

/**
 * Calendário do mês: o que vence e o que entra em cada dia.
 * Contas = gastos fixos pagos fora do cartão e faturas que vencem no mês. Entradas = entradas fixas (salário e parecidas).
 * `situacao` de cada conta: "paga", "atrasada" (já passou e não foi marcada), "hoje" ou "a vencer".
 * @returns {{m:string, vazios:number, dias:{dia:number, iso:string, contas:object[], entradas:object[], aPagar:number, situacao:string}[], aPagar:number, pago:number, entra:number}}
 *   `vazios` é quantas casas ficam em branco antes do dia 1 (o mês começa em domingo = 0). A `situacao` do dia é a mais urgente das contas dele.
 */
export function calendarioDoMes(st, m, hoje) {
  const c = calcMes(st, m, hoje), n = dim(m), porDia = Array.from({ length: n }, (_, i) => ({ dia: i + 1, iso: `${m}-${pad(i + 1)}`, contas: [], entradas: [], aPagar: 0, situacao: "" }));
  const sit = (data, paga) => (paga ? "paga" : data < hoje ? "atrasada" : data === hoje ? "hoje" : "a vencer");
  const noDia = (data) => porDia[Math.min(n, Math.max(1, Number(data.slice(8, 10)))) - 1];
  c.fx.filter((o) => !noCartao(o)).forEach((o) => noDia(o.data).contas.push({ tipo: "fixo", id: o.id, chave: o.chave, data: o.data, titulo: o.descricao, valor: Number(o.valor), situacao: sit(o.data, c.pagosSet.has(o.id + "|" + o.chave)) }));
  c.fat.forEach((f) => noDia(f.vencimento).contas.push({ tipo: "fatura", id: f.id || null, auto: Boolean(f.auto), cartao_id: f.cartao_id || null, cartao: f.cartao, data: f.vencimento, titulo: `Fatura ${f.cartao}`, valor: Number(f.valor), situacao: sit(f.vencimento, f.status === "Paga") }));
  c.fr.forEach((o) => noDia(o.data).entradas.push({ titulo: o.descricao, valor: Number(o.valor) }));
  const ordem = ["atrasada", "hoje", "a vencer", "paga"];
  let aPagar = 0, pago = 0, entra = 0;
  porDia.forEach((d) => {
    d.contas.sort((a, b) => ordem.indexOf(a.situacao) - ordem.indexOf(b.situacao) || a.titulo.localeCompare(b.titulo));
    d.aPagar = round2(d.contas.filter((x) => x.situacao !== "paga").reduce((t, x) => t + x.valor, 0));
    d.situacao = d.contas.length ? d.contas[0].situacao : "";
    aPagar += d.aPagar; pago += d.contas.filter((x) => x.situacao === "paga").reduce((t, x) => t + x.valor, 0); entra += d.entradas.reduce((t, x) => t + x.valor, 0);
  });
  return { m, vazios: diaDaSemana(`${m}-01`), dias: porDia, aPagar: round2(aPagar), pago: round2(pago), entra: round2(entra) };
}

/* ===================== Resumo da semana e lembrete do fim do dia ===================== */
const maisDias = (iso, n) => { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return toISO(d); };

/**
 * Resumo dos 7 dias que terminam em `hoje` (o servidor manda no domingo à noite: de segunda a domingo).
 * Gastos = lançamentos de gasto pela data da compra, com o que foi no cartão (compra parcelada entra inteira, no dia da compra).
 * @returns {{de:string, ate:string, total:number, n:number, antes:number, dif:number|null, cats:{cat:string, valor:number}[], outras:number,
 *   maior:{descricao:string, categoria:string, valor:number, data:string}|null, dias:{iso:string, total:number}[], anotados:number,
 *   proximas:{itens:object[], total:number, atrasadas:number}, mes:{custo:number, rec:number, previsto:number}}}
 *   `dif` compara com os 7 dias anteriores (null quando eles não têm gasto); `anotados` conta os dias com algum lançamento ou marcados sem gasto;
 *   `proximas` são as contas atrasadas (até 30 dias) e as que vencem nos 7 dias seguintes; `previsto` é quanto deve sobrar no mês, no ritmo atual.
 */
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

/**
 * Lembrete do fim do dia: vale quando a pessoa não anotou nada hoje (nem marcou "não gastei nada").
 * Para não virar insistência, ele para sozinho depois de 7 dias sem nenhuma anotação e volta quando a pessoa anota de novo.
 * @param {{semGasto?:string[], anotouHoje?:boolean, desde?:string}} o  `anotouHoje`: lançou algo hoje, mesmo com outra data; `desde`: dia em que a conta foi criada
 * @returns {{seq:number, parado:number}|null}  `seq`: dias seguidos anotando até ontem; `parado`: dias desde a última anotação
 */
export function lembreteDoDia(st, hoje, { semGasto = [], anotouHoje = false, desde = "" } = {}) {
  if (anotouHoje || semGasto.includes(hoje) || st.lancamentos.some((x) => x.data === hoje)) return null;
  const ultima = [...st.lancamentos.map((x) => x.data), ...semGasto, desde].filter((d) => d && d <= hoje).sort().pop();
  if (!ultima) return null;
  const parado = diasEntre(ultima, hoje);
  if (parado > 7) return null;
  return { seq: sequenciaDeDias(st, hoje, semGasto).dias, parado };
}

/* ===================== Conta de casal ===================== */
/** O que passa a ser um só para os dois quando as contas são divididas. O resto (avisos, tema, quadros do início) continua de cada um. */
export const COMUM_DO_CASAL = ["categorias", "limites", "teto", "metas", "levarSaldo", "saldoDesde", "saldoInicial", "semGasto"];

/** Só as chaves que são dos dois. */
export function comumDoCasal(prefs) {
  const out = {};
  for (const k of COMUM_DO_CASAL) if (prefs && prefs[k] !== undefined && prefs[k] !== null) out[k] = prefs[k];
  return out;
}

/**
 * Ao aceitar o convite: junta o que é de quem aceitou com o que já era de quem convidou.
 * Valem o limite, os limites por categoria e o saldo inicial de quem convidou; categorias, metas e dias sem gasto se somam
 * (na meta com o mesmo nome, fica a de quem convidou).
 */
export function juntaPrefsDoCasal(deQuemConvidou = {}, deQuemAceitou = {}) {
  const a = comumDoCasal(deQuemConvidou), b = comumDoCasal(deQuemAceitou), out = { ...b, ...a };
  if (a.categorias && b.categorias) {
    out.categorias = {};
    for (const t of new Set([...Object.keys(a.categorias), ...Object.keys(b.categorias)])) out.categorias[t] = [...new Set([...(a.categorias[t] || []), ...(b.categorias[t] || [])])];
  }
  if (a.metas || b.metas) out.metas = { ...(b.metas || {}), ...(a.metas || {}) };
  if (a.semGasto || b.semGasto) out.semGasto = [...new Set([...(a.semGasto || []), ...(b.semGasto || [])])].sort().slice(-90);
  return out;
}

/** Um nome curto a partir do e-mail, para mostrar quem lançou: "bia.souza92@exemplo.com" → "Bia". */
export function apelidoDoEmail(email) {
  const p = String(email || "").split("@")[0].split(/[._\-+0-9]+/).find(Boolean) || "";
  return p ? p[0].toUpperCase() + p.slice(1).toLowerCase() : "";
}

/**
 * Quanto cada um lançou de gastos no mês (pela pessoa que anotou, não por quem pagou).
 * @returns {{eu:{total:number, n:number}, outro:{total:number, n:number}}}
 */
export function divisaoDoMes(lancs, m, eu) {
  const r = { eu: { total: 0, n: 0 }, outro: { total: 0, n: 0 } };
  for (const x of lancs) {
    if (x.tipo !== "Despesa" || mKey(x.data) !== m) continue;
    const k = !x.user_id || x.user_id === eu ? "eu" : "outro";
    r[k].total = round2(r[k].total + Number(x.valor)); r[k].n++;
  }
  return r;
}
