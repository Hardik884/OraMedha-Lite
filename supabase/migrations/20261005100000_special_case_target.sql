-- =============================================================================
-- Special-case targets
--
-- A PG can aim for a number of completed special cases ("5 special cases"),
-- one target per specialty, shown on Progress as "3 / 5" next to the
-- special-case counts. Like the case-type targets: optional, the PG's own,
-- and cleared by deleting the row (a preference, not a clinical record).
-- The count itself is still calculated from cases, never stored.
-- =============================================================================

create table public.pg_special_case_target (
  id            uuid primary key default gen_random_uuid(),
  pg_id         uuid not null default auth.uid() references public.pg_profile (id),
  specialty_id  uuid not null references public.specialty (id),
  target        integer not null check (target between 1 and 1000),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (pg_id, specialty_id)
);

comment on table public.pg_special_case_target is
  'Optional per-PG target for completed special cases in a specialty, shown as "3 / 5" on Progress.';

create index pg_special_case_target_specialty_idx on public.pg_special_case_target (specialty_id);

create trigger pg_special_case_target_updated_at
  before update on public.pg_special_case_target
  for each row execute function public.set_updated_at();

alter table public.pg_special_case_target enable row level security;

create policy "PG reads own special targets" on public.pg_special_case_target
  for select to authenticated using (pg_id = (select auth.uid()));
create policy "PG sets own special targets" on public.pg_special_case_target
  for insert to authenticated with check (pg_id = (select auth.uid()));
create policy "PG changes own special targets" on public.pg_special_case_target
  for update to authenticated
  using (pg_id = (select auth.uid())) with check (pg_id = (select auth.uid()));
create policy "PG clears own special targets" on public.pg_special_case_target
  for delete to authenticated using (pg_id = (select auth.uid()));

revoke all on public.pg_special_case_target from anon;
revoke truncate on public.pg_special_case_target from authenticated;
