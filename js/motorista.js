/* Modo motorista de aplicativo: contas puras (sem tela), para ficarem fáceis de testar.
 * Um turno é { id, ini, fim, apps:{uber,99,indrive,outros}, viagensApp, viagens, km, kmPass, kmEst, comb, rid, cid }:
 * ini e fim em milissegundos; rid e cid são os lançamentos que o turno criou (entrada e combustível).
 * km é tudo o que o carro andou, com ou sem passageiro: é sobre ele que o custo do carro incide.
 * kmPass é a parte com passageiro, quando a pessoa informa. kmEst marca o km total que o app estimou. */
import { custoDoVeiculo } from "./extras.js";

const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const pad = (n) => String(n).padStart(2, "0");
export const APPS = [["uber", "Uber"], ["99", "99"], ["indrive", "inDrive"], ["ubermoto", "Uber Moto"], ["99moto", "99Moto"], ["ifood", "iFood"], ["99food", "99Food"], ["rappi", "Rappi"], ["particular", "Particular"], ["outros", "Outros"]];
/** Quem roda de carro não precisa ver os apps de entrega, e quem roda de moto não precisa ver os de carro. */
export const APPS_POR_VEICULO = { carro: ["uber", "99", "indrive", "particular", "outros"], moto: ["ubermoto", "99moto", "ifood", "99food", "rappi", "particular", "outros"] };
export const CATEGORIAS_POR_VEICULO = { carro: ["UberX", "Comfort", "Black", "99Pop", "99Comfort", "inDrive", "Particular"], moto: ["Uber Moto", "99Moto", "iFood", "99Food", "Rappi", "Particular"] };
/** As categorias que competem nos desafios e no ranking. */
export const CATEGORIAS_DESAFIO = { carro: ["UberX", "Comfort", "Black"], moto: CATEGORIAS_POR_VEICULO.moto };
/** Quem pode entrar: sem lista nas regras, todas as categorias. */
export const categoriaPodeEntrar = (regras, categoria) => !regras?.categorias?.length || regras.categorias.includes(categoria);
const CATEGORIAS_POR_APP = { uber: ["UberX", "Comfort", "Black"], 99: ["99Pop", "99Comfort"], indrive: ["inDrive"], particular: ["Particular"], ubermoto: ["Uber Moto"], "99moto": ["99Moto"], ifood: ["iFood"], "99food": ["99Food"], rappi: ["Rappi"] };
/** As categorias em que a pessoa pode rodar, pelos apps que ela escolheu. */
export function categoriasDoPerfil(perfil) { return perfil?.veiculo ? appsDoPerfil(perfil).flatMap(([k]) => CATEGORIAS_POR_APP[k] || []) : []; }
/** A categoria de um turno. Turno antigo, de antes de a categoria existir, usa a do perfil. */
export const categoriaDoTurno = (t, perfil) => t.categoria || perfil?.categoria || "";
/** Os apps que aparecem nos formulários. `usados` mantém visíveis os que já têm valor, para a edição de um turno antigo não perder nada. */
export function appsDoPerfil(perfil, usados = []) {
  const base = perfil?.veiculo ? (perfil.apps?.length ? perfil.apps : APPS_POR_VEICULO[perfil.veiculo] || []) : APPS.map(([k]) => k);
  return APPS.filter(([k]) => base.includes(k) || usados.includes(k));
}
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

/** Quanto de diferença (R$) entre o combustível estimado e o lançado já vale um aviso. */
export const COMB_MIN_AVISO = 50;
/** Gasto de combustível nos lançamentos: o que a pessoa digitou ou o que as jornadas criaram (categoria ou descrição de combustível). */
export const ehCombustivel = (x) => x.tipo === "Despesa" && /combust|gasolin|[aá]lcool|etanol|abastec/i.test(`${x.categoria || ""} ${x.descricao || ""}`);
/**
 * Combustível do mês pelos km rodados: o que deve ter custado (km das jornadas x custo de combustível por km do "Meu carro")
 * contra o que já foi lançado como combustível no mês. Se faltar lançar, `falta` diz quanto.
 * Sem o carro preenchido (km por mês e consumo) ou sem km nas jornadas, devolve null.
 * @returns {{km:number, porKm:number, estimado:number, lancado:number, falta:number, kmMes:number, passouDoKm:boolean}|null}
 */
export function combustivelDoMes(turnos, veic, lancamentos, hoje) {
  const kmMes = Number(veic?.kmMes), r = custoDoVeiculo(veic), comb = r?.partes.find((p) => p.k === "comb");
  if (!(kmMes > 0) || !comb) return null;
  const mes = hoje.slice(0, 7), porKm = comb.valor / kmMes;
  const km = resumoTurnos(turnos, `${mes}-01`, hoje, veic).km;
  if (!(km > 0)) return null;
  const estimado = r2(km * porKm);
  const lancado = r2((lancamentos || []).filter((x) => String(x.data).slice(0, 7) === mes && ehCombustivel(x)).reduce((t, x) => t + (Number(x.valor) || 0), 0));
  return { km, porKm: Math.round(porKm * 10000) / 10000, estimado, lancado, falta: Math.max(0, r2(estimado - lancado)), kmMes, passouDoKm: km > kmMes };
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
  // Os km sem passageiro só valem nos turnos em que a pessoa informou os dois números.
  const comPass = lista.filter((t) => Number(t.kmPass) > 0 && Number(t.km) > 0), kmBase = r2(comPass.reduce((s, t) => s + Number(t.km), 0)), kmPass = r2(comPass.reduce((s, t) => s + Number(t.kmPass), 0));
  const kmVazio = r2(Math.max(0, kmBase - kmPass)), ganhoBase = r2(comPass.reduce((s, t) => s + ganhoDoTurno(t), 0));
  return { n: lista.length, ganho, km, viagens, comb, ms, custo, lucro, comCarro: Boolean(porKm && km > 0),
    kmBase, kmPass, kmVazio, pctVazio: kmBase > 0 ? Math.round((kmVazio / kmBase) * 100) : null, custoVazio: porKm ? r2(kmVazio * porKm) : null,
    ganhoPorKmPass: kmPass > 0 ? r2(ganhoBase / kmPass) : null, kmEstimado: lista.some((t) => t.kmEst),
    ganhoPorHora: horas > 0 ? r2(ganho / horas) : null, lucroPorHora: horas > 0 ? r2(lucro / horas) : null,
    ganhoPorKm: km > 0 ? r2(ganho / km) : null, lucroPorKm: km > 0 ? r2(lucro / km) : null,
    ganhoPorViagem: viagens > 0 ? r2(ganho / viagens) : null };
}

