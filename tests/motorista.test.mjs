import test from "node:test";
import assert from "node:assert/strict";
import { linhaDasContas, resumoDoTeste, categoriasDoPerfil, categoriaDoTurno, resultadoPorCategoria, placarDosDias, motivoDoPlacar, regrasEmTexto, appsDoPerfil, totaisDoDesafio, rankingDoDesafio, destaqueDoDesafio, lerHoras, contaDoDia, fraseDoDia, msAndamento, ritmoAoVivo, somaValores, custoTotalPorKm, ganhoDoTurno, duracaoMs, relogio, horasCurtas, custoVariavelPorKm, resumoTurnos, kmPorDia, metaDoDia, isoLocal, valeAPena, ganhoPorApp, melhorDiaDaSemana, ritmoHistorico, alcanceDaMeta, kmRealPorMes, semanaDoMotorista } from "../js/motorista.js";

test("perfil: quem roda de carro não vê apps de moto, e o inverso", () => {
  const nomes = (l) => l.map(([k]) => k);
  assert.ok(nomes(appsDoPerfil({ veiculo: "carro" })).includes("uber"));
  assert.ok(!nomes(appsDoPerfil({ veiculo: "carro" })).includes("ifood"));
  assert.ok(nomes(appsDoPerfil({ veiculo: "moto" })).includes("99food"));
  assert.ok(!nomes(appsDoPerfil({ veiculo: "moto" })).includes("uber"));
  assert.deepEqual(nomes(appsDoPerfil({ veiculo: "carro", apps: ["99"] })), ["99"]);
  assert.deepEqual(nomes(appsDoPerfil({ veiculo: "carro", apps: ["99"] }, ["ifood"])), ["99", "ifood"]);   // turno antigo não perde o valor
  assert.equal(appsDoPerfil(null).length, 10);
});

test("desafio: quem faturou mais nem sempre ganhou mais por hora", () => {
  const dia = (ganho, horas, km) => ({ ganho, km, ms: horas * 3600000, viagens: 10, lucro: ganho / 2 });
  const t = totaisDoDesafio([
    { apelido: "Falcão", dias: [dia(420, 14, 260), dia(380, 13, 240)] },
    { apelido: "Rota 7", dias: [dia(300, 7, 130), dia(290, 7, 120)] },
    { apelido: "Novo", dias: [] },
  ]);
  assert.equal(t[0].ganho, 800);
  assert.equal(t[0].melhorDia, 420);
  assert.deepEqual(rankingDoDesafio(t, "total").map((m) => [m.apelido, m.pos]), [["Falcão", 1], ["Rota 7", 2], ["Novo", null]]);
  assert.deepEqual(rankingDoDesafio(t, "hora").map((m) => m.apelido), ["Rota 7", "Falcão", "Novo"]);
  assert.equal(rankingDoDesafio(t, "km")[0].apelido, "Rota 7");
  assert.equal(destaqueDoDesafio(t), "Falcão faturou mais, mas Rota 7 ganhou mais por hora.");
});

test("desafio: as regras decidem o que é descontado, igual para todos", () => {
  const dia = (ganho, gastos, custoCarro) => ({ ganho, gastos, custoCarro, km: 100, ms: 3600000 * 5, viagens: 10 });
  const membros = [{ apelido: "A", dias: [dia(500, 200, 50)] }, { apelido: "B", dias: [dia(400, 40, 40)] }];
  assert.equal(rankingDoDesafio(totaisDoDesafio(membros, {}), "hora")[0].apelido, "A");                         // sem regra, vale o bruto
  const comGastos = totaisDoDesafio(membros, { gastos: true });
  assert.equal(rankingDoDesafio(comGastos, "hora")[0].apelido, "B");                                             // 360 contra 300
  assert.equal(comGastos[1].porHora, 72);
  assert.equal(totaisDoDesafio(membros, { gastos: true, carro: true })[0].sobra, 250);
  assert.equal(rankingDoDesafio(comGastos, "total")[0].apelido, "A");                                            // faturamento é sempre bruto
  assert.equal(rankingDoDesafio(comGastos, "sobra")[0].valor, 360);
});

