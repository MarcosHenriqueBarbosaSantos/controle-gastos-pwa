// Service worker: guarda os arquivos do app para abrir rápido e funcionar como app instalado.
// Os dados (Supabase) sempre vêm da internet. Ao mudar arquivos, aumente a VERSAO.
const VERSAO = "meus-gastos-v38";
const ARQUIVOS = [
  "./", "index.html", "css/style.css", "manifest.webmanifest",
  "js/app.js", "js/calc.js", "js/store.js", "js/excel.js", "js/leitor.js", "js/qr.js", "js/extrato.js", "js/config.js",
  "icons/icon-192.png", "icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (url.hostname.endsWith("supabase.co")) return; // dados: sempre da rede
  // Arquivos do app: tenta a rede primeiro (pega atualizações) e cai no cache se estiver offline.
  e.respondWith(
    fetch(e.request).then((r) => {
      if (r.ok && (url.origin === location.origin || url.hostname === "cdn.jsdelivr.net")) {
        const copia = r.clone(); caches.open(VERSAO).then((c) => c.put(e.request, copia));
      }
      return r;
    }).catch(() => caches.match(e.request).then((m) => m || (e.request.mode === "navigate" ? caches.match("index.html") : Response.error())))
  );
});

// Notificação de contas a vencer, enviada pelo servidor de avisos (supabase/functions/avisos).
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { corpo: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.titulo || "Meus Gastos", {
    body: d.corpo || "", icon: "icons/icon-192.png", badge: "icons/icon-192.png", tag: "meus-gastos-pendencias", renotify: true, data: { url: d.url || "./" },
  }));
});
// Tocar na notificação abre o app (ou traz para a frente, se já estiver aberto).
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((abas) => {
    const aberta = abas.find((c) => c.url.startsWith(self.registration.scope));
    return aberta ? aberta.focus() : self.clients.openWindow(e.notification.data?.url || "./");
  }));
});
