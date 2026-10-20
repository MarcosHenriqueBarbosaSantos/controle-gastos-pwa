// Testes das assinaturas detectadas: cobranças que se repetem todo mês nos lançamentos de gasto.
import test from "node:test";
import assert from "node:assert/strict";
import { assinaturasDetectadas, chaveDaAssinatura, juntaPrefsDoCasal } from "../js/calc.js";

let n = 0;
const L = (data, descricao, valor, extra = {}) => ({ id: `l${++n}`, data, descricao, tipo: "Despesa", categoria: "Lazer", forma: "Cartão de crédito", valor, ...extra });
const st = (lancamentos, fixos = []) => ({ lancamentos, fixos, pagos: [], faturas: [], cartoes: [] });
const HOJE = "2026-10-20";
const netflix = [L("2026-07-12", "Netflix", 39.9), L("2026-08-12", "Netflix", 39.9), L("2026-09-12", "Netflix", 39.9), L("2026-10-12", "Netflix", 39.9)];

test("chave: sem acento, sem número e sem pontuação", () => {
  assert.equal(chaveDaAssinatura("NETFLIX 2."), "netflix");
  assert.equal(chaveDaAssinatura("Spotify (1/3)"), "spotify");
  assert.equal(chaveDaAssinatura("Pão de Açúcar"), "pao de acucar");
  assert.equal(chaveDaAssinatura("123"), "");
});

test("acha a cobrança de 4 meses seguidos, com total do mês e do ano", () => {
  const r = assinaturasDetectadas(st(netflix), HOJE);
  assert.equal(r.itens.length, 1);
  const a = r.itens[0];
  assert.equal(a.nome, "Netflix"); assert.equal(a.meses, 4); assert.equal(a.mensal, 39.9); assert.equal(a.anual, 478.8);
  assert.equal(a.dia, 12); assert.equal(a.ultima, "2026-10-12"); assert.equal(a.desde, "2026-07-12"); assert.equal(a.subiu, null);
  assert.equal(r.totalMes, 39.9); assert.equal(r.totalAno, 478.8);
});

test("a próxima cobrança é o dia habitual no mês de hoje, ou no seguinte se o dia já passou", () => {
  assert.equal(assinaturasDetectadas(st(netflix), "2026-10-20").itens[0].proximo, "2026-11-12");
  assert.equal(assinaturasDetectadas(st(netflix), "2026-10-12").itens[0].proximo, "2026-10-12");
  const fim = [L("2026-07-31", "Academia", 100), L("2026-08-31", "Academia", 100), L("2026-09-30", "Academia", 100)];
  assert.equal(assinaturasDetectadas(st(fim), "2026-10-05").itens[0].proximo, "2026-10-31");
  assert.equal(assinaturasDetectadas(st(fim), "2026-11-02").itens[0].proximo, "2026-11-30");   // novembro tem 30 dias
});

test("o café de todo dia (várias no mesmo mês) não é assinatura", () => {
  const cafe = [];
  for (const m of ["2026-07", "2026-08", "2026-09", "2026-10"]) for (const d of ["03", "10", "17"]) cafe.push(L(`${m}-${d}`, "Café", 6));
  assert.equal(assinaturasDetectadas(st(cafe), HOJE).itens.length, 0);
});

test("duas cobranças só ainda não bastam, e mês pulado quebra a sequência", () => {
  assert.equal(assinaturasDetectadas(st(netflix.slice(2)), HOJE).itens.length, 0);
  const pulou = [L("2026-06-12", "Spotify", 21.9), L("2026-07-12", "Spotify", 21.9), L("2026-09-12", "Spotify", 21.9), L("2026-10-12", "Spotify", 21.9)];
  assert.equal(assinaturasDetectadas(st(pulou), HOJE).itens.length, 0);   // só 2 seguidas no fim
  assert.equal(assinaturasDetectadas(st([...pulou, L("2026-08-12", "Spotify", 21.9)]), HOJE).itens[0].meses, 5);
});

test("quem cancelou (última cobrança há mais de 40 dias) sai da lista", () => {
  assert.equal(assinaturasDetectadas(st(netflix), "2026-11-25").itens.length, 0);
  assert.equal(assinaturasDetectadas(st(netflix), "2026-11-21").itens.length, 1);   // 40 dias
});

test("reajuste vira aviso: de quanto para quanto e desde quando", () => {
  const s = [L("2026-07-12", "Netflix", 39.9), L("2026-08-12", "Netflix", 39.9), L("2026-09-12", "Netflix", 44.9), L("2026-10-12", "Netflix", 44.9)];
  const a = assinaturasDetectadas(st(s), HOJE).itens[0];
  assert.deepEqual(a.subiu, { de: 39.9, para: 44.9, em: "2026-09-12" });
  assert.equal(a.mensal, 44.9);
  const baixou = [L("2026-07-12", "Netflix", 44.9), L("2026-08-12", "Netflix", 44.9), L("2026-09-12", "Netflix", 39.9), L("2026-10-12", "Netflix", 39.9)];
  assert.equal(assinaturasDetectadas(st(baixou), HOJE).itens[0].subiu, null);   // baixar não é aviso
});

