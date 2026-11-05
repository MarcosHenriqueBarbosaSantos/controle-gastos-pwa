---
name: hotmart-venda-pendente
description: "Produto novo da Hotmart (ID 8865238, R$ 89) está no ar, mas compra real e comissão de afiliado ainda não foram confirmadas"
metadata:
  node_type: memory
  type: project
  originSessionId: 3fbc7daa-79bd-40f9-b326-3dbf73e85d65
  modified: 2026-11-02T16:20:02.603Z
---

Em 02/11/2026 a v186 foi publicada com o produto Hotmart 8865238 (pay.hotmart.com/X108304792E), R$ 89 por ano, até 3x sem juros, afiliados por 1 clique com 40% na primeira venda e 0% na renovação. Webhook salvo; segredos HOTMART_HOTTOK e HOTMART_PRODUTO trocados.

Um teste de compra feito pelo usuário não apareceu em 02/11 (0 vendas, sem aviso real); suspeita de site em cache com o link antigo G107911431C (R$ 49,90, conta não encontrada). O usuário adiou o teste.

**Why:** a liberação de acesso após compra real e a comissão pelo link `?p=` nunca foram provadas, e `?dp=1` abriu a página do Marketplace, não o pagamento.

**How to apply:** antes de divulgar o link de parceiro a influenciadores, repetir a compra pelo link novo com outro e-mail, conferir o aviso no Supabase e testar um afiliado real comparando o REF. Pendências: desativar o produto antigo pelo suporte da Hotmart e refazer as imagens do kit em azul.
