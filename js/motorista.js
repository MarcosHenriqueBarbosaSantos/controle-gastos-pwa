/* Modo motorista de aplicativo: contas puras (sem tela), para ficarem fáceis de testar.
 * Um turno é { id, ini, fim, apps:{uber,99,indrive,outros}, viagens, km, comb, rid, cid }:
 * ini e fim em milissegundos; rid e cid são os lançamentos que o turno criou (entrada e combustível). */
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
/** As linhas do placar: uma por dia e categoria, com os totais que saem da conta da pessoa quando ela participa de um desafio ou do ranking. */
export function placarDosDias(turnos, dias, veic, perfil) {
  const porKm = custoTotalPorKm(veic) || 0;
  return dias.flatMap((dia) => {
    const doDia = (turnos || []).filter((t) => t.fim && isoLocal(t.ini) === dia);
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
    "Cada pessoa informa os próprios valores, e dias sem gasto lançado aparecem para o grupo.",
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

/**
 * Salário de autônomo: quanto guardar por mês e por dia rodado para o que nenhuma empresa paga.
 * O veículo vem do "Meu carro ou moto"; a desvalorização é o que ele perde de valor, a base para trocar de carro.
 * Férias e 13º valem um mês do lucro médio, divididos em 12.
 */
export function reservasDoMotorista(veic, { diasSemana = 6, lucroMes = 0, veiculo = "carro" } = {}) {
  const r = custoDoVeiculo(veic), parte = (...ks) => ks.reduce((t, k) => t + (r?.partes.find((p) => p.k === k)?.valor || 0), 0);
  const diasMes = Math.max(1, Math.round((Math.min(7, Math.max(1, Number(diasSemana) || 6)) * 52) / 12)), nome = veiculo === "moto" ? "moto" : "carro", umDozeAvos = Math.max(0, Number(lucroMes) || 0) / 12;
  const itens = [["manut", `Manutenção ${veiculo === "moto" ? "da moto" : "do carro"}`, "Óleo, pneus e revisão", parte("manut")],
    ["docs", "IPVA e licenciamento", "A conta que chega de uma vez no começo do ano", parte("ipva", "lic")],
    ["seguro", "Seguro", "Para renovar sem aperto", parte("seguro")],
    ["troca", `Trocar de ${nome}`, `O que ${veiculo === "moto" ? "a moto perde" : "o carro perde"} de valor todo mês`, parte("desval")],
    ["ferias", "Férias", "Um mês parado sem perder renda", umDozeAvos],
    ["decimo", "13º salário", "O seu próprio 13º, em dezembro", umDozeAvos]]
    .filter(([, , , v]) => v > 0).map(([k, nomeItem, sub, v]) => ({ k, nome: nomeItem, sub, porMes: r2(v), porDia: r2(v / diasMes) }));
  const porMes = r2(itens.reduce((t, x) => t + x.porMes, 0));
  return { itens, porMes, porDia: r2(porMes / diasMes), diasMes, semLucro: !(umDozeAvos > 0) };
}

/** A frase do dia do motorista: uma resposta só, no alto da tela. `brl` formata o dinheiro. */
export function fraseDoDia({ meta, ganhoHoje = 0, brl }) {
  if (meta.coberto) return { titulo: "Suas contas do mês estão cobertas.", sub: "O que você rodar agora é sobra." };
  if (ganhoHoje >= meta.brutoDia) return { titulo: "Meta de hoje batida.", sub: `Você fez ${brl(ganhoHoje)}. O que passar disso adianta os próximos dias.` };
  if (ganhoHoje > 0) return { titulo: `Faltam ${brl(r2(meta.brutoDia - ganhoHoje))} para a meta de hoje.`, sub: `A meta do dia é ${brl(meta.brutoDia)}.` };
  return { titulo: `Hoje, faça ${brl(meta.brutoDia)} para o mês fechar.`, sub: "Estimativa com as suas contas e o custo do veículo." };
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
