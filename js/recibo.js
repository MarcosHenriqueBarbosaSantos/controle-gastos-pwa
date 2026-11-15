/* ---------- Recibo de corrida particular ----------
   Para a corrida fora do app (particular) em que o cliente pede um comprovante.
   Não é nota fiscal: é um recibo de serviço de transporte que explica a conta toda (km, pedágio de ida e de volta,
   extras, subtotal, desconto e parcelas) e vai pronto para o WhatsApp do cliente.
   Modelo: o recibo que o dono do app já mandava para os clientes. As contas são puras (tests/recibo.test.mjs). */

const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const pos = (n) => (Number(n) > 0 ? Number(n) : 0);
const MESES_R = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const kmTxt = (n) => String(r2(n)).replace(".", ",");

/**
 * A conta do recibo. A corrida é o valor combinado ou, se ele estiver vazio, km total (ida + volta) × preço por km.
 * O desconto vale sobre a corrida e os extras (nunca sobre o pedágio, que é repasse) e nunca passa disso.
 * @returns {{ kmIda, kmVolta, kmTotal, porKm, pelaKm, corrida, pedagioIda, pedagioVolta, pedagio, extras, subtotal, desconto, total, parcelas, parcela }}
 */
export function contaDoRecibo({ valor = 0, km = 0, kmVolta = 0, porKm = 0, pedagio = 0, pedagioVolta = 0, extras = 0, desconto = 0, descontoPct = false, parcelas = 1 } = {}) {
  const kmIda = r2(pos(km)), kmV = r2(pos(kmVolta)), kmTotal = r2(kmIda + kmV), pelaKm = !(pos(valor) > 0) && kmTotal > 0 && pos(porKm) > 0;
  const corrida = pos(valor) > 0 ? r2(valor) : pelaKm ? r2(kmTotal * pos(porKm)) : 0;
  const pIda = r2(pos(pedagio)), pVolta = r2(pos(pedagioVolta)), ped = r2(pIda + pVolta), ext = r2(pos(extras)), descontavel = r2(corrida + ext);
  const desc = Math.min(descontavel, r2(descontoPct ? (descontavel * Math.min(100, pos(desconto))) / 100 : pos(desconto)));
  const total = r2(corrida + ext + ped - desc), n = Math.min(12, Math.max(1, Math.round(Number(parcelas) || 1)));
  return { kmIda, kmVolta: kmV, kmTotal, porKm: r2(pos(porKm)), pelaKm, corrida, pedagioIda: pIda, pedagioVolta: pVolta, pedagio: ped, extras: ext,
    subtotal: r2(corrida + ext + ped), desconto: r2(desc), total, parcelas: n, parcela: r2(total / n) };
}

/** O número do recibo: o ano e uma sequência, por exemplo 2026-0007. */
export const numeroDoRecibo = (ano, seq) => `${ano}-${String(Math.max(1, Math.round(Number(seq) || 1))).padStart(4, "0")}`;

/** "2026-11-12" → "12 de novembro de 2026". */
export const dataPorExtensoRecibo = (iso) => (/^\d{4}-\d{2}-\d{2}$/.test(String(iso)) ? `${Number(iso.slice(8, 10))} de ${MESES_R[Number(iso.slice(5, 7)) - 1]} de ${iso.slice(0, 4)}` : "");

/** Só os dígitos do telefone, com o 55 do Brasil quando a pessoa digitou só DDD e número. Vazio se não parece telefone. */
export function foneParaWhats(t) {
  const d = String(t || "").replace(/\D/g, "");
  if (d.length === 10 || d.length === 11) return "55" + d;
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) return d;
  return "";
}

/**
 * O texto do recibo para o WhatsApp, no modelo do dono: trajeto, detalhamento dos valores, subtotal, desconto e o total a pagar.
 * Só entra o que foi preenchido. Negrito com * (WhatsApp).
 * @param {object} d  cliente, data "AAAA-MM-DD", hora, origem, destino, forma, obs, motivoDesc, motorista, doc, carro, placa, numero
 * @param {object} c  resultado de contaDoRecibo
 * @param {(n:number)=>string} brl  formata em reais
 */
