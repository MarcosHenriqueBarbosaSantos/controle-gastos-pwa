// "Arrumar lançamentos": acha, no que já foi lançado, o que atrapalha as contas e propõe o conserto.
// Funções puras, sem tela e sem banco (testadas em tests/arrumar.test.mjs). A tela fica em app.js.

import { round2, CARTAO, ocorrencias, mKey, addM } from "./calc.js";
import { norm } from "./excel.js";
import { ehMeuNome, ehParceiro, arrumaNome } from "./conta.js";

/**
 * Transferências entre as contas da própria pessoa: contam como entrada e como gasto ao mesmo tempo e inflam os dois lados.
 * Vale o nome inteiro no texto ("Marcos Henrique Barbosa Santos") ou o começo do nome cortado pelo banco ("Marcos").
 * Com `parceiro` (a pessoa da conta casal), entram também as transferências entre os dois: é dinheiro que só muda de mão.
 * Só olha entradas e gastos; o que foi guardado não entra.
 */
export function entreMinhasContas(lancamentos, meuNome, parceiro = "") {
  // Com a pessoa da conta casal: só vale o que o banco escreveu como transferência/Pix, para um gasto qualquer com o mesmo primeiro nome não entrar.
  const doBanco = (x) => /^transferencia (enviada|recebida)/.test(norm(String(x.descricao ?? "").trim().split(" - ")[0]));
  const itens = (lancamentos || []).filter((x) => (x.tipo === "Receita" || x.tipo === "Despesa")
    && (ehMeuNome(nomeDoLancamento(x.descricao), meuNome) || (Boolean(parceiro) && doBanco(x) && ehParceiro(nomeDoLancamento(x.descricao), parceiro))));
  const soma = (t) => round2(itens.filter((x) => x.tipo === t).reduce((s, x) => s + Number(x.valor), 0));
  return { itens, entradas: soma("Receita"), saidas: soma("Despesa") };
}

/** Do texto que o banco escreve ("Transferência enviada pelo Pix - Fulano - 000.111.222-33 - NU PAGAMENTOS ...") fica só o nome. */
export function nomeDoLancamento(descricao) {
  const t = String(descricao ?? "").trim(), p = t.split(" - ").map((s) => s.trim());
  return /^transferencia (enviada|recebida)/.test(norm(p[0])) && p[1] ? p[1] : t;
}

/**
 * Pix e compras no débito da conta que entraram como compra de cartão (o extrato da conta foi importado pela tela do cartão):
 * ficam sem cartão e com o nome curto. "Pix no Crédito" é cartão de verdade e fica como está.
 * @returns {{id:string, de:object, forma:string, descricao:string}[]}
 */
export function pixComoCartao(lancamentos) {
  const out = [];
  for (const x of lancamentos || []) {
    if (x.tipo !== "Despesa" || x.forma !== CARTAO) continue;
    const t = String(x.descricao ?? ""), n = norm(t);
    if (/^pix no credito|cartao de credito/.test(n)) continue;
    if (/^transferencia enviada/.test(n)) out.push({ id: x.id, de: x, forma: "Pix", descricao: arrumaNome(nomeDoLancamento(t)) });
    else if (/^compra no debito/.test(n)) out.push({ id: x.id, de: x, forma: "Débito", descricao: `Compra no débito em ${arrumaNome(t.split(" - ").slice(1).join(" - ") || t)}` });
  }
  return out;
}

/**
 * O que ficou em "Outros", junto por nome: um nome que se repete (a Uber, uma pessoa, um posto) muda de categoria de uma vez.
 * @returns {{chave:string, nome:string, tipo:string, n:number, total:number, ids:string[]}[]} do que mais pesa para o que menos pesa
 */
