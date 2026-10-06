-- Banco de teste parecido com o do Supabase (papéis, auth.users, auth.uid, auth.jwt) para conferir os arquivos de supabase/ em um PostgreSQL local.
-- Uso, a partir da raiz do projeto:
--   psql -f tests/sql/base.sql && for f in schema acesso conta casal; do psql -d cg -f supabase/$f.sql; done && psql -d cg -f tests/sql/casal-teste.sql
\set ON_ERROR_STOP on
drop database if exists cg; create database cg; \c cg
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text unique, last_sign_in_at timestamptz default now(), created_at timestamptz default now());
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
-- ajudantes de teste
create schema t; grant usage on schema t to authenticated;
create function t.como(e text) returns void language plpgsql security definer as $$
begin perform set_config('request.jwt.claims', (select json_build_object('sub', id, 'email', email)::text from auth.users where email = e), false); end $$;
create function t.id(e text) returns uuid language sql security definer as $$ select id from auth.users where email = e $$;
create function t.confere(c boolean, m text) returns void language plpgsql as $$ begin if c is not true then raise exception 'FALHOU: %', m; end if; raise notice 'ok: %', m; end $$;
create function t.falha(q text, esperado text, m text) returns void language plpgsql as $$
begin
  begin execute q; exception when others then
    if sqlerrm ~ esperado then raise notice 'ok: % (%)', m, sqlerrm; return; end if;
    raise exception 'FALHOU: % — veio "%", esperava "%"', m, sqlerrm, esperado;
  end;
  raise exception 'FALHOU: % — não deu erro', m;
end $$;
create function t.adm(q text) returns void language plpgsql security definer as $$ begin execute q; end $$;
