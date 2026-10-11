-- =====================================================================
-- Meus Gastos — pedidos de melhoria e correção feitos pelas pessoas dentro do app
-- Rode este arquivo uma vez no Supabase: SQL Editor → New query → cole tudo → Run.
-- Pode rodar de novo sem problema: nada é apagado e nada é duplicado.
--
-- Como funciona:
--   1. Em Mais → "Sugerir melhoria ou correção", a pessoa escolhe o tipo e escreve o pedido.
--   2. O pedido chega nesta tabela. Cada pessoa vê só os próprios pedidos (e a resposta que você escrever).
--   3. Você lê os pedidos em Table Editor → sugestoes (ou pede para o Claude listar).
--      Para responder: abra a linha, escreva em "resposta" e troque "status" (nova → analisando → feita ou nao_vai).
--   4. Limite de 10 pedidos por pessoa por dia, para ninguém lotar a caixa.
-- =====================================================================

create table if not exists public.sugestoes (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  email     text default lower(auth.jwt() ->> 'email'),                     -- para você saber quem escreveu e poder responder
  tipo      text not null default 'melhoria' check (tipo in ('melhoria', 'correcao', 'outro')),
  texto     text not null check (char_length(btrim(texto)) between 5 and 2000),
  tela      text check (char_length(tela) <= 60),                           -- em que parte do app a pessoa estava
  versao    text check (char_length(versao) <= 40),                         -- versão do app, para achar o erro certo
  status    text not null default 'nova' check (status in ('nova', 'analisando', 'feita', 'nao_vai')),
  resposta  text check (char_length(resposta) <= 2000),                     -- o que você quer dizer de volta para a pessoa
  criado    timestamptz not null default now(),
  atualizado timestamptz not null default now()
);
create index if not exists sugestoes_user_idx on public.sugestoes (user_id, criado desc);
create index if not exists sugestoes_status_idx on public.sugestoes (status, criado desc);
alter table public.sugestoes enable row level security;

-- A pessoa lê só os próprios pedidos e cria novos. Ela não muda status nem resposta: isso é com você.
drop policy if exists "ver os meus" on public.sugestoes;
create policy "ver os meus" on public.sugestoes for select using (user_id = auth.uid());
drop policy if exists "enviar o meu" on public.sugestoes;
create policy "enviar o meu" on public.sugestoes for insert with check (user_id = auth.uid() and status = 'nova' and resposta is null);

-- No máximo 10 pedidos por pessoa a cada 24 horas.
create or replace function public.sugestoes_limite() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.sugestoes s where s.user_id = new.user_id and s.criado > now() - interval '24 hours') >= 10 then
    raise exception 'limite_diario' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke all on function public.sugestoes_limite() from public, anon, authenticated;
drop trigger if exists sugestoes_limite on public.sugestoes;
create trigger sugestoes_limite before insert on public.sugestoes for each row execute function public.sugestoes_limite();

-- Para listar os pedidos novos (no SQL Editor):
--   select criado, tipo, email, tela, versao, texto from public.sugestoes where status = 'nova' order by criado desc;
-- Para responder:
--   update public.sugestoes set status = 'feita', resposta = 'Pronto! Já está no app.', atualizado = now() where id = '...';