/**
 * "Sua semana", no domingo e na segunda: a semana de segunda a domingo que está terminando (domingo) ou que acabou (segunda),
 * com a semana anterior para comparar. Sem jornada na semana, devolve null.
 */
export function semanaDoMotorista(turnos, hoje, veic) {
  const dw = data(hoje).getDay(); if (dw > 1) return null;
  const ref = dw === 0 ? hoje : andaPeriodo("dia", hoje, -1), { de, ate } = periodoDe("semana", ref);
  const r = resumoTurnos(turnos, de, ate, veic); if (!r.n) return null;
  const a = periodoDe("semana", andaPeriodo("semana", ref, -1)), antes = resumoTurnos(turnos, a.de, a.ate, veic);
  return { de, ate, ref, r, antes: antes.n ? antes : null, dif: antes.n ? r2(r.lucro - antes.lucro) : null, acabou: dw === 1 };
}

/** Sem histórico da pessoa, considera 40% dos km sem passageiro: o estudo de Henao e Marshall, em Denver, mediu 40,8% como piso. */
export const VAZIO_PADRAO = 40;
/** A parte dos km que a pessoa roda sem passageiro, nos últimos 30 dias. Com menos de 3 turnos informados, devolve null. */
export function vazioDoMotorista(turnos, hoje) {
  const [a, m, d] = hoje.split("-").map(Number), de = isoLocal(new Date(a, m - 1, d - 29).getTime());
  const lista = (turnos || []).filter((t) => t.fim && !t.kmEst && Number(t.kmPass) > 0 && Number(t.km) > 0 && isoLocal(t.ini) >= de && isoLocal(t.ini) <= hoje);
  if (lista.length < 3) return null;
  const total = lista.reduce((s, t) => s + Number(t.km), 0), pass = lista.reduce((s, t) => s + Number(t.kmPass), 0);
  return Math.round((Math.max(0, total - pass) / total) * 100);
}
/** Só sabe os km com passageiro: estima o total pelo histórico da pessoa, para o custo do carro não ficar menor do que é. */
export const kmTotalEstimado = (kmPass, pctVazio = VAZIO_PADRAO) => r2(kmPass / (1 - Math.min(90, Math.max(0, pctVazio)) / 100));
/** Quanto a corrida precisa pagar por km para o dia inteiro, contando os km sem passageiro, render `valorKm`. */
export const porKmComVazio = (valorKm, pctVazio) => r2(valorKm / (1 - Math.min(90, Math.max(0, pctVazio)) / 100));

const data = (iso) => { const [a, m, d] = iso.split("-").map(Number); return new Date(a, m - 1, d); };
const fimDoMes = (a, m) => isoLocal(new Date(a, m + 1, 0).getTime());
/** O começo e o fim do dia, da semana (segunda a domingo), do mês ou do ano em que `iso` está. */
export function periodoDe(per, iso) {
  const d = data(iso), a = d.getFullYear(), m = d.getMonth();
  if (per === "semana") { const seg = new Date(a, m, d.getDate() - ((d.getDay() + 6) % 7)); return { de: isoLocal(seg.getTime()), ate: isoLocal(new Date(seg.getFullYear(), seg.getMonth(), seg.getDate() + 6).getTime()) }; }
  if (per === "mes") return { de: isoLocal(new Date(a, m, 1).getTime()), ate: fimDoMes(a, m) };
  if (per === "ano") return { de: `${a}-01-01`, ate: `${a}-12-31` };
  return { de: iso, ate: iso };
}
/** A mesma data no período anterior (n = -1) ou no seguinte (n = 1). Mês e ano caem no dia 1, para não pular meses curtos. */
export function andaPeriodo(per, iso, n) {
  const d = data(iso), a = d.getFullYear(), m = d.getMonth();
  if (per === "semana") return isoLocal(new Date(a, m, d.getDate() + 7 * n).getTime());
  if (per === "mes") return isoLocal(new Date(a, m + n, 1).getTime());
  if (per === "ano") return `${a + n}-01-01`;
  return isoLocal(new Date(a, m, d.getDate() + n).getTime());
}
const NOMES_DIA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"], NOMES_MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
/**
 * As barras do gráfico de ganhos: os 7 dias da semana (no dia e na semana), as semanas do mês ou os meses do ano.
 * Cada barra diz para onde o toque leva (`per` e `iso`) e se é a que está aberta.
 */
