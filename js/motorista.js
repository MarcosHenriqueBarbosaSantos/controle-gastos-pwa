/* Modo motorista de aplicativo: contas puras (sem tela), para ficarem fáceis de testar.
 * Um turno é { id, ini, fim, apps:{uber,99,indrive,outros}, viagens, km, comb, rid, cid }:
 * ini e fim em milissegundos; rid e cid são os lançamentos que o turno criou (entrada e combustível). */
import { custoDoVeiculo } from "./extras.js";

const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const pad = (n) => String(n).padStart(2, "0");
export const APPS = [["uber", "Uber"], ["99", "99"], ["indrive", "inDrive"], ["ifood", "iFood"], ["rappi", "Rappi"], ["particular", "Particular"], ["outros", "Outros"]];
export const TIPOS_GASTO = [["comb", "Combustível"], ["pedagio", "Pedágio"], ["estac", "Estacionamento"], ["outros", "Outros"]];
export const MAX_TURNOS = 400;
export const somaValores = (o) => r2(Object.values(o || {}).reduce((t, v) => t + (Number(v) > 0 ? Number(v) : 0), 0));

/** A data (AAAA-MM-DD) de um instante, no fuso do aparelho. */
export const isoLocal = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

export const ganhoDoTurno = (t) => r2(Object.values(t?.apps || {}).reduce((s, v) => s + (Number(v) > 0 ? Number(v) : 0), 0));
/** Tempo trabalhado: do início ao fim, sem as pausas (t.pausado, em milissegundos). */
export const duracaoMs = (t, agora = Date.now()) => Math.max(0, (t.fim ?? agora) - t.ini - (Number(t.pausado) > 0 ? Number(t.pausado) : 0));
/** Tempo de uma jornada em andamento: desconta o que já ficou pausado e a pausa que está rolando agora. */
export const msAndamento = (a, agora = Date.now()) => Math.max(0, agora - a.ini - (Number(a.pausado) > 0 ? Number(a.pausado) : 0) - (a.pausaIni ? Math.max(0, agora - a.pausaIni) : 0));

/** 8130000 -> "02:15:30" */
export function relogio(ms) {
  const s = Math.floor(Math.max(0, ms) / 1000);
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}
/** 8130000 -> "2h15" (e 1800000 -> "30min") */
export function horasCurtas(ms) {
  const min = Math.round(Math.max(0, ms) / 60000), h = Math.floor(min / 60), m = min % 60;
  return h ? `${h}h${pad(m)}` : `${m}min`;
}

/**
 * Quanto custa rodar 1 km só com o que sai do bolso a cada quilômetro: combustível, manutenção e pneus,
 * estacionamento e pedágio. IPVA, seguro e parcela ficam de fora porque o app já conta como contas fixas.
 * Vem do "Meu carro ou moto". Sem os km por mês preenchidos, não dá para dividir: devolve null.
 */
export function custoVariavelPorKm(veic) {
  const km = Number(veic?.kmMes), r = custoDoVeiculo(veic);
  if (!r || !(km > 0)) return null;
  const v = r.partes.filter((p) => ["comb", "manut", "outros"].includes(p.k)).reduce((t, p) => t + p.valor, 0);
  return v > 0 ? Math.round((v / km) * 10000) / 10000 : null;
}

/** Custo total de cada km (com seguro, IPVA, parcela e desvalorização), sem arredondar para o lucro não ficar torto. */
export function custoTotalPorKm(veic) {
  const km = Number(veic?.kmMes), r = custoDoVeiculo(veic);
  return r && km > 0 ? r.total / km : null;
}

/**
 * Soma dos turnos terminados entre duas datas (inclusive, pelo dia em que o turno começou).
 * O lucro desconta o custo do carro por km (tudo: combustível, manutenção, desvalorização...).
 * Sem o carro preenchido, desconta só o combustível que a pessoa informou.
 */
