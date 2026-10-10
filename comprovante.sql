-- =====================================================================
-- Meus Gastos — comprovante (a foto do recibo) guardado junto do lançamento
-- Rode este arquivo uma vez no Supabase: SQL Editor → New query → cole tudo → Run.
-- Pode rodar de novo sem problema: nada é apagado e nada é duplicado.
-- Funciona com ou sem a conta de casal, e a ordem em relação aos outros arquivos não importa.
--
-- Como funciona:
--   1. A pessoa lança pela foto ou pelo PDF, como já fazia. Depois de salvar, o app PERGUNTA
--      se ela quer guardar aquele comprovante. Nada é guardado sem o sim.
--   2. Dizendo sim, o app diminui a imagem no próprio celular (lado maior de 1200 px, JPEG)
--      e manda para o balde "comprovantes", em uma pasta por pessoa: {id da pessoa}/{id do lançamento}.jpg
--   3. O caminho do arquivo fica na coluna "comprovante" do lançamento. É só o caminho: a imagem
--      em si nunca passa pelas tabelas.
--   4. Excluir a conta (Ajustes) apaga antes os comprovantes da pessoa: são dela, e o Supabase
--      não exclui uma conta que ainda é dona de arquivos.
--   5. O balde é PRIVADO. Para mostrar a foto, o app pede ao Supabase um endereço assinado que
--      vale uma hora. Sem login não se abre nada, nem com o endereço na mão.
-- =====================================================================

-- 1. Onde o caminho do comprovante fica guardado
alter table public.lancamentos add column if not exists comprovante text;

-- 2. O balde dos comprovantes: privado, no máximo 5 MB por arquivo, só imagem.
--    O app manda bem menos que isso (a foto diminuída dá uns 100 KB), mas o limite protege o espaço.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprovantes', 'comprovantes', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- 3. Quem pode mexer em quê.
--    Ver e apagar: quem enxerga o lançamento enxerga o comprovante dele (o anotado nele, ou o arquivo com o id dele
--    no nome — que é a foto antiga durante uma troca). A regra pergunta à própria tabela
--    de lançamentos, que já tem as suas regras (a pessoa e, na conta de casal, quem divide as contas com ela).
--    Assim o comprovante acompanha o lançamento em qualquer caso: casal ligado, casal encerrado, compra que
--    mudou de dono — e este arquivo não depende de casal.sql ter sido rodado antes ou depois.
--    Gravar e trocar: só dentro da própria pasta. Ninguém escreve na pasta do outro.
create index if not exists lancamentos_comprovante_idx on public.lancamentos (comprovante) where comprovante is not null;

-- O arquivo se chama {pasta}/{id do lançamento}.jpg. Esta função devolve o id (ou nada, se o nome for outro).
-- Com ela, a foto antiga continua alcançável enquanto é trocada, mesmo estando na pasta da outra pessoa do casal.
create or replace function public.lancamento_do_arquivo(nome text)
returns uuid language sql immutable set search_path = '' as $$
  select case when split_part(nome, '/', 2) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'
              then left(split_part(nome, '/', 2), 36)::uuid end
$$;

drop policy if exists "comprovantes ver" on storage.objects;
drop policy if exists "comprovantes gravar" on storage.objects;
drop policy if exists "comprovantes trocar" on storage.objects;
drop policy if exists "comprovantes apagar" on storage.objects;

create policy "comprovantes ver" on storage.objects for select to authenticated
  using (bucket_id = 'comprovantes' and (
    (storage.foldername(name))[1] = (select auth.uid()::text)
    or exists (select 1 from public.lancamentos l where l.comprovante = storage.objects.name)
    or exists (select 1 from public.lancamentos l where l.id = public.lancamento_do_arquivo(storage.objects.name))
  ));

create policy "comprovantes apagar" on storage.objects for delete to authenticated
  using (bucket_id = 'comprovantes' and (
    (storage.foldername(name))[1] = (select auth.uid()::text)
    or exists (select 1 from public.lancamentos l where l.comprovante = storage.objects.name)
    or exists (select 1 from public.lancamentos l where l.id = public.lancamento_do_arquivo(storage.objects.name))
  ));

create policy "comprovantes gravar" on storage.objects for insert to authenticated
  with check (bucket_id = 'comprovantes' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "comprovantes trocar" on storage.objects for update to authenticated
  using (bucket_id = 'comprovantes' and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'comprovantes' and (storage.foldername(name))[1] = (select auth.uid()::text));

-- 3b. Proteção: o caminho anotado no lançamento tem de ser da pasta de quem anota.
--     Como "ver" segue o lançamento, sem esta trava alguém poderia anotar no próprio lançamento o caminho
--     de um arquivo alheio e passar a enxergá-lo. O app sempre anota a pasta de quem mandou a foto.
create or replace function public.comprovante_da_pasta()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.comprovante is not null
     and new.comprovante is distinct from (case when tg_op = 'UPDATE' then old.comprovante end)
     and (select auth.uid()) is not null
     and split_part(new.comprovante, '/', 1) <> (select auth.uid())::text then
    raise exception 'O comprovante precisa estar na sua própria pasta.' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists comprovante_da_pasta on public.lancamentos;
create trigger comprovante_da_pasta before insert or update of comprovante on public.lancamentos
  for each row execute function public.comprovante_da_pasta();

-- 4. Lançamento apagado: quem apaga o arquivo é o app, antes de apagar o lançamento.
--    Se sobrar algum arquivo solto (o app fechou no meio, por exemplo), esta consulta mostra
--    os comprovantes que não têm mais lançamento. Rode de vez em quando, se quiser limpar:
--
--    select o.name
--    from storage.objects o
--    where o.bucket_id = 'comprovantes'
--      and not exists (
--        select 1 from public.lancamentos l
--        where l.comprovante = o.name
--      );
--
--    Para apagar de verdade, use o Storage do painel do Supabase (Storage → comprovantes),
--    selecione os arquivos da lista e apague. Apagar pela tabela storage.objects deixa o
--    arquivo ocupando espaço no balde.
