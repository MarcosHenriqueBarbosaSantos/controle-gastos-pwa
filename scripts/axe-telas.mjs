// Acessibilidade das telas com o axe-core.
// Uso: em um terminal, `npx serve -l 5180 .`; em outro, `node scripts/axe-telas.mjs "#motorista"` (ou "#demo").
// Precisa de `npm i` (axe-core), de playwright-core e do Microsoft Edge instalado. Só lê as telas: não muda nada.
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";

const AXE = fileURLToPath(new URL("../node_modules/axe-core/axe.min.js", import.meta.url));
const hash = process.argv[2] || "#motorista";
const nav = await chromium.launch({ channel: "msedge", headless: true });
const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, serviceWorkers: "block" });
const p = await ctx.newPage();
await p.clock.install({ time: new Date("2026-11-04T10:00:00") });
await p.goto("http://localhost:5180/" + hash);
await p.waitForTimeout(4500);
for (let i = 0; i < 3; i++) { const b = p.locator("dialog[open] button", { hasText: /^Pular$/ }); if (await b.count()) { await b.first().click(); await p.waitForTimeout(300); } }
await p.addScriptTag({ path: AXE });
const ordem = { critical: 0, serious: 1, moderate: 2, minor: 3 };
let graves = 0;
const roda = async (nome) => {
  const r = await p.evaluate(async () => {
    const res = await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] } });
    return res.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, ajuda: v.help, ex: v.nodes.slice(0, 2).map((n) => n.target.join(" ")) }));
  });
  console.log(`== ${nome} (${r.length} tipos)`);
  r.sort((a, b) => ordem[a.impact] - ordem[b.impact]).forEach((v) => { if (ordem[v.impact] <= 1) graves++; console.log(`  [${v.impact}] ${v.id} x${v.n}: ${v.ajuda}\n     ${v.ex.join("\n     ")}`); });
};
const ir = async (n) => { await p.evaluate((x) => document.querySelector(`[data-nav=${x}]`)?.click(), n); await p.waitForTimeout(900); };
await ir("inicio"); await roda("Início");
await ir("l"); await roda("Extrato");
await ir("mot"); await roda("Jornada parada");
await p.evaluate(() => document.getElementById("motIniciar")?.click()); await p.waitForTimeout(900); await roda("Jornada ativa");
await ir("menu"); await roda("Mais");
await ir("mais"); await roda("Lançar");
await nav.close();
console.log(graves ? `\n${graves} problema(s) grave(s) ou sérios.` : "\nNenhum problema grave ou sério.");