export function textoDoRecibo(d, c, brl) {
  const l = [`*RECIBO DE SERVIÇO DE TRANSPORTE*${d.numero ? `\nNº ${d.numero}` : ""}`, ""];
  if (d.cliente) l.push(`Cliente: ${d.cliente}`);
  if (d.data) l.push(`Data: ${dataPorExtensoRecibo(d.data)}`);
  if (d.motorista) l.push(`Motorista: ${d.motorista}${d.doc ? ` (${d.doc})` : ""}`);
  if (d.carro || d.placa) l.push(`Veículo: ${[d.carro, d.placa].filter(Boolean).join(" · ")}`);
  const traj = [];
  if (d.origem) traj.push(`• Origem: ${d.origem}`);
  if (d.destino) traj.push(`• Destino: ${d.destino}`);
  if (d.hora) traj.push(`• Horário de início: ${d.hora}`);
  if (c.kmVolta > 0) traj.push(`• Distância de ida: ${kmTxt(c.kmIda)} km`, `• Distância de volta: ${kmTxt(c.kmVolta)} km`, `• Distância total: ${kmTxt(c.kmTotal)} km`);
  else if (c.kmTotal > 0) traj.push(`• Distância: ${kmTxt(c.kmTotal)} km`);
  if (traj.length) l.push("", "*Detalhes do trajeto*", ...traj);
  l.push("", "*Detalhamento de valores*");
  l.push(c.pelaKm ? `• Quilometragem (${kmTxt(c.kmTotal)} km x ${brl(c.porKm)}): ${brl(c.corrida)}` : `• Corrida: ${brl(c.corrida)}`);
  if (c.extras) l.push(`• Extras (espera, bagagem): ${brl(c.extras)}`);
  if (c.pedagioIda && c.pedagioVolta) l.push(`• Pedágio (ida): ${brl(c.pedagioIda)}`, `• Pedágio (volta): ${brl(c.pedagioVolta)}`, `• Total de pedágios: ${brl(c.pedagio)}`);
  else if (c.pedagio) l.push(`• Pedágio: ${brl(c.pedagio)}`);
  if (c.desconto || c.pedagio || c.extras) l.push(`• Subtotal: ${brl(c.subtotal)}`);
  if (c.desconto) l.push(`• ${d.motivoDesc ? `Desconto ${d.motivoDesc}` : "Desconto"}: -${brl(c.desconto)}`);
  l.push("", `*Valor total a pagar: ${brl(c.total)}*`);
  if (c.parcelas > 1) l.push(`Em ${c.parcelas}x de ${brl(c.parcela)}`);
  if (d.forma) l.push(`Pagamento: ${d.forma}`);
  if (d.obs) l.push("", d.obs);
  l.push("", "_Recibo de serviço de transporte particular. Não é nota fiscal._");
  return l.join("\n");
}

/**
 * A tela do recibo. app: { $, esc, brl, parseMoney, toast, hoje, prefs(), salvaPrefs(), voltar(), lancaGanho(valor, desc, data), carro() }.
 * Os seus dados (nome, documento, carro, placa e preço por km) ficam lembrados para o próximo recibo.
 */
