/* Ganho contra gasto: o mês em horas de trabalho, ganho, gasto e sobra. Só lê números que o app já tem; não grava nada. */
const r2 = (v) => Math.round(v * 100) / 100;
const soma = (l) => r2(l.reduce((s, x) => s + (Number(x.valor) > 0 ? Number(x.valor) : 0), 0));

/** Quantos dias do mês `mes` ("2026-10") já passaram em `hojeISO`: mês passado inteiro, mês futuro nenhum. */
export function diasDoMes(mes, hojeISO) {
  const [a, m] = mes.split("-").map(Number), total = new Date(Date.UTC(a, m, 0)).getUTCDate(), hm = hojeISO.slice(0, 7);
  if (hm > mes) return { total, passados: total };
  if (hm < mes) return { total, passados: 0 };
  return { total, passados: Number(hojeISO.slice(8, 10)) };
}

/**
 * entradas / custos: [{ data: "AAAA-MM-DD", valor }] do mês.
 * horasTurnos: horas dos turnos do modo motorista no mês (0 se não usa).
 * horasSemana: horas por semana que a pessoa informou em "Quanto vale minha hora" (0 se não informou).
 * Devolve null se não há nem ganho nem gasto.
 */
export function ganhoContraGasto({ entradas = [], custos = [], horasTurnos = 0, horasSemana = 0, mes, hojeISO }) {
  const ganho = soma(entradas), gasto = soma(custos);
  if (!(ganho > 0) && !(gasto > 0)) return null;
  const { total, passados } = diasDoMes(mes, hojeISO);
  let horas = null, origemHoras = null;
  if (horasTurnos > 0) { horas = r2(horasTurnos); origemHoras = "turnos"; }
  else if (horasSemana > 0 && passados > 0) { horas = r2(horasSemana * (passados / 7)); origemHoras = "estimada"; }
  const valorHora = horas && ganho > 0 ? r2(ganho / horas) : null;
  const emHoras = (v) => (valorHora && v > 0 ? r2(v / valorHora) : null);
  // Dia em que o que entrou até então já cobre todo o gasto do mês.
  let diaQuitado = null;
  if (ganho > 0 && gasto > 0) {
    let acum = 0;
    for (const e of [...entradas].filter((x) => Number(x.valor) > 0).sort((a, b) => a.data.localeCompare(b.data))) {
      acum = r2(acum + Number(e.valor));
      if (acum >= gasto) { diaQuitado = e.data; break; }
    }
  }
  const sobra = r2(ganho - gasto);
  return { ganho, gasto, sobra, horas, origemHoras, valorHora, horasDoGasto: emHoras(gasto), horasDaSobra: emHoras(sobra),
    diaQuitado, previsto: Boolean(diaQuitado && diaQuitado > hojeISO), diasNoMes: total };
}
