import test from "node:test";
import assert from "node:assert/strict";
import { resumoAnualDoMotorista, avisosDoResumo, grupoDoCarro, ehCorridaParticular, linhasDoResumoAnual, textoDoResumoAnual, csvDoResumoAnual } from "../js/anual.js";

const brl = (n) => "R$ " + Number(n).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const ms = (iso, h = 8) => new Date(`${iso}T${String(h).padStart(2, "0")}:00:00`).getTime();
const turno = (iso, apps, km = 0, horas = 8, extra = {}) => ({ ini: ms(iso), fim: ms(iso) + horas * 3600000, apps, km, ...extra });
const L = (data, tipo, categoria, descricao, valor) => ({ data, tipo, categoria, descricao, valor });

test("gasto do carro vai para o grupo certo; Transporte sozinho não entra", () => {
  assert.equal(grupoDoCarro(L("2026-01-01", "Despesa", "Transporte", "Gasolina posto", 200)), "comb");
  assert.equal(grupoDoCarro(L("2026-01-01", "Despesa", "Transporte", "Pedágio Bandeirantes", 12)), "pedagio");
  assert.equal(grupoDoCarro(L("2026-01-01", "Despesa", "Carro", "Troca de óleo", 180)), "manut");
  assert.equal(grupoDoCarro(L("2026-01-01", "Despesa", "Contas", "IPVA 2026", 1200)), "docs");
  assert.equal(grupoDoCarro(L("2026-01-01", "Despesa", "Carro", "Lava rápido? não, tapete novo", 50)), "manut");
  assert.equal(grupoDoCarro(L("2026-01-01", "Despesa", "Moradia", "Aluguel do carro na locadora", 900)), "outros");
  assert.equal(grupoDoCarro(L("2026-01-01", "Despesa", "Transporte", "Ônibus", 5)), null);
  assert.equal(grupoDoCarro(L("2026-01-01", "Despesa", "Mercado", "Arroz", 30)), null);
  assert.equal(grupoDoCarro(L("2026-01-01", "Receita", "Extra", "Gasolina reembolsada", 30)), null);
});

test("o recibo de corrida particular é reconhecido pela descrição", () => {
  assert.ok(ehCorridaParticular(L("2026-03-01", "Receita", "Extra", "Corrida particular: Empresa Alfa", 400)));
  assert.ok(!ehCorridaParticular(L("2026-03-01", "Receita", "Extra", "Ganhos: Uber + 99", 400)));
});

test("o ano soma apps pelas jornadas, particulares pelos recibos e o carro pelos lançamentos, sem contar duas vezes", () => {
  const turnos = [
    turno("2026-02-10", { uber: 300, "99": 100 }, 220, 9, { viagens: 20, viagensApp: { uber: 14, "99": 6 } }),
    turno("2026-03-05", { uber: 250 }, 180, 8, { viagens: 12 }),
    turno("2025-12-30", { uber: 999 }, 500),            // outro ano
    { ini: ms("2026-03-06"), apps: { uber: 50 } },      // em andamento: não entra
  ];
  const lancamentos = [
    L("2026-02-10", "Receita", "Extra", "Ganhos: Uber + 99", 400),   // o mesmo dinheiro da jornada: não soma de novo
    L("2026-03-12", "Receita", "Extra", "Corrida particular: Empresa Alfa", 400),
    L("2026-02-11", "Despesa", "Transporte", "Combustível", 150),
    L("2026-03-01", "Despesa", "Carro", "Troca de óleo", 180),
    L("2026-03-02", "Despesa", "Mercado", "Compras", 300),
    L("2025-11-01", "Despesa", "Transporte", "Combustível", 999),
  ];
  const r = resumoAnualDoMotorista({ st: { lancamentos, fixos: [] }, turnos, ano: 2026, ate: "2026-11-15" });
  assert.deepEqual(r.apps.map((a) => [a.nome, a.ganho, a.viagens]), [["Uber", 550, 14], ["99", 100, 6]]);
  assert.deepEqual([r.ganhoApps, r.particular, r.nRecibos, r.ganho], [650, 400, 1, 1050]);
  assert.deepEqual([r.gastos.comb, r.gastos.manut, r.gastoCarro, r.resultado], [150, 180, 330, 720]);
  assert.deepEqual([r.km, r.horas, r.dias, r.viagens], [400, 17, 2, 32]);
  assert.deepEqual([r.meses[1].ganho, r.meses[1].carro, r.meses[2].ganho, r.meses[2].carro], [400, 150, 650, 180]);
  assert.ok(r.temDados);
});

test("contas fixas do carro entram todo mês até hoje, não o ano inteiro", () => {
  const fixos = [{ id: "f1", tipo: "Despesa", categoria: "Carro", descricao: "Aluguel do carro", dia: 10, valor: 1000, desde: "2026-01-01", ate: null }];
  const r = resumoAnualDoMotorista({ st: { lancamentos: [], fixos }, turnos: [], ano: 2026, ate: "2026-03-15" });
  assert.equal(r.gastos.outros, 3000);
  assert.equal(r.resultado, -3000);
});

test("avisa jornada sem ganho e mês rodado sem combustível", () => {
  const turnos = [turno("2026-04-02", {}, 350), turno("2026-04-03", { uber: 200 }, 20), turno("2026-06-10", { uber: 300 }, 320)];
  const lancamentos = [L("2026-06-11", "Despesa", "Transporte", "Gasolina", 150)];
  const r = resumoAnualDoMotorista({ st: { lancamentos, fixos: [] }, turnos, ano: 2026, ate: "2026-12-31" });
  assert.equal(r.semGanho, 1);
  assert.deepEqual([r.meses[3].km, r.meses[3].comb, r.meses[5].comb], [370, 0, 150]);
  const av = avisosDoResumo(r);
  assert.equal(av.length, 2);
  assert.match(av[0].t, /1 jornada está sem os ganhos/);
  assert.match(av[1].t, /rodou em abril, mas não há combustível lançado nesse mês/);
  assert.deepEqual(avisosDoResumo(resumoAnualDoMotorista({ st: { lancamentos, fixos: [] }, turnos: [turnos[2]], ano: 2026 })), []);
});

test("sem nada no ano, avisa que não há dados", () => {
  assert.equal(resumoAnualDoMotorista({ st: { lancamentos: [], fixos: [] }, turnos: [], ano: 2026 }).temDados, false);
});

test("PDF, texto e planilha trazem os mesmos totais", () => {
  const r = resumoAnualDoMotorista({ st: { lancamentos: [L("2026-05-01", "Despesa", "Transporte", "Gasolina", 200), L("2026-05-02", "Receita", "Extra", "Corrida particular: Ana", 120)], fixos: [] },
    turnos: [turno("2026-05-01", { uber: 500 }, 300)], ano: 2026, ate: "2026-12-31" });
  const pdf = linhasDoResumoAnual(r, brl, { nome: "Motorista Teste", hoje: "2027-03-01" }).map((x) => x.t).join("\n");
  for (const t of ["Total de ganhos", "R$ 620,00", "Combustível", "R$ 200,00", "R$ 420,00", "Não é declaração"]) assert.ok(pdf.includes(t), "PDF sem " + t);
  const txt = textoDoResumoAnual(r, brl);
  assert.match(txt, /\*Total: R\$ 620,00\*/); assert.match(txt, /Ganhos menos gastos com o veículo: R\$ 420,00/);
  const csv = csvDoResumoAnual(r);
  assert.match(csv, /Resultado;Ganhos menos gastos com o veículo;;420,00/); assert.match(csv, /Gasto do veículo;Combustível: Gasolina;01\/05\/2026;200,00/);
});
