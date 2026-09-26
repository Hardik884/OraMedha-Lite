-- =============================================================================
-- Procedure templates: specialty → case type → ordered stages, plus modifiers.
--
-- This is where ALL clinical knowledge lives. The app code never names a
-- stage; it only reads these rows. The next-step engine (Slice 4) only knows:
--
--   current stage + Partial/Complete + optional modifier + PG overrides
--     → next stage, gap window (min–max days), expected duration
--
-- Template rows are shared by every PG (read-only to them). Changes ship as
-- migrations. A PG's personal tweaks live in pg_stage_override /
-- pg_modifier_override, never in these tables.
-- =============================================================================

-- ── specialty ────────────────────────────────────────────────────────────────
create table public.specialty (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique check (code ~ '^[a-z0-9_]{2,40}$'),
  name        text not null check (length(btrim(name)) between 1 and 80),
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

comment on table public.specialty is 'Dental specialty, e.g. a PG''s department. Template data.';

-- ── case_type ────────────────────────────────────────────────────────────────
create table public.case_type (
  id            uuid primary key default gen_random_uuid(),
  specialty_id  uuid not null references public.specialty (id),
  code          text not null check (code ~ '^[a-z0-9_]{2,40}$'),
  name          text not null check (length(btrim(name)) between 1 and 80),
  sort_order    integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  unique (specialty_id, code)
);

create index case_type_specialty_idx on public.case_type (specialty_id, sort_order);

comment on table public.case_type is 'A kind of case within a specialty. Owns an ordered list of stages. Template data.';

-- ── stage ────────────────────────────────────────────────────────────────────
create table public.stage (
  id                         uuid primary key default gen_random_uuid(),
  case_type_id               uuid not null references public.case_type (id),
  code                       text not null check (code ~ '^[a-z0-9_]{2,40}$'),
  name                       text not null check (length(btrim(name)) between 1 and 80),
  sort_order                 integer not null,
  default_duration_min       integer not null check (default_duration_min between 5 and 480),
  default_gap_min_days       integer check (default_gap_min_days >= 0),
  default_gap_max_days       integer check (default_gap_max_days >= 0),
  -- NULL = this is the last stage: completing it means the case can be closed.
  next_stage_on_complete_id  uuid,
  -- NULL = the same stage continues at the next visit (the usual case).
  next_stage_on_partial_id   uuid,
  -- TRUE until the duration/gap values are confirmed with practising PGs.
  is_placeholder             boolean not null default true,
  created_at                 timestamptz not null default now(),

  unique (case_type_id, code),
  unique (case_type_id, sort_order),
  -- Target for the composite foreign keys below and in other tables, which
  -- guarantee a "next stage" always belongs to the SAME case type.
  unique (id, case_type_id),

  constraint stage_gap_pair check (
    (default_gap_min_days is null) = (default_gap_max_days is null)
    and (default_gap_min_days is null or default_gap_min_days <= default_gap_max_days)
  ),
  constraint stage_next_on_complete_same_case_type
    foreign key (next_stage_on_complete_id, case_type_id)
    references public.stage (id, case_type_id),
  constraint stage_next_on_partial_same_case_type
    foreign key (next_stage_on_partial_id, case_type_id)
    references public.stage (id, case_type_id)
);

create index stage_case_type_idx on public.stage (case_type_id, sort_order);

comment on table public.stage is
  'One step of a case type. Holds the default duration, the default gap to the next visit, and where the case goes after Complete / Partial. Template data.';
comment on column public.stage.default_gap_min_days is
  'Earliest next visit after this stage, in days. NULL (with max) for a final stage.';
comment on column public.stage.next_stage_on_complete_id is
  'Stage that usually follows when this one is Complete. NULL = last stage; the case can be completed.';
comment on column public.stage.next_stage_on_partial_id is
  'Stage that usually follows when this one is Partial. NULL = the same stage continues.';

-- ── modifier ─────────────────────────────────────────────────────────────────
-- Something the PG can note at a visit that changes what happens next, e.g.
-- group "Medicament placed", label "<the medicament>". Every override column
-- is optional; whatever is set wins over the stage default.
create table public.modifier (
  id                      uuid primary key default gen_random_uuid(),
  case_type_id            uuid not null references public.case_type (id),
  -- NULL = can be noted at any stage of this case type.
  stage_id                uuid,
  code                    text not null check (code ~ '^[a-z0-9_]{2,60}$'),
  group_label             text not null check (length(btrim(group_label)) between 1 and 80),
  label                   text not null check (length(btrim(label)) between 1 and 80),
  override_gap_min_days   integer check (override_gap_min_days >= 0),
  override_gap_max_days   integer check (override_gap_max_days >= 0),
  override_next_stage_id  uuid,
  override_duration_min   integer check (override_duration_min between 5 and 480),
  sort_order              integer not null default 0,
  is_placeholder          boolean not null default true,
  created_at              timestamptz not null default now(),

  unique (case_type_id, code),
  unique (id, case_type_id),

  constraint modifier_gap_pair check (
    (override_gap_min_days is null) = (override_gap_max_days is null)
    and (override_gap_min_days is null or override_gap_min_days <= override_gap_max_days)
  ),
  constraint modifier_overrides_something check (
    override_gap_min_days is not null
    or override_next_stage_id is not null
    or override_duration_min is not null
  ),
  constraint modifier_stage_same_case_type
    foreign key (stage_id, case_type_id)
    references public.stage (id, case_type_id),
  constraint modifier_next_stage_same_case_type
    foreign key (override_next_stage_id, case_type_id)
    references public.stage (id, case_type_id)
);

create index modifier_case_type_idx on public.modifier (case_type_id, sort_order);

comment on table public.modifier is
  'A visit note that overrides the gap, next stage and/or next duration (e.g. "Medicament placed"). Template data.';

-- ── Row Level Security ───────────────────────────────────────────────────────
-- Readable by every signed-in PG. Nobody writes through the API: template
-- changes ship as migrations (which run as the owner and bypass RLS).
alter table public.specialty enable row level security;
alter table public.case_type enable row level security;
alter table public.stage     enable row level security;
alter table public.modifier  enable row level security;

create policy "Signed-in PGs can read specialties"
  on public.specialty for select to authenticated using (true);
create policy "Signed-in PGs can read case types"
  on public.case_type for select to authenticated using (true);
create policy "Signed-in PGs can read stages"
  on public.stage for select to authenticated using (true);
create policy "Signed-in PGs can read modifiers"
  on public.modifier for select to authenticated using (true);

-- Defence in depth on top of RLS: remove the write grants Supabase gives by
-- default, and all access for signed-out visitors.
revoke all on public.specialty, public.case_type, public.stage, public.modifier from anon;
revoke insert, update, delete, truncate
  on public.specialty, public.case_type, public.stage, public.modifier
  from authenticated;
