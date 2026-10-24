-- =====================================================================
-- Meus Gastos — aviso de erros do app (v142)
-- Rode uma vez no Supabase: SQL Editor → New query → cole tudo → Run. Pode rodar de novo sem problema.
-- O app manda para cá, sem dado pessoal, a mensagem de um erro que aconteceu no aparelho de alguém.
-- Qualquer pessoa só consegue GRAVAR; ler só pelo painel do Supabase (ninguém lê pelo app).
-- Para ver os erros: select * from public.erros_app order by criado desc limit 50;
-- Para limpar os antigos: delete from public.erros_app where criado < now() - interval '60 days';
-- =====================================================================
create table if not exists public.erros_app (
  id         bigint generated always as identity primary key,
  criado     timestamptz not null default now(),
  versao     text check (char_length(versao) <= 20),
  mensagem   text not null check (char_length(mensagem) <= 500),
  pilha      text check (char_length(pilha) <= 2000),
  tela       text check (char_length(tela) <= 100),
  navegador  text check (char_length(navegador) <= 200)
);
alter table public.erros_app enable row level security;
drop policy if exists "qualquer um avisa erro" on public.erros_app;
create policy "qualquer um avisa erro" on public.erros_app for insert to anon, authenticated with check (true);
revoke all on public.erros_app from anon, authenticated;
grant insert on public.erros_app to anon, authenticated;
create index if not exists erros_app_criado on public.erros_app (criado desc);
