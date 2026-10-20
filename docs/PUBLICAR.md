# Como publicar o Meus Gastos

Publicar é mandar para a `main`: o GitHub Pages atualiza o site na hora.

## Regra do momento: sem funções novas
Por enquanto o app **não ganha funções novas**. O trabalho é melhorar o que já existe: deixar mais fácil de usar, mais claro, mais rápido e mais acessível. Uma ideia nova só entra depois de a pessoa dona do app aprovar por escrito.

## Antes de publicar
1. `npm run validar` precisa terminar com "Validação ok: pode publicar". Ele roda os testes, confere se `APP_VERSAO` (js/config.js) e `VERSAO` (sw.js) são a mesma, checa a sintaxe de cada arquivo de js/ e se todo módulo está na lista offline do service worker.
2. A tela que mudou foi aberta no navegador (celular) e funcionou.
3. Existe a tag `antes-vNN` apontando para a versão que está no ar, para voltar atrás com `git revert`.

## A trava
`.githooks/pre-push` roda a validação sempre que algo vai para a `main`. Se falhar, o envio é cancelado. Ativar uma vez em cada computador:

    git config core.hooksPath .githooks

(O teste "regras do servidor" já falhava no Windows antes disso e é tolerado; no servidor Linux ele passa.)