export function gruposEmOutros(lancamentos, { minimo = 2 } = {}) {
  const mapa = new Map();
  for (const x of lancamentos || []) {
    if (x.categoria !== "Outros" || (x.tipo !== "Receita" && x.tipo !== "Despesa")) continue;
    const nome = arrumaNome(nomeDoLancamento(x.descricao)) || "(sem nome)", chave = `${x.tipo}|${norm(nome)}`;
    const g = mapa.get(chave) || { chave, nome, tipo: x.tipo, n: 0, total: 0, ids: [] };
    g.n++; g.total = round2(g.total + Number(x.valor)); g.ids.push(x.id); mapa.set(chave, g);
  }
  return [...mapa.values()].filter((g) => g.n >= minimo).sort((a, b) => b.total - a.total);
}

const diasEntre = (a, b) => Math.abs((new Date(a) - new Date(b)) / 86400000);

/**
 * Entre os movimentos de um arquivo que vai ser importado, quais já estão lançados (de outra importação, de outro formato do mesmo extrato
 * ou à mão): mesmo tipo, mesmo valor e a data com até 2 dias de diferença. Cada lançamento que já existe vale por um movimento só: dois Pix de
 * R$ 20 no mesmo dia, com um já lançado, deixam um de fora e um como novo. Vale o mais perto na data.
 * @param {{chave:string, tipo:string, valor:number, data:string}[]} movimentos  o que veio do arquivo (sem os que já têm a mesma chave)
 * @param {object[]} lancamentos  o que já está no app (sem os que têm a chave de um movimento deste arquivo)
 * @returns {Set<string>} as chaves dos movimentos que parecem já lançados
 */
export function movimentosJaLancados(movimentos, lancamentos, { dias = 2 } = {}) {
  const pool = (lancamentos || []).filter((x) => x.tipo === "Receita" || x.tipo === "Despesa").map((x) => ({ x, usado: false }));
  const achados = new Set();
  for (const m of [...(movimentos || [])].sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0))) {
    let melhor = null, dist = Infinity;
    for (const p of pool) {
      if (p.usado || p.x.tipo !== m.tipo || Math.abs(Number(p.x.valor) - m.valor) >= 0.005) continue;
      const d = diasEntre(p.x.data, m.data); if (d <= dias && d < dist) { melhor = p; dist = d; }
    }
    if (melhor) { melhor.usado = true; achados.add(m.chave); }
  }
  return achados;
}

/**
 * Lançamentos que ficaram em dobro por importar o mesmo extrato de dois jeitos (CSV e PDF, ou dois arquivos que se cruzam): mesmo tipo,
 * valor e dia, com mais de um deles vindo de importação. `igual` marca o que tem o mesmo nome (a cópia quase certa); o resto pode ser
 * dois gastos de verdade iguais, e quem decide é a pessoa.
 * @returns {{chave:string, tipo:string, valor:number, data:string, manter:object, copias:object[], igual:boolean}[]}
 */
export function repetidosDeImportacao(lancamentos) {
  const grupos = new Map();
  for (const x of lancamentos || []) {
    if ((x.tipo !== "Receita" && x.tipo !== "Despesa") || !x.import_key) continue;
    const k = `${x.tipo}|${x.data}|${round2(Number(x.valor))}`;
    grupos.set(k, [...(grupos.get(k) || []), x]);
  }
  const out = [];
  for (const [chave, l] of grupos) {
    if (l.length < 2) continue;
    const ord = [...l].sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || "")) || String(a.id).localeCompare(String(b.id)));
    const [manter, ...copias] = ord, nome = (x) => norm(nomeDoLancamento(x.descricao));
    out.push({ chave, tipo: manter.tipo, valor: round2(Number(manter.valor)), data: manter.data, manter, copias, igual: copias.every((c) => nome(c) === nome(manter) || nome(c).includes(nome(manter)) || nome(manter).includes(nome(c))) });
  }
  return out.sort((a, b) => (a.data < b.data ? 1 : -1));
}

/**
 * Movimentos do extrato que são o pagamento de uma conta fixa que a pessoa já cadastrou (o aluguel, a parcela do carro, a internet).
 * Lançar o movimento e deixar a conta fixa contando juntos faria o mesmo gasto aparecer duas vezes: aqui eles são ligados, para o
 * movimento não virar gasto novo e a conta fixa ser marcada como paga. Vale o mesmo tipo, o mesmo valor (até R$ 0,50 de diferença,
 * por juros ou arredondamento) e a data com até 7 dias do dia da conta. Cada ocorrência da conta fixa vale por um movimento só.
 * Contas fixas cobradas no cartão ficam de fora (elas entram pela fatura).
 * @returns {Map<string, {fixoId:string, mes:string, nome:string, jaPaga:boolean, tipo:string}>} por chave do movimento
 */
