-- =====================================================================
-- Meus Gastos — desafios para muita gente (de 30 para 200 participantes) e quem cria pode remover participantes
-- Rode este arquivo UMA vez no Supabase: SQL Editor → New query → cole tudo → Run.
-- Pode rodar de novo sem problema. Precisa de desafios.sql (e desafios-categorias.sql) já rodados.
--
-- O que muda:
--   1. O limite de participantes por desafio sobe de 30 para 200 (função desafio_entrar).
--   2. Quem criou o desafio (o "dono") pode remover um participante (função desafio_remover).
--      A pessoa removida não volta pelo mesmo código: fica na lista desafio_banidos.
--   3. desafios_meus passa a dizer se a pessoa é o dono ('dono') e dá a cada participante um identificador
--      que não revela quem ele é ('mid'): só serve para o dono pedir a remoção.
-- O que NÃO muda: ninguém vê e-mail, nome verdadeiro ou lançamentos de ninguém; só apelido, carro, categoria e os totais do placar.
-- =====================================================================

create table if not exists public.desafio_banidos (
  desafio_id uuid not null references public.desafios (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  em         timestamptz not null default now(),
  primary key (desafio_id, user_id)
);
alter table public.desafio_banidos enable row level security;
revoke all on public.desafio_banidos from public, anon, authenticated;

-- Entrar: igual à versão anterior, com o limite de 200 e a checagem de quem foi removido.
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
  if exists (select 1 from public.desafio_banidos b where b.desafio_id = alvo.id and b.user_id = eu) then raise exception 'removido'; end if;
  if jsonb_array_length(coalesce(alvo.regras -> 'categorias', '[]'::jsonb)) > 0 and not (alvo.regras -> 'categorias') ? trim(coalesce(k, '')) then raise exception 'categoria_fora'; end if;
  if (select count(*) from public.desafio_membros m where m.desafio_id = alvo.id and m.user_id <> eu) >= 200 then raise exception 'cheio'; end if;
  insert into public.desafio_membros (desafio_id, user_id, apelido, carro, categoria)
    values (alvo.id, eu, left(trim(a), 24), left(trim(coalesce(c, '')), 30), left(trim(coalesce(k, '')), 20))
    on conflict (desafio_id, user_id) do update set apelido = excluded.apelido, carro = excluded.carro, categoria = excluded.categoria;
  return json_build_object('id', alvo.id, 'codigo', alvo.codigo);
end $$;

-- Remover um participante: só o dono, e nunca a si mesmo. 'm' é o 'mid' que desafios_meus devolve.
create or replace function public.desafio_remover(d uuid, m text)
returns void language plpgsql security definer set search_path = '' as $$
declare eu uuid := auth.uid(); alvo uuid;
begin
  if eu is null then raise exception 'sem_login'; end if;
  if not exists (select 1 from public.desafios x where x.id = d and x.dono = eu) then raise exception 'so_dono'; end if;
  select mm.user_id into alvo from public.desafio_membros mm where mm.desafio_id = d and md5(d::text || mm.user_id::text) = m;
  if alvo is null then raise exception 'sem_membro'; end if;
  if alvo = eu then raise exception 'proprio'; end if;
  delete from public.desafio_membros mm where mm.desafio_id = d and mm.user_id = alvo;
  insert into public.desafio_banidos (desafio_id, user_id) values (d, alvo) on conflict do nothing;
end $$;

-- Os desafios da pessoa: igual à versão anterior, com 'dono' (é o criador?) e 'mid' em cada participante.
create or replace function public.desafios_meus()
returns json language sql stable security definer set search_path = '' as $$
  select coalesce(json_agg(json_build_object(
    'id', d.id, 'nome', d.nome, 'codigo', d.codigo, 'inicio', d.inicio, 'fim', d.fim, 'regras', d.regras, 'dono', d.dono = auth.uid(),
    'membros', (select json_agg(json_build_object(
        'apelido', m.apelido, 'carro', m.carro, 'categoria', m.categoria, 'eu', m.user_id = auth.uid(), 'mid', md5(d.id::text || m.user_id::text),
        'dias', coalesce((select json_agg(json_build_object('dia', p.dia, 'ganho', p.ganho, 'gastos', p.gastos, 'custoCarro', p.custo_carro, 'km', p.km, 'ms', p.ms, 'viagens', p.viagens, 'lucro', p.lucro) order by p.dia)
                          from public.desafio_placar p where p.user_id = m.user_id and p.dia between d.inicio and d.fim), '[]'::json)
      ) order by m.entrou) from public.desafio_membros m where m.desafio_id = d.id)
  ) order by d.fim desc, d.criado desc), '[]'::json)
  from public.desafios d
  where exists (select 1 from public.desafio_membros x where x.desafio_id = d.id and x.user_id = auth.uid());
$$;

revoke all on function public.desafio_entrar(text, text, text, text, boolean), public.desafio_remover(uuid, text), public.desafios_meus() from public, anon;
grant execute on function public.desafio_entrar(text, text, text, text, boolean), public.desafio_remover(uuid, text), public.desafios_meus() to authenticated, service_role;
