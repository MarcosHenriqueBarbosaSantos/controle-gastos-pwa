# Limite do cartão e aviso antes de a fatura fechar

Desenho curto, aprovado na conversa de 03/11/2026.

## Por que

Quem usa cartão de crédito só descobre o tamanho da fatura quando ela chega. Isso vira dívida e desânimo, e a pessoa larga o app.
A ideia do dono é avisar antes: mostrar quanto do limite ainda está livre e quanto a fatura já soma, com tempo para segurar os gastos.

## Objetivos

- Cada cartão pode ter um limite. O app mostra quanto está livre, por exemplo: "Nubank: R$ 1.240 livres de R$ 3.000".
- Ao lançar uma compra no cartão, a pessoa vê quanto vai sobrar de limite.
- Cinco dias antes de cada fatura fechar, a pessoa recebe: "Sua fatura do Nubank está em R$ 870 e fecha em 5 dias". O aviso aparece no app, por notificação no celular e por e-mail.
- Quando o uso passar de 80% do limite, chega um alerta. Ele vai uma vez por fatura, por cartão.

## Fora do escopo

- Ligar ao banco ou buscar o limite real do cartão. O limite é digitado pela pessoa.
- Mudar o banco de dados. O limite fica nas preferências, que o app e o servidor de avisos já leem.
- Um dia fixo para todos os cartões, como o dia 20. Cada cartão fecha num dia, e o aviso segue esse dia.

## O que não pode acontecer

- Aviso repetido no mesmo ciclo da fatura, para o mesmo cartão.
- Limite livre errado ao marcar a fatura como paga. O limite pago volta a ficar livre.
- Cartão sem limite cadastrado mostrando "R$ 0 livres". Sem limite, o app não mostra o limite livre nem manda o alerta de 80%, mas o aviso da fatura continua.

## Jeitos considerados

1. **Só no app:** o aviso aparece quando a pessoa abre o app. É rápido, mas não alcança quem parou de abrir.
2. **App e aviso no celular (escolhido):** o aviso também vai por notificação e e-mail pela rotina diária do servidor de avisos. Exige republicar a função `avisos` no Supabase.
3. **Coluna `limite` na tabela `cartoes`:** foi descartado. Exige mudança no banco e não traz ganho sobre guardar nas preferências.

## Como funciona

- **Onde fica o limite:** `prefs.limiteCartao = { [cartao_id]: valor }`. Na conta de casal, essa chave entra em `COMUM_DO_CASAL`, porque o cartão é dos dois.
- **Limite livre:** limite − (faturas desse cartão ainda não pagas, até a próxima a fechar) − (parcelas de compras que caem em faturas seguintes).
  - As contas fixas lançadas no cartão contam só na fatura em aberto, e não nos meses futuros.
- **Fatura que vai fechar:** é a fatura do cartão cujo fechamento é o próximo, a partir de hoje. O valor dela é o mesmo que o app já calcula, inclusive o corrigido à mão.
- **Cálculo puro:** a conta fica em `js/calc.js`, com testes. O servidor recebe a mesma conta pelo `gera-regras.mjs`, como as outras regras.
- **Onde aparece no app:**
  - na aba Cartões, com o campo do limite e o limite livre;
  - no formulário de lançar, quando o cartão é escolhido: "Depois desta compra, R$ X livres";
  - no Início, em um cartão discreto nos 5 dias antes de cada fatura fechar.
- **Servidor:** a rotina diária (`avisaUsuario`) ganha o aviso da fatura e o alerta de 80%. Os dois são anotados em `avisos_enviados` com a marca do cartão e do mês da fatura, para não repetir.
- **Publicação:**
  - **Parte do app:** vai ao ar primeiro, numa versão normal.
  - **Parte do servidor:** depende de republicar a função `avisos`. O dono entra no painel do Supabase, e o Claude guia. O Claude não digita senha nem token.

## Decisões do Claude (para conferir)

- O aviso vai 5 dias antes do fechamento. Se o fechamento for em menos de 5 dias a partir do cadastro, ele vai no primeiro dia possível.
- O alerta de uso começa em 80% do limite.
- O limite é opcional. O campo fica vazio até a pessoa preencher.
