-- Roda uma vez no SQL Editor do Supabase, antes de publicar o app que limita categorias.
-- Só troca duas funções: nenhuma tabela muda e nenhum dado é apagado.
-- desafio_criar passa a guardar quem pode entrar; desafio_entrar recusa categoria fora da lista.

create or replace function public.desafio_criar(n text, a text, c text default '', k text default '', dias integer default 7, r jsonb default '{}'::jsonb)
returns json language plpgsql security definer set search_path = '' as $$
declare eu uuid := auth.uid(); novo public.desafios; cod text; cats jsonb;
begin
  if eu is null then raise exception 'sem_login'; end if;
  if dias not in (1, 7, 30) then raise exception 'periodo_invalido'; end if;
  -- Quem pode entrar: só UberX, Comfort e Black competem por categoria. Vazio: todas.
  cats := coalesce((select jsonb_agg(v) from jsonb_array_elements_text(case when jsonb_typeof(r -> 'categorias') = 'array' then r -> 'categorias' else '[]'::jsonb end) v where v in ('UberX', 'Comfort', 'Black')), '[]'::jsonb);
  if jsonb_array_length(cats) > 0 and not cats ? trim(coalesce(k, '')) then raise exception 'categoria_fora'; end if;
  if char_length(trim(coalesce(n, ''))) = 0 or char_length(trim(coalesce(a, ''))) = 0 then raise exception 'falta_nome'; end if;
  if (select count(*) from public.desafios d where d.dono = eu and d.fim >= public.desafio_hoje()) >= 5 then raise exception 'limite'; end if;
  loop
    cod := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from public.desafios d where d.codigo = cod);
  end loop;
  insert into public.desafios (nome, codigo, dono, inicio, fim, regras)
    values (left(trim(n), 40), cod, eu, public.desafio_hoje(), public.desafio_hoje() + dias - 1,
      jsonb_build_object('gastos', coalesce((r ->> 'gastos')::boolean, true), 'carro', coalesce((r ->> 'carro')::boolean, false),
        'vence', case when r ->> 'vence' in ('geral', 'km', 'hora', 'sobra', 'total') then r ->> 'vence' else 'km' end, 'categorias', cats)) returning * into novo;
  insert into public.desafio_membros (desafio_id, user_id, apelido, carro, categoria)
    values (novo.id, eu, left(trim(a), 24), left(trim(coalesce(c, '')), 30), left(trim(coalesce(k, '')), 20));
  return json_build_object('id', novo.id, 'codigo', novo.codigo);
end $$;

create or replace function public.desafio_entrar(cod text, a text, c text default '', k text default '', aceito boolean default false)
returns json language plpgsql security definer set search_path = '' as $$
declare eu uuid := auth.uid(); alvo public.desafios;
begin
  if eu is null then raise exception 'sem_login'; end if;
  if char_length(trim(coalesce(a, ''))) = 0 then raise exception 'falta_nome'; end if;
  select * into alvo from public.desafios d where d.codigo = upper(trim(coalesce(cod, '')));
  if alvo.id is null then raise exception 'codigo_invalido'; end if;
  if alvo.fim < public.desafio_hoje() then raise exception 'encerrado'; end if;
  if aceito is not true then raise exception 'aceite_regras'; end if;
  if jsonb_array_length(coalesce(alvo.regras -> 'categorias', '[]'::jsonb)) > 0 and not (alvo.regras -> 'categorias') ? trim(coalesce(k, '')) then raise exception 'categoria_fora'; end if;
  if (select count(*) from public.desafio_membros m where m.desafio_id = alvo.id and m.user_id <> eu) >= 30 then raise exception 'cheio'; end if;
  insert into public.desafio_membros (desafio_id, user_id, apelido, carro, categoria)
    values (alvo.id, eu, left(trim(a), 24), left(trim(coalesce(c, '')), 30), left(trim(coalesce(k, '')), 20))
    on conflict (desafio_id, user_id) do update set apelido = excluded.apelido, carro = excluded.carro, categoria = excluded.categoria;
  return json_build_object('id', alvo.id, 'codigo', alvo.codigo);
end $$;
