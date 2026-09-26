-- =============================================================================
-- The PG: profile, scheduling preferences, blocked times, and personal overrides
-- of template defaults.
--
-- Every row here belongs to exactly one PG (pg_id = auth.uid()), enforced by
-- Row Level Security. `pg_id` defaults to auth.uid(), so the app never has to
-- send it — and cannot send someone else's.
-- =============================================================================

-- ── pg_profile ───────────────────────────────────────────────────────────────
create table public.pg_profile (
  -- Same id as the Supabase Auth user. ON DELETE RESTRICT: deleting a login
  -- must never silently wipe years of clinical records with it.
  id            uuid primary key references auth.users (id) on delete restrict,
  full_name     text not null check (length(btrim(full_name)) between 2 and 100),
  college       text not null check (length(btrim(college)) between 2 and 150),
  specialty_id  uuid not null references public.specialty (id),
  onboarded_at  timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.pg_profile is
  'One row per PG, created at first-login onboarding. Its existence means onboarding is done.';

create trigger pg_profile_updated_at
  before update on public.pg_profile
  for each row execute function public.set_updated_at();

-- ── pg_preferences ───────────────────────────────────────────────────────────
-- Not "pg_settings": that name is taken by a built-in Postgres system view
-- (pg_catalog.pg_settings), which is found FIRST whenever SQL writes the name
-- unqualified — a silent trap for every future function or view.
create table public.pg_preferences (
  pg_id            uuid primary key default auth.uid() references public.pg_profile (id),
  -- Clinic timings per ISO weekday (1 = Mon … 7 = Sun), each a list of
  -- {"start":"HH:MM","end":"HH:MM"} sessions. Days left out are off.
  -- Default Mon–Sat 09:00–13:00 and 14:00–16:00 is a PLACEHOLDER the PG
  -- edits in Settings (Slice 3).
  working_hours    jsonb not null default '{
    "1": [{"start": "09:00", "end": "13:00"}, {"start": "14:00", "end": "16:00"}],
    "2": [{"start": "09:00", "end": "13:00"}, {"start": "14:00", "end": "16:00"}],
    "3": [{"start": "09:00", "end": "13:00"}, {"start": "14:00", "end": "16:00"}],
    "4": [{"start": "09:00", "end": "13:00"}, {"start": "14:00", "end": "16:00"}],
    "5": [{"start": "09:00", "end": "13:00"}, {"start": "14:00", "end": "16:00"}],
    "6": [{"start": "09:00", "end": "13:00"}, {"start": "14:00", "end": "16:00"}]
  }'::jsonb check (jsonb_typeof(working_hours) = 'object'),
  slot_step_min    integer not null default 15 check (slot_step_min in (5, 10, 15, 20, 30, 60)),
  scheduling_mode  text not null default 'suggest' check (scheduling_mode in ('suggest', 'auto')),
  reminder_timing  text not null default 'evening_before'
                   check (reminder_timing in ('evening_before', 'two_hours_before', 'both')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.pg_preferences is 'Scheduling preferences for one PG. Created at onboarding.';

create trigger pg_preferences_updated_at
  before update on public.pg_preferences
  for each row execute function public.set_updated_at();

-- ── pg_blocked_time ──────────────────────────────────────────────────────────
-- Times the slot finder must avoid: one-off ("exam on 3 Oct") or weekly
-- ("seminar every Wednesday 9–11").
create table public.pg_blocked_time (
  id          uuid primary key default gen_random_uuid(),
  pg_id       uuid not null default auth.uid() references public.pg_profile (id),
  label       text not null check (length(btrim(label)) between 1 and 80),
  kind        text not null check (kind in ('one_off', 'weekly')),
  -- one_off
  starts_at   timestamptz,
  ends_at     timestamptz,
  -- weekly (times are Asia/Kolkata wall-clock)
  weekday     smallint check (weekday between 1 and 7),
  start_time  time,
  end_time    time,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,

  constraint pg_blocked_time_shape check (
    (kind = 'one_off'
      and starts_at is not null and ends_at > starts_at
      and weekday is null and start_time is null and end_time is null)
    or
    (kind = 'weekly'
      and weekday is not null and start_time is not null and end_time > start_time
      and starts_at is null and ends_at is null)
  )
);

create index pg_blocked_time_pg_idx on public.pg_blocked_time (pg_id) where deleted_at is null;

create trigger pg_blocked_time_updated_at
  before update on public.pg_blocked_time
  for each row execute function public.set_updated_at();

-- ── pg_stage_override ────────────────────────────────────────────────────────
-- "My crown prep takes 90 min." Any NULL column falls back to the template.
create table public.pg_stage_override (
  id            uuid primary key default gen_random_uuid(),
  pg_id         uuid not null default auth.uid() references public.pg_profile (id),
  stage_id      uuid not null references public.stage (id),
  duration_min  integer check (duration_min between 5 and 480),
  gap_min_days  integer check (gap_min_days >= 0),
  gap_max_days  integer check (gap_max_days >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  unique (pg_id, stage_id),
  constraint pg_stage_override_gap_pair check (
    (gap_min_days is null) = (gap_max_days is null)
    and (gap_min_days is null or gap_min_days <= gap_max_days)
  )
);

create trigger pg_stage_override_updated_at
  before update on public.pg_stage_override
  for each row execute function public.set_updated_at();

-- ── pg_modifier_override ─────────────────────────────────────────────────────
-- "When I place <medicament>, I see them again in 10–14 days."
create table public.pg_modifier_override (
  id            uuid primary key default gen_random_uuid(),
  pg_id         uuid not null default auth.uid() references public.pg_profile (id),
  modifier_id   uuid not null references public.modifier (id),
  gap_min_days  integer check (gap_min_days >= 0),
  gap_max_days  integer check (gap_max_days >= 0),
  duration_min  integer check (duration_min between 5 and 480),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  unique (pg_id, modifier_id),
  constraint pg_modifier_override_gap_pair check (
    (gap_min_days is null) = (gap_max_days is null)
    and (gap_min_days is null or gap_min_days <= gap_max_days)
  )
);

create trigger pg_modifier_override_updated_at
  before update on public.pg_modifier_override
  for each row execute function public.set_updated_at();

-- ── Row Level Security ───────────────────────────────────────────────────────
alter table public.pg_profile           enable row level security;
alter table public.pg_preferences       enable row level security;
alter table public.pg_blocked_time      enable row level security;
alter table public.pg_stage_override    enable row level security;
alter table public.pg_modifier_override enable row level security;

-- pg_profile: keyed by id rather than pg_id.
create policy "PG reads own profile" on public.pg_profile
  for select to authenticated using (id = (select auth.uid()));
create policy "PG creates own profile" on public.pg_profile
  for insert to authenticated with check (id = (select auth.uid()));
create policy "PG updates own profile" on public.pg_profile
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "PG reads own preferences" on public.pg_preferences
  for select to authenticated using (pg_id = (select auth.uid()));
create policy "PG creates own preferences" on public.pg_preferences
  for insert to authenticated with check (pg_id = (select auth.uid()));
create policy "PG updates own preferences" on public.pg_preferences
  for update to authenticated
  using (pg_id = (select auth.uid())) with check (pg_id = (select auth.uid()));

-- Blocked times are soft-deleted (deleted_at), so no delete policy.
create policy "PG reads own blocked times" on public.pg_blocked_time
  for select to authenticated using (pg_id = (select auth.uid()));
create policy "PG creates own blocked times" on public.pg_blocked_time
  for insert to authenticated with check (pg_id = (select auth.uid()));
create policy "PG updates own blocked times" on public.pg_blocked_time
  for update to authenticated
  using (pg_id = (select auth.uid())) with check (pg_id = (select auth.uid()));

-- Overrides are preferences, not clinical records: "reset to default" is a
-- real delete of the override row.
create policy "PG reads own stage overrides" on public.pg_stage_override
  for select to authenticated using (pg_id = (select auth.uid()));
create policy "PG creates own stage overrides" on public.pg_stage_override
  for insert to authenticated with check (pg_id = (select auth.uid()));
create policy "PG updates own stage overrides" on public.pg_stage_override
  for update to authenticated
  using (pg_id = (select auth.uid())) with check (pg_id = (select auth.uid()));
create policy "PG deletes own stage overrides" on public.pg_stage_override
  for delete to authenticated using (pg_id = (select auth.uid()));

create policy "PG reads own modifier overrides" on public.pg_modifier_override
  for select to authenticated using (pg_id = (select auth.uid()));
create policy "PG creates own modifier overrides" on public.pg_modifier_override
  for insert to authenticated with check (pg_id = (select auth.uid()));
create policy "PG updates own modifier overrides" on public.pg_modifier_override
  for update to authenticated
  using (pg_id = (select auth.uid())) with check (pg_id = (select auth.uid()));
create policy "PG deletes own modifier overrides" on public.pg_modifier_override
  for delete to authenticated using (pg_id = (select auth.uid()));

-- Signed-out visitors get nothing. Hard deletes are off where soft delete applies.
revoke all on public.pg_profile, public.pg_preferences, public.pg_blocked_time,
  public.pg_stage_override, public.pg_modifier_override from anon;
revoke delete, truncate on public.pg_profile, public.pg_preferences, public.pg_blocked_time
  from authenticated;
revoke truncate on public.pg_stage_override, public.pg_modifier_override from authenticated;