test("fim do teste: resume o que a pessoa fez, sem inventar quando não rodou", () => {
  const ts = [turno(h(8), h(12), { uber: 160 }, { km: 80, viagens: 8, comb: 20 }), turno(h(14), h(16), { uber: 100 }, { km: 40, viagens: 4 })];
  assert.deepEqual(resumoDoTeste(ts, "2026-10-05", "2026-10-05", {}), { jornadas: 2, ganho: 260, horas: 6, porHora: 43.33, porKm: 2.17, lucro: 240, comCarro: false });
  assert.equal(resumoDoTeste(ts, "2026-10-06", "2026-10-07", {}), null);
  assert.equal(resumoDoTeste([turno(h(8), h(8, 5), { uber: 300 })], "2026-10-05", "2026-10-05", {}).porHora, null);   // jornada curta não vira número absurdo
});

test("categoria: cada jornada conta na sua, sem misturar", () => {
  const perfil = { veiculo: "carro", apps: ["uber", "99"], categoria: "UberX" };
  assert.deepEqual(categoriasDoPerfil(perfil), ["UberX", "Comfort", "Black", "99Pop", "99Comfort"]);
  assert.deepEqual(categoriasDoPerfil({ veiculo: "moto", apps: ["ifood"] }), ["iFood"]);
  assert.deepEqual(categoriasDoPerfil(null), []);   // antes de escolher carro ou moto, nada de lista misturada
  assert.equal(categoriaDoTurno({ categoria: "Black" }, perfil), "Black");
  assert.equal(categoriaDoTurno({}, perfil), "UberX");                    // jornada antiga usa a do perfil
  const ts = [turno(h(8), h(12), { uber: 160 }, { categoria: "UberX", km: 80, viagens: 8, comb: 20 }), turno(h(14), h(16), { uber: 200 }, { categoria: "Black", km: 40, viagens: 3 })];
  assert.deepEqual(resultadoPorCategoria(ts, "2026-10-05", "2026-10-05", {}, perfil).map((r) => [r.categoria, r.ganhoPorHora]), [["Black", 100], ["UberX", 40]]);
  const linhas = placarDosDias(ts, ["2026-10-05", "2026-10-06"], carro, perfil);
  assert.deepEqual(linhas.map((l) => [l.dia, l.categoria, l.ganho, l.gastos]), [["2026-10-05", "UberX", 160, 20], ["2026-10-05", "Black", 200, 0]]);
  assert.ok(linhas[0].custoCarro > 0);
  assert.deepEqual(placarDosDias(ts, ["2026-10-06"], carro, perfil), []);
});

test("desafio: duas categorias no mesmo dia contam como um dia só", () => {
  const dias = [{ dia: "2026-10-05", ganho: 300, gastos: 0, km: 50, ms: 3600000 }, { dia: "2026-10-05", ganho: 200, gastos: 40, km: 50, ms: 3600000 }, { dia: "2026-10-06", ganho: 100, gastos: 10, km: 10, ms: 3600000 }];
  const [t] = totaisDoDesafio([{ apelido: "A", dias }], { gastos: true });
  assert.equal(t.diasRodados, 2);
  assert.equal(t.melhorDia, 460);
  assert.equal(t.diasSemGasto, 0);
});

