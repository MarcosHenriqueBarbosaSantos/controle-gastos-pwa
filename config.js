// Preencha com os dados do seu projeto Supabase:
// Supabase → Project Settings → API → "Project URL" e "anon public".
// A chave "anon" é feita para ficar no navegador: quem protege os dados
// são as regras de segurança (RLS) do arquivo supabase/schema.sql.
// Deixe vazio para usar só o modo demonstração.
export const SUPABASE_URL = "https://ebaivarzdqekmhnyrwxo.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_r-lrx9IbokblU_vquzuN0w_GSeUMv5p";

// Contato de suporte mostrado no app (em Ajustes e na tela de entrada).
// Pode ser um e-mail ("ajuda@seudominio.com") ou um link ("https://wa.me/55119...").
// Deixe vazio para não mostrar.
export const SUPORTE_CONTATO = "meugastos@gmail.com";

// Venda do app (plano anual). LINK_COMPRA é o endereço da página de pagamento na Hotmart.
// Enquanto estiver vazio, o app não mostra botão de compra. Quem decide se a cobrança vale é o banco
// (supabase/acesso.sql): com ela desligada, o app funciona para todos como sempre.
export const LINK_COMPRA = "https://pay.hotmart.com/G107911431C";
export const PRECO_PLANO = "R$ 49,90 por ano";

// Loja do Google (opcional). Depois de publicar o app na Play Store, escreva aqui o nome do pacote,
// o mesmo que está em .well-known/assetlinks.json (ex.: "br.com.meugastos.app").
// Com ele preenchido, o botão Instalar passa a oferecer a loja nos celulares Android — é a instalação
// mais simples em Xiaomi, Redmi e Poco, porque não depende do navegador deixar.
// Vazio: o app continua instalando pelo navegador, como hoje.
// Passo a passo para publicar: docs/google-play.md
export const PLAY_PACOTE = "";
