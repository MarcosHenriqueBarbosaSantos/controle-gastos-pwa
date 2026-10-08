-- =====================================================================
-- Meus Gastos — conta de casal
-- Duas pessoas, cada uma com o seu e-mail e a sua senha, vendo e lançando nas mesmas contas.
-- Rode este arquivo uma vez no Supabase: SQL Editor → New query → cole tudo → Run.
-- Pode rodar de novo sem problema: nada é apagado e nada é duplicado.
-- Precisa de schema.sql, acesso.sql e conta.sql já rodados.
--
-- Como funciona:
--   1. Uma pessoa convida a outra pelo e-mail (casal_convidar). Ninguém recebe e-mail: o convite aparece
--      no app quando a pessoa convidada entra com aquele e-mail.
--   2. Ao aceitar (casal_responder), as duas passam a ver e mudar os lançamentos, fixos, cartões e faturas uma da outra.
--      Cada linha continua sendo de quem lançou: é assim que o app mostra "quem lançou" e é o que cada um leva ao sair.
--   3. Categorias, limites, metas e saldo inicial passam a ser um só para os dois (coluna "dados").
--   4. Uma compra vale para os dois: com a cobrança ligada, basta um dos dois ter o acesso em dia.
--   5. Ao encerrar (casal_sair), cada um fica com o que lançou. O que foi lançado no cartão do outro fica com o dono do cartão.
--   6. Depois de encerrar uma conta de casal que chegou a valer, a pessoa espera 7 dias para formar outra
--      (para a mesma compra não ser passada de mão em mão).
-- =====================================================================

create table if not exists public.casais (
  id          uuid primary key default gen_random_uuid(),
  dono        uuid not null references auth.users (id) on delete cascade,   -- quem convidou
  parceiro    uuid references auth.users (id) on delete cascade,            -- quem aceitou
  convite     text not null check (convite = lower(convite)),               -- e-mail convidado
  status      text not null default 'pendente' check (status in ('pendente', 'ativo', 'recusado', 'encerrado')),
  dados       jsonb not null default '{}'::jsonb,                           -- o que é dos dois: categorias, limites, metas, saldo, nomes
  criado      timestamptz not null default now(),
  aceito      timestamptz,
  encerrado   timestamptz
);
-- Cada pessoa convida uma de cada vez, e só participa de uma conta de casal por vez.
create unique index if not exists casais_dono_aberto on public.casais (dono) where status in ('pendente', 'ativo');
create unique index if not exists casais_parceiro_ativo on public.casais (parceiro) where status = 'ativo';
create index if not exists casais_convite_idx on public.casais (convite) where status = 'pendente';
alter table public.casais enable row level security;   -- sem política: o app só chega aqui pelas funções abaixo

-- Com quem a pessoa logada divide as contas (vazio se não divide com ninguém).
create or replace function public.meu_par()
returns uuid language sql stable security definer set search_path = '' as $$
  select case when c.dono = auth.uid() then c.parceiro else c.dono end
  from public.casais c
  where c.status = 'ativo' and (c.dono = auth.uid() or c.parceiro = auth.uid())
  limit 1;
