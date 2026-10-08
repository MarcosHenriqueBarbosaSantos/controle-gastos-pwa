// Service worker: guarda os arquivos do app para abrir na hora, com ou sem sinal, e funcionar como app instalado.
// Os dados (Supabase) sempre vêm da internet; sem conexão, o app usa a cópia e a fila do aparelho (js/store.js, comFila).
// Ao mudar arquivos, aumente a VERSAO: é ela que faz os celulares baixarem a versão nova.
const VERSAO = "meus-gastos-v51";
const ARQUIVOS = [
  "./", "index.html", "css/style.css", "manifest.webmanifest",
  "js/app.js", "js/calc.js", "js/store.js", "js/excel.js", "js/leitor.js", "js/qr.js", "js/extrato.js", "js/config.js", "js/voz.js",
  "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "icons/apple-touch-icon.png",
];
// Bibliotecas de fora que a tela usa logo ao abrir. Se a rede falhar na instalação, elas entram no primeiro uso.
const DE_FORA = [
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js",
  "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",
];
// Endereços de fora que podem ser guardados: bibliotecas e as fontes.
const HOSTS = ["cdn.jsdelivr.net", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", (e) => {
  // cache: "reload" pula o cache do navegador, para a versão nova não nascer com arquivo velho.
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ARQUIVOS.map((u) => new Request(u, { cache: "reload" })))
    .then(() => Promise.all(DE_FORA.map((u) => c.add(u).catch(() => {})))))
    .then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO && k !== COMPARTILHADO).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Compartilhar para o app (Android, com o app instalado): o comprovante escolhido em outro aplicativo chega aqui.
// Ele fica guardado só neste aparelho, por um instante, até o app abrir e ler; nada é enviado para fora.
const COMPARTILHADO = "meus-gastos-compartilhado";
async function recebeCompartilhado(req) {
  try {
    const f = await req.formData(), c = await caches.open(COMPARTILHADO);
    const arq = f.getAll("arquivo").find((x) => x && typeof x !== "string" && x.size > 0);
    const texto = ["titulo", "texto", "link"].map((k) => f.get(k)).filter((x) => typeof x === "string" && x.trim()).join("\n").slice(0, 20000);
    await c.delete("./__compartilhado/arquivo"); await c.delete("./__compartilhado/texto");
    if (arq) await c.put("./__compartilhado/arquivo", new Response(arq, { headers: { "Content-Type": arq.type || "application/octet-stream", "X-Nome": encodeURIComponent(arq.name || "arquivo") } }));
    if (texto) await c.put("./__compartilhado/texto", new Response(texto, { headers: { "Content-Type": "text/plain; charset=utf-8" } }));
  } catch { /* se não deu para guardar, o app abre normalmente */ }
  return Response.redirect("./?compartilhado=1", 303);
}

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method === "POST" && url.origin === location.origin && url.pathname.endsWith("/compartilhar")) return void e.respondWith(recebeCompartilhado(e.request));
  if (e.request.method !== "GET") return;
  if (url.hostname.endsWith("supabase.co")) return; // dados: sempre da rede
  if (url.origin !== location.origin && !HOSTS.includes(url.hostname)) return;
  e.respondWith(daCopiaEAtualiza(e));
});
/**
 * Abre na hora com o que está guardado e busca a versão da rede por trás, para a próxima abertura
 * (stale-while-revalidate). Com sinal fraco, o app não fica esperando a rede para aparecer.
 * Sem cópia guardada, vai à rede; sem rede, a navegação cai no index.html.
 */
async function daCopiaEAtualiza(e) {
  const req = e.request, navega = req.mode === "navigate";
  const copia = await caches.match(req, { ignoreSearch: navega });   // ./?atalho=lancar abre o mesmo index.html
  const daRede = fetch(req).then(async (r) => {
    // As fontes do Google chegam "opacas" (sem CORS); dá para guardar e usar do mesmo jeito.
    if (r.ok || (r.type === "opaque" && new URL(req.url).hostname === "fonts.googleapis.com")) await (await caches.open(VERSAO)).put(req, r.clone());
    return r;
  });
  if (copia) { e.waitUntil(daRede.catch(() => {})); return copia; }
  try { return await daRede; }
  catch { return (navega && (await caches.match("index.html"))) || Response.error(); }
}

// Notificações enviadas pelo servidor de avisos (supabase/functions/avisos): contas a vencer, resumo da semana e lembrete do fim do dia.
// Cada tipo tem a sua etiqueta (tag), para um não apagar o outro na tela do celular.
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { corpo: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.titulo || "Meus Gastos", {
    body: d.corpo || "", icon: "icons/icon-192.png", badge: "icons/icon-192.png", tag: d.tag || "meus-gastos-pendencias", renotify: true, data: { url: d.url || "./" },
  }));
});
// Tocar na notificação abre o app (ou traz para a frente, se já estiver aberto).
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((abas) => {
    const aberta = abas.find((c) => c.url.startsWith(self.registration.scope)), url = e.notification.data?.url || "./";
    if (!aberta) return self.clients.openWindow(url);
    aberta.postMessage({ tipo: "notificacao", url });   // o app decide o que abrir (o lembrete leva ao lançamento)
    return aberta.focus();
  }));
});
