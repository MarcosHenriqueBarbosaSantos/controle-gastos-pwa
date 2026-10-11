import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { APP_VERSAO } from "../js/config.js";

test("a versão em config.js é a mesma de sw.js (o pedido de melhoria diz qual versão estava aberta)", () => {
  const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
  assert.equal(sw.match(/const VERSAO = "meus-gastos-v(\d+)"/)[1], APP_VERSAO);
});
