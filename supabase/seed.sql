-- OraMedha - Resident — local seed data.
--
-- Runs after every `supabase db reset` (see [db.seed] in config.toml).
-- Empty in Slice 0: there are no tables yet. Slice 1 adds the procedure
-- templates here (specialty → case type → stages). All clinical values
-- (durations, gaps, next steps) seeded here must be marked as placeholders
-- until confirmed with PGs.

-- LOCAL ONLY: the push scheduler's secret for the local stack (the database
-- tests use it). Not a real secret. The hosted project has its own, set
-- once in Supabase Vault (README → Push notifications).
select vault.create_secret('local-push-cron-secret-not-a-real-secret', 'push_cron_secret')
where not exists (select 1 from vault.secrets where name = 'push_cron_secret');
