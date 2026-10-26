import test from "node:test";
import assert from "node:assert/strict";
import { leEtiquetaDePreco, nomeDaEtiqueta } from "../js/etiqueta.js";

test("etiqueta pesada (açougue): total que fecha com peso × preço por kg", () => {
  const acem = leEtiquetaDePreco("ASSAI ATACADISTA\nACEM S/O BOV FC kg\nDATA PESAGEM: 26/10/26\nHORA: 12:57\nVALIDADE: 28/10/26\nPESO: 1,028kg\nR$/kg 48,90\nTOTAL R$\n50,27\n20086500102862810260");
  assert.deepEqual([acem.tipo, acem.nome, acem.valor, acem.peso, acem.porKg], ["pesado", "Acém", 50.27, 1.028, 48.9]);
  const costela = leEtiquetaDePreco("ASSAI\nCOSTELA TRAS PART FC\nDATA PESAGEM 26/10/26\nPESO: 1.084kg\nR$/kg 34.50\nTOTAL R$ 37,40");
  assert.deepEqual([costela.nome, costela.valor, costela.peso, costela.porKg], ["Costela", 37.4, 1.084, 34.5]);
});

test("etiqueta pesada: leitura com erro no total é corrigida pela conta peso × kg", () => {
  const r = leEtiquetaDePreco("COSTELA TRAS PART FC\nPESO: 1,084kg\nR$/kg 34,50\nTOTAL R$ 57,40\n37,40");
  assert.equal(r.valor, 37.4);
  const sem = leEtiquetaDePreco("ACEM\nPESO 1,028 kg\nTOTAL R$ 50,27");
  assert.equal(sem.valor, 50.27, "sem preço por kg legível, vale o total marcado");
});

test("placa de prateleira: preço grande, e Varejo quando tem Atacado e Varejo", () => {
  const alface = leEtiquetaDePreco("APROVEITE\nALFACE\nCRESPA\nR$ 4,79\nPreço por 1un\nAtacado: R$ 4,79\nVarejo: R$ 4,79\nLJ 273 - 26/10/2026 - 06:34");
  assert.deepEqual([alface.tipo, alface.nome, alface.valor, alface.unidade], ["prateleira", "Alface crespa", 4.79, "un"]);
  const cebola = leEtiquetaDePreco("APROVEITE\nCEBOLA\nNACIONAL\nKG\nR$ 7,99\nPreço por 1kg\nAtacado: R$ 7,49\nVarejo: R$ 7,99");
  assert.deepEqual([cebola.nome, cebola.valor, cebola.unidade], ["Cebola", 7.99, "kg"]);
});

test("etiqueta: texto sem preço devolve null; nome limpa siglas", () => {
  assert.equal(leEtiquetaDePreco("nada aqui"), null);
  assert.equal(leEtiquetaDePreco(""), null);
  assert.equal(nomeDaEtiqueta("ACEM S/O BOV FC kg"), "Acém");
  assert.equal(nomeDaEtiqueta("MACARRAO ESPAGUETE 500G"), "Macarrão espaguete");
});
