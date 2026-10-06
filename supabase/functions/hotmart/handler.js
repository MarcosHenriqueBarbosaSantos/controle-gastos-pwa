// Recebe os avisos de compra da Hotmart (webhook 2.0.0) e libera o acesso do e-mail de quem comprou.
//   GET                          → { ok, servico }: só para conferir que a função está publicada
//   POST + X-HOTMART-HOTTOK      → um aviso da Hotmart (compra aprovada, renovação, cancelamento, reembolso...)
// Segredos da função (Edge Functions → Secrets):
//   HOTMART_HOTTOK   o código que a Hotmart mostra em Ferramentas → Webhook; sem ele a função recusa tudo
//   HOTMART_PRODUTO  opcional: o número do produto; com ele, avisos de outros produtos são ignorados
// As dependências chegam por parâmetro para o mesmo código rodar nos testes (Node) e no Supabase (Deno).

/** Dias a mais depois da data de renovação, para a cobrança da Hotmart ter tempo de cair. */
export const GRACA_DIAS = 3;
const LIBERAM = ["PURCHASE_APPROVED", "PURCHASE_COMPLETE"], CORTAM = ["PURCHASE_REFUNDED", "PURCHASE_CHARGEBACK"];

/** Datas da Hotmart: milissegundos desde 1970 (número ou texto), segundos ou data por extenso (ISO). */
export function dataDe(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v), d = Number.isFinite(n) ? new Date(n < 1e11 ? n * 1000 : n) : new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}
const dia = (d) => d.toISOString().slice(0, 10);
const maisDias = (d, n) => new Date(d.getTime() + n * 86400000);
const maisUmAno = (d) => { const x = new Date(d.getTime()); x.setUTCFullYear(x.getUTCFullYear() + 1); return x; };

/**
 * Lê um aviso da Hotmart e diz o que fazer com o acesso. Não toca no banco.
 * acao: "liberar"  compra aprovada (a primeira ou uma renovação): acesso até a próxima cobrança, ou por 1 ano
 *       "cancelar" a pessoa cancelou a renovação: o acesso continua até o fim do período já pago
 *       "cortar"   reembolso ou contestação no cartão: o acesso acaba
 *       "nada"     boleto gerado, pagamento atrasado, carrinho abandonado e outros: só fica registrado
 * @returns {{evento:string, email:string, transacao:string|null, assinante:string|null, produto:string|null, acao:string, ate:string|null}}
 */
export function interpreta(corpo, agora = new Date()) {
  const d = corpo?.data || {}, evento = String(corpo?.event || "").toUpperCase();
  const email = String(d.buyer?.email || d.subscriber?.email || d.subscription?.subscriber?.email || "").trim().toLowerCase();
  const base = { evento, email, transacao: d.purchase?.transaction ? String(d.purchase.transaction) : null,
    assinante: String(d.subscription?.subscriber?.code || d.subscriber?.code || "") || null, produto: d.product?.id != null ? String(d.product.id) : null };
  if (LIBERAM.includes(evento)) {
    const proxima = dataDe(d.purchase?.date_next_charge ?? d.date_next_charge), aprovada = dataDe(d.purchase?.approved_date) || dataDe(d.purchase?.order_date) || agora;
    // Data de renovação no passado (aviso atrasado ou de teste) não vale: conta 1 ano a partir da compra.
    const fim = proxima && proxima > agora ? proxima : maisUmAno(aprovada);
    return { ...base, acao: "liberar", ate: dia(maisDias(fim, GRACA_DIAS)) };
  }
  if (evento === "SUBSCRIPTION_CANCELLATION") return { ...base, acao: "cancelar", ate: null };
  if (CORTAM.includes(evento)) return { ...base, acao: "cortar", ate: null };
  return { ...base, acao: "nada", ate: null };
}

/** Compara dois textos sem parar no primeiro caractere diferente (não entrega o código aos poucos pelo tempo de resposta). */
export function igual(a, b) {
  a = String(a ?? ""); b = String(b ?? "");
  let dif = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) dif |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return dif === 0;
}

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

