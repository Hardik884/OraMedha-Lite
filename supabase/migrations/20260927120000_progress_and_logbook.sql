-- =============================================================================
-- Slice 8: progress and logbook.
--
-- Everything is read from cases and visits the PG already recorded; nothing
-- is typed in. Two read models (security_invoker, so Row Level Security of
-- the underlying tables applies — a PG only ever sees their own rows) and a
-- small table for optional targets.
--
--  * progress_case  — one row per live case: case type, specialty, status,
--                     the India date it was completed, special-case flag.
--  * logbook_entry  — one row per stage worked on in an UPDATED visit (the
--                     logbook). Visits not yet updated, and anything
--                     soft-deleted, are left out.
--  * pg_case_type_target — "I want 10 of these", per case type, optional.
--
-- The counting rules themselves live in lib/progress/count.ts (unit-tested).
-- =============================================================================

create or replace view public.progress_case
with (security_invoker = true)
as
select
  c.id                                              as case_id,
  c.pg_id,
  c.patient_id,
  c.status,
  c.is_special,
  c.started_on,
  (c.completed_at at time zone 'Asia/Kolkata')::date as completed_on,
  ct.id                                             as case_type_id,
  ct.name                                           as case_type_name,
  ct.sort_order                                     as case_type_sort,
  sp.id                                             as specialty_id,
  sp.name                                           as specialty_name
from public.patient_case c
join public.patient p    on p.id = c.patient_id
join public.case_type ct on ct.id = c.case_type_id
join public.specialty sp on sp.id = ct.specialty_id
where c.deleted_at is null
  and p.deleted_at is null;

create or replace view public.logbook_entry
with (security_invoker = true)
as
select
  vs.id                 as entry_id,
  vs.pg_id,
  v.id                  as visit_id,
  v.visit_date,
  v.created_at          as visit_created_at,
  p.id                  as patient_id,
  p.full_name           as patient_name,
  p.opd_number,
  c.id                  as case_id,
  c.tooth,
  c.is_special,
  ct.id                 as case_type_id,
  ct.name               as case_type_name,
  ct.specialty_id,
  s.id                  as stage_id,
  s.name                as stage_name,
  s.sort_order          as stage_sort,
  vs.outcome
from public.visit_stage vs
join public.visit v         on v.id = vs.visit_id
join public.patient_case c  on c.id = v.case_id
join public.patient p       on p.id = c.patient_id
join public.case_type ct    on ct.id = c.case_type_id
join public.stage s         on s.id = vs.stage_id
where v.deleted_at is null
  and c.deleted_at is null
  and p.deleted_at is null
  and vs.outcome is not null;

comment on view public.logbook_entry is
  'The logbook: one row per stage worked on in an updated visit. No phone numbers.';

-- ── Targets ──────────────────────────────────────────────────────────────────
create table public.pg_case_type_target (
  id            uuid primary key default gen_random_uuid(),
  pg_id         uuid not null default auth.uid() references public.pg_profile (id),
  case_type_id  uuid not null references public.case_type (id),
  target        integer not null check (target between 1 and 1000),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (pg_id, case_type_id)
);

comment on table public.pg_case_type_target is
  'Optional per-PG target for completed cases of a case type, shown as "8 / 10" on Progress.';

create index pg_case_type_target_case_type_idx on public.pg_case_type_target (case_type_id);

create trigger pg_case_type_target_updated_at
  before update on public.pg_case_type_target
  for each row execute function public.set_updated_at();

alter table public.pg_case_type_target enable row level security;

create policy "PG reads own targets" on public.pg_case_type_target
  for select to authenticated using (pg_id = (select auth.uid()));
create policy "PG sets own targets" on public.pg_case_type_target
  for insert to authenticated with check (pg_id = (select auth.uid()));
create policy "PG changes own targets" on public.pg_case_type_target
  for update to authenticated
  using (pg_id = (select auth.uid())) with check (pg_id = (select auth.uid()));
-- A target is a preference, not a clinical record: clearing it removes it.
create policy "PG clears own targets" on public.pg_case_type_target
  for delete to authenticated using (pg_id = (select auth.uid()));

revoke all on public.pg_case_type_target from anon;
revoke truncate on public.pg_case_type_target from authenticated;
revoke all on public.progress_case, public.logbook_entry from anon;
