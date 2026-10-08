-- =====================================================================
-- Meus Gastos — avisos por e-mail e notificação no celular
-- Rode este arquivo uma vez no Supabase: SQL Editor → New query → cole tudo → Run.
-- Pode rodar de novo sem problema: nada é apagado e nada é duplicado.
-- =====================================================================

-- Aparelhos em que a pessoa ligou as notificações (um por navegador/celular).
create table if not exists public.avisos_push (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint    text not null,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now(),
  unique (user_id, endpoint)
);
alter table public.avisos_push enable row level security;
drop policy if exists "dono" on public.avisos_push;
create policy "dono" on public.avisos_push for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Controle de envio: um aviso por pessoa por dia. Só o servidor lê e escreve (sem política de acesso).
create table if not exists public.avisos_enviados (
  user_id     uuid not null references auth.users (id) on delete cascade,
  dia         date not null,
  canais      text,
  created_at  timestamptz not null default now(),
  primary key (user_id, dia)
);
alter table public.avisos_enviados enable row level security;

-- Chaves das notificações, criadas pelo servidor na primeira vez. Só o servidor lê (sem política de acesso).
create table if not exists public.avisos_chaves (
  id          smallint primary key default 1 check (id = 1),
  publica     text not null,
  privada     jsonb not null,
  created_at  timestamptz not null default now()
);
alter table public.avisos_chaves enable row level security;

-- Segredo que só o agendamento conhece, para ninguém de fora disparar a rotina diária.
select vault.create_secret(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), 'avisos_segredo', 'Segredo do agendamento de avisos do Meus Gastos')
where not exists (select 1 from vault.secrets where name = 'avisos_segredo');

create or replace function public.avisos_confere_segredo(s text)
returns boolean language sql security definer set search_path = '' as $$
  select exists (select 1 from vault.decrypted_secrets where name = 'avisos_segredo' and decrypted_secret = s);
$$;
revoke all on function public.avisos_confere_segredo(text) from public, anon, authenticated;
grant execute on function public.avisos_confere_segredo(text) to service_role;

-- Agendamento: todo dia às 11h00 UTC (8h00 em Brasília) o banco chama o servidor de avisos.
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.unschedule(jobid) from cron.job where jobname = 'meus-gastos-avisos';
select cron.schedule('meus-gastos-avisos', '0 11 * * *', $cron$
  select net.http_post(
    url := 'https://ebaivarzdqekmhnyrwxo.supabase.co/functions/v1/avisos',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-avisos-segredo', (select decrypted_secret from vault.decrypted_secrets where name = 'avisos_segredo')),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000);
$cron$);

-- Agendamento da noite: todo dia às 23h00 UTC (20h00 em Brasília).
-- No domingo manda o resumo da semana; nos outros dias, o lembrete para quem pediu e não anotou nada.
select cron.unschedule(jobid) from cron.job where jobname = 'meus-gastos-noite';
select cron.schedule('meus-gastos-noite', '0 23 * * *', $cron$
  select net.http_post(
    url := 'https://ebaivarzdqekmhnyrwxo.supabase.co/functions/v1/avisos',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-avisos-segredo', (select decrypted_secret from vault.decrypted_secrets where name = 'avisos_segredo')),
    body := '{"rotina":"noite"}'::jsonb,
    timeout_milliseconds := 60000);
$cron$);
