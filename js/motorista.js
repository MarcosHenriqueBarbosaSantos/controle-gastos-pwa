/* Modo motorista de aplicativo: contas puras (sem tela), para ficarem fáceis de testar.
 * Um turno é { id, ini, fim, apps:{uber,99,indrive,outros}, viagens, km, comb, rid, cid }:
 * ini e fim em milissegundos; rid e cid são os lançamentos que o turno criou (entrada e combustível). */
import { custoDoVeiculo } from "./extras.js";

const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const pad = (n) => String(n).padStart(2, "0");
export const APPS = [["uber", "Uber"], ["99", "99"], ["indrive", "inDrive"], ["outros", "Outros"]];
export const TIPOS_GASTO = [["comb", "Combustível"], ["pedagio", "Pedágio"], ["estac", "Estacionamento"], ["outros", "Outros"]];
export const MAX_TURNOS = 400;
export const somaValores = (o) => r2(Object.values(o || {}).reduce((t, v) => t + (Number(v) > 0 ? Number(v) : 0), 0));

/** A data (AAAA-MM-DD) de um instante, no fuso do aparelho. */
export const isoLocal = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

export const ganhoDoTurno = (t) => r2(Object.values(t?.apps || {}).reduce((s, v) => s + (Number(v) > 0 ? Number(v) : 0), 0));
export const duracaoMs = (t, agora = Date.now()) => Math.max(0, (t.fim ?? agora) - t.ini);

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
