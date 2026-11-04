-- Gasto fixo de todo dia (repete = 'diario'): uma ocorrência por dia, a partir da data "desde".
-- A marca de "mandei" é por data em fixos_pagos, como nos fixos semanais. Só amplia a regra de repetição: não apaga nem altera nenhum dado.
alter table public.fixos drop constraint if exists fixos_repete_check;
alter table public.fixos add constraint fixos_repete_check check (repete in ('mensal', 'semanal', 'diario'));
