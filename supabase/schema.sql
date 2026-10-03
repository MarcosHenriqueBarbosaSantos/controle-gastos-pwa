-- =====================================================================
-- Controle de Gastos — esquema do banco (Supabase / PostgreSQL)
-- Rode este arquivo inteiro no Supabase: SQL Editor → New query → Run.
-- Cada usuário só enxerga e altera as próprias linhas (Row Level Security).
-- =====================================================================

-- Lançamentos do dia a dia: gastos, entradas e dinheiro guardado na reserva
create table if not exists public.lancamentos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data        date not null,
  descricao   text not null default '',
  tipo        text not null check (tipo in ('Despesa', 'Receita', 'Reserva')),
  categoria   text not null,
  forma       text not null default '',
  valor       numeric(12, 2) not null check (valor > 0),
  import_key  text,                       -- evita duplicar ao importar a mesma planilha
  created_at  timestamptz not null default now(),
  unique (user_id, import_key)
);
create index if not exists lancamentos_user_data_idx on public.lancamentos (user_id, data);

-- Gastos fixos: contas que se repetem todo mês
create table if not exists public.fixos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  descricao   text not null,
  categoria   text not null,
  dia         smallint not null check (dia between 1 and 31),
  valor       numeric(12, 2) not null check (valor > 0),
  forma       text not null default '',
  desde       date not null,              -- primeiro mês em que conta (dia 1)
  ate         date,                       -- último mês em que conta (null = ainda ativo)
  created_at  timestamptz not null default now()
);

-- Marcação de "pago" de cada fixo em cada mês
create table if not exists public.fixos_pagos (
  fixo_id     uuid not null references public.fixos (id) on delete cascade,
  mes         date not null,              -- sempre o dia 1 do mês
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  primary key (fixo_id, mes)
);

-- Faturas de cartão de crédito
create table if not exists public.faturas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  cartao      text not null,
  vencimento  date not null,
  valor       numeric(12, 2) not null check (valor > 0),
  status      text not null default 'Aberta' check (status in ('Aberta', 'Paga')),
  created_at  timestamptz not null default now()
);

-- Preferências de cada usuário: categorias próprias, saldo acumulado, boas-vindas
create table if not exists public.preferencias (
  user_id     uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  dados       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Segurança: cada pessoa acessa apenas os próprios dados
-- ---------------------------------------------------------------------
alter table public.lancamentos enable row level security;
alter table public.fixos       enable row level security;
alter table public.fixos_pagos enable row level security;
alter table public.faturas     enable row level security;
alter table public.preferencias enable row level security;

drop policy if exists "dono" on public.lancamentos;
create policy "dono" on public.lancamentos for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "dono" on public.fixos;
create policy "dono" on public.fixos for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "dono" on public.fixos_pagos;
create policy "dono" on public.fixos_pagos for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "dono" on public.preferencias;
create policy "dono" on public.preferencias for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "dono" on public.faturas;
create policy "dono" on public.faturas for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Visão para análise: resumo mensal por usuário (útil para SQL/BI)
-- ---------------------------------------------------------------------
create or replace view public.resumo_mensal
with (security_invoker = true) as
select
  user_id,
  date_trunc('month', data)::date                              as mes,
  sum(valor) filter (where tipo = 'Receita')                   as entradas,
  sum(valor) filter (where tipo = 'Despesa')                   as gastos_dia_a_dia,
  sum(valor) filter (where tipo = 'Reserva')                   as reserva,
  count(*) filter (where tipo = 'Despesa')                     as qtd_gastos
from public.lancamentos
group by user_id, date_trunc('month', data);
