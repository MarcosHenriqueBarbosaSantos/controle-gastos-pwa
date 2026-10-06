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
export function montaAviso(p, urlApp, lim = null, meta = null) {
  const caixaDe = (x, fundo) => (x ? `<div style="margin:0 0 16px;padding:12px 14px;border-radius:8px;background:${fundo};border-left:4px solid ${x.cor}"><b style="color:${x.cor}">${esc(x.titulo)}</b><br><span style="font-size:14px">${esc(x.frase)}</span></div>` : "");
  const caixa = caixaDe(lim, "#fdf3e1") + caixaDe(meta, meta?.fundo);
  const rodape = "Para deixar de receber, abra o app e desmarque em Ajustes &rarr; Avisos de contas ou na aba Limites.";
  const sairDaMeta = "Para deixar de receber os recados da meta, abra o app, toque em Dinheiro guardado, abra a meta e desmarque os recados.";
  const recados = [lim, meta].filter(Boolean);
  if (!p.itens.length && recados.length) {   // só o limite ou a meta, sem conta para vencer
    const um = recados[0], botao = lim ? "Abrir o app e ver para onde foi o dinheiro" : meta.botao;
    const porque = [lim ? `Você recebe este aviso uma vez quando chega a 80% do limite, quando passa dele e quando passa em mais de 20%. ${rodape}` : "",
      meta ? `Os recados da meta chegam no dia em que o seu dinheiro entra, perto do fim do mês quando deve sobrar, e depois que você guarda. ${sairDaMeta}` : ""].filter(Boolean).join(" ");
    return { titulo: um.titulo, corpo: [um.frase, ...recados.slice(1).map((x) => x.titulo)].join("\n"), assunto: `Meus Gastos: ${um.titulo}`, url: urlApp,
      texto: `${recados.map((x) => `${x.titulo}\n\n${x.frase}`).join("\n\n")}\n\nAbrir o app: ${urlApp}\n\n${lim ? "Para deixar de receber, abra o app e desmarque na aba Limites." : ""}${lim && meta ? " " : ""}${meta ? sairDaMeta : ""}`,
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
