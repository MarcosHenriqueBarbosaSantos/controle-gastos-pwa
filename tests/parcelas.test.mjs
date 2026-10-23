import { test } from "node:test";
import assert from "node:assert/strict";
import { interpretaTexto, parcelasDoTexto } from "../js/leitor.js";

test("comprovante da maquininha: acha as parcelas escritas (8X SEM JUROS, PARC 08)", () => {
  const a = interpretaTexto("STONE\nCREDITO\nVALOR R$ 3.920,00\n8X SEM JUROS\nNSU 0042 VIA CLIENTE", "2026-10-23");
  assert.equal(a.valor, 3920); assert.equal(a.parcelas, 8); assert.equal(a.forma, "Cartão de crédito");
  const b = interpretaTexto("CIELO\nCREDITO\nVLR 3.920,00\nPARC 08\nNSU 1 AUT 2", "2026-10-23");
  assert.equal(b.parcelas, 8);
});
test("à vista e dinheiro não viram parcelado", () => {
  assert.equal(interpretaTexto("CREDITO A VISTA\nVALOR R$ 49,90\nNSU 1 AUT 2", "2026-10-23").parcelas, 0);
  assert.equal(interpretaTexto("MERCADO\nTOTAL R$ 100,00\nDINHEIRO R$ 50,00\nCNPJ 11", "2026-10-23").parcelas, 0);
});
test("parcelasDoTexto: total dividido pela parcela dá o número de vezes (só com crédito parcelado)", () => {
  assert.equal(parcelasDoTexto("credito parcelado sem juros", 3920, [3920, 490]), 8);
  assert.equal(parcelasDoTexto("credito", 3920, [3920, 490]), 0);
  assert.equal(parcelasDoTexto("parcelado em 40x", 100, []), 0);
});
