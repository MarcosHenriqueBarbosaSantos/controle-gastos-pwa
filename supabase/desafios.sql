-- =====================================================================
-- Meus Gastos — desafios entre motoristas
-- Um grupo fechado de amigos compara 1, 7 ou 30 dias: faturamento, melhor dia, ganho por hora e por km.
-- Rode este arquivo uma vez no Supabase: SQL Editor → New query → cole tudo → Run.
-- Pode rodar de novo sem problema: nada é apagado e nada é duplicado.
-- Precisa de schema.sql já rodado.
--
-- Como funciona:
--   1. Uma pessoa cria o desafio (desafio_criar) e recebe um código para mandar aos amigos.
--   2. Quem tem o código vê as regras (desafio_ver), aceita e entra (desafio_entrar) com um apelido, o carro e a categoria.
--      As regras são escolhidas ao criar e não têm como mudar depois: não existe função que altere.
--   3. O app manda só os totais de cada dia (placar_enviar). Lançamentos, contas e valores do mês nunca saem da conta da pessoa.
--   4. Quem não está em nenhum desafio não envia nada: placar_enviar não guarda o dia.
--   5. Ao sair (desafio_sair), se a pessoa não estiver em outro desafio, os totais dela são apagados.
--   6. O ranking geral é opcional (ranking_entrar): mostra só apelido, veículo, categoria e o resultado de hoje, da semana ou do mês.
--      Para entrar na lista é preciso ter rodado um mínimo de horas no período (2, 10 ou 30), e valores fora do comum ficam de fora.
-- As tabelas não têm política de leitura: o app só chega aqui pelas funções abaixo.
-- =====================================================================

create table if not exists public.desafios (
  id      uuid primary key default gen_random_uuid(),
  nome    text not null check (char_length(nome) between 1 and 40),
  codigo  text not null unique,
  regras  jsonb not null default '{"gastos": true, "carro": false, "vence": "km"}'::jsonb,   -- o que é descontado e como se decide quem vence
  dono    uuid not null references auth.users (id) on delete cascade,
  inicio  date not null,
  fim     date not null,
  criado  timestamptz not null default now()
);
create table if not exists public.desafio_membros (
  desafio_id uuid not null references public.desafios (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  apelido    text not null check (char_length(apelido) between 1 and 24),
  carro      text not null default '' check (char_length(carro) <= 30),
  categoria  text not null default '' check (char_length(categoria) <= 20),
  entrou     timestamptz not null default now(),   -- entrar exige aceitar as regras
  primary key (desafio_id, user_id)
);
create index if not exists desafio_membros_user on public.desafio_membros (user_id);
create table if not exists public.desafio_placar (
  user_id    uuid not null references auth.users (id) on delete cascade,
  dia        date not null,
  categoria  text not null default '' check (char_length(categoria) <= 20),   -- quem roda em duas categorias no dia tem uma linha para cada
  ganho      numeric(10,2) not null default 0 check (ganho >= 0),
  gastos     numeric(10,2) not null default 0 check (gastos >= 0),        -- combustível, pedágio e o que mais foi lançado
  custo_carro numeric(10,2) not null default 0 check (custo_carro >= 0),  -- km do dia vezes o custo do carro
  km         numeric(8,1) not null default 0 check (km >= 0),
  ms         bigint not null default 0 check (ms >= 0),
  viagens    integer not null default 0 check (viagens >= 0),
  lucro      numeric(10,2) not null default 0,
  atualizado timestamptz not null default now(),
  primary key (user_id, dia, categoria)
);
create table if not exists public.ranking_perfis (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  apelido    text not null check (char_length(apelido) between 1 and 24),
  carro      text not null default '' check (char_length(carro) <= 30),
  categoria  text not null default '' check (char_length(categoria) <= 20),
  entrou     timestamptz not null default now()
);
alter table public.ranking_perfis enable row level security;
revoke all on public.ranking_perfis from public, anon, authenticated;
alter table public.desafios enable row level security;
alter table public.desafio_membros enable row level security;
alter table public.desafio_placar enable row level security;
revoke all on public.desafios, public.desafio_membros, public.desafio_placar from public, anon, authenticated;

create or replace function public.desafio_hoje()
returns date language sql stable set search_path = '' as $$ select (now() at time zone 'America/Sao_Paulo')::date; $$;

create or replace function public.desafio_criar(n text, a text, c text default '', k text default '', dias integer default 7, r jsonb default '{}'::jsonb)
returns json language plpgsql security definer set search_path = '' as $$
declare eu uuid := auth.uid(); novo public.desafios; cod text; cats jsonb;
begin
  if eu is null then raise exception 'sem_login'; end if;
  if dias not in (1, 7, 30) then raise exception 'periodo_invalido'; end if;
  -- Quem pode entrar: só UberX, Comfort e Black competem por categoria. Vazio: todas.
  cats := coalesce((select jsonb_agg(v) from jsonb_array_elements_text(case when jsonb_typeof(r -> 'categorias') = 'array' then r -> 'categorias' else '[]'::jsonb end) v where v in ('UberX', 'Comfort', 'Black')), '[]'::jsonb);
  if jsonb_array_length(cats) > 0 and not cats ? trim(coalesce(k, '')) then raise exception 'categoria_fora'; end if;
  if char_length(trim(coalesce(n, ''))) = 0 or char_length(trim(coalesce(a, ''))) = 0 then raise exception 'falta_nome'; end if;
  if (select count(*) from public.desafios d where d.dono = eu and d.fim >= public.desafio_hoje()) >= 5 then raise exception 'limite'; end if;
  loop
    cod := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from public.desafios d where d.codigo = cod);
  end loop;
  insert into public.desafios (nome, codigo, dono, inicio, fim, regras)
    values (left(trim(n), 40), cod, eu, public.desafio_hoje(), public.desafio_hoje() + dias - 1,
      jsonb_build_object('gastos', coalesce((r ->> 'gastos')::boolean, true), 'carro', coalesce((r ->> 'carro')::boolean, false),
        'vence', case when r ->> 'vence' in ('geral', 'km', 'hora', 'sobra', 'total') then r ->> 'vence' else 'km' end, 'categorias', cats)) returning * into novo;
  insert into public.desafio_membros (desafio_id, user_id, apelido, carro, categoria)
    values (novo.id, eu, left(trim(a), 24), left(trim(coalesce(c, '')), 30), left(trim(coalesce(k, '')), 20));
  return json_build_object('id', novo.id, 'codigo', novo.codigo);
