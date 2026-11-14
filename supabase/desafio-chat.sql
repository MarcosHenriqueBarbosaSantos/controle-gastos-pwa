-- =====================================================================
-- Meus Gastos — conversa do desafio (chat de texto entre os participantes)
-- Rode este arquivo UMA vez no Supabase: SQL Editor → New query → cole tudo → Run.
-- Pode rodar de novo sem problema. Precisa de desafios.sql e desafios-grande.sql já rodados.
--
-- Como funciona:
--   1. Só quem está no desafio lê e escreve na conversa dele. Quem foi removido perde o acesso na hora.
--   2. Cada mensagem guarda o apelido de quem escreveu (nunca e-mail ou nome verdadeiro), até 280 letras.
--   3. Contra abuso: no máximo 1 mensagem a cada 3 segundos e 20 por minuto por pessoa.
--   4. Quem criou o desafio pode apagar qualquer mensagem; cada pessoa pode apagar as suas.
--   5. O app busca as mensagens novas a cada poucos segundos, só enquanto a conversa está aberta.
-- As tabelas não têm política de leitura: o app só chega aqui pelas funções abaixo.
-- =====================================================================

create table if not exists public.desafio_mensagens (
  id         bigint generated always as identity primary key,
  desafio_id uuid not null references public.desafios (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  apelido    text not null check (char_length(apelido) between 1 and 24),
  texto      text not null check (char_length(texto) between 1 and 280),
  criado     timestamptz not null default now()
);
create index if not exists desafio_mensagens_desafio on public.desafio_mensagens (desafio_id, id desc);
create index if not exists desafio_mensagens_user on public.desafio_mensagens (user_id, criado desc);
alter table public.desafio_mensagens enable row level security;
revoke all on public.desafio_mensagens from public, anon, authenticated;

-- Mensagens do desafio depois de "depois" (0 = as últimas 50), da mais antiga para a mais nova.
create or replace function public.desafio_msgs(d uuid, depois bigint default 0)
returns json language plpgsql stable security definer set search_path = '' as $$
declare eu uuid := (select auth.uid());
begin
  if eu is null then raise exception 'sem_login'; end if;
  if not exists (select 1 from public.desafio_membros m where m.desafio_id = d and m.user_id = eu) then raise exception 'fora_do_desafio'; end if;
  return coalesce((select json_agg(x order by x.id) from (
    select g.id, g.apelido, g.texto, g.criado, (g.user_id = eu) as eu,
           (g.user_id = eu or exists (select 1 from public.desafios s where s.id = d and s.dono = eu)) as pode_apagar
    from public.desafio_mensagens g where g.desafio_id = d and g.id > coalesce(depois, 0)
    order by g.id desc limit 50) x), '[]'::json);
end $$;

-- Mandar uma mensagem: o apelido vem do cadastro da pessoa no desafio.
create or replace function public.desafio_msg_enviar(d uuid, t text)
returns json language plpgsql security definer set search_path = '' as $$
declare eu uuid := (select auth.uid()); ap text; txt text := btrim(coalesce(t, '')); novo public.desafio_mensagens;
begin
  if eu is null then raise exception 'sem_login'; end if;
  select m.apelido into ap from public.desafio_membros m where m.desafio_id = d and m.user_id = eu;
  if ap is null then raise exception 'fora_do_desafio'; end if;
  if char_length(txt) = 0 then raise exception 'vazia'; end if;
  if char_length(txt) > 280 then raise exception 'longa'; end if;
  if exists (select 1 from public.desafio_mensagens g where g.user_id = eu and g.criado > now() - interval '3 seconds') then raise exception 'devagar'; end if;
  if (select count(*) from public.desafio_mensagens g where g.user_id = eu and g.criado > now() - interval '1 minute') >= 20 then raise exception 'devagar'; end if;
  insert into public.desafio_mensagens (desafio_id, user_id, apelido, texto) values (d, eu, ap, txt) returning * into novo;
  return json_build_object('id', novo.id, 'apelido', novo.apelido, 'texto', novo.texto, 'criado', novo.criado, 'eu', true, 'pode_apagar', true);
end $$;

-- Apagar: a própria mensagem, ou qualquer uma se a pessoa criou o desafio.
create or replace function public.desafio_msg_apagar(m bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare eu uuid := (select auth.uid());
begin
  if eu is null then raise exception 'sem_login'; end if;
  delete from public.desafio_mensagens g where g.id = m and (g.user_id = eu or exists (select 1 from public.desafios s where s.id = g.desafio_id and s.dono = eu));
end $$;

revoke all on function public.desafio_msgs(uuid, bigint), public.desafio_msg_enviar(uuid, text), public.desafio_msg_apagar(bigint) from public, anon;
grant execute on function public.desafio_msgs(uuid, bigint), public.desafio_msg_enviar(uuid, text), public.desafio_msg_apagar(bigint) to authenticated;
