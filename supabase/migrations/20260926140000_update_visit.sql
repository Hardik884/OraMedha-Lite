-- =============================================================================
-- Slice 4: Update Visit.
--
--  * Optional gap after a PARTIAL visit (template + PG override).
--  * Visits record their overall outcome, any "Other" work, and the next
--    appointment they booked (so editing a visit can move that appointment).
--  * At most ONE visit per case per day.
--  * Appointments have a purpose: treatment, or a review/recall after the
--    case is complete.
--  * record_visit(): the whole update — visit, stages, case, today's
--    appointment, next appointment — in one retry-safe transaction.
-- =============================================================================

-- ── Partial gap ─────────────────────────────────────────────────────────────
alter table public.stage
  add column partial_gap_min_days integer check (partial_gap_min_days >= 0),
  add column partial_gap_max_days integer check (partial_gap_max_days >= 0),
  add constraint stage_partial_gap_pair check (
    (partial_gap_min_days is null) = (partial_gap_max_days is null)
    and (partial_gap_min_days is null or partial_gap_min_days <= partial_gap_max_days)
  );

comment on column public.stage.partial_gap_min_days is
  'Optional: earliest next visit after a PARTIAL visit of this stage. NULL = use the normal gap.';

alter table public.pg_stage_override
  add column partial_gap_min_days integer check (partial_gap_min_days >= 0),
  add column partial_gap_max_days integer check (partial_gap_max_days >= 0),
  add constraint pg_stage_override_partial_gap_pair check (
    (partial_gap_min_days is null) = (partial_gap_max_days is null)
    and (partial_gap_min_days is null or partial_gap_min_days <= partial_gap_max_days)
  );

-- ── Appointment purpose ─────────────────────────────────────────────────────
alter table public.appointment
  add column purpose text not null default 'treatment' check (purpose in ('treatment', 'review'));

comment on column public.appointment.purpose is
  'treatment = a visit of an ongoing case; review = a review/recall after the case is complete.';

-- ── Visit: outcome, other work, the appointment it booked ───────────────────
alter table public.visit
  add column outcome text check (outcome in ('partial', 'complete')),
  add column other_work text check (length(btrim(other_work)) between 1 and 200),
  add column next_appointment_id uuid,
  add constraint visit_next_appointment_same_pg
    foreign key (next_appointment_id, pg_id) references public.appointment (id, pg_id);

create index visit_next_appointment_pg_idx on public.visit (next_appointment_id, pg_id);

comment on column public.visit.outcome is
  'Partial / Complete for the furthest stage worked on (NULL until the visit is updated).';
comment on column public.visit.next_appointment_id is
  'The appointment this visit booked, so editing the visit can move it while it is still in the future.';

-- ── One visit per case per day ──────────────────────────────────────────────
create unique index visit_one_per_case_per_day
  on public.visit (case_id, visit_date)
  where deleted_at is null;

-- ── Read models: expose purpose ─────────────────────────────────────────────
-- (CREATE OR REPLACE VIEW may only add columns at the end.)
create or replace view public.appointment_overview
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
  coalesce(ps.name, cs.name)    as stage_name,
  a.purpose
from public.appointment a
join public.patient p          on p.id = a.patient_id
left join public.patient_case c on c.id = a.case_id
left join public.case_type ct   on ct.id = c.case_type_id
left join public.stage ps       on ps.id = a.planned_stage_id
left join public.stage cs       on cs.id = c.current_stage_id
where a.deleted_at is null
  and p.deleted_at is null;

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
  na.purpose             as next_appointment_purpose
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
where c.deleted_at is null
  and p.deleted_at is null;

