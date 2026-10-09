# Publicar o Meus Gastos na Google Play

O GigU instala fácil porque **está na Play Store**. Ele não é um site: é um aplicativo
publicado na loja, e por isso o celular instala sem perguntar nada, inclusive em Xiaomi,
Redmi e Poco, onde o navegador às vezes não deixa instalar site nenhum.

O Meus Gastos pode ir para a loja **sem reescrever nada**. O aplicativo da loja é uma casca
fina do Android que abre o próprio `meugastos.com.br` em tela cheia, sem barra de endereço.
Isso se chama **Trusted Web Activity (TWA)**. Quem publica atualiza o site como sempre: o
app na loja acompanha, porque ele mostra o site. Só se mexe na loja quando muda o ícone, o
nome ou as telas da ficha.

| | Instalar pelo navegador (hoje) | Play Store (TWA) |
|---|---|---|
| Custo | zero | US$ 25, uma vez na vida |
| Atualizar | sobe o arquivo, pronto | sobe o arquivo, pronto |
| Xiaomi / Redmi / Poco | depende do navegador | sempre funciona |
| Confiança de quem baixa | "é um site" | "é um app de verdade" |
| Aparece em busca | não | sim, na loja |
| Notificação | só onde o navegador deixa | sempre |

Os dois caminhos convivem: quem chega pelo site continua instalando pelo navegador.

---

## O que precisa ter antes de começar

- [x] Site em HTTPS com domínio próprio — `meugastos.com.br`, já tem.
- [x] `manifest.webmanifest` com ícone 512 e ícone *maskable* — já tem.
- [x] Service worker — já tem (`sw.js`).
- [x] Página de privacidade pública — `site/privacidade.html`, já tem. A loja **exige** o link.
- [ ] Conta de desenvolvedor no Google Play — US$ 25, pagamento único.
- [ ] Node.js instalado no computador (versão 18 ou mais nova).
- [ ] Telas novas do app para a ficha da loja (as de `site/img/` são do desenho antigo).

---

## Passo 1 — Criar a conta de desenvolvedor

1. Entre em <https://play.google.com/console/signup> com a conta Google do app.
2. Escolha **Pessoal** (mais simples) ou **Organização** (precisa de CNPJ e de um número
   D-U-N-S, que demora semanas). Para começar, **Pessoal** resolve.
3. Pague os US$ 25. A aprovação costuma sair em algumas horas, às vezes em dois dias.

> **Atenção ao prazo:** contas **pessoais** criadas a partir de novembro de 2023 precisam de
> **12 pessoas testando o app por 14 dias seguidos** antes de a Google liberar a publicação
> aberta. Convide 12 conhecidos pelo e-mail deles na aba **Teste fechado** e deixe rodando
> duas semanas. Conta de **organização** não passa por isso. Planeje esses 14 dias.

---

## Passo 2 — Gerar o aplicativo com o Bubblewrap

O Bubblewrap é a ferramenta oficial do Google que transforma um PWA em app Android.

```bash
npm install -g @bubblewrap/cli

# Numa pasta nova, FORA da pasta do site (ex.: ~/meus-gastos-android):
mkdir ~/meus-gastos-android && cd ~/meus-gastos-android

bubblewrap init --manifest=https://meugastos.com.br/manifest.webmanifest
```

Na primeira vez ele baixa o Java e as ferramentas do Android (uns 700 MB) e pergunta se pode.
Diga sim. Depois ele faz as perguntas da tabela:

| Pergunta | O que responder |
|---|---|
| Domain | `meugastos.com.br` |
| URL path | `/` |
| Application name | `Meus Gastos` |
| Short name | `Meus Gastos` |
| Application ID | `br.com.meugastos.app` |
| Display mode | `standalone` |
| Status bar color | `#0b2545` |
| Splash screen color | `#f3f5f8` |
| Icon URL | `https://meugastos.com.br/icons/icon-512.png` |
| Maskable icon URL | `https://meugastos.com.br/icons/icon-maskable-512.png` |
| Include support for Play Billing | `No` |
| Key store / password | **anote e guarde** (veja o aviso abaixo) |

> **A chave de assinatura é insubstituível.** O arquivo `android.keystore` e as duas senhas
> que o Bubblewrap pedir são o que prova para a Google que a atualização vem de você.
> Perdeu, perdeu o app: não há como atualizar, só publicar outro do zero, com outro endereço
> na loja e sem os usuários. Guarde o arquivo e as senhas em dois lugares diferentes
> (gerenciador de senhas e um pendrive ou nuvem privada).

Depois monte o pacote:

```bash
bubblewrap build
```

Saem dois arquivos: **`app-release-bundle.aab`** (é esse que vai para a loja) e
`app-release-signed.apk` (serve para testar no celular por cabo ou mandar por WhatsApp).

---

## Passo 3 — Ligar o app ao site (`assetlinks.json`)

