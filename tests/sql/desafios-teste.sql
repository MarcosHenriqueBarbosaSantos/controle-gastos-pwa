-- Desafios entre motoristas: quem cria, quem entra, o que cada um vê e o que é apagado (supabase/desafios.sql).
-- Rode depois de tests/sql/base.sql e dos arquivos de supabase/ (veja o cabeçalho de base.sql). Termina com "DESAFIOS CERTO".
\set ON_ERROR_STOP on
\set VERBOSITY terse
insert into auth.users (email) values ('ana@x.com'), ('bia@x.com'), ('caio@x.com');
-- atalho do teste: envia um dia só
create function t.dia(d date, g numeric, k numeric, m bigint, v integer, l numeric, gs numeric default 0, cc numeric default 0, cat text default '') returns boolean language sql as $$
  select public.placar_enviar(array[d], jsonb_build_array(jsonb_build_object('dia', d, 'categoria', cat, 'ganho', g, 'gastos', gs, 'custoCarro', cc, 'km', k, 'ms', m, 'viagens', v, 'lucro', l))) $$;
set role authenticated;

select t.como('ana@x.com');
select t.falha($$select public.desafio_criar('', 'Ana')$$, 'falta_nome', 'o desafio precisa de nome');
select t.falha($$select public.desafio_criar('X', 'Ana', '', '', 5)$$, 'periodo_invalido', 'só vale 1, 7 ou 30 dias');
select t.falha($$select public.desafio_entrar('NAOEXISTE', 'Ana')$$, 'codigo_invalido', 'código errado é recusado');
select t.falha($$select count(*) from public.desafios$$, 'permission denied', 'a tabela não é lida direto pelo app');
select t.falha($$select count(*) from public.desafio_placar$$, 'permission denied', 'o placar não é lido direto pelo app');
select t.confere(t.dia(public.desafio_hoje(), 300, 100, 3600000, 5, 200) = false, 'sem desafio, nada é guardado');

create temp table codigo as select (public.desafio_criar('Galera', 'Ana', 'Onix', 'UberX', 7, '{"gastos": true, "carro": true, "vence": "geral", "extra": "x"}') ->> 'codigo') as c;
select t.confere(t.dia(public.desafio_hoje(), 300, 100, 3600000, 5, 200, 80, 40), 'com desafio, o dia é guardado com gastos e custo do carro');
select t.falha($$select t.dia(public.desafio_hoje(), -1, 0, 0, 0, 0)$$, 'valor_invalido', 'valor negativo é recusado');
select t.falha($$select t.dia(public.desafio_hoje() + 5, 1, 0, 0, 0, 0)$$, 'valor_invalido', 'dia no futuro é recusado');

select t.como('caio@x.com');
select t.confere(json_array_length(public.desafios_meus()) = 0, 'quem não entrou não vê o desafio');

select t.como('bia@x.com');
select t.confere((public.desafio_ver((select c from codigo)) -> 'regras' ->> 'carro')::boolean, 'antes de entrar, a Bia vê as regras');
select t.confere((public.desafio_ver((select c from codigo)) ->> 'pessoas')::int = 1, 'e quantas pessoas já estão');
select t.confere((public.desafio_ver((select c from codigo)) -> 'regras' ->> 'vence') = 'geral', 'e como se decide quem vence');
select t.confere(public.desafio_ver((select c from codigo))::text not like '%extra%', 'só as regras conhecidas são guardadas');
select t.confere(public.desafio_ver((select c from codigo))::text not like '%Ana%', 'mas não vê quem está nem os valores');
select t.falha($$select public.desafio_entrar((select c from codigo), 'Bia')$$, 'aceite_regras', 'sem aceitar as regras não entra');
select public.desafio_entrar(lower((select c from codigo)), 'Bia', 'HB20', 'Comfort', true);
create temp table codigo2 as select (public.desafio_criar('Só Black', 'Bia', 'Civic', 'Black', 7, '{"gastos": true, "carro": false, "vence": "km", "categorias": ["Black", "99Pop"]}') ->> 'codigo') as c;
select t.confere((public.desafio_ver((select c from codigo2)) -> 'regras' -> 'categorias')::text = '["Black"]', 'o desafio guarda só as categorias que competem');
select public.desafio_entrar((select c from codigo2), 'Bia', 'Civic', 'Black', true);
do $$ declare cod text := (select c from codigo2); begin perform public.desafio_entrar(cod, 'Bia', 'HB20', 'Comfort', true); raise exception 'deveria recusar'; exception when others then if sqlerrm <> 'categoria_fora' then raise; end if; end $$;
select public.desafio_sair((public.desafio_entrar((select c from codigo2), 'Bia', 'Civic', 'Black', true) ->> 'id')::uuid);
select t.confere(json_array_length(public.desafios_meus() -> 0 -> 'membros') = 2, 'a Bia entra pelo código e vê as duas pessoas');
select t.confere((public.desafios_meus() -> 0 -> 'membros' -> 0 -> 'dias' -> 0 ->> 'ganho')::numeric = 300, 'a Bia vê o total do dia da Ana');
select t.confere((public.desafios_meus() -> 0 -> 'membros' -> 0 -> 'dias' -> 0 ->> 'gastos')::numeric = 80, 'e os gastos, para a regra valer para todos');
select t.confere((public.desafios_meus() -> 0 -> 'regras' ->> 'gastos')::boolean, 'as regras seguem visíveis dentro do desafio');
select t.confere(((public.desafios_meus() -> 0 -> 'membros' -> 1 ->> 'eu')::boolean), 'o app sabe qual linha é a da própria pessoa');
select t.confere(public.desafios_meus()::text not like '%ana@x.com%', 'o e-mail de ninguém aparece');
select public.desafio_entrar((select c from codigo), 'Bia R', 'HB20', 'Comfort', true);
select t.confere(json_array_length(public.desafios_meus() -> 0 -> 'membros') = 2, 'entrar de novo só atualiza o apelido');
select t.confere(t.dia(public.desafio_hoje(), 150, 50, 3600000, 3, 100), 'a Bia envia o dia dela');
select public.desafio_sair((public.desafios_meus() -> 0 ->> 'id')::uuid);
select t.confere(json_array_length(public.desafios_meus()) = 0, 'quem sai deixa de ver o desafio');
reset role;
select t.confere((select count(*) from public.desafio_placar where user_id = t.id('bia@x.com')) = 0, 'ao sair, os totais da pessoa são apagados');
set role authenticated;