export function resumoTurnos(turnos, de, ate, veic) {
  const lista = (turnos || []).filter((t) => t.fim && isoLocal(t.ini) >= de && isoLocal(t.ini) <= ate);
  const sum = (f) => r2(lista.reduce((s, t) => s + f(t), 0));
  const ganho = sum(ganhoDoTurno), km = sum((t) => Number(t.km) || 0), viagens = lista.reduce((s, t) => s + (Number(t.viagens) || 0), 0);
  const comb = sum((t) => Number(t.comb) || 0), ms = lista.reduce((s, t) => s + duracaoMs(t), 0);
  const porKm = custoTotalPorKm(veic);
  const custo = porKm && km > 0 ? r2(km * porKm) : comb, lucro = r2(ganho - custo), horas = ms / 3600000;
  return { n: lista.length, ganho, km, viagens, comb, ms, custo, lucro, comCarro: Boolean(porKm && km > 0),
    ganhoPorHora: horas > 0 ? r2(ganho / horas) : null, lucroPorHora: horas > 0 ? r2(lucro / horas) : null,
    ganhoPorKm: km > 0 ? r2(ganho / km) : null, lucroPorKm: km > 0 ? r2(lucro / km) : null,
    ganhoPorViagem: viagens > 0 ? r2(ganho / viagens) : null };
}

/** Km que a pessoa costuma rodar por dia de trabalho: a média dos últimos turnos; sem histórico, vem do "Meu carro ou moto". */
export function kmPorDia(turnos, veic, diasSemana = 6) {
  const por = new Map();
  (turnos || []).filter((t) => t.fim && Number(t.km) > 0).slice(-30).forEach((t) => { const d = isoLocal(t.ini); por.set(d, (por.get(d) || 0) + Number(t.km)); });
  if (por.size >= 2) return r2([...por.values()].reduce((s, v) => s + v, 0) / por.size);
  const km = Number(veic?.kmMes);
  return km > 0 ? r2(km / (Math.max(1, Math.min(7, diasSemana)) * 4.33)) : 0;
}

/**
 * Quanto rodar por dia para fechar o mês sem ficar no vermelho (ou sobrando `extra`).
 * saldoSemHoje: o saldo do mês sem contar o que o motorista já ganhou hoje, para a meta de hoje não ficar mudando durante o dia.
 * restam: dias do mês que faltam, contando hoje. diasSemana: quantos dias por semana ele roda.
 * O valor é bruto: o líquido que falta por dia mais o que o carro gasta por quilômetro.
 */
export function metaDoDia({ saldoSemHoje, extra = 0, restam, diasSemana = 6, kmDia = 0, custoKm = 0 }) {
  const falta = r2(Math.max(0, (Number(extra) || 0) - saldoSemHoje));
  const dias = Math.max(1, Math.ceil((Math.max(1, restam) * Math.max(1, Math.min(7, diasSemana))) / 7));
  const liquidoDia = r2(falta / dias), custoDia = r2((kmDia || 0) * (custoKm || 0));
  return { falta, dias, liquidoDia, custoDia, brutoDia: falta > 0 ? r2(liquidoDia + custoDia) : 0, coberto: falta <= 0 };
}

/**
 * O turno acontecendo agora: quanto está rendendo por hora e se está valendo a pena.
 * minimo = o líquido por hora que a pessoa precisa para bater a meta do dia rodando `horasDia` horas.
 * Só dá o veredito depois de 15 minutos, porque a primeira corrida sozinha engana.
 */
export function ritmoAoVivo({ ganho, gastos, ms, liquidoDia = 0, horasDia = 8 }) {
  const h = ms / 3600000, liquido = r2(ganho - gastos), ok = h >= 0.05;
  const minimo = liquidoDia > 0 && horasDia > 0 ? r2(liquidoDia / horasDia) : 0;
  const liquidoPorHora = ok ? r2(liquido / h) : null;
  const veredito = liquidoPorHora !== null && minimo > 0 && h >= 0.25 ? (liquidoPorHora >= minimo ? "bom" : "abaixo") : null;
  return { liquido, porHora: ok ? r2(ganho / h) : null, liquidoPorHora, minimo, veredito };
}

/**
 * "Vale a pena essa corrida?": antes de aceitar, o motorista digita o valor, os km (contando o caminho até o passageiro) e os minutos.
 * Desconta o que o carro gasta por km rodado e compara o que sobra por hora com o mínimo da meta do dia.
 * Sem meta, compara o valor por km com o custo por km. É uma ajuda para decidir: quem aceita ou recusa é sempre o motorista.
 */