export function barrasDoPeriodo(turnos, per, iso, veic) {
  const barra = (de, ate, rot, sub, destino, alvo, atual) => { const r = resumoTurnos(turnos, de, ate, veic); return { de, ate, rot, sub, per: destino, iso: alvo, atual, ganho: r.ganho, lucro: r.lucro, n: r.n }; };
  const { de } = periodoDe(per === "dia" ? "semana" : per, iso);
  if (per === "dia" || per === "semana") return Array.from({ length: 7 }, (_, i) => { const d = data(de), x = isoLocal(new Date(d.getFullYear(), d.getMonth(), d.getDate() + i).getTime()); return barra(x, x, NOMES_DIA[data(x).getDay()], x.slice(8, 10), "dia", x, per === "dia" && x === iso); });
  if (per === "ano") return Array.from({ length: 12 }, (_, i) => { const m = `${de.slice(0, 4)}-${pad(i + 1)}-01`, p = periodoDe("mes", m); return barra(p.de, p.ate, NOMES_MES[i], "", "mes", m, false); });
  const fim = periodoDe("mes", iso).ate, lista = []; let ini = de;
  while (ini <= fim) { const p = periodoDe("semana", ini), ate = p.ate < fim ? p.ate : fim; lista.push(barra(ini, ate, ini === ate ? ini.slice(8, 10) : `${ini.slice(8, 10)}–${ate.slice(8, 10)}`, "", "semana", ini, false)); ini = andaPeriodo("dia", ate, 1); }
  return lista;
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
  // Sem ganho informado não há o que julgar: dizer "abaixo" só porque a pessoa ainda não contou quanto fez desanima à toa.
  const veredito = ganho > 0 && liquidoPorHora !== null && minimo > 0 && h >= 0.25 ? (liquidoPorHora >= minimo ? "bom" : "abaixo") : null;
  return { liquido, porHora: ok ? r2(ganho / h) : null, liquidoPorHora, minimo, veredito };
}

/**
 * O print da tela de ganhos de um app (lido pela câmera): de qual app é e quanto mostra.
 * O valor é o que vem logo depois de "ganhos", "total", "hoje" ou "saldo"; sem isso, o maior valor em reais da tela.
 * `apps` são as chaves que a pessoa usa (["uber", "99"]): o app só é reconhecido se estiver entre elas.
 */
export function ganhosDoPrint(texto, apps = []) {
  const t = String(texto || ""), baixo = t.toLowerCase();
  const nomes = [["ubermoto", /uber\s*moto\b/], ["99moto", /99\s*moto\b/], ["99food", /99\s*food\b/], ["indrive", /in\s*drive/], ["ifood", /ifood/], ["uber", /\buber\b/], ["99", /\b99\b(?!\s*(moto|food)\b)/]];
  const app = nomes.find(([k, re]) => apps.includes(k) && re.test(baixo))?.[0] || null;
  const valores = [...t.matchAll(/R\$\s*([\d.]{1,9},\d{2})/g)].map((x) => ({ i: x.index, v: Number(x[1].replace(/\./g, "").replace(",", ".")) })).filter((x) => x.v > 0 && x.v < 100000);
  if (!valores.length) return null;
  const chave = /(ganhos?|total|hoje|saldo)/gi; let perto = null;
  for (const k of baixo.matchAll(chave)) { const depois = valores.find((x) => x.i > k.index && x.i - k.index < 60); if (depois) { perto = depois; break; } }
  return { app, valor: r2((perto || valores.reduce((a, b) => (b.v > a.v ? b : a))).v) };
}

/** Horas digitadas de um jeito simples ("8", "8:30", "8h30" ou "8,5") em milissegundos. Devolve null se não der para entender. */
export function lerHoras(txt) {
  const s = String(txt ?? "").trim().toLowerCase().replace(/\s/g, "");
  const m = s.match(/^(\d{1,2})(?:[:h](\d{1,2})?)?$/), d = s.match(/^(\d{1,2})[.,](\d{1,2})$/);
  const h = m ? Number(m[1]) + (Number(m[2]) || 0) / 60 : d ? Number(`${d[1]}.${d[2]}`) : NaN;
  if (m && Number(m[2]) >= 60) return null;
  return h > 0 && h <= 24 ? Math.round(h * 3600000) : null;
}

/** O resultado de um dia lançado: quanto rendeu por hora, por km e por viagem, antes de salvar. */
export function contaDoDia({ ganho = 0, gasto = 0, km = 0, viagens = 0, ms = 0 }) {
  const horas = ms / 3600000, sobra = r2(ganho - gasto);
  return { sobra, porHora: horas > 0 ? r2(ganho / horas) : null, porKm: km > 0 ? r2(ganho / km) : null, porViagem: viagens > 0 ? r2(ganho / viagens) : null, sobraPorHora: horas > 0 ? r2(sobra / horas) : null };
}

/** O resultado separado por categoria, da que rende mais por hora para a que rende menos. */
export function resultadoPorCategoria(turnos, de, ate, veic, perfil) {
  const nomes = [...new Set((turnos || []).map((t) => categoriaDoTurno(t, perfil)).filter(Boolean))];
  return nomes.map((categoria) => ({ categoria, ...resumoTurnos(turnos.filter((t) => categoriaDoTurno(t, perfil) === categoria), de, ate, veic) }))
    .filter((r) => r.n).sort((a, b) => (b.ganhoPorHora ?? 0) - (a.ganhoPorHora ?? 0));
}
const MIN_JORNADA_MS = 15 * 60000, MAX_GANHO_HORA = 200, MAX_KM_HORA = 110;
/**
 * O que vale nos desafios e no ranking: só jornada iniciada no app e não mexida depois.
 * Dia digitado à mão, jornada de menos de 15 minutos ou números fora do possível (mais de R$ 200 por hora ou de 110 km/h de média) ficam de fora.
 */
