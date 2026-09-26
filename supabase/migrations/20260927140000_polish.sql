-- =============================================================================
-- Slice 9A: loose ends before real PGs use the app.
--
--  * case_overview gains the last appointment's purpose, so a missed or
--    cancelled REVIEW visit on a completed case can show under Pending
--    (while a treatment visit cancelled by completing the case does not).
--  * feedback — "Send feedback" from Settings: a PG can write and read only
--    their own; never edited or deleted from the app.
--  * pg_profile.guide_seen_at — the short first-run guide is shown once.
-- =============================================================================

-- ── case_overview: + last_appointment_purpose ────────────────────────────────
-- (CREATE OR REPLACE VIEW may only add columns at the end.)
create or replace view public.case_overview
with (security_invoker = true)
as
select
  c.id                   as case_id,
  c.pg_id,
  c.patient_id,
  p.full_name            as patient_name,
  p.phone                as patient_phone,
  p.age                  as patient_age,
  p.opd_number           as patient_opd_number,
  c.tooth,
  c.status,
  c.started_on,
  c.completed_at,
  c.is_special,
  c.created_at,
  ct.id                  as case_type_id,
  ct.name                as case_type_name,
  s.id                   as current_stage_id,
  s.name                 as current_stage_name,
  na.id                  as next_appointment_id,
  na.starts_at           as next_appointment_at,
  na.duration_min        as next_appointment_duration_min,
  na.status              as next_appointment_status,
  na.purpose             as next_appointment_purpose,
  la.id                  as last_appointment_id,
  la.starts_at           as last_appointment_at,
  la.status              as last_appointment_status,
  la.purpose             as last_appointment_purpose
from public.patient_case c
join public.patient p    on p.id = c.patient_id
join public.case_type ct on ct.id = c.case_type_id
left join public.stage s on s.id = c.current_stage_id
left join lateral (
  select a.id, a.starts_at, a.duration_min, a.status, a.purpose
  from public.appointment a
  where a.case_id = c.id
    and a.deleted_at is null
    and a.status in ('scheduled', 'confirmed', 'unconfirmed')
    and a.starts_at >= (public.ist_today()::timestamp at time zone 'Asia/Kolkata')
  order by a.starts_at
  limit 1
) na on true
left join lateral (
  select a.id, a.starts_at, a.status, a.purpose
  from public.appointment a
  where a.case_id = c.id
    and a.deleted_at is null
  order by a.starts_at desc
  limit 1
) la on true
where c.deleted_at is null
  and p.deleted_at is null;

-- ── feedback ─────────────────────────────────────────────────────────────────
create table public.feedback (
  id          uuid primary key default gen_random_uuid(),
  pg_id       uuid not null default auth.uid() references public.pg_profile (id),
  message     text not null check (length(btrim(message)) between 1 and 2000),
  -- The screen the PG came from (a path such as /today), for context.
  screen      text check (screen is null or length(screen) <= 200),
  created_at  timestamptz not null default now()
);

comment on table public.feedback is
  'Feedback a PG sent from Settings. Read by the team with the service role; a PG sees only their own.';

create index feedback_pg_idx on public.feedback (pg_id, created_at);

alter table public.feedback enable row level security;

create policy "PG reads own feedback" on public.feedback
  for select to authenticated using (pg_id = (select auth.uid()));
create policy "PG sends own feedback" on public.feedback
  for insert to authenticated with check (pg_id = (select auth.uid()));

revoke all on public.feedback from anon;
revoke update, delete, truncate on public.feedback from authenticated;

-- ── First-run guide ──────────────────────────────────────────────────────────
alter table public.pg_profile add column guide_seen_at timestamptz;

comment on column public.pg_profile.guide_seen_at is
  'When the PG finished or skipped the first-run guide (NULL = not yet shown).';
