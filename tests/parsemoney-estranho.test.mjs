import test from "node:test";
import assert from "node:assert/strict";
import { parseMoney } from "../js/calc.js";

test("valor com letras ou notação científica não vira número", () => {
  for (const t of ["1e3", "0x10", "Infinity", "abc", "12a", "R$ 50 reais"]) assert.ok(Number.isNaN(parseMoney(t)), t);
});
test("os formatos de sempre continuam valendo", () => {
  assert.equal(parseMoney("R$ 1.234,56"), 1234.56);
  assert.equal(parseMoney("1,234.56"), 1234.56);
  assert.equal(parseMoney("12,5"), 12.5);
  assert.equal(parseMoney("-50"), -50);
  assert.equal(parseMoney(7), 7);
});
