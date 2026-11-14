-- "Pago por": em conta de casal, diz quem pagou cada conta fixa no mês (você ou a pessoa com quem divide as contas).
-- Roda uma vez no Supabase (SQL Editor → colar → Run). Pode rodar de novo: não apaga nada.
-- Sem este arquivo, o app continua funcionando; só o botão "Quem pagou?" avisa que falta ligar no servidor.

alter table public.fixos_pagos add column if not exists pago_por uuid references auth.users (id) on delete set null;

-- Só vale você mesmo ou a pessoa com quem você divide as contas (nunca um estranho).
create or replace function public.confere_pago_por()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.pago_por is not null
     and new.pago_por <> (select auth.uid())
     and new.pago_por is distinct from (select public.meu_par()) then
    raise exception 'pago_por_invalido';
  end if;
  return new;
end $$;
revoke all on function public.confere_pago_por() from public, anon, authenticated;

drop trigger if exists confere_pago_por on public.fixos_pagos;
create trigger confere_pago_por before insert or update of pago_por on public.fixos_pagos
  for each row execute function public.confere_pago_por();
