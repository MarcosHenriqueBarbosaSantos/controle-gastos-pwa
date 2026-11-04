-- =====================================================================
-- Meus Gastos — medição de uso do app (v233)
-- Rode uma vez no Supabase: SQL Editor → New query → cole tudo → Run. Pode rodar de novo sem problema.
-- O app manda para cá, sem dado pessoal, o que a pessoa usou: abrir o app, trocar de tela, iniciar uma jornada, lançar etc.
-- Nada de valores, descrições, nomes, e-mails ou contas. O "dispositivo" é um código aleatório guardado no aparelho (não é o login).
-- Qualquer pessoa só consegue GRAVAR; ler só pelo painel do Supabase (ninguém lê pelo app).
-- Consultas prontas: supabase/uso-consultas.sql. Para limpar os antigos:
--   delete from public.eventos_uso where criado < now() - interval '180 days';
-- =====================================================================
create table if not exists public.eventos_uso (
  id           bigint generated always as identity primary key,
  criado       timestamptz not null default now(),
  dispositivo  text not null check (char_length(dispositivo) between 8 and 40),
  nome         text not null check (nome ~ '^[a-z_]{2,40}$'),
  versao       text check (char_length(versao) <= 20),
  perfil       text check (perfil in ('motorista', 'geral')),
  dados        jsonb not null default '{}'::jsonb check (octet_length(dados::text) <= 300)
);
alter table public.eventos_uso enable row level security;
drop policy if exists "qualquer um registra uso" on public.eventos_uso;
create policy "qualquer um registra uso" on public.eventos_uso for insert to anon, authenticated with check (true);
revoke all on public.eventos_uso from anon, authenticated;
grant insert on public.eventos_uso to anon, authenticated;
create index if not exists eventos_uso_criado on public.eventos_uso (criado desc);
create index if not exists eventos_uso_dispositivo on public.eventos_uso (dispositivo, criado);
create index if not exists eventos_uso_nome on public.eventos_uso (nome, criado desc);
