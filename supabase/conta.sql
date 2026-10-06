-- =====================================================================
-- Meus Gastos — excluir a própria conta, de dentro do app
-- Rode este arquivo uma vez no Supabase: SQL Editor → New query → cole tudo → Run.
-- Pode rodar de novo sem problema.
--
-- Como funciona:
--   1. No app, a pessoa digita a senha em Ajustes → Excluir minha conta.
--   2. O app confere a senha (um novo login) e chama esta função.
--   3. A função só aceita quem acabou de entrar (últimos 10 minutos) e apaga a conta de quem chamou.
--      Com a conta, somem sozinhos os lançamentos, fixos, faturas, cartões, preferências e avisos
--      (as tabelas já são ligadas à conta com "on delete cascade").
--   4. O registro da compra (tabela "acessos") fica: é ele que prova o que foi pago e até quando vale.
-- =====================================================================

create or replace function public.excluir_minha_conta()
returns void language plpgsql security definer set search_path = '' as $$
declare
  eu uuid := auth.uid();
  entrou timestamptz;
begin
  if eu is null then
    raise exception 'sem_sessao' using hint = 'Entre na sua conta para excluí-la.';
  end if;
  select u.last_sign_in_at into entrou from auth.users u where u.id = eu;
  -- Quem está com o app aberto há dias não apaga nada sem digitar a senha de novo.
  if entrou is null or entrou < now() - interval '10 minutes' then
    raise exception 'confirmar_senha' using hint = 'Digite a sua senha de novo para confirmar.';
  end if;
  delete from auth.users where id = eu;
end $$;

revoke all on function public.excluir_minha_conta() from public, anon;
grant execute on function public.excluir_minha_conta() to authenticated;