export function valeAPena({ valor, km, min, custoKm = 0, minimoHora = 0 }) {
  valor = Number(valor); km = Number(km); min = Number(min);
  if (!(valor > 0) || !(km > 0)) return null;
  const gasto = r2(km * (custoKm || 0)), liquido = r2(valor - gasto), porKm = r2(valor / km), liquidoPorKm = r2(liquido / km);
  const liquidoPorHora = min > 0 ? r2(liquido / (min / 60)) : null;
  let nivel;
  if (liquido <= 0) nivel = "ruim";
  else if (minimoHora > 0 && liquidoPorHora !== null) nivel = liquidoPorHora >= minimoHora * 1.15 ? "boa" : liquidoPorHora >= minimoHora * 0.85 ? "media" : "ruim";
  else if (custoKm > 0) nivel = porKm >= custoKm * 2 ? "boa" : porKm >= custoKm * 1.3 ? "media" : "ruim";
  else nivel = "sem-base";
  return { gasto, liquido, porKm, liquidoPorKm, liquidoPorHora, nivel };
}

/**
 * Regra para decorar, porque na hora da corrida o outro app está na tela e não dá para abrir este para calcular:
 * "aceite se pagar pelo menos R$ X por km; abaixo de R$ Y, recuse". Usa os mesmos cortes do "Vale a pena essa corrida?"
 * (boa a 115% do que precisa, ruim abaixo de 85%). `kmPorHora` é a média real do motorista (km rodados / horas); sem ela,
 * a regra olha só o custo do carro por km. Devolve null se não há base nenhuma.
 */
export function regraDeAceite({ custoKm = 0, minimoHora = 0, kmPorHora = 0 }) {
  custoKm = Number(custoKm) || 0; minimoHora = Number(minimoHora) || 0; kmPorHora = Number(kmPorHora) || 0;
  if (minimoHora > 0 && kmPorHora >= 5) { const preciso = custoKm + minimoHora / kmPorHora; return { aceita: r2(preciso * 1.15), recusa: r2(preciso * 0.85), base: "meta" }; }
  if (custoKm > 0) return { aceita: r2(custoKm * 2), recusa: r2(custoKm * 1.3), base: "carro" };
  return null;
}

/**
 * Quanto vale 1 hora de trabalho da pessoa, líquida. Vale o que ela informou (renda por mês e horas por semana);
 * sem isso, o lucro por hora dos turnos do modo motorista (só com pelo menos 2 h trabalhadas, para não chutar).
 */
export function valorDaHora(hora, r30) {
  const renda = Number(hora?.renda) || 0, hs = Number(hora?.horasSemana) || 0;
  if (renda > 0 && hs > 0 && hs <= 100) return { valor: r2(renda / ((hs * 52) / 12)), origem: "informado" };
  if (r30 && r30.ms >= 7200000 && r30.lucroPorHora > 0) return { valor: r30.lucroPorHora, origem: "turnos" };
  return null;
}

/** Quanto tempo de trabalho um valor custa: "42 min", "2h30" ou "41 h". Sem valor da hora, devolve null. */
export function horasDeTrabalho(valor, vh) {
  const v = Number(valor) || 0, h = Number(vh) || 0;
  if (!(v > 0) || !(h > 0)) return null;
  const min = Math.round((v / h) * 60);
  if (min < 1) return "menos de 1 min";
  if (min < 60) return `${min} min`;
  const horas = min / 60;
  return horas >= 10 ? `${Math.round(horas)} h` : `${Math.floor(min / 60)}h${pad(min % 60)}`;
}

/** Quanto cada aplicativo rendeu no período, do maior para o menor, com a parte de cada um no total. */
export function ganhoPorApp(turnos, de, ate) {
  const por = {};
  (turnos || []).filter((t) => t.fim && isoLocal(t.ini) >= de && isoLocal(t.ini) <= ate).forEach((t) => { for (const [k, v] of Object.entries(t.apps || {})) if (Number(v) > 0) por[k] = r2((por[k] || 0) + Number(v)); });
  const total = r2(Object.values(por).reduce((a, b) => a + b, 0));
  return Object.entries(por).map(([app, ganho]) => ({ app, ganho, pct: total > 0 ? Math.round((ganho / total) * 100) : 0 })).sort((a, b) => b.ganho - a.ganho);
}

