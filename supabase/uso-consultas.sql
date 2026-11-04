-- Consultas prontas para olhar o uso do app. Rode uma de cada vez no Supabase: SQL Editor → New query → Run.
-- "Dispositivo" = um aparelho (ou navegador) que abriu o app. Uma pessoa com 2 aparelhos conta 2 vezes.

-- 1) Resumo dos últimos 14 dias: quantos aparelhos abriram o app e quantos eventos.
select date(criado at time zone 'America/Sao_Paulo') as dia, count(distinct dispositivo) as aparelhos, count(*) as eventos
from public.eventos_uso where criado > now() - interval '14 days' group by 1 order by 1 desc;

-- 2) Ativação: de quem abriu o app pela primeira vez, quantos fizeram a ação principal no MESMO DIA.
--    (motorista: iniciou jornada ou lançou; geral: lançou)
with primeiro as (
  select dispositivo, min(criado) as primeira from public.eventos_uso group by 1
), acao as (
  select p.dispositivo, bool_or(e.nome in ('jornada_iniciada', 'lancamento')) as agiu
  from primeiro p join public.eventos_uso e on e.dispositivo = p.dispositivo and e.criado < p.primeira + interval '24 hours'
  group by 1
)
select count(*) as aparelhos_novos, count(*) filter (where agiu) as agiram_no_primeiro_dia,
       round(100.0 * count(*) filter (where agiu) / nullif(count(*), 0)) as pct
from acao;

-- 3) Retorno: dos aparelhos que abriram o app há pelo menos N dias, quantos voltaram no dia N depois da primeira abertura (D1, D3, D7).
with primeiro as (
  select dispositivo, date(min(criado) at time zone 'America/Sao_Paulo') as d0 from public.eventos_uso group by 1
), dias as (
  select distinct dispositivo, date(criado at time zone 'America/Sao_Paulo') as d from public.eventos_uso where nome = 'aberto'
)
select n as dia_depois, count(*) filter (where p.d0 <= current_date - n) as elegiveis,
       count(*) filter (where p.d0 <= current_date - n and exists (select 1 from dias x where x.dispositivo = p.dispositivo and x.d = p.d0 + n)) as voltaram
from primeiro p cross join (values (1), (3), (7)) as v(n) group by n order by n;

-- 4) O que mais se usa (últimos 30 dias): eventos por tipo e aparelhos diferentes.
select nome, count(*) as vezes, count(distinct dispositivo) as aparelhos
from public.eventos_uso where criado > now() - interval '30 days' group by 1 order by 2 desc;

-- 5) Quais telas são abertas (as abas do app).
select dados->>'t' as tela, count(*) as vezes, count(distinct dispositivo) as aparelhos
from public.eventos_uso where nome = 'tela' and criado > now() - interval '30 days' group by 1 order by 2 desc;

-- 6) Quantos aparelhos usaram cada função de motorista.
select nome, count(distinct dispositivo) as aparelhos from public.eventos_uso
where nome in ('jornada_iniciada', 'jornada_encerrada', 'vale_usado', 'oferta', 'reserva_ligada', 'voz') group by 1 order by 2 desc;

-- 7) Quem usou em 4 ou mais dias diferentes nos últimos 7 dias.
select dispositivo, count(distinct date(criado at time zone 'America/Sao_Paulo')) as dias_de_uso
from public.eventos_uso where nome = 'aberto' and criado > now() - interval '7 days' group by 1 having count(distinct date(criado at time zone 'America/Sao_Paulo')) >= 4 order by 2 desc;

-- 8) Erros do app (tabela erros_app, v142), os mais frequentes dos últimos 7 dias.
select mensagem, versao, count(*) as vezes from public.erros_app where criado > now() - interval '7 days' group by 1, 2 order by 3 desc limit 20;
