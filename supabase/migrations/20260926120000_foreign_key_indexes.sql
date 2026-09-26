-- =============================================================================
-- Covering indexes for every foreign key the Supabase performance advisor
-- flagged (unindexed_foreign_keys), plus one for the "next appointment of a
-- case" lookup used by the Today and Patient screens.
--
-- A composite foreign key is only covered by an index whose LEADING columns
-- are the FK columns in the same order. Where a new index makes an older
-- single-column one redundant, the old one is dropped so writes don't pay for
-- two.
-- =============================================================================

-- ── appointment ──────────────────────────────────────────────────────────────
drop index if exists public.appointment_case_idx;
drop index if exists public.appointment_patient_idx;

create index appointment_case_patient_pg_idx
  on public.appointment (case_id, patient_id, pg_id);          -- appointment_case_same_patient
create index appointment_patient_pg_idx
  on public.appointment (patient_id, pg_id);                   -- appointment_patient_same_pg
create index appointment_rescheduled_from_pg_idx
  on public.appointment (rescheduled_from_id, pg_id);          -- appointment_rescheduled_from_same_pg

-- Query index: a case's next live appointment, in time order.
create index appointment_case_starts_idx
  on public.appointment (case_id, starts_at) where deleted_at is null;

-- ── file ─────────────────────────────────────────────────────────────────────
drop index if exists public.file_case_idx;
drop index if exists public.file_visit_idx;

create index file_case_pg_idx on public.file (case_id, pg_id);                 -- file_case_same_pg
create index file_pg_idx on public.file (pg_id);                               -- file_pg_id_fkey
create index file_visit_case_pg_idx on public.file (visit_id, case_id, pg_id); -- file_visit_same_case

-- ── modifier ─────────────────────────────────────────────────────────────────
create index modifier_next_stage_case_type_idx
  on public.modifier (override_next_stage_id, case_type_id);   -- modifier_next_stage_same_case_type
create index modifier_stage_case_type_idx
  on public.modifier (stage_id, case_type_id);                 -- modifier_stage_same_case_type

-- ── patient_case ─────────────────────────────────────────────────────────────
drop index if exists public.patient_case_patient_idx;
drop index if exists public.patient_case_current_stage_idx;

create index patient_case_patient_pg_idx
  on public.patient_case (patient_id, pg_id);                  -- patient_case_patient_same_pg
create index patient_case_stage_case_type_idx
  on public.patient_case (current_stage_id, case_type_id);     -- patient_case_stage_same_case_type

-- ── PG tables ────────────────────────────────────────────────────────────────
create index pg_modifier_override_modifier_idx
  on public.pg_modifier_override (modifier_id);                -- pg_modifier_override_modifier_id_fkey
create index pg_profile_specialty_idx
  on public.pg_profile (specialty_id);                         -- pg_profile_specialty_id_fkey
create index pg_stage_override_stage_idx
  on public.pg_stage_override (stage_id);                      -- pg_stage_override_stage_id_fkey

-- ── stage ────────────────────────────────────────────────────────────────────
create index stage_next_on_complete_idx
  on public.stage (next_stage_on_complete_id, case_type_id);   -- stage_next_on_complete_same_case_type
create index stage_next_on_partial_idx
  on public.stage (next_stage_on_partial_id, case_type_id);    -- stage_next_on_partial_same_case_type

-- ── visit ────────────────────────────────────────────────────────────────────
drop index if exists public.visit_appointment_idx;

create index visit_appointment_pg_idx on public.visit (appointment_id, pg_id); -- visit_appointment_same_pg
create index visit_case_pg_idx on public.visit (case_id, pg_id);               -- visit_case_same_pg

-- ── visit_stage ──────────────────────────────────────────────────────────────
create index visit_stage_visit_pg_idx on public.visit_stage (visit_id, pg_id); -- visit_stage_visit_same_pg
