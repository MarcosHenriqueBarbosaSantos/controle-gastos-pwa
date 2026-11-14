// Testes de tela: abre o app num navegador de verdade (tamanho de celular) e faz os caminhos que a pessoa faz todo dia.
// Uso: `npm run telas`. Sobe um servidor próprio, usa a demonstração (nada sai do computador) e termina com
// "Telas: N de N passaram" ou com o que quebrou. Precisa do Microsoft Edge ou do Chromium do Playwright instalado.
import { chromium } from "playwright-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const AXE = fs.readFileSync(path.join(RAIZ, "node_modules/axe-core/axe.min.js"), "utf8");
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
const srv = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split("?")[0]); if (p.endsWith("/")) p += "index.html";
  fs.readFile(path.join(RAIZ, p), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { "Content-Type": TIPOS[path.extname(p)] || "application/octet-stream" }); r.end(d); } });
});
await new Promise((ok) => srv.listen(0, ok));
const BASE = `http://localhost:${srv.address().port}/index.html`;

let nav; try { nav = await chromium.launch({ channel: "msedge" }); } catch { nav = await chromium.launch(); }
const resultados = [];
const limpa = (t) => String(t || "").replace(/\s+/g, " ");   // o app põe um espaço que não quebra entre R$ e o valor
const dinheiro = (t) => { const m = limpa(t).match(/R\$ ?[\d.]+,\d{2}/); return m ? m[0] : null; };

/** Cada teste ganha uma página nova na demonstração (geral ou de motorista), com a data fixa para os números não mudarem. */
async function teste(nome, hash, fn) {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block", isMobile: true, hasTouch: true });
  const pg = await ctx.newPage(), erros = [];
  pg.on("pageerror", (e) => erros.push(e.message));
  await pg.clock.install({ time: new Date("2026-11-14T10:00:00") });
  const w = (ms) => pg.waitForTimeout(ms);
  const clica = (s) => pg.locator(s).first().evaluate((e) => e.click(), null, { timeout: 5000 });
  const fecha = () => pg.evaluate(() => document.querySelectorAll("dialog[open]").forEach((d) => d.close()));
  const t = { pg, w, clica, fecha, texto: (s) => pg.locator(s).first().innerText({ timeout: 5000 }), aviso: () => pg.evaluate(() => { const x = document.getElementById("toast"); return x && !x.hidden ? x.textContent : ""; }) };
  try {
    await pg.goto(BASE + hash); await w(1200);
    await pg.getByRole("button", { name: /demonstra/i }).first().click({ timeout: 2000 }).catch(() => {}); await w(1800); await fecha();
    await fn(t);
    if (erros.length) throw new Error("erro na tela: " + erros[0]);
    resultados.push({ nome, ok: true });
  } catch (e) { resultados.push({ nome, ok: false, motivo: String(e.message || e).split("\n")[0].slice(0, 200) }); }
  await ctx.close();
}
const confere = (cond, msg) => { if (!cond) throw new Error(msg); };

