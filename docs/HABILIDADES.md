# Habilidades (skills e plugins) por etapa

Para quem continuar o app e o site em outra conversa. Os já instalados nesta máquina estão marcados com **instalado**. Os outros precisam ser ativados pela pessoa dona (no Claude, em plugins). Nada aqui foi publicado nem muda o app sozinho.

## Já instalados (usar direto)
| Etapa | Habilidade | Para que serve neste projeto |
|---|---|---|
| Visual e design | `refero-design` (instalado) | Pesquisar telas e estilos de apps reais antes de redesenhar uma tela |
| Visual e design | `ui-ux-pro-max` (instalado) | Paletas, fontes e regras de usabilidade |
| Revisão do celular | `web-design-guidelines` (instalado) | Auditar `index.html`, `css/` e `js/` com foco em celular |
| Teste de tela | `webapp-testing` (instalado) | Rodar o app com Playwright, tirar prints e ler erros do console |
| Banco | `supabase-postgres-best-practices` (instalado) | Escrever SQL, regras de acesso (RLS) e migrações com segurança |
| Divulgação | `anthropic-skills:pptx`, `hyperframes`, `higgsfield-generate` (instalados) | Apresentações, vídeos curtos e imagens para influenciadores (usar só depois de a Hotmart estar provada) |
| Código | `code-review`, `simplify`, `security-review` (instalados) | Revisar a rodada antes de publicar |

## Recomendados (ativar quando precisar)
| Etapa | Plugin (diretório Anthropic) | Para que serve |
|---|---|---|
| Design e acessibilidade | **Design** (Anthropic): crítica de design, revisão de acessibilidade, textos do app, entrega | Revisar cada tela e os textos; checar contraste e tamanho de toque |
| Textos e jornada | **design-skills** (comunidade): UX writing, mapa de jornada, interação | Deixar as frases claras e a jornada do motorista fácil |
| Servidor e banco | **Backend Design** (comunidade): migrações seguras, segurança, desempenho, testes | Cuidar do Supabase e da função `avisos` |
| Teste em celular real | **Testing** (Kobiton, parceiro): roda o app em vários aparelhos | Conferir Android e iPhone de verdade (hoje não há teste em iPhone) |
| Sistema de design | **Mobile Design System** (comunidade) | Guia único de componentes, se o app crescer |

## Como usar em uma nova conversa
1. Abra a pasta do projeto: o arquivo `CLAUDE.md` é lido sozinho.
2. Cole: "Leia CLAUDE.md e docs/HABILIDADES.md e continue de onde parou."
3. Para uma tela, peça: "Use `refero-design` para pesquisar e `web-design-guidelines` para auditar a tela X, e `webapp-testing` para testar."

## Habilidades de fora do Claude (GitHub), verificadas em 05/11/2026
Os números de estrelas vêm da página de cada repositório no dia da consulta. Nada abaixo foi instalado: instalar baixa código de fora, então a pessoa dona aprova antes. Prefira sempre instalar só por projeto e ler o `SKILL.md` antes.

| Etapa | Habilidade | Fonte | Estrelas e licença | Instalar | Para que serve no Meus Gastos |
|---|---|---|---|---|---|
| Design de telas (front-end) | **Impeccable** | github.com/pbakaus/impeccable | ~104 mil, Apache-2.0 | `npx impeccable install` e depois `/impeccable init` | 24 comandos: `critique` (nota de UX), `audit` (qualidade técnica), `polish`, `adapt` (celular), `clarify` (textos), `harden`, `typeset`, `layout`. Detector sem IA: `npx impeccable detect` acha 62 padrões de "cara de IA" |
| Auditoria de interface | **web-design-guidelines** (já instalado) | github.com/vercel-labs/agent-skills | ~34 mil, MIT | já instalado | 100+ regras de acessibilidade, desempenho e UX; foi o que usei na v237 |
| Padrões de componentes | **composition-patterns**, **react-native-guidelines** | github.com/vercel-labs/agent-skills | idem | `npx skills add vercel-labs/agent-skills` | Só valem se o app um dia virar React ou React Native; hoje o app é JavaScript puro |
| Skills oficiais da Anthropic | **anthropics/skills** (`webapp-testing`, documentos, design) | github.com/anthropics/skills | ~188 mil, Apache-2.0 (documentos são "source-available") | `/plugin marketplace add anthropics/skills` | Teste de tela com Playwright e criação de arquivos; veja a pasta `skills/` para o `frontend-design` |
| Acessibilidade (WCAG) | **axe-core** (+ `@axe-core/playwright`, já instalado no projeto; roda com `node scripts/axe-telas.mjs`) | github.com/dequelabs/axe-core | ~7,8 mil, MPL-2.0 | `npm i -D @axe-core/playwright` | Acha cerca de 57% dos problemas de acessibilidade sozinho, dentro do teste de tela |
| Desempenho | **Lighthouse CI** | github.com/GoogleChrome/lighthouse-ci | não consultado | `npm i -D @lhci/cli` | Nota de desempenho e PWA a cada publicação (o app já foi medido na mão antes) |
| Teste de tela | **Playwright** | github.com/microsoft/playwright | não consultado | já usado nos testes manuais | Base para a suíte de teste de tela que ainda não existe |

### Ordem sugerida (rápida, sem risco)
1. `npx impeccable detect` na pasta do app (só lê e mostra, não muda nada).
2. Ligar `@axe-core/playwright` nos testes de tela para as telas Início, Extrato, Lançar e Jornada.
3. Se a pessoa aprovar, instalar o Impeccable e rodar `critique` e `adapt` nas telas do celular.

### Cuidados
- **Hooks:** o Impeccable pode instalar um "design hook" que roda sozinho ao editar arquivos. Pergunte antes de aceitar.
- **Licenças:** Apache-2.0, MIT e MPL-2.0 permitem uso comercial; as skills de documentos da Anthropic têm termos próprios.
- **Números:** as estrelas mudam; confirme na página antes de citar.
