# Meus Gastos — versão 55

Feita a partir da versão 54 do GitHub (a que está no ar). Os 239 testes automáticos passam (eram 229; entraram 10 novos).

## O que mudou para quem usa

**Início mais curto (celular).** O Início ficou só com o que se usa todo dia: Livre para gastar, os botões de lançar, as próximas contas e o Seu dia. Gráficos, categorias, últimos meses, limite, metas e os quadros de totais foram para a nova tela **Análise do mês**, que se abre pelo Planejar ou pelo botão no fim do Início. A rolagem do Início caiu de 5,4 telas para 2,4 na demonstração (de 13 para 7 blocos). No computador nada muda.

**Um nome só para cada coisa.**
- Extrato (antes também "Lançamentos")
- Contas fixas (antes também "Gastos fixos", inclusive nos vencimentos, avisos e relatório)
- Caixinhas (antes também "Dinheiro guardado")
- Planejar (antes também "Limites e metas" e "Limites")

**Lançar mais rápido.**
- Data em botões: Hoje, Ontem ou Outro dia (abre o calendário do aparelho).
- A forma de pagamento já vem marcada com a que a pessoa mais usou nos últimos 90 dias.
- Falar e Foto ou PDF viraram botões menores; o valor fica no centro.
- **Conferência de valor alto:** um gasto muito acima do costume (por exemplo 3890 em vez de 38,90) pede confirmação antes de lançar e oferece o valor corrigido num toque ("Era R$ 38,90").

**Primeira impressão.**
- Demonstração: o aviso amarelo virou uma faixa fina com "Criar conta" e "Recomeçar".
- Conta nova: no lugar dos vários "R$ 0", o topo mostra um convite para montar o mês.

**Defeitos corrigidos.**
- Tema claro: os ícones da tela Mais (e do quadro Instalar) estavam brancos em fundo branco.
- Botões e links pequenos ganharam área de toque maior, sem mudar o desenho.
- Nenhum texto do app tem mais letra menor que 12 px.

## Velocidade e segurança
- A biblioteca de planilhas (quase 1 MB) não é mais baixada toda vez que o app abre: só quando a pessoa gera o relatório ou importa um Excel. Passou para a versão 0.20.3, que corrige falhas de segurança da 0.18.5. Se o endereço oficial falhar, usa a cópia antiga.
- Site: fotos das telas refeitas com a versão nova e servidas em WebP (1,8 MB → 0,5 MB). Os PNG continuam lá para navegadores antigos e para a ficha de instalação.

## Ainda não refeito
- Fotos `tela-leitura`, `tela-comprovante`, `tela-detalhe`, `tela-lista`, `docs/telas-celular.png` e as imagens da Play Store (dependem da leitura por foto ou são de outras telas).

## Como publicar
1. No GitHub, apague as cópias soltas da pasta principal: `app.js`, `calc.js`, `config.js`, `excel.js`, `extrato.js`, `leitor.js`, `qr.js`, `store.js`, `style.css`, `medicao.js`, `privacidade.html`, `termos.html`, todos os `.sql` e todos os `.test.mjs` que estão fora das pastas. O app usa só os que estão dentro de `js`, `css`, `site`, `supabase` e `tests`.
2. Suba os arquivos deste pacote mantendo as pastas.
3. A função de avisos mudou só no texto (`supabase/functions/avisos/mensagem.js`); publique de novo a função `avisos` no Supabase para o e-mail usar o nome novo.
4. A versão do `sw.js` subiu para `meus-gastos-v55`: os celulares baixam a versão nova sozinhos.
