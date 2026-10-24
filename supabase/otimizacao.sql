-- =====================================================================
-- Meus Gastos — banco mais rápido (alertas de desempenho do Supabase, 24/10/2026)
-- Rode uma vez no Supabase: SQL Editor → New query → cole tudo → Run. Pode rodar de novo sem problema.
-- Não muda quem vê o quê: as regras são as mesmas, só deixam de recalcular "quem está logado" linha por linha.
-- =====================================================================

-- 1) Regras de acesso: auth.uid() / auth.jwt() dentro de (select ...) é calculado uma vez por consulta.
alter policy "ver proprios gastos"     on public.gastos       using ((select auth.uid()) = user_id);
alter policy "editar proprios gastos"  on public.gastos       using ((select auth.uid()) = user_id);
alter policy "apagar proprios gastos"  on public.gastos       using ((select auth.uid()) = user_id);
alter policy "inserir proprios gastos" on public.gastos       with check ((select auth.uid()) = user_id);
alter policy "dono"                    on public.preferencias using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy "dono"                    on public.avisos_push  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy "meu acesso"              on public.acessos      using (email = lower((select auth.jwt()) ->> 'email'));
alter policy "ver os meus"             on public.sugestoes    using (user_id = (select auth.uid()));
alter policy "enviar o meu"            on public.sugestoes    with check (user_id = (select auth.uid()) and status = 'nova' and resposta is null);

-- 2) Índices nas colunas de dono que ainda não tinham (deixa a busca por usuário mais rápida).
create index if not exists faturas_user_id_idx     on public.faturas (user_id);
create index if not exists fixos_user_id_idx       on public.fixos (user_id);
create index if not exists fixos_pagos_user_id_idx on public.fixos_pagos (user_id);

-- 3) Também no painel do Supabase (não é SQL): Authentication → Policies (ou Providers → Email) →
--    ligar "Leaked password protection", que impede senhas que já vazaram na internet.