export function turnoValeNoDesafio(t) {
  if (!t?.fim || t.manual) return false;
  const ms = duracaoMs(t), horas = ms / 3600000;
  return ms >= MIN_JORNADA_MS && ganhoDoTurno(t) / horas <= MAX_GANHO_HORA && (Number(t.km) || 0) / horas <= MAX_KM_HORA;
}
/** As linhas do placar: uma por dia e categoria, com os totais que saem da conta da pessoa quando ela participa de um desafio ou do ranking. */
export function placarDosDias(turnos, dias, veic, perfil) {
  const porKm = custoTotalPorKm(veic) || 0;
  return dias.flatMap((dia) => {
    const doDia = (turnos || []).filter((t) => turnoValeNoDesafio(t) && isoLocal(t.ini) === dia);
    return [...new Set(doDia.map((t) => categoriaDoTurno(t, perfil)))].map((categoria) => {
      const r = resumoTurnos(doDia.filter((t) => categoriaDoTurno(t, perfil) === categoria), dia, dia, veic);
      return { dia, categoria, ganho: r.ganho, gastos: r.comb, custoCarro: r2(r.km * porKm), km: r.km, ms: r.ms, viagens: r.viagens, lucro: r.lucro };
    });
  });
}

/** O que a pessoa fez no período de teste, para ela ver o que perde se parar. Devolve null se ainda não rodou. */
export function resumoDoTeste(turnos, de, ate, veic) {
  const r = resumoTurnos(turnos, de, ate, veic);
  return r.n ? { jornadas: r.n, ganho: r.ganho, horas: Math.round(r.ms / 3600000), porHora: r.ms >= 1800000 ? r.ganhoPorHora : null, porKm: r.ganhoPorKm, lucro: r.lucro, comCarro: r.comCarro } : null;
}

/* ---------- Desafios entre amigos ---------- */
export const CRITERIOS_DESAFIO = [["hora", "Por hora"], ["km", "Por km"], ["sobra", "O que sobrou"], ["total", "Faturamento"], ["dia", "Melhor dia"]];
/** Como se decide quem vence. Geral soma os pontos de por hora, por km e o que sobrou: rodar mais horas, sozinho, não ganha. */
export const VENCE_DESAFIO = [["km", "Lucro por km"], ["geral", "Pontuação geral"], ["hora", "Por hora"], ["sobra", "O que sobrou"], ["total", "Faturamento"]];
/** As regras em palavras, iguais para quem cria, para quem é convidado e dentro do desafio. */
export function regrasEmTexto(regras = {}) {
  const vence = VENCE_DESAFIO.find(([k]) => k === regras.vence)?.[1] || "Lucro por km";
  return [
    `Quem vence: ${vence}${regras.vence === "geral" ? " (soma os pontos de por hora, por km e o que sobrou)" : ""}.`,
    regras.categorias?.length ? `Quem pode entrar: ${regras.categorias.join(", ").replace(/, ([^,]*)$/, " e $1")}.` : "Quem pode entrar: todas as categorias.",
    regras.gastos ? "Entra na conta: combustível, pedágio e os outros gastos lançados." : "Não entra na conta: combustível, pedágio e outros gastos.",
    regras.carro ? "Entra na conta: custo do carro por km (manutenção, seguro e desgaste)." : "Não entra na conta: custo do carro.",
    "Faturamento é sempre o valor bruto. Por hora, por km, o que sobrou e melhor dia seguem as regras acima.",
    "Só contam as jornadas iniciadas e encerradas no app. Dia lançado à mão ou jornada editada depois não entram.",
    "Cada pessoa informa os próprios ganhos, e números fora do possível ficam de fora.",
    "Depois de criado, o desafio não muda de regras.",
  ];
}
/**
 * Soma o período de cada participante, descontando só o que as regras do desafio mandam: a regra vale igual para todos.
 * Só conta o por hora de quem rodou pelo menos 1 hora, para uma corrida só não vencer o desafio.
 * diasSemGasto: dias com ganho e nenhum gasto lançado, para o grupo ver quem pode estar de fora da regra.
 */