test("desafio: rodar mais horas não garante vencer", () => {
  const dia = (ganho, gastos, km, horas) => ({ ganho, gastos, km, ms: horas * 3600000 });
  const t = totaisDoDesafio([
    { apelido: "Muitas horas", eu: true, dias: [dia(600, 200, 300, 12)] },   // 33,33/h, 1,33/km, sobra 400
    { apelido: "Rodou melhor", dias: [dia(420, 60, 150, 8)] },               // 45/h, 2,40/km, sobra 360
  ], { gastos: true });
  assert.equal(rankingDoDesafio(t, "total")[0].apelido, "Muitas horas");
  assert.equal(rankingDoDesafio(t, "km")[0].apelido, "Rodou melhor");
  assert.equal(rankingDoDesafio(t, "geral")[0].apelido, "Rodou melhor");     // ganhou 2 de 3 critérios
  assert.deepEqual(rankingDoDesafio(t, "geral").map((m) => m.valor), [5, 4]);
  assert.equal(motivoDoPlacar(t, "km"), "Você ganhou de Rodou melhor no que sobrou, mas perdeu por hora e por km.");
  assert.equal(motivoDoPlacar(t, "total"), "");   // liderando, não há do que explicar
  assert.match(regrasEmTexto({ vence: "geral" })[0], /Pontuação geral/);
  assert.match(regrasEmTexto({})[0], /Lucro por km/);
});

test("desafio: mostra quem não lançou gasto ou não tem o custo do carro", () => {
  const dia = (gastos, custoCarro) => ({ ganho: 300, gastos, custoCarro, km: 100, ms: 18000000 });
  const [a] = totaisDoDesafio([{ apelido: "A", dias: [dia(0, 0), dia(50, 0), dia(0, 10)] }], { gastos: true, carro: true });
  assert.equal(a.diasSemGasto, 2);
  assert.equal(a.semCustoCarro, true);
  assert.equal(totaisDoDesafio([{ apelido: "A", dias: [dia(0, 0)] }], {})[0].diasSemGasto, 0);   // sem a regra, não cobra
  assert.match(regrasEmTexto({ gastos: true }).join(" "), /Entra na conta: combustível/);
  assert.match(regrasEmTexto({}).join(" "), /Não entra na conta: combustível/);
});

test("desafio: empate divide a posição, e 30 minutos não entram no por hora", () => {
  const um = (apelido, ganho, ms) => ({ apelido, dias: [{ ganho, km: 10, ms, viagens: 1, lucro: 0 }] });
  const t = totaisDoDesafio([um("A", 100, 3600000), um("B", 100, 3600000), um("C", 90, 1800000)]);
  assert.deepEqual(rankingDoDesafio(t, "total").map((m) => m.pos), [1, 1, 3]);
  assert.equal(t[2].porHora, null);
  assert.equal(destaqueDoDesafio(totaisDoDesafio([um("A", 100, 3600000)])), "");
});

test("lançar o dia: entende as horas de um jeito simples", () => {
  assert.equal(lerHoras("10"), 36000000);
  assert.equal(lerHoras("10:00"), 36000000);
  assert.equal(lerHoras("8:30"), 30600000);
  assert.equal(lerHoras("8h30"), 30600000);
  assert.equal(lerHoras("8h"), 28800000);
  assert.equal(lerHoras("8,5"), 30600000);
  for (const ruim of ["", "0", "25", "8:75", "abc"]) assert.equal(lerHoras(ruim), null);
});

test("lançar o dia: mostra por hora, por km e por viagem", () => {
  assert.deepEqual(contaDoDia({ ganho: 418, km: 200, viagens: 13, ms: 36000000 }), { sobra: 418, porHora: 41.8, porKm: 2.09, porViagem: 32.15, sobraPorHora: 41.8 });
  assert.equal(contaDoDia({ ganho: 418, gasto: 118, ms: 36000000 }).sobraPorHora, 30);
  assert.deepEqual(contaDoDia({ ganho: 100 }), { sobra: 100, porHora: null, porKm: null, porViagem: null, sobraPorHora: null });
});