// ---------- Caminhos de quem tem salário ----------
await teste("Início abre com o saldo e a fileira de lançar", "#demo", async ({ pg }) => {
  confere(await pg.locator(".hero.banco").count(), "sem o cartão azul do Início");
  const bts = await pg.evaluate(() => [...document.querySelectorAll(".acoes-ini button")].map((x) => x.innerText.trim()));
  confere(bts.some((x) => /Lançar gasto/.test(x)), "sem o botão Lançar gasto: " + bts.join(" | "));
});
await teste("Lançar um gasto em 3 passos (valor, categoria, lançar)", "#demo", async ({ pg, w, clica, aviso }) => {
  await clica('.acoes-ini [data-acao="lancar"]'); await w(600);
  confere(!(await pg.locator("#fFormaWrap").isVisible()), "forma de pagamento aparece aberta (devia ficar no botão Mudar)");
  await pg.locator("#fValor").fill("25"); await pg.locator("#fDesc").fill("padaria"); await clica("#fOk"); await w(900);
  confere(/Lançado/.test(await aviso()), "não apareceu o aviso de lançado");
});
await teste("Trocar a data para Ontem não dá erro", "#demo", async ({ pg, w, clica }) => {
  await clica('.acoes-ini [data-acao="lancar"]'); await w(600); await clica("#fResumo"); await w(200);
  await clica('#fDiaChips [data-dia="ontem"]'); await w(300);
  confere(/Ontem/.test(await pg.locator("#fResumo").innerText()), "o resumo não mostrou Ontem");
});
await teste("Marcar conta como paga e desfazer", "#demo", async ({ pg, w, clica, aviso }) => {
  await clica("[data-pg]"); await w(800);
  confere(/paga/i.test(await aviso()), "não avisou que a conta foi paga");
  confere(await pg.locator("#toast button").count(), "sem o botão Desfazer");
});
await teste("Não pagar este mês tira a conta só do mês", "#demo", async ({ pg, w, clica, aviso }) => {
  await clica(".venc-tit"); await w(600);
  if (!(await pg.locator("#dvFora").count())) return;   // a primeira conta pode ser fatura (sem essa opção)
  await clica("#dvFora"); await w(800);
  confere(/ficou fora/.test(await aviso()), "não avisou que a conta ficou fora do mês");
});
await teste("Os números do Início batem com o Planejar", "#demo", async ({ pg, w, clica, texto }) => {
  const livre = dinheiro(await texto(".hero.banco .v")), cabeHoje = dinheiro(await pg.locator(".agora").first().innerText().catch(() => ""));
  await clica('#bnav [data-nav="m"]'); await w(1000);
  const plan = limpa(await pg.locator("#pane-m").innerText().catch(() => ""));
  confere(livre && plan.includes(livre), `livre do Início (${livre}) não aparece no Planejar`);
  const porDia = dinheiro((plan.match(/Cabe por dia[\s\S]{0,40}/) || [""])[0]);
  confere(!cabeHoje || !porDia || cabeHoje === porDia || /Passou/.test(plan), `Cabem hoje (${cabeHoje}) diferente de Cabe por dia (${porDia})`);
});
await teste("Escanear explica o que dá para ler", "#demo", async ({ pg, w, clica }) => {
  await clica('.acoes-ini [data-acao="ler"]'); await w(600);
  confere((await pg.locator(".esc-ex li").count()) >= 3, "sem os exemplos do escanear");
});
await teste("Menu Mais abre com Ferramentas fechado", "#demo", async ({ pg, w, clica }) => {
  await clica('#bnav [data-nav="menu"]'); await w(800);
  confere(/Ferramentas/.test(await pg.locator("#mais").innerText()), "sem o grupo Ferramentas");
});

await teste("Contas fixas: cadastrar uma conta nova", "#demo", async ({ pg, w, clica, aviso }) => {
  await clica('#bnav [data-nav="menu"]'); await w(600);
  await pg.locator("#mais button", { hasText: /Contas (e entradas )?fixas/ }).first().evaluate((e) => e.click()); await w(900);
  await pg.locator("#xDesc").fill("Academia"); await pg.locator("#xVal").fill("99,90"); await pg.locator("#xDia").fill("15").catch(() => {});
  await clica("#formFx button[type=submit]"); await w(900);
  confere(/Academia/.test(await aviso()) || /Academia/.test(await pg.locator("#pane-f").innerText()), "a conta nova não apareceu");
});
await teste("Cartões: cadastrar um cartão novo", "#demo", async ({ pg, w, clica }) => {
  await clica('#bnav [data-nav="menu"]'); await w(600);
  await pg.locator("#mais button", { hasText: "Cartões" }).first().evaluate((e) => e.click()); await w(900);
  await pg.evaluate(() => { const d = document.querySelector("details.novo-cartao"); if (d) d.open = true; });
  await pg.locator("#kNome").fill("Cartão teste"); await pg.locator("#kFech").fill("5"); await pg.locator("#kVenc").fill("12");
  await clica("#formK button[type=submit]"); await w(900);
  confere(/Cartão teste/.test(await pg.locator("#pane-c").innerText()), "o cartão novo não apareceu na lista");
});

