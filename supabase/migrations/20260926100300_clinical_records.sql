-- =============================================================================
-- Clinical records: patient → case → visits (with the stages done at each),
-- appointments, and files.
--
-- Rules (CLAUDE.md):
--  * Every row belongs to one PG. RLS: a PG only ever sees their own rows.
--  * Soft delete only (deleted_at) on patient, case, visit, appointment, file.
--    There is no DELETE policy and no DELETE grant on those tables.
--  * Logbook and progress counts are NEVER stored: they are calculated from
--    patient_case + visit + visit_stage.
--
-- Cross-PG integrity: composite foreign keys such as (patient_id, pg_id) make
-- it impossible to attach your case to another PG's patient, even by guessing
-- an id — foreign-key checks bypass RLS, so RLS alone would not stop that.
--
-- "case" is a reserved word in SQL, so the table is `patient_case`.
-- =============================================================================

-- ── patient ──────────────────────────────────────────────────────────────────
create table public.patient (
  id          uuid primary key default gen_random_uuid(),
  pg_id       uuid not null default auth.uid() references public.pg_profile (id),
  full_name   text not null check (length(btrim(full_name)) between 1 and 100),
  -- Indian mobile, 10 digits, stored without +91 / spaces.
  phone       text not null check (phone ~ '^[6-9][0-9]{9}$'),
  age         smallint check (age between 0 and 120),
  opd_number  text check (length(btrim(opd_number)) between 1 and 40),
  notes       text check (length(notes) <= 2000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  unique (id, pg_id)
);

create index patient_pg_name_idx on public.patient (pg_id, full_name) where deleted_at is null;
create index patient_pg_phone_idx on public.patient (pg_id, phone) where deleted_at is null;

create trigger patient_updated_at
  before update on public.patient
  for each row execute function public.set_updated_at();

-- ── patient_case ─────────────────────────────────────────────────────────────
create table public.patient_case (
  id                uuid primary key default gen_random_uuid(),
  pg_id             uuid not null default auth.uid() references public.pg_profile (id),
  patient_id        uuid not null,
  case_type_id      uuid not null references public.case_type (id),
  -- FDI notation, e.g. "46". Free text (validated in the app) because some
  -- case types cover several teeth or a whole arch; NULL when not tooth-based.
  tooth             text check (length(btrim(tooth)) between 1 and 40),
  current_stage_id  uuid,
  status            text not null default 'ongoing'
                    check (status in ('ongoing', 'completed', 'discontinued')),
  is_special        boolean not null default false,
  started_on        date not null default public.ist_today(),
  completed_at      timestamptz,
  notes             text check (length(notes) <= 2000),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz,

  unique (id, pg_id),
  unique (id, patient_id, pg_id),
  constraint patient_case_patient_same_pg
    foreign key (patient_id, pg_id) references public.patient (id, pg_id),
  constraint patient_case_stage_same_case_type
    foreign key (current_stage_id, case_type_id) references public.stage (id, case_type_id),
  constraint patient_case_completed_consistent
    check ((status = 'completed') = (completed_at is not null))
);

create index patient_case_pg_status_idx on public.patient_case (pg_id, status) where deleted_at is null;
create index patient_case_patient_idx on public.patient_case (patient_id);
create index patient_case_case_type_idx on public.patient_case (case_type_id);
create index patient_case_current_stage_idx on public.patient_case (current_stage_id);

comment on table public.patient_case is
  'One case (a case type on a tooth) for a patient. A patient may have several. Completed cases stay forever.';

create trigger patient_case_updated_at
  before update on public.patient_case
  for each row execute function public.set_updated_at();

-- ── appointment ──────────────────────────────────────────────────────────────
create table public.appointment (
  id                   uuid primary key default gen_random_uuid(),
  pg_id                uuid not null default auth.uid() references public.pg_profile (id),
  patient_id           uuid not null,
  -- NULL for a visit not yet tied to a case (e.g. first consultation).
  case_id              uuid,
  planned_stage_id     uuid references public.stage (id),
  starts_at            timestamptz not null,
  duration_min         integer not null check (duration_min between 5 and 480),
  status               text not null default 'scheduled'
                       check (status in ('scheduled', 'confirmed', 'unconfirmed',
                                         'cancelled', 'missed', 'completed')),
  status_changed_at    timestamptz,
  patient_informed_at  timestamptz,
  rescheduled_from_id  uuid,
  notes                text check (length(notes) <= 2000),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  deleted_at           timestamptz,

  unique (id, pg_id),
  constraint appointment_patient_same_pg
    foreign key (patient_id, pg_id) references public.patient (id, pg_id),
  -- The case must belong to the same patient AND the same PG.
  constraint appointment_case_same_patient
    foreign key (case_id, patient_id, pg_id) references public.patient_case (id, patient_id, pg_id),
  constraint appointment_rescheduled_from_same_pg
    foreign key (rescheduled_from_id, pg_id) references public.appointment (id, pg_id)
);

create index appointment_pg_starts_idx on public.appointment (pg_id, starts_at) where deleted_at is null;
create index appointment_case_idx on public.appointment (case_id);
create index appointment_patient_idx on public.appointment (patient_id);
create index appointment_planned_stage_idx on public.appointment (planned_stage_id);

create trigger appointment_updated_at
  before update on public.appointment
  for each row execute function public.set_updated_at();

-- ── visit ────────────────────────────────────────────────────────────────────
-- What clinically happened on a day. The stages worked on (with Partial /
-- Complete) are rows in visit_stage, because one visit can cover several.
create table public.visit (
  id              uuid primary key default gen_random_uuid(),
  pg_id           uuid not null default auth.uid() references public.pg_profile (id),
  case_id         uuid not null,
  appointment_id  uuid,
  visit_date      date not null default public.ist_today(),
  modifier_id     uuid references public.modifier (id),
  -- The next step the PG confirmed (engine suggestion or their own change).
  next_stage_id   uuid references public.stage (id),
  note            text check (length(note) <= 2000),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,

  unique (id, pg_id),
  unique (id, case_id, pg_id),
  constraint visit_case_same_pg
    foreign key (case_id, pg_id) references public.patient_case (id, pg_id),
  constraint visit_appointment_same_pg
    foreign key (appointment_id, pg_id) references public.appointment (id, pg_id)
);

create index visit_case_date_idx on public.visit (case_id, visit_date) where deleted_at is null;
create index visit_pg_date_idx on public.visit (pg_id, visit_date) where deleted_at is null;
create index visit_appointment_idx on public.visit (appointment_id);
create index visit_modifier_idx on public.visit (modifier_id);
create index visit_next_stage_idx on public.visit (next_stage_id);

create trigger visit_updated_at
  before update on public.visit
  for each row execute function public.set_updated_at();

-- ── visit_stage ──────────────────────────────────────────────────────────────
-- The logbook's raw material: "on this visit, <stage> was Partial/Complete".
create table public.visit_stage (
  id          uuid primary key default gen_random_uuid(),
  pg_id       uuid not null default auth.uid() references public.pg_profile (id),
  visit_id    uuid not null,
  stage_id    uuid not null references public.stage (id),
  outcome     text not null check (outcome in ('partial', 'complete')),
  sort_order  smallint not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  unique (visit_id, stage_id),
  constraint visit_stage_visit_same_pg
    foreign key (visit_id, pg_id) references public.visit (id, pg_id)
);

create index visit_stage_pg_stage_idx on public.visit_stage (pg_id, stage_id);
create index visit_stage_stage_idx on public.visit_stage (stage_id);

comment on table public.visit_stage is
  'Stages worked on in a visit, with Partial/Complete. Follows its visit''s deleted_at; rows may be removed while correcting a visit.';

create trigger visit_stage_updated_at
  before update on public.visit_stage
  for each row execute function public.set_updated_at();

-- ── file ─────────────────────────────────────────────────────────────────────
-- Metadata only; the bytes live in a private Storage bucket (Slice 6) under
-- "<pg_id>/…", served through signed URLs.
create table public.file (
  id            uuid primary key default gen_random_uuid(),
  pg_id         uuid not null default auth.uid() references public.pg_profile (id),
  case_id       uuid not null,
  visit_id      uuid,
  stage_id      uuid references public.stage (id),
  kind          text not null check (kind in ('xray', 'photo', 'document')),
  label         text not null check (length(btrim(label)) between 1 and 120),
  storage_path  text not null unique,
  mime_type     text not null check (length(mime_type) between 3 and 120),
  size_bytes    bigint not null check (size_bytes > 0 and size_bytes <= 52428800),
  captured_on   date not null default public.ist_today(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,

  constraint file_case_same_pg
    foreign key (case_id, pg_id) references public.patient_case (id, pg_id),
  -- A file attached to a visit must be attached to that visit's case.
  constraint file_visit_same_case
    foreign key (visit_id, case_id, pg_id) references public.visit (id, case_id, pg_id),
  -- Files live under the owning PG's folder in Storage.
  constraint file_storage_path_in_pg_folder
    check (split_part(storage_path, '/', 1) = pg_id::text)
);

create index file_case_idx on public.file (case_id) where deleted_at is null;
create index file_visit_idx on public.file (visit_id);
create index file_stage_idx on public.file (stage_id);

create trigger file_updated_at
  before update on public.file
  for each row execute function public.set_updated_at();

-- ── Template references must match the case's case type ─────────────────────
-- A stage/modifier id from a DIFFERENT case type would silently corrupt the
-- timeline and the logbook, so it is refused at the database.

create or replace function public.assert_stage_in_case(p_stage_id uuid, p_case_id uuid, p_column text)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if p_stage_id is null then
    return;
  end if;
  if not exists (
    select 1
    from public.patient_case c
    join public.stage s on s.case_type_id = c.case_type_id
    where c.id = p_case_id and s.id = p_stage_id
  ) then
    raise exception '% must be a stage of the case''s own case type', p_column
      using errcode = 'check_violation';
  end if;
end;
$$;

create or replace function public.visit_check_template_refs()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform public.assert_stage_in_case(new.next_stage_id, new.case_id, 'next_stage_id');
  if new.modifier_id is not null and not exists (
    select 1
    from public.patient_case c
    join public.modifier m on m.case_type_id = c.case_type_id
    where c.id = new.case_id and m.id = new.modifier_id
  ) then
    raise exception 'modifier_id must belong to the case''s own case type'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger visit_template_refs
  before insert or update of case_id, next_stage_id, modifier_id on public.visit
  for each row execute function public.visit_check_template_refs();

create or replace function public.visit_stage_check_template_refs()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_case_id uuid;
begin
  select v.case_id into v_case_id from public.visit v where v.id = new.visit_id;
  perform public.assert_stage_in_case(new.stage_id, v_case_id, 'stage_id');
  return new;
end;
$$;

create trigger visit_stage_template_refs
  before insert or update of visit_id, stage_id on public.visit_stage
  for each row execute function public.visit_stage_check_template_refs();

create or replace function public.appointment_check_template_refs()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.planned_stage_id is not null and new.case_id is null then
    raise exception 'planned_stage_id needs a case_id' using errcode = 'check_violation';
  end if;
  perform public.assert_stage_in_case(new.planned_stage_id, new.case_id, 'planned_stage_id');
  return new;
end;
$$;

create trigger appointment_template_refs
  before insert or update of case_id, planned_stage_id on public.appointment
  for each row execute function public.appointment_check_template_refs();

create or replace function public.file_check_template_refs()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform public.assert_stage_in_case(new.stage_id, new.case_id, 'stage_id');
  return new;
end;
$$;

create trigger file_template_refs
  before insert or update of case_id, stage_id on public.file
  for each row execute function public.file_check_template_refs();

-- ── Row Level Security ───────────────────────────────────────────────────────
alter table public.patient      enable row level security;
alter table public.patient_case enable row level security;
alter table public.appointment  enable row level security;
alter table public.visit        enable row level security;
alter table public.visit_stage  enable row level security;
alter table public.file         enable row level security;

-- SELECT deliberately does NOT hide soft-deleted rows: an UPDATE that sets
-- deleted_at must still see the row it produces, or Postgres rejects it.
-- The app filters `deleted_at is null` in its queries instead.

create policy "PG reads own patients" on public.patient
  for select to authenticated using (pg_id = (select auth.uid()));
create policy "PG creates own patients" on public.patient
  for insert to authenticated with check (pg_id = (select auth.uid()));
create policy "PG updates own patients" on public.patient
  for update to authenticated
  using (pg_id = (select auth.uid())) with check (pg_id = (select auth.uid()));

create policy "PG reads own cases" on public.patient_case
  for select to authenticated using (pg_id = (select auth.uid()));
create policy "PG creates own cases" on public.patient_case
  for insert to authenticated with check (pg_id = (select auth.uid()));
create policy "PG updates own cases" on public.patient_case
  for update to authenticated
  using (pg_id = (select auth.uid())) with check (pg_id = (select auth.uid()));

create policy "PG reads own appointments" on public.appointment
  for select to authenticated using (pg_id = (select auth.uid()));
create policy "PG creates own appointments" on public.appointment
  for insert to authenticated with check (pg_id = (select auth.uid()));
create policy "PG updates own appointments" on public.appointment
  for update to authenticated
  using (pg_id = (select auth.uid())) with check (pg_id = (select auth.uid()));

create policy "PG reads own visits" on public.visit
  for select to authenticated using (pg_id = (select auth.uid()));
create policy "PG creates own visits" on public.visit
  for insert to authenticated with check (pg_id = (select auth.uid()));
create policy "PG updates own visits" on public.visit
  for update to authenticated
  using (pg_id = (select auth.uid())) with check (pg_id = (select auth.uid()));

create policy "PG reads own visit stages" on public.visit_stage
  for select to authenticated using (pg_id = (select auth.uid()));
create policy "PG creates own visit stages" on public.visit_stage
  for insert to authenticated with check (pg_id = (select auth.uid()));
create policy "PG updates own visit stages" on public.visit_stage
  for update to authenticated
  using (pg_id = (select auth.uid())) with check (pg_id = (select auth.uid()));
create policy "PG deletes own visit stages" on public.visit_stage
  for delete to authenticated using (pg_id = (select auth.uid()));

create policy "PG reads own files" on public.file
  for select to authenticated using (pg_id = (select auth.uid()));
create policy "PG creates own files" on public.file
  for insert to authenticated with check (pg_id = (select auth.uid()));
create policy "PG updates own files" on public.file
  for update to authenticated
  using (pg_id = (select auth.uid())) with check (pg_id = (select auth.uid()));

-- Signed-out visitors get nothing; soft-delete tables cannot be hard-deleted.
revoke all on public.patient, public.patient_case, public.appointment,
  public.visit, public.visit_stage, public.file from anon;
revoke delete, truncate on public.patient, public.patient_case, public.appointment,
  public.visit, public.file from authenticated;
revoke truncate on public.visit_stage from authenticated;
