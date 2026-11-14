import test from "node:test";
import assert from "node:assert/strict";
import { erroDoChat, juntaMsgs } from "../js/chat.js";

test("erroDoChat traduz os erros do servidor para frases simples", () => {
  assert.equal(erroDoChat(new Error("devagar")), "Calma: espere uns segundos para mandar outra.");
  assert.equal(erroDoChat(new Error("fora_do_desafio")), "Você não está mais neste desafio.");
  assert.equal(erroDoChat(new Error("Could not find the function public.desafio_msgs")), "A conversa ainda não foi ligada no servidor.");
  assert.equal(erroDoChat(new Error("Failed to fetch")), "Não deu para falar com o servidor. Tente de novo.");
  assert.equal(erroDoChat(undefined), "Não deu para falar com o servidor. Tente de novo.");
});

test("juntaMsgs não repete mensagem e guarda só as mais recentes", () => {
  const a = [{ id: 1 }, { id: 2 }];
  assert.deepEqual(juntaMsgs(a, [{ id: 2 }, { id: 3 }]).map((m) => m.id), [1, 2, 3]);
  const muitas = Array.from({ length: 5 }, (_, i) => ({ id: i + 1 }));
  assert.deepEqual(juntaMsgs(muitas, [{ id: 6 }], 3).map((m) => m.id), [4, 5, 6]);
  assert.deepEqual(juntaMsgs([], []), []);
});
