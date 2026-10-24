-- Run news ingestion every 15 minutes from Supabase itself (works on the free plan).
--
-- 1. Deploy the app and set CRON_SECRET in its environment.
-- 2. Enable the pg_cron and pg_net extensions (Dashboard → Database → Extensions).
-- 3. Replace YOUR_SITE and YOUR_CRON_SECRET below, then run this in the SQL editor.
--
-- Check recent runs: select * from cron.job_run_details order by start_time desc limit 10;
-- Check responses:   select status_code, content from net._http_response order by created desc limit 10;
-- Stop:              select cron.unschedule('pulse-ingest');

select cron.schedule(
  'pulse-ingest',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://YOUR_SITE/api/ingest',
    headers := jsonb_build_object('Authorization', 'Bearer YOUR_CRON_SECRET'),
    timeout_milliseconds := 60000
  );
  $$
);
