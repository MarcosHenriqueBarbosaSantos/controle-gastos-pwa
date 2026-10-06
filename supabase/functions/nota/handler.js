// Consulta de nota fiscal de consumidor (NFC-e) pelo endereço do QR code.
//
// O QR code do cupom de mercado não traz o valor: ele é só um endereço do site da Fazenda do estado.
// O navegador não consegue ler esse site de dentro do app, então quem lê é este servidor:
//   POST { "url": "<endereço que estava no QR code>" }, com o login do app
//   → { ok: true, nota: { loja, valor, data, forma, qtdItens, itens } }   ou   { ok: false, motivo }
//
// Cuidados:
//   - Só abre endereço https de site de Fazenda estadual (.gov.br) que traga uma chave de nota válida.
//   - Devolve só os campos lidos, nunca a página. Nada é guardado nem registrado: nem o endereço, nem a nota.
//   - Só atende quem está logado no app, com um limite de consultas por pessoa.

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { ...CORS, "Content-Type": "application/json" } });

/* ===================== o endereço ===================== */

/** Dígito verificador da chave de acesso (módulo 11, pesos de 2 a 9, da direita para a esquerda). */
const dvDaChave = (c43) => { let soma = 0, peso = 2; for (let i = c43.length - 1; i >= 0; i--) { soma += Number(c43[i]) * peso; peso = peso === 9 ? 2 : peso + 1; } const r = 11 - (soma % 11); return r >= 10 ? 0 : r; };
export const chaveOk = (c) => /^\d{44}$/.test(c) && dvDaChave(c.slice(0, 43)) === Number(c[43]);

// Nomes que aparecem nos sites das Fazendas estaduais: fazenda, sefaz, sefa (PA), sefin (RO), sef (SC), set (RN), receita (PB), nfce, dfe.
const SITE_DE_FAZENDA = /(^|[.\-])(fazenda|sefaz|sefaznet|sefa|sefin|sef|set|receita|nfce|nfe|dfe|dfeportal|portalsped)([.\-]|$)/;

/** O endereço é de um site de Fazenda estadual? Só https, sem porta, sem usuário, terminando em .gov.br. */
export function siteAceito(u) {
  return u instanceof URL && u.protocol === "https:" && !u.port && !u.username && !u.password
    && /^[a-z0-9.\-]+\.gov\.br$/.test(u.hostname) && SITE_DE_FAZENDA.test(u.hostname.replace(/\.gov\.br$/, ""));
}

/**
 * Confere o endereço que veio do QR code e devolve o endereço pronto para consultar, ou null.
 * Além do site, exige a chave da nota (44 números com o dígito certo): sem ela, não é um QR code de nota.
 * @returns {string|null}
 */
export function enderecoDaNota(texto) {
  let u; try { u = new URL(String(texto ?? "").trim()); } catch { return null; }
  if (!siteAceito(u)) return null;
  const chave = (u.searchParams.get("p") || "").split("|")[0] || u.searchParams.get("chNFe") || "";
  if (!chaveOk(chave)) return null;
  // Alguns servidores recusam a barra vertical solta no endereço: ela vai codificada.
  return u.href.replace(/\|/g, "%7C");
}

/* ===================== a página da nota ===================== */

const ENTIDADES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú", atilde: "ã", otilde: "õ", acirc: "â", ecirc: "ê", ocirc: "ô", ccedil: "ç",
  Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú", Atilde: "Ã", Otilde: "Õ", Acirc: "Â", Ecirc: "Ê", Ocirc: "Ô", Ccedil: "Ç" };
const semEntidades = (s) => s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16))).replace(/&([a-zA-Z]+);/g, (m, n) => ENTIDADES[n] ?? m);
const limpo = (s) => semEntidades(String(s ?? "").replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
const reais = (s) => { const v = Number(String(s ?? "").trim().replace(/\./g, "").replace(",", ".")); return Number.isFinite(v) && v > 0 && v < 1e7 ? Math.round(v * 100) / 100 : null; };
const numero = (s) => { const v = Number(String(s ?? "").trim().replace(/\./g, "").replace(",", ".")); return Number.isFinite(v) && v > 0 ? v : null; };

/** Do nome que a nota dá à forma de pagamento para as formas do app. Vazio quando não há correspondência (vale-refeição, crédito da loja). */
export function formaDoApp(nome) {
  const n = String(nome ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  if (/pix|instantaneo/.test(n)) return "Pix";
  if (/credito/.test(n) && !/loja/.test(n)) return "Cartão de crédito";
  if (/debito/.test(n)) return "Débito";
  if (/dinheiro/.test(n)) return "Dinheiro";
  if (/boleto/.test(n)) return "Boleto";
  return "";
}

/**
 * Lê a página "Consulta resumida da NFC-e", que é o modelo usado por São Paulo e por vários outros estados.
 * Devolve null quando não acha o valor: a página mudou, é de outro modelo ou a nota não foi encontrada.
 * @returns {{loja:string, valor:number, data:string|null, forma:string, qtdItens:number, itens:{nome:string, qtd:number|null, un:string, valor:number|null}[]}|null}
 */
export function leNota(html) {
  const h = String(html ?? "");
  const corpo = h.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " "), texto = limpo(corpo);
  const aPagar = texto.match(/Valor a pagar\s*R\$\s*:?\s*([\d.]+,\d{2})/i) || texto.match(/Valor total\s*R\$\s*:?\s*([\d.]+,\d{2})/i);
  const valor = aPagar ? reais(aPagar[1]) : null;
  if (valor === null) return null;
  const loja = limpo((corpo.match(/class="[^"]*\btxtTopo\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i) || [])[1]).slice(0, 80);
  const d = texto.match(/Emiss[ãa]o\s*:?\s*(\d{2})\/(\d{2})\/(\d{4})/i);
  const data = d && Number(d[2]) >= 1 && Number(d[2]) <= 12 && Number(d[1]) >= 1 && Number(d[1]) <= 31 ? `${d[3]}-${d[2]}-${d[1]}` : null;
  // Formas de pagamento: fica a de maior valor (quem paga parte em dinheiro e parte no cartão escolhe na conferência).
  let forma = "", maior = 0;
  const pagamentos = corpo.slice(Math.max(0, corpo.search(/Forma de pagamento/i)));
  for (const m of pagamentos.matchAll(/<label[^>]*class="[^"]*\btx\b[^"]*"[^>]*>([\s\S]*?)<\/label>\s*<span[^>]*>([\s\S]*?)<\/span>/gi)) {
    const nome = limpo(m[1]), v = reais(limpo(m[2]));
    if (/troco/i.test(nome) || v === null) continue;
    if (v > maior) { maior = v; forma = formaDoApp(nome); }
  }
  const itens = [];
  for (const m of corpo.matchAll(/<tr[^>]*>\s*<td[^>]*>\s*<span[^>]*class="[^"]*\btxtTit\b[^"]*"[^>]*>([\s\S]*?)<\/span>([\s\S]*?)<\/tr>/gi)) {
    if (itens.length >= 300) break;
    const resto = m[2], nome = limpo(m[1]).slice(0, 80);
    if (!nome) continue;
    itens.push({ nome, qtd: numero(limpo((resto.match(/Qtde\.?\s*:?\s*<\/strong>([^<]*)/i) || [])[1])), un: limpo((resto.match(/UN\s*:?\s*<\/strong>([^<]*)/i) || [])[1]).slice(0, 6),
      valor: reais(limpo((resto.match(/class="[^"]*\bvalor\b[^"]*"[^>]*>([^<]*)/i) || [])[1])) });
  }
  const q = texto.match(/Qtd\.?\s*total de itens\s*:?\s*(\d{1,4})/i);
  return { loja, valor, data, forma, qtdItens: q ? Number(q[1]) : itens.length, itens };
}

