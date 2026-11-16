# Painel do Meus Gastos

Um lugar só para saber **onde paramos, o que falta e quem faz o quê**. Atualizado em 14/11/2026, com a **v253** no ar.

Como usar: abra este arquivo no começo de cada dia. Quando terminar um item, troque `[ ]` por `[x]`. Quando o Claude terminar uma rodada, ele atualiza a parte "Onde paramos".

---

## 1. Onde paramos

- **No ar:** v253 em meugastos.com.br. Site de venda em meugastos.com.br/site/.
- **Últimas mudanças (14/11):**
  - O app abre no Início.
  - Jornada: o círculo pausa e continua, e encerrar não pede formulário. Os ganhos são lançados depois.
  - Conversa do desafio, com ditar pelo microfone e ouvir as mensagens novas em voz alta.
  - Início mais curto e com lançar em um toque.
  - Contas com "Lembrar amanhã" e "Não pagar este mês".
  - Escanear explicado com exemplos.
  - No Mais, as ferramentas ficam juntas em Ferramentas.
  - v249 e v250: Início sem vão e um aviso por vez; "Faltam os ganhos de ontem" no motorista; Ferramentas no Mais; primeiros passos sem travar; lançar só com valor e categoria na frente; corrigido um erro ao tocar em "Ontem".
  - v251: Início do motorista com Iniciar jornada em primeiro, conta da meta recolhida, sem atrasadas repetidas, uma dica do carro por vez e Compartilhar minha semana.
  - v252: testes de tela automáticos (`npm run telas`, 17 verificações) que abrem o app e fazem os caminhos de todo dia; os números do Início, do Planejar e da Jornada batem.
  - v253: caixas de aviso legíveis na Jornada no tema claro; testes de tela agora são 21 (Contas fixas, Cartões, Ganhos e tema claro incluídos).
  - v254 (pronta, falta publicar): menu de baixo com Mercado (Mais no topo); Extrato em partes (Meus, Casal, Contas fixas); categoria e km do painel só uma vez; aviso de troca de óleo; Desafio mais colorido; a Conversa do desafio saiu do app.js para js/chat.js.
  - v260 (16/11, pronta, falta publicar): pedido do dono. Jornada parada em duas abas (Começar enxuta com Iniciar no alto e quadradinhos; Resumo e meta com o resto); Mais opções em caixas grandes (2 por linha no celular, 3 no tablet); botão de folga legível; quadradinhos com nome mais escuro.
  - v259 (15/11, publicada): Lançar por prints (js/prints.js): vários prints de uma vez, tablet com apps lado a lado dividido em partes, dia/app/valor/km/pedidos lidos, lembra o app de cada lado, não repete o que já foi lançado; também pelo Compartilhar. Testado com os prints reais do dono (Uber R$ 61,18; R$ 129,03 com 61,7 km e 4 pedidos; R$ 57,10). Plano do app Android com bolinha em docs/plano-android-bolinha.md. Etapa 1 feita no ramo `android` (pasta android/, o GitHub monta o APK e publica em Releases como bolinha-teste-N): falta o dono instalar no tablet e ver se o print sai normal ou preto na Uber, 99 e inDrive.
  - v258 (15/11, publicada): pedido do dono pelo celular. Jornada com quadradinhos (Abastecer, Pedágio, Lançar outro dia, Mais); aviso "N dias desta semana sem ganho"; Lançar o dia mostra os dias que faltam e segue para o próximo depois de salvar (`diasSemGanho` em js/motorista.js); Mais opções em quadradinhos. Aviso de jornada esquecida (`jornadaEsquecida`: pausada 6h+ ou aberta 16h+) com Encerrar e lançar; horas prontas no Lançar o dia.
  - v257 (15/11, publicada): Resumo do ano do motorista (IR, MEI, contador) em js/anual.js, com PDF, planilha e WhatsApp; fotos do site refeitas no claro (script `node scripts/fotos-site.mjs`); site sem a promessa de importar extrato do cartão (está desligado no app desde a v159).
  - SQL de 15/11 aplicados pelo Claude: pago-por, desafio-chat, erros e otimizacao.
  - v256: tema claro de banco como padrão no app e no site (escuro em Ajustes); Jornada e Desafio claros; atalhos em quadradinhos; Extrato agrupado por dia com setinha; Recibo para cliente (corrida particular, no modelo do recibo que você já mandava) com envio pelo WhatsApp, em js/recibo.js.
- **Próxima rodada do Claude:** refazer as fotos de telas do site no visual claro; Mercado como tela própria, com ideias de outros apps de lista; foto do painel no fim do dia; continuar dividindo o app.js.

## 2. O que só você pode fazer (em ordem)

