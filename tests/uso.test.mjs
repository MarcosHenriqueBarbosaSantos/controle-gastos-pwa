// Medição de uso do app: só o nome do que aconteceu, nunca dado pessoal.
import test from "node:test";
import assert from "node:assert/strict";
import { EVENTOS, codigoDoAparelho, limpaDados, montaEvento, criaMedidor, diasDeUso } from "../js/uso.js";

const armazem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };

test("o código do aparelho é aleatório, fica guardado e não tem relação com o login", () => {
  const a = armazem();
  const c1 = codigoDoAparelho(a, () => "abc12345-aparelho"), c2 = codigoDoAparelho(a, () => "outro-codigo-diferente");
  assert.equal(c1, "abc12345-aparelho"); assert.equal(c2, c1);   // o segundo pedido devolve o mesmo
  assert.equal(codigoDoAparelho({ getItem() { throw new Error("bloqueado"); } }), null);   // sem armazenamento: não mede
});

test("os dados do evento: só campos curtos, números e palavras simples; texto livre é descartado", () => {
  assert.deepEqual(limpaDados({ n: 3, aviso: "diario", fim: true, descricao: "Pix para João da Silva", email: "a@b.com", t: "inicio" }), { n: 3, aviso: "diario", fim: true, t: "inicio" });
  assert.deepEqual(limpaDados({ "Nome Grande": "x", ok: "a b" }), {});
  assert.deepEqual(limpaDados({ a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 }), { a: 1, b: 2, c: 3, d: 4, e: 5 });   // no máximo 5 campos
  assert.deepEqual(limpaDados(null), {});
});

test("só os eventos permitidos viram linha, com o perfil e a versão", () => {
  const base = { aparelho: "abc12345", versao: "233" };
  const l = montaEvento({ ...base, nome: "jornada_iniciada", perfil: "motorista", dados: { x: 1 } });
  assert.deepEqual(l, { dispositivo: "abc12345", nome: "jornada_iniciada", versao: "233", perfil: "motorista", dados: { x: 1 } });
  assert.equal(montaEvento({ ...base, nome: "senha_digitada" }), null);
  assert.equal(montaEvento({ nome: "aberto" }), null);   // sem código do aparelho
  assert.equal(montaEvento({ ...base, nome: "aberto", perfil: "qualquer" }).perfil, "geral");
  assert.ok(EVENTOS.every((e) => /^[a-z_]{2,40}$/.test(e)));   // o banco só aceita nomes assim
});

test("o medidor junta os eventos, manda de uma vez, respeita o desligado e para se o servidor recusar", async () => {
  const enviados = []; let ligado = true, falha = false, agendado = null;
  const m = criaMedidor({ envia: async (l) => { if (falha) throw new Error("recusou"); enviados.push(...l); }, ativo: () => ligado, aparelho: () => "abc12345", versao: "233", perfil: () => "motorista", agenda: (f) => { agendado = f; } });
  assert.equal(m.evento("aberto", { d: 0 }), true); assert.equal(m.evento("tela", { t: "jornada" }), true);
  assert.equal(m.evento("nome_invalido"), false);
  assert.equal(m.pendentes(), 2); assert.equal(enviados.length, 0);   // ainda não mandou: espera juntar
  await m.manda(); assert.deepEqual(enviados.map((x) => x.nome), ["aberto", "tela"]);
  ligado = false; assert.equal(m.evento("aberto"), false);              // a pessoa desligou em Ajustes (ou é a demonstração)
  ligado = true; falha = true; m.evento("lancamento", { n: 1 }); await m.manda();
  assert.equal(m.evento("lancamento"), false);                           // o servidor recusou: para de tentar nesta abertura
});

test("o medidor tem limite por abertura do app", () => {
  const m = criaMedidor({ envia: async () => {}, ativo: () => true, aparelho: () => "abc12345", versao: "233", perfil: () => "geral", limite: 3, agenda: () => {} });
  const r = [1, 2, 3, 4, 5].map(() => m.evento("tela", { t: "inicio" }));
  assert.deepEqual(r, [true, true, true, false, false]);
});

test("dias desde a primeira abertura", () => {
  const a = armazem();
  assert.equal(diasDeUso(a, "2026-11-05"), 0);
  assert.equal(diasDeUso(a, "2026-11-06"), 1);
  assert.equal(diasDeUso(a, "2026-11-12"), 7);
});
