/* Mede o uso do app para a gente saber o que ajuda e onde as pessoas travam.
   Não manda nada pessoal: só o nome do que aconteceu (abrir, trocar de tela, iniciar uma jornada...), a versão, o tipo de uso
   (motorista ou geral) e um código aleatório do aparelho. Nunca manda valores, descrições, nomes, e-mails nem o login.
   Quem não quiser desliga em Ajustes. Na demonstração não manda nada. */

/** Os únicos eventos que o app pode mandar. O banco também só aceita nomes simples (letras e _). */
export const EVENTOS = ["aberto", "tela", "lancamento", "voz", "jornada_iniciada", "jornada_encerrada", "vale_usado", "oferta", "reserva_ligada", "fixo_diario", "meses_cartao"];

/** Um código aleatório e sem relação com o login, guardado só neste aparelho. */
export function codigoDoAparelho(armazem = globalThis.localStorage, aleatorio = () => (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`)) {
  try { let c = armazem.getItem("cg-aparelho"); if (!c || c.length < 8) { c = aleatorio(); armazem.setItem("cg-aparelho", c); } return c; }
  catch { return null; }
}

/** Deixa só o que cabe no banco: textos curtos de letras e números, no máximo 5 campos. Nunca texto livre. */
export function limpaDados(dados) {
  const out = {};
  for (const [k, v] of Object.entries(dados || {})) {
    if (Object.keys(out).length >= 5) break;
    if (!/^[a-z_]{1,20}$/.test(k)) continue;
    if (typeof v === "number" && Number.isFinite(v)) out[k] = Math.round(v * 100) / 100;
    else if (typeof v === "boolean") out[k] = v;
    else if (typeof v === "string" && /^[a-zA-Z0-9_\-]{1,24}$/.test(v)) out[k] = v;
  }
  return out;
}

/** Monta a linha que vai para o servidor, ou null se o evento não é um dos permitidos. */
export function montaEvento({ nome, dados, aparelho, versao, perfil }) {
  if (!EVENTOS.includes(nome) || !aparelho) return null;
  return { dispositivo: String(aparelho).slice(0, 40), nome, versao: String(versao || "").slice(0, 20), perfil: perfil === "motorista" ? "motorista" : "geral", dados: limpaDados(dados) };
}

/**
 * Cria o medidor. `envia(linhas)` leva as linhas ao servidor (pode falhar sem problema: o app segue).
 * `ativo()` diz se a pessoa deixou ligado e se não é a demonstração. Junta os eventos e manda de uma vez a cada poucos segundos,
 * no máximo `limite` por abertura do app. Se o servidor recusar (ex.: a tabela não existe), para de tentar nesta abertura.
 */
export function criaMedidor({ envia, ativo, aparelho, versao, perfil, limite = 120, espera = 8000, agenda = (f, ms) => setTimeout(f, ms) }) {
  let fila = [], enviados = 0, parado = false, marcado = false;
  const manda = async () => {
    marcado = false;
    if (!fila.length || parado) return;
    const lote = fila.splice(0, 25);
    try { await envia(lote); } catch { parado = true; }
    if (fila.length && !parado) { marcado = true; agenda(manda, espera); }
  };
  return {
    evento(nome, dados = {}) {
      if (parado || enviados >= limite || !ativo()) return false;
      const linha = montaEvento({ nome, dados, aparelho: aparelho(), versao, perfil: perfil() });
      if (!linha) return false;
      enviados++; fila.push(linha);
      if (!marcado) { marcado = true; agenda(manda, espera); }
      return true;
    },
    manda,
    pendentes: () => fila.length,
  };
}

/** Há quantos dias este aparelho abriu o app pela primeira vez (0 na primeira vez). Guarda só a data da primeira abertura. */
export function diasDeUso(armazem = globalThis.localStorage, hoje = new Date().toISOString().slice(0, 10)) {
  try {
    let p = armazem.getItem("cg-primeira-abertura");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p || "")) { p = hoje; armazem.setItem("cg-primeira-abertura", p); }
    return Math.max(0, Math.round((Date.parse(hoje + "T12:00:00Z") - Date.parse(p + "T12:00:00Z")) / 864e5));
  } catch { return 0; }
}
