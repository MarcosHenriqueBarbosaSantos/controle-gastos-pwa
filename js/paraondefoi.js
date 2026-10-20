// "Para onde foi o dinheiro": responde, em linguagem simples, quanto a pessoa gastou no mês, como foi nos meses anteriores,
// onde o dinheiro foi, o que pesou ou subiu e o que fazer para melhorar. Funções puras, sem tela (testadas em tests/paraondefoi.test.mjs).

import { calcMes, catMap, ultimosMeses, addM, round2, primeiroMes } from "./calc.js";

const reais = (v) => `R$ ${Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
export const nomeDoMes = (m) => MESES[Number(m.slice(5, 7)) - 1];

/**
 * @param {object} st  dados do app (lancamentos, fixos, faturas, cartoes, pagos)
 * @param {string} m   mês, "AAAA-MM"
 * @param {string} hoje  "AAAA-MM-DD"
 * @param {{teto?:number}} [o]  limite de gasto do mês, se a pessoa definiu
 * @returns {{m:string, anterior:string, temAnterior:boolean, fase:string, gasto:number, previsto:number, base:number, antes:number, dif:number, difPct:number|null,
 *   entra:number, sobra:number, categorias:object[], meses:object[], leituras:object[], passos:object[]}|null}  null quando o mês não tem nenhum gasto
 */
export function paraOndeFoi(st, m, hoje, { teto = 0 } = {}) {
  const c = calcMes(st, m, hoje), ant = addM(m, -1), a = calcMes(st, ant, hoje);
  if (!(c.custo > 0) && !(c.rec > 0)) return null;
  const atual = c.fase === "atual", base = atual ? c.proj : c.custo;   // no mês em andamento, compara o que o mês vai custar
  const temAnterior = a.custo > 0, antes = a.custo, dif = round2(base - antes), difPct = temAnterior ? Math.round((dif / antes) * 100) : null;
  const entra = c.rec, sobra = round2(entra - base);

  // Para onde foi: do maior para o menor, com o que mudou desde o mês anterior.
  const agora = catMap(c), antC = new Map(catMap(a)), total = agora.reduce((t, x) => t + x[1], 0) || 1;
  const todas = agora.map(([nome, valor]) => {
    const ca = antC.get(nome) || 0, d = round2(valor - ca);
    return { nome, valor, pct: Math.round((valor / total) * 100), ant: ca, dif: d, difPct: ca > 0 ? Math.round((d / ca) * 100) : null };
  });
  const topo = todas.slice(0, 6), resto = todas.slice(6);
  const categorias = resto.length ? [...topo, { nome: "Demais", valor: round2(resto.reduce((t, x) => t + x.valor, 0)), pct: Math.round((resto.reduce((t, x) => t + x.valor, 0) / total) * 100), ant: 0, dif: 0, difPct: null, junta: resto.length }] : topo;

  const meses = ultimosMeses(st, m, hoje, 6).map((x) => ({ ...x, atual: x.m === m }));
  const leituras = [], passos = [];
  const outros = todas.find((x) => x.nome === "Outros"), maiorAlta = todas.filter((x) => x.nome !== "Outros" && x.dif >= 50 && x.difPct !== null && x.difPct >= 15).sort((x, y) => y.dif - x.dif)[0];
  const maiorQueda = todas.filter((x) => x.dif <= -50 && x.difPct !== null && x.difPct <= -15).sort((x, y) => x.dif - y.dif)[0];
  const fixosPct = entra > 0 ? Math.round((c.fxT / entra) * 100) : 0, nomeAnt = nomeDoMes(ant);

  if (sobra < 0 && entra > 0) leituras.push({ tom: "erro", titulo: `${atual ? "O mês deve fechar" : "Você gastou"} ${reais(sobra)} ${atual ? "no vermelho" : "a mais do que entrou"}`, texto: `Entraram ${reais(entra)} e ${atual ? "a previsão de gasto é" : "saíram"} ${reais(base)}.` });
  else if (entra > 0 && sobra >= 0) leituras.push({ tom: "ok", titulo: `Sobrou ${reais(sobra)}`, texto: `Entraram ${reais(entra)} e ${atual ? "a previsão de gasto é" : "saíram"} ${reais(base)}.` });
  if (maiorAlta) leituras.push({ tom: "erro", titulo: `${maiorAlta.nome} subiu ${reais(maiorAlta.dif)}`, texto: `Foram ${reais(maiorAlta.valor)} contra ${reais(maiorAlta.ant)} em ${nomeAnt} (${maiorAlta.difPct}% a mais).` });
  if (outros && outros.valor >= 50 && outros.pct >= 15) leituras.push({ tom: "erro", titulo: `${reais(outros.valor)} ficaram sem categoria`, texto: `${outros.pct}% do que você gastou está em "Outros": assim não dá para saber para onde o dinheiro foi.` });
  if (fixosPct >= 50) leituras.push({ tom: "erro", titulo: `As contas fixas levam ${fixosPct}% do que entra`, texto: `São ${reais(c.fxT)} por mês antes de gastar com qualquer outra coisa. É aqui que mais pesa.` });
  else if (todas[0] && todas[0].pct >= 35 && todas[0].nome !== "Outros") leituras.push({ tom: "info", titulo: `${todas[0].nome} é ${todas[0].pct}% do seu gasto`, texto: `${reais(todas[0].valor)} de ${reais(total)}. É a categoria que mais pesa no mês.` });
  if (maiorQueda) leituras.push({ tom: "ok", titulo: `${maiorQueda.nome} caiu ${reais(maiorQueda.dif)}`, texto: `Foram ${reais(maiorQueda.valor)} contra ${reais(maiorQueda.ant)} em ${nomeAnt}. Bom sinal.` });
  if (teto > 0 && base > teto) leituras.push({ tom: "erro", titulo: `Passou do limite em ${reais(base - teto)}`, texto: `O limite do mês é ${reais(teto)}.` });

  // O que fazer: poucos passos, do que mais ajuda para o que menos ajuda, cada um com o lugar do app onde se resolve.
  if (outros && outros.valor >= 50 && outros.pct >= 15) passos.push({ id: "arrumar", titulo: "Dê categoria ao que está em Outros", texto: `São ${reais(outros.valor)}. Escolha a categoria uma vez por nome e o app muda todos de uma vez.`, acao: "Arrumar lançamentos" });
  if (sobra < 0 && atual) {
    const dias = Math.max(1, c.n - c.dias), porDia = round2(-sobra / dias);
    passos.push({ id: "cortar", titulo: `Gaste ${reais(porDia)} a menos por dia`, texto: `Faltam ${dias} ${dias === 1 ? "dia" : "dias"} no mês. Com esse corte, o mês fecha no zero.`, acao: "Ver o que sobra" });
  }
  if (maiorAlta) passos.push({ id: "limite", titulo: `Ponha um limite em ${maiorAlta.nome}`, texto: `Tente ficar perto de ${reais(maiorAlta.ant)}, o que você gastou em ${nomeAnt}. O app avisa quando chegar perto.`, acao: "Definir o limite", categoria: maiorAlta.nome, valor: Math.round(maiorAlta.ant) });
  if (fixosPct >= 50) passos.push({ id: "fixas", titulo: "Reveja as contas fixas", texto: "Veja se alguma pode cair, ser renegociada ou cancelada. É o gasto que se repete todo mês.", acao: "Ver contas fixas" });
  if (!(teto > 0) && !maiorAlta) passos.push({ id: "teto", titulo: "Defina um limite para o mês", texto: "Com um limite, o app avisa antes de você passar.", acao: "Definir o limite" });
  if (!passos.length) passos.push({ id: "manter", titulo: "Continue assim", texto: "Nada pesou fora do normal. Guarde um pouco do que sobrou para uma caixinha.", acao: "Ver caixinhas" });

  return { m, anterior: ant, temAnterior, fase: c.fase, gasto: c.custo, previsto: c.proj, base, antes, dif, difPct, entra, sobra, categorias, meses,
    leituras: leituras.sort((x, y) => ({ erro: 0, info: 1, ok: 2 })[x.tom] - ({ erro: 0, info: 1, ok: 2 })[y.tom]).slice(0, 4), passos: passos.slice(0, 3), primeiro: primeiroMes(st) };
}
