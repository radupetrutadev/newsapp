-- Run news ingestion every 15 minutes from Supabase itself (works on the free plan).
--
-- 1. Set CRON_SECRET in Vercel (Settings → Environment Variables) and redeploy.
-- 2. Paste the same value over PASTE_YOUR_CRON_SECRET below, in the SQL editor only.
--    Don't commit it: the secret is kept encrypted in Supabase Vault, not in this file.
-- 3. Run the whole script. Running it again updates the secret and the schedule.
--
-- Check recent runs: select * from cron.job_run_details order by start_time desc limit 10;
-- Check responses:   select status_code, content from net._http_response order by created desc limit 10;
-- Stop:              select cron.unschedule('pulse-ingest');

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

do $$
declare
  cron_secret constant text := 'PASTE_YOUR_CRON_SECRET';
  existing_id uuid;
begin
  if cron_secret = 'PASTE_YOUR_CRON_SECRET' or length(cron_secret) < 16 then
    raise exception 'Paste your CRON_SECRET (the one set in Vercel) into cron_secret first.';
  end if;

  select id into existing_id from vault.secrets where name = 'pulse_cron_secret';
  if existing_id is null then
    perform vault.create_secret(cron_secret, 'pulse_cron_secret', 'Bearer token for /api/ingest');
  else
    perform vault.update_secret(existing_id, cron_secret);
  end if;
end $$;

select cron.schedule(
  'pulse-ingest',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://newsapp-ten-sigma.vercel.app/api/ingest',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'pulse_cron_secret')
    ),
    timeout_milliseconds := 60000
  );
  $$
);