export function movimentosDeContasFixas(movimentos, fixos, pagos = []) {
  const pagas = new Set((pagos || []).map((p) => `${p.fixo_id}|${p.mes}`)), achados = new Map();
  const lista = (movimentos || []).filter((m) => m.tipo === "Receita" || m.tipo === "Despesa");
  const meses = [...new Set(lista.flatMap((m) => [addM(mKey(m.data), -1), mKey(m.data), addM(mKey(m.data), 1)]))];
  const pool = meses.flatMap((mm) => [...ocorrencias(fixos || [], mm, "Despesa"), ...ocorrencias(fixos || [], mm, "Receita")]).filter((o) => o.forma !== CARTAO).map((o) => ({ o, usado: false }));
  const proximidade = (a, b) => { const x = norm(nomeDoLancamento(a)), y = norm(b || ""); return x && y && (x.includes(y) || y.includes(x)) ? 1 : 0; };
  // Primeiro passam os que têm o nome parecido; depois, os que só batem no valor e na data. Assim um gasto qualquer do mesmo valor não toma a vez da conta certa.
  const ordem = [...lista].sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));
  for (const so_nome of [true, false]) {
    for (const m of ordem) {
      if (achados.has(m.chave)) continue;
      let melhor = null, pontos = -Infinity;
      for (const p of pool) {
        if (p.usado || (p.o.tipo || "Despesa") !== m.tipo || Math.abs(Number(p.o.valor) - m.valor) > 0.5) continue;
        const d = diasEntre(p.o.data, m.data); if (d > 7) continue;
        const nome = proximidade(m.descricao, p.o.descricao); if (so_nome && !nome) continue;
        const s = nome * 10 - d; if (s > pontos) { melhor = p; pontos = s; }
      }
      if (melhor) { melhor.usado = true; achados.set(m.chave, { fixoId: melhor.o.id, mes: melhor.o.chave, nome: melhor.o.descricao, jaPaga: pagas.has(`${melhor.o.id}|${melhor.o.chave}`), tipo: m.tipo }); }
    }
  }
  return achados;
}