/** O dia da semana em que a hora rendeu mais (precisa de pelo menos 2 dias diferentes para comparar). Devolve { dia: 0..6, ganhoPorHora } ou null. */
export function melhorDiaDaSemana(turnos, de, ate) {
  const por = new Map();
  (turnos || []).filter((t) => t.fim && isoLocal(t.ini) >= de && isoLocal(t.ini) <= ate).forEach((t) => {
    const d = new Date(t.ini).getDay(), a = por.get(d) || { ganho: 0, ms: 0, datas: new Set() };
    a.ganho += ganhoDoTurno(t); a.ms += duracaoMs(t); a.datas.add(isoLocal(t.ini)); por.set(d, a);
  });
  const cand = [...por.entries()].filter(([, a]) => a.ms >= 3600000).map(([dia, a]) => ({ dia, ganhoPorHora: r2(a.ganho / (a.ms / 3600000)) })).sort((x, y) => y.ganhoPorHora - x.ganhoPorHora);
  return cand.length >= 2 ? cand[0] : null;
}

/**
 * O ritmo real de quem roda: a média dos dias trabalhados nos últimos `janela` dias (turnos encerrados, agrupados por dia).
 * É com isso que a meta é conferida: um número só serve se a pessoa consegue chegar nele.
 */
export function ritmoHistorico(turnos, ate, janela = 30) {
  const ini = isoLocal(new Date(`${ate}T12:00:00`).getTime() - (janela - 1) * 864e5);
  const por = new Map();
  (turnos || []).filter((t) => t.fim && isoLocal(t.ini) >= ini && isoLocal(t.ini) <= ate).forEach((t) => {
    const d = isoLocal(t.ini), a = por.get(d) || { ganho: 0, ms: 0 }; a.ganho += ganhoDoTurno(t); a.ms += duracaoMs(t); por.set(d, a);
  });
  const dias = [...por.values()].filter((a) => a.ganho > 0);
  if (dias.length < 2) return null;
  const ganho = dias.reduce((s, a) => s + a.ganho, 0), ms = dias.reduce((s, a) => s + a.ms, 0);
  return { dias: dias.length, ganhoMedioDia: r2(ganho / dias.length), melhorDia: r2(Math.max(...dias.map((a) => a.ganho))), ganhoPorHora: ms > 0 ? r2(ganho / (ms / 3600000)) : null };
}

/**
 * A meta do dia cabe no seu ritmo? Compara o bruto por dia que a meta pede com a média e o melhor dia da pessoa.
 *  ok: até 10% acima da média · puxado: acima da média, mas dentro do melhor dia · fora: acima do melhor dia · sem-historico: poucos turnos.
 * Também diz quanto sobraria até o fim do mês no ritmo atual (líquido = bruto médio menos o que o carro gasta por dia).
 */
export function alcanceDaMeta({ meta, hist, custoDia = 0 }) {
  if (!meta || meta.coberto || !(meta.brutoDia > 0)) return { nivel: "coberta" };
  if (!hist) return { nivel: "sem-historico" };
  const nivel = meta.brutoDia <= hist.ganhoMedioDia * 1.1 ? "ok" : meta.brutoDia <= hist.melhorDia ? "puxado" : "fora";
  const liquidoMedioDia = r2(hist.ganhoMedioDia - (custoDia || 0)), projeta = r2(Math.max(0, liquidoMedioDia) * meta.dias);
  return { nivel, liquidoMedioDia, projeta, faltaAinda: r2(Math.max(0, meta.falta - projeta)) };
}

/**
 * Quantos km por mês a pessoa realmente roda, pelos turnos dos últimos 30 dias. Só com pelo menos 14 dias de uso (antes disso, o número engana).
 * Serve para atualizar o "Meu carro ou moto" quando ela passa a rodar mais ou menos do que informou. Arredonda de 10 em 10 km.
 */
export function kmRealPorMes(turnos, ate) {
  const t = (turnos || []).filter((x) => x.fim && Number(x.km) > 0 && isoLocal(x.ini) <= ate);
  if (!t.length) return null;
  const dia = (iso) => new Date(`${iso}T12:00:00`).getTime(), primeiro = isoLocal(Math.min(...t.map((x) => x.ini)));
  const dias = Math.min(30, Math.round((dia(ate) - dia(primeiro)) / 864e5) + 1);
  if (dias < 14) return null;
  const ini = isoLocal(dia(ate) - 29 * 864e5), total = t.filter((x) => isoLocal(x.ini) >= ini).reduce((s2, x) => s2 + Number(x.km), 0);
  return Math.round(((total / dias) * 30) / 10) * 10;
}
