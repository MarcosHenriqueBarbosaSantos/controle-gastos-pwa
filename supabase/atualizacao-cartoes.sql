-- =====================================================================
-- Meus Gastos — atualização: cartões cadastrados, parcelas e fatura automática
-- Rode este arquivo uma vez no Supabase: SQL Editor → New query → cole tudo → Run.
-- Pode rodar de novo sem problema: nada é apagado e nada é duplicado.
-- =====================================================================

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

alter table public.cartoes enable row level security;
drop policy if exists "dono" on public.cartoes;
create policy "dono" on public.cartoes for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
