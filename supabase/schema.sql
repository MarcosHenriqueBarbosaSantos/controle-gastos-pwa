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

-- Fixos: contas (Despesa) e entradas (Receita) que se repetem todo mês
create table if not exists public.fixos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tipo        text not null default 'Despesa' check (tipo in ('Despesa', 'Receita')),  -- Receita = entrada fixa (ex.: salário)
  descricao   text not null,
  categoria   text not null,
  dia         smallint not null check (dia between 1 and 31),
  valor       numeric(12, 2) not null check (valor > 0),
  forma       text not null default '',
  desde       date not null,              -- primeiro mês em que conta (dia 1)
  ate         date,                       -- último mês em que conta (null = ainda ativo)
  created_at  timestamptz not null default now()
);

-- Para bancos criados antes das entradas fixas: acrescenta a coluna "tipo"
alter table public.fixos add column if not exists tipo text not null default 'Despesa';
alter table public.fixos drop constraint if exists fixos_tipo_check;
alter table public.fixos add constraint fixos_tipo_check check (tipo in ('Despesa', 'Receita'));

-- Fixos que se repetem toda semana (ex.: Uber toda sexta, terapia toda quinta).
-- repete = 'semanal' usa dia_semana (0 = domingo ... 6 = sábado) e "desde" é a data de início.
alter table public.fixos add column if not exists repete text not null default 'mensal';
alter table public.fixos add column if not exists dia_semana smallint;
alter table public.fixos drop constraint if exists fixos_repete_check;
alter table public.fixos add constraint fixos_repete_check check (repete in ('mensal', 'semanal'));
alter table public.fixos drop constraint if exists fixos_dia_semana_check;
alter table public.fixos add constraint fixos_dia_semana_check check (dia_semana is null or dia_semana between 0 and 6);

-- Marcação de "pago": por mês (fixos mensais, sempre o dia 1) ou por data (fixos semanais)
create table if not exists public.fixos_pagos (
  fixo_id     uuid not null references public.fixos (id) on delete cascade,
  mes         date not null,              -- dia 1 do mês (mensal) ou a data da ocorrência (semanal)
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

-- Cartões de crédito cadastrados. Com o dia de fechamento e o de vencimento, o app monta
-- a fatura sozinho a partir das compras (inclusive parceladas) e dos gastos fixos no cartão.
create table if not exists public.cartoes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome        text not null,
  fechamento  smallint not null check (fechamento between 1 and 31),   -- compras deste dia em diante vão para a fatura seguinte
  vencimento  smallint not null check (vencimento between 1 and 31),
  ativo       boolean not null default true,                           -- falso = não aparece mais para novas compras
  created_at  timestamptz not null default now()
);
create index if not exists cartoes_user_idx on public.cartoes (user_id);

-- Compras e fixos passam a dizer em qual cartão foram feitos, e as compras, em quantas parcelas.
alter table public.lancamentos add column if not exists cartao_id uuid references public.cartoes (id) on delete set null;
alter table public.lancamentos add column if not exists parcelas smallint not null default 1;
alter table public.lancamentos drop constraint if exists lancamentos_parcelas_check;
alter table public.lancamentos add constraint lancamentos_parcelas_check check (parcelas between 1 and 48);
alter table public.fixos add column if not exists cartao_id uuid references public.cartoes (id) on delete set null;
-- Na tabela de faturas, uma linha com cartao_id é o registro de uma fatura calculada:
-- guarda se foi paga e, com valor_fixo = true, o valor corrigido à mão. Sem cartao_id, é uma fatura lançada à mão.
alter table public.faturas add column if not exists cartao_id uuid references public.cartoes (id) on delete cascade;
alter table public.faturas add column if not exists valor_fixo boolean not null default false;
create index if not exists lancamentos_cartao_idx on public.lancamentos (cartao_id) where cartao_id is not null;
create index if not exists fixos_cartao_idx on public.fixos (cartao_id) where cartao_id is not null;
create index if not exists faturas_cartao_idx on public.faturas (cartao_id) where cartao_id is not null;

-- Preferências de cada usuário: categorias próprias, saldo acumulado, saldo inicial, boas-vindas
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
alter table public.cartoes     enable row level security;

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

drop policy if exists "dono" on public.cartoes;
create policy "dono" on public.cartoes for all
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