// ---------- Caminhos do motorista ----------
await teste("Motorista: Ganhos da semana abre com o total", "#motorista", async ({ pg, w, clica }) => {
  await clica('#bnav [data-nav="mot"]'); await w(800);
  const sem = dinheiro(await pg.locator("#motGanhos").innerText());
  await clica("#motGanhos"); await w(900);
  await pg.locator('[data-per="semana"]').first().evaluate((e) => e.click()).catch(() => {}); await w(600);
  confere(/Ganhos que caíram nos apps/.test(await pg.locator("#pane-mot").innerText()), "a tela Ganhos não abriu");
  confere(sem, "sem o total da semana no cartão da Jornada");
});
await teste("Motorista: Início com Iniciar jornada em primeiro", "#motorista", async ({ pg, w, clica }) => {
  await clica('#bnav [data-nav="inicio"]'); await w(800);
  const primeiro = await pg.locator(".acoes-ini button").first().innerText();
  confere(/jornada/i.test(primeiro), "o primeiro botão não é a jornada: " + primeiro);
});
await teste("Motorista: meta de hoje igual no Início e na Jornada", "#motorista", async ({ pg, w, clica }) => {
  await clica('#bnav [data-nav="inicio"]'); await w(800);
  const ini = dinheiro(await pg.locator(".agora").first().innerText().catch(() => ""));
  await clica('#bnav [data-nav="mot"]'); await w(900);
  const jor = limpa(await pg.locator("#pane-mot").innerText());
  confere(!ini || jor.includes(ini), `meta do Início (${ini}) não aparece na Jornada`);
});
await teste("Motorista: jornada inteira (iniciar, pausar, continuar, encerrar, lançar ganhos)", "#motorista", async ({ pg, w, clica, aviso }) => {
  await clica('#bnav [data-nav="mot"]'); await w(800);
  if (await pg.locator("#motIniciar").count()) { await clica("#motIniciar"); await w(800); }
  await clica("#motCirc"); await w(500); confere(/pausada/i.test(await pg.locator(".mot-estado").innerText()), "o toque no círculo não pausou");
  await clica("#motCirc"); await w(500); confere(/ativa/i.test(await pg.locator(".mot-estado").innerText()), "o segundo toque não continuou");
  await clica("#motParar"); await w(200); await clica("#motParar"); await w(900);
  confere(/encerrada/i.test(await aviso()), "não avisou que a jornada foi encerrada");
  confere(!(await pg.locator("#mtForm").count()), "encerrar abriu formulário (devia salvar na hora)");
  await pg.evaluate(() => document.querySelector(".toast-acao")?.click()); await w(800);
  await pg.locator("[data-app]").first().fill("150"); await clica("#meForm button[type=submit]"); await w(900);
  confere(/atualizado/i.test(await aviso()), "não salvou os ganhos lançados depois");
});
await teste("Motorista: conversa do desafio envia mensagem", "#motorista", async ({ pg, w, clica }) => {
  await pg.evaluate(() => [...document.querySelectorAll("button")].find((x) => /desafio/i.test(x.innerText))?.click()); await w(1500);
  if (!(await pg.locator("#dsChat").count())) {
    await pg.locator("#dsApelido").fill("Teste").catch(() => {});
    await pg.evaluate(() => { const d = [...document.querySelectorAll("details.ds-op")][1]; if (d) d.open = true; });
    await pg.locator("#dsNome").fill("Galera").catch(() => {}); await clica("#dsCriar"); await w(1800);
  }
  await clica("#dsChat"); await w(1200);
  const antes = await pg.locator(".chat-m").count();
  await pg.locator("#chatTxt").fill("teste"); await clica("#chatForm .chat-env"); await w(800);
  confere((await pg.locator(".chat-m").count()) === antes + 1, "a mensagem não apareceu na conversa");
});

await teste("Motorista no tema claro: jornada pausada com texto legível", "#motorista", async ({ pg, w, clica }) => {
  await pg.evaluate(() => { localStorage.setItem("cg-tema", "claro"); document.documentElement.dataset.tema = "claro"; });
  await clica('#bnav [data-nav="mot"]'); await w(800);
  if (await pg.locator("#motIniciar").count()) { await clica("#motIniciar"); await w(800); }
  await clica("#motCirc"); await w(600);
  await pg.addScriptTag({ content: AXE });
  const ruins = await pg.evaluate(async () => (await axe.run("#listas", { runOnly: ["color-contrast"] })).violations.flatMap((v) => v.nodes.map((n) => n.target.join(" "))));
  confere(!ruins.length, "texto sem contraste: " + ruins.slice(0, 3).join("; "));
});

// ---------- Acessibilidade das telas principais ----------
for (const [nome, hash, aba] of [["Início", "#demo", "inicio"], ["Extrato", "#demo", "l"], ["Planejar", "#demo", "m"], ["Mais", "#demo", "menu"], ["Jornada", "#motorista", "mot"]]) {
  await teste(`Acessibilidade sem problema grave: ${nome}`, hash, async ({ pg, w, clica }) => {
    await clica(`#bnav [data-nav="${aba}"]`).catch(() => {}); await w(900);
    await pg.addScriptTag({ content: AXE });
    const graves = await pg.evaluate(async () => (await axe.run(document, { resultTypes: ["violations"] })).violations.filter((v) => v.impact === "critical" || v.impact === "serious").map((v) => `${v.id} (${v.nodes[0].target}): ${v.nodes[0].html.slice(0, 160)}`));
    confere(!graves.length, graves.join("; "));
  });
}

await nav.close(); srv.close();
const ok = resultados.filter((r) => r.ok).length;
for (const r of resultados) console.log(`${r.ok ? "ok  " : "FALHOU"} ${r.nome}${r.ok ? "" : `\n       ${r.motivo}`}`);
console.log(`\nTelas: ${ok} de ${resultados.length} passaram.`);
process.exitCode = ok === resultados.length ? 0 : 1;
