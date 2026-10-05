-- 0036: scheduled email drain and payment reconcile
-- Template fix: the app URL comes from Vault (contest_app_url) instead of being hardcoded.
--
-- Supabase pg_cron calls the app, but only when there's work, so an idle
-- off-season costs no function invocations:
--   * drain-email-outbox, every 5 minutes, while an outbox row is due.
--     The app paces sends at 2/second (Resend allows 10/s per account) and
--     stays under the daily budget itself.
--   * reconcile-payments, every 15 minutes, while a checkout was started in
--     the last 3 days. Catches payments whose webhook was late or lost.
-- Vercel cron (vercel.json) also runs both once a day as a fallback.
--
-- One-time setup (not in this file, because it holds a secret): store the
-- app's CRON_SECRET and its public URL in Vault:
--
--   select vault.create_secret('<CRON_SECRET value>', 'contest_cron_secret');
--   select vault.create_secret('https://your-app.vercel.app', 'contest_app_url');
--
-- Until contest_app_url is set the jobs do nothing; until contest_cron_secret
-- is set their calls are rejected with 401. Both are harmless.
-- Check results with:
--   select status_code, count(*) from net._http_response group by 1;

-- cron.schedule replaces an existing job with the same name.
SELECT cron.schedule(
  'drain-email-outbox',
  '*/5 * * * *',
  $job$
    SELECT net.http_post(
      url := rtrim((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'contest_app_url'), '/')
             || '/api/cron/drain-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || coalesce(
          (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'contest_cron_secret'), '')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 60000
    )
    WHERE EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'contest_app_url')
      AND EXISTS (
      SELECT 1 FROM public.email_outbox
       WHERE sent_at IS NULL
         AND dead_at IS NULL
         AND not_before <= now()
         AND (claimed_at IS NULL OR claimed_at < now() - interval '5 minutes')
    );
  $job$
);

SELECT cron.schedule(
  'reconcile-payments',
  '*/15 * * * *',
  $job$
    SELECT net.http_post(
      url := rtrim((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'contest_app_url'), '/')
             || '/api/cron/reconcile-payments',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || coalesce(
          (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'contest_cron_secret'), '')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 60000
    )
    WHERE EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'contest_app_url')
      AND EXISTS (
      SELECT 1 FROM public.contest_registrations
       WHERE checkout_created_at > now() - interval '3 days'
    );
  $job$
);
