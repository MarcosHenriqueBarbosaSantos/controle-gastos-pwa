// Medição de anúncios do site de apresentação (o aplicativo não usa nada disto).
// Enquanto os dois campos estiverem vazios, o site não carrega nenhuma ferramenta e não mostra aviso de cookies.
//   meta:   o número do Pixel da Meta (Facebook e Instagram), só os dígitos. Exemplo: "1234567890123456"
//   google: o código da tag do Google. Exemplo: "G-ABC123XYZ" ou "AW-123456789"
// Ao preencher, o site passa a perguntar se a pessoa aceita os cookies de medição, e a política de privacidade
// passa a mostrar o trecho que explica isso. Só carrega alguma coisa depois do "Aceitar".
window.MEDICAO = { meta: "", google: "" };
