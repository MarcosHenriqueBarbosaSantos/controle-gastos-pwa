/* ---------- Conversa do desafio ----------
   Texto curto entre quem está no mesmo desafio. Busca as novas a cada 5 segundos só com a tela aberta.
   Para quem está dirigindo: o microfone dita a mensagem, e "Ler em voz alta" fala as mensagens que chegam (no fone).
   Primeira tela separada do app.js: o que ela usa do app chega pelo objeto `app` (veja criaConversa). */

const ERROS_CHAT = { devagar: "Calma: espere uns segundos para mandar outra.", longa: "Mensagem longa demais (até 280 letras).", fora_do_desafio: "Você não está mais neste desafio.", vazia: "Escreva alguma coisa antes de mandar." };

/** A frase para a pessoa a partir do erro do servidor (supabase/desafio-chat.sql). */
export function erroDoChat(e) {
  const msg = String(e?.message ?? e ?? "");
  const conhecido = Object.entries(ERROS_CHAT).find(([k]) => msg.includes(k));
  if (conhecido) return conhecido[1];
  if (msg.includes("desafio_msgs") || msg.includes("function")) return "A conversa ainda não foi ligada no servidor.";
  return "Não deu para falar com o servidor. Tente de novo.";
}

/** Junta as mensagens novas às que já estão na tela, sem repetir e guardando só as 200 mais recentes. */
export function juntaMsgs(antes, novas, max = 200) {
  const vistos = new Set(antes.map((m) => m.id));
  return [...antes, ...novas.filter((m) => !vistos.has(m.id))].slice(-max);
}

/**
 * app: { $, esc, ico, toast, armDelete, uso, hhmm, ddmm, isoLocal, hoje, store(), Reconhecedor, voltar() }.
 * Devolve { abre({ id, nome }), tela(host) }: abre escolhe o desafio; tela desenha a conversa dentro de host.
 */
export function criaConversa(app) {
  const { $, esc, ico, toast, armDelete, uso, hhmm, ddmm, isoLocal, hoje } = app;
  let de = null, msgs = [], timer = 0, falar = false, erro = "";
  try { falar = localStorage.getItem("cg-chat-falar") === "1"; } catch { /* nada */ }

  const fala = (m) => { try { if (!falar || m.eu || !("speechSynthesis" in window)) return; const u = new SpeechSynthesisUtterance(`${m.apelido} disse: ${m.texto}`); u.lang = "pt-BR"; speechSynthesis.speak(u); } catch { /* sem voz no aparelho */ } };
  const hora = (iso) => { const d = new Date(iso); return isoLocal(d.getTime()) === hoje() ? hhmm(d.getTime()) : `${ddmm(isoLocal(d.getTime()))} ${hhmm(d.getTime())}`; };
  const html = () => !msgs.length ? `<p class="chat-vazio">Ninguém falou nada ainda. Mande um oi para a galera.</p>`
    : msgs.map((m) => `<li class="chat-m${m.eu ? " eu" : ""}"><span class="quem">${m.eu ? "Você" : esc(m.apelido)} · ${hora(m.criado)}</span><p>${esc(m.texto)}</p>${m.pode_apagar ? `<button type="button" class="chat-x" data-chat-x="${m.id}" aria-label="Apagar a mensagem">Apagar</button>` : ""}</li>`).join("");
  function desenha(rolar) {
    const ul = $("chatLista"); if (!ul) return; const perto = ul.scrollHeight - ul.scrollTop - ul.clientHeight < 80;
    ul.innerHTML = html(); if (rolar || perto) ul.scrollTop = ul.scrollHeight;
    ul.querySelectorAll("[data-chat-x]").forEach((b) => armDelete(b, async () => { try { await app.store().chatApagar(Number(b.dataset.chatX)); msgs = msgs.filter((m) => m.id !== Number(b.dataset.chatX)); desenha(); } catch (e) { toast(erroDoChat(e)); } }, "Toque de novo"));
  }
  async function busca(primeira) {
    if (!de || !$("chatLista")) return clearInterval(timer);
    if (document.hidden) return;
    try {
      const depois = primeira ? 0 : msgs.at(-1)?.id || 0, novas = await app.store().chatMsgs(de.id, depois);
      if (primeira) msgs = novas; else { novas.forEach(fala); msgs = juntaMsgs(msgs, novas); }
      erro = ""; if (primeira || novas.length) desenha(primeira);
    } catch (e) { erro = erroDoChat(e); const el = $("chatMsg"); if (el) el.textContent = erro; }
  }
  function tela(host) {
    if (!de) return app.voltar();
    clearInterval(timer);
    host.innerHTML = `<div id="motRoot" class="chat">
    <button class="mot-voltar" type="button" id="chatVolta"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>Voltar ao desafio</button>
    <h2 class="chat-tit">${esc(de.nome)}</h2>
    <label class="check sm chat-falar"><input type="checkbox" id="chatFalar"${falar ? " checked" : ""}> Ler as mensagens novas em voz alta (bom com fone)</label>
    <ul class="chat-lista" id="chatLista" aria-live="polite"><li class="chat-vazio">Carregando a conversa…</li></ul>
    <p class="auth-msg err" id="chatMsg" role="alert">${esc(erro)}</p>
    <form class="chat-form" id="chatForm" autocomplete="off">
      <input class="in" id="chatTxt" maxlength="280" placeholder="Escreva para a galera" aria-label="Mensagem">
      ${app.Reconhecedor ? `<button type="button" class="chat-mic" id="chatMic" aria-label="Falar a mensagem">${ico("mic")}</button>` : ""}
      <button type="submit" class="btn primary chat-env">Enviar</button></form>
    <p class="hint chat-regra">Só quem está no desafio vê a conversa. Seja gentil: quem criou o desafio pode apagar mensagens e remover participantes.</p></div>`;
    $("chatVolta").onclick = () => { clearInterval(timer); app.voltar(); };
    $("chatFalar").onchange = (e) => { falar = e.target.checked; try { localStorage.setItem("cg-chat-falar", falar ? "1" : "0"); } catch { /* nada */ } if (falar) toast("As mensagens novas serão lidas em voz alta."); };
    $("chatForm").addEventListener("submit", async (e) => {
      e.preventDefault(); const t = $("chatTxt").value.trim(); if (!t) return $("chatTxt").focus();
      const bt = host.querySelector(".chat-env"); bt.disabled = true;
      try { const m = await app.store().chatEnviar(de.id, t); msgs = juntaMsgs(msgs.filter((x) => x.id !== m.id), [m]); $("chatTxt").value = ""; $("chatMsg").textContent = ""; desenha(true); uso("chat_mensagem"); }
      catch (er) { $("chatMsg").textContent = erroDoChat(er); }
      bt.disabled = false;
    });
    if ($("chatMic")) $("chatMic").onclick = () => {
      try {
        const r = new app.Reconhecedor(); r.lang = "pt-BR"; r.interimResults = false; r.maxAlternatives = 1;
        $("chatMic").classList.add("ouvindo"); r.onresult = (ev) => { const t = ev.results[0][0].transcript; $("chatTxt").value = ($("chatTxt").value + " " + t).trim(); };
        r.onend = () => $("chatMic")?.classList.remove("ouvindo"); r.onerror = () => $("chatMic")?.classList.remove("ouvindo"); r.start();
      } catch { toast("O microfone não está disponível agora."); }
    };
    busca(true); timer = setInterval(() => busca(false), 5000);
  }
  return { abre: (d) => { de = d; msgs = []; erro = ""; }, tela };
}
