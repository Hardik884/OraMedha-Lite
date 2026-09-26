-- =============================================================================
-- Slice 2: starting a case, and read models for the Today / Patient screens.
-- =============================================================================

-- ── Case types say whether a tooth number is needed ─────────────────────────
-- Most case types are about one tooth; some (e.g. a full-arch prosthesis) are
-- not. Template data decides, never the app.
alter table public.case_type
  add column tooth_required boolean not null default true;

comment on column public.case_type.tooth_required is
  'Whether a new case of this type must name a tooth (FDI). Template data.';

update public.case_type ct
set tooth_required = false
from public.specialty s
where s.id = ct.specialty_id
  and s.code = 'prosthodontics'
  and ct.code = 'complete_denture';

-- ── A stage can be recorded before its outcome is known ─────────────────────
-- When a case starts, the PG says which stage they are doing today; whether it
-- ended Partial or Complete is recorded later by Update Visit (Slice 4).
-- NULL outcome = "worked on, not yet updated". The logbook only counts
-- 'complete'.
alter table public.visit_stage alter column outcome drop not null;

comment on column public.visit_stage.outcome is
  'partial | complete, or NULL while the visit has not been updated yet.';

-- ── start_case: case + today''s visit + today''s stage, all or nothing ──────
-- One round trip, one transaction: a dropped connection on hospital Wi-Fi can
-- never leave a case without its first visit. IDEMPOTENT on p_case_id — the
-- app generates the id before the first attempt and reuses it on retry, so a
-- retry returns the existing case instead of creating a duplicate.
--
-- SECURITY INVOKER: runs as the signed-in PG, so every insert is checked by
-- the same Row Level Security policies as a direct insert.
create or replace function public.start_case(
  p_case_id       uuid,
  p_patient_id    uuid,
  p_case_type_id  uuid,
  p_stage_id      uuid,
  p_tooth         text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tooth          text := nullif(btrim(p_tooth), '');
  v_tooth_required boolean;
  v_visit_id       uuid;
begin
  if exists (select 1 from public.patient_case where id = p_case_id) then
    return p_case_id;
  end if;

  select ct.tooth_required into v_tooth_required
  from public.case_type ct
  where ct.id = p_case_type_id and ct.is_active;
  if not found then
    raise exception 'Unknown case type' using errcode = 'invalid_parameter_value';
  end if;
  if v_tooth_required and v_tooth is null then
    raise exception 'A tooth number is required for this case type'
      using errcode = 'invalid_parameter_value';
  end if;

  -- The composite FK on current_stage_id refuses a stage from another case type.
  insert into public.patient_case (id, patient_id, case_type_id, tooth, current_stage_id)
  values (p_case_id, p_patient_id, p_case_type_id, v_tooth, p_stage_id);

  insert into public.visit (case_id)
  values (p_case_id)
  returning id into v_visit_id;

  insert into public.visit_stage (visit_id, stage_id)
  values (v_visit_id, p_stage_id);

  return p_case_id;
end;
$$;

-- ── create_patient_with_case: the New Patient flow in one call ──────────────
-- Also idempotent: the patient is only inserted if that id does not exist yet.
create or replace function public.create_patient_with_case(
  p_patient_id    uuid,
  p_full_name     text,
  p_phone         text,
  p_case_id       uuid,
  p_case_type_id  uuid,
  p_stage_id      uuid,
  p_age           smallint default null,
  p_opd_number    text default null,
  p_tooth         text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (select 1 from public.patient where id = p_patient_id) then
    insert into public.patient (id, full_name, phone, age, opd_number)
    values (
      p_patient_id,
      btrim(p_full_name),
      p_phone,
      p_age,
      nullif(btrim(p_opd_number), '')
    );
  end if;

  return public.start_case(p_case_id, p_patient_id, p_case_type_id, p_stage_id, p_tooth);
end;
$$;

-- Optional values (age, OPD number, tooth) are trailing parameters with
-- DEFAULT NULL, so the generated TypeScript types mark them optional.

-- Functions are executable by PUBLIC by default; only signed-in PGs may call these.
revoke all on function public.start_case(uuid, uuid, uuid, uuid, text) from public, anon;
revoke all on function public.create_patient_with_case(uuid, text, text, uuid, uuid, uuid, smallint, text, text)
  from public, anon;
grant execute on function public.start_case(uuid, uuid, uuid, uuid, text) to authenticated;
grant execute on function public.create_patient_with_case(uuid, text, text, uuid, uuid, uuid, smallint, text, text)
  to authenticated;

-- ── case_overview: one row per live case, with its next appointment ─────────
-- security_invoker = true: the view runs with the CALLER's permissions, so the
-- underlying tables' Row Level Security still applies. (A default view runs
-- as its owner and would bypass RLS — every PG would see every case.)
--
-- "Next appointment" = the earliest live (scheduled / confirmed / unconfirmed)
-- appointment from the start of today (India time) onwards, so this morning's
-- not-yet-updated appointment still counts as the case's next one.
create view public.case_overview
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
  na.status              as next_appointment_status
from public.patient_case c
join public.patient p    on p.id = c.patient_id
join public.case_type ct on ct.id = c.case_type_id
left join public.stage s on s.id = c.current_stage_id
left join lateral (
  select a.id, a.starts_at, a.duration_min, a.status
  from public.appointment a
  where a.case_id = c.id
    and a.deleted_at is null
    and a.status in ('scheduled', 'confirmed', 'unconfirmed')
    and a.starts_at >= (public.ist_today()::timestamp at time zone 'Asia/Kolkata')
  order by a.starts_at
  limit 1
) na on true
where c.deleted_at is null
  and p.deleted_at is null;

comment on view public.case_overview is
  'Live cases with patient, case type, current stage and next appointment. RLS applies (security_invoker).';

-- ── appointment_overview: appointments with who / what, for lists ───────────
create view public.appointment_overview
with (security_invoker = true)
as
select
  a.id                          as appointment_id,
  a.pg_id,
  a.starts_at,
  a.duration_min,
  a.status,
  a.patient_id,
  p.full_name                   as patient_name,
  a.case_id,
  c.tooth,
  ct.name                       as case_type_name,
  -- The planned stage if one was set, else where the case currently stands.
  coalesce(ps.name, cs.name)    as stage_name
from public.appointment a
join public.patient p          on p.id = a.patient_id
left join public.patient_case c on c.id = a.case_id
left join public.case_type ct   on ct.id = c.case_type_id
left join public.stage ps       on ps.id = a.planned_stage_id
left join public.stage cs       on cs.id = c.current_stage_id
where a.deleted_at is null
  and p.deleted_at is null;

comment on view public.appointment_overview is
  'Appointments with patient name, tooth, case type and stage. RLS applies (security_invoker).';

revoke all on public.case_overview, public.appointment_overview from anon;
revoke insert, update, delete, truncate on public.case_overview, public.appointment_overview
  from authenticated;
