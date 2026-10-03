// Service worker: guarda os arquivos do app para abrir rápido e funcionar como app instalado.
// Os dados (Supabase) sempre vêm da internet. Ao mudar arquivos, aumente a VERSAO.
const VERSAO = "meus-gastos-v6";
const ARQUIVOS = [
  "./", "index.html", "css/style.css", "manifest.webmanifest",
  "js/app.js", "js/calc.js", "js/store.js", "js/excel.js", "js/config.js",
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
