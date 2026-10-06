-- =====================================================================
-- Meus Gastos — acesso de quem comprou (plano anual vendido pela Hotmart)
-- Rode este arquivo uma vez no Supabase: SQL Editor → New query → cole tudo → Run.
-- Pode rodar de novo sem problema: nada é apagado e nada é duplicado.
--
-- Como funciona:
--   1. A Hotmart avisa o servidor (função "hotmart") a cada compra, renovação, cancelamento ou reembolso.
--   2. O servidor anota em "acessos" o e-mail de quem comprou e até quando o acesso vale.
--   3. Com a cobrança LIGADA, só grava dados quem tem acesso em dia. Ler e apagar os próprios dados
--      continua sempre liberado: os dados são da pessoa, mesmo sem renovar.
--   4. A cobrança começa DESLIGADA: enquanto estiver assim, tudo funciona como antes.
-- =====================================================================

-- Chave geral: a cobrança está valendo?
create table if not exists public.acesso_config (
  id          smallint primary key default 1 check (id = 1),
  cobranca    boolean not null default false,
  atualizado  timestamptz not null default now()
);
insert into public.acesso_config (id) values (1) on conflict (id) do nothing;
alter table public.acesso_config enable row level security;   -- sem política: só o servidor mexe

-- Quem tem acesso. A chave é o e-mail (sempre em minúsculas), porque a pessoa pode comprar antes de criar a conta.
create table if not exists public.acessos (
  email       text primary key check (email = lower(email)),
  status      text not null default 'ativo' check (status in ('ativo', 'cancelado', 'reembolsado')),
  ate         date,                                   -- último dia de acesso; vazio = sem data de fim (cortesia)
  origem      text not null default 'hotmart' check (origem in ('hotmart', 'cortesia')),
  transacao   text,                                   -- código da compra na Hotmart
  assinante   text,                                   -- código do assinante na Hotmart
  criado      timestamptz not null default now(),
  atualizado  timestamptz not null default now()
);
alter table public.acessos enable row level security;
drop policy if exists "meu acesso" on public.acessos;
create policy "meu acesso" on public.acessos for select
  using (email = lower(auth.jwt() ->> 'email'));       -- cada pessoa vê só a própria linha; ninguém grava pelo app

-- Registro dos avisos recebidos da Hotmart, para conferir o que aconteceu. Só o servidor lê e escreve.
create table if not exists public.acesso_eventos (
  id         bigint generated always as identity primary key,
  recebido   timestamptz not null default now(),
  evento     text,
  email      text,
  transacao  text,
  efeito     text
);
alter table public.acesso_eventos enable row level security;

-- A pessoa que está logada tem acesso? Com a cobrança desligada, sempre tem.
-- "cancelado" quer dizer que a renovação foi cancelada: o acesso continua até o fim do período pago.
create or replace function public.tem_acesso()
returns boolean language sql stable security definer set search_path = '' as $$
  select not coalesce((select c.cobranca from public.acesso_config c where c.id = 1), false)
      or exists (select 1 from public.acessos a
                 where a.email = lower(auth.jwt() ->> 'email')
                   and a.status in ('ativo', 'cancelado')
                   and (a.ate is null or a.ate >= (now() at time zone 'America/Sao_Paulo')::date));
$$;
revoke all on function public.tem_acesso() from public, anon;
grant execute on function public.tem_acesso() to authenticated, service_role;

-- O que o app mostra para a pessoa: se a cobrança vale, se ela tem acesso e até quando.
create or replace function public.meu_acesso()
returns json language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'cobranca', coalesce((select c.cobranca from public.acesso_config c where c.id = 1), false),
    'ativo',    public.tem_acesso(),
    'ate',      (select a.ate    from public.acessos a where a.email = lower(auth.jwt() ->> 'email')),
    'status',   (select a.status from public.acessos a where a.email = lower(auth.jwt() ->> 'email')),
    'origem',   (select a.origem from public.acessos a where a.email = lower(auth.jwt() ->> 'email')));
$$;
revoke all on function public.meu_acesso() from public, anon;
grant execute on function public.meu_acesso() to authenticated, service_role;

-- Trava no banco: sem acesso em dia, não entra nem muda lançamento, fixo, fatura ou cartão.
-- É uma regra "restritiva": soma-se à regra "dono" que já existe (cada um só mexe no que é seu).
do $$
declare t text;
begin
  foreach t in array array['lancamentos', 'fixos', 'fixos_pagos', 'faturas', 'cartoes'] loop
    execute format('drop policy if exists "com acesso: incluir" on public.%I', t);
    execute format('create policy "com acesso: incluir" on public.%I as restrictive for insert with check ((select public.tem_acesso()))', t);
    execute format('drop policy if exists "com acesso: mudar" on public.%I', t);
    execute format('create policy "com acesso: mudar" on public.%I as restrictive for update using ((select public.tem_acesso())) with check ((select public.tem_acesso()))', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- LIGAR A COBRANÇA (só depois de o produto estar à venda e o aviso da Hotmart testado)
-- Quem já tem conta hoje ganha acesso de cortesia, sem data de fim, para ninguém ficar trancado para fora:
--
--   insert into public.acessos (email, origem, ate)
--     select lower(email), 'cortesia', null from auth.users where email is not null
--     on conflict (email) do nothing;
--   update public.acesso_config set cobranca = true, atualizado = now() where id = 1;
--
-- Dar acesso de cortesia a alguém (por exemplo, quem comprou com outro e-mail):
--   insert into public.acessos (email, origem, ate) values ('pessoa@exemplo.com', 'cortesia', '2027-10-31')
--     on conflict (email) do update set status = 'ativo', ate = excluded.ate, atualizado = now();
--
-- Desligar a cobrança (tudo volta a funcionar para todos):
--   update public.acesso_config set cobranca = false, atualizado = now() where id = 1;
-- ---------------------------------------------------------------------
