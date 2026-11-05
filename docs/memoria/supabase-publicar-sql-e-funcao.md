---
name: supabase-publicar-sql-e-funcao
description: "Como aplicar SQL e republicar a função avisos no Supabase pelo painel do navegador do app, quando o usuário já entrou"
metadata:
  node_type: memory
  type: reference
  originSessionId: 3fbc7daa-79bd-40f9-b326-3dbf73e85d65
  modified: 2026-11-04T07:06:34.249Z
---

Projeto Supabase do app: ref `ebaivarzdqekmhnyrwxo` ("Planilha de gastos"). O usuário entra no painel pelo navegador do app; Claude nunca digita senha.

- **SQL**: abrir `/dashboard/project/<ref>/sql/new`, pôr o texto com `window.monaco.editor.getModels()[0].setValue(...)` (digitar bagunça por causa do auto-fechar), clicar Run. O aviso "destructive" aparece por causa de `revoke`; confirmar só depois de ler o SQL.
- **Função avisos** (5 arquivos: index.ts, handler.js, mensagem.js, regras.js, webpush.js): em `/functions/avisos/code` só o arquivo aberto tem modelo no Monaco. Clicar no arquivo, calcular o hash do texto (djb2) e comparar com o do git (commit antigo) antes de mexer; aplicar só as diferenças (hunks de `git diff -U0`) e conferir o hash final igual ao local; depois "Deploy updates" e confirmar.
- **Conferir no ar**: `GET https://<ref>.supabase.co/functions/v1/avisos?autoteste=1` devolve `assinatura`. Ela só bate com `assinatura()` local se tirar os `\r` (os arquivos do Windows têm CRLF; o servidor usa LF).
- Os arquivos locais da função têm CRLF: editar com script que normaliza e devolve CRLF.

**Why:** a função não tem CLI nem token disponíveis; o painel foi o caminho que funcionou (v221, nov/2026). **How to apply:** só publicar com ok explícito do usuário, pois a função manda e-mail e notificação a todos os usuários.
