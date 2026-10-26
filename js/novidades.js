/* O que mudou em cada versão, em palavras de quem usa o app. A tela "Novidades" mostra as últimas. */
export const NOVIDADES = [
  { versao: "170", itens: ["Lista de mercado: depois de comprar, toque em \"Conferir com a nota (QR code)\" e aponte a câmera para o QR code do cupom. O app compara a nota com o seu carrinho: mostra o que bateu, quanto cada preço mudou, o que veio na nota e não estava na lista e o que ficou de fora. Com um toque você passa a usar os valores da nota e depois finaliza a compra. (Precisa estar logado no app, e a leitura depende do site da Fazenda do seu estado.)"] },
  { versao: "169", itens: ["Lista de mercado: o campo do topo agora também procura. Ao digitar, a lista mostra só os itens que combinam (sem importar acento ou maiúscula), e o botão + continua adicionando um item novo. Fica fácil achar o que já está na lista, mesmo com muitos itens."] },
  { versao: "168", itens: ["Lista de mercado: toque no nome de um item para mudar o nome na hora da compra (por exemplo, de Arroz para Arroz integral). Enter confirma, Esc cancela, e o app avisa se o nome já existe na lista."] },
  { versao: "167", itens: ["Lista de mercado: o botão da câmera ao lado do preço lê a etiqueta e já preenche o nome e o preço. Funciona com etiqueta de peça pesada (acém, costela: pega o total e confere peso × preço por kg) e com placa de prateleira (alface, cebola: pega o preço de varejo). Você confere e toca em +. Se o app não conseguir ler, é só digitar."] },
  { versao: "166", itens: ["Lista de mercado mais rápida na hora de comprar: ao adicionar um item, já dá para escrever o preço ao lado. Com preço, o item entra direto no carrinho, sem tocar na bolinha. E ao digitar o preço de um item que já está na lista, ele também vai para o carrinho (com Desfazer, caso tenha sido só para estimar)."] },
  { versao: "165", itens: ["Regra para decorar mais simples: um número só, o custo do seu carro por km mais R$ 1,00. Abaixo disso, recuse. Separado, o app mostra a partir de quanto por km a corrida é boa (uns R$ 2,00, ou mais se a sua meta pedir)."] },
  { versao: "164", itens: ["Modo motorista: no resultado, agora aparecem lado a lado quanto você faz por hora no bruto (o que entra) e no líquido (depois do custo do carro), junto com o total de horas trabalhadas. O mesmo vale para o km."] },
  { versao: "163", itens: ["Regra para decorar do motorista, mais certa: ela parte do custo do seu carro por km (o mesmo de \"Meu carro ou moto\") e exige pelo menos R$ 1,00 a mais por km. Abaixo disso, recuse; de uns R$ 2,00 por km para cima (ou o que a sua meta pedir), é corrida boa. A tela mostra a conta."] },
  { versao: "162", itens: ["Quem já importou extrato ou fatura pode tirar tudo de uma vez: em Ferramentas, Arrumar lançamentos, toque em \"Remover o que veio de importação\". O app mostra quantos são e de que período, o que você lançou à mão fica, e dá para desfazer logo depois (ou baixar uma cópia antes)."] },
  { versao: "161", itens: ["Modo motorista: toque numa barra do gráfico dos últimos 7 dias (ou na data de um turno) para ver aquele dia por inteiro: ganho, lucro, ganho e lucro por hora, por km e por viagem, o que cada aplicativo rendeu e cada turno, que você pode editar. As setas levam ao dia anterior e ao próximo."] },
  { versao: "160", itens: ["Compra parcelada no cartão: antes de lançar, o app mostra em qual fatura cai cada parcela (por exemplo, \"8 parcelas: da fatura de dezembro, que vence 05/12, até a de julho de 2027\"). Se você cadastrar um cartão novo sem os dias de fechar e vencer, ele avisa que usou dia 3 e dia 10, para você corrigir antes de as parcelas caírem no mês errado."] },
  { versao: "159", itens: ["Mais simples para quem usa cartão: tiramos a opção de importar extrato e fatura de arquivo, porque cada banco entrega o arquivo de um jeito e a leitura falhava. Agora o caminho é lançar a compra: escolha Cartão de crédito, o cartão e as parcelas, e ela entra na fatura certa. A foto ou o PDF de um comprovante e o QR code continuam funcionando."] },
  { versao: "158", itens: ["Modo motorista: agora dá para editar um turno que já foi salvo. Em \"Últimos turnos\", toque na linha e corrija os ganhos de cada app, os km, as viagens, o dia e os horários. O ganho também muda no extrato."] },
  { versao: "157", itens: ["O app agora se atualiza sozinho: quando sai uma versão nova, ele recarrega logo que você abre (se ainda não mexeu em nada) ou quando você volta ao app depois de largá-lo. Antes, só aparecia um aviso que dava para perder, e muita gente ficava numa versão antiga."] },
  { versao: "156", itens: ["Modo motorista, jornada em andamento: o líquido por hora virou o destaque no topo, e Pausar e Encerrar jornada ficam fixos embaixo da tela, fáceis de tocar com o carro parado. O botão redondo grande saiu para dar espaço."] },
  { versao: "155", itens: ["Início com cara de painel: o topo ganhou grade fina, brilho no canto e o saldo em fonte técnica, nos temas claro e escuro. Novo bloco \"Esta semana\", uma linha do tempo com seus últimos lançamentos; toque em um para abrir."] },
  { versao: "154", itens: ["Transições: as telas entram com um deslize curto e suave, os grupos do menu Mais aparecem em sequência, os botões respondem ao toque e as barras do gráfico crescem. Quem desliga as animações no celular (Acessibilidade) continua sem movimento nenhum."] },
  { versao: "153", itens: ["Modo motorista: novo gráfico \"Ganho dos últimos 7 dias\", com uma barra por dia: a parte clara é o ganho e a parte cheia é o que sobrou depois dos gastos. Dá para ver de relance quais dias valeram a pena."] },
  { versao: "152", itens: ["Modo motorista: ao encerrar a jornada, os apps aparecem em duas colunas, cabendo numa tela só, e o total do dia soma enquanto você digita; o botão Encerrar ficou mais legível.", "Cartões: os botões Ler fatura, Importar extrato e Exportar ficam numa linha própria, alinhados. Pôr o mês em ordem: corrigido \"5,3 dia\" para \"5,3 dias\". Nas contas do carro, da casa e da hora, os exemplos aparecem como \"ex.: 1000\", para não parecer que já está preenchido. As dicas do dia ficaram mais fáceis de ler.", "Visual novo: o app abre no tema escuro (quem prefere o claro escolhe em Ajustes). A barra de baixo agora tem Início, Extrato, Lançar, Planejar e Mais. A tela Mais ficou mais curta: Contas e entradas fixas viraram um item só, Resumo do mês reúne as análises, e Ajuda reúne Como usar, Novidades e Sugerir. Em Cartões, o formulário de novo cartão só abre quando você toca em Adicionar outro cartão."] },
  { versao: "151", itens: ["A página de apresentação ficou cerca de um quarto mais curta no celular: as listas longas mostram os primeiros itens com um botão \"Ver mais\", e as perguntas frequentes ganharam \"Como funciona o teste grátis?\"."] },
  { versao: "150", itens: ["A página de apresentação agora oferece o teste grátis de 7 dias, sem cartão, e o botão abre o app direto em \"Criar conta\". Nas contas fixas, as semanais aparecem como \"semanal\" (em vez de \"toda qui\"), e Novidades e Sugerir ganharam desenhos próprios no menu Mais."] },
  { versao: "149", itens: ["Início mais calmo no celular: no topo ficam o quanto está livre, o dia de hoje e as próximas contas. Atalhos, cartões, previsão do mês e \"Para onde foi\" estão em \"Mais do seu mês\", um toque abaixo. A tela ficou cerca de um terço mais curta."] },
  { versao: "148", itens: ["Toques mais rápidos no celular (sem a espera do zoom de dois toques), a tela de trás não rola junto quando um quadro está aberto, e o campo de preço da lista de mercado mostra quando está selecionado."] },
  { versao: "147", itens: ["Mais fácil para quem usa leitor de tela ou teclado: em Próximos vencimentos, o nome da conta virou um botão próprio (antes havia um botão dentro de outro), e o cartão no Início lê exatamente o que aparece na tela. A página de apresentação também ficou sem nenhum erro de acessibilidade."] },
  { versao: "146", itens: ["Textos mais simples: no resumo do motorista no Início, \"faturamento\" virou \"ganho\", e as mensagens de avisos falam em \"serviço\" em vez de \"servidor\"."] },
  { versao: "145", itens: ["O aviso de gasto que deixa conta sem cobrir ficou mais claro: título direto, o quanto vai faltar e as contas numa lista (e não numa linha só), com o recado de evitar gastar assim se você quer cumprir suas metas. O botão em destaque volta a ser \"Voltar\", para ajudar a segurar o gasto."] },
  { versao: "144", itens: ["Lançar um gasto com a jornada do Modo motorista em andamento não mostra mais o aviso \"deixa conta sem cobrir\": o ganho do dia ainda não entrou na conta e o aviso estava errado. Fora da jornada, o aviso continua, e agora o botão \"Lançar mesmo assim\" é o principal, porque o gasto já aconteceu."] },
  { versao: "143", itens: ["Modo motorista: tirei o \"Vale a pena essa corrida?\", que pedia digitar no meio da viagem. Ficou só a \"Regra para decorar\", que agora nunca fica abaixo de R$ 1,00 por km: ganhar menos que isso não compensa."] },
  { versao: "142", itens: ["No Modo motorista, \"Faturamento\" passou a se chamar \"Ganho\", como no resto do app, e o aviso da demonstração cabe numa linha só no celular. Por trás, o app agora avisa a equipe quando algo quebra, sem mandar nenhum dado seu."] },
  { versao: "141", itens: ["Lista de mercado: o app lembra a categoria que você deu a cada item (ex.: areia do gato em Animais) e já sugere nas próximas listas. No celular, deslize o item para a direita para colocá-lo no carrinho."] },
  { versao: "140", itens: ["Lista de mercado: o app avisa quando o item já está na lista, em vez de anotar de novo. Cada item sugere a categoria pelo nome (ex.: areia do gato) e você pode escolher \"+ Nova categoria…\" e escrever a sua. E ao lado do preço há um botão de câmera: fotografe a etiqueta ou o cupom e o app lê o valor para você conferir."] },
  { versao: "139", itens: ["Novo: \"Ganho contra gasto\" (em Análise do seu dinheiro). Mostra no mês as horas trabalhadas, quanto você ganhou, quanto gastou, quanto sobrou e em que dia o que entrou já cobria todo o gasto. São só contas com o que você já lançou."] },
  { versao: "138", itens: ["Valor digitado com letras ou em formato estranho (como 1e3 ou 0x10) agora é recusado em vez de virar um número. No cadastro, o link para assinar ficou mais claro."] },
  { versao: "137", itens: ["Na lista de lançamentos do celular, o total gasto de cada dia mostra também quanto tempo de trabalho ele custou (ex.: − R$ 120,00 · 3h20 de trabalho)."] },
  { versao: "136", itens: ["Teste grátis de 7 dias: quem cria a conta usa o app completo por 7 dias, sem cartão. O app avisa quantos dias faltam, e depois dos 7 dias os seus dados continuam guardados até você assinar."] },
  { versao: "135", itens: ["Suas horas de trabalho aparecem também ao editar um gasto, no total do custo do mês e nas contas fixas (ex.: \"43 h de trabalho só para pagar as contas fixas\"). Vale o valor da hora que você informou em Quanto vale minha hora." ] },
  { versao: "134", itens: [
    "Novo: \"Quanto vale minha hora\" (em Ferramentas). Informe o que recebe por mês e as horas por semana, e ao lançar um gasto o app mostra quanto tempo de trabalho ele custou (ex.: R$ 3.920 = 249 h). Quem dirige por aplicativo pode deixar em branco: vale o lucro por hora dos turnos." ] },
  { versao: "132", itens: [
    "Modo motorista: a tela inicial agora mostra uma \"Regra para decorar\" (ex.: aceite se pagar R$ 1,50 por km ou mais; abaixo de R$ 1,00, recuse). Assim você decide na hora, com o app da corrida aberto, sem calcular." ] },
  { versao: "131", itens: [
    "Cartão emprestado ou novo: ao lançar uma compra no cartão de crédito, escolha \"+ Outro cartão\" e escreva o nome (por exemplo, Cartão da minha mãe). Ele é cadastrado na hora. Funciona também depois de ler um comprovante.",
    "Na tela de ler com a câmera, o botão \"Fotografar o comprovante agora\" tira a foto ali mesmo, sem escolher câmera nem galeria.",
    "Comprovante da maquininha: o app agora lê as parcelas (ex.: 8x sem juros) e já deixa a compra em 8 vezes." ] },
  { versao: "130", itens: [
    "Se você apaga um lançamento que tem foto de comprovante e toca em Desfazer, a foto agora volta junto (antes voltava só o lançamento).",
    "Em Cópia de segurança, o app mostra há quantos dias você baixou a última cópia e avisa quando passa de 30 dias." ] },
  { versao: "129", itens: [
    "Encerrar uma conta ou entrada fixa, e apagar uma fatura lançada à mão, agora mostram o aviso \"Desfazer\". Antes, o toque em Confirmar sem querer não tinha volta." ] },
  { versao: "128", itens: [
    "Remover uma categoria em Ajustes agora mostra o aviso \"Desfazer\" (com a categoria voltando no mesmo lugar) e diz quantos lançamentos usam ela. Antes, um toque sem querer no × tirava a categoria de vez." ] },
  { versao: "127", itens: [
    "Apagar um lançamento pelo botão da lista agora mostra o aviso \"Desfazer\", como já acontecia ao deslizar. Antes, um toque sem querer em Confirmar apagava de vez." ] },
  { versao: "126", itens: [
    "O aviso de data com ano errado (como 2062) agora também aparece quando você edita um lançamento." ] },
  { versao: "125", itens: [
    "Se você digitar uma data com o ano errado (por exemplo 2062 em vez de 2026), o app avisa antes de lançar. Antes o gasto sumia para um mês que ninguém olha." ] },
  { versao: "124", itens: [
    "Valores colados no formato americano (1,234.56) agora são entendidos certo: antes virava R$ 1,23 em vez de R$ 1.234,56." ] },
  { versao: "123", itens: [
    "Nas tabelas de Contas fixas, Entradas fixas, Cartões e Lançamentos, os botões Editar, Encerrar, Pago e Ver compras ficaram com tamanho de dedo (44 px) no celular. Também nos botões de remover e trocar o desenho das categorias." ] },
  { versao: "122", itens: [
    "Em celulares de tela pequena, o gráfico \"Onde mais gastou\" não corta mais os nomes das categorias (Moradia, Mercado, Saúde): a lista fica embaixo do gráfico." ] },
  { versao: "121", itens: [
    "Caixinhas agora explicam o que são (dinheiro separado para um objetivo) e \"Previsão de gasto\" virou \"Previsão do mês\", o mesmo nome do resto do app." ] },
  { versao: "120", itens: [
    "Palavras mais simples: \"Gasto até hoje\" no lugar de \"Gasto até agora\", \"o que dá para gastar hoje\" no lugar de \"fatia\", e \"Saldo somando os meses anteriores\" no lugar de \"Saldo acumulado\"." ] },
  { versao: "119", itens: [
    "Ao tocar num item dentro de Entradas, Contas fixas, Faturas ou Saldo e editar, você volta para a mesma lista, sem ter que abrir tudo de novo." ] },
  { versao: "118", itens: [
    "Em Cartões e faturas, tocar na linha da fatura abre as compras ou a edição." ] },
  { versao: "117", itens: [
    "Em Contas fixas e Entradas fixas, tocar em qualquer parte da linha abre a edição (antes só o botão pequeno abria)." ] },
  { versao: "116", itens: [
    "Calendário, botões de editar e links do rodapé ficaram maiores no celular, para tocar sem errar." ] },
  { versao: "115", itens: [
    "Botões e links ficaram maiores no celular (Câmera, Falar, gastos que você repete, categorias, rodapé), mais fáceis de tocar sem errar.",
    "Os nomes dos atalhos do Início e das categorias ficaram em letra maior.",
    "Mês que ainda não começou e já aparece no vermelho (como novembro): o Início explica por quê e, se você costuma lançar entradas avulsas (Uber, extras), oferece contar a média dos últimos meses como previsão." ] },
  { versao: "114", itens: [
    "Toque em qualquer conta de Próximos vencimentos: abre o detalhe com a data, o tipo (fixa, fatura), se o dinheiro cobre na data e quanto falta, e os botões Já paguei, Editar e Ver no calendário.",
    "Início reorganizado na ordem do dia a dia: o resumo, o Hoje, os Próximos vencimentos e só depois os atalhos (Contas fixas, Cartões, Lançamentos), o cartão, o mercado e a previsão do mês." ] },
  { versao: "113", itens: [
    "Nas telas pequenas, os nomes no passo a passo de começar (\"Adiantamento ou vale\") não são mais cortados." ] },
  { versao: "112", itens: [
    "Se você ainda não disse quanto recebe, o Início não mostra mais \"no vermelho\": ele pede a entrada, com um botão para adicionar.",
    "Modo motorista agora aparece no Início: quem usa vê o resultado de hoje e o botão para iniciar a jornada; quem ainda não usa recebe um convite (que dá para dispensar).",
    "As telas mais usadas ficaram na frente, na faixa do Início: Contas fixas, Cartões e Lançamentos. O que antes se chamava Extrato agora é Lançamentos." ] },
  { versao: "111", itens: [
    "Ao abrir o Lançar, o app avisa quando você acabou de copiar a mensagem do banco (compra, Pix, boleto): um toque e o valor, a loja e a forma de pagamento vêm preenchidos. Depois da primeira permissão, ele reconhece sozinho." ] },
  { versao: "110", itens: [
    "Novo cartão \"Hoje\" no Início: mostra quanto ainda cabe gastar hoje e, logo abaixo, o que pede ação agora (conta atrasada, conta que vence hoje, fatura sem valor, dia sem anotação).",
    "Na tela \"Saldo de outubro\", toque em Entradas, Gasto do mês ou Guardado para ver cada lançamento que compõe o valor e editar na hora. Tem um botão para voltar ao saldo.",
    "O quadro \"Seu dia\" foi para dentro do cartão Hoje, e o Início ficou mais curto." ] },
  { versao: "109", itens: [
    "Próximos vencimentos diz logo no título quantas contas estão atrasadas e quanto vence nos próximos 7 dias.",
    "O que está atrasado ou vence em 7 dias aparece sempre na frente, mesmo no celular.",
    "Aviso de dinheiro curto: o app calcula o dia em que o dinheiro do mês acaba, no ritmo de agora, e quanto falta até o fim do mês." ] },
  { versao: "108", itens: [
    "Menu de baixo mais simples: Início, Lançar, Mercado e Mais. A aba Ferramentas foi para dentro do Mais, e cada coisa agora mora em um lugar só.",
    "A Dica do dia também está no Mais, em Guardar e planejar." ] },
  { versao: "107", itens: [
    "O aviso \"Quer recomeçar sem peso?\" no Início não fica mais escondido atrás dos botões de ação.",
    "O topo do Início fala em palavras simples quando o mês está no vermelho: \"Gastou além do que entrou\".",
    "O sinal de menos fica colado ao valor, sem pular de linha.",
    "Lista de mercado dividida com o casal: o nome da pessoa não quebra mais em linhas estreitas.",
    "Contas do casal mostra só o primeiro nome, sem cortar." ] },
  { versao: "106", itens: [
    "Lista de mercado por corredor: hortifruti, padaria, açougue, frios, mercearia, bebidas, limpeza e higiene, na ordem em que você anda no mercado.",
    "Repetir a última compra: um toque traz de volta os itens que você comprou, sem repetir os que já estão na lista.",
    "O app guarda o preço de cada item e avisa quando ele subiu ou baixou desde a primeira vez que você anotou.",
    "Depois de lançar a compra, uma frase mostra como ela ficou perto da sua compra média." ] },
  { versao: "105", itens: [
    "Pôr o mês em ordem: uma tela com o tamanho das contas do mês, as contas em atraso (com \"Já paguei\"), quanto falta para sobrar e quantos dias a sua reserva cobre.",
    "Virar a página: quando um mês fecha no vermelho, o saldo dele deixa de ser levado para os meses seguintes. Nada é apagado e dá para desfazer.",
    "Um jeito calmo de recomeçar: repor o que faltou em 1, 3 ou 6 meses, com o valor por dia, por semana e por mês, conferido com o que costuma sobrar.",
    "O atalho aparece no Início quando o mês está no vermelho e também no menu Mais.",
    "Próximos vencimentos mostra a fatura do cartão cadastrado na data de pagar, mesmo sem compras, e contas que parecem se repetir todo mês.",
    "Ao lançar um gasto, o app avisa quais contas do mês deixam de ser cobertas e pede confirmação antes de lançar.",
    "Tela de Lançar: o botão fica sempre à vista, mostra o valor digitado, e \"Outros\" deixa de ser a primeira categoria." ] },
  { versao: "104", itens: [
    "Restaurar a cópia de segurança não repete o que já veio de um extrato importado.",
    "Extrato da conta: quando o mesmo valor sai e entra com a mesma pessoa em poucos dias, o app avisa que pode ser dinheiro entre contas suas e deixa o movimento desmarcado.",
    "\"Custo\" virou \"Gasto\" nos números do mês, nos gráficos e nos relatórios.",
    "Filtros do Extrato maiores e mais fáceis de tocar no celular." ] },
  { versao: "103", itens: [
    "Modo motorista para qualquer tipo de corrida: carro de aplicativo, moto, entrega, frete ou corrida particular.",
    "Vale a pena essa corrida? Digite valor, km e minutos e veja quanto sobra depois do gasto do carro.",
    "A meta do dia agora é conferida com o seu ritmo real e avisa quando só rodar não fecha o mês.",
    "Meu resultado em imagem para compartilhar, com opção de esconder os valores.",
    "Ganho por aplicativo e o dia da semana em que a hora rende mais.",
    "Contas que se repetem: o app acha, no extrato que você importou, o que é conta fixa e deixa você confirmar.",
    "Gráficos do mês em primeiro lugar na tela de Análise e um atalho no Início.",
    "Menu Mais mais curto, com telas que reúnem o que é parecido (conferir lançamentos, análise, baixar e guardar)." ] },
  { versao: "102", itens: [
    "Cada função abre numa tela cheia, com Voltar no alto.",
    "Jornada do motorista com cronômetro, pausa e botão de encerrar.",
    "Transferências entre contas suas e com a pessoa da conta casal não contam como gasto nem como entrada." ] },
  { versao: "101", itens: ["Modo motorista de aplicativo e seção para motoristas no site."] },
];
