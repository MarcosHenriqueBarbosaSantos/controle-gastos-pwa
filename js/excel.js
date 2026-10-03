// Importar e exportar planilhas do Excel (usa a biblioteca SheetJS, global XLSX).
// O formato é o mesmo do modelo em modelo/Meus_Gastos_Modelo.xlsx:
//   Lançamentos | Gastos Fixos | Entradas Fixas | Cartões (+ Resumo e Meus Cartões, na exportação)
// "Cartões" é a lista de faturas; "Meus Cartões" é o cadastro (nome, dia de fechamento e de vencimento).
// Também lê a planilha "antiga" livre, com colunas DIA | RECEITA/DESPESA | VALOR.

import { FORMAS, RETIRADA, MES3, DIAS_SEMANA, pad, mKey, parseMoney, round2, faturasDoMes } from "./calc.js";

export const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Converte número serial do Excel, "dd/mm/aaaa" ou "aaaa-mm-dd" em "aaaa-mm-dd". */
export function cellToISO(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number" && v > 20000 && v < 80000) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) { let y = Number(m[3]); if (y < 100) y += 2000; return `${y}-${pad(m[2])}-${pad(m[1])}`; }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

const GUESS = [["salar", "Receita", "Salário"], ["adiant", "Receita", "Adiantamento"], ["condom", "Despesa", "Moradia"],
  ["aluguel", "Despesa", "Moradia"], ["internet", "Despesa", "Contas da casa"], ["luz", "Despesa", "Contas da casa"],
  ["agua", "Despesa", "Contas da casa"], ["faculd", "Despesa", "Educação"], ["curso", "Despesa", "Educação"],
  ["parcela", "Despesa", "Parcelas e financiamentos"], ["carro", "Despesa", "Transporte"], ["gasolina", "Despesa", "Transporte"],
  ["uber", "Despesa", "Transporte"], ["beleza", "Despesa", "Beleza"],
  ["mercado", "Despesa", "Mercado"], ["farmac", "Despesa", "Saúde"], ["cinema", "Despesa", "Lazer"]];
export function guessCat(desc, tipo) {
  const d = norm(desc);
  for (const [k, t, c] of GUESS) if (d.includes(k) && t === tipo) return c;
  return "Outros";
}
const tipoDe = (v) => { const t = norm(v); return t === "entrada" || t === "receita" ? "Receita" : t === "reserva" || t === "guardado" ? "Reserva" : "Despesa"; };
const tipoParaPlanilha = (t) => (t === "Receita" ? "Entrada" : t === "Despesa" ? "Gasto" : "Guardado");

/** Chave estável de um lançamento — reimportar a mesma planilha não duplica. */
export function importKey(x) {
  let h = 5381;
  for (const c of [x.data, norm(x.descricao), x.tipo, round2(x.valor)].join("|") + (x.forma === RETIRADA ? "|ret" : "")) h = ((h << 5) + h + c.charCodeAt(0)) | 0;
  return "imp-" + (h >>> 0).toString(36);
}

function findHeader(rows, keys) {
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const r = (rows[i] || []).map(norm);
    if (keys.every((k) => r.some((c) => c.startsWith(k)))) return i;
  }
  return -1;
}
const col = (hdr, key) => hdr.findIndex((c) => norm(c).startsWith(key));
/** Lê as colunas "Repete" e "Dia da semana" de um fixo, se existirem. */
function leRepete(H, r) {
  const iR = col(H, "repete"), iS = H.findIndex((c) => norm(c) === "dia da semana");
  if (iR < 0 || !norm(r[iR]).startsWith("seman")) return {};
  const wd = DIAS_SEMANA.findIndex((d) => norm(d).startsWith(norm(r[iS]).slice(0, 3)) && norm(r[iS]).length >= 3);
  return wd < 0 ? {} : { repete: "semanal", dia_semana: wd };
}

/**
 * Lê um workbook do SheetJS.
 * @returns {{lancamentos:any[], fixos:any[], faturas:any[], cartoes:any[], formato:"modelo"|"antigo"|""}}
 * Lançamentos e fixos trazem `cartao` (o nome do cartão, quando a planilha informa) e, nos lançamentos, `parcelas`.
 */