Sem esse passo, o app abre com a barra de endereço do navegador aparecendo em cima — fica
com cara de site, não de app. Com ele, abre em tela cheia.

1. Pegue a impressão digital da chave. O Bubblewrap mostra na tela ao final do `build`; se
   passou, rode:

   ```bash
   keytool -list -v -keystore ./android.keystore -alias android
   ```

   Copie a linha **SHA256** — os pares de letras e números separados por dois-pontos.

2. Abra `.well-known/assetlinks.json` **neste repositório** e troque o texto
   `TROQUE:POR:...` por essa impressão. O arquivo fica assim:

   ```json
   [
     {
       "relation": ["delegate_permission/common.handle_all_urls"],
       "target": {
         "namespace": "android_app",
         "package_name": "br.com.meugastos.app",
         "sha256_cert_fingerprints": ["A1:B2:C3:… (a sua linha SHA256)"]
       }
     }
   ]
   ```

3. Suba o arquivo. Confira abrindo
   <https://meugastos.com.br/.well-known/assetlinks.json> no navegador: tem de aparecer o
   JSON, não a página de erro. (O `.nojekyll` da raiz é o que faz o GitHub Pages servir
   pasta começando com ponto — ele já está lá, não apague.)

> **Importante:** quando a Google assina o app por você (o normal hoje, chama-se *Play App
> Signing*), a impressão que vale é **a da Google**, não a sua. Depois de enviar o `.aab`,
> vá no Play Console em **Versão › Configuração › Integridade do app › Certificado da chave
> de assinatura do app** e copie o **SHA-256** de lá. Se a sua e a da Google forem
> diferentes, deixe **as duas** na lista `sha256_cert_fingerprints` — assim funciona tanto o
> APK que você testa à mão quanto o da loja.

---

## Passo 4 — Preencher a ficha da loja

No Play Console, **Criar app**, e depois:

- **Nome:** `Meus Gastos` (até 30 letras).
- **Descrição curta** (80 letras): *Veja quanto sobra do seu mês, em um toque.*
- **Descrição completa:** aproveite o texto de `site/index.html`.
- **Ícone:** 512×512 PNG — `icons/icon-512.png`.
- **Imagem de destaque:** 1024×500 PNG — precisa criar.
- **Telas:** no mínimo 2, de 320 a 3840 px de lado. Tire do app novo, na tela do celular.
- **Política de privacidade:** `https://meugastos.com.br/site/privacidade.html`.
- **Categoria:** Finanças.
- **Classificação de conteúdo:** responda o questionário; um app de finanças sem conteúdo
  sensível sai como **Livre**.
- **Segurança dos dados:** declare o que o app guarda. No Meus Gastos: **e-mail** (para
  entrar) e **informações financeiras do próprio usuário** (os lançamentos); dados em
  trânsito com criptografia; o usuário pode pedir a exclusão da conta. Responder isso errado
  é o motivo nº 1 de reprovação — vale caprichar.
- **Público-alvo:** maiores de 18 anos.

---

## Passo 5 — Enviar, testar e publicar

1. **Teste fechado:** envie o `.aab`, convide os 12 testadores por e-mail, espere os 14 dias.
2. Abra no celular de teste e confira: abre **sem** barra de endereço, o botão voltar do
   Android funciona, e funciona no modo avião depois de abrir uma vez.
3. **Produção:** mande para revisão. A primeira análise leva de 2 a 7 dias.

---

## Passo 6 — Acender a loja dentro do app

Publicado, abra `js/config.js` e escreva o nome do pacote:

```js
export const PLAY_PACOTE = "br.com.meugastos.app";
```

A partir daí o botão **Instalar** do app e do site passa a oferecer **Baixar no Google
Play** junto com o caminho do navegador. Enquanto estiver vazio, nada muda.

Aumente também a `VERSAO` no `sw.js` para os celulares baixarem a mudança.

---

## Dali para frente

- **Atualizar o app:** é só subir o site, como sempre. O app da loja mostra o site.
- **Mandar outra versão para a loja:** só quando mudar ícone, nome ou telas da ficha —
  `bubblewrap update && bubblewrap build`, e suba o `.aab` novo.
- **iPhone:** a Apple não aceita casca de site na App Store (regra 4.2). No iPhone o caminho
  continua sendo **Compartilhar › Adicionar à Tela de Início**, pelo Safari, que o app já
  ensina sozinho.
- **APK no site, sem loja:** dá, mas o celular avisa "app de fonte desconhecida" e pede
  permissão; assusta mais gente do que ajuda. Serve para testar, não para vender.

## Links

- Bubblewrap: <https://github.com/GoogleChromeLabs/bubblewrap>
- Trusted Web Activity: <https://developer.chrome.com/docs/android/trusted-web-activity/>
- Digital Asset Links: <https://developers.google.com/digital-asset-links/v1/getting-started>
- Play Console: <https://play.google.com/console>
