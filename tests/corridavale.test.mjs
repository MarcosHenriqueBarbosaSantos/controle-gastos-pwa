// "Essa corrida vale?": o valor da oferta contra o mínimo por km e por hora da pessoa.
import test from "node:test";
import assert from "node:assert/strict";
import { corridaVale } from "../js/motorista.js";

const regra = { minimo: 1.76, boa: 2 };

test("corrida boa, que vale, no limite e que não vale", () => {
  assert.equal(corridaVale({ valor: 18, km: 7, min: 15 }, regra, 40).veredito, "boa");      // 2,57/km e 72/h
  assert.equal(corridaVale({ valor: 13, km: 7, min: 15 }, regra, 40).veredito, "vale");     // 1,86/km
  assert.equal(corridaVale({ valor: 11.5, km: 7, min: 15 }, regra, 40).veredito, "limite"); // 1,64/km: até 10% abaixo
  const r = corridaVale({ valor: 9, km: 7, min: 15 }, regra, 40);
  assert.equal(r.veredito, "nao"); assert.equal(r.porKm, 1.29); assert.equal(r.valorMinimo, 12.32);   // 7 km x 1,76
});

test("o mínimo por hora também conta, e sem minutos só o km decide", () => {
  assert.equal(corridaVale({ valor: 18, km: 7, min: 40 }, regra, 40).veredito, "nao");    // 27/h, bem abaixo de 40/h
  assert.equal(corridaVale({ valor: 18, km: 7 }, regra, 40).veredito, "boa");
  assert.equal(corridaVale({ valor: 0, km: 7 }, regra, 40), null);
  assert.equal(corridaVale({ valor: 10, km: 0 }, regra, 40), null);
});

import { entendeCorrida } from "../js/voz.js";

test("a oferta falada: valor, km e minutos, em qualquer ordem e por extenso", () => {
  assert.deepEqual(entendeCorrida("dezoito reais, sete quilômetros, quinze minutos"), { km: 7, min: 15, valor: 18 });
  assert.deepEqual(entendeCorrida("18,50 com 7,2 km e 15 min"), { km: 7.2, min: 15, valor: 18.5 });
  assert.deepEqual(entendeCorrida("7 km 15 minutos 18 reais"), { km: 7, min: 15, valor: 18 });
  assert.deepEqual(entendeCorrida("corrida de 22 reais e 50 centavos 9 km"), { km: 9, valor: 22.5 });
  assert.deepEqual(entendeCorrida(""), {});
});

import { resumoDasOfertas, faixaDoDia } from "../js/motorista.js";

const hora = (h) => new Date(2026, 10, 3, h, 0, 0).getTime();
const of = (acao, valor, km, h) => ({ t: hora(h), valor, km, acao });

test("faixas do dia", () => {
  assert.deepEqual([2, 8, 14, 20].map((h) => faixaDoDia(hora(h))), ["Madrugada", "Manhã", "Tarde", "Noite"]);
});

test("histórico de ofertas: aceitou abaixo do mínimo, recusou boas e a melhor faixa", () => {
  const l = [of("aceitei", 9, 7, 8), of("aceitei", 20, 8, 8), of("recusei", 18, 7, 9), of("aceitei", 14, 7, 20), of("aceitei", 25, 8, 21), of("aceitei", 22, 7, 22)];
  const r = resumoDasOfertas(l, 1.76);
  assert.equal(r.total, 6); assert.equal(r.aceitas, 5); assert.equal(r.recusadas, 1);
  assert.equal(r.abaixoAceitas, 1);                       // 9 por 7 km = 1,29/km
  assert.equal(r.perdaAbaixo, 3.32);                      // 7 km x 1,76 = 12,32 - 9
  assert.equal(r.boasRecusadas, 1);                       // a de 18 por 7 km passava
  assert.equal(r.melhorFaixa?.faixa, "Noite");            // 3 ofertas à noite pagaram mais por km que as 3 da manhã
  assert.equal(resumoDasOfertas([], 1.76), null);
  assert.equal(resumoDasOfertas([{ t: 1, valor: 10, km: 0, acao: "aceitei" }], 1.76), null);
});

test("histórico de ofertas: com poucas ofertas por faixa não aponta a melhor", () => {
  const r = resumoDasOfertas([of("aceitei", 20, 8, 8), of("aceitei", 25, 8, 21)], 1.76);
  assert.equal(r.melhorFaixa, null);
});
