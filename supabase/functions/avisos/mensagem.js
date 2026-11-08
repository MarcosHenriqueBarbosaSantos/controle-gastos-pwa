// Texto do aviso diário: o título e o corpo da notificação e o e-mail (assunto, HTML e texto simples).
// Além das contas a vencer, o aviso pode levar o limite do mês e um recado da meta do dinheiro guardado.
const brl = (v) => "R$ " + Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ddmm = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
export const quando = (d) => d < 0 ? `atrasada há ${-d} ${-d === 1 ? "dia" : "dias"}` : d === 0 ? "vence hoje" : d === 1 ? "vence amanhã" : `vence em ${d} dias`;
const contas = (n) => `${n} ${n === 1 ? "conta" : "contas"}`;

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
/**
 * Texto do aviso do limite do mês.
 * @param {{teto:number, gasto:number, pct:number, resta:number, nivel:number}} u  resultado de usoDoTeto
 * @param {string} dia  hoje, "AAAA-MM-DD"
 * @returns {{titulo:string, frase:string, cor:string}}
 */
export function avisoDoLimite(u, dia) {
  const mes = MESES[Number(dia.slice(5, 7)) - 1], base = `Seu custo de ${mes} está em ${brl(u.gasto)}, e o limite que você definiu é ${brl(u.teto)}.`;
  if (u.nivel >= 120) return { titulo: `Gastos muito acima do limite de ${mes}`, frase: `${base} Já são ${brl(-u.resta)} a mais (${u.pct - 100}% acima).`, cor: "#c42f2f" };
  if (u.nivel >= 100) return { titulo: `Você passou do limite de ${mes}`, frase: `${base} Passou ${brl(-u.resta)}.`, cor: "#c42f2f" };
  return { titulo: `Você já usou ${u.pct}% do limite de ${mes}`, frase: `${base} Ainda cabem ${brl(u.resta)}.`, cor: "#8a5a00" };
}

/**
 * Fatura do cartão perto de fechar (5 dias antes ou menos): quanto já soma e quanto do limite está livre.
 * @param {{nome:string, valor:number, dias:number, u:null|{limite:number,usado:number,livre:number,pct:number}}[]} lista  um item por cartão, o que fecha primeiro na frente
 * @returns {{titulo:string, frase:string, cor:string}}
 */
export function avisoDoCartao(lista) {
  const quandoFecha = (d) => (d <= 0 ? "fecha hoje" : d === 1 ? "fecha amanhã" : `fecha em ${d} dias`);
  const limite = (u) => (u ? (u.livre < 0 ? ` Passou ${brl(-u.livre)} do limite de ${brl(u.limite)}.` : ` Ainda há ${brl(u.livre)} livres do limite de ${brl(u.limite)}.`) : "");
  const cola = "O que você comprar no cartão até lá ainda entra nessa fatura.";
  if (lista.length === 1) { const c = lista[0]; return { titulo: `Cartão ${c.nome} ${quandoFecha(c.dias)}`, frase: `A fatura aberta está em ${brl(c.valor)}.${limite(c.u)} ${cola}`, cor: "#8a5a00" }; }
  return { titulo: `${lista.length} cartões fecham nos próximos dias`, frase: `${lista.map((c) => `${c.nome}: ${brl(c.valor)}, ${quandoFecha(c.dias)}`).join(". ")}. ${cola}`, cor: "#8a5a00" };
}

/**
 * Lembrete da Reserva do carro: guardar o valor do dia (ou do mês) para nunca passar perrengue com o carro.
 * @param {{modo:"diario"|"mensal", valor:number}} r
 * @returns {{titulo:string, frase:string, cor:string}}
 */
export function avisoDaReserva(r) {
  return r.modo === "mensal"
    ? { titulo: "Guarde a Reserva do carro", frase: `Este mês a reserva pede mais ${brl(r.valor)}. É o que paga a manutenção, o IPVA e o seguro quando chegarem, sem aperto.`, cor: "#8a5a00" }
    : { titulo: `Guarde ${brl(r.valor)} hoje para a Reserva do carro`, frase: "É o que paga a manutenção, o IPVA e o seguro quando chegarem. Abra o app e toque em Guardei (ou em Hoje não).", cor: "#8a5a00" };
}

