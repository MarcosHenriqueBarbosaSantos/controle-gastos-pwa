// Etiqueta de preço lida por foto: peça pesada no açougue/padaria (TOTAL R$, PESO, R$/kg) e placa de prateleira (preço grande, "Preço por 1kg/1un", Atacado/Varejo).
// Função pura (recebe o texto que o leitor tirou da foto): tudo o que o app "adivinha" aqui a pessoa confere antes de salvar.

const r2 = (n) => Math.round(n * 100) / 100;
/** Preços escritos como 50,27 ou 48.90 (etiqueta de balança usa os dois). */
const PRECO = /(?<![\d.,])(\d{1,4})[.,](\d{2})(?![\d])/g;
const precos = (s) => [...String(s).matchAll(PRECO)].map((m) => r2(Number(m[1] + "." + m[2]))).filter((v) => v > 0 && v < 10000);
const semAcento = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Palavras de cadastro do mercado que não ajudam a pessoa a reconhecer o item. */
const SOBRA = new Set(["s/o", "so", "bov", "bovino", "bovina", "fc", "fr", "kg", "ks", "kgs", "un", "und", "tras", "part", "pc", "cx", "granel", "nacional", "ref", "rs", "r$"]);
const ACENTOS = { acem: "Acém", cafe: "Café", macarrao: "Macarrão", feijao: "Feijão", linguica: "Linguiça", pao: "Pão", agucar: "Açúcar", limao: "Limão", maca: "Maçã", mamao: "Mamão", cha: "Chá" };

/** "ACEM S/O BOV FC kg" vira "Acém"; "ALFACE CRESPA" vira "Alface crespa". */
export function nomeDaEtiqueta(bruto) {
  const palavras = String(bruto || "").replace(/[^A-Za-zÀ-ÿ/$ ]+/g, " ").split(/\s+/).filter(Boolean)
    .filter((p) => !SOBRA.has(semAcento(p).toLowerCase()) && p.length > 1);
  if (!palavras.length) return "";
  const limpas = palavras.slice(0, 3).map((p) => p.toLowerCase());
  limpas[0] = ACENTOS[semAcento(limpas[0])] || limpas[0].charAt(0).toUpperCase() + limpas[0].slice(1);
  return limpas.join(" ").slice(0, 40);
}

const RUIDO = /atacad|assa[ií]|data|hora|validade|peso|total|r\$|pesagem|aproveite|oferta|promo|pre[cç]o|varejo|lj\s*\d|\d{2}\/\d{2}\/\d{2}|\d{6,}/i;
const eNome = (l) => /[A-Za-zÀ-ÿ]{3,}/.test(l) && !RUIDO.test(l) && (l.match(/[A-Za-zÀ-ÿ]/g) || []).length >= 4;

/**
 * Lê o texto de uma etiqueta e devolve { tipo: "pesado" | "prateleira", nome, valor, peso?, porKg?, unidade? } ou null.
 * pesado: valor é o TOTAL da peça (confere peso × preço por kg). prateleira: valor é o preço da placa (Varejo, quando tem Atacado e Varejo).
 */
export function leEtiquetaDePreco(texto) {
  const t = String(texto || ""), linhas = t.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  if (!linhas.length) return null;
  // Peça pesada: peso em kg (1,028 kg) e total.
  const pesoM = t.match(/(?<![\d.,])(\d)[.,](\d{3})\s*k[g9sq]?\b/i), peso = pesoM ? Number(pesoM[1] + "." + pesoM[2]) : 0;
  if (peso > 0 && /peso|total|pesagem/i.test(t)) {
    const todos = [...new Set(precos(t.replace(pesoM[0], " ")))], marcado = t.match(/total[^\d\n]*(\d{1,4}[.,]\d{2})/i);
    const total0 = marcado ? precos(marcado[1])[0] : 0;
    let total = 0, porKg = 0;
    // O par certo é o que fecha: peso × preço por kg ≈ total (a balança arredonda os centavos).
    for (const kg of todos) for (const tot of todos) if (tot > kg * 0.5 && Math.abs(r2(peso * kg) - tot) <= 0.03 && tot >= total) { total = tot; porKg = kg; }
    if (!total && total0) total = total0;
    if (!total && todos.length) total = Math.max(...todos);
    if (total > 0) {
      const nome = nomeDaEtiqueta(linhas.find(eNome) || "");
      return { tipo: "pesado", nome, valor: total, peso, porKg: porKg || null, unidade: "kg" };
    }
  }
  // Placa de prateleira: o preço grande; se tem Atacado e Varejo, vale o Varejo.
  const varejo = t.match(/varejo[^\d\n]*(\d{1,4}[.,]\d{2})/i), atacado = t.match(/atacad[oa][^\d\n]*(\d{1,4}[.,]\d{2})/i);
  let valor = varejo ? precos(varejo[1])[0] : 0;
  if (!valor) {
    const grandes = precos(t.split(/\n/).filter((l) => !/atacad|data|\bLJ\b/i.test(l)).join("\n"));
    const cont = new Map(); grandes.forEach((v) => cont.set(v, (cont.get(v) || 0) + 1));
    valor = [...cont.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]?.[0] || 0;
    if (atacado && valor === precos(atacado[1])[0] && cont.size > 1) valor = [...cont.keys()].find((v) => v !== valor) || valor;
  }
  if (!(valor > 0)) return null;
  const unidade = /pre[cç]o\s*por\s*1?\s*kg|\bkg\b/i.test(t) ? "kg" : "un";
  const nomeLinhas = linhas.filter(eNome).slice(0, 2).join(" ");
  return { tipo: "prateleira", nome: nomeDaEtiqueta(nomeLinhas), valor, unidade };
}
