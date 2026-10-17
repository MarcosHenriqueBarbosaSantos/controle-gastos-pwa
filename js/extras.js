// Ferramentas extras do app, todas funções puras (sem tela), testadas em tests/extras.test.mjs:
// "Meu desempenho" em frases, calculadoras, desafio de economia, resumo do ano, subcategorias,
// valor em outra moeda, colar a mensagem do banco, CSV e PDF do relatório.
import { parseMoney, calcMes, addM, mKey, round2, MESES, MES3, catMap, comparaCategorias, primeiroMes, ocorrencias, diasEntre, ultimosMeses, reservaAcumulada, metasEmAndamento, divisaoDoMes } from "./calc.js";

const semAcento = (s) => String(s ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const pad = (n) => String(n).padStart(2, "0");
const nomeDoMes = (m) => MESES[Number(m.slice(5)) - 1];
/** "R$ 1.234,56" sempre com espaço comum (o PDF e o CSV não gostam do espaço especial do navegador). */
export function moeda(v) {
  const n = round2(Math.abs(Number(v) || 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/\s/g, "");
  return `${v < 0 && round2(v) !== 0 ? "- " : ""}R$ ${n}`;
}
const pct = (a, b) => (b > 0 ? Math.round((Math.abs(a - b) / b) * 100) : 0);

/* ======================= subcategorias =======================
   Uma subcategoria é uma categoria com o nome "Mercado › Hortifruti". Assim ela funciona em qualquer tela sem mudar o banco,
   e os totais por categoria podem juntar as filhas na categoria de cima. */
export const SEP = " › ";
export const paiDaCategoria = (nome) => String(nome ?? "").split(SEP)[0];
export const filhoDaCategoria = (nome) => { const i = String(nome ?? "").indexOf(SEP); return i < 0 ? "" : String(nome).slice(i + SEP.length); };
export const nomeDeSub = (pai, filho) => `${String(pai).trim()}${SEP}${String(filho).trim()}`;
/** Junta as filhas na categoria de cima: [["Mercado › Feira", 10], ["Mercado", 5]] → [["Mercado", 15]]. */
export function agrupaPorPai(pares) {
  const o = {};
  pares.forEach(([k, v]) => { const p = paiDaCategoria(k); o[p] = (o[p] || 0) + Number(v); });
  return Object.entries(o).map(([k, v]) => [k, round2(v)]).sort((a, b) => b[1] - a[1]);
}

/* ======================= Meu desempenho =======================
   O mês em poucas frases, comparado com o mês anterior e com a média dos últimos meses. */
/** @returns {{tom:"good"|"warn"|"info", texto:string}[]} */
export function desempenhoDoMes(st, m, hoje) {
  const c = calcMes(st, m, hoje);
  if (c.fase === "futuro") return [];
  const primeiro = primeiroMes(st), ant = addM(m, -1), out = [];
  const custoAgora = c.fase === "atual" ? c.proj : c.custo;
  // 1. O custo do mês contra o do mês anterior.
  if (primeiro && ant >= primeiro) {
    const ca = calcMes(st, ant, hoje);
    if (ca.custo > 0 && custoAgora > 0) {
      const p = pct(custoAgora, ca.custo);
      if (p >= 3) out.push({ tom: custoAgora < ca.custo ? "good" : "warn",
        texto: `${c.fase === "atual" ? "No ritmo de agora, o custo do mês fica" : "O custo do mês foi"} ${p}% ${custoAgora < ca.custo ? "menor" : "maior"} que o de ${nomeDoMes(ant)} (${moeda(custoAgora)} contra ${moeda(ca.custo)}).` });
      else out.push({ tom: "info", texto: `O custo do mês está praticamente igual ao de ${nomeDoMes(ant)}.` });
    }
  }
  // 2. As categorias que mais mudaram no dia a dia.
  const cmp = comparaCategorias(st, c, m);
  if (cmp) {
    Object.entries(cmp.por).sort((a, b) => Math.abs(b[1].dif) - Math.abs(a[1].dif)).slice(0, 2).forEach(([cat, x]) => {
      const p = pct(x.agora, x.antes), ate = cmp.ate ? `, até o dia ${cmp.ate}` : "";
      if (x.agora === 0) return out.push({ tom: "good", texto: `Você ainda não gastou com ${cat} neste mês. Em ${nomeDoMes(cmp.mes)}${ate}, foram ${moeda(x.antes)}.` });
      out.push(x.dif < 0
        ? { tom: "good", texto: `Você gastou ${p}% menos com ${cat} do que em ${nomeDoMes(cmp.mes)}${ate}: ${moeda(-x.dif)} a menos.` }
        : { tom: "warn", texto: `Você gastou ${p}% mais com ${cat} do que em ${nomeDoMes(cmp.mes)}${ate}: ${moeda(x.dif)} a mais.` });
    });
  }
  // 3. A sobra contra a média dos meses anteriores.
  const antes = ultimosMeses(st, ant, hoje, 3).filter((x) => x.fase === "passado" && (x.rec > 0 || x.custo > 0));
  if (antes.length >= 2) {
    const media = round2(antes.reduce((t, x) => t + x.sobra, 0) / antes.length);
    const sobra = c.fase === "atual" ? round2(c.rec - c.proj - Math.max(0, c.res)) : c.saldo, dif = round2(sobra - media);
    if (Math.abs(dif) >= 1) out.push({ tom: dif > 0 ? "good" : "warn",
      texto: `${c.fase === "atual" ? "A sobra prevista para o mês" : "A sobra do mês"} (${moeda(sobra)}) ${c.fase === "atual" ? "fica" : "ficou"} ${moeda(Math.abs(dif))} ${dif > 0 ? "acima" : "abaixo"} da média dos últimos ${antes.length} meses (${moeda(media)}).` });
  }
  // 4. Meses seguidos fechando no azul.
  let seguidos = 0;
  for (let k = c.fase === "passado" ? 0 : 1; k < 12; k++) {
    const mm = addM(m, -k); if (primeiro && mm < primeiro) break;
    const x = calcMes(st, mm, hoje);
    if (x.fase !== "passado" || !(x.rec > 0 || x.custo > 0) || x.saldo < 0) break;
    seguidos++;
  }
  if (seguidos >= 2) out.push({ tom: "good", texto: `${seguidos} meses seguidos fechando no azul${c.fase === "atual" ? " antes deste" : ""}. Continue assim!` });
  // 5. A maior despesa.
  const cat = catMap(c);
  if (cat.length && c.custo > 0) {
    const [nome, v] = agrupaPorPai(cat)[0];
    out.push({ tom: "info", texto: `A maior parte do custo vai para ${nome}: ${Math.round((v / c.custo) * 100)}% (${moeda(v)}).` });
  }
  return out.slice(0, 5);
}

/* ======================= calculadoras =======================
   Contas simples, com os números que a pessoa digita. Nada aqui é recomendação de investimento: o rendimento é só a conta da taxa informada. */
const num = (x) => (Number.isFinite(Number(x)) ? Number(x) : NaN);
const taxaMensal = (anual) => Math.pow(1 + num(anual) / 100, 1 / 12) - 1;
/** Quanto vira o dinheiro guardado todo mês, com a taxa ao ano que a pessoa escolher (aporte no fim de cada mês). */
export function rendimentoDeGuardar({ porMes = 0, inicial = 0, meses, taxaAnual = 0 }) {
  porMes = num(porMes); inicial = num(inicial); meses = Math.round(num(meses)); taxaAnual = num(taxaAnual);
  if (![porMes, inicial, taxaAnual].every(Number.isFinite) || !(meses >= 1 && meses <= 720) || porMes < 0 || inicial < 0 || taxaAnual < 0 || taxaAnual > 1000) return null;
  const i = taxaMensal(taxaAnual); let saldo = inicial;
  for (let k = 0; k < meses; k++) saldo = saldo * (1 + i) + porMes;
  const aportado = inicial + porMes * meses;
  return { total: round2(saldo), aportado: round2(aportado), rendimento: round2(saldo - aportado) };
}
/** Quanto guardar por mês para chegar em um valor, com a taxa ao ano (0 = só somando). */
export function quantoGuardarPorMes({ alvo, meses, inicial = 0, taxaAnual = 0 }) {
  alvo = num(alvo); meses = Math.round(num(meses)); inicial = num(inicial); taxaAnual = num(taxaAnual);
  if (![alvo, inicial, taxaAnual].every(Number.isFinite) || !(alvo > 0) || !(meses >= 1 && meses <= 720) || inicial < 0 || taxaAnual < 0 || taxaAnual > 1000) return null;
  const i = taxaMensal(taxaAnual), f = Math.pow(1 + i, meses);
  const v = i === 0 ? (alvo - inicial) / meses : ((alvo - inicial * f) * i) / (f - 1);
  return { porMes: round2(Math.max(0, v)), jaBasta: v <= 0 };
}
/** Compra parcelada com juros (parcelas iguais): quanto é cada parcela, o total pago e quanto foi de juros. */
export function parcelaComJuros({ valor, parcelas, taxaMes = 0 }) {
  valor = num(valor); parcelas = Math.round(num(parcelas)); taxaMes = num(taxaMes);
  if (!(valor > 0) || !(parcelas >= 1 && parcelas <= 120) || !(taxaMes >= 0 && taxaMes <= 100)) return null;
  const i = taxaMes / 100, pmt = i === 0 ? valor / parcelas : (valor * i) / (1 - Math.pow(1 + i, -parcelas));
  return { parcela: round2(pmt), total: round2(pmt * parcelas), juros: round2(pmt * parcelas - valor) };
}
/** Juros compostos: quanto a dívida (ou o dinheiro parado) vira depois de alguns meses. */
export function jurosCompostos({ capital, taxaMes, meses }) {
  capital = num(capital); taxaMes = num(taxaMes); meses = Math.round(num(meses));
  if (!(capital > 0) || !(taxaMes >= 0 && taxaMes <= 100) || !(meses >= 1 && meses <= 600)) return null;
  const m = capital * Math.pow(1 + taxaMes / 100, meses);
  return { montante: round2(m), juros: round2(m - capital) };
}
/** Férias em valor bruto (antes dos descontos): dias de descanso, o terço a mais e, se quiser, a venda de 10 dias. */
export function ferias({ salario, dias = 30, vender = false }) {
  salario = num(salario); dias = Math.round(num(dias));
  if (!(salario > 0) || !(dias >= 5 && dias <= 30)) return null;
  if (vender) dias = Math.min(dias, 20);
  const diario = salario / 30, base = diario * dias, terco = base / 3, abono = vender ? (diario * 10 * 4) / 3 : 0;
  return { dias, base: round2(base), terco: round2(terco), abono: round2(abono), total: round2(base + terco + abono) };
}
/** 13º salário em valor bruto: proporcional aos meses trabalhados no ano, pago em duas parcelas iguais. */
export function decimoTerceiro({ salario, meses = 12 }) {
  salario = num(salario); meses = Math.round(num(meses));
  if (!(salario > 0) || !(meses >= 1 && meses <= 12)) return null;
  const total = round2((salario * meses) / 12), p1 = round2(total / 2);
  return { total, primeira: p1, segunda: round2(total - p1) };
}

/* ======================= desafio de economia =======================
   Guardar um valor por semana. "Crescente" é o clássico das 52 semanas (R$ 1, R$ 2, R$ 3…); "decrescente" começa pelo maior; "fixo" é sempre igual. */
export const MODOS_DESAFIO = { crescente: "Crescente (começa pequeno)", decrescente: "Decrescente (começa grande)", fixo: "Sempre o mesmo valor" };
export function valorDaSemana(d, n) {
  const base = Number(d.base), total = Number(d.semanas);
  if (!(n >= 1 && n <= total)) return 0;
  return round2(d.modo === "decrescente" ? base * (total - n + 1) : d.modo === "fixo" ? base : base * n);
}
export const totalDoDesafio = (d) => round2(Array.from({ length: Number(d.semanas) || 0 }, (_, i) => valorDaSemana(d, i + 1)).reduce((t, x) => t + x, 0));
/** Valida e monta um desafio novo. Devolve null quando algo não faz sentido. */
export function criaDesafio({ nome, caixinha, modo = "crescente", base, semanas = 52, inicio }) {
  base = num(base); semanas = Math.round(num(semanas));
  if (!MODOS_DESAFIO[modo] || !(base > 0 && base <= 100000) || !(semanas >= 4 && semanas <= 104) || !/^\d{4}-\d{2}-\d{2}$/.test(String(inicio || ""))) return null;
  const cx = String(caixinha || "").trim();
  if (!cx) return null;
  return { nome: String(nome || "").trim().slice(0, 40) || "Desafio de economia", caixinha: cx, modo, base: round2(base), semanas, inicio, feitas: [] };
}
/** Onde o desafio está hoje: qual é a semana, o que já foi guardado, o que ficou para trás e o que falta. */
export function andamentoDoDesafio(d, hoje) {
  const semanas = Number(d.semanas), feitas = [...new Set((d.feitas || []).map(Number))].filter((n) => n >= 1 && n <= semanas).sort((a, b) => a - b);
  const atual = hoje < d.inicio ? 0 : Math.min(semanas, Math.floor(diasEntre(d.inicio, hoje) / 7) + 1);
  const total = totalDoDesafio(d), guardado = round2(feitas.reduce((t, n) => t + valorDaSemana(d, n), 0));
  const atrasadas = []; for (let n = 1; n <= atual; n++) if (!feitas.includes(n) && n < atual) atrasadas.push(n);
  const proxima = Array.from({ length: semanas }, (_, i) => i + 1).find((n) => !feitas.includes(n)) || 0;
  const fim = (() => { const x = new Date(d.inicio + "T12:00:00"); x.setDate(x.getDate() + semanas * 7 - 1); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; })();
  return { semanas, feitas, atual, total, guardado, falta: round2(total - guardado), pct: total > 0 ? Math.round((guardado / total) * 100) : 0,
    atrasadas, proxima, valorProxima: proxima ? valorDaSemana(d, proxima) : 0, concluido: feitas.length >= semanas, comecou: hoje >= d.inicio, fim,
    daSemanaAtual: atual >= 1 && !feitas.includes(atual) };
}

/* ======================= resumo do ano ======================= */
/** O ano mês a mês, com os totais, o melhor e o pior mês e para onde o dinheiro foi (subcategorias somadas na categoria de cima). */
export function resumoDoAno(st, ano, hoje) {
  const meses = [], cat = {};
  for (let k = 1; k <= 12; k++) {
    const m = `${ano}-${pad(k)}`, c = calcMes(st, m, hoje), tem = c.fase !== "futuro" && (c.rec > 0 || c.custo > 0 || c.res !== 0);
    meses.push({ m, rec: c.rec, custo: c.custo, guardado: c.res, sobra: c.saldo, fase: c.fase, tem });
    if (tem) catMap(c).forEach(([k2, v]) => { cat[k2] = (cat[k2] || 0) + v; });
  }
  const com = meses.filter((x) => x.tem), soma = (f) => round2(com.reduce((t, x) => t + f(x), 0));
  const rec = soma((x) => x.rec), custo = soma((x) => x.custo), guardado = soma((x) => x.guardado), sobra = soma((x) => x.sobra);
  const ordenados = [...com].sort((a, b) => b.sobra - a.sobra), grupos = agrupaPorPai(Object.entries(cat));
  const totalCat = grupos.reduce((t, [, v]) => t + v, 0);
  return { ano, meses, mesesComDados: com.length, rec, custo, guardado, sobra,
    mediaCusto: com.length ? round2(custo / com.length) : 0, mediaSobra: com.length ? round2(sobra / com.length) : 0,
    melhor: ordenados[0] || null, pior: ordenados.length > 1 ? ordenados[ordenados.length - 1] : null,
    categorias: grupos.slice(0, 10).map(([nome, valor]) => ({ nome, valor, pct: totalCat > 0 ? Math.round((valor / totalCat) * 100) : 0 })) };
}

/* ======================= outra moeda (viagem) ======================= */
export const MOEDAS = [{ cod: "USD", simbolo: "US$", nome: "Dólar" }, { cod: "EUR", simbolo: "€", nome: "Euro" }, { cod: "GBP", simbolo: "£", nome: "Libra" },
  { cod: "ARS", simbolo: "AR$", nome: "Peso argentino" }, { cod: "CLP", simbolo: "CL$", nome: "Peso chileno" }, { cod: "UYU", simbolo: "UY$", nome: "Peso uruguaio" },
  { cod: "PYG", simbolo: "₲", nome: "Guarani" }, { cod: "CAD", simbolo: "CA$", nome: "Dólar canadense" }];
/** Converte um valor de fora em reais com a cotação que a pessoa informou (quantos reais vale 1 da outra moeda). */
export function valorEmReais(valorFora, cotacao) {
  valorFora = num(valorFora); cotacao = num(cotacao);
  if (!(valorFora > 0) || !(cotacao > 0) || valorFora * cotacao > 1e9) return null;
  return round2(valorFora * cotacao);
}
export function textoDaMoeda(cod, valor) {
  const m = MOEDAS.find((x) => x.cod === cod);
  return `${m ? m.simbolo : cod} ${Number(valor).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/\s/g, "")}`;
}

/* ======================= colar a mensagem do banco =======================
   A pessoa cola a notificação ou o SMS do banco e o formulário de lançamento vem preenchido. Funciona com os textos mais comuns de
   compra no cartão, Pix enviado e recebido, débito e boleto; o que não for entendido fica em branco para ela completar. */
const PALAVRAS_MINUSCULAS = new Set(["da", "de", "do", "das", "dos", "e", "em", "na", "no"]);
function arrumaNome(s) {
  let t = String(s || "").replace(/[\s*]+$/g, "").replace(/^[\s*:-]+/, "").replace(/\s+/g, " ").trim().slice(0, 40).trim();
  if (t && t === t.toUpperCase() && /[A-ZÀ-Ú]/.test(t)) t = t.toLowerCase().split(" ").map((p, i) => (i > 0 && PALAVRAS_MINUSCULAS.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1))).join(" ");
  return t;
}
const FIM_DO_NOME = String.raw`(?=\s+(?:R\$|no valor|valor|[àa]s\s+\d|em\s+\d{1,2}\/|\d{1,2}\/\d{1,2}|dia\s+\d|hoje|ontem|via\s|pelo\s|pela\s|na conta|no cart|cart[aã]o|final\s+\d|aprovad|realizad|\d{1,2}[:h]\d{2})|\s*[.,;:!]|\s+-\s|\s*$)`;
/** @returns {{valor?:number, descricao?:string, forma?:string, tipo:"Despesa"|"Receita", data?:string, parcelas?:number, texto:string}} */
export function entendeMensagemBanco(texto, hoje) {
  const original = String(texto || "").replace(/\s+/g, " ").trim().slice(0, 600), t = semAcento(original), out = { tipo: "Despesa", texto: original };
  const v = original.match(/R\$\s*(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?/i);
  if (v) { const n = Number(v[1].replace(/\./g, "")) + (v[2] ? Number(v[2].padEnd(2, "0")) / 100 : 0); if (n > 0 && n < 1e9) out.valor = round2(n); }
  const entrou = /\b(voce recebeu|recebeu|recebido|recebida|credito em conta|deposito|salario|estorno|reembolso|devolucao|transferencia recebida)\b/.test(t);
  const saiu = /\b(voce pagou|enviou|enviado|enviada|pagamento|compra|debito|saque|transferiu|boleto)\b/.test(t);
  if (entrou && !(saiu && /\b(voce pagou|enviou|compra)\b/.test(t))) out.tipo = "Receita";
  const parc = t.match(/\b(\d{1,2})\s*x\b|\bem\s+(\d{1,2})\s+(?:vezes|parcelas)\b/), np = parc ? Number(parc[1] || parc[2]) : 0;
  if (np >= 2 && np <= 48) out.parcelas = np;
  if (/\bpix\b/.test(t)) out.forma = "Pix";
  else if (/\bdebito\b/.test(t)) out.forma = "Débito";
  else if (out.parcelas || /\b(credito|cartao|final\s+\d{4})\b/.test(t)) out.forma = "Cartão de crédito";
  else if (/\bboleto\b/.test(t)) out.forma = "Boleto";
  if (out.parcelas && out.forma !== "Cartão de crédito") out.forma = "Cartão de crédito";
  // Data: "12/10", "12/10/2026", "hoje", "ontem".
  const [ha, hm, hd] = hoje.split("-").map(Number);
  const dt = original.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (dt && Number(dt[1]) >= 1 && Number(dt[1]) <= 31 && Number(dt[2]) >= 1 && Number(dt[2]) <= 12) {
    let a = dt[3] ? Number(dt[3].length === 2 ? "20" + dt[3] : dt[3]) : ha;
    let d = `${a}-${pad(Number(dt[2]))}-${pad(Number(dt[1]))}`;
    if (!dt[3] && d > hoje) d = `${a - 1}-${pad(Number(dt[2]))}-${pad(Number(dt[1]))}`;
    if (!Number.isNaN(new Date(d + "T12:00:00").getTime()) && new Date(d + "T12:00:00").getDate() === Number(dt[1])) out.data = d;
  } else if (/\bontem\b/.test(t)) { const x = new Date(ha, hm - 1, hd - 1); out.data = `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; }
  else if (/\bhoje\b/.test(t)) out.data = hoje;
  // Quem recebeu ou pagou: depende do tipo de mensagem.
  const tenta = (re) => { const m = original.match(re); const nome = m ? arrumaNome(m[1]) : ""; return /^[A-Za-zÀ-ú]/.test(nome) ? nome : ""; };
  const letra = String.raw`([A-Za-zÀ-ú][^.,;:!\n]*?)`;
  let nome = "";
  if (out.tipo === "Receita") nome = tenta(new RegExp(String.raw`\b(?:de|por)\s+(?!R\$|\d)` + letra + FIM_DO_NOME, "i"));
  else nome = tenta(new RegExp(String.raw`\b(?:para|pra|favorecido|destinat[aá]rio)\s*:?\s+` + letra + FIM_DO_NOME, "i"))
    || tenta(new RegExp(String.raw`\b(?:em|no|na)\s+(?!cart|conta|d[eé]bito|cr[eé]dito|\d)` + letra + FIM_DO_NOME, "i"));
  if (nome && !/^(?:cartao|cartão|conta|debito|débito|credito|crédito|pix|valor)\b/i.test(nome)) out.descricao = nome;
  return out;
}

/* ======================= CSV e PDF ======================= */
const celula = (x) => {
  let s = String(x ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;   // uma descrição que começa com "=" viraria fórmula na planilha
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const numBr = (v) => round2(v).toFixed(2).replace(".", ",");
const dataBr = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
/** Tudo o que foi lançado no ano (e as contas e entradas fixas de cada mês), em CSV com ponto e vírgula, que o Excel brasileiro abre direto. */
export function linhasDoAno(st, ano, ate = "") {
  const l = [];
  st.lancamentos.filter((x) => String(x.data).startsWith(ano + "-")).forEach((x) =>
    l.push({ data: x.data, tipo: x.tipo, categoria: x.categoria, descricao: x.descricao || "", forma: x.forma === "Retirada" ? "Retirada" : x.forma || "", valor: Number(x.valor), origem: "Lançamento" }));
  for (let k = 1; k <= 12; k++) {
    const m = `${ano}-${pad(k)}`;
    for (const tipo of ["Despesa", "Receita"]) ocorrencias(st.fixos, m, tipo).forEach((o) =>
      l.push({ data: o.data, tipo, categoria: o.categoria, descricao: o.descricao || "", forma: o.forma || "", valor: Number(o.valor), origem: "Fixo" }));
  }
  return l.filter((x) => !ate || x.data <= ate).sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));
}
export function csvDoAno(st, ano, ate = "") {
  const cab = ["Data", "Tipo", "Categoria", "Descrição", "Forma de pagamento", "Valor", "Origem"].join(";");
  return "\ufeff" + [cab, ...linhasDoAno(st, ano, ate).map((x) => [dataBr(x.data), x.tipo, x.categoria, x.descricao, x.forma, numBr(x.valor), x.origem].map(celula).join(";"))].join("\r\n") + "\r\n";
}
const largura = (s, n, direita = false) => { s = String(s ?? ""); if (s.length > n) s = s.slice(0, n - 1) + "."; return direita ? s.padStart(n) : s.padEnd(n); };
/** O relatório do ano em linhas de texto de largura fixa (a fonte do PDF é monoespaçada, então as colunas ficam alinhadas). */
export function relatorioEmLinhas(st, ano, hoje) {
  const r = resumoDoAno(st, ano, hoje), L = [];
  L.push({ t: `Meus Gastos - Relatório de ${ano}`, b: true }, { t: `Gerado em ${dataBr(hoje)}` }, { t: "" });
  L.push({ t: "Mês a mês", b: true }, { t: largura("Mês", 10) + largura("Entradas", 16, true) + largura("Custo", 16, true) + largura("Guardado", 16, true) + largura("Sobra", 16, true) });
  r.meses.filter((x) => x.tem).forEach((x) => L.push({ t: largura(MES3[Number(x.m.slice(5)) - 1], 10) + largura(moeda(x.rec), 16, true) + largura(moeda(x.custo), 16, true) + largura(moeda(x.guardado), 16, true) + largura(moeda(x.sobra), 16, true) }));
  L.push({ t: largura("Total", 10) + largura(moeda(r.rec), 16, true) + largura(moeda(r.custo), 16, true) + largura(moeda(r.guardado), 16, true) + largura(moeda(r.sobra), 16, true), b: true }, { t: "" });
  if (r.categorias.length) { L.push({ t: "Para onde foi o dinheiro", b: true }); r.categorias.forEach((c) => L.push({ t: largura(c.nome, 34) + largura(moeda(c.valor), 16, true) + largura(c.pct + "%", 6, true) })); L.push({ t: "" }); }
  const lanc = linhasDoAno(st, ano, hoje);
  L.push({ t: `Lançamentos (${lanc.length})`, b: true }, { t: largura("Data", 11) + largura("Tipo", 9) + largura("Categoria", 20) + largura("Descrição", 32) + largura("Valor", 16, true) });
  lanc.forEach((x) => L.push({ t: largura(dataBr(x.data), 11) + largura(x.tipo, 9) + largura(x.categoria, 20) + largura(x.descricao, 32) + largura(moeda(x.valor), 16, true) }));
  return L;
}
const LATIN1 = { "–": "-", "—": "-", "›": ">", "…": "...", "“": '"', "”": '"', "‘": "'", "’": "'", "•": "*", "€": "EUR" };
const paraPdf = (s) => String(s).replace(/[^\x00-\xff]/g, (c) => LATIN1[c] || "?").replace(/[()\\]/g, "\\$&").replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, " ");
/**
 * Monta um PDF simples (A4, fonte Courier) com as linhas dadas, sem biblioteca nenhuma. Devolve os bytes do arquivo.
 * @param {{t:string, b?:boolean}[]} linhas
 */
export function pdfDeLinhas(linhas, { porPagina = 58, tamanho = 8.5 } = {}) {
  const paginas = []; for (let i = 0; i < Math.max(1, linhas.length); i += porPagina) paginas.push(linhas.slice(i, i + porPagina));
  const objs = [];   // objs[n-1] = texto do objeto n
  const idPagina = (i) => 5 + i * 2, idConteudo = (i) => 6 + i * 2;
  objs.push("<< /Type /Catalog /Pages 2 0 R >>");
  objs.push(`<< /Type /Pages /Kids [${paginas.map((_, i) => `${idPagina(i)} 0 R`).join(" ")}] /Count ${paginas.length} >>`);
  objs.push("<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>");
  objs.push("<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold /Encoding /WinAnsiEncoding >>");
  paginas.forEach((pg, i) => {
    const corpo = ["BT", `${tamanho + 1.5} TL`, `36 ${842 - 40} Td`];
    let negrito = null;
    pg.forEach((l) => {
      const b = Boolean(l.b); if (b !== negrito) { corpo.push(`/${b ? "F2" : "F1"} ${tamanho} Tf`); negrito = b; }
      corpo.push(`(${paraPdf(l.t)}) Tj T*`);
    });
    corpo.push(`/F1 ${tamanho} Tf`, `1 0 0 1 36 24 Tm`, `(Página ${i + 1} de ${paginas.length}) Tj`, "ET");
    const fluxo = corpo.join("\n");
    objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${idConteudo(i)} 0 R >>`);
    objs.push(`<< /Length ${fluxo.length} >>\nstream\n${fluxo}\nendstream`);
  });
  let pdf = "%PDF-1.4\n"; const pos = [];
  objs.forEach((o, i) => { pos.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${pos.map((p) => `${String(p).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Uint8Array.from(pdf, (c) => c.charCodeAt(0) & 255);
}

/* ======================= conquistas =======================
   Medalhas que mostram o caminho: quem anota todo dia, guarda dinheiro, fecha o mês no azul e cumpre metas. Nenhuma é cobrança: só celebra. */
/** O maior número de dias seguidos com anotação (lançamento ou "não gastei nada") em toda a história. */
export function maiorSequencia(st, semGasto = []) {
  const dias = [...new Set([...st.lancamentos.map((x) => x.data), ...semGasto])].sort();
  let melhor = 0, atual = 0, ant = null;
  for (const d of dias) { atual = ant && diasEntre(ant, d) === 1 ? atual + 1 : 1; melhor = Math.max(melhor, atual); ant = d; }
  return melhor;
}
/** @returns {{id:string, icone:string, titulo:string, texto:string, n:number, de:number, feita:boolean}[]} */
export function conquistas(st, hoje, { semGasto = [], metas = {}, desafios = {} } = {}) {
  const cur = mKey(hoje), primeiro = primeiroMes(st);
  let azuis = 0;
  for (let k = 1; k <= 24; k++) {
    const m = addM(cur, -k); if (!primeiro || m < primeiro) break;
    const c = calcMes(st, m, hoje);
    if (!(c.rec > 0 || c.custo > 0) || c.saldo < 0) break;
    azuis++;
  }
  const guardado = reservaAcumulada(st, cur), nMetas = metasEmAndamento(st, metas, hoje).filter((a) => a.concluida).length;
  const feitasDesafio = Math.max(0, ...Object.values(desafios || {}).map((d) => (d.feitas || []).length)), desafioCompleto = Object.values(desafios || {}).some((d) => d.semanas > 0 && (d.feitas || []).length >= d.semanas);
  const K = (id, icone, titulo, texto, n, de) => ({ id, icone, titulo, texto, n: Math.min(Math.max(0, n), de), de, feita: n >= de });
  const seq = maiorSequencia(st, semGasto), nL = st.lancamentos.length;
  return [
    K("primeiro", "ok", "Primeiro lançamento", "Você anotou o primeiro gasto, entrada ou valor guardado.", nL, 1),
    K("lanc10", "ok", "10 lançamentos", "Anotar vira hábito. Já são 10 registros.", nL, 10),
    K("lanc100", "ok", "100 lançamentos", "Cem registros: você enxerga o seu dinheiro de verdade.", nL, 100),
    K("seq7", "fogo", "7 dias anotando", "Uma semana inteira seguida de anotações.", seq, 7),
    K("seq30", "fogo", "30 dias anotando", "Um mês seguido. Isso muda o jogo.", seq, 30),
    K("guardou", "cofre", "Primeiro dinheiro guardado", "Você guardou dinheiro em uma caixinha.", guardado > 0 ? 1 : 0, 1),
    K("guardou1k", "cofre", "R$ 1.000 guardados", "Mil reais juntos nas suas caixinhas.", guardado, 1000),
    K("guardou10k", "cofre", "R$ 10.000 guardados", "Dez mil reais juntos. Parabéns pela disciplina!", guardado, 10000),
    K("meta", "alvo", "Primeira meta concluída", "Você juntou tudo o que queria em uma caixinha.", nMetas, 1),
    K("azul1", "rumo", "Mês no azul", "Você fechou um mês com sobra.", azuis, 1),
    K("azul3", "rumo", "3 meses no azul", "Três meses seguidos fechando com sobra.", azuis, 3),
    K("cartao", "cartao", "Cartão no controle", "Você cadastrou um cartão e a fatura se monta sozinha.", (st.cartoes || []).length, 1),
    K("fatura", "cartao", "Fatura paga", "Você marcou uma fatura como paga.", (st.faturas || []).filter((f) => f.status === "Paga").length, 1),
    K("desafio1", "alvo", "Primeira semana do desafio", "Você guardou a primeira semana de um desafio de economia.", feitasDesafio, 1),
    K("desafioFim", "alvo", "Desafio completo", "Você cumpriu todas as semanas de um desafio.", desafioCompleto ? 1 : 0, 1),
  ];
}
/** As conquistas que a pessoa ganhou e ainda não tinha visto. */
export const novasConquistas = (lista, vistas = []) => lista.filter((c) => c.feita && !vistas.includes(c.id));

/* ======================= acerto de contas do casal ======================= */
/** Quem lançou cada parte dos gastos do mês e quem deve passar quanto para ficar igual (por padrão, metade para cada um). */
export function acertoDoCasal(lancs, m, eu, pctEu = 50) {
  const d = divisaoDoMes(lancs, m, eu), pct = Math.min(100, Math.max(0, Number(pctEu) || 0));
  const total = round2(d.eu.total + d.outro.total), deveEu = round2((total * pct) / 100), saldo = round2(d.eu.total - deveEu);
  return { eu: d.eu.total, outro: d.outro.total, total, pctEu: pct, deveEu, deveOutro: round2(total - deveEu), saldo,
    quem: saldo > 0.004 ? "outro" : saldo < -0.004 ? "eu" : null, valor: Math.abs(saldo) };
}

/* ======================= limite com rolagem =======================
   O que sobrou do limite de uma categoria no mês passado soma ao limite do mês atual (só um mês para trás, sem acumular para sempre). */
export function rolagemDosLimites(st, m, hoje, limites = {}) {
  const ant = addM(m, -1), primeiro = primeiroMes(st);
  if (!primeiro || ant < primeiro) return {};
  const c = calcMes(st, ant, hoje);
  if (c.fase !== "passado" || !(c.rec > 0 || c.custo > 0)) return {};
  const gasto = new Map(catMap(c)), out = {};
  for (const [cat, v] of Object.entries(limites || {})) {
    const lim = Number(v); if (!(lim > 0)) continue;
    const sobra = round2(lim - (gasto.get(cat) || 0));
    if (sobra > 0) out[cat] = Math.min(sobra, lim);
  }
  return out;
}

/* ======================= dividir uma compra em categorias ======================= */
/** Confere a divisão: cada parte com categoria e valor, somando exatamente o total. */
export function conferirDivisao(total, partes) {
  total = round2(Number(total));
  const ok = (partes || []).filter((p) => p && p.categoria && Number(p.valor) > 0).map((p) => ({ categoria: String(p.categoria), valor: round2(Number(p.valor)) }));
  const soma = round2(ok.reduce((t, p) => t + p.valor, 0)), falta = round2(total - soma);
  return { partes: ok, soma, falta, certo: ok.length >= 2 && total > 0 && Math.abs(falta) < 0.005 };
}

/* ======================= cópia de segurança =======================
   Um arquivo com tudo o que a pessoa tem no app. A restauração só traz de volta o que faltar (pelo código de cada registro): nada é apagado nem duplicado. */
const COLUNAS = {
  lancamentos: ["id", "data", "descricao", "tipo", "categoria", "forma", "valor", "import_key", "cartao_id", "parcelas"],
  fixos: ["id", "tipo", "descricao", "categoria", "dia", "valor", "forma", "desde", "ate", "cartao_id", "repete", "dia_semana"],
  faturas: ["id", "cartao_id", "cartao", "vencimento", "valor", "status", "valor_fixo"],
  cartoes: ["id", "nome", "fechamento", "vencimento", "ativo"],
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, DATA = /^\d{4}-\d{2}-\d{2}$/;
export function montaBackup(dados, prefs, versaoApp, agoraISO) {
  const pega = (l, cols) => (l || []).map((r) => Object.fromEntries(cols.filter((k) => r[k] !== undefined).map((k) => [k, r[k]])));
  return { app: "meus-gastos", formato: 1, versaoApp, criadoEm: agoraISO, prefs: prefs || {},
    dados: { lancamentos: pega(dados.lancamentos, COLUNAS.lancamentos), fixos: pega(dados.fixos, COLUNAS.fixos), faturas: pega(dados.faturas, COLUNAS.faturas), cartoes: pega(dados.cartoes, COLUNAS.cartoes),
      pagos: (dados.pagos || []).map((p) => ({ fixo_id: p.fixo_id, mes: p.mes })) } };
}
/** Lê o arquivo de backup e devolve só o que é válido (o arquivo é de fora: nada entra sem conferir). */
export function leBackup(texto) {
  let j; try { j = JSON.parse(texto); } catch { return { ok: false, erro: "O arquivo não é uma cópia do Meus Gastos." }; }
  if (!j || j.app !== "meus-gastos" || j.formato !== 1 || typeof j.dados !== "object") return { ok: false, erro: "O arquivo não é uma cópia do Meus Gastos." };
  let descartados = 0;
  const limpa = (lista, cols, valida) => (Array.isArray(lista) ? lista.slice(0, 100000) : []).flatMap((r) => {
    if (!r || typeof r !== "object" || !UUID.test(String(r.id || "")) || !valida(r)) { descartados++; return []; }
    return [Object.fromEntries(cols.filter((k) => r[k] !== undefined && r[k] !== null).map((k) => [k, r[k]]))];
  });
  const str = (x, n = 200) => typeof x === "string" && x.length <= n, val = (x) => Number.isFinite(Number(x)) && Number(x) > 0 && Number(x) < 1e9;
  const dados = {
    cartoes: limpa(j.dados.cartoes, COLUNAS.cartoes, (r) => str(r.nome, 60) && Number(r.fechamento) >= 1 && Number(r.fechamento) <= 31 && Number(r.vencimento) >= 1 && Number(r.vencimento) <= 31),
    fixos: limpa(j.dados.fixos, COLUNAS.fixos, (r) => ["Despesa", "Receita"].includes(r.tipo) && str(r.descricao) && str(r.categoria, 60) && val(r.valor) && Number(r.dia) >= 1 && Number(r.dia) <= 31 && DATA.test(String(r.desde))),
    lancamentos: limpa(j.dados.lancamentos, COLUNAS.lancamentos, (r) => DATA.test(String(r.data)) && ["Despesa", "Receita", "Reserva"].includes(r.tipo) && str(r.categoria, 60) && str(r.descricao ?? "", 200) && str(r.forma ?? "", 40) && val(r.valor)),
    faturas: limpa(j.dados.faturas, COLUNAS.faturas, (r) => str(r.cartao, 60) && DATA.test(String(r.vencimento)) && val(r.valor) && ["Aberta", "Paga"].includes(r.status)),
    pagos: (Array.isArray(j.dados.pagos) ? j.dados.pagos : []).filter((p) => p && UUID.test(String(p.fixo_id || "")) && DATA.test(String(p.mes))).map((p) => ({ fixo_id: p.fixo_id, mes: p.mes })),
  };
  return { ok: true, dados, descartados, criadoEm: typeof j.criadoEm === "string" ? j.criadoEm.slice(0, 10) : "" };
}
/** O que está no arquivo e ainda não está no app, pelo código de cada registro. */
export function faltaRestaurar(backup, atual) {
  const ids = (l) => new Set((l || []).map((x) => x.id)), novos = (k) => backup[k].filter((x) => !ids(atual[k]).has(x.id));
  const chave = (p) => `${p.fixo_id}|${String(p.mes).slice(0, 10)}`, tem = new Set((atual.pagos || []).map(chave));
  const fixosOk = new Set([...ids(atual.fixos), ...backup.fixos.map((f) => f.id)]);
  return { cartoes: novos("cartoes"), fixos: novos("fixos"), lancamentos: novos("lancamentos"), faturas: novos("faturas"),
    pagos: backup.pagos.filter((p) => !tem.has(chave(p)) && fixosOk.has(p.fixo_id)) };
}

/** Dos ajustes guardados na cópia, só o que a pessoa ainda não tem (nada que já existe é trocado). */
export function ajustesRestauraveis(guardados, atual = {}) {
  const g = guardados && typeof guardados === "object" ? guardados : {}, patch = {};
  const obj = (x) => x && typeof x === "object" && !Array.isArray(x) && JSON.stringify(x).length < 200000;
  const vazio = (x) => !x || (typeof x === "object" && Object.keys(x).length === 0);
  for (const k of ["categorias", "limites", "metas", "desafios", "cotacoes"]) if (obj(g[k]) && !vazio(g[k]) && vazio(atual[k])) patch[k] = g[k];
  for (const k of ["teto", "saldoInicial"]) if (Number.isFinite(g[k]) && g[k] !== 0 && !atual[k]) patch[k] = g[k];
  if (typeof g.saldoDesde === "string" && /^\d{4}-\d{2}(-\d{2})?$/.test(g.saldoDesde) && !atual.saldoDesde) patch.saldoDesde = g.saldoDesde;
  return patch;
}

/* ======================= conta no campo de valor =======================
   "12+8,50" ou "45x2" no valor do gasto: o app faz a conta. Só números e + − × ÷ (sem parênteses). Sem operador, não é conta. */
/** @returns {number|null} o resultado em reais (2 casas), ou null quando não é uma conta válida com resultado maior que zero */
export function avaliaConta(txt) {
  const s = String(txt ?? "").replace(/[R$\s]/g, "").replace(/[x×*]/gi, "*").replace(/[÷/]/g, "/").replace(/[−–]/g, "-");
  if (!/^[\d.,+\-*/]+$/.test(s) || !/\d[+\-*/]\d/.test(s)) return null;
  const partes = s.match(/\d[\d.,]*|[+\-*/]/g);
  if (!partes || partes.join("") !== s || partes.length % 2 === 0) return null;
  const nums = [], ops = [];
  for (let i = 0; i < partes.length; i++) {
    if (i % 2 === 0) { const n = parseMoney(partes[i]); if (!Number.isFinite(n)) return null; nums.push(n); }
    else ops.push(partes[i]);
  }
  // Primeiro × e ÷, depois + e −.
  const n2 = [nums[0]], o2 = [];
  for (let i = 0; i < ops.length; i++) {
    if (ops[i] === "*") n2[n2.length - 1] *= nums[i + 1];
    else if (ops[i] === "/") { if (nums[i + 1] === 0) return null; n2[n2.length - 1] /= nums[i + 1]; }
    else { o2.push(ops[i]); n2.push(nums[i + 1]); }
  }
  let r = n2[0]; o2.forEach((o, i) => { r = o === "+" ? r + n2[i + 1] : r - n2[i + 1]; });
  r = round2(r);
  return Number.isFinite(r) && r > 0 && r < 1e9 ? r : null;
}

/* ======================= meu veículo =======================
   O que o carro (ou a moto) custa de verdade: o que sai do bolso todo mês e o que ele perde de valor.
   Tudo vem dos números que a pessoa digita; o app não busca preço de combustível nem tabela de IPVA. */
/** @returns {null | {partes:{k:string,nome:string,valor:number,pct:number,bolso:boolean}[], bolso:number, desval:number, total:number, porKm:number|null, porKmBolso:number|null, porDia:number, porAno:number, faltaFinanciamento:number}} */
export function custoDoVeiculo(d) {
  const n = (k) => { const v = num(d?.[k]); return Number.isFinite(v) && v > 0 ? v : 0; };
  const km = n("kmMes"), consumo = n("consumo"), litro = n("precoLitro");
  const lista = [
    ["comb", "Combustível", consumo > 0 ? (km / consumo) * litro : 0, true],
    ["manut", "Manutenção e pneus", n("manutAno") / 12, true],
    ["ipva", "IPVA", n("ipvaAno") / 12, true],
    ["seguro", "Seguro", n("seguroAno") / 12, true],
    ["lic", "Licenciamento", n("licAno") / 12, true],
    ["outros", "Estacionamento, pedágio e lavagem", n("outrosMes"), true],
    ["parcela", "Parcela do financiamento", n("parcela"), true],
    ["desval", "Desvalorização (perde de valor)", (n("valor") * Math.min(n("desvalPct"), 100)) / 100 / 12, false],
  ].map(([k, nome, v, bolso]) => ({ k, nome, valor: round2(v), bolso })).filter((p) => p.valor > 0);
  const total = round2(lista.reduce((t, p) => t + p.valor, 0));
  if (!(total > 0)) return null;
  const bolso = round2(lista.filter((p) => p.bolso).reduce((t, p) => t + p.valor, 0)), desval = round2(total - bolso);
  return { partes: lista.map((p) => ({ ...p, pct: Math.round((p.valor / total) * 100) })), bolso, desval, total,
    porKm: km > 0 ? round2(total / km) : null, porKmBolso: km > 0 ? round2(bolso / km) : null, porDia: round2(total / 30.4), porAno: round2(total * 12),
    faltaFinanciamento: round2(n("parcela") * Math.round(n("restantes"))) };
}

/* ======================= mercado (lista de compras) ======================= */
/** Total da lista: preço × quantidade de cada item. */
export function totalDaLista(itens) {
  return round2((itens || []).reduce((t, i) => t + (Number(i.preco) > 0 ? Number(i.preco) * (Number(i.qtd) > 0 ? Number(i.qtd) : 1) : 0), 0));
}
/** O total por categoria, do maior para o menor: [["Mercado", 80], ["Limpeza", 20]]. */
export function totalPorCategoria(itens, padrao = "Mercado") {
  const m = new Map();
  for (const i of itens || []) { const v = totalDaLista([i]); if (v > 0) m.set(i.cat || padrao, round2((m.get(i.cat || padrao) || 0) + v)); }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

/** O valor de um item para cada pessoa. dono: "eu", "outro" ou "dois" (item dos dois: dividido pela parte de cada um). */
export function parteDoItem(i, quem, pctEu = 50) {
  const v = totalDaLista([i]), dono = i.dono || "dois";
  if (dono === quem) return v;
  if (dono !== "dois") return 0;
  const eu = round2((v * pctEu) / 100);
  return quem === "eu" ? eu : round2(v - eu);
}
/** Quanto fica para cada um (e o que é dos dois), com a conta fechando no centavo. */
export function divisaoDaLista(itens, pctEu = 50) {
  const so = (d) => totalDaLista((itens || []).filter((i) => (i.dono || "dois") === d)), dois = so("dois"), meu = so("eu"), dele = so("outro");
  const euDois = round2((dois * pctEu) / 100);
  return { eu: round2(meu + euDois), outro: round2(dele + (dois - euDois)), dois, total: round2(meu + dele + dois), soEu: meu, soOutro: dele };
}
/** Total por categoria só da parte de uma pessoa ("eu" ou "outro"), ou de tudo (quem = null). */
export function totalPorCategoriaDe(itens, quem, padrao = "Mercado", pctEu = 50) {
  const m = new Map();
  for (const i of itens || []) { const v = quem ? parteDoItem(i, quem, pctEu) : totalDaLista([i]); if (v > 0) m.set(i.cat || padrao, round2((m.get(i.cat || padrao) || 0) + v)); }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

/* ======================= minha casa ======================= */
/** Quanto a casa custa por mês. Tudo que for anual (IPTU, manutenção) é dividido por 12. */
export function custoDaCasa(d) {
  const n = (k) => { const v = num(d?.[k]); return Number.isFinite(v) && v > 0 ? v : 0; };
  const lista = [
    ["moradia", n("financia") > 0 && !(n("aluguel") > 0) ? "Parcela do financiamento" : "Aluguel", n("aluguel") + n("financia")],
    ["cond", "Condomínio", n("condominio")],
    ["iptu", "IPTU", n("iptuAno") / 12],
    ["luz", "Luz", n("luz")],
    ["agua", "Água e esgoto", n("agua")],
    ["gas", "Gás", n("gas")],
    ["net", "Internet, TV e celular", n("internet")],
    ["limp", "Limpeza e faxina", n("limpeza")],
    ["manut", "Manutenção e consertos", n("manutAno") / 12],
    ["outros", "Outros gastos da casa", n("outrosMes")],
  ].map(([k, nome, v]) => ({ k, nome, valor: round2(v) })).filter((p) => p.valor > 0);
  const total = round2(lista.reduce((t, p) => t + p.valor, 0));
  if (!(total > 0)) return null;
  const fixos = round2(lista.filter((p) => ["moradia", "cond", "iptu"].includes(p.k)).reduce((t, p) => t + p.valor, 0));
  const m2 = n("area");
  return { partes: lista.map((p) => ({ ...p, pct: Math.round((p.valor / total) * 100) })).sort((a, b) => b.valor - a.valor), total, fixos, consumo: round2(total - fixos),
    porDia: round2(total / 30.4), porAno: round2(total * 12), porM2: m2 > 0 ? round2(total / m2) : null,
    porPessoa: n("moradores") >= 1 ? round2(total / Math.round(n("moradores"))) : null };
}
/** Quanto da renda a casa leva. A regra de bolso mais comum: até 30%. */
export function pesoDaCasa(total, renda) {
  if (!(total > 0) || !(renda > 0)) return null;
  const pct = Math.round((total / renda) * 100);
  return { pct, nivel: pct <= 30 ? "ok" : pct <= 40 ? "atencao" : "alto", teto30: round2(renda * 0.3) };
}

/* ======================= dica do dia (aprender a guardar) ======================= */
export const DICAS = [
  ["Pague-se primeiro", "Assim que o dinheiro entrar, separe uma parte para a sua caixinha. Depois use o resto. Guardar o que sobra quase nunca funciona, porque quase nunca sobra.", "caixa"],
  ["Comece pequeno", "R$ 5 por dia viram R$ 150 por mês e R$ 1.800 por ano. O hábito vale mais do que o valor.", "desafio"],
  ["A regra das 24 horas", "Quer algo que não é urgente? Espere um dia antes de comprar. Boa parte dos desejos passa sozinha.", ""],
  ["Vá ao mercado com lista", "Compra sem lista costuma custar mais. Monte o carrinho no app e veja o total antes de chegar ao caixa.", "mercado"],
  ["Compare o preço por quilo", "A embalagem maior nem sempre é a mais barata. Olhe o preço por kg ou por litro na etiqueta.", ""],
  ["Reserva de emergência primeiro", "Antes de investir, junte o equivalente a 3 meses de gastos. É o que evita dívida quando o imprevisto chega.", "caixa"],
  ["Conheça o custo da sua casa", "Somar aluguel, luz, água, gás e internet mostra para onde vai o maior pedaço da sua renda.", "casa"],
  ["Quanto custa o seu carro de verdade", "Combustível é só uma parte. Some IPVA, seguro, manutenção e desvalorização para ver o custo real por mês.", "veiculo"],
  ["Cuidado com o parcelado", "Parcela pequena esconde o total. Antes de parcelar, multiplique pelo número de parcelas e veja se ainda vale.", "calc"],
  ["Revise as assinaturas", "Streaming, apps e planos que você não usa saem todo mês sem aviso. Cancele um hoje e guarde a diferença.", ""],
  ["Dia sem gasto", "Escolha um dia da semana para não gastar nada, só o essencial. O app conta e dá medalha para quem repete.", ""],
  ["Troque o cartão por um limite", "Defina um limite para a categoria em que você mais gasta. Ver a barra encher ajuda a parar a tempo.", ""],
  ["Meta com data", "Uma meta com valor e data vira um valor mensal. Por exemplo, R$ 3.000 em 10 meses são R$ 300 por mês.", "caixa"],
  ["Guarde os aumentos", "Se a renda subiu, mantenha o padrão de vida por uns meses e guarde a diferença.", ""],
  ["Guarde o troco", "Moedas e notas pequenas somam rápido. No fim da semana, lance o que juntou na caixinha.", "caixa"],
  ["Pechinche à vista", "Pagar à vista costuma abrir desconto. Pergunte antes de passar no cartão.", ""],
  ["Gastos pequenos pesam", "Um café de R$ 8 por dia são R$ 240 por mês. Não precisa cortar tudo, só decidir de propósito.", ""],
  ["Leve comida de casa", "Marmita duas vezes por semana economiza em média o preço de um almoço fora por semana.", ""],
  ["Planeje a semana do mercado", "Defina as refeições antes de comprar. Sobra menos comida estragada e a conta diminui.", "mercado"],
  ["Pague a dívida mais cara primeiro", "Cartão rotativo e cheque especial têm os juros mais altos. Quite esses antes de qualquer outra coisa.", "calc"],
  ["Veja o que mudou no mês", "Olhe a categoria que mais cresceu em relação ao mês passado. É onde está a economia mais fácil.", ""],
  ["Automatize o hábito", "Marque a conta fixa de guardar dinheiro como lembrete do mês. O que é automático acontece.", "caixa"],
  ["Juros trabalham a seu favor", "Dinheiro guardado em lugar que rende cresce sozinho. Simule quanto R$ 200 por mês rendem em 5 anos.", "calc"],
  ["Evite compras por impulso", "Tire os cartões salvos dos sites de compra. Digitar o número dá tempo de pensar.", ""],
  ["Energia: olhe a conta", "Banho mais curto, aparelhos fora da tomada e lâmpadas LED derrubam a conta de luz sem sacrifício.", "casa"],
  ["Fale de dinheiro em casa", "Quem divide a vida divide as contas. Combinar quem paga o quê evita brigas.", ""],
  ["Comemore as metas", "Cada meta batida merece um reconhecimento, mesmo pequeno. Isso mantém a vontade de continuar.", "desafio"],
  ["Anote tudo por uma semana", "Nada muda sem enxergar. Lance cada gasto por sete dias e veja a surpresa.", ""],
  ["Venda o que não usa", "Aquilo que está parado em casa pode virar dinheiro para a caixinha. Lance como entrada e guarde.", ""],
  ["Compre usado quando der", "Livros, ferramentas e móveis usados custam bem menos e duram o mesmo.", ""],
  ["Dinheiro do 13º e das férias", "Receita extra é a melhor chance de adiantar uma meta. Separe metade antes de gastar.", "calc"],
  ["Revise o seu mês no fim", "Cinco minutos no fechamento mostram o que funcionou e o que repetir no próximo mês.", ""],
].map(([titulo, texto, acao]) => ({ titulo, texto, acao }));
/** Uma dica por dia, sempre a mesma no mesmo dia. */
export function dicaDoDia(iso) {
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00Z`), dias = Math.floor(d.getTime() / 86400000);
  if (!Number.isFinite(dias)) return DICAS[0];
  return DICAS[((dias % DICAS.length) + DICAS.length) % DICAS.length];
}