/**
 * Vai faltar dinheiro para uma conta nos próximos dias: o prazo, quanto falta e quais contas não fecham.
 * @param {{quando:string, falta:number, contas:string, motorista:boolean, porDia:number, entra:string}} r  quando = "hoje", "amanhã" ou "dia 10"
 * @returns {{titulo:string, frase:string, cor:string}}
 */
export function avisoSemDinheiro(r) {
  const titulo = r.motorista ? `Faltam ${brl(r.falta)} até ${r.quando}` : `O dinheiro não chega para ${r.contas}`;
  const frase = r.motorista
    ? `Contas até ${r.quando}: ${r.contas}. O Uber precisa trazer cerca de ${brl(r.porDia)} por dia até lá.`
    : `Faltam ${brl(r.falta)} ${r.quando === "hoje" ? "hoje" : `até ${r.quando}`}.${r.entra ? ` ${r.entra}` : ""} Ainda dá tempo de ajustar: adiar uma conta, segurar gastos ou esperar uma entrada.`;
  return { titulo, frase, cor: "#c42f2f" };
}

/**
 * Recado da meta do dinheiro guardado: lembrete (o dinheiro entrou, ou deve sobrar no fim do mês) ou parabéns (guardou ontem).
 * O tom é de apoio: nunca cobra, e em mês apertado nem chega a ser enviado.
 * @param {{tipo:"lembrete", quando:"entrou"|"sobra", meta:any, valor:number, sobra:number, completo:boolean}
 *        | {tipo:"parabens", destino:string, valor:number, guardado:number, alvo:number, falta:number, pct:number, marco:number, concluida:boolean}} r
 * @param {string} dia  hoje, "AAAA-MM-DD"
 * @returns {{titulo:string, frase:string, cor:string, fundo:string, botao:string}}
 */
export function avisoDaMeta(r, dia) {
  if (r.tipo === "parabens") {
    const verde = { cor: "#1b7f4b", fundo: "#e7f6ee", botao: "Abrir o app e ver a meta" };
    if (r.concluida) return { titulo: `Meta ${r.destino} completa!`, frase: `Você juntou ${brl(r.guardado)}. É a recompensa pelo seu esforço. Parabéns!`, ...verde };
    return { titulo: r.marco ? `Você chegou a ${r.marco}% da meta ${r.destino}` : `Você guardou ${brl(r.valor)} para a meta ${r.destino}`,
      frase: `${r.marco ? `Com os ${brl(r.valor)} que guardou ontem, já` : "Já"} são ${brl(r.guardado)} de ${brl(r.alvo)} (${r.pct}%). Faltam ${brl(r.falta)}. Cada valor guardado é uma recompensa pelo seu esforço: continue, você merece chegar lá.`, ...verde };
  }
  const a = r.meta, azul = { cor: "#1f6fd1", fundo: "#eaf2fd", botao: "Abrir o app e guardar" }, onde = `Já são ${brl(a.guardado)} de ${brl(a.alvo)} (${a.pct}%).`;
  if (r.quando === "entrou") return { titulo: `Meta ${a.destino}: que tal separar ${brl(r.valor)} hoje?`,
    frase: `Seu dinheiro do mês entrou. ${r.completo ? `Guardando ${brl(r.valor)} agora, a meta segue no ritmo.` : `Pelo ritmo dos gastos, cabem ${brl(r.valor)} para a meta neste mês.`} ${onde} Se o mês apertar, tudo bem deixar para o próximo.`, ...azul };
  return { titulo: `Devem sobrar ${brl(r.sobra)} em ${MESES[Number(dia.slice(5, 7)) - 1]}`,
    frase: `Guardando ${brl(r.valor)}, a meta ${a.destino} ${r.completo ? "segue no ritmo" : "já anda um pouco"}. ${onde} Se preferir não guardar agora, tudo bem.`, ...azul };
}