export function parseWorkbook(XLSX, wb) {
  const out = { lancamentos: [], fixos: [], faturas: [], cartoes: [], formato: "" };
  const sheet = (name) => {
    const k = wb.SheetNames.find((n) => norm(n) === norm(name));
    return k ? XLSX.utils.sheet_to_json(wb.Sheets[k], { header: 1, raw: true, defval: null }) : null;
  };

  const L = sheet("Lançamentos");
  if (L) {
    out.formato = "modelo";
    const h = findHeader(L, ["data", "descri", "tipo"]);
    if (h >= 0) {
      const H = L[h], ci = { d: col(H, "data"), ds: col(H, "descri"), t: col(H, "tipo"), c: col(H, "categ"), f: col(H, "forma"), v: col(H, "valor"), k: col(H, "cartao"), p: col(H, "parcel") };
      L.slice(h + 1).forEach((r) => {
        const data = cellToISO(r[ci.d]), v = parseMoney(r[ci.v]);
        if (!data || !(v > 0)) return;
        const tipo = tipoDe(r[ci.t]), descricao = String(r[ci.ds] ?? "").trim();
        let categoria = String(r[ci.c] ?? "").trim();
        if (!categoria) categoria = tipo === "Reserva" ? "Reserva de emergência" : guessCat(descricao, tipo);
        // Em "Guardado", a coluna de forma diz o movimento: vazio = guardou, "Retirada" = retirou.
        const forma = tipo === "Despesa" ? (FORMAS.find((f) => norm(f) === norm(r[ci.f])) || "")
          : tipo === "Reserva" && norm(r[ci.f]).startsWith("retir") ? RETIRADA : "";
        const cartao = ci.k >= 0 ? String(r[ci.k] ?? "").trim() : "";
        const parcelas = ci.p >= 0 ? Math.min(48, Math.max(1, Math.round(Number(r[ci.p])) || 1)) : 1;
        out.lancamentos.push({ data, descricao, tipo, categoria, forma, valor: round2(v), cartao, parcelas });
      });
    }
  }

  const K = sheet("Meus Cartões");
  if (K) {
    const h = findHeader(K, ["cartao", "fecha", "vence"]);
    if (h >= 0) {
      const H = K[h], ci = { n: col(H, "cartao"), f: col(H, "fecha"), v: col(H, "vence"), a: col(H, "ativo") };
      const dia = (x) => Math.round(Number(x));
      K.slice(h + 1).forEach((r) => {
        const nome = String(r[ci.n] ?? "").trim(), fechamento = dia(r[ci.f]), vencimento = dia(r[ci.v]);
        if (!nome || !(fechamento >= 1 && fechamento <= 31) || !(vencimento >= 1 && vencimento <= 31)) return;
        out.cartoes.push({ nome, fechamento, vencimento, ativo: ci.a < 0 || norm(r[ci.a]) !== "nao" });
      });
    }
  }

  const F = sheet("Gastos Fixos");
  if (F) {
    const h = findHeader(F, ["descri", "valor"]);
    if (h >= 0) {
      const H = F[h], ci = { ds: col(H, "descri"), c: col(H, "categ"), d: col(H, "dia"), v: col(H, "valor"), a: col(H, "ativo"), f: col(H, "forma"), k: col(H, "cartao") };
      const mcols = MES3.map((m) => H.findIndex((c) => norm(c) === norm(m)));
      F.slice(h + 1).forEach((r) => {
        const descricao = String(r[ci.ds] ?? "").trim(), v = parseMoney(r[ci.v]);
        if (!descricao || !(v > 0) || norm(descricao).startsWith("total")) return;
        out.fixos.push({
          tipo: "Despesa", descricao, categoria: String(r[ci.c] ?? "").trim() || guessCat(descricao, "Despesa"),
          dia: Math.min(31, Math.max(1, Number(r[ci.d]) || 1)), valor: round2(v),
          ativo: ci.a < 0 || norm(r[ci.a]) !== "nao",
          forma: FORMAS.find((f) => norm(f) === norm(r[ci.f])) || "",
          mesesPagos: mcols.map((ix, i) => (ix >= 0 && norm(r[ix]) === "pago" ? i + 1 : null)).filter(Boolean),
          cartao: ci.k >= 0 ? String(r[ci.k] ?? "").trim() : "",
          ...leRepete(H, r),
        });
      });
    }
  }

  const E = sheet("Entradas Fixas");
  if (E) {
    const h = findHeader(E, ["descri", "valor"]);
    if (h >= 0) {
      const H = E[h], ci = { ds: col(H, "descri"), c: col(H, "categ"), d: col(H, "dia"), v: col(H, "valor"), a: col(H, "ativ") };
      E.slice(h + 1).forEach((r) => {
        const descricao = String(r[ci.ds] ?? "").trim(), v = parseMoney(r[ci.v]);
        if (!descricao || !(v > 0) || norm(descricao).startsWith("total")) return;
        out.fixos.push({ tipo: "Receita", descricao, categoria: String(r[ci.c] ?? "").trim() || guessCat(descricao, "Receita"),
          dia: Math.min(31, Math.max(1, Number(r[ci.d]) || 1)), valor: round2(v), ativo: ci.a < 0 || norm(r[ci.a]) !== "nao", forma: "", mesesPagos: [], ...leRepete(H, r) });
      });
    }
  }

  const C = sheet("Cartões");
  if (C) {
    const h = findHeader(C, ["cartao", "venc"]);
    if (h >= 0) {
      const H = C[h], ci = { n: col(H, "cartao"), d: col(H, "venc"), v: col(H, "valor"), s: col(H, "status"), o: col(H, "origem") };
      C.slice(h + 1).forEach((r) => {
        const vencimento = cellToISO(r[ci.d]), v = parseMoney(r[ci.v]), cartao = String(r[ci.n] ?? "").trim();
        if (!cartao || !vencimento || !(v > 0)) return;
        if (ci.o >= 0 && norm(r[ci.o]).startsWith("calcul")) return;   // o app refaz as faturas calculadas a partir das compras
        out.faturas.push({ cartao, vencimento, valor: round2(v), status: norm(r[ci.s]) === "paga" ? "Paga" : "Aberta" });
      });
    }
  }

  if (!L) { // planilha antiga, formato livre
    for (const name of wb.SheetNames) {
      const R = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: null });
      const h = findHeader(R, ["dia"]);
      if (h < 0) continue;
      const H = R[h], dI = col(H, "dia"), tI = H.findIndex((c) => /receita|despesa|descri/.test(norm(c))), vI = col(H, "valor");
      if (tI < 0 || vI < 0) continue;
      out.formato = "antigo";
      let cur = null;
      R.slice(h + 1).forEach((r) => {
        const d = cellToISO(r[dI]); if (d) cur = d;
        const descricao = String(r[tI] ?? "").trim(), v = parseMoney(r[vI]);
        if (!descricao || !isFinite(v) || v === 0 || !cur) return;
        const tipo = v > 0 ? "Receita" : "Despesa";
        out.lancamentos.push({ data: cur, descricao, tipo, categoria: guessCat(descricao, tipo), forma: "", valor: Math.abs(round2(v)) });
      });
      break;
    }
  }
  return out;
}

