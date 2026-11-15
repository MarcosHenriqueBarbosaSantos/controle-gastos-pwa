import test from "node:test";
import assert from "node:assert/strict";
import { contaDoRecibo, numeroDoRecibo, foneParaWhats, textoDoRecibo, dataPorExtensoRecibo } from "../js/recibo.js";

const brl = (n) => "R$ " + n.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");

test("corrida pelo valor combinado ou por km total × preço", () => {
  assert.equal(contaDoRecibo({ valor: 120 }).corrida, 120);
  assert.equal(contaDoRecibo({ km: 42, porKm: 2.5 }).corrida, 105);
  assert.equal(contaDoRecibo({ valor: 80, km: 42, porKm: 2.5 }).corrida, 80);
  const c = contaDoRecibo({ km: 113, kmVolta: 136, porKm: 2 });
  assert.deepEqual([c.kmTotal, c.corrida, c.pelaKm], [249, 498, true]);
});

test("o modelo do dono: ida e volta, pedágios, subtotal e desconto promocional", () => {
  const c = contaDoRecibo({ km: 113, kmVolta: 136, porKm: 2, pedagio: 28.5, pedagioVolta: 32.5, desconto: 159 });
  assert.deepEqual([c.corrida, c.pedagio, c.subtotal, c.desconto, c.total], [498, 61, 559, 159, 400]);
});

test("desconto não vale sobre o pedágio e não passa do valor", () => {
  const c = contaDoRecibo({ valor: 100, extras: 20, pedagio: 15, desconto: 10, descontoPct: true });
  assert.deepEqual([c.subtotal, c.desconto, c.total], [135, 12, 123]);
  assert.equal(contaDoRecibo({ valor: 50, pedagio: 10, desconto: 999 }).total, 10);
  assert.equal(contaDoRecibo({ valor: 50, desconto: 200, descontoPct: true }).total, 0);
});

test("parcelas de 1 a 12", () => {
  const c = contaDoRecibo({ valor: 300, parcelas: 3 });
  assert.deepEqual([c.parcelas, c.parcela], [3, 100]);
  assert.equal(contaDoRecibo({ valor: 10, parcelas: 40 }).parcelas, 12);
  assert.equal(contaDoRecibo({ valor: 10, parcelas: 0 }).parcelas, 1);
});

test("número, data por extenso e telefone do WhatsApp", () => {
  assert.equal(numeroDoRecibo(2026, 7), "2026-0007");
  assert.equal(dataPorExtensoRecibo("2026-11-12"), "12 de novembro de 2026");
  assert.equal(dataPorExtensoRecibo(""), "");
  assert.equal(foneParaWhats("(11) 98765-4321"), "5511987654321");
  assert.equal(foneParaWhats("+55 11 98765-4321"), "5511987654321");
  assert.equal(foneParaWhats("123"), "");
});

test("o texto segue o modelo: trajeto, detalhamento, subtotal, desconto e total a pagar", () => {
  const c = contaDoRecibo({ km: 113, kmVolta: 136, porKm: 2, pedagio: 28.5, pedagioVolta: 32.5, desconto: 159 });
  const t = textoDoRecibo({ numero: "2026-0001", cliente: "Cliente Teste", data: "2026-11-12", hora: "06:00 - 06:30", origem: "Avenida Um, 100", destino: "Rua Dois, Campinas", motivoDesc: "promocional" }, c, brl);
  for (const linha of ["*RECIBO DE SERVIÇO DE TRANSPORTE*", "Cliente: Cliente Teste", "Data: 12 de novembro de 2026", "• Origem: Avenida Um, 100", "• Horário de início: 06:00 - 06:30",
    "• Distância de ida: 113 km", "• Distância de volta: 136 km", "• Distância total: 249 km", "• Quilometragem (249 km x R$ 2,00): R$ 498,00",
    "• Pedágio (ida): R$ 28,50", "• Pedágio (volta): R$ 32,50", "• Total de pedágios: R$ 61,00", "• Subtotal: R$ 559,00", "• Desconto promocional: -R$ 159,00", "*Valor total a pagar: R$ 400,00*"])
    assert.ok(t.includes(linha), "falta: " + linha);
  assert.match(t, /Não é nota fiscal/);
  assert.doesNotMatch(t, /Extras|Em \dx/);
});

test("corrida simples: sem ida e volta, sem subtotal à toa", () => {
  const t = textoDoRecibo({ cliente: "Ana" }, contaDoRecibo({ valor: 80 }), brl);
  assert.match(t, /• Corrida: R\$ 80,00/);
  assert.doesNotMatch(t, /Subtotal|Pedágio|Trajeto/);
});