-- ── record_visit ────────────────────────────────────────────────────────────
-- Everything "Update Visit" saves, in ONE transaction:
--   1. today's visit for this case — reused if it exists (e.g. the one New
--      Patient saved as "In progress"), never a second one;
--   2. the stages done (earlier ones Complete, the furthest one = p_outcome);
--   3. today's appointment for this case → completed, and linked to the visit;
--   4. the next appointment — or, when the visit is being EDITED, the
--      appointment it booked before is moved (if still in the future) or
--      withdrawn (if no appointment is wanted any more);
--   5. the case: current stage = the chosen next step, or completed.
--
-- RETRY-SAFE: running it again with the same arguments gives the same result
-- (the visit is found by case + date, the appointment by its id). An edit is
-- just another call with different arguments.
--
-- SECURITY INVOKER: every row is written as the signed-in PG, under Row
-- Level Security, exactly like a direct insert.
create or replace function public.record_visit(
  p_case_id             uuid,
  p_stage_ids           uuid[],
  p_outcome             text,
  p_complete_case       boolean,
  p_new_visit_id        uuid,
  p_other_work          text default null,
  p_modifier_id         uuid default null,
  p_note                text default null,
  p_next_stage_id       uuid default null,
  p_next_appointment_id uuid default null,
  p_next_starts_at      timestamptz default null,
  p_next_duration_min   integer default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_case           public.patient_case%rowtype;
  v_today          date := public.ist_today();
  v_day_start      timestamptz := (v_today::timestamp at time zone 'Asia/Kolkata');
  v_day_end        timestamptz := ((v_today + 1)::timestamp at time zone 'Asia/Kolkata');
  v_stage_ids      uuid[] := coalesce(p_stage_ids, '{}');
  v_other          text := nullif(btrim(p_other_work), '');
  v_visit_id       uuid;
  v_prev_next_appt uuid;
  v_today_appt     uuid;
  v_driving        uuid;
  v_next_appt      uuid;
  v_purpose        text := case when p_complete_case then 'review' else 'treatment' end;
begin
  -- ── Checks ────────────────────────────────────────────────────────────────
  if p_outcome is null or p_outcome not in ('partial', 'complete') then
    raise exception 'Choose Partial or Complete' using errcode = 'invalid_parameter_value';
  end if;
  if cardinality(v_stage_ids) = 0 and v_other is null then
    raise exception 'Choose what was done today' using errcode = 'invalid_parameter_value';
  end if;
  if not p_complete_case and p_next_stage_id is null then
    raise exception 'Choose the next step' using errcode = 'invalid_parameter_value';
  end if;
  if p_next_appointment_id is not null and (p_next_starts_at is null or p_next_duration_min is null) then
    raise exception 'The next appointment needs a time and a duration' using errcode = 'invalid_parameter_value';
  end if;

  select * into v_case
  from public.patient_case
  where id = p_case_id and deleted_at is null
  for update;
  if not found then
    raise exception 'Case not found' using errcode = 'invalid_parameter_value';
  end if;

  if p_modifier_id is not null and exists (
    select 1 from public.modifier m
    where m.id = p_modifier_id and m.stage_id is not null and not (m.stage_id = any (v_stage_ids))
  ) then
    raise exception 'That note only applies to a stage not done today' using errcode = 'invalid_parameter_value';
  end if;

  -- ── 1. Today's visit: reuse, never a second ───────────────────────────────
  select v.id, v.next_appointment_id into v_visit_id, v_prev_next_appt
  from public.visit v
  where v.case_id = p_case_id and v.visit_date = v_today and v.deleted_at is null;

  if v_visit_id is null then
    insert into public.visit (id, case_id, visit_date)
    values (p_new_visit_id, p_case_id, v_today)
    returning id into v_visit_id;
  end if;

  -- ── 2. Stages done ────────────────────────────────────────────────────────
  delete from public.visit_stage
  where visit_id = v_visit_id and not (stage_id = any (v_stage_ids));

  select s.id into v_driving
  from public.stage s
  where s.id = any (v_stage_ids)
  order by s.sort_order desc
  limit 1;

  -- The visit_stage trigger refuses stages from another case type.
  insert into public.visit_stage (visit_id, stage_id, outcome, sort_order)
  select v_visit_id, s.id, case when s.id = v_driving then p_outcome else 'complete' end, s.sort_order
  from public.stage s
  where s.id = any (v_stage_ids)
  on conflict (visit_id, stage_id)
  do update set outcome = excluded.outcome, sort_order = excluded.sort_order;

  -- ── 3. Today's appointment for this case → completed ──────────────────────
  select a.id into v_today_appt
  from public.appointment a
  where a.case_id = p_case_id
    and a.deleted_at is null
    and a.starts_at >= v_day_start and a.starts_at < v_day_end
    and a.status in ('scheduled', 'confirmed', 'unconfirmed', 'completed')
    and (v_prev_next_appt is null or a.id <> v_prev_next_appt)
    and (p_next_appointment_id is null or a.id <> p_next_appointment_id)
  order by a.starts_at
  limit 1;

  if v_today_appt is not null then
    update public.appointment
    set status = 'completed',
        status_changed_at = case when status <> 'completed' then now() else status_changed_at end,
        -- Remember what was actually done at this appointment, so lists keep
        -- showing it after the case moves on to its next stage.
        planned_stage_id = coalesce(v_driving, planned_stage_id)
    where id = v_today_appt;
  end if;

  -- ── 4. Next appointment ───────────────────────────────────────────────────
  if p_next_appointment_id is not null then
    if v_prev_next_appt is not null and exists (
      select 1 from public.appointment a
      where a.id = v_prev_next_appt
        and a.deleted_at is null
        and a.status in ('scheduled', 'confirmed', 'unconfirmed')
        and a.starts_at > now()
    ) then
      -- Editing: move the appointment this visit booked earlier.
      v_next_appt := v_prev_next_appt;
      update public.appointment a
      set status = case when a.starts_at <> p_next_starts_at then 'scheduled' else a.status end,
          status_changed_at = case when a.starts_at <> p_next_starts_at then now() else a.status_changed_at end,
          starts_at = p_next_starts_at,
          duration_min = p_next_duration_min,
          planned_stage_id = case when p_complete_case then null else p_next_stage_id end,
          purpose = v_purpose
      where a.id = v_next_appt;
    else
      insert into public.appointment
        (id, patient_id, case_id, planned_stage_id, starts_at, duration_min, status, purpose)
      values (
        p_next_appointment_id, v_case.patient_id, p_case_id,
        case when p_complete_case then null else p_next_stage_id end,
        p_next_starts_at, p_next_duration_min, 'scheduled', v_purpose
      )
      on conflict (id) do update
      set starts_at = excluded.starts_at,
          duration_min = excluded.duration_min,
          planned_stage_id = excluded.planned_stage_id,
          purpose = excluded.purpose;
      v_next_appt := p_next_appointment_id;
    end if;
  elsif v_prev_next_appt is not null then
    -- Editing to "no appointment": withdraw the one booked earlier, if it
    -- has not happened yet.
    update public.appointment
    set status = 'cancelled', status_changed_at = now()
    where id = v_prev_next_appt
      and status in ('scheduled', 'confirmed', 'unconfirmed')
      and starts_at > now();
  end if;

  -- ── 5. The case ───────────────────────────────────────────────────────────
  if p_complete_case then
    -- No treatment visits are left to come.
    update public.appointment
    set status = 'cancelled', status_changed_at = now()
    where case_id = p_case_id
      and deleted_at is null
      and purpose = 'treatment'
      and status in ('scheduled', 'confirmed', 'unconfirmed')
      and starts_at > now()
      and (v_next_appt is null or id <> v_next_appt);

    update public.patient_case
    set status = 'completed',
        completed_at = coalesce(completed_at, now()),
        current_stage_id = coalesce(v_driving, current_stage_id)
    where id = p_case_id;
  else
    update public.patient_case
    set status = 'ongoing',
        completed_at = null,
        current_stage_id = p_next_stage_id
    where id = p_case_id;
  end if;

  update public.visit
  set outcome = p_outcome,
      other_work = v_other,
      modifier_id = p_modifier_id,
      note = nullif(btrim(p_note), ''),
      next_stage_id = case when p_complete_case then null else p_next_stage_id end,
      appointment_id = coalesce(v_today_appt, appointment_id),
      next_appointment_id = v_next_appt
  where id = v_visit_id;

  return jsonb_build_object(
    'visit_id', v_visit_id,
    'completed_appointment_id', v_today_appt,
    'next_appointment_id', v_next_appt,
    'case_status', case when p_complete_case then 'completed' else 'ongoing' end
  );
end;
$$;

revoke all on function public.record_visit(uuid, uuid[], text, boolean, uuid, text, uuid, text, uuid, uuid, timestamptz, integer)
  from public, anon;
grant execute on function public.record_visit(uuid, uuid[], text, boolean, uuid, text, uuid, text, uuid, uuid, timestamptz, integer)
  to authenticated;