select t.como('ana@x.com');
select t.confere(json_array_length(public.desafios_meus() -> 0 -> 'membros') = 1, 'a Ana continua no desafio');
select public.desafio_sair((public.desafios_meus() -> 0 ->> 'id')::uuid);
reset role;
select t.confere((select count(*) from public.desafios) = 0, 'desafio sem ninguém é apagado');
-- ranking geral: só quem entrou, com pelo menos 10 horas, separado por categoria
set role authenticated;
select t.como('ana@x.com');
select public.ranking_entrar('Ana', 'Onix', 'UberX');
select t.confere(t.dia(public.desafio_hoje(), 500, 200, 36000000, 20, 300, 0, 0, 'UberX'), 'quem está no ranking envia o dia');
select t.como('bia@x.com');
select public.ranking_entrar('Bia', 'Corolla', 'Black');
select t.confere(public.placar_enviar(array[public.desafio_hoje()], jsonb_build_array(
  jsonb_build_object('dia', public.desafio_hoje(), 'categoria', 'Black', 'ganho', 900, 'km', 150, 'ms', 36000000),
  jsonb_build_object('dia', public.desafio_hoje(), 'categoria', 'UberX', 'ganho', 100, 'km', 90, 'ms', 7200000))), 'a Bia rodou em duas categorias no mesmo dia');
select t.como('caio@x.com');
select public.ranking_entrar('Caio', 'Kwid', 'UberX');
select t.confere(t.dia(public.desafio_hoje(), 100, 10, 7200000, 2, 50, 0, 0, 'UberX'), 'o Caio roda pouco');
select t.confere((public.ranking_geral('hora') ->> 'total')::int = 2, 'na semana, quem rodou menos de 10 horas fica de fora');
select t.confere((public.ranking_geral('hora', '', 'dia') ->> 'total')::int = 3, 'no dia, 2 horas já bastam');
select t.confere((public.ranking_geral('hora', '', 'mes') ->> 'total')::int = 0, 'no mês, o mínimo é maior');
select t.confere((public.ranking_geral('hora') -> 'lista' -> 0 ->> 'apelido') = 'Bia', 'a Bia lidera por hora');
select t.confere((public.ranking_geral('km', 'UberX') -> 'lista' -> 0 ->> 'apelido') = 'Ana', 'a Ana lidera na categoria UberX');
select t.confere((public.ranking_geral('hora', 'Black') ->> 'total')::int = 1, 'o filtro de categoria separa a lista');
select t.confere((public.ranking_geral('total', 'Black') -> 'lista' -> 0 ->> 'valor')::numeric = 900, 'na lista de Black conta só o que foi rodado em Black');
select t.confere((public.ranking_geral('total', 'UberX') ->> 'total')::int = 1, 'as 2 horas de UberX da Bia não bastam para a lista de UberX');
select t.confere((public.ranking_geral('total', '') -> 'lista' -> 0 ->> 'valor')::numeric = 1000, 'em Todas, as categorias se somam');
select t.confere(public.ranking_geral('hora')::text not like '%@x.com%', 'o e-mail de ninguém aparece no ranking');
select t.falha($$select count(*) from public.ranking_perfis$$, 'permission denied', 'a tabela do ranking não é lida direto');
select public.ranking_sair();
select t.confere((public.ranking_geral('hora') ->> 'participo')::boolean = false, 'o Caio saiu do ranking');
reset role;
select t.confere((select count(*) from public.desafio_placar where user_id = t.id('caio@x.com')) = 0, 'ao sair do ranking, os totais são apagados');
select 'DESAFIOS CERTO';
