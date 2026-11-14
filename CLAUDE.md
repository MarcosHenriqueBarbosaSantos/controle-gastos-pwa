# Meus Gastos: guia para quem continuar o app e o site

Leia este arquivo primeiro. Ele resume o projeto, como trabalhar com a pessoa dona e como publicar. A lista de habilidades (skills e plugins) por etapa está em [docs/HABILIDADES.md](docs/HABILIDADES.md). A memória do trabalho anterior está em [docs/memoria/](docs/memoria/).

## O que é
App de controle de gastos (PWA, JavaScript puro, sem framework) com um **modo motorista de aplicativo** (Uber, 99, inDrive). Site de venda em `site/`. Domínio: meugastos.com.br. Hospedagem: GitHub Pages (a `main` é o site no ar). Banco e avisos: Supabase (projeto `ebaivarzdqekmhnyrwxo`). Venda: Hotmart (R$ 89 por ano, até 3x sem juros).

## Onde está cada coisa
- `js/app.js` (telas e eventos, ~9 mil linhas), `js/calc.js` (contas puras do mês), `js/motorista.js` (contas puras do motorista), `js/voz.js` (falar para lançar), `js/uso.js` (medição de uso sem dado pessoal), `js/novidades.js` (texto da tela Novidades), `js/config.js` (`APP_VERSAO`).
- `css/style.css` e `css/tech.css`, `index.html`, `sw.js` (cache offline, `VERSAO`), `manifest.webmanifest`.
- `supabase/` (SQL e a função `avisos`; `regras.js` da função é gerado de `calc.js` com `node supabase/functions/avisos/gera-regras.mjs`).
- `tests/` (um arquivo por assunto), `scripts/validar.mjs`, `docs/PUBLICAR.md`.

## Regras da pessoa dona (valem sempre)
1. **Publicar só depois de um "sim" explícito** ("Sim, publicar"). Fim de cada rodada: relatório em linguagem simples e a pergunta "Posso publicar a vNNN?".
2. **Perguntar antes** de preço, Hotmart, função grande nova, mudança no banco e apagar coisas.
3. **Nunca digitar senha ou credencial.** A pessoa entra nos painéis; você só opera depois.
4. **Cores do app e do site mudam sempre juntas** (azul neon: fundo `#060e1d`, destaque `#5fd4ff`).
5. **Ideias novas devem ser da tela mexida na rodada**, não soltas.
6. **Texto simples, para quem não é técnico.** Número que aparece em duas telas tem que bater. Se uma frase pode ser lida de dois jeitos, reescreva.
7. "Ajustar antes" sem detalhe = mais melhorias da mesma tela; se repetir, diga que não vê mais nada certo e peça uma frase.
8. **Hotmart:** a compra real e a comissão de afiliado nunca foram provadas. Não divulgue o link de parceiro (40% na primeira venda) antes disso.

## Como trabalhar
- `npm test` roda os testes (devem passar todos). `npm run validar` é a trava antes de publicar.
- Teste na tela: `npx serve -l 5180 .` e Playwright com `channel: "msedge"`, viewport 390x844. Demonstrações: `#demo` (geral) e `#motorista`. Congele a data com `page.clock.install({ time: new Date("2026-11-04T10:00:00") })`. Use `evaluate` para clicar em botões escondidos ou sobrepostos. Ids do menu de baixo: `inicio`, `l` (Extrato), `mais` (Lançar), `mot` (Jornada) ou `m` (Planejar), `menu` (Mais).
- Acessibilidade das telas: com o servidor local no ar, `node scripts/axe-telas.mjs "#motorista"` (ou `"#demo"`) roda o axe-core em Início, Extrato, Jornada, Mais e Lançar e lista os problemas. Na v243 não restava nenhum grave ou sério, só avisos menores.
- Contas novas vão em `calc.js` ou `motorista.js` (puras) com teste em `tests/`. A tela só monta o texto.
- Para scripts que editam arquivos com texto cheio de barras invertidas, escreva o script com a ferramenta de escrever arquivo, não com heredoc no terminal: o terminal pode trocar `\\n` por uma quebra de linha de verdade.
- Os arquivos da função `avisos` têm CRLF no Windows; normalize antes de comparar com o servidor.

## Como publicar (versão NNN)
1. Aumente `APP_VERSAO` em `js/config.js` e `VERSAO` em `sw.js` (`meus-gastos-vNNN`), e some uma linha em `js/novidades.js`. Módulo novo em `js/` entra na lista de `sw.js`.
2. `npm test` e `npm run validar`.
3. `git add` dos arquivos, commit com mensagem `vNNN: o que mudou` e `git push origin HEAD:main`. A trava `.githooks/pre-push` valida (ative com `git config core.hooksPath .githooks`). Se o git não tiver identidade: `git -c user.name=Claude -c user.email=noreply@anthropic.com commit ...`.
4. Confirme no ar: `curl -s https://meugastos.com.br/sw.js | grep VERSAO` mostra a versão nova (pode levar alguns minutos).
5. Banco ou função `avisos`: ver [docs/memoria/supabase-publicar-sql-e-funcao.md](docs/memoria/supabase-publicar-sql-e-funcao.md). A pessoa clica em Run e Deploy; o sistema de segurança bloqueia isso para o assistente.

## Estado ao passar o bastão (v243 no ar)
- No ar até a v235: ganho por app com soma, km rodado contra o mínimo por km, barra de baixo visível com a jornada rodando, botão Pausar claro, topo do Início motorista por janelas de dias.
- Publicado na v236: topo do Início em 4 passos (o que você tem, o que vence, quanto por dia, o que sobra) para o motorista e para quem tem salário; Jornada com duas abas durante a jornada (Em andamento e Resumo e meta); abastecer não aumenta mais a meta (`ajusteDoVeiculo` em `js/motorista.js`); bloco "Como a sua meta é montada".
- Pendências: compra real na Hotmart e comissão de afiliado; refazer as imagens do kit de divulgação em azul; apresentação para influenciadores (Slides, 14 slides) e imagens das telas em `divulgacao-influenciadores/telas/`; revisão de coerência de textos em todas as abas; iPhone, tema claro, fonte grande e voz ainda sem teste; Cloudflare na frente do domínio; suíte de testes de tela (Playwright) ainda não existe; dividir `app.js`.
- v245 (14/11): app abre no Início; Jornada pausa pelo círculo e encerra sem formulário (ganhos depois, em Ganhos); Conversa do desafio. **Pendente:** rodar `supabase/desafio-chat.sql` no Supabase para a conversa funcionar fora da demonstração.
- A fonte da verdade do plano até o dia 15 é `divulgacao-influenciadores/plano-ate-dia-15.md`.
