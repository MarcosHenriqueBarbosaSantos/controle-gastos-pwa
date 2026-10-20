// O service worker guarda os arquivos do app para abrir sem internet: todo módulo de js/ precisa estar na lista dele.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

test("todo arquivo .js de js/ está na lista de arquivos guardados para abrir sem internet", () => {
  const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
  const lista = sw.match(/const ARQUIVOS = \[([\s\S]*?)\];/)[1];
  const guardados = [...lista.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  const modulos = readdirSync(new URL("../js/", import.meta.url), { withFileTypes: true }).filter((f) => f.isFile() && f.name.endsWith(".js")).map((f) => `js/${f.name}`);
  assert.ok(modulos.length >= 10);
  assert.deepEqual(modulos.filter((m) => !guardados.includes(m)), []);
});

test("todo arquivo importado por outro módulo existe", () => {
  const dir = new URL("../js/", import.meta.url);
  for (const f of readdirSync(dir).filter((n) => n.endsWith(".js"))) {
    const t = readFileSync(new URL(f, dir), "utf8");
    for (const m of t.matchAll(/from "\.\/([\w.-]+\.js)"/g)) assert.ok(readdirSync(dir).includes(m[1]), `${f} importa ./${m[1]}, que não existe`);
  }
});
