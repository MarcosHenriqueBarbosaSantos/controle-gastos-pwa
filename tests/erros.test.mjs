import test from "node:test";
import assert from "node:assert/strict";
import { limpaTexto, vaiAvisar, montaErro, ligaCapturaDeErros } from "../js/erros.js";

test("tira e-mail, número longo e o que vem depois do ? do endereço", () => {
  assert.equal(limpaTexto("falhou para ana@exemplo.com.br", 100), "falhou para [e-mail]");
  assert.equal(limpaTexto("cpf 123.456.789-00 no cartão 4111 1111 1111 1111", 100), "cpf [número] no cartão [número]");
  assert.equal(limpaTexto("https://x.com/app.js?token=abc#frag", 100), "https://x.com/app.js?");
  assert.equal(limpaTexto("a".repeat(900), 500).length, 500);
});

test("ignora o barulho de extensão e de internet caindo", () => {
  assert.equal(vaiAvisar("ResizeObserver loop completed with undelivered notifications."), false);
  assert.equal(vaiAvisar("Script error."), false);
  assert.equal(vaiAvisar("TypeError: Failed to fetch"), false);
  assert.equal(vaiAvisar(""), false);
  assert.equal(vaiAvisar("Cannot read properties of undefined (reading 'valor')"), true);
});

test("monta a linha com o tamanho certo e sem dado pessoal", () => {
  const l = montaErro({ mensagem: "Erro com ana@x.com", pilha: "at app.js:10", versao: "141", tela: "mercado", navegador: "UA" });
  assert.deepEqual(l, { versao: "141", mensagem: "Erro com [e-mail]", pilha: "at app.js:10", tela: "mercado", navegador: "UA" });
  assert.equal(montaErro({ mensagem: "Script error." }), null);
});

test("manda cada erro uma vez e no máximo cinco por abertura", async () => {
  const ouvintes = {}, enviados = [];
  const janela = { addEventListener: (n, f) => (ouvintes[n] = f), navigator: { userAgent: "UA" } };
  ligaCapturaDeErros({ janela, versao: "141", envia: (l) => { enviados.push(l); return Promise.resolve(); }, limite: 5 });
  ouvintes.error({ message: "erro A" }); ouvintes.error({ message: "erro A" });
  for (let i = 0; i < 10; i++) ouvintes.unhandledrejection({ reason: new Error("outro " + i) });
  assert.equal(enviados.length, 5);
  assert.equal(enviados.filter((x) => x.mensagem === "erro A").length, 1);
});

test("se o servidor falhar, o app segue", () => {
  const ouvintes = {};
  ligaCapturaDeErros({ janela: { addEventListener: (n, f) => (ouvintes[n] = f) }, versao: "1", envia: () => { throw new Error("fora"); } });
  assert.doesNotThrow(() => ouvintes.error({ message: "erro B" }));
});