$$;
revoke all on function public.meu_par() from public, anon;
grant execute on function public.meu_par() to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Segurança: cada pessoa acessa os próprios dados e os de quem divide as contas com ela.
-- Preferências e aparelhos com notificação continuam sendo só de cada um.
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['lancamentos', 'fixos', 'fixos_pagos', 'faturas', 'cartoes'] loop
    execute format('drop policy if exists "dono" on public.%I', t);
    execute format('create policy "dono" on public.%I for all
      using (user_id = (select auth.uid()) or user_id = (select public.meu_par()))
      with check (user_id = (select auth.uid()) or user_id = (select public.meu_par()))', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Acesso de quem comprou: vale o da própria pessoa ou o de quem divide as contas com ela.
-- ---------------------------------------------------------------------
create or replace function public.acesso_em_dia(e text)
returns boolean language sql stable security definer set search_path = '' as $$
  select e is not null and exists (select 1 from public.acessos a
    where a.email = lower(e) and a.status in ('ativo', 'cancelado')
      and (a.ate is null or a.ate >= (now() at time zone 'America/Sao_Paulo')::date));
$$;
revoke all on function public.acesso_em_dia(text) from public, anon, authenticated;
grant execute on function public.acesso_em_dia(text) to service_role;

create or replace function public.tem_acesso()
returns boolean language sql stable security definer set search_path = '' as $$
  select not coalesce((select c.cobranca from public.acesso_config c where c.id = 1), false)
      or public.acesso_em_dia(auth.jwt() ->> 'email')
      or public.acesso_em_dia((select u.email from auth.users u where u.id = public.meu_par()));
$$;
revoke all on function public.tem_acesso() from public, anon;
grant execute on function public.tem_acesso() to authenticated, service_role;

-- O que o app mostra: se a cobrança vale, se a pessoa tem acesso, até quando, e se o acesso vem da conta de casal.
create or replace function public.meu_acesso()
returns json language sql stable security definer set search_path = '' as $$
  with eu as (select lower(auth.jwt() ->> 'email') as e),
       par as (select lower(u.email) as e from auth.users u where u.id = public.meu_par()),
       vale as (select public.acesso_em_dia((select e from eu)) as meu, public.acesso_em_dia((select e from par)) as dele),
       de as (select case when (select not meu and dele from vale) then (select e from par) else (select e from eu) end as e)
  select json_build_object(
    'cobranca', coalesce((select c.cobranca from public.acesso_config c where c.id = 1), false),
    'ativo',    public.tem_acesso(),
    'ate',      (select a.ate    from public.acessos a where a.email = (select e from de)),
    'status',   (select a.status from public.acessos a where a.email = (select e from de)),
    'origem',   (select a.origem from public.acessos a where a.email = (select e from de)),
    'pelo_par', (select not meu and dele from vale));
$$;
revoke all on function public.meu_acesso() from public, anon;
grant execute on function public.meu_acesso() to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Funções que o app chama
-- ---------------------------------------------------------------------

-- A pessoa encerrou há menos de 7 dias uma conta de casal que chegou a valer? Devolve o dia em que pode formar outra.
create or replace function public.casal_espera(quem uuid)
returns date language sql stable security definer set search_path = '' as $$
  select max((c.encerrado at time zone 'America/Sao_Paulo')::date + 7)
  from public.casais c
  where c.status = 'encerrado' and c.aceito is not null and (c.dono = quem or c.parceiro = quem)
    and c.encerrado > now() - interval '7 days';
$$;
revoke all on function public.casal_espera(uuid) from public, anon, authenticated;

-- Situação de quem está logado: 'nenhum', 'convidei', 'convidado' ou 'ativo'.
create or replace function public.casal_meu()
returns json language plpgsql stable security definer set search_path = '' as $$
declare
  eu uuid := auth.uid();
  meu_email text := lower(auth.jwt() ->> 'email');
  c public.casais;
begin
  if eu is null then return json_build_object('situacao', 'nenhum'); end if;
  select * into c from public.casais k where k.status = 'ativo' and (k.dono = eu or k.parceiro = eu) limit 1;
  if found then
    return json_build_object('situacao', 'ativo', 'id', c.id, 'eu', eu,
      'papel', case when c.dono = eu then 'dono' else 'parceiro' end,
      'outro_id', case when c.dono = eu then c.parceiro else c.dono end,
      'outro', (select lower(u.email) from auth.users u where u.id = case when c.dono = eu then c.parceiro else c.dono end),
      'desde', (c.aceito at time zone 'America/Sao_Paulo')::date, 'dados', c.dados);
  end if;
  select * into c from public.casais k where k.status = 'pendente' and k.dono = eu limit 1;
  if found then
    return json_build_object('situacao', 'convidei', 'id', c.id, 'eu', eu, 'outro', c.convite);
  end if;
  select * into c from public.casais k where k.status = 'pendente' and k.convite = meu_email and k.dono <> eu order by k.criado limit 1;
  if found then
    return json_build_object('situacao', 'convidado', 'id', c.id, 'eu', eu,
      'outro', (select lower(u.email) from auth.users u where u.id = c.dono), 'espera', public.casal_espera(eu));
  end if;
  return json_build_object('situacao', 'nenhum', 'eu', eu, 'espera', public.casal_espera(eu));
end $$;
revoke all on function public.casal_meu() from public, anon;
grant execute on function public.casal_meu() to authenticated;

-- Convidar alguém pelo e-mail.
create or replace function public.casal_convidar(e text)
returns json language plpgsql security definer set search_path = '' as $$
declare
  eu uuid := auth.uid();
  meu_email text := lower(auth.jwt() ->> 'email');
  alvo text := lower(trim(coalesce(e, '')));
  espera date;
begin
  if eu is null then raise exception 'sem_sessao'; end if;
  if alvo !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or length(alvo) > 254 then
    raise exception 'email_invalido' using hint = 'Confira o e-mail da pessoa.';
  end if;
  if alvo = meu_email then raise exception 'proprio_email' using hint = 'Use o e-mail da outra pessoa.'; end if;
  if exists (select 1 from public.casais k where (k.status = 'ativo' and (k.dono = eu or k.parceiro = eu)) or (k.status = 'pendente' and k.dono = eu)) then
    raise exception 'ja_tem' using hint = 'Você já tem uma conta de casal ou um convite em aberto.';
  end if;
  espera := public.casal_espera(eu);
  if espera is not null then raise exception 'espera' using hint = to_char(espera, 'YYYY-MM-DD'); end if;
  -- Quem recusou não volta a receber o mesmo convite por 30 dias.
  if exists (select 1 from public.casais k where k.dono = eu and k.convite = alvo and k.status = 'recusado' and k.encerrado > now() - interval '30 days') then
    raise exception 'recusado' using hint = 'Essa pessoa recusou o convite.';
  end if;
  insert into public.casais (dono, convite) values (eu, alvo);
  return public.casal_meu();
end $$;
revoke all on function public.casal_convidar(text) from public, anon;
grant execute on function public.casal_convidar(text) to authenticated;

-- Aceitar ou recusar o convite recebido.
create or replace function public.casal_responder(aceita boolean)
returns json language plpgsql security definer set search_path = '' as $$
declare
  eu uuid := auth.uid();
  meu_email text := lower(auth.jwt() ->> 'email');
  c public.casais;
  espera date;
  comum text[] := array['categorias', 'limites', 'teto', 'metas', 'levarSaldo', 'saldoDesde', 'saldoInicial', 'semGasto'];
begin
  if eu is null then raise exception 'sem_sessao'; end if;
  select * into c from public.casais k where k.status = 'pendente' and k.convite = meu_email and k.dono <> eu order by k.criado limit 1 for update;
  if not found then raise exception 'sem_convite' using hint = 'O convite não existe mais.'; end if;
  if not coalesce(aceita, false) then
    update public.casais set status = 'recusado', encerrado = now() where id = c.id;
    return public.casal_meu();
  end if;
  if exists (select 1 from public.casais k where k.status = 'ativo' and (k.dono = eu or k.parceiro = eu)) then
    raise exception 'ja_tem' using hint = 'Você já divide as contas com outra pessoa.';
  end if;
  espera := public.casal_espera(eu);
  if espera is not null then raise exception 'espera' using hint = to_char(espera, 'YYYY-MM-DD'); end if;
  -- Quem aceita desiste do convite que tinha feito para outra pessoa.
  update public.casais set status = 'encerrado', encerrado = now() where status = 'pendente' and dono = eu;
  -- O que passa a ser dos dois começa com o que quem convidou já tinha.
  update public.casais k set parceiro = eu, status = 'ativo', aceito = now(),
    dados = coalesce((select jsonb_object_agg(x.key, x.value) from public.preferencias p, jsonb_each(p.dados) x
                      where p.user_id = c.dono and x.key = any(comum)), '{}'::jsonb)
  where k.id = c.id;
  return public.casal_meu();
end $$;
revoke all on function public.casal_responder(boolean) from public, anon;
grant execute on function public.casal_responder(boolean) to authenticated;

-- Guardar o que é dos dois (categorias, limites, metas, saldo, nomes). O app manda o conjunto inteiro.
create or replace function public.casal_salvar(d jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare eu uuid := auth.uid();
begin
  if eu is null then raise exception 'sem_sessao'; end if;
  if d is null or jsonb_typeof(d) <> 'object' or length(d::text) > 200000 then raise exception 'dados_invalidos'; end if;
  update public.casais set dados = d where status = 'ativo' and (dono = eu or parceiro = eu);
  if not found then raise exception 'sem_casal'; end if;
end $$;
revoke all on function public.casal_salvar(jsonb) from public, anon;
grant execute on function public.casal_salvar(jsonb) to authenticated;

-- Encerrar uma conta de casal (uso interno). Cada um fica com o que lançou; o que está no cartão de um fica com o dono do cartão.
create or replace function public.casal_encerra(qual uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  c public.casais;
  comum jsonb;
begin
  select * into c from public.casais k where k.id = qual for update;
  if not found or c.status not in ('pendente', 'ativo') then return; end if;
  if c.status = 'ativo' and c.parceiro is not null then
    -- Compras e fixos lançados no cartão do outro passam para o dono do cartão (é ele quem paga a fatura).
    update public.lancamentos l set user_id = k.user_id, import_key = null
      from public.cartoes k where k.id = l.cartao_id and k.user_id <> l.user_id and l.user_id in (c.dono, c.parceiro) and k.user_id in (c.dono, c.parceiro);
    update public.fixos f set user_id = k.user_id
      from public.cartoes k where k.id = f.cartao_id and k.user_id <> f.user_id and f.user_id in (c.dono, c.parceiro) and k.user_id in (c.dono, c.parceiro);
    -- A marca de "pago" acompanha o dono da conta fixa, e o registro da fatura acompanha o dono do cartão.
    update public.fixos_pagos p set user_id = f.user_id
      from public.fixos f where f.id = p.fixo_id and f.user_id <> p.user_id and p.user_id in (c.dono, c.parceiro);
    update public.faturas t set user_id = k.user_id
      from public.cartoes k where k.id = t.cartao_id and k.user_id <> t.user_id and t.user_id in (c.dono, c.parceiro);
    -- Categorias, limites, metas e saldo ficam copiados para os dois.
    comum := c.dados - 'nomes';
    insert into public.preferencias (user_id, dados) values (c.dono, comum), (c.parceiro, comum)
      on conflict (user_id) do update set dados = public.preferencias.dados || excluded.dados, updated_at = now();
  end if;
  update public.casais set status = 'encerrado', encerrado = now() where id = c.id;
end $$;
revoke all on function public.casal_encerra(uuid) from public, anon, authenticated;

-- Sair da conta de casal, ou cancelar o convite que ainda não foi aceito.
create or replace function public.casal_sair()
returns json language plpgsql security definer set search_path = '' as $$
declare
  eu uuid := auth.uid();
  qual uuid;
begin
  if eu is null then raise exception 'sem_sessao'; end if;
  select k.id into qual from public.casais k
    where (k.status = 'ativo' and (k.dono = eu or k.parceiro = eu)) or (k.status = 'pendente' and k.dono = eu) limit 1;
  if qual is not null then perform public.casal_encerra(qual); end if;
  return public.casal_meu();
end $$;
revoke all on function public.casal_sair() from public, anon;
grant execute on function public.casal_sair() to authenticated;

-- Excluir a própria conta (substitui a versão de conta.sql): antes de apagar, encerra a conta de casal,
-- para a outra pessoa não perder as marcas de "pago" nem as compras feitas no cartão dela.
create or replace function public.excluir_minha_conta()
returns void language plpgsql security definer set search_path = '' as $$
declare
  eu uuid := auth.uid();
  entrou timestamptz;
  qual uuid;
begin
  if eu is null then
    raise exception 'sem_sessao' using hint = 'Entre na sua conta para excluí-la.';
  end if;
  select u.last_sign_in_at into entrou from auth.users u where u.id = eu;
  if entrou is null or entrou < now() - interval '10 minutes' then
    raise exception 'confirmar_senha' using hint = 'Digite a sua senha de novo para confirmar.';
  end if;
  for qual in select k.id from public.casais k where k.status in ('pendente', 'ativo') and (k.dono = eu or k.parceiro = eu) loop
    perform public.casal_encerra(qual);
  end loop;
  delete from auth.users where id = eu;
end $$;
revoke all on function public.excluir_minha_conta() from public, anon;
grant execute on function public.excluir_minha_conta() to authenticated;
