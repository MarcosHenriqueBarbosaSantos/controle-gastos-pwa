-- Conta de casal no banco: convite, aceite, quem vê o quê, acesso de quem comprou valendo para os dois, saída e exclusão da conta.
-- Rode depois de tests/sql/base.sql e dos arquivos de supabase/ (veja o cabeçalho de base.sql). Termina com "TUDO CERTO".
\set ON_ERROR_STOP on
\set VERBOSITY terse
insert into auth.users (email) values ('ana@x.com'), ('bia@x.com'), ('caio@x.com'), ('duda@x.com'), ('edu@x.com'), ('xis@x.com'), ('yuri@x.com');
set role authenticated;

-- cada um com os seus dados
select t.como('ana@x.com');
insert into public.cartoes (id, nome, fechamento, vencimento) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Roxo da Ana', 3, 10);
insert into public.fixos (id, descricao, categoria, dia, valor, desde) values ('aaaaaaaa-0000-0000-0000-0000000000f1', 'Aluguel', 'Moradia', 5, 1000, '2026-08-01');
insert into public.lancamentos (data, descricao, tipo, categoria, forma, valor) values ('2026-10-01', 'Mercado da Ana', 'Despesa', 'Mercado', 'Pix', 100);
insert into public.preferencias (dados) values ('{"teto": 3000, "categorias": {"Despesa": ["Mercado"]}, "avisos": {"email": true}, "boasVindas": true}');
select t.como('bia@x.com');
insert into public.lancamentos (data, descricao, tipo, categoria, forma, valor) values ('2026-10-02', 'Farmácia da Bia', 'Despesa', 'Saúde', 'Pix', 40);
insert into public.preferencias (dados) values ('{"teto": 500, "avisos": {"email": false}}');
select t.confere((select count(*) from public.lancamentos) = 1, 'antes do convite, a Bia vê só o que é dela');
select t.confere((select count(*) from public.cartoes) = 0, 'e não vê o cartão da Ana');
select t.confere((public.casal_meu() ->> 'situacao') = 'nenhum', 'situação inicial: nenhum');
select t.falha('select * from public.casais', 'permission denied|0 rows', 'a tabela de casais não é lida direto pelo app') where false;
select t.confere((select count(*) from public.casais) = 0, 'a tabela de casais não mostra nada direto para o app');

-- convite
select t.como('ana@x.com');
select t.falha($$select public.casal_convidar('ana@x.com')$$, 'proprio_email', 'não dá para convidar a si mesma');
select t.falha($$select public.casal_convidar('sem-arroba')$$, 'email_invalido', 'e-mail inválido é recusado');
select t.confere((public.casal_convidar(' Bia@X.com ') ->> 'situacao') = 'convidei', 'a Ana convida a Bia (e-mail com maiúsculas e espaços)');
select t.confere((public.casal_meu() ->> 'outro') = 'bia@x.com', 'a Ana vê para quem mandou');
select t.falha($$select public.casal_convidar('caio@x.com')$$, 'ja_tem', 'um convite de cada vez');
select t.como('bia@x.com');
select t.confere((public.casal_meu() ->> 'situacao') = 'convidado' and (public.casal_meu() ->> 'outro') = 'ana@x.com', 'a Bia vê o convite e quem convidou');
select t.confere((select count(*) from public.lancamentos) = 1, 'convite pendente ainda não mostra nada');
select t.como('caio@x.com');
select t.falha($$select public.casal_responder(true)$$, 'sem_convite', 'o Caio não tem convite para aceitar');

