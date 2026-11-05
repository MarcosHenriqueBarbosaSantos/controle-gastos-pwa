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
