// Lista de mercado: corredores, repetir a última compra, variação de preço e resumo da compra.
import test from "node:test";
import assert from "node:assert/strict";
import { corredorDoItem, agrupaPorCorredor, registraPrecos, variacaoDoPreco, itensParaRepetir, resumoDaCompra } from "../js/extras.js";

test("corredor: reconhece itens comuns, com acento, plural e caixa diferentes", () => {
  assert.equal(corredorDoItem("Tomates"), "Hortifruti");
  assert.equal(corredorDoItem("  Pão francês "), "Padaria");
  assert.equal(corredorDoItem("Frango"), "Açougue e peixaria");
  assert.equal(corredorDoItem("Leite integral"), "Frios e laticínios");
  assert.equal(corredorDoItem("Arroz 5kg"), "Mercearia");
  assert.equal(corredorDoItem("Água sanitária"), "Limpeza");
  assert.equal(corredorDoItem("Papel higiênico"), "Higiene");
  assert.equal(corredorDoItem("Pilha"), "Outros");
  assert.equal(corredorDoItem(""), "Outros");
});

test("agrupar: na ordem do mercado, só com corredor que tem item", () => {
  const g = agrupaPorCorredor([{ nome: "Sabonete" }, { nome: "Banana" }, { nome: "Pilha" }, { nome: "Arroz" }, { nome: "Maçã" }]);
  assert.deepEqual(g.map((x) => x.corredor), ["Hortifruti", "Mercearia", "Higiene", "Outros"]);
  assert.deepEqual(g[0].itens.map((x) => x.nome), ["Banana", "Maçã"]);
});

test("preço: guarda a história e mostra a variação só quando passa de 3%", () => {
  let h = registraPrecos({}, { arroz: 20 }, "2026-09-03");
  assert.equal(variacaoDoPreco(h.arroz, 20), null);              // só um registro
  h = registraPrecos(h, { arroz: 22.4 }, "2026-10-10");
  assert.deepEqual(variacaoDoPreco(h.arroz, 22.4), { pct: 12, desde: "2026-09-03", antes: 20 });
  h = registraPrecos(h, { arroz: 20.4 }, "2026-10-10");          // mesmo dia: troca o registro
  assert.equal(h.arroz.length, 2);
  assert.equal(variacaoDoPreco(h.arroz, 20.4), null);            // 2%: ignorado
  for (let i = 0; i < 10; i++) h = registraPrecos(h, { arroz: 20 + i }, `2026-11-${String(i + 1).padStart(2, "0")}`);
  assert.equal(h.arroz.length, 6);
});

test("repetir a última compra: traz só o que ainda não está na lista", () => {
  const ultima = { itens: [{ nome: "Arroz", qtd: 2 }, { nome: "Café", qtd: 1 }, { nome: "Leite", qtd: 6 }] };
  assert.deepEqual(itensParaRepetir(ultima, [{ nome: " arroz " }]).map((x) => x.nome), ["Café", "Leite"]);
  assert.deepEqual(itensParaRepetir(null, []), []);
});

test("resumo da compra: abaixo, acima ou parecida com a média", () => {
  assert.match(resumoDaCompra(240, 300), /20% abaixo/);
  assert.match(resumoDaCompra(360, 300), /20% acima/);
  assert.match(resumoDaCompra(305, 300), /parecida/);
  assert.equal(resumoDaCompra(300, 0), "");
});