test("frase do dia: uma resposta para cada momento do motorista", () => {
  const brl = (v) => `R$ ${v}`, meta = { coberto: false, brutoDia: 200 };
  assert.equal(fraseDoDia({ meta: { coberto: true }, brl }).titulo, "Suas contas do mês estão cobertas.");
  assert.equal(fraseDoDia({ meta: { coberto: true }, brl, semContas: true }).titulo, "Falta cadastrar suas contas.");
  assert.equal(fraseDoDia({ meta, brl }).titulo, "Hoje, faça R$ 200 para o mês fechar.");
  assert.equal(fraseDoDia({ meta, ganhoHoje: 150.5, brl }).titulo, "Faltam R$ 49.5 para a meta de hoje.");
  assert.equal(fraseDoDia({ meta, ganhoHoje: 200, brl }).titulo, "Meta de hoje batida.");
  assert.equal(fraseDoDia({ meta, ganhoHoje: 260, brl }).sub, "Você fez R$ 260. O que passar disso adianta os próximos dias.");
});

test("contas na Jornada: atrasadas primeiro, depois a próxima a vencer", () => {
  const brl = (v) => `R$ ${v}`, luz = { titulo: "Luz", valor: 90, dias: 2 }, aluguel = { titulo: "Aluguel", valor: 800, dias: 12 };
  assert.equal(linhaDasContas({ brl }), null);
  assert.deepEqual(linhaDasContas({ proximas: [aluguel, luz], brl }), { tom: "warn", titulo: "Luz", valor: "R$ 90", quando: "vence em 2 dias" });
  assert.equal(linhaDasContas({ proximas: [aluguel], brl }).tom, "ok");
  assert.equal(linhaDasContas({ proximas: [{ ...luz, dias: 0 }], brl }).quando, "vence hoje");
  assert.equal(linhaDasContas({ proximas: [{ ...luz, dias: 1 }], brl }).quando, "vence amanhã");
  assert.equal(linhaDasContas({ proximas: [{ ...luz, dias: -3 }, { ...aluguel, valor: 0 }], brl }), null);   // vencida sem estar em atraso e conta sem valor não contam
  assert.deepEqual(linhaDasContas({ proximas: [luz], atraso: { itens: [{}, {}], total: 300 }, brl }), { tom: "bad", titulo: "2 contas atrasadas", valor: "R$ 300", quando: "Resolver" });
});

const h = (hh, mm = 0, dia = 5) => new Date(2026, 9, dia, hh, mm).getTime();   // outubro de 2026
const turno = (ini, fim, apps, extra = {}) => ({ id: String(ini), ini, fim, apps, ...extra });
const carro = { kmMes: 3000, consumo: 12, precoLitro: 6, manutAno: 3600, seguroAno: 2400 };

