// Ferramentas extras do app, todas funções puras (sem tela), testadas em tests/extras.test.mjs:
// "Meu desempenho" em frases, calculadoras, desafio de economia, resumo do ano, subcategorias,
// valor em outra moeda, colar a mensagem do banco, CSV e PDF do relatório.
import { calcMes, addM, round2, MESES, MES3, catMap, comparaCategorias, primeiroMes, ocorrencias, diasEntre, ultimosMeses } from "./calc.js";

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
