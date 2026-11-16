# Plano: Meus Gastos para Android com a bolinha que lê a tela

Escrito em 15/11/2026, a pedido do dono. É o "caminho A". O "caminho B" (Lançar por prints, v259) já está no app e resolve boa parte sem precisar disso.

## O que a pessoa vai ver
1. Instala o Meus Gastos pela Play Store (ou, no começo, por um arquivo APK enviado pelo dono).
2. Na primeira vez, o app pede duas licenças do Android: **aparecer sobre outros apps** (a bolinha) e **capturar a tela** (o print).
3. Uma bolinha azul do Meus Gastos fica no canto da tela, por cima da Uber, da 99 e do inDrive.
4. Na tela de ganhos de um app, a pessoa toca na bolinha: o Meus Gastos tira o print, lê o dia, o app e o valor, e mostra um cartão pequeno ("Uber, 11/11: R$ 61,18. Lançar?"). Um toque e está lançado.
5. Para lançar vários dias: troca o dia no app, toca na bolinha, troca de novo, toca de novo. No fim, abre o Meus Gastos e confere.

## Como é feito por dentro
- **Casca Android** (Capacitor, que abre o mesmo app de hoje dentro de um app instalado). Tudo o que já existe continua igual; a casca só soma o que o navegador não deixa.
- **Bolinha**: um serviço do Android com a licença "aparecer sobre outros apps" (SYSTEM_ALERT_WINDOW).
- **Print**: a licença de captura de tela do Android (MediaProjection), com serviço em primeiro plano do tipo "mediaProjection". No Android 14 ou mais novo, o próprio Android pede um "sim" a cada vez que a captura começa (por exemplo, uma vez por jornada). Não dá para evitar.
- **Leitura**: o leitor de texto do Google que roda no aparelho (ML Kit, sem internet), mais rápido e preciso que o de hoje. As contas que decidem dia, app e valor são as mesmas de `js/prints.js` (já testadas).
- O print é lido e descartado no aparelho. Nada é enviado.

## Riscos (o que pode dar errado)
1. **O app da Uber ou da 99 pode bloquear prints.** Alguns apps marcam a tela como "segura" e o print sai preto. Isso só se descobre testando no tablet. **É o primeiro teste a fazer**, antes de qualquer outra coisa.
2. **Revisão do Google**: apps que capturam a tela passam por revisão mais rígida. É preciso explicar o uso na ficha da loja e no formulário de segurança de dados, e atualizar a política de privacidade. Pode levar de dias a semanas e pedir ajustes.
3. **Só Android.** No iPhone a Apple não deixa nenhum app capturar a tela de outro.
4. **Teste só em aparelho de verdade.** Cada versão precisa ser instalada no tablet do dono para conferir.

## Etapas
| Etapa | O que | Quem | Tempo estimado |
|---|---|---|---|
| 1 | Prova rápida: APK só para o tablet do dono, com a bolinha e o print. Confere se Uber, 99 e inDrive deixam capturar. | Claude faz o APK; o dono instala e testa | 1 a 2 rodadas |
| 2 | Se o print funcionar: liga a leitura (ML Kit) e o cartão "Lançar?" | Claude; o dono testa | 2 a 3 rodadas |
| 3 | Conta de desenvolvedor no Google Play (taxa única de cerca de US$ 25) | O dono (pagamento e documentos são dele) | 1 dia a algumas semanas para aprovar |
| 4 | Ficha da loja, política de privacidade, formulário de dados, explicação da captura | Claude escreve; o dono revisa e envia | 1 rodada |
| 5 | Teste fechado na Play Store com alguns motoristas (o Google pede testadores antes de abrir para todos) | O dono convida | cerca de 2 semanas |
| 6 | Publicação aberta | O dono | depende da revisão |

## Antes de começar
- Provar a venda real na Hotmart (regra 8 do CLAUDE.md): não vale gastar com a loja antes disso.
- O dono precisa de um computador com o Android Studio (ou deixar Claude montar o APK por linha de comando, se o Java e o SDK do Android estiverem instalados).
- Decidir se a versão Android também é vendida pela Hotmart (o mesmo acesso de R$ 89 por ano) ou pela própria Play Store (a Google fica com uma parte).

## Primeiro passo quando o dono disser "sim"
Etapa 1: um APK de teste que só mostra a bolinha e tira um print da tela atual, para ver no tablet se a Uber, a 99 e o inDrive deixam.