export function criaRecibo(app) {
  const { $, esc, brl, parseMoney, toast, hoje } = app;
  const FORMAS_R = ["Pix", "Dinheiro", "Cartão de crédito", "Cartão de débito", "Transferência"];
  const num = (id) => parseMoney($(id)?.value || "") || 0;
  const meus = () => app.prefs().recibo || {};
  const idaVolta = () => Boolean($("rcIdaVolta")?.checked);
  const dados = () => {
    const m = meus(), ano = Number(hoje().slice(0, 4));
    return { cliente: $("rcCliente").value.trim(), data: $("rcData").value, hora: $("rcHora").value.trim(), origem: $("rcOrigem").value.trim(), destino: $("rcDestino").value.trim(),
      forma: $("rcForma").value, obs: $("rcObs").value.trim(), motivoDesc: $("rcMotivo").value.trim(), motorista: $("rcNome").value.trim(), doc: $("rcDoc").value.trim(),
      carro: $("rcCarro").value.trim(), placa: $("rcPlaca").value.trim().toUpperCase(), numero: numeroDoRecibo(ano, (Number(m.seq) || 0) + 1) };
  };
  const conta = () => contaDoRecibo({ valor: num("rcValor"), km: num("rcKm"), kmVolta: idaVolta() ? num("rcKmVolta") : 0, porKm: num("rcPorKm"),
    pedagio: num("rcPed"), pedagioVolta: idaVolta() ? num("rcPedVolta") : 0, extras: num("rcExtra"),
    desconto: num("rcDesc"), descontoPct: $("rcDescTipo").value === "pct", parcelas: Number($("rcParc").value) });
  function previa() {
    const d = dados(), c = conta(), lin = (r, v, cls = "") => `<li class="${cls}"><span>${r}</span><b>${v}</b></li>`;
    document.querySelectorAll(".rc-volta").forEach((el) => (el.hidden = !idaVolta()));
    $("rcLblKm").textContent = idaVolta() ? "Km de ida" : "Km rodados"; $("rcLblPed").textContent = idaVolta() ? "Pedágio de ida (R$)" : "Pedágio (R$)";
    $("rcPrevia").innerHTML = `<div class="rc-topo"><small>Recibo de serviço de transporte · Nº ${esc(d.numero)}</small><b>${brl(c.total)}</b>${c.parcelas > 1 ? `<span>em ${c.parcelas}x de ${brl(c.parcela)}</span>` : ""}</div>
      <ul class="rc-linhas">${lin(c.pelaKm ? `Quilometragem (${kmTxt(c.kmTotal)} km x ${brl(c.porKm)})` : "Corrida", brl(c.corrida))}${c.extras ? lin("Extras", brl(c.extras)) : ""}${c.pedagioIda && c.pedagioVolta ? lin("Pedágio (ida)", brl(c.pedagioIda)) + lin("Pedágio (volta)", brl(c.pedagioVolta)) : c.pedagio ? lin("Pedágio", brl(c.pedagio)) : ""}${c.desconto || c.pedagio || c.extras ? lin("Subtotal", brl(c.subtotal)) : ""}${c.desconto ? lin(d.motivoDesc ? `Desconto ${esc(d.motivoDesc)}` : "Desconto", "-" + brl(c.desconto), "desc") : ""}${lin("Total a pagar", brl(c.total), "tot")}</ul>
      ${d.cliente ? `<p><small>Cliente</small>${esc(d.cliente)}</p>` : ""}${d.origem || d.destino ? `<p><small>Trajeto</small>${esc(d.origem || "?")} → ${esc(d.destino || "?")}${c.kmTotal ? ` · ${kmTxt(c.kmTotal)} km${c.kmVolta ? " (ida e volta)" : ""}` : ""}</p>` : ""}
      ${d.motorista ? `<p><small>Motorista</small>${esc(d.motorista)}${d.doc ? ` · ${esc(d.doc)}` : ""}</p>` : ""}`;
    $("rcEnviar").disabled = !(c.total > 0);
    $("rcFalta").textContent = c.total > 0 ? "" : "Para enviar, preencha o preço por km e os km, ou o valor combinado.";
    const f = $("rcFone").value.replace(/\D/g, "");
    $("rcFoneAviso").textContent = f && !foneParaWhats(f) ? "O número parece incompleto: use DDD e número, como (11) 98765-4321." : "";
  }
  /** Os últimos recibos enviados, com "Mandar de novo" (o mesmo texto) e "Usar de novo" (preenche a tela com o mesmo cliente e trajeto). */
  function enviados() {
    const lista = (app.prefs().recibos || []).slice(-5).reverse();
    if (!lista.length) return "";
    return `<section class="rc-bloco rc-enviados" aria-label="Últimos recibos"><h3>Últimos recibos</h3><ul>${lista.map((r, i) => `<li>
      <div><b>${esc(r.cliente || "Cliente")}</b><small>Nº ${esc(r.n || "")} · ${esc(/^\d{4}-\d{2}-\d{2}$/.test(r.data || "") ? r.data.split("-").reverse().join("/") : "")}</small></div><span>${brl(Number(r.total) || 0)}</span>
      <div class="rc-env-bts">${r.texto ? `<button class="btn" type="button" data-rc-reenvia="${i}">Mandar de novo</button>` : ""}${r.campos ? `<button class="btn" type="button" data-rc-usa="${i}">Usar de novo</button>` : ""}</div></li>`).join("")}</ul></section>`;
  }
  function tela(host) {
    const m = meus(), car = app.carro?.() || "";
    const campo = (id, rot, attrs = "", cls = "") => `<label class="f${cls ? " " + cls : ""}"><span${id === "rcKm" ? ' id="rcLblKm"' : id === "rcPed" ? ' id="rcLblPed"' : ""}>${rot}</span><input class="in" id="${id}" ${attrs}></label>`;
    host.innerHTML = `<div id="motRoot" class="rc">
      <button class="mot-voltar" type="button" id="rcVolta"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>Voltar</button>
      <p class="hint">Para a corrida particular. O recibo explica a conta e vai pronto para o WhatsApp do cliente. Não é nota fiscal.</p>
      <div class="rc-previa" id="rcPrevia" aria-live="polite"></div>
      <form id="rcForm" class="rc-form" autocomplete="off">
        <fieldset class="rc-bloco"><legend>Cliente</legend><div class="dlg-form">
          ${campo("rcCliente", "Nome do cliente ou empresa", 'maxlength="60" placeholder="ex.: Ana Souza"', "wide")}
          ${campo("rcFone", "WhatsApp do cliente (opcional)", 'inputmode="tel" maxlength="20" placeholder="(11) 98765-4321"', "wide")}<p class="hint wide rc-aviso" id="rcFoneAviso" aria-live="polite"></p></div></fieldset>
        <fieldset class="rc-bloco"><legend>Trajeto</legend><div class="dlg-form">
          ${campo("rcData", "Data", `type="date" value="${hoje()}"`)}${campo("rcHora", "Horário de início", 'maxlength="20" placeholder="ex.: 06:00 - 06:30"')}
          ${campo("rcOrigem", "Origem", 'maxlength="80" placeholder="ex.: Rua das Flores, 120, São Paulo"', "wide")}${campo("rcDestino", "Destino", 'maxlength="80" placeholder="ex.: Aeroporto de Viracopos, Campinas"', "wide")}
          <label class="check wide"><input type="checkbox" id="rcIdaVolta"> Ida e volta</label>
          ${campo("rcKm", "Km rodados", 'inputmode="decimal" maxlength="7" placeholder="ex.: 113"')}${campo("rcKmVolta", "Km de volta", 'inputmode="decimal" maxlength="7" placeholder="ex.: 136"', "rc-volta")}</div></fieldset>
        <fieldset class="rc-bloco"><legend>Valores</legend><div class="dlg-form">
          ${campo("rcPorKm", "Preço por km (R$)", `inputmode="decimal" placeholder="ex.: 2,00" value="${esc(m.porKm || "")}"`)}${campo("rcValor", "Ou valor combinado (R$)", 'inputmode="decimal" placeholder="ex.: 400,00"')}
          ${campo("rcPed", "Pedágio (R$)", 'inputmode="decimal" placeholder="0,00"')}${campo("rcPedVolta", "Pedágio de volta (R$)", 'inputmode="decimal" placeholder="0,00"', "rc-volta")}
          ${campo("rcExtra", "Espera, bagagem (R$)", 'inputmode="decimal" placeholder="0,00"')}
          <label class="f">Desconto<span class="rc-desc"><input class="in" id="rcDesc" inputmode="decimal" placeholder="0"><select class="in" id="rcDescTipo" aria-label="Tipo do desconto"><option value="valor">R$</option><option value="pct">%</option></select></span></label>
          ${campo("rcMotivo", "Motivo do desconto (opcional)", 'maxlength="30" placeholder="ex.: promocional"', "wide")}
          <label class="f">Parcelas<select class="in" id="rcParc">${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">${i ? `${i + 1}x` : "À vista"}</option>`).join("")}</select></label>
          <label class="f">Pagamento<select class="in" id="rcForma">${FORMAS_R.map((f) => `<option${f === (m.forma || "Pix") ? " selected" : ""}>${f}</option>`).join("")}</select></label>
          ${campo("rcObs", "Observação (opcional)", 'maxlength="140" placeholder="ex.: com parada no hotel"', "wide")}</div></fieldset>
        <details class="rc-bloco rc-meus"${m.nome ? "" : " open"}><summary>Seus dados no recibo${m.nome ? `: ${esc(m.nome)}` : ""}</summary><div class="dlg-form">
          ${campo("rcNome", "Seu nome", `maxlength="60" value="${esc(m.nome || "")}"`, "wide")}${campo("rcDoc", "CPF ou CNPJ (opcional)", `maxlength="20" value="${esc(m.doc || "")}"`, "wide")}
          ${campo("rcCarro", "Carro", `maxlength="40" value="${esc(m.carro || car)}"`)}${campo("rcPlaca", "Placa (opcional)", `maxlength="8" value="${esc(m.placa || "")}"`)}
          <p class="hint wide">Ficam guardados para o próximo recibo.</p></div></details>
        <label class="check rc-lanca"><input type="checkbox" id="rcLanca" checked> Lançar o total como ganho particular</label>
        <p class="hint rc-aviso" id="rcFalta" aria-live="polite"></p>
        <div class="rc-bts"><button class="btn primary" type="submit" id="rcEnviar" disabled>Enviar no WhatsApp</button><button class="btn" type="button" id="rcCopia">Copiar o texto</button></div>
      </form>${enviados()}</div>`;
    $("rcVolta").onclick = () => app.voltar();
    const ultimos = () => (app.prefs().recibos || []).slice(-5).reverse();
    host.querySelectorAll("[data-rc-reenvia]").forEach((b) => (b.onclick = () => {
      const r = ultimos()[Number(b.dataset.rcReenvia)]; if (!r?.texto) return;
      window.open(`https://wa.me/${r.fone || ""}?text=${encodeURIComponent(r.texto)}`, "_blank", "noopener");
    }));
    host.querySelectorAll("[data-rc-usa]").forEach((b) => (b.onclick = () => {
      const r = ultimos()[Number(b.dataset.rcUsa)]; if (!r?.campos) return;
      Object.entries(r.campos).forEach(([id, v]) => { const el = $(id); if (!el) return; if (el.type === "checkbox") el.checked = Boolean(v); else el.value = v; });
      $("rcData").value = hoje(); previa(); $("rcPrevia").scrollIntoView({ behavior: "smooth", block: "start" }); toast("Preenchido com o recibo anterior. Confira e envie.");
    }));
    $("rcForm").addEventListener("input", previa); $("rcForm").addEventListener("change", previa); previa();
    const guardaMeus = (seq) => { const p = app.prefs(); p.recibo = { ...(p.recibo || {}), nome: $("rcNome").value.trim(), doc: $("rcDoc").value.trim(), carro: $("rcCarro").value.trim(), placa: $("rcPlaca").value.trim().toUpperCase(), porKm: $("rcPorKm").value.trim(), forma: $("rcForma").value, ...(seq ? { seq } : {}) }; app.salvaPrefs(); };
    $("rcCopia").onclick = async () => { const t = textoDoRecibo(dados(), conta(), brl); try { await navigator.clipboard.writeText(t); toast("Texto do recibo copiado."); } catch { toast("Não deu para copiar neste aparelho."); } guardaMeus(); };
    $("rcForm").addEventListener("submit", async (e) => {
      e.preventDefault(); const d = dados(), c = conta(); if (!(c.total > 0)) { toast("Informe o preço por km e os km, ou o valor combinado."); return $("rcPorKm").focus(); }
      if (!d.cliente) { toast("Escreva o nome do cliente."); return $("rcCliente").focus(); }
      const foneDig = $("rcFone").value.replace(/\D/g, "");
      if (foneDig && !foneParaWhats(foneDig)) { toast("Confira o WhatsApp do cliente: use DDD e número."); return $("rcFone").focus(); }
      const txt = textoDoRecibo(d, c, brl), fone = foneParaWhats(foneDig);
      const CAMPOS = ["rcCliente", "rcFone", "rcHora", "rcOrigem", "rcDestino", "rcIdaVolta", "rcKm", "rcKmVolta", "rcPorKm", "rcValor", "rcPed", "rcPedVolta", "rcExtra", "rcDesc", "rcDescTipo", "rcMotivo", "rcParc", "rcForma", "rcObs"];
      const campos = Object.fromEntries(CAMPOS.map((id) => [id, $(id).type === "checkbox" ? $(id).checked : $(id).value]));
      // abre o WhatsApp antes de qualquer espera: o celular só deixa abrir outra tela logo depois do toque
      window.open(`https://wa.me/${fone}?text=${encodeURIComponent(txt)}`, "_blank", "noopener");
      const seq = (Number(meus().seq) || 0) + 1; guardaMeus(seq);
      const p = app.prefs(); p.recibos = [...(p.recibos || []), { n: d.numero, data: d.data, cliente: d.cliente, total: c.total, fone, texto: txt, campos }].slice(-30); app.salvaPrefs();
      if ($("rcLanca").checked && app.lancaGanho) await app.lancaGanho(c.total, `Corrida particular: ${d.cliente}`, d.data || hoje());
      toast(`Recibo Nº ${d.numero} pronto no WhatsApp.`);
      tela(host);
    });
  }
  return { tela };
}