end $$;

-- O que a pessoa vê antes de entrar: nome, período, regras e quantos já estão.
create or replace function public.desafio_ver(cod text)
returns json language plpgsql stable security definer set search_path = '' as $$
declare alvo public.desafios;
begin
  if auth.uid() is null then raise exception 'sem_login'; end if;
  select * into alvo from public.desafios d where d.codigo = upper(trim(coalesce(cod, '')));
  if alvo.id is null then raise exception 'codigo_invalido'; end if;
  if alvo.fim < public.desafio_hoje() then raise exception 'encerrado'; end if;
  return json_build_object('nome', alvo.nome, 'codigo', alvo.codigo, 'inicio', alvo.inicio, 'fim', alvo.fim, 'regras', alvo.regras,
    'pessoas', (select count(*) from public.desafio_membros m where m.desafio_id = alvo.id));
end $$;

create or replace function public.desafio_entrar(cod text, a text, c text default '', k text default '', aceito boolean default false)
returns json language plpgsql security definer set search_path = '' as $$
declare eu uuid := auth.uid(); alvo public.desafios;
begin
  if eu is null then raise exception 'sem_login'; end if;
  if char_length(trim(coalesce(a, ''))) = 0 then raise exception 'falta_nome'; end if;
  select * into alvo from public.desafios d where d.codigo = upper(trim(coalesce(cod, '')));
  if alvo.id is null then raise exception 'codigo_invalido'; end if;
  if alvo.fim < public.desafio_hoje() then raise exception 'encerrado'; end if;
  if aceito is not true then raise exception 'aceite_regras'; end if;
  if jsonb_array_length(coalesce(alvo.regras -> 'categorias', '[]'::jsonb)) > 0 and not (alvo.regras -> 'categorias') ? trim(coalesce(k, '')) then raise exception 'categoria_fora'; end if;
  if (select count(*) from public.desafio_membros m where m.desafio_id = alvo.id and m.user_id <> eu) >= 30 then raise exception 'cheio'; end if;
  insert into public.desafio_membros (desafio_id, user_id, apelido, carro, categoria)
    values (alvo.id, eu, left(trim(a), 24), left(trim(coalesce(c, '')), 30), left(trim(coalesce(k, '')), 20))
    on conflict (desafio_id, user_id) do update set apelido = excluded.apelido, carro = excluded.carro, categoria = excluded.categoria;
  return json_build_object('id', alvo.id, 'codigo', alvo.codigo);
