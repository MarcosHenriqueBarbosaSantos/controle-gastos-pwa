-- Lembrete da jornada com o app fechado (modo motorista).
-- De hora em hora, aos 15 minutos, o banco chama o servidor de avisos com { "rotina": "jornada" }.
-- Quem está com a jornada aberta recebe uma notificação com 3 horas sem lançar quanto fez, ou com a jornada rodando há 14 horas.
-- Não manda entre 23h e 7h (Brasília). Usa o mesmo segredo e a mesma função dos outros avisos (supabase/avisos.sql).
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.unschedule(jobid) from cron.job where jobname = 'meus-gastos-jornada';
select cron.schedule('meus-gastos-jornada', '15 * * * *', $cron$
  select net.http_post(
    url := 'https://ebaivarzdqekmhnyrwxo.supabase.co/functions/v1/avisos',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-avisos-segredo', (select decrypted_secret from vault.decrypted_secrets where name = 'avisos_segredo')),
    body := '{"rotina":"jornada"}'::jsonb,
    timeout_milliseconds := 60000);
$cron$);