/** Gasto do dia a dia: mesmo repetindo valor e dia, não é conta fixa (o mercado do mês, o lanche, o posto). */
const DIA_A_DIA_CAT = new Set(["Mercado", "Alimentação", "Roupas"]);
const DIA_A_DIA_NOME = /\b(mercado|supermercado|atacadao|padaria|restaurante|lanchonete|ifood|rappi|lanche|pizzaria|acougue|hortifruti|feira|posto|combustivel|gasolina|uber|99)\b/;
const UTILIDADE = /\b(luz|energia|enel|cemig|copel|cpfl|agua|sabesp|saneamento|gas|comgas|internet|vivo|claro|tim|oi|telefone|condominio)\b/;
const semNumeros = (t) => norm(nomeDoLancamento(t)).replace(/[0-9]+/g, " ").replace(/\s+/g, " ").trim();
const mediana = (v) => { const o = [...v].sort((a, b) => a - b), m = Math.floor(o.length / 2); return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2; };
const maisComum = (v) => { const c = new Map(); v.forEach((x) => c.set(x, (c.get(x) || 0) + 1)); return [...c.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ""; };

/**
 * Quem começa pelo extrato do banco não sabe dizer ao app o que é conta fixa e o que é gasto do dia. Aqui o app descobre: o que aparece uma vez por mês,
 * com quase o mesmo valor e perto do mesmo dia, em pelo menos 2 meses seguidos (aluguel, internet, parcela, salário), é sugerido como conta fixa.
 * Gasto do dia a dia (mercado, Pix para gente, combustível) aparece várias vezes no mês ou varia muito e fica de fora.
 * Contas de luz, água, internet, telefone e condomínio podem variar até 40%; as outras, até 12% (ou R$ 3).
 * Já fica de fora o que parece uma conta fixa cadastrada e o que parou de aparecer há mais de 2 meses.
 * @returns {{chave:string, nome:string, tipo:string, categoria:string, forma:string, valor:number, dia:number, desde:string, variavel:boolean, itens:object[]}[]} do maior valor para o menor
 */
export function contasQueSeRepetem(lancamentos, fixos = [], hojeISO) {
  const grupos = new Map();
  for (const x of lancamentos || []) {
    if ((x.tipo !== "Despesa" && x.tipo !== "Receita") || x.forma === CARTAO || x.cartao_id) continue;
    const k = semNumeros(x.descricao); if (k.length < 3 || (x.tipo === "Despesa" && (DIA_A_DIA_CAT.has(x.categoria) || DIA_A_DIA_NOME.test(k)))) continue;
    const g = grupos.get(`${x.tipo}|${k}`) || { tipo: x.tipo, k, l: [] }; g.l.push(x); grupos.set(`${x.tipo}|${k}`, g);
  }
  const limite = addM(mKey(hojeISO), -2), out = [];
  for (const g of grupos.values()) {
    const porMes = new Map(); g.l.forEach((x) => porMes.set(mKey(x.data), [...(porMes.get(mKey(x.data)) || []), x]));
    if ([...porMes.values()].some((v) => v.length > 1)) continue;   // mais de uma vez no mês: é gasto do dia a dia
    const meses = [...porMes.keys()].sort();
    // A série vale a partir do último buraco: só os meses seguidos até o mais recente.
    let ini = meses.length - 1; while (ini > 0 && addM(meses[ini - 1], 1) === meses[ini]) ini--;
    const seguidos = meses.slice(ini); if (seguidos.length < 2 || seguidos[seguidos.length - 1] < limite) continue;
    const itens = seguidos.map((m) => porMes.get(m)[0]), valores = itens.map((x) => Number(x.valor)), ref = mediana(valores);
    const variavel = UTILIDADE.test(g.k), tol = variavel ? 0.4 : 0.12;
    if (!valores.every((v) => Math.abs(v - ref) <= Math.max(ref * tol, variavel ? 0 : 3))) continue;
    const dias = itens.map((x) => Number(x.data.slice(8, 10))), medLinear = mediana(dias);
    const md = dias.every((d) => Math.abs(d - medLinear) <= 5) ? medLinear : dias[dias.length - 1];   // virando o mês (30 e 1), vale o dia mais recente
    const perto = (a, b) => { const d = Math.abs(a - b); return Math.min(d, 31 - d) <= 5; };   // o dia 30 e o dia 1 estão perto (salário do fim do mês)
    if (!dias.every((d) => perto(d, md))) continue;
    const nome = arrumaNome(nomeDoLancamento(itens[itens.length - 1].descricao).replace(/^(pagamento de boleto efetuado|pagamento efetuado|compra no d[eé]bito|d[eé]bito autom[aá]tico)\s*(-|–|em)\s*/i, "")) || g.k, valor = variavel ? round2(ref) : round2(Number(itens[itens.length - 1].valor));
    const jaTem = (fixos || []).some((f) => (f.tipo || "Despesa") === g.tipo && Math.abs(Number(f.valor) - valor) <= Math.max(valor * 0.4, 3) && (norm(f.descricao).includes(g.k) || g.k.includes(norm(f.descricao)) || Math.abs(Number(f.dia) - md) <= 5 && Math.abs(Number(f.valor) - valor) <= 0.5));
    if (jaTem) continue;
    out.push({ chave: `${g.tipo}|${g.k}`, nome, tipo: g.tipo, categoria: maisComum(itens.map((x) => x.categoria)), forma: maisComum(itens.map((x) => x.forma || "")), valor, dia: Math.round(md), desde: `${seguidos[0]}-01`, variavel, itens });
  }
  return out.sort((a, b) => b.valor - a.valor);
}