-- aceite
select t.como('bia@x.com');
select t.confere((public.casal_responder(true) ->> 'situacao') = 'ativo', 'a Bia aceita');
select t.confere((public.casal_meu() ->> 'papel') = 'parceiro' and (public.casal_meu() ->> 'outro') = 'ana@x.com' and (public.casal_meu() ->> 'outro_id')::uuid = t.id('ana@x.com'), 'a Bia vê com quem divide');
select t.confere((public.casal_meu() -> 'dados' ->> 'teto') = '3000' and (public.casal_meu() -> 'dados' -> 'avisos') is null, 'o que é dos dois começa com o limite e as categorias da Ana, sem os avisos dela');
select t.confere((select count(*) from public.lancamentos) = 2 and (select count(*) from public.cartoes) = 1 and (select count(*) from public.fixos) = 1, 'agora a Bia vê os lançamentos, o cartão e as contas fixas da Ana');
select t.confere((select dados ->> 'teto' from public.preferencias) = '500' and (select count(*) from public.preferencias) = 1, 'as preferências pessoais continuam separadas');
update public.lancamentos set valor = 110 where descricao = 'Mercado da Ana';
select t.confere((select valor from public.lancamentos where descricao = 'Mercado da Ana') = 110, 'a Bia corrige um lançamento da Ana');
insert into public.lancamentos (data, descricao, tipo, categoria, forma, valor, cartao_id, import_key) values ('2026-10-03', 'Roupa no cartão da Ana', 'Despesa', 'Roupas', 'Cartão de crédito', 200, 'aaaaaaaa-0000-0000-0000-000000000001', 'k1');
insert into public.fixos_pagos (fixo_id, mes) values ('aaaaaaaa-0000-0000-0000-0000000000f1', '2026-10-01');
insert into public.faturas (cartao, vencimento, valor, status, cartao_id) values ('Roxo da Ana', '2026-11-10', 200, 'Paga', 'aaaaaaaa-0000-0000-0000-000000000001');
select t.confere((select user_id from public.lancamentos where descricao = 'Roupa no cartão da Ana') = t.id('bia@x.com'), 'o lançamento novo fica no nome de quem lançou');
select t.como('ana@x.com');
select t.confere((public.casal_meu() ->> 'papel') = 'dono' and (public.casal_meu() ->> 'outro') = 'bia@x.com', 'a Ana vê a Bia');
select t.confere((select count(*) from public.lancamentos) = 3 and (select count(*) from public.fixos_pagos) = 1, 'a Ana vê o que a Bia lançou e a conta marcada como paga');
delete from public.lancamentos where descricao = 'Farmácia da Bia';
select t.confere((select count(*) from public.lancamentos) = 2, 'a Ana apaga um lançamento da Bia');
select public.casal_salvar('{"teto": 3500, "nomes": {"x": "Ana"}}');
select t.como('bia@x.com');
select t.confere((public.casal_meu() -> 'dados' ->> 'teto') = '3500', 'o que a Ana muda no limite aparece para a Bia');
select t.falha($$select public.casal_salvar('[1]')$$, 'dados_invalidos', 'dados fora do formato são recusados');
select t.como('caio@x.com');
select t.confere((select count(*) from public.lancamentos) = 0 and (select count(*) from public.cartoes) = 0, 'quem está de fora continua sem ver nada');
select t.falha($$select public.casal_salvar('{}')$$, 'sem_casal', 'quem não está em casal não grava dados de casal');
select t.falha($$update public.lancamentos set valor = 1$$, 'x', 'ignorar') where false;
update public.lancamentos set valor = 1;
select t.como('ana@x.com');
select t.confere((select min(valor) from public.lancamentos) > 1, 'e não consegue mudar nada dos outros');

-- convite de um terceiro para quem já está em casal
select t.como('caio@x.com');
select t.confere((public.casal_convidar('ana@x.com') ->> 'situacao') = 'convidei', 'o Caio pode convidar a Ana (ele não sabe que ela já tem casal)');
select t.como('ana@x.com');
select t.confere((public.casal_meu() ->> 'situacao') = 'ativo', 'para a Ana continua valendo a conta com a Bia');
select t.falha($$select public.casal_responder(true)$$, 'ja_tem', 'a Ana não consegue aceitar um segundo casal');
select t.confere((public.casal_responder(false) ->> 'situacao') = 'ativo', 'ela recusa e segue com a Bia');
select t.como('caio@x.com');
select t.confere((public.casal_meu() ->> 'situacao') = 'nenhum', 'o convite do Caio foi recusado');
select t.falha($$select public.casal_convidar('ana@x.com')$$, 'recusado', 'quem recusou não recebe o mesmo convite de novo');

-- cobrança ligada: uma compra vale para os dois
select t.adm($$insert into public.acessos (email, origem, ate) values ('ana@x.com', 'hotmart', current_date + 30); update public.acesso_config set cobranca = true$$);
select t.como('ana@x.com');
select t.confere(public.tem_acesso() and (public.meu_acesso() ->> 'pelo_par') = 'false', 'a Ana comprou: tem acesso por conta própria');
select t.como('bia@x.com');
select t.confere(public.tem_acesso() and (public.meu_acesso() ->> 'pelo_par') = 'true' and (public.meu_acesso() ->> 'ate')::date = current_date + 30 and (public.meu_acesso() ->> 'ativo') = 'true', 'a Bia tem acesso pela compra da Ana, até a mesma data');
insert into public.lancamentos (data, descricao, tipo, categoria, forma, valor) values ('2026-10-04', 'Padaria', 'Despesa', 'Mercado', 'Pix', 12);
select t.confere((select count(*) from public.lancamentos where descricao = 'Padaria') = 1, 'e consegue lançar');
select t.como('caio@x.com');
select t.confere(not public.tem_acesso() and (public.meu_acesso() ->> 'pelo_par') = 'false', 'o Caio, sem compra e sem casal, não tem acesso');
select t.falha($$insert into public.lancamentos (data, tipo, categoria, valor) values ('2026-10-04', 'Despesa', 'Outros', 5)$$, 'row-level security', 'e não consegue lançar');
select t.falha($$select public.acesso_em_dia('ana@x.com')$$, 'permission denied', 'o app não consegue perguntar se outro e-mail tem acesso');
select t.falha($$select public.casal_encerra(gen_random_uuid())$$, 'permission denied', 'nem encerrar o casal dos outros');