test("o ganho do turno soma os apps e ignora valor inválido", () => {
  assert.equal(ganhoDoTurno({ apps: { uber: 120.5, "99": 80, indrive: -5, outros: "x" } }), 200.5);
  assert.equal(ganhoDoTurno({}), 0);
});
test("relógio e horas curtas", () => {
  assert.equal(relogio(8130000), "02:15:30");
  assert.equal(horasCurtas(8100000), "2h15");
  assert.equal(horasCurtas(1800000), "30min");
  assert.equal(duracaoMs({ ini: 1000, fim: 4000 }), 3000);
  assert.equal(duracaoMs({ ini: 5000 }, 9000), 4000);
});
test("custo variável por km: combustível + manutenção, sem seguro", () => {
  // combustível 3000/12*6 = 1500; manutenção 300; total 1800 / 3000 km = 0,60
  assert.equal(custoVariavelPorKm(carro), 0.6);
  assert.equal(custoVariavelPorKm({}), null);
  assert.equal(custoVariavelPorKm({ consumo: 12, precoLitro: 6 }), null);   // sem km por mês não dá para dividir
});
test("resumo: lucro desconta o custo do carro por km; sem carro, só o combustível", () => {
  const t = [turno(h(18), h(23), { uber: 200, "99": 100 }, { km: 100, viagens: 10, comb: 50 }), turno(h(10, 0, 6), h(12, 0, 6), { uber: 50 }, { km: 40, viagens: 4 })];
  const r = resumoTurnos(t, "2026-10-05", "2026-10-05", carro);
  assert.equal(r.n, 1); assert.equal(r.ganho, 300); assert.equal(r.km, 100);
  // custo total por km = (1500+300+200+0)/3000 = 0,6667 -> 100 km = 66,67
  assert.equal(r.custo, 66.67); assert.equal(r.lucro, 233.33); assert.equal(r.comCarro, true);
  assert.equal(r.ganhoPorHora, 60); assert.equal(r.ganhoPorViagem, 30);
  const s = resumoTurnos(t, "2026-10-05", "2026-10-05", {});
  assert.equal(s.custo, 50); assert.equal(s.lucro, 250); assert.equal(s.comCarro, false);
  assert.equal(resumoTurnos(t, "2026-10-05", "2026-10-06", {}).n, 2);
});
test("turno em andamento não entra no resumo, e o dia é o do início", () => {
  const t = [{ id: "a", ini: h(23), apps: { uber: 10 } }, turno(h(22, 30), h(23, 59), { uber: 30 })];
  assert.equal(resumoTurnos(t, "2026-10-05", "2026-10-05", {}).n, 1);
  assert.equal(isoLocal(h(23)), "2026-10-05");
});
test("km por dia: média dos dias com histórico; sem histórico usa o veículo", () => {
  const t = [turno(h(10, 0, 1), h(12, 0, 1), {}, { km: 100 }), turno(h(10, 0, 2), h(12, 0, 2), {}, { km: 140 })];
  assert.equal(kmPorDia(t, carro, 6), 120);
  assert.equal(kmPorDia([], { kmMes: 2600 }, 6), 100.08);
  assert.equal(kmPorDia([], {}, 6), 0);
});
test("meta do dia: divide o que falta pelos dias que ele roda e soma o custo do carro", () => {
  // faltam 1.000; restam 10 dias, roda 6 por semana -> 9 dias (10*6/7=8,57 sobe para 9)
  const m = metaDoDia({ saldoSemHoje: -1000, restam: 10, diasSemana: 6, kmDia: 100, custoKm: 0.6 });
  assert.equal(m.falta, 1000); assert.equal(m.dias, 9); assert.equal(m.liquidoDia, 111.11); assert.equal(m.custoDia, 60); assert.equal(m.brutoDia, 171.11);
  assert.equal(m.coberto, false);
});
test("meta do dia: mês coberto não pede nada, e 'sobrar a mais' conta", () => {
  assert.equal(metaDoDia({ saldoSemHoje: 300, restam: 10 }).coberto, true);
  assert.equal(metaDoDia({ saldoSemHoje: 300, restam: 10 }).brutoDia, 0);
  const m = metaDoDia({ saldoSemHoje: 300, extra: 500, restam: 7, diasSemana: 7 });
  assert.equal(m.falta, 200); assert.equal(m.dias, 7);
  assert.equal(metaDoDia({ saldoSemHoje: -50, restam: 1, diasSemana: 1 }).dias, 1);
});

test("ritmo ao vivo: líquido por hora, mínimo da meta e veredito só depois de 15 minutos", () => {
  const h = 3600000;
  const a = ritmoAoVivo({ ganho: 150, gastos: 30, ms: 3 * h, liquidoDia: 200, horasDia: 8 });
  assert.equal(a.liquido, 120); assert.equal(a.porHora, 50); assert.equal(a.liquidoPorHora, 40); assert.equal(a.minimo, 25); assert.equal(a.veredito, "bom");
  assert.equal(ritmoAoVivo({ ganho: 60, gastos: 20, ms: 2 * h, liquidoDia: 200, horasDia: 8 }).veredito, "abaixo");
  assert.equal(ritmoAoVivo({ ganho: 30, gastos: 0, ms: 600000, liquidoDia: 200 }).veredito, null);   // 10 min: cedo demais
  assert.equal(ritmoAoVivo({ ganho: 0, gastos: 0, ms: 0, liquidoDia: 200 }).porHora, null);
  assert.equal(ritmoAoVivo({ ganho: 100, gastos: 0, ms: h, liquidoDia: 0 }).veredito, null);   // mês coberto: sem meta
  assert.equal(somaValores({ a: 10.5, b: "4", c: -2, d: "x" }), 14.5);
});