- [ ] **Testar a compra na Hotmart.** Compre pelo link `pay.hotmart.com/X108304792E` com outro e-mail. Confira se o acesso é liberado no app e peça o reembolso. É o risco número 1 antes de divulgar.
- [ ] **Testar o link de afiliado.** Com um afiliado de teste, confira se a venda aparece com a comissão de 40%.
- [ ] **Desativar o produto antigo** (link G107911431C) pelo suporte da Hotmart.
- [x] **Ligar o "Quem pagou?" das contas fixas (casal).** `supabase/pago-por.sql` aplicado pelo Claude em 15/11/2026.
- [x] **Ligar a Conversa do desafio.** `supabase/desafio-chat.sql` aplicado pelo Claude em 15/11/2026.
- [x] **Deixar o banco mais rápido.** `supabase/otimizacao.sql` aplicado em 15/11/2026 (e `erros.sql`, aviso de erros do app). Falta só, no painel: Authentication → ligar "Leaked password protection".
- [ ] **Proteção de senha vazada.** No Supabase: Authentication, Policies, ligar "Leaked password protection".
- [ ] **Testar no seu celular:** feche e abra o app, use a jornada, lance um gasto e marque uma conta paga. Anote o que estranhar.
- [ ] **Chamar o primeiro grupo:** de 5 a 10 motoristas, com o link da página e um desafio já criado.

## 3. Vendas e divulgação

- **Preço:** R$ 89 por ano, até 3x sem juros, com 7 dias grátis no app, sem cartão.
- **Afiliados:** 40% na primeira venda e 0% na renovação. Só divulgue o link de parceiro depois do teste de afiliado (item 2).
- **Canal principal:** orgânico, pelo grupo de motoristas, pelos desafios entre amigos e pela imagem do resultado do dia para compartilhar.
- **Mensagem principal:** "Saiba quanto você ganha por hora de verdade, depois do carro."
- **Pendências de material:**
  - [ ] Refazer as imagens do kit de divulgação em azul.
  - [ ] Gravar um vídeo de 30 segundos do dia real na jornada (com a conta de demonstração).
  - [ ] Apresentação para influenciadores (não está neste computador: foi feita em outra sessão; peça para refazer se precisar).

## 4. Métricas para olhar toda semana

O app já mede o uso sem dado pessoal. As consultas prontas estão em `supabase/uso-consultas.sql`: abra o Supabase, SQL Editor, cole uma consulta e clique em Run.

| O que medir | Por que importa | Meta para começar |
|---|---|---|
| Aparelhos que abriram o app por dia | Se o app está sendo usado | Crescer toda semana |
| Ativação: lançou ou iniciou jornada no 1º dia | Se a pessoa entendeu o app | 6 em cada 10 |
| Retorno no dia 1, no dia 3 e no dia 7 | Se virou hábito (é o que faz renovar) | 4 em cada 10 no dia 7 |
| Teste grátis que virou compra | Se a oferta convence | 2 em cada 10 |
| Telas mais abertas | O que manter na frente e o que esconder | Olhar todo domingo |

## 5. O que vale aprender (para depender menos)

1. **Painel do Supabase:** rodar um arquivo SQL e ver uma tabela. É só copiar, colar e clicar em Run.
2. **Painel da Hotmart:** vendas, reembolso, afiliados e cupom.
3. **Pedir mudanças ao Claude:** diga a tela, o que estranhou e o que esperava. Uma captura de tela vale mais que um parágrafo.
4. **Ler as métricas da seção 4** uma vez por semana.
5. **Gravar a tela do celular** para vídeos curtos de divulgação.

## 6. Como trazer ideias de motoristas parceiros

1. Anote a ideia nas palavras da pessoa, numa linha, na seção 7.
2. Cole a lista para o Claude no começo de uma rodada.
3. O Claude agrupa as ideias por tela, faz o que for simples e pergunta antes do que for função grande.

## 7. Ideias recebidas (anote aqui)

- 

## 8. Onde está cada coisa

| O quê | Onde |
|---|---|
| Este painel | `PAINEL.md` |
| Guia para o Claude continuar | `CLAUDE.md` |
| Skills instaladas e para que servem | `docs/HABILIDADES.md` |
| Como publicar uma versão | `docs/PUBLICAR.md` |
| Arquivos do banco (Supabase) | pasta `supabase/` |
| Consultas de métricas | `supabase/uso-consultas.sql` |
| Site de venda | pasta `site/` |
| Antes e depois do redesenho | pasta `docs/redesenho/` |
| Vídeos | pasta `videos/` |
| Material para influenciadores | ainda não está neste computador |
| Logo, personagem e vídeo antigo | pasta acima: `PROJETO APP MEUS GASTOS/` |