export function criaHandler({ createClient, env, agora = () => new Date() }) {
  const admin = () => createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false, autoRefreshToken: false } });

  /** Aplica o aviso na tabela de acessos e devolve, em palavras, o que foi feito. */
  async function aplica(db, a, hoje) {
    if (a.acao === "nada") return "só registrado";
    if (!a.email) return "sem e-mail: nada feito";
    const { data: atual, error } = await db.from("acessos").select("*").eq("email", a.email).maybeSingle();
    if (error) throw new Error(`acessos: ${error.message}`);
    const quando = agora().toISOString();
    if (a.acao === "liberar") {
      // Aviso repetido de uma compra que já foi reembolsada não reabre o acesso.
      if (atual?.status === "reembolsado" && a.transacao && a.transacao === atual.transacao) return "compra já reembolsada: nada mudou";
      // Cortesia sem data de fim continua sem data. Renovação nunca encurta o que a pessoa já tinha.
      const semFim = atual && atual.status !== "reembolsado" && atual.ate === null;
      const ate = semFim ? null : atual && atual.status !== "reembolsado" && atual.ate && atual.ate > a.ate ? atual.ate : a.ate;
      const linha = { email: a.email, status: "ativo", ate, origem: semFim ? atual.origem : "hotmart", transacao: a.transacao || atual?.transacao || null, assinante: a.assinante || atual?.assinante || null, atualizado: quando };
      const r = await db.from("acessos").upsert(linha, { onConflict: "email" });
      if (r.error) throw new Error(`acessos: ${r.error.message}`);
      return ate ? `acesso até ${ate}` : "acesso sem data de fim (cortesia mantida)";
    }
    if (!atual) return "sem acesso anotado: nada feito";
    if (atual.origem === "cortesia") return "cortesia: nada mudou";
    if (a.acao === "cancelar") {
      if (atual.status !== "ativo") return "já não estava ativo: nada mudou";
      const r = await db.from("acessos").update({ status: "cancelado", atualizado: quando }).eq("email", a.email);
      if (r.error) throw new Error(`acessos: ${r.error.message}`);
      return atual.ate && atual.ate >= hoje ? `renovação cancelada: vale até ${atual.ate}` : "renovação cancelada";
    }
    const r = await db.from("acessos").update({ status: "reembolsado", atualizado: quando }).eq("email", a.email);
    if (r.error) throw new Error(`acessos: ${r.error.message}`);
    return "acesso encerrado";
  }

  return async function handler(req) {
    try {
      if (req.method === "GET") return json({ ok: true, servico: "hotmart" });
      if (req.method !== "POST") return json({ erro: "Método não aceito." }, 405);
      const hottok = env("HOTMART_HOTTOK");
      if (!hottok) return json({ erro: "Falta cadastrar HOTMART_HOTTOK nos segredos da função." }, 503);
      if (!igual(req.headers.get("x-hotmart-hottok"), hottok)) return json({ erro: "Código de verificação inválido." }, 401);
      const corpo = await req.json().catch(() => null);
      if (!corpo || typeof corpo !== "object") return json({ erro: "Aviso sem conteúdo." }, 400);
      const a = interpreta(corpo, agora()), db = admin(), produto = env("HOTMART_PRODUTO");
      const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(agora());
      const efeito = produto && a.produto && a.produto !== String(produto) ? "outro produto: ignorado" : await aplica(db, a, hoje);
      // O registro guarda só o necessário para conferir: nada de nome, telefone ou documento de quem comprou.
      await db.from("acesso_eventos").insert({ evento: a.evento.slice(0, 60), email: a.email.slice(0, 200) || null, transacao: a.transacao?.slice(0, 60) || null, efeito });
      return json({ ok: true, evento: a.evento, efeito });
    } catch (e) {
      console.error(e);
      // Erro nosso: a Hotmart tenta de novo mais tarde.
      return json({ erro: String(e?.message || e) }, 500);
    }
  };
}
