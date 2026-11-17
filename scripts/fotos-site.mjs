// Fotos das telas do site (site/img/tela-*.png): abre a demonstração do app num navegador com tamanho de celular
// e fotografa cada tela, sempre com a data fixa (14/11/2026) para os números não mudarem.
// Uso: `node scripts/fotos-site.mjs` (todas) ou `node scripts/fotos-site.mjs inicio metas` (só algumas).
// Rode de novo sempre que o visual do app mudar, para o site mostrar o app que a pessoa vai receber.
import { chromium } from "playwright-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const SAIDA = path.join(RAIZ, "site/img");
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
const srv = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split("?")[0]); if (p.endsWith("/")) p += "index.html";
  fs.readFile(path.join(RAIZ, p), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { "Content-Type": TIPOS[path.extname(p)] || "application/octet-stream" }); r.end(d); } });
});
await new Promise((ok) => srv.listen(0, ok));
const BASE = `http://localhost:${srv.address().port}/index.html`;
let nav; try { nav = await chromium.launch({ channel: "msedge" }); } catch { nav = await chromium.launch(); }

/** Abre a demonstração, faz o caminho da tela e fotografa. */
async function foto(nome, hash, caminho, { arquivo = `tela-${nome}.png`, largura = 390, altura = 844, escala = 2, celular = true } = {}) {
  const ctx = await nav.newContext({ viewport: { width: largura, height: altura }, deviceScaleFactor: escala, serviceWorkers: "block", isMobile: celular, hasTouch: celular, colorScheme: "light" });
  const pg = await ctx.newPage();
  await pg.clock.install({ time: new Date("2026-11-14T10:00:00") });
  const w = (ms) => pg.waitForTimeout(ms);
  const clica = (s) => pg.locator(s).first().evaluate((e) => e.click(), null, { timeout: 5000 });
  await pg.goto(BASE + hash); await w(1200);
  await pg.getByRole("button", { name: /demonstra/i }).first().click({ timeout: 2000 }).catch(() => {}); await w(1800);
  await pg.evaluate(() => document.querySelectorAll("dialog[open]").forEach((d) => d.close()));
  // sem a faixa de "demonstração" e sem animação de entrada na foto
  await pg.addStyleTag({ content: "*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition:none!important} #toast,#banner{display:none!important}" });
  await caminho({ pg, w, clica });
  await w(900);
  const tipo = arquivo.endsWith(".jpg") ? "jpeg" : "png";
  await pg.screenshot({ path: path.join(SAIDA, arquivo), type: tipo, ...(tipo === "jpeg" ? { quality: 86 } : {}) });
  await ctx.close();
  console.log("ok  ", arquivo);
}
const topo = (s, folga = 12) => async ({ pg, w }) => { await pg.evaluate(([s, folga]) => { const el = document.querySelector(s); if (!el) return; el.scrollIntoView({ block: "start" }); let p = el.parentElement; while (p) { if (p.scrollHeight > p.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(p).overflowY)) { p.scrollTop -= folga; break; } p = p.parentElement; } window.scrollBy(0, -folga); }, [s, folga]); await w(300); };

const FOTOS = {
  inicio: () => foto("inicio", "#demo", async () => {}),
  vencimentos: () => foto("vencimentos", "#demo", async (t) => { await t.pg.evaluate(() => document.getElementById("agoraMes")?.click()); await t.w(900); await t.pg.evaluate(() => { const el = document.querySelector(".venc-tit")?.closest("section"); el?.scrollIntoView({ block: "start" }); window.scrollBy(0, -20); }); await t.w(300); }),
  lancar: () => foto("lancar", "#demo", async ({ pg, w, clica }) => { await clica('.acoes-ini [data-acao="lancar"]'); await w(700); await pg.evaluate(() => { for (const [id, v] of [["fValor", "32,90"], ["fDesc", "mercado"]]) { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event("input", { bubbles: true })); } }); await pg.evaluate(() => { document.activeElement?.blur(); document.querySelectorAll("dialog[open], dialog[open] *").forEach((e) => { e.scrollTop = 0; }); }); await w(500); }),
  leitura: () => foto("leitura", "#demo", async ({ w, clica }) => { await clica('.acoes-ini [data-acao="ler"]'); await w(700); }),
  metas: () => foto("metas", "#demo", async (t) => { await t.clica('#bnav [data-nav="m"]'); await t.w(900); await t.pg.evaluate(() => { const h = [...document.querySelectorAll("h2,h3,b,p")].find((e) => /^Restam R/.test(e.textContent.trim())); (h?.closest("section,article,div") || h)?.scrollIntoView({ block: "start" }); window.scrollBy(0, -96); }); await t.w(300); }),
  limites: () => foto("limites", "#demo", async (t) => { await t.clica('#bnav [data-nav="m"]'); await t.w(900); await t.clica('[data-pl-abre="cats"]'); await t.w(900); }),
  fatura: () => foto("fatura", "#demo", async ({ pg, w }) => { await pg.evaluate(() => document.getElementById("fIrCartoes")?.click()); await w(900); }),
  extrato: () => foto("extrato", "#demo", async ({ w, clica }) => { await clica('#bnav [data-nav="l"]'); await w(900); }),
  motorista: () => foto("motorista", "#motorista", async ({ pg, w, clica }) => { await clica('#bnav [data-nav="inicio"]'); await w(900); await pg.evaluate(() => window.scrollTo(0, 0)); }, { arquivo: "tela-motorista.jpg" }),
  computador: () => foto("computador", "#demo", async () => {}, { largura: 1280, altura: 800, escala: 1, celular: false }),
};
const pedidas = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(FOTOS);
for (const n of pedidas) { try { await FOTOS[n](); } catch (e) { console.log("erro", n, String(e.message || e).split("\n")[0]); } }
await nav.close(); srv.close();