/* ===================== o servidor ===================== */

const TAMANHO_MAXIMO = 1_500_000, ESPERA_MS = 9000, PULOS = 3;

/** Abre a página da nota. Segue só redirecionamento para site aceito, espera pouco e não lê página enorme. */
export async function buscaPagina(endereco, fetchFn) {
  let atual = endereco;
  for (let i = 0; i <= PULOS; i++) {
    const corta = new AbortController(), relogio = setTimeout(() => corta.abort(), ESPERA_MS);
    try {
      const r = await fetchFn(atual, { redirect: "manual", signal: corta.signal });
      if (r.status >= 300 && r.status < 400) {
        let prox; try { prox = new URL(r.headers.get("location") || "", atual); } catch { return null; }
        if (!siteAceito(prox)) return null;
        atual = prox.href.replace(/\|/g, "%7C"); continue;
      }
      if (r.status !== 200) return null;
      const texto = await r.text();
      return texto.length > TAMANHO_MAXIMO ? null : texto;
    } catch { return null; } finally { clearTimeout(relogio); }
  }
  return null;
}

/**
 * @param {{createClient:Function, env:(k:string)=>string|undefined, fetchFn?:Function, agora?:()=>Date}} dep
 */
export function criaHandler({ createClient, env, fetchFn = fetch, agora = () => new Date() }) {
  const admin = () => createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false, autoRefreshToken: false } });
  // Limite por pessoa: 20 consultas a cada 10 minutos. Protege o site da Fazenda e a nossa cota.
  const usos = new Map(), JANELA = 10 * 60 * 1000, LIMITE = 20;
  const passou = (id) => {
    const t = agora().getTime(), l = (usos.get(id) || []).filter((x) => t - x < JANELA);
    if (l.length >= LIMITE) { usos.set(id, l); return true; }
    l.push(t); usos.set(id, l);
    if (usos.size > 5000) for (const [k, v] of usos) if (!v.some((x) => t - x < JANELA)) usos.delete(k);
    return false;
  };

  return async function handler(req) {
    try {
      if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
      if (req.method === "GET") return json({ ok: true, servico: "nota" });
      if (req.method !== "POST") return json({ erro: "Método não aceito." }, 405);
      const db = admin();
      // Quem pode pedir: a pessoa logada no app. O segredo do agendamento serve para o teste de funcionamento.
      let quem = "";
      const segredo = req.headers.get("x-avisos-segredo");
      if (segredo) {
        const { data: confere } = await db.rpc("avisos_confere_segredo", { s: segredo });
        if (confere !== true) return json({ erro: "Segredo inválido." }, 401);
        quem = "teste";
      } else {
        const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
        const { data } = token ? await db.auth.getUser(token) : { data: null };
        if (!data?.user) return json({ erro: "Entre no app para consultar a nota." }, 401);
        quem = data.user.id;
      }
      const corpo = await req.json().catch(() => null);
      const endereco = enderecoDaNota(corpo?.url);
      if (!endereco) return json({ ok: false, motivo: "endereco" });
      if (passou(quem)) return json({ ok: false, motivo: "limite" }, 429);
      const pagina = await buscaPagina(endereco, fetchFn);
      if (pagina === null) return json({ ok: false, motivo: "fora-do-ar" });
      const nota = leNota(pagina);
      return nota ? json({ ok: true, nota }) : json({ ok: false, motivo: "nao-entendi" });
    } catch (e) {
      console.error("nota:", e?.name || "erro");   // sem o endereço e sem o conteúdo da nota
      return json({ ok: false, motivo: "erro" }, 500);
    }
  };
}
