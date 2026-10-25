/* Linha do tempo da semana: os últimos movimentos que a pessoa já lançou, do mais novo ao mais antigo. Só lê; não grava nada. */

const addDias = (iso, n) => { const [a, m, d] = iso.split("-").map(Number); const t = new Date(Date.UTC(a, m - 1, d + n)); return t.toISOString().slice(0, 10); };

/**
 * lancs: os lançamentos do app ({ id, data, descricao, categoria, tipo, valor, forma, pendente }).
 * Devolve até `max` itens dos últimos `dias` dias (hoje incluso), com `rotulo` ("hoje", "ontem" ou o dia da semana).
 */
export function linhaDaSemana(lancs, hojeISO, { dias = 7, max = 6 } = {}) {
  const de = addDias(hojeISO, -(dias - 1)), SEM = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  const rot = (iso) => {
    if (iso === hojeISO) return "hoje"; if (iso === addDias(hojeISO, -1)) return "ontem";
    const [a, m, d] = iso.split("-").map(Number); return SEM[new Date(Date.UTC(a, m - 1, d)).getUTCDay()];
  };
  return (lancs || [])
    .filter((x) => x && x.data >= de && x.data <= hojeISO && Number(x.valor) > 0 && ["Despesa", "Receita", "Reserva"].includes(x.tipo))
    .sort((a, b) => b.data.localeCompare(a.data) || String(b.created_at || "").localeCompare(String(a.created_at || "")))
    .slice(0, max)
    .map((x) => ({ id: x.id, data: x.data, rotulo: rot(x.data), descricao: x.descricao || x.categoria || "Sem descrição", categoria: x.categoria || "", tipo: x.tipo, valor: Number(x.valor), forma: x.forma || "" }));
}
