import test from "node:test";
import assert from "node:assert/strict";
import { conferirListaComNota, parecenca, valoresDaLinha } from "../js/notamercado.js";

// A nota do Assaí de 26/10/2026 (10 linhas, total R$ 170,73).
const nota = { valor: 170.73, itens: [
  { nome: "ARR CAMIL PARB 5kg", qtd: 1, un: "PC", valor: 22.89 }, { nome: "COSTELA TRAS PART FC", qtd: 1.084, un: "Kg", valor: 37.39 },
  { nome: "ALFACE CRESPA", qtd: 1, un: "PC", valor: 4.79 }, { nome: "SAC ASSAI 58X70 VDE", qtd: 2, un: "Un", valor: 0.6 },
  { nome: "LTE INT ITALAC 1L CT", qtd: 1, un: "Un", valor: 5.49 }, { nome: "PAO F BAUD TRAD 390G", qtd: 1, un: "Un", valor: 6.99 },
  { nome: "ACEM S/O BOV FC kg", qtd: 1.028, un: "Kg", valor: 50.26 }, { nome: "BATATA MONALI LAV kg", qtd: 2.685, un: "Kg", valor: 18.76 },
  { nome: "CEBOLA NAC kg", qtd: 0.76, un: "Kg", valor: 6.07 }, { nome: "AREIA GRAN FLORAL 4K", qtd: 1, un: "Un", valor: 17.49 } ] };
const lista = [
  { id: "1", nome: "Arroz", qtd: 1, preco: 22.89, pego: true }, { id: "2", nome: "Costela", qtd: 1, preco: 37.4, pego: true },
  { id: "3", nome: "Alface crespa", qtd: 1, preco: 4.79, pego: true }, { id: "4", nome: "Leite", qtd: 1, preco: 5.99, pego: true },
  { id: "5", nome: "Pão", qtd: 1, preco: 6.99, pego: true }, { id: "6", nome: "Acém", qtd: 1, preco: 50.27, pego: true },
  { id: "7", nome: "Batata", qtd: 1, preco: 0, pego: true }, { id: "8", nome: "Cebola", qtd: 1, preco: 6.07, pego: true },
  { id: "9", nome: "Areia", qtd: 1, preco: 17.49, pego: true }, { id: "10", nome: "Macarrão", qtd: 1, preco: 4.5, pego: true } ];

test("casa os itens da lista com as linhas da nota, mesmo abreviadas", () => {
  assert.ok(parecenca("Arroz", "ARR CAMIL PARB 5kg") >= 0.5);
  assert.ok(parecenca("Leite", "LTE INT ITALAC 1L CT") >= 0.5);
  assert.ok(parecenca("Pão", "PAO F BAUD TRAD 390G") >= 0.5);
  assert.equal(parecenca("Macarrão", "ARR CAMIL PARB 5kg"), 0);
  const r = conferirListaComNota(lista, nota);
  assert.equal(r.pares.length, 9);
  assert.deepEqual(r.pares.map((p) => p.item.nome), ["Arroz", "Costela", "Alface crespa", "Leite", "Pão", "Acém", "Batata", "Cebola", "Areia"]);
  assert.deepEqual(r.soNaLista.map((x) => x.nome), ["Macarrão"], "o que está no carrinho e não veio na nota");
  assert.deepEqual(r.soNaNota.map((l) => l.nome), ["SAC ASSAI 58X70 VDE"], "o que veio na nota e não estava na lista");
  assert.equal(r.totalNota, 170.73);
});

test("diferenças de preço e valores da nota (kg = total da linha; unidade = preço de cada)", () => {
  const r = conferirListaComNota(lista, nota), por = (n) => r.pares.find((p) => p.item.nome === n);
  assert.equal(por("Leite").diferenca, -0.5, "lista R$ 5,99; nota R$ 5,49");
  assert.equal(por("Costela").diferenca, -0.01); assert.equal(por("Acém").diferenca, -0.01);
  assert.equal(por("Batata").totalNota, 18.76); assert.equal(por("Batata").diferenca, 18.76, "sem preço na lista, o carrinho conta zero");
  assert.deepEqual(valoresDaLinha({ qtd: 2, un: "Un", valor: 0.6 }), { qtd: 2, preco: 0.3, total: 0.6 });
  assert.deepEqual(valoresDaLinha({ qtd: 2.685, un: "Kg", valor: 18.76 }), { qtd: 1, preco: 18.76, total: 18.76 });
});

test("nota vazia ou lista vazia não quebram", () => {
  assert.deepEqual(conferirListaComNota([], { valor: 10, itens: [] }).pares, []);
  assert.equal(conferirListaComNota(lista, null).totalNota, 0);
});