-- encerrar
select t.como('bia@x.com');
select t.confere((public.casal_sair() ->> 'situacao') = 'nenhum', 'a Bia encerra a conta de casal');
select t.confere((select count(*) from public.lancamentos) = 1 and (select descricao from public.lancamentos) = 'Padaria', 'ela fica com o que lançou (menos a compra no cartão da Ana)');
select t.confere((select count(*) from public.cartoes) = 0 and (select count(*) from public.fixos_pagos) = 0 and (select count(*) from public.faturas) = 0, 'e deixa de ver o cartão, as contas e as faturas da Ana');
select t.confere((select dados ->> 'teto' from public.preferencias) = '3500' and (select dados -> 'avisos' ->> 'email' from public.preferencias) = 'false' and (select dados -> 'nomes' from public.preferencias) is null, 'o limite combinado fica copiado para ela; os avisos dela não mudam');
select t.confere(not public.tem_acesso(), 'sem o casal, o acesso da Bia deixa de valer');
select t.confere((public.casal_meu() ->> 'espera')::date = (now() at time zone 'America/Sao_Paulo')::date + 7, 'ela é avisada de que precisa esperar 7 dias para formar outra');
select t.falha($$select public.casal_convidar('duda@x.com')$$, 'espera', 'e o convite antes disso é recusado');
select t.como('ana@x.com');
select t.confere((public.casal_meu() ->> 'situacao') = 'nenhum', 'para a Ana também acabou');
select t.confere((select count(*) from public.lancamentos) = 2 and (select user_id from public.lancamentos where descricao = 'Roupa no cartão da Ana') = t.id('ana@x.com'), 'a compra feita no cartão dela ficou com ela');
select t.confere((select user_id from public.fixos_pagos) = t.id('ana@x.com') and (select user_id from public.faturas) = t.id('ana@x.com'), 'a conta continua marcada como paga e a fatura continua paga, agora no nome dela');
select t.confere((select dados ->> 'teto' from public.preferencias) = '3500' and (select dados ->> 'boasVindas' from public.preferencias) = 'true', 'o limite combinado também ficou para ela');
select t.adm($$update public.acesso_config set cobranca = false$$);

-- cancelar convite pendente não gera espera
select t.como('duda@x.com');
select public.casal_convidar('edu@x.com');
select t.confere((public.casal_sair() ->> 'situacao') = 'nenhum' and (public.casal_meu() ->> 'espera') is null, 'cancelar um convite que ninguém aceitou não gera espera');
select t.confere((public.casal_convidar('edu@x.com') ->> 'situacao') = 'convidei', 'e dá para convidar de novo');
-- quem aceita um convite desiste do que tinha feito
select t.como('edu@x.com');
select public.casal_convidar('caio@x.com');
select t.confere((public.casal_meu() ->> 'situacao') = 'convidei', 'o Edu tinha convidado o Caio');
select t.confere((public.casal_responder(true) ->> 'situacao') = 'ativo', 'mas aceita o convite da Duda');
select t.como('caio@x.com');
select t.confere((public.casal_meu() ->> 'situacao') = 'nenhum', 'e o convite que ele tinha feito ao Caio some');

-- excluir a conta estando em casal
select t.como('xis@x.com');
insert into public.fixos (id, descricao, categoria, dia, valor, desde) values ('bbbbbbbb-0000-0000-0000-0000000000f1', 'Internet', 'Moradia', 8, 100, '2026-08-01');
insert into public.cartoes (id, nome, fechamento, vencimento) values ('bbbbbbbb-0000-0000-0000-000000000001', 'Cartão do Xis', 3, 10);
select public.casal_convidar('yuri@x.com');
select t.como('yuri@x.com');
select public.casal_responder(true);
insert into public.fixos_pagos (fixo_id, mes) values ('bbbbbbbb-0000-0000-0000-0000000000f1', '2026-10-01');
insert into public.lancamentos (data, descricao, tipo, categoria, forma, valor, cartao_id) values ('2026-10-03', 'Compra do Yuri no cartão do Xis', 'Despesa', 'Outros', 'Cartão de crédito', 80, 'bbbbbbbb-0000-0000-0000-000000000001');
insert into public.lancamentos (data, descricao, tipo, categoria, forma, valor) values ('2026-10-03', 'Só do Yuri', 'Despesa', 'Outros', 'Pix', 7);
select public.excluir_minha_conta();
select t.como('xis@x.com');
select t.confere((public.casal_meu() ->> 'situacao') = 'nenhum', 'o Yuri excluiu a conta: o Xis volta a ficar sozinho');
select t.confere((select count(*) from public.fixos_pagos) = 1 and (select count(*) from public.lancamentos) = 1 and (select descricao from public.lancamentos) = 'Compra do Yuri no cartão do Xis', 'o Xis não perde a conta marcada como paga nem a compra feita no cartão dele; o resto do Yuri foi apagado');
reset role;
select t.confere((select count(*) from auth.users where email = 'yuri@x.com') = 0 and (select count(*) from public.casais where parceiro is null and status = 'ativo') = 0, 'a conta do Yuri sumiu e não sobrou casal pela metade');
-- rodar o arquivo de novo não muda nada
\i supabase/casal.sql
select t.confere((select count(*) from public.casais where status = 'ativo') = 1, 'rodar casal.sql de novo mantém as contas de casal');
\echo TUDO CERTO
