// Conferir a lista de mercado com a nota fiscal (itens lidos do QR code): casa cada item da lista com a linha da nota, compara preços e total.
// Função pura (sem tela). O app mostra o resultado e a pessoa decide se usa os valores da nota.

const r2 = (n) => Math.round(n * 100) / 100;
const semAcento = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const PARADAS = new Set(["de", "da", "do", "com", "sem", "tradicional", "integral", "int", "nac", "ref", "kg", "un", "pc", "cx", "lav", "fc"]);
const tokens = (s) => semAcento(s).replace(/[^a-z\s]/g, " ").split(/\s+/).filter((t) => t.length >= 3 && !PARADAS.has(t));

/** "lte" é abreviação de "leite"; "arr", de "arroz". */
const ehSubsequencia = (curta, longa) => { let i = 0; for (const c of longa) if (c === curta[i]) i++; return i === curta.length; };
const casaToken = (a, b) => a === b || (b.length >= 3 && a.startsWith(b)) || (a.length >= 3 && b.startsWith(a)) || (b.length >= 3 && b.length < a.length && b[0] === a[0] && ehSubsequencia(b, a));

/** Quanto do nome do item da lista aparece no nome da linha da nota (0 a 1). */
export function parecenca(nomeLista, nomeNota) {
  const a = tokens(nomeLista), b = tokens(nomeNota);
  if (!a.length || !b.length) return 0;
  return a.filter((t) => b.some((u) => casaToken(t, u))).length / a.length;
}

/** Como o item entra na lista a partir da linha da nota: por kg vale o total da linha (quantidade 1); por unidade, quantidade e preço de cada. */
export function valoresDaLinha(l) {
  const valor = Number(l.valor) || 0, qtd = Number(l.qtd) > 0 ? Number(l.qtd) : 1, kg = /^kg|^g$/i.test(String(l.un || ""));
  return kg ? { qtd: 1, preco: r2(valor), total: r2(valor) } : { qtd, preco: r2(valor / qtd), total: r2(valor) };
}

/**
 * @param {{id:string,nome:string,qtd?:number,preco?:number,pego?:boolean}[]} itens  itens da lista
 * @param {{valor:number, itens:{nome:string,qtd:number|null,un:string,valor:number|null}[]}} nota
 * @returns {{pares:object[], soNaLista:object[], soNaNota:object[], totalLista:number, totalNota:number}}
 */
export function conferirListaComNota(itens, nota) {
  const linhas = (nota?.itens || []).filter((l) => Number(l.valor) > 0), usadas = new Set(), pares = [];
  const candidatos = [];
  (itens || []).forEach((it, i) => linhas.forEach((l, j) => { const p = parecenca(it.nome, l.nome); if (p >= 0.5) candidatos.push({ i, j, p }); }));
  candidatos.sort((x, y) => y.p - x.p || x.j - y.j);
  const itemUsado = new Set();
  for (const c of candidatos) {
    if (itemUsado.has(c.i) || usadas.has(c.j)) continue;
    itemUsado.add(c.i); usadas.add(c.j);
    const it = itens[c.i], l = linhas[c.j], v = valoresDaLinha(l), noCarrinho = it.pego ? r2((Number(it.preco) || 0) * (Number(it.qtd) > 0 ? Number(it.qtd) : 1)) : 0;
    pares.push({ item: it, linha: l, novo: v, totalLista: noCarrinho, totalNota: v.total, diferenca: r2(v.total - noCarrinho) });
  }
  const soNaLista = (itens || []).filter((_, i) => !itemUsado.has(i) && itens[i].pego);
  const soNaNota = linhas.filter((_, j) => !usadas.has(j));
  const totalLista = r2((itens || []).filter((x) => x.pego).reduce((t, x) => t + (Number(x.preco) || 0) * (Number(x.qtd) > 0 ? Number(x.qtd) : 1), 0));
  return { pares: pares.sort((a, b) => itens.indexOf(a.item) - itens.indexOf(b.item)), soNaLista, soNaNota, totalLista, totalNota: r2(Number(nota?.valor) || 0) };
}
