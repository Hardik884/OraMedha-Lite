-- =============================================================================
-- Shared helpers used by every later migration.
-- =============================================================================

-- Keeps `updated_at` honest without the app having to remember it.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- "Today" in India. The database server runs in UTC, so a plain current_date
-- would roll over at 05:30 IST and file a late-evening visit under tomorrow.
create or replace function public.ist_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Asia/Kolkata')::date;
$$;

comment on function public.ist_today() is
  'Current date in Asia/Kolkata. Use as the default for clinical dates.';