export function totaisDoDesafio(membros, regras = {}) {
  return (membros || []).map((m) => {
    // Quem rodou em duas categorias no mesmo dia tem duas linhas: o dia conta uma vez só.
    const porDia = new Map();
    (m.dias || []).filter((d) => !d.categoria || categoriaPodeEntrar(regras, d.categoria)).forEach((d, i) => {   // só conta o que foi rodado nas categorias do desafio
      const k = d.dia ?? i, a = porDia.get(k);
      porDia.set(k, a ? { ...a, ...Object.fromEntries(["ganho", "gastos", "custoCarro", "km", "ms", "viagens"].map((c) => [c, (Number(a[c]) || 0) + (Number(d[c]) || 0)])) } : d);
    });
    const dias = [...porDia.values()].map((d) => {
      const ganho = Number(d.ganho) || 0, gastos = Number(d.gastos) || 0, custoCarro = Number(d.custoCarro) || 0;
      return { ganho, gastos, custoCarro, km: Number(d.km) || 0, ms: Number(d.ms) || 0, viagens: Number(d.viagens) || 0, sobra: ganho - (regras.gastos ? gastos : 0) - (regras.carro ? custoCarro : 0) };
    });
    const soma = (k) => dias.reduce((t, d) => t + d[k], 0), ganho = r2(soma("ganho")), sobra = r2(soma("sobra")), km = r2(soma("km")), ms = soma("ms");
    return { ...m, ganho, sobra, km, ms, viagens: soma("viagens"), diasRodados: dias.length, melhorDia: r2(Math.max(0, ...dias.map((d) => d.sobra))),
      diasSemGasto: regras.gastos ? dias.filter((d) => d.ganho > 0 && d.gastos === 0).length : 0, semCustoCarro: Boolean(regras.carro && dias.some((d) => d.km > 0 && d.custoCarro === 0)),
      porHora: ms >= 3600000 ? r2(sobra / (ms / 3600000)) : null, porKm: km > 0 ? r2(sobra / km) : null };
  });
}
const VALOR_DO_CRITERIO = { hora: (m) => m.porHora, km: (m) => m.porKm, sobra: (m) => (m.diasRodados ? m.sobra : null), total: (m) => (m.ganho > 0 ? m.ganho : null), dia: (m) => (m.melhorDia > 0 ? m.melhorDia : null) };
/** Pontos de cada um: em cada critério, o primeiro de N pessoas leva N pontos, o segundo N-1, e quem não tem o número não pontua. */
function pontosGerais(totais) {
  const pontos = new Map(totais.map((m) => [m, 0]));
  for (const c of ["hora", "km", "sobra"]) {
    const lista = totais.filter((m) => VALOR_DO_CRITERIO[c](m) !== null).sort((a, b) => VALOR_DO_CRITERIO[c](b) - VALOR_DO_CRITERIO[c](a));
    lista.forEach((m, i) => { const empate = i > 0 && VALOR_DO_CRITERIO[c](lista[i - 1]) === VALOR_DO_CRITERIO[c](m); const antes = empate ? lista.findIndex((x) => VALOR_DO_CRITERIO[c](x) === VALOR_DO_CRITERIO[c](m)) : i; pontos.set(m, pontos.get(m) + totais.length - antes); });
  }
  return pontos;
}
/** A classificação por um critério: quem ainda não tem o número fica no fim, sem posição. Empate divide a posição. */
export function rankingDoDesafio(totais, criterio) {
  const pontos = criterio === "geral" ? pontosGerais(totais) : null;
  const val = pontos ? (m) => pontos.get(m) || null : VALOR_DO_CRITERIO[criterio] || VALOR_DO_CRITERIO.hora;
  const lista = totais.map((m) => ({ ...m, valor: val(m) })).sort((a, b) => (b.valor ?? -1) - (a.valor ?? -1));
  let pos = 0;
  return lista.map((m, i) => { if (m.valor === null) return { ...m, pos: null }; if (i === 0 || lista[i - 1].valor !== m.valor) pos = i + 1; return { ...m, pos }; });
}
/**
 * Quanto falta para a pessoa passar quem está logo à frente dela no ranking (o próximo acima, de valor maior).
 * @returns {null | {apelido: string, falta: number, pos: number}} null se ela lidera, ainda não pontuou ou ninguém está à frente.
 */
export function faltaParaPassar(rank) {
  const eu = (rank || []).find((x) => x.eu);
  if (!eu || !eu.pos || eu.pos === 1 || eu.valor === null) return null;
  const acima = (rank || []).filter((x) => x.valor !== null && x.valor > eu.valor).sort((a, b) => a.valor - b.valor)[0];
  return acima ? { apelido: acima.apelido, falta: Math.round((acima.valor - eu.valor) * 100) / 100, pos: eu.pos } : null;
}
/** Onde a pessoa ganhou e onde perdeu do líder: mostra que rodar mais não basta. */
export function motivoDoPlacar(totais, criterio) {
  const rank = rankingDoDesafio(totais, criterio), eu = rank.find((m) => m.eu), lider = rank[0];
  if (!eu?.pos || !lider || lider.eu) return "";
  const nomes = { hora: "por hora", km: "por km", sobra: "no que sobrou" }, compara = (c) => { const a = VALOR_DO_CRITERIO[c](eu), b = VALOR_DO_CRITERIO[c](lider); return a === null || b === null || a === b ? null : a > b; };
  const ganhou = Object.keys(nomes).filter((c) => compara(c) === true).map((c) => nomes[c]), perdeu = Object.keys(nomes).filter((c) => compara(c) === false).map((c) => nomes[c]);
  if (ganhou.length && perdeu.length) return `Você ganhou de ${lider.apelido} ${ganhou.join(" e ")}, mas perdeu ${perdeu.join(" e ")}.`;
  return perdeu.length ? `${lider.apelido} está à sua frente ${perdeu.join(" e ")}.` : "";
}
/** A graça do desafio: quem faturou mais nem sempre foi quem ganhou mais. */
export function destaqueDoDesafio(totais) {
  const fat = rankingDoDesafio(totais, "total")[0], hora = rankingDoDesafio(totais, "hora")[0];
  if (totais.filter((m) => m.ganho > 0).length < 2 || !fat?.pos || !hora?.pos) return "";
  return fat.apelido === hora.apelido ? `${fat.apelido} lidera no faturamento e por hora.` : `${fat.apelido} faturou mais, mas ${hora.apelido} ganhou mais por hora.`;
}

const RENDA_MINIMA_RESERVA = 3500;
/**
 * Salário de autônomo: quanto guardar por mês e por dia rodado para o que nenhuma empresa paga.
 * O veículo vem do "Meu carro ou moto"; a desvalorização é o que ele perde de valor, a base para trocar de carro.
 * Férias e 13º valem um mês de renda, divididos em 12. A base é o lucro médio, e nunca menos de R$ 3.500:
 * mesmo parado, a pessoa continua pagando o carro e as contas.
 */
