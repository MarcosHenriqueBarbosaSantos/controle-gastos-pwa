-- Comprovantes no banco: quem grava, quem vê e quem apaga a foto do recibo (supabase/comprovante.sql).
-- Rode depois de tests/sql/base.sql e dos arquivos de supabase/ (veja o cabeçalho de base.sql). Termina com "COMPROVANTES CERTO".
\set ON_ERROR_STOP on
\set VERBOSITY terse
insert into auth.users (email) values ('gil@x.com'), ('hel@x.com'), ('ivo@x.com');
select t.confere((select not public from storage.buckets where id = 'comprovantes'), 'o balde existe e é privado');
set role authenticated;

-- o Gil lança e guarda a foto na pasta dele
select t.como('gil@x.com');
insert into public.lancamentos (id, data, descricao, tipo, categoria, forma, valor)
values ('99999999-0000-0000-0000-000000000001', '2026-10-08', 'Mercado do Gil', 'Despesa', 'Mercado', 'Pix', 57.4);
insert into storage.objects (bucket_id, name) values ('comprovantes', t.id('gil@x.com') || '/99999999-0000-0000-0000-000000000001.jpg');
update public.lancamentos set comprovante = t.id('gil@x.com') || '/99999999-0000-0000-0000-000000000001.jpg' where id = '99999999-0000-0000-0000-000000000001';
select t.confere((select count(*) from storage.objects where bucket_id = 'comprovantes') = 1, 'o Gil vê o próprio comprovante');
select t.falha($$insert into storage.objects (bucket_id, name) values ('comprovantes', '$$ || t.id('hel@x.com') || $$/x.jpg')$$, 'row-level security', 'o Gil não grava na pasta da Hel');
select t.falha($$update public.lancamentos set comprovante = '$$ || t.id('hel@x.com') || $$/qualquer.jpg' where id = '99999999-0000-0000-0000-000000000001'$$, 'própria pasta', 'nem anota no lançamento um caminho da pasta dela');

-- a Hel, sem dividir contas com o Gil, não vê nada dele
select t.como('hel@x.com');
select t.confere((select count(*) from storage.objects where bucket_id = 'comprovantes') = 0, 'a Hel não vê a foto do Gil');
-- e não consegue "pegar emprestado" o caminho do Gil anotando no próprio lançamento
insert into public.lancamentos (id, data, descricao, tipo, categoria, forma, valor) values ('99999999-0000-0000-0000-000000000002', '2026-10-08', 'Isca', 'Despesa', 'Outros', 'Pix', 1);
select t.falha($$update public.lancamentos set comprovante = '$$ || t.id('gil@x.com') || $$/99999999-0000-0000-0000-000000000001.jpg' where id = '99999999-0000-0000-0000-000000000002'$$, 'própria pasta', 'a Hel não consegue apontar o lançamento dela para a foto do Gil');
select t.confere((select count(*) from storage.objects where bucket_id = 'comprovantes') = 0, 'e segue sem ver');
delete from storage.objects where bucket_id = 'comprovantes';
select t.como('gil@x.com');
select t.confere((select count(*) from storage.objects where bucket_id = 'comprovantes') = 1, 'o apagar da Hel não alcançou a foto do Gil');

-- conta de casal: Gil e Hel dividem as contas
select public.casal_convidar('hel@x.com');
select t.como('hel@x.com');
select public.casal_responder(true);
select t.confere((select count(*) from storage.objects where bucket_id = 'comprovantes') = 1, 'no casal, a Hel vê a foto do lançamento do Gil');
-- a Hel troca a foto do lançamento do Gil: a nova vai para a pasta dela, e o lançamento passa a apontar para lá
insert into storage.objects (bucket_id, name) values ('comprovantes', t.id('hel@x.com') || '/99999999-0000-0000-0000-000000000001.jpg');
update public.lancamentos set comprovante = t.id('hel@x.com') || '/99999999-0000-0000-0000-000000000001.jpg' where id = '99999999-0000-0000-0000-000000000001';
delete from storage.objects where name = t.id('gil@x.com') || '/99999999-0000-0000-0000-000000000001.jpg';
select t.confere((select count(*) from storage.objects where bucket_id = 'comprovantes') = 1, 'a foto antiga, na pasta do Gil, foi apagada pela Hel');
select t.como('gil@x.com');
select t.confere((select count(*) from storage.objects where name like '%/99999999-0000-0000-0000-000000000001.jpg') = 1, 'o Gil vê a foto nova, que está na pasta da Hel');

-- o Ivo, de fora, não vê nada
select t.como('ivo@x.com');
select t.confere((select count(*) from storage.objects where bucket_id = 'comprovantes') = 0, 'quem está fora do casal não vê nada');

-- o casal termina: o lançamento é do Gil, e a foto (na pasta da Hel) continua aparecendo para ele
select t.como('gil@x.com');
select public.casal_sair();
select t.confere((select count(*) from storage.objects where name like '%/99999999-0000-0000-0000-000000000001.jpg') = 1, 'depois do fim do casal, o dono do lançamento ainda vê o comprovante');

-- tirar o comprovante do lançamento é sempre permitido
update public.lancamentos set comprovante = null where id = '99999999-0000-0000-0000-000000000001';
select t.confere((select comprovante is null from public.lancamentos where id = '99999999-0000-0000-0000-000000000001'), 'tirar o comprovante do lançamento funciona');

reset role;
select 'COMPROVANTES CERTO';
