// Conta de casal: o mês de cada um separado e os dois juntos. Funções puras, sem tela (testadas em tests/casalvisao.test.mjs).
// Cada linha continua sendo de quem lançou (user_id); o que não diz de quem é fica com a própria pessoa (`eu`).

import { calcMes, round2 } from "./calc.js";

const doDono = (x, eu) => x?.user_id || eu;

/** Os mesmos dados, só com o que é de uma pessoa: lançamentos, contas fixas, marcações de pago, cartões e faturas. */
export function dadosDe(st, quem, eu) {
  const meus = (x) => doDono(x, eu) === quem;
  const fixos = (st.fixos || []).filter(meus), ids = new Set(fixos.map((f) => f.id));
  return {
    ...st,
    lancamentos: (st.lancamentos || []).filter(meus), fixos,
    pagos: (st.pagos || []).filter((p) => ids.has(p.fixo_id)),
    cartoes: (st.cartoes || []).filter(meus),
    faturas: (st.faturas || []).filter((f) => meus(f) || (f.cartao_id && (st.cartoes || []).some((k) => k.id === f.cartao_id && meus(k)))),
  };
}

/**
 * O mês de cada um e dos dois juntos: o que entrou, o que saiu e o que sobrou.
 * @returns {{eu:{rec:number, custo:number, sobra:number}, outro:{rec:number, custo:number, sobra:number}, juntos:{rec:number, custo:number, sobra:number}}}
 */
export function saldosDoCasal(st, m, hoje, eu, outro) {
  const um = (dados) => { const c = calcMes(dados, m, hoje), custo = c.fase === "atual" ? c.proj : c.custo; return { rec: c.rec, gasto: c.custo, custo, sobra: round2(c.rec - custo - Math.max(0, c.res)), fase: c.fase }; };
  // O que um passa para o outro (categoria "Casal") é só dinheiro mudando de mão: soma zero para os dois juntos, então não entra no "Juntos".
  const semEntreOsDois = { ...st, lancamentos: (st.lancamentos || []).filter((x) => x.categoria !== "Casal") };
  return { eu: um(dadosDe(st, eu, eu)), outro: um(dadosDe(st, outro, eu)), juntos: um(semEntreOsDois) };
}