export function reservasDoMotorista(veic, { diasSemana = 6, lucroMes = 0, veiculo = "carro" } = {}) {
  const r = custoDoVeiculo(veic), parte = (...ks) => ks.reduce((t, k) => t + (r?.partes.find((p) => p.k === k)?.valor || 0), 0);
  const diasMes = Math.max(1, Math.round((Math.min(7, Math.max(1, Number(diasSemana) || 6)) * 52) / 12)), nome = veiculo === "moto" ? "moto" : "carro", umDozeAvos = Math.max(RENDA_MINIMA_RESERVA, Number(lucroMes) || 0) / 12;
  const itens = [["manut", `Manutenção ${veiculo === "moto" ? "da moto" : "do carro"}`, "Óleo, pneus e revisão", parte("manut")],
    ["docs", "IPVA e licenciamento", "A conta que chega de uma vez no começo do ano", parte("ipva", "lic")],
    ["seguro", "Seguro", "Para renovar sem aperto", parte("seguro")],
    ["troca", `Trocar de ${nome}`, `O que ${veiculo === "moto" ? "a moto perde" : "o carro perde"} de valor todo mês`, parte("desval")],
    ["ferias", "Férias", "Um mês parado sem perder renda", umDozeAvos],
    ["decimo", "13º salário", "O seu próprio 13º, em dezembro", umDozeAvos]]
    .filter(([, , , v]) => v > 0).map(([k, nomeItem, sub, v]) => ({ k, nome: nomeItem, sub, porMes: r2(v), porDia: r2(v / diasMes) }));
  const porMes = r2(itens.reduce((t, x) => t + x.porMes, 0));
  return { itens, porMes, porDia: r2(porMes / diasMes), diasMes, temVeiculo: Boolean(r) };
}

/** A caixinha única da reserva do carro, e as partes que entram nela. O combustível fica de fora: sai do bolso a cada abastecimento. */
export const NOME_RESERVA_CARRO = "Reserva do carro";
export const PARTES_DO_CARRO = ["manut", "docs", "seguro", "troca", "ferias", "decimo"];
/** Quais partes ligam sozinhas: as do carro. Férias e 13º a pessoa liga se quiser. */
export const PARTES_PADRAO = { manut: true, docs: true, seguro: true, troca: true, ferias: false, decimo: false };
/** As caixinhas separadas de antes (uma por parte), que "Juntar numa caixinha só" traz para a Reserva do carro. */
export const NOMES_ANTIGOS = ["Manutenção do carro", "Manutenção da moto", "IPVA e licenciamento", "Seguro", "Trocar de carro", "Trocar de moto", "Férias", "13º salário"];
/**
 * A reserva do carro neste mês, numa caixinha só ("Reserva do carro"): quanto devia estar separado (o custo por dia rodado das partes ligadas
 * vezes os dias rodados) contra o que a pessoa guardou nela (lançamentos de "Reserva" dessa categoria, menos as retiradas).
 * `partes` diz quais partes entram (padrão: as do carro). estado: "sem" = nada ligado nem guardado; "abaixo" = guardou menos que devia; "ok" = em dia.
 * Sem o carro preenchido, devolve null.
 * @returns {{itens:object[], todas:object[], porMes:number, porDia:number, diasRodados:number, devia:number, guardou:number, falta:number, estado:"sem"|"abaixo"|"ok", ligado:boolean}|null}
 */
export function reservaDoCarro(veic, { turnos = [], lancamentos = [], hoje, diasSemana = 6, veiculo = "carro", ativas = {}, partes = null, lucroMes = 0 } = {}) {
  const d = reservasDoMotorista(veic, { diasSemana, veiculo, lucroMes }), todas = d.itens.filter((x) => PARTES_DO_CARRO.includes(x.k));
  const flags = { ...PARTES_PADRAO, ...(partes || {}) }, itens = todas.filter((x) => flags[x.k]);
  if (!d.temVeiculo || !todas.length) return null;
  const mes = hoje.slice(0, 7), nomes = new Set([NOME_RESERVA_CARRO, ...(ativas.carro ? [] : todas.map((x) => x.nome))]);
  const porMes = r2(itens.reduce((t, x) => t + x.porMes, 0)), porDia = r2(porMes / d.diasMes);
  const diasRodados = new Set((turnos || []).filter((t) => t.fim && isoLocal(t.ini).slice(0, 7) === mes && isoLocal(t.ini) <= hoje).map((t) => isoLocal(t.ini))).size;
  const devia = r2(porDia * diasRodados);
  const guardou = r2((lancamentos || []).filter((x) => x.tipo === "Reserva" && nomes.has(x.categoria) && String(x.data).slice(0, 7) === mes && x.forma !== "Já tinha")
    .reduce((t, x) => t + (x.forma === "Retirada" ? -1 : 1) * (Number(x.valor) || 0), 0));
  const ligado = Boolean(ativas.carro) || todas.some((x) => ativas[x.k]), falta = Math.max(0, r2(devia - guardou));
  return { itens, todas, porMes, porDia, diasRodados, devia, guardou, falta, ligado, estado: !ligado && guardou <= 0 ? "sem" : falta >= 20 ? "abaixo" : "ok" };
}

/**
 * A meta do dia contra os km: no seu ritmo (R$ por km e km por dia dos últimos 30 dias), dá para fazer a meta?
 * Se não dá, diz quantos km por dia faltam ou quanto cada km precisaria render. Meta coberta ou sem histórico: null.
 * @returns {{brutoDia:number, kmAtual:number, ganhoPorKm:number, fazPorDia:number, kmPreciso:number, faltaKm:number, ganhoKmPreciso:number}|null}
 */
export function metaVsKm({ meta, turnos = [], hoje, veic, diasSemana = 6 } = {}) {
  if (!meta || meta.coberto || !(meta.brutoDia > 0)) return null;
  const de = isoLocal(Date.parse(`${hoje}T12:00:00`) - 29 * 864e5), r30 = resumoTurnos(turnos, de, hoje, veic), kmAtual = kmPorDia(turnos, veic, diasSemana);
  if (!(r30.ganhoPorKm > 0) || !(kmAtual > 0)) return null;
  const fazPorDia = r2(kmAtual * r30.ganhoPorKm);
  if (fazPorDia >= meta.brutoDia) return null;
  return { brutoDia: meta.brutoDia, kmAtual, ganhoPorKm: r30.ganhoPorKm, fazPorDia, kmPreciso: r2(meta.brutoDia / r30.ganhoPorKm), faltaKm: r2(meta.brutoDia / r30.ganhoPorKm - kmAtual), ganhoKmPreciso: r2(meta.brutoDia / kmAtual) };
}