end $$;

create or replace function public.desafio_sair(d uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare eu uuid := auth.uid();
begin
  if eu is null then raise exception 'sem_login'; end if;
  delete from public.desafio_membros m where m.desafio_id = d and m.user_id = eu;
  delete from public.desafios x where x.id = d and not exists (select 1 from public.desafio_membros m where m.desafio_id = d);
  if not exists (select 1 from public.desafio_membros m where m.user_id = eu) and not exists (select 1 from public.ranking_perfis r where r.user_id = eu) then
    delete from public.desafio_placar p where p.user_id = eu;
  end if;
end $$;

create or replace function public.ranking_entrar(a text, c text default '', k text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare eu uuid := auth.uid();
begin
  if eu is null then raise exception 'sem_login'; end if;
  if char_length(trim(coalesce(a, ''))) = 0 then raise exception 'falta_nome'; end if;
  insert into public.ranking_perfis (user_id, apelido, carro, categoria) values (eu, left(trim(a), 24), left(trim(coalesce(c, '')), 30), left(trim(coalesce(k, '')), 20))
    on conflict (user_id) do update set apelido = excluded.apelido, carro = excluded.carro, categoria = excluded.categoria;
end $$;

create or replace function public.ranking_sair()
returns void language plpgsql security definer set search_path = '' as $$
declare eu uuid := auth.uid();
begin
  if eu is null then raise exception 'sem_login'; end if;
  delete from public.ranking_perfis r where r.user_id = eu;
  if not exists (select 1 from public.desafio_membros m where m.user_id = eu) then delete from public.desafio_placar p where p.user_id = eu; end if;
end $$;

-- Ranking do período. crit: 'hora', 'km' ou 'total'. cat vazio: todas as categorias. periodo: 'dia', 'semana' ou 'mes'.
-- Mostra os 50 primeiros e a posição de quem pediu.
create or replace function public.ranking_geral(crit text, cat text default '', periodo text default 'semana')
returns json language sql stable security definer set search_path = '' as $$
  with base as (
    select r.user_id, r.apelido, r.carro, coalesce(nullif(cat, ''), r.categoria) as categoria, sum(p.ganho) as ganho, sum(p.km) as km, sum(p.ms) as ms
    from public.ranking_perfis r join public.desafio_placar p on p.user_id = r.user_id
    where p.dia between public.desafio_hoje() - (case periodo when 'dia' then 0 when 'mes' then 29 else 6 end) and public.desafio_hoje() and (coalesce(cat, '') = '' or p.categoria = cat)
    group by r.user_id, r.apelido, r.carro, r.categoria
    having sum(p.ms) >= (case periodo when 'dia' then 2 when 'mes' then 30 else 10 end) * 3600000 and sum(p.ganho) / (sum(p.ms) / 3600000.0) <= 200
  ), conta as (
    select *, round(case crit when 'km' then ganho / nullif(km, 0) when 'total' then ganho else ganho / (ms / 3600000.0) end, 2) as valor from base
  ), lista as (
    select *, rank() over (order by valor desc) as pos from conta where valor is not null
  )
  select json_build_object(
    'participo', exists (select 1 from public.ranking_perfis r where r.user_id = auth.uid()),
    'total', (select count(*) from lista),
    'lista', coalesce((select json_agg(json_build_object('pos', l.pos, 'apelido', l.apelido, 'carro', l.carro, 'categoria', l.categoria, 'valor', l.valor, 'eu', l.user_id = auth.uid()) order by l.pos, l.apelido)
                       from lista l where l.pos <= 50 or l.user_id = auth.uid()), '[]'::json));
$$;

-- Guarda só os totais de cada dia, por categoria, e só de quem está no ranking ou em um desafio que cobre aquele dia.
-- Substitui os dias enviados de uma vez: uma jornada apagada ou com a categoria corrigida não deixa sobra no placar.
create or replace function public.placar_enviar(dias date[], linhas jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
declare eu uuid := auth.uid(); x jsonb; d date; g numeric; gs numeric; cc numeric; k numeric; m bigint; v integer; l numeric; no_ranking boolean; gravou boolean := false;
begin
  if eu is null then raise exception 'sem_login'; end if;
  if coalesce(array_length(dias, 1), 0) > 40 or jsonb_array_length(coalesce(linhas, '[]'::jsonb)) > 400 then raise exception 'valor_invalido'; end if;
  no_ranking := exists (select 1 from public.ranking_perfis r where r.user_id = eu);
  delete from public.desafio_placar p where p.user_id = eu and p.dia = any (dias);
  for x in select * from jsonb_array_elements(coalesce(linhas, '[]'::jsonb)) loop
    d := (x ->> 'dia')::date; g := coalesce((x ->> 'ganho')::numeric, 0); gs := coalesce((x ->> 'gastos')::numeric, 0); cc := coalesce((x ->> 'custoCarro')::numeric, 0);
    k := coalesce((x ->> 'km')::numeric, 0); m := coalesce((x ->> 'ms')::numeric, 0)::bigint; v := coalesce((x ->> 'viagens')::numeric, 0)::integer; l := coalesce((x ->> 'lucro')::numeric, 0);
    if d > public.desafio_hoje() + 1 or g < 0 or g > 20000 or k < 0 or k > 3000 or m < 0 or m > 86400000 or v < 0 or v > 500 or abs(l) > 20000 or gs < 0 or gs > 20000 or cc < 0 or cc > 20000 then raise exception 'valor_invalido'; end if;
    continue when not d = any (dias);
    continue when not no_ranking and not exists (select 1 from public.desafio_membros y join public.desafios z on z.id = y.desafio_id where y.user_id = eu and d between z.inicio and z.fim);
    insert into public.desafio_placar (user_id, dia, categoria, ganho, gastos, custo_carro, km, ms, viagens, lucro)
      values (eu, d, left(coalesce(x ->> 'categoria', ''), 20), g, gs, cc, k, m, v, l)
      on conflict (user_id, dia, categoria) do update set ganho = excluded.ganho, gastos = excluded.gastos, custo_carro = excluded.custo_carro, km = excluded.km, ms = excluded.ms, viagens = excluded.viagens, lucro = excluded.lucro, atualizado = now();
    gravou := true;
  end loop;
  return gravou;
end $$;

-- Os desafios da pessoa, com os totais de cada participante no período. Quem não participa não vê nada.
create or replace function public.desafios_meus()
returns json language sql stable security definer set search_path = '' as $$
  select coalesce(json_agg(json_build_object(
    'id', d.id, 'nome', d.nome, 'codigo', d.codigo, 'inicio', d.inicio, 'fim', d.fim, 'regras', d.regras,
    'membros', (select json_agg(json_build_object(
        'apelido', m.apelido, 'carro', m.carro, 'categoria', m.categoria, 'eu', m.user_id = auth.uid(),
        'dias', coalesce((select json_agg(json_build_object('dia', p.dia, 'ganho', p.ganho, 'gastos', p.gastos, 'custoCarro', p.custo_carro, 'km', p.km, 'ms', p.ms, 'viagens', p.viagens, 'lucro', p.lucro) order by p.dia)
                          from public.desafio_placar p where p.user_id = m.user_id and p.dia between d.inicio and d.fim), '[]'::json)
      ) order by m.entrou) from public.desafio_membros m where m.desafio_id = d.id)
  ) order by d.fim desc, d.criado desc), '[]'::json)
  from public.desafios d
  where exists (select 1 from public.desafio_membros x where x.desafio_id = d.id and x.user_id = auth.uid());
$$;

revoke all on function public.desafio_criar(text, text, text, text, integer, jsonb), public.desafio_ver(text), public.desafio_entrar(text, text, text, text, boolean), public.desafio_sair(uuid),
  public.placar_enviar(date[], jsonb), public.desafios_meus(),
  public.ranking_entrar(text, text, text), public.ranking_sair(), public.ranking_geral(text, text, text) from public, anon;
grant execute on function public.desafio_criar(text, text, text, text, integer, jsonb), public.desafio_ver(text), public.desafio_entrar(text, text, text, text, boolean), public.desafio_sair(uuid),
  public.placar_enviar(date[], jsonb), public.desafios_meus(),
  public.ranking_entrar(text, text, text), public.ranking_sair(), public.ranking_geral(text, text, text) to authenticated, service_role;