test("pausas não contam no tempo trabalhado", () => {
  const H = 3600000;
  assert.equal(duracaoMs({ ini: 0, fim: 5 * H, pausado: 1 * H }), 4 * H);
  assert.equal(msAndamento({ ini: 0, pausado: 0, pausaIni: null }, 2 * H), 2 * H);
  assert.equal(msAndamento({ ini: 0, pausado: H, pausaIni: 3 * H }, 5 * H), 2 * H);   // 5h no relógio, menos 1h já pausada e 2h de pausa agora
});

test("vale a pena: desconta o custo do km e compara com o mínimo por hora", () => {
  const a = valeAPena({ valor: 20, km: 8, min: 20, custoKm: 0.5, minimoHora: 25 });   // 20 - 4 = 16 líquidos em 20 min = 48/h
  assert.equal(a.liquido, 16); assert.equal(a.liquidoPorHora, 48); assert.equal(a.porKm, 2.5); assert.equal(a.nivel, "boa");
  const b = valeAPena({ valor: 12, km: 10, min: 30, custoKm: 0.5, minimoHora: 25 });   // 12 - 5 = 7 em 30 min = 14/h
  assert.equal(b.nivel, "ruim");
  assert.equal(valeAPena({ valor: 5, km: 12, min: 20, custoKm: 0.6 }).nivel, "ruim");   // não cobre nem o custo do carro
  assert.equal(valeAPena({ valor: 18, km: 6, min: 0, custoKm: 0.5 }).nivel, "boa");   // sem minutos, compara por km: 3,00 contra 0,50
  assert.equal(valeAPena({ valor: 18, km: 6 }).nivel, "sem-base");
  assert.equal(valeAPena({ valor: 0, km: 6 }), null); assert.equal(valeAPena({ valor: 10, km: 0 }), null);
});

test("ganho por app: soma só turnos encerrados do período, do maior para o menor", () => {
  const ts = [turno(h(8), h(12), { uber: 100, "99": 50 }), turno(h(8, 0, 6), h(12, 0, 6), { uber: 40, indrive: 30 }), turno(h(8, 0, 20), h(12, 0, 20), { uber: 999 }), { id: "x", ini: h(9, 0, 5), apps: { uber: 500 } }];
  const r = ganhoPorApp(ts, "2026-10-01", "2026-10-10");
  assert.deepEqual(r.map((x) => [x.app, x.ganho, x.pct]), [["uber", 140, 64], ["99", 50, 23], ["indrive", 30, 14]]);
  assert.deepEqual(ganhoPorApp([], "2026-10-01", "2026-10-31"), []);
});

test("melhor dia da semana: exige dois dias e pelo menos 1 hora em cada", () => {
  // 5/10/2026 é segunda; 6/10 terça
  const ts = [turno(h(8), h(12), { uber: 80 }), turno(h(8, 0, 6), h(12, 0, 6), { uber: 160 })];
  assert.deepEqual(melhorDiaDaSemana(ts, "2026-10-01", "2026-10-31"), { dia: 2, ganhoPorHora: 40 });
  assert.equal(melhorDiaDaSemana([ts[0]], "2026-10-01", "2026-10-31"), null);
});