/**
 * "Essa corrida vale?": o valor, os km e os minutos da oferta contra o mínimo por km da pessoa (custo do carro + R$ 1,00) e o mínimo por hora.
 * É uma conta que a pessoa faz em 10 segundos antes de aceitar; o app não lê nem mexe no app da Uber ou da 99.
 * Veredito: "boa" (passa da faixa boa por km e do mínimo por hora), "vale" (passa dos dois mínimos), "limite" (até 10% abaixo de um deles) ou "nao".
 * @returns {{veredito:"boa"|"vale"|"limite"|"nao", porKm:number, porHora:number|null, minKm:number, minHora:number, faltaKm:number, valorMinimo:number}|null}
 */
export function corridaVale({ valor, km, min = 0 }, { minimo = 0, boa = 0 } = {}, minimoHora = 0) {
  valor = Number(valor); km = Number(km); min = Number(min) || 0; minimoHora = Number(minimoHora) || 0;
  if (!(valor > 0) || !(km > 0)) return null;
  const porKm = r2(valor / km), porHora = min > 0 ? r2(valor / (min / 60)) : null;
  const passaKm = porKm >= minimo, passaHora = minimoHora <= 0 || porHora === null || porHora >= minimoHora;
  const quase = (porKm >= minimo * 0.9) && (minimoHora <= 0 || porHora === null || porHora >= minimoHora * 0.9);
  const veredito = passaKm && passaHora ? (porKm >= boa && boa > 0 ? "boa" : "vale") : quase ? "limite" : "nao";
  return { veredito, porKm, porHora, minKm: r2(minimo), minHora: r2(minimoHora), valorMinimo: r2(Math.max(minimo * km, minimoHora > 0 && min > 0 ? minimoHora * (min / 60) : 0)), faltaKm: r2(Math.max(0, minimo - porKm)) };
}

/** Quantas ofertas o app guarda no histórico (as mais recentes). */
export const MAX_OFERTAS = 300;
/** A faixa do dia de um instante: madrugada (0h às 6h), manhã, tarde (12h às 18h) ou noite. */
export const faixaDoDia = (ms) => { const h = new Date(ms).getHours(); return h < 6 ? "Madrugada" : h < 12 ? "Manhã" : h < 18 ? "Tarde" : "Noite"; };
/**
 * O que o histórico de ofertas (as que a pessoa conferiu em "Essa corrida vale?" e marcou como aceita ou recusada) mostra:
 * quantas aceitou e recusou, quantas aceitas ficaram abaixo do mínimo por km (e quanto deixou de ganhar), quantas recusadas passavam do mínimo,
 * e em que faixa do dia as ofertas pagaram mais por km (só com 3 ofertas ou mais na faixa e pelo menos duas faixas).
 * @returns {{total:number, aceitas:number, recusadas:number, abaixoAceitas:number, perdaAbaixo:number, boasRecusadas:number, mediaAceitas:number|null, mediaRecusadas:number|null, faixas:{faixa:string,n:number,media:number}[], melhorFaixa:{faixa:string,media:number}|null}|null}
 */
export function resumoDasOfertas(ofertas = [], minimoKm = 0) {
  const l = (ofertas || []).filter((o) => Number(o.valor) > 0 && Number(o.km) > 0 && (o.acao === "aceitei" || o.acao === "recusei"));
  if (!l.length) return null;
  const porKm = (o) => Number(o.valor) / Number(o.km), media = (a) => (a.length ? r2(a.reduce((s, o) => s + porKm(o), 0) / a.length) : null);
  const aceitas = l.filter((o) => o.acao === "aceitei"), recusadas = l.filter((o) => o.acao === "recusei");
  const abaixo = aceitas.filter((o) => porKm(o) < minimoKm);
  const grupos = new Map();
  l.forEach((o) => { const f = faixaDoDia(o.t), g = grupos.get(f) || []; g.push(o); grupos.set(f, g); });
  const faixas = ["Madrugada", "Manhã", "Tarde", "Noite"].filter((f) => grupos.has(f)).map((f) => ({ faixa: f, n: grupos.get(f).length, media: media(grupos.get(f)) }));
  const com = faixas.filter((x) => x.n >= 3), melhor = com.length >= 2 ? com.reduce((a, b) => (b.media > a.media ? b : a)) : null;
  return { total: l.length, aceitas: aceitas.length, recusadas: recusadas.length, abaixoAceitas: abaixo.length, perdaAbaixo: r2(abaixo.reduce((s, o) => s + (minimoKm * Number(o.km) - Number(o.valor)), 0)),
    boasRecusadas: recusadas.filter((o) => porKm(o) >= minimoKm).length, mediaAceitas: media(aceitas), mediaRecusadas: media(recusadas), faixas, melhorFaixa: melhor ? { faixa: melhor.faixa, media: melhor.media } : null };
}

