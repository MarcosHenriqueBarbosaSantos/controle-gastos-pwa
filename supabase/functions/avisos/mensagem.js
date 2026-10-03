// Texto do aviso diário: o título e o corpo da notificação e o e-mail (assunto, HTML e texto simples).
const brl = (v) => "R$ " + Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ddmm = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
export const quando = (d) => d < 0 ? `atrasada há ${-d} ${-d === 1 ? "dia" : "dias"}` : d === 0 ? "vence hoje" : d === 1 ? "vence amanhã" : `vence em ${d} dias`;
const contas = (n) => `${n} ${n === 1 ? "conta" : "contas"}`;

/**
 * @param {{itens:any[], atrasadas:number, hoje:number, total:number}} p  resultado de pendenciasParaAviso
 * @param {string} urlApp  endereço do app, para o botão do e-mail e o toque na notificação
 * @returns {{titulo, corpo, assunto, html, texto, url}}
 */
export function montaAviso(p, urlApp) {
  const n = p.itens.length, linha = (x) => `${x.titulo}: ${brl(x.valor)}, ${quando(x.dias)}`;
  const titulo = p.atrasadas ? `${contas(p.atrasadas)} ${p.atrasadas === 1 ? "atrasada" : "atrasadas"}${n > p.atrasadas ? ` e ${n - p.atrasadas} para vencer` : ""}`
    : p.hoje ? `${contas(p.hoje)} ${p.hoje === 1 ? "vence" : "vencem"} hoje${n > p.hoje ? ` e ${n - p.hoje} nos próximos dias` : ""}`
    : `${contas(n)} ${n === 1 ? "vence" : "vencem"} nos próximos dias`;
  const corpo = p.itens.slice(0, 3).map(linha).join("\n") + (n > 3 ? `\n+ ${n - 3} ${n - 3 === 1 ? "outra" : "outras"} · total ${brl(p.total)}` : "");
  const assunto = `Meus Gastos: ${titulo} (${brl(p.total)})`;
  const cor = (d) => (d < 0 ? "#c42f2f" : d <= 1 ? "#8a5a00" : "#52514e");
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#0b0b0b">
  <h2 style="margin:0 0 4px;font-size:20px;color:#1f3a5f">Meus Gastos</h2>
  <p style="margin:0 0 16px;font-size:15px">Você tem <b>${contas(n)}</b> para resolver, somando <b>${brl(p.total)}</b>.</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px">${p.itens.map((x) => `
    <tr><td style="padding:10px 6px;border-top:1px solid #e4e3dc;white-space:nowrap;color:#52514e">${ddmm(x.data)}</td>
    <td style="padding:10px 6px;border-top:1px solid #e4e3dc"><b>${esc(x.titulo)}</b><br><span style="font-size:13px;color:${cor(x.dias)}">${quando(x.dias)}</span></td>
    <td style="padding:10px 6px;border-top:1px solid #e4e3dc;text-align:right;white-space:nowrap">${brl(x.valor)}</td></tr>`).join("")}
  </table>
  <p style="margin:20px 0"><a href="${esc(urlApp)}" style="background:#2a78d6;color:#fff;text-decoration:none;padding:11px 18px;border-radius:8px;font-weight:bold;font-size:14px">Abrir o app e marcar como pago</a></p>
  <p style="font-size:12px;color:#77756f;margin:0">Este aviso chega de manhã, só nos dias em que há conta atrasada ou vencendo em até 3 dias. Para deixar de receber, abra o app e desmarque em Ajustes &rarr; Avisos de contas.</p></div>`;
  const texto = `Você tem ${contas(n)} para resolver, somando ${brl(p.total)}.\n\n${p.itens.map((x) => `${ddmm(x.data)}  ${linha(x)}`).join("\n")}\n\nAbrir o app: ${urlApp}\n\nPara deixar de receber, abra o app e desmarque em Ajustes > Avisos de contas.`;
  return { titulo, corpo, assunto, html, texto, url: urlApp };
}

/** Aviso de teste para quem está com tudo em dia. */
export function avisoDeTeste(urlApp) {
  const frase = "Este é um aviso de teste. Você não tem contas atrasadas nem vencendo nos próximos 3 dias.";
  return { titulo: "Avisos ligados", corpo: frase, assunto: "Meus Gastos: aviso de teste", url: urlApp, texto: `${frase}\n\nAbrir o app: ${urlApp}`,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#0b0b0b"><h2 style="margin:0 0 8px;font-size:20px;color:#1f3a5f">Meus Gastos</h2><p style="font-size:15px">${frase}</p><p style="font-size:13px;color:#52514e">Quando houver alguma, você recebe um e-mail como este, de manhã.</p></div>` };
}