test("ritmo histórico: média e melhor dia só com 2 dias ou mais, nos últimos 30 dias", () => {
  const ts = [turno(h(8), h(14), { uber: 200 }), turno(h(8, 0, 6), h(14, 0, 6), { uber: 300 }), turno(h(8, 0, 6), h(10, 0, 6), { "99": 100 }), turno(h(8, 0, 1), h(12, 0, 1), { uber: 9999 })];
  assert.equal(ritmoHistorico([ts[0]], "2026-10-20"), null);
  const r = ritmoHistorico(ts, "2026-10-20");   // 1/10 também entra (19 dias antes); dias: 1, 5 e 6
  assert.equal(r.dias, 3); assert.equal(r.melhorDia, 9999);
  const r2_ = ritmoHistorico(ts.slice(0, 3), "2026-10-20");
  assert.equal(r2_.dias, 2); assert.equal(r2_.ganhoMedioDia, 300); assert.equal(r2_.melhorDia, 400); assert.equal(r2_.ganhoPorHora, 42.86);
  assert.equal(ritmoHistorico(ts.slice(0, 3), "2026-12-31"), null);   // fora da janela
});

test("alcance da meta: compara o bruto pedido com o ritmo real da pessoa", () => {
  const meta = { brutoDia: 633, falta: 4964, dias: 10, coberto: false };
  const hist = { dias: 10, ganhoMedioDia: 250, melhorDia: 400, ganhoPorHora: 40 };
  const a = alcanceDaMeta({ meta, hist, custoDia: 100 });
  assert.equal(a.nivel, "fora"); assert.equal(a.liquidoMedioDia, 150); assert.equal(a.projeta, 1500); assert.equal(a.faltaAinda, 3464);
  assert.equal(alcanceDaMeta({ meta: { ...meta, brutoDia: 300 }, hist, custoDia: 100 }).nivel, "puxado");
  assert.equal(alcanceDaMeta({ meta: { ...meta, brutoDia: 260 }, hist, custoDia: 100 }).nivel, "ok");
  assert.equal(alcanceDaMeta({ meta, hist: null }).nivel, "sem-historico");
  assert.equal(alcanceDaMeta({ meta: { ...meta, coberto: true, brutoDia: 0 }, hist }).nivel, "coberta");
});

test("km reais por mês: só com 14 dias de uso e projeta para 30 dias", () => {
  const dia = (d, km) => turno(h(8, 0, d), h(14, 0, d), { uber: 100 }, { km });
  assert.equal(kmRealPorMes([dia(5, 200), dia(6, 200)], "2026-10-10"), null);   // poucos dias de uso
  const ts = [dia(1, 250), dia(2, 250), dia(8, 250), dia(15, 250)];   // 15 dias de uso, 1000 km: 1000/15*30 = 2000
  assert.equal(kmRealPorMes(ts, "2026-10-15"), 2000);
  assert.equal(kmRealPorMes([], "2026-10-15"), null);
});

test("sua semana: no domingo a semana que termina, na segunda a que acabou, com a anterior para comparar", () => {
  // 5/10/2026 é segunda: a semana vai de 5 a 11. Na semana anterior, um turno no dia 29/09.
  const t = [turno(h(8, 0, 5), h(12, 0, 5), { uber: 200 }, { km: 100 }), turno(h(8, 0, 7), h(10, 0, 7), { "99": 100 }, { km: 50 }),
    turno(new Date(2026, 8, 29, 8).getTime(), new Date(2026, 8, 29, 12).getTime(), { uber: 150 }, { km: 60 })];
  const dom = semanaDoMotorista(t, "2026-10-11", carro);
  assert.deepEqual([dom.de, dom.ate, dom.r.n, dom.r.ganho, dom.acabou], ["2026-10-05", "2026-10-11", 2, 300, false]);
  assert.equal(dom.r.lucroPorHora, 33.33);   // lucro 300 - 150 km × 0,6667 = 200 em 6 horas
  assert.equal(dom.antes.ganho, 150); assert.equal(dom.dif, 90);   // 200 - 110 (150 - 60 km × 0,6667)
  const seg = semanaDoMotorista(t, "2026-10-12", carro);
  assert.deepEqual([seg.de, seg.ate, seg.acabou], ["2026-10-05", "2026-10-11", true]);
  assert.equal(semanaDoMotorista(t, "2026-10-13", carro), null, "terça não mostra");
  assert.equal(semanaDoMotorista(t, "2026-10-19", carro), null, "semana sem jornada");
});