/** A frase do dia do motorista: uma resposta só, no alto da tela. `brl` formata o dinheiro. */
export function fraseDoDia({ meta, ganhoHoje = 0, brl, semContas = false }) {
  if (semContas) return { titulo: "Falta cadastrar suas contas.", sub: "Com elas, o app calcula quanto fazer por dia." };
  if (meta.coberto) return { titulo: "Suas contas do mês estão cobertas.", sub: "O que você rodar agora é sobra." };
  if (ganhoHoje >= meta.brutoDia) return { titulo: "Meta de hoje batida.", sub: `Você fez ${brl(ganhoHoje)}. O que passar disso adianta os próximos dias.` };
  if (ganhoHoje > 0) return { titulo: `Faltam ${brl(r2(meta.brutoDia - ganhoHoje))} para a meta de hoje.`, sub: `A meta do dia é ${brl(meta.brutoDia)}.` };
  return { titulo: `Hoje, faça ${brl(meta.brutoDia)} para o mês fechar.`, sub: "Estimativa com as suas contas e o custo do veículo." };
}

/** A conta que pede atenção agora: as atrasadas primeiro, depois a próxima a vencer. Sem nada a pagar, devolve null. */
export function linhaDasContas({ proximas = [], atraso = { itens: [], total: 0 }, brl }) {
  const n = atraso.itens.length;
  if (n) return { tom: "bad", titulo: n === 1 ? "1 conta atrasada" : `${n} contas atrasadas`, valor: brl(atraso.total), quando: "Resolver" };
  const x = proximas.filter((c) => c.dias >= 0 && c.valor > 0).sort((a, b) => a.dias - b.dias)[0];
  if (!x) return null;
  return { tom: x.dias <= 3 ? "warn" : "ok", titulo: x.titulo, valor: brl(x.valor), quando: x.dias === 0 ? "vence hoje" : x.dias === 1 ? "vence amanhã" : `vence em ${x.dias} dias` };
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
/** Sem saber o custo do carro, ganhar menos que isto por km não compensa. */
export const PISO_POR_KM = 1;
/** Com o custo do carro por km conhecido, a corrida só vale se sobrar pelo menos isto a mais em cada km. */
export const EXTRA_POR_KM = 1;
/** Corrida de bom valor para quem roda de aplicativo: de R$ 2,00 por km para cima o motorista pode aceitar sem pensar. */
export const BOA_POR_KM = 2;
export function regraDeAceite({ custoKm = 0, minimoHora = 0, kmPorHora = 0 }) {
  custoKm = Number(custoKm) || 0; minimoHora = Number(minimoHora) || 0; kmPorHora = Number(kmPorHora) || 0;
  // O mínimo é só isto: o custo do carro por km mais R$ 1,00 (sem custo do carro, o piso de R$ 1,00 por km).
  const minimo = custoKm > 0 ? r2(custoKm + EXTRA_POR_KM) : PISO_POR_KM;
  // "Corrida boa": o que a meta do dia pede por km (se der para calcular) ou R$ 2,00, o que for maior.
  const daMeta = minimoHora > 0 && kmPorHora >= 5 ? r2((custoKm + minimoHora / kmPorHora)) : 0;
  let boa = Math.max(BOA_POR_KM, daMeta); if (boa <= minimo) boa = minimo + 0.2;   // a faixa boa fica sempre acima do mínimo
  return { minimo, boa: r2(boa), custoKm: r2(custoKm), base: custoKm > 0 ? (daMeta ? "meta" : "carro") : "minimo" };
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
/** Os últimos `n` dias até `ate` ("AAAA-MM-DD"), do mais antigo ao mais novo: ganho e lucro de cada dia (zero no dia sem turno). */
export function ganhosPorDia(turnos, ate, veic, n = 7) {
  const [a, m, d] = ate.split("-").map(Number), dias = [];
  for (let i = n - 1; i >= 0; i--) { const dt = new Date(a, m - 1, d - i); dias.push(isoLocal(dt.getTime())); }
  return dias.map((iso) => { const r = resumoTurnos(turnos, iso, iso, veic); return { iso, ganho: r.ganho, lucro: r.lucro, n: r.n }; });
}

export function ganhoPorApp(turnos, de, ate) {
  const por = {}, viagens = {};
  (turnos || []).filter((t) => t.fim && isoLocal(t.ini) >= de && isoLocal(t.ini) <= ate).forEach((t) => {
    for (const [k, v] of Object.entries(t.apps || {})) if (Number(v) > 0) por[k] = r2((por[k] || 0) + Number(v));
    for (const [k, v] of Object.entries(t.viagensApp || {})) if (Number(v) > 0) viagens[k] = (viagens[k] || 0) + Number(v);
  });
  const total = r2(Object.values(por).reduce((a, b) => a + b, 0));
  return Object.entries(por).map(([app, ganho]) => ({ app, ganho, pct: total > 0 ? Math.round((ganho / total) * 100) : 0, viagens: viagens[app] || 0, porViagem: viagens[app] ? r2(ganho / viagens[app]) : null })).sort((a, b) => b.ganho - a.ganho);
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
 * Quanto as corridas do resto do mês devem trazer: a média dos dias rodados vezes os dias de trabalho que faltam.
 * Com jornada hoje, a conta começa amanhã. Sem pelo menos dois dias rodados no último mês, não há base: fica em zero.
 */
export function corridasPrevistas(turnos, hoje, diasSemana = 6) {
  const ritmo = ritmoHistorico(turnos, hoje); if (!ritmo) return { valor: 0, dias: 0, porDia: 0 };
  const [a, m, d] = hoje.split("-").map(Number), fim = new Date(a, m, 0).getDate(), rodouHoje = (turnos || []).some((t) => t.fim && isoLocal(t.ini) === hoje);
  const dias = Math.ceil(((fim - d + (rodouHoje ? 0 : 1)) * Math.max(1, Math.min(7, Number(diasSemana) || 6))) / 7);
  return { valor: r2(dias * ritmo.ganhoMedioDia), dias, porDia: ritmo.ganhoMedioDia };
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
