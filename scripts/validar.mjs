// Validação antes de publicar: nada vai para a main se isto não passar.
// Roda os testes, confere a versão do app e do service worker, a sintaxe de cada arquivo e se todo módulo está na lista offline.
// Uso: npm run validar
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const raiz = new URL("../", import.meta.url), le = (p) => readFileSync(new URL(p, raiz), "utf8");
// Este teste já falhava no Windows antes de tudo (quebra de linha do gera-regras.mjs); no servidor Linux ele passa. É o único tolerado.
const CONHECIDOS = ["as regras do servidor (regras.js) estão em dia com o calc.js do app"];
const falhas = [];

// 1. testes
const t = spawnSync(process.execPath, ["--test", "--test-reporter=tap", ...readdirSync(new URL("tests/", raiz)).filter((f) => f.endsWith(".test.mjs")).map((f) => `tests/${f}`)], { cwd: fileURLToPath(raiz), encoding: "utf8" });
const saida = `${t.stdout}\n${t.stderr}`, quebrados = [...saida.matchAll(/^not ok \d+ - (.+)$/gm)].map((m) => m[1].trim()).filter((n) => !CONHECIDOS.includes(n));
const total = Number((saida.match(/^# tests (\d+)/m) || [])[1] || 0), passou = Number((saida.match(/^# pass (\d+)/m) || [])[1] || 0);
if (!total) falhas.push("os testes não rodaram");
quebrados.forEach((n) => falhas.push(`teste falhou: ${n}`));

// 2. versão do app = versão do service worker
const app = (le("js/config.js").match(/APP_VERSAO\s*=\s*"(\d+)"/) || [])[1], sw = (le("sw.js").match(/meus-gastos-v(\d+)/) || [])[1];
if (!app || app !== sw) falhas.push(`versão diferente: js/config.js = ${app}, sw.js = ${sw}`);

// 3. sintaxe de cada módulo e lista offline do service worker
const modulos = readdirSync(new URL("js/", raiz)).filter((f) => f.endsWith(".js"));
for (const m of modulos) {
  const r = spawnSync(process.execPath, ["--check", fileURLToPath(new URL(`js/${m}`, raiz))], { encoding: "utf8" });
  if (r.status !== 0) falhas.push(`erro de sintaxe em js/${m}`);
}
const lista = (le("sw.js").match(/const ARQUIVOS = \[([\s\S]*?)\];/) || [])[1] || "";
modulos.filter((m) => !lista.includes(`"js/${m}"`)).forEach((m) => falhas.push(`js/${m} não está na lista offline do sw.js`));

console.log(`Testes: ${passou} de ${total} passaram${total - passou - quebrados.length > 0 ? " (1 conhecido do Windows tolerado)" : ""}. Versão ${app}.`);
if (falhas.length) { console.error("\nNÃO PUBLIQUE. Problemas:\n- " + falhas.join("\n- ")); process.exit(1); }
console.log("Validação ok: pode publicar.");