test("conta de consumo, com valor diferente todo mês, não é assinatura", () => {
  const luz = [L("2026-07-10", "Conta de luz", 180.4), L("2026-08-10", "Conta de luz", 212.9), L("2026-09-10", "Conta de luz", 143.3), L("2026-10-10", "Conta de luz", 198.7)];
  assert.equal(assinaturasDetectadas(st(luz), HOJE).itens.length, 0);
});

test("o dia do mês não pode andar demais", () => {
  const solto = [L("2026-07-02", "Revista", 30), L("2026-08-15", "Revista", 30), L("2026-09-28", "Revista", 30)];
  assert.equal(assinaturasDetectadas(st(solto), HOJE).itens.length, 0);
  const perto = [L("2026-07-10", "Revista", 30), L("2026-08-12", "Revista", 30), L("2026-09-11", "Revista", 30)];
  assert.equal(assinaturasDetectadas(st(perto), HOJE).itens.length, 1);
  const virada = [L("2026-07-30", "Plano", 50), L("2026-08-31", "Plano", 50), L("2026-09-30", "Plano", 50)];
  assert.equal(assinaturasDetectadas(st(virada), HOJE).itens.length, 1);
});

test("parcelas e compras parceladas não contam", () => {
  const parc = [L("2026-07-12", "Tênis (1/4)", 100), L("2026-08-12", "Tênis (2/4)", 100), L("2026-09-12", "Tênis (3/4)", 100), L("2026-10-12", "Tênis (4/4)", 100)];
  assert.equal(assinaturasDetectadas(st(parc), HOJE).itens.length, 0);
  const em3 = netflix.map((x) => ({ ...x, parcelas: 3 }));
  assert.equal(assinaturasDetectadas(st(em3), HOJE).itens.length, 0);
});

test("entradas, guardado, sem descrição e valor zero ficam de fora", () => {
  const outros = netflix.map((x) => ({ ...x, tipo: "Receita" }));
  assert.equal(assinaturasDetectadas(st(outros), HOJE).itens.length, 0);
  assert.equal(assinaturasDetectadas(st(netflix.map((x) => ({ ...x, descricao: "" }))), HOJE).itens.length, 0);
  assert.equal(assinaturasDetectadas(st(netflix.map((x) => ({ ...x, valor: 0 }))), HOJE).itens.length, 0);
  assert.deepEqual(assinaturasDetectadas(st([]), HOJE), { itens: [], ocultas: [], totalMes: 0, totalAno: 0 });
  assert.deepEqual(assinaturasDetectadas({}, HOJE).itens, []);
});

test("nomes escritos de jeitos diferentes caem no mesmo grupo", () => {
  const s = [L("2026-08-12", "NETFLIX", 39.9), L("2026-09-12", "netflix 2", 39.9), L("2026-10-12", "Netflix.", 39.9)];
  const r = assinaturasDetectadas(st(s), HOJE);
  assert.equal(r.itens.length, 1); assert.equal(r.itens[0].nome, "Netflix."); assert.equal(r.itens[0].meses, 3);
});

test("ordena do maior valor mensal para o menor e soma tudo", () => {
  const s = [...netflix, ...["07", "08", "09", "10"].map((m) => L(`2026-${m}-05`, "Academia", 120))];
  const r = assinaturasDetectadas(st(s), HOJE);
  assert.deepEqual(r.itens.map((x) => x.nome), ["Academia", "Netflix"]);
  assert.equal(r.totalMes, 159.9); assert.equal(r.totalAno, 1918.8);
});

test("ocultar: sai dos itens e dos totais, mas continua em ocultas para poder voltar", () => {
  const s = [...netflix, ...["07", "08", "09", "10"].map((m) => L(`2026-${m}-05`, "Academia", 120))];
  const r = assinaturasDetectadas(st(s), HOJE, { ocultas: ["academia"] });
  assert.deepEqual(r.itens.map((x) => x.nome), ["Netflix"]);
  assert.deepEqual(r.ocultas.map((x) => x.nome), ["Academia"]);
  assert.equal(r.totalMes, 39.9);
});

test("avisa quando a cobrança já está nas contas fixas", () => {
  const fixos = [{ id: "f", tipo: "Despesa", descricao: "Netflix", categoria: "Lazer", dia: 12, valor: 39.9, desde: "2026-01-01", ate: null }];
  assert.equal(assinaturasDetectadas(st(netflix, fixos), HOJE).itens[0].jaFixa, true);
  assert.equal(assinaturasDetectadas(st(netflix, [{ ...fixos[0], ate: "2026-05-01" }]), HOJE).itens[0].jaFixa, false);   // fixo que já acabou
  assert.equal(assinaturasDetectadas(st(netflix), HOJE).itens[0].jaFixa, false);
});

test("conta de casal: o que cada um ocultou vale para os dois", () => {
  const j = juntaPrefsDoCasal({ naoAssinaturas: ["netflix"] }, { naoAssinaturas: ["academia", "netflix"] });
  assert.deepEqual(j.naoAssinaturas.sort(), ["academia", "netflix"]);
});