/**
 * @param {{itens:any[], atrasadas:number, hoje:number, total:number}} p  resultado de pendenciasParaAviso
 * @param {string} urlApp  endereço do app, para o botão do e-mail e o toque na notificação
 * @param {{titulo:string, frase:string, cor:string}|null} lim  aviso do limite do mês (avisoDoLimite), quando há
 * @param {{titulo:string, frase:string, cor:string, fundo:string, botao:string}|null} meta  recado da meta (avisoDaMeta), quando há
 * @returns {{titulo, corpo, assunto, html, texto, url}}
 */
export function montaAviso(p, urlApp, lim = null, meta = null, cartao = null, sem = null, reserva = null) {
  const caixaDe = (x, fundo) => (x ? `<div style="margin:0 0 16px;padding:12px 14px;border-radius:8px;background:${fundo};border-left:4px solid ${x.cor}"><b style="color:${x.cor}">${esc(x.titulo)}</b><br><span style="font-size:14px">${esc(x.frase)}</span></div>` : "");
  const caixa = caixaDe(sem, "#fdecea") + caixaDe(lim, "#fdf3e1") + caixaDe(cartao, "#fdf3e1") + caixaDe(reserva, "#fdf3e1") + caixaDe(meta, meta?.fundo);
  const rodape = "Para deixar de receber, abra o app e desmarque em Ajustes &rarr; Avisos de contas ou na aba Limites.";
  const sairDaMeta = "Para deixar de receber os recados da meta, abra o app, toque em Planejar, abra a caixinha da meta e desmarque os recados.";
  const recados = [sem, lim, cartao, reserva, meta].filter(Boolean);
  const sairDaReserva = "Para deixar de receber o lembrete da Reserva do carro, abra o app, vá em Jornada, Salário de autônomo, e em Quero ser lembrado escolha Não me lembrar.";
  const sairDoSem = "Para deixar de receber o aviso de falta de dinheiro, abra o app, vá em Ajustes e, em Avisos e lembretes, desmarque Falta de dinheiro para uma conta.";
  const sairDoCartao = "Para deixar de receber o aviso do cartão, abra o app, vá em Ajustes e, em Aviso do cartão, escolha Não avisar. Lá também dá para mudar quantos dias antes de fechar você quer ser avisado.";
  if (!p.itens.length && recados.length) {   // só o limite ou a meta, sem conta para vencer
    const um = recados[0], botao = sem ? "Abrir o app e ver o mês dia a dia" : reserva && !lim && !cartao ? "Abrir o app e guardar" : lim ? "Abrir o app e ver para onde foi o dinheiro" : cartao ? "Abrir o app e ver o cartão" : meta.botao;
    const porque = [reserva ? `O lembrete da Reserva do carro chega de manhã, só nos dias em que você ainda não marcou se guardou. ${sairDaReserva}` : "", sem ? `O aviso de falta de dinheiro chega uma vez por prazo, até 5 dias antes de a conta vencer. ${sairDoSem}` : "", lim ? `Você recebe este aviso uma vez quando chega a 80% do limite, quando passa dele e quando passa em mais de 20%. ${rodape}` : "",
      cartao ? `O aviso do cartão chega uma vez por fatura, no prazo antes de ela fechar que você escolheu em Ajustes. ${sairDoCartao}` : "",
      meta ? `Os recados da meta chegam no dia em que o seu dinheiro entra, perto do fim do mês quando deve sobrar, e depois que você guarda. ${sairDaMeta}` : ""].filter(Boolean).join(" ");
    return { titulo: um.titulo, corpo: [um.frase, ...recados.slice(1).map((x) => x.titulo)].join("\n"), assunto: `Meus Gastos: ${um.titulo}`, url: urlApp,
      texto: `${recados.map((x) => `${x.titulo}\n\n${x.frase}`).join("\n\n")}\n\nAbrir o app: ${urlApp}\n\n${reserva ? sairDaReserva : ""}${reserva && (sem || lim || cartao || meta) ? " " : ""}${sem ? sairDoSem : ""}${sem && (lim || cartao || meta) ? " " : ""}${lim ? "Para deixar de receber, abra o app e desmarque na aba Limites." : ""}${lim && (cartao || meta) ? " " : ""}${cartao ? sairDoCartao : ""}${cartao && meta ? " " : ""}${meta ? sairDaMeta : ""}`,
      html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#0b0b0b"><h2 style="margin:0 0 12px;font-size:20px;color:#1f3a5f">Meus Gastos</h2>${caixa}
  <p style="margin:20px 0"><a href="${esc(urlApp)}" style="background:#2a78d6;color:#fff;text-decoration:none;padding:11px 18px;border-radius:8px;font-weight:bold;font-size:14px">${botao}</a></p>
  <p style="font-size:12px;color:#77756f;margin:0">${porque}</p></div>` };
  }
  const n = p.itens.length, linha = (x) => `${x.titulo}: ${brl(x.valor)}, ${quando(x.dias)}`;
  const titulo = p.atrasadas ? `${contas(p.atrasadas)} ${p.atrasadas === 1 ? "atrasada" : "atrasadas"}${n > p.atrasadas ? ` e ${n - p.atrasadas} para vencer` : ""}`
    : p.hoje ? `${contas(p.hoje)} ${p.hoje === 1 ? "vence" : "vencem"} hoje${n > p.hoje ? ` e ${n - p.hoje} nos próximos dias` : ""}`
    : `${contas(n)} ${n === 1 ? "vence" : "vencem"} nos próximos dias`;
  const corpo = p.itens.slice(0, 3).map(linha).join("\n") + (n > 3 ? `\n+ ${n - 3} ${n - 3 === 1 ? "outra" : "outras"} · total ${brl(p.total)}` : "") + recados.map((x) => `\n${x.titulo}`).join("");
  const assunto = `Meus Gastos: ${titulo} (${brl(p.total)})`;
  const cor = (d) => (d < 0 ? "#c42f2f" : d <= 1 ? "#8a5a00" : "#52514e");
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#0b0b0b">
  <h2 style="margin:0 0 4px;font-size:20px;color:#1f3a5f">Meus Gastos</h2>
  ${caixa}<p style="margin:0 0 16px;font-size:15px">Você tem <b>${contas(n)}</b> para resolver, somando <b>${brl(p.total)}</b>.</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px">${p.itens.map((x) => `
    <tr><td style="padding:10px 6px;border-top:1px solid #e4e3dc;white-space:nowrap;color:#52514e">${ddmm(x.data)}</td>
    <td style="padding:10px 6px;border-top:1px solid #e4e3dc"><b>${esc(x.titulo)}</b><br><span style="font-size:13px;color:${cor(x.dias)}">${quando(x.dias)}</span></td>
    <td style="padding:10px 6px;border-top:1px solid #e4e3dc;text-align:right;white-space:nowrap">${brl(x.valor)}</td></tr>`).join("")}
  </table>
  <p style="margin:20px 0"><a href="${esc(urlApp)}" style="background:#2a78d6;color:#fff;text-decoration:none;padding:11px 18px;border-radius:8px;font-weight:bold;font-size:14px">Abrir o app e marcar como pago</a></p>
  <p style="font-size:12px;color:#77756f;margin:0">Este aviso chega de manhã, só nos dias em que há conta atrasada ou vencendo em até 3 dias. Para deixar de receber, abra o app e desmarque em Ajustes &rarr; Avisos de contas.${meta ? " " + sairDaMeta : ""}</p></div>`;
  const texto = `${recados.map((x) => `${x.titulo}\n${x.frase}\n\n`).join("")}Você tem ${contas(n)} para resolver, somando ${brl(p.total)}.\n\n${p.itens.map((x) => `${ddmm(x.data)}  ${linha(x)}`).join("\n")}\n\nAbrir o app: ${urlApp}\n\nPara deixar de receber, abra o app e desmarque em Ajustes > Avisos de contas.`;
  return { titulo, corpo, assunto, html, texto, url: urlApp };
}

/** Aviso de teste para quem está com tudo em dia. */
export function avisoDeTeste(urlApp) {
  const frase = "Este é um aviso de teste. Você não tem contas atrasadas nem vencendo nos próximos 3 dias.";
  return { titulo: "Avisos ligados", corpo: frase, assunto: "Meus Gastos: aviso de teste", url: urlApp, texto: `${frase}\n\nAbrir o app: ${urlApp}`,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#0b0b0b"><h2 style="margin:0 0 8px;font-size:20px;color:#1f3a5f">Meus Gastos</h2><p style="font-size:15px">${frase}</p><p style="font-size:13px;color:#52514e">Quando houver alguma, você recebe um e-mail como este, de manhã.</p></div>` };
}

/* ---------- resumo da semana (domingo à noite) e lembrete do fim do dia ---------- */
const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const diaSem = (iso) => DIAS[new Date(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)))).getUTCDay()];
const curto = (v) => (v >= 1000 ? `${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : Math.round(v).toLocaleString("pt-BR"));
const comAtalho = (urlApp, atalho) => `${urlApp}${urlApp.includes("?") ? "&" : "?"}atalho=${atalho}`;

/**
 * Resumo da semana: quanto foi gasto, onde pesou mais, as contas dos próximos 7 dias e como está o mês.
 * @param {ReturnType<import("./regras.js").resumoDaSemana>} r
 * @param {string} urlApp
 * @param {{teto:number, pct:number}|null} u  uso do limite do mês (usoDoTeto), quando a pessoa definiu um
 * @returns {{titulo, corpo, assunto, html, texto, url, tag}}
 */
export function avisoDaSemana(r, urlApp, u = null) {
  const gastos = (n) => `${n} ${n === 1 ? "gasto" : "gastos"}`, mes = MESES[Number(r.ate.slice(5, 7)) - 1];
  const titulo = r.n ? `Sua semana: ${brl(r.total)} em ${gastos(r.n)}` : "Sua semana: nenhum gasto anotado";
  const compara = !r.n || r.dif === null ? "" : Math.abs(r.dif) < 1 ? "O mesmo que na semana anterior." : r.dif < 0 ? `${brl(-r.dif)} a menos que na semana anterior.` : `${brl(r.dif)} a mais que na semana anterior.`;
  const p = r.proximas, nP = p.itens.length;
  const fraseProx = nP ? `Nos próximos 7 dias: ${contas(nP)}, somando ${brl(p.total)}${p.atrasadas ? ` (${p.atrasadas} ${p.atrasadas === 1 ? "já atrasada" : "já atrasadas"})` : ""}.` : "Nenhuma conta vence nos próximos 7 dias.";
  const fraseMes = `Seu custo de ${mes}, com as contas e faturas do mês, está em ${brl(r.mes.custo)}${u ? `: ${u.pct}% do limite de ${brl(u.teto)}` : ""}.`
    + (r.mes.rec > 0 ? (r.mes.previsto >= 0 ? ` No ritmo atual, devem sobrar ${brl(r.mes.previsto)}.` : ` No ritmo atual, devem faltar ${brl(-r.mes.previsto)}.`) : "");
  const semNada = "Se você gastou e não anotou, dá para lançar agora com a data certa.";
  const corpo = [compara, r.cats[0] ? `Onde mais pesou: ${r.cats[0].cat} (${brl(r.cats[0].valor)}).` : semNada, nP ? fraseProx : ""].filter(Boolean).join("\n");
  const maior = r.maior && r.n > 1 ? `Maior gasto: ${r.maior.descricao}, ${brl(r.maior.valor)}, ${diaSem(r.maior.data)} ${ddmm(r.maior.data)}.` : "";
  const anotados = r.n ? `Você anotou em ${r.anotados} de 7 dias.` : "";
  const sair = "Para deixar de receber este resumo, abra o app e desmarque em Ajustes > Resumo e lembrete.";
  // Dia a dia: uma barra por dia, da mesma cor, com o valor embaixo (o e-mail não tem como mostrar o valor ao passar o dedo).
  const topo = Math.max(...r.dias.map((d) => d.total), 0.01), td = "padding:0 3px;text-align:center;vertical-align:bottom;width:14.28%";
  const barras = r.n ? `<p style="margin:0 0 6px;font-size:14px;color:#52514e">Gasto por dia, em reais</p>
  <table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 18px"><tr>${r.dias.map((d) => `
    <td style="${td};height:72px"><div style="height:${d.total ? Math.max(4, Math.round((d.total / topo) * 64)) : 2}px;background:${d.total ? "#2a78d6" : "#d8d6ce"};border-radius:4px 4px 0 0;font-size:0;line-height:0">&nbsp;</div></td>`).join("")}</tr>
    <tr>${r.dias.map((d) => `<td style="${td};border-top:1px solid #d8d6ce;padding-top:5px;font-size:12px;color:#52514e">${diaSem(d.iso)}<br><span style="color:#0b0b0b">${d.total ? curto(d.total) : "–"}</span></td>`).join("")}</tr></table>` : "";
  const linhasCat = [...r.cats, ...(r.outras > 0 ? [{ cat: "Outras categorias", valor: r.outras }] : [])];
  const celula = "padding:9px 6px;border-top:1px solid #e4e3dc";
  const tabCat = linhasCat.length ? `<p style="margin:0 0 6px;font-size:14px;color:#52514e">Onde foi o dinheiro</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 18px">${linhasCat.map((c) => `
    <tr><td style="${celula}"><b>${esc(c.cat)}</b></td><td style="${celula};text-align:right;white-space:nowrap;color:#52514e">${Math.round((c.valor / r.total) * 100)}%</td><td style="${celula};text-align:right;white-space:nowrap">${brl(c.valor)}</td></tr>`).join("")}
  </table>` : "";
  const mostra = p.itens.slice(0, 6);
  const tabProx = nP ? `<p style="margin:0 0 6px;font-size:14px;color:#52514e">${esc(fraseProx)}</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 18px">${mostra.map((x) => `
    <tr><td style="${celula};white-space:nowrap;color:#52514e">${ddmm(x.data)}</td><td style="${celula}"><b>${esc(x.titulo)}</b>${x.dias < 0 ? `<br><span style="font-size:13px;color:#c42f2f">${quando(x.dias)}</span>` : ""}</td><td style="${celula};text-align:right;white-space:nowrap">${brl(x.valor)}</td></tr>`).join("")}
  </table>${nP > mostra.length ? `<p style="margin:-10px 0 18px;font-size:13px;color:#52514e">E mais ${nP - mostra.length}. Veja todas no app.</p>` : ""}` : `<p style="margin:0 0 18px;font-size:14px;color:#52514e">${fraseProx}</p>`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#0b0b0b">
  <h2 style="margin:0 0 2px;font-size:20px;color:#1f3a5f">Meus Gastos</h2>
  <p style="margin:0 0 16px;font-size:14px;color:#52514e">Resumo da semana, de ${ddmm(r.de)} a ${ddmm(r.ate)}</p>
  ${r.n ? `<p style="margin:0;font-size:30px;font-weight:bold;line-height:1.1">${brl(r.total)}</p>
  <p style="margin:4px 0 18px;font-size:15px">em ${gastos(r.n)} ${r.n === 1 ? "anotado" : "anotados"}.${compara ? " " + compara : ""}</p>`
    : `<p style="margin:0 0 6px;font-size:20px;font-weight:bold">Nenhum gasto anotado nesta semana</p><p style="margin:0 0 18px;font-size:15px">${semNada}</p>`}
  ${barras}${tabCat}${maior || anotados ? `<p style="margin:0 0 18px;font-size:14px">${esc([maior, anotados].filter(Boolean).join(" "))}</p>` : ""}
  ${tabProx}
  <p style="margin:0 0 4px;font-size:14px;padding:12px 14px;border-radius:8px;background:#eaf2fd;border-left:4px solid #1f6fd1">${esc(fraseMes)}</p>
  <p style="margin:20px 0"><a href="${esc(urlApp)}" style="background:#2a78d6;color:#fff;text-decoration:none;padding:11px 18px;border-radius:8px;font-weight:bold;font-size:14px">Abrir o app</a></p>
  <p style="font-size:12px;color:#77756f;margin:0">Este resumo chega no domingo à noite, só para quem anotou algo nas últimas duas semanas. ${sair.replace(">", "&rarr;")}</p></div>`;
  const texto = [`Resumo da semana, de ${ddmm(r.de)} a ${ddmm(r.ate)}`, "",
    r.n ? `${brl(r.total)} em ${gastos(r.n)}.${compara ? " " + compara : ""}` : `Nenhum gasto anotado nesta semana. ${semNada}`,
    ...(linhasCat.length ? ["", "Onde foi o dinheiro:", ...linhasCat.map((c) => `- ${c.cat}: ${brl(c.valor)}`)] : []),
    ...(maior || anotados ? ["", [maior, anotados].filter(Boolean).join(" ")] : []),
    "", fraseProx, ...mostra.map((x) => `- ${ddmm(x.data)}  ${x.titulo}: ${brl(x.valor)}${x.dias < 0 ? `, ${quando(x.dias)}` : ""}`),
    "", fraseMes, "", `Abrir o app: ${urlApp}`, "", sair].join("\n");
  return { titulo, corpo, assunto: `Meus Gastos: ${titulo.replace("Sua semana: ", "sua semana, ")}`, html, texto, url: urlApp, tag: "meus-gastos-semana" };
}

/**
 * Lembrete do fim do dia, só por notificação: aparece quando a pessoa não anotou nada hoje.
 * @param {{seq:number}} l  resultado de lembreteDoDia
 * @returns {{titulo, corpo, url, tag}}
 */
export function avisoDaNoite(l, urlApp) {
  const corpo = l.seq >= 2 ? `Você está há ${l.seq} dias seguidos anotando. Lance o de hoje, ou abra o app e marque que não gastou nada.`
    : "Leva menos de um minuto. Lance o de hoje, ou abra o app e marque que não gastou nada.";
  return { titulo: "Anotou os gastos de hoje?", corpo, url: comAtalho(urlApp, "lancar"), tag: "meus-gastos-dia" };
}

/**
 * Lembrete da jornada com o app fechado (modo motorista). `ativo` é a jornada em andamento guardada nas preferências.
 * Com 3 horas sem lançar quanto fez (ou desde o começo), ou com a jornada rodando há 14 horas ou mais (esqueceu de encerrar).
 * Pausada não avisa. `chave` muda a cada bloco de 3 horas (ou de 6, na jornada esquecida), para cada aviso sair uma vez só.
 * @returns {null | {tipo: "lancar"|"esquecida", chave: string, horas: number}}
 */
export function lembreteDaJornada(ativo, agoraMs) {
  const ini = Number(ativo?.ini);
  if (!(ini > 0) || Number(ativo?.pausaIni) > 0) return null;
  const ms = Math.max(0, agoraMs - ini - (Number(ativo.pausado) > 0 ? Number(ativo.pausado) : 0));
  const desde = Number(ativo.parcialEm) > 0 ? Number(ativo.parcialEm) : ini, passou = agoraMs - desde, h = 3600000;
  if (ms >= 14 * h) return { tipo: "esquecida", chave: `esq:${ini}:${Math.floor(ms / (6 * h))}`, horas: Math.floor(ms / h) };
  if (passou >= 3 * h) return { tipo: "lancar", chave: `${desde}:${Math.floor(passou / (3 * h))}`, horas: Math.floor(passou / h) };
  return null;
}
export function avisoDaJornada(l, urlApp) {
  return l.tipo === "esquecida"
    ? { titulo: "Esqueceu de encerrar a jornada?", corpo: `Ela está rodando há ${l.horas} horas. Toque para encerrar e acertar o horário em que parou.`, url: comAtalho(urlApp, "jornada"), tag: "meus-gastos-jornada" }
    : { titulo: `Faz ${l.horas} horas que você não lança`, corpo: "Lance quanto fez até agora para ver se está valendo a pena. Se já parou, encerre a jornada.", url: comAtalho(urlApp, "jornada"), tag: "meus-gastos-jornada" };
}