/** Monta a planilha para download, no mesmo formato do modelo. */
export function buildWorkbook(XLSX, st, ano, calcMes, hoje) {
  const br = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
  const cartoes = st.cartoes || [], nomeK = (id) => cartoes.find((k) => k.id === id)?.nome || "";
  const L = [["Data", "Descrição", "Tipo", "Categoria", "Forma de pagamento", "Valor (R$)", "Cartão", "Parcelas"]];
  [...st.lancamentos].sort((a, b) => a.data.localeCompare(b.data))
    .forEach((x) => L.push([br(x.data), x.descricao, tipoParaPlanilha(x.tipo), x.categoria, x.forma, x.valor, nomeK(x.cartao_id), nomeK(x.cartao_id) ? Number(x.parcelas) || 1 : ""]));
  const pagos = new Set(st.pagos.map((p) => p.fixo_id + "|" + mKey(p.mes)));
  const F = [["Descrição", "Categoria", "Dia do vencimento", "Valor (R$)", "Ativo?", "Forma de pagamento", ...MES3, "Repete", "Dia da semana", "Cartão"]];
  const ativo = (f) => (f.ate && mKey(f.ate) < mKey(hoje) ? "Não" : "Sim");
  const rep = (f) => (f.repete === "semanal" ? ["Semanal", DIAS_SEMANA[Number(f.dia_semana)]] : ["Mensal", ""]);
  const E = [["Descrição", "Categoria", "Dia do recebimento", "Valor (R$)", "Ativa?", "Repete", "Dia da semana"]];
  st.fixos.filter((f) => f.tipo === "Receita").forEach((f) => E.push([f.descricao, f.categoria, f.repete === "semanal" ? "" : f.dia, f.valor, ativo(f), ...rep(f)]));
  // A grade de meses "Pago" vale para os mensais; os semanais são pagos por semana, dentro do app.
  st.fixos.filter((f) => f.tipo !== "Receita").forEach((f) => F.push([f.descricao, f.categoria, f.repete === "semanal" ? "" : f.dia, f.valor, ativo(f), f.forma,
    ...MES3.map((_, i) => (f.repete !== "semanal" && pagos.has(`${f.id}|${ano}-${pad(i + 1)}`) ? "Pago" : "")), ...rep(f), nomeK(f.cartao_id)]));
  // Faturas: as lançadas à mão (todas) e as calculadas do ano. As calculadas vão só para consulta: na importação o app as refaz.
  const C = [["Cartão", "Vencimento", "Valor da fatura (R$)", "Status", "Origem"]];
  st.faturas.filter((c) => !c.cartao_id).forEach((c) => C.push([c.cartao, br(c.vencimento), c.valor, c.status, "Lançada à mão"]));
  MES3.forEach((_, i) => faturasDoMes(st, `${ano}-${pad(i + 1)}`).filter((c) => c.auto)
    .forEach((c) => C.push([c.cartao, br(c.vencimento), c.valor, c.status, c.valor_fixo ? "Calculada pelo app (valor corrigido)" : "Calculada pelo app"])));
  const K = [["Cartão", "Fecha no dia", "Vence no dia", "Ativo?"]];
  cartoes.forEach((k) => K.push([k.nome, k.fechamento, k.vencimento, k.ativo === false ? "Não" : "Sim"]));
  const R = [["Mês", "Entradas", "Gastos do dia a dia (fora do cartão)", "Gastos fixos (fora do cartão)", "Faturas de cartão", "Custo do mês", "Guardado no mês", "Saldo"]];
  MES3.forEach((nome, i) => {
    const c = calcMes(st, `${ano}-${pad(i + 1)}`, hoje);
    R.push([`${nome}/${ano}`, c.rec, c.vari, c.fxCusto, c.fatT, c.custo, c.res, c.saldo]);
  });
  const wb = XLSX.utils.book_new();
  const add = (rows, name, w) => { const ws = XLSX.utils.aoa_to_sheet(rows); ws["!cols"] = w.map((x) => ({ wch: x })); XLSX.utils.book_append_sheet(wb, ws, name); };
  add(R, "Resumo", [12, 14, 30, 26, 18, 14, 18, 14]);
  add(L, "Lançamentos", [12, 30, 10, 24, 20, 12, 18, 9]);
  add(F, "Gastos Fixos", [26, 24, 10, 16, 8, 18, ...MES3.map(() => 6), 10, 16, 18]);
  add(E, "Entradas Fixas", [26, 24, 12, 16, 8, 10, 16]);
  add(C, "Cartões", [20, 12, 18, 10, 30]);
  add(K, "Meus Cartões", [20, 12, 12, 8]);
  return wb;
}
