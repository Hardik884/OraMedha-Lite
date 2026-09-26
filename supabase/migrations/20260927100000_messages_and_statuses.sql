-- =============================================================================
-- Slice 7: patient messages and appointment statuses.
--
--  * message_log — every message the PG opened in WhatsApp for a patient
--    (booked, reminder, rescheduled, missed). While sending is manual this
--    records "WhatsApp opened", never "delivered"; the Business API can later
--    add real delivery states in the same table.
--  * record_visit takes the visit's date, so a forgotten update can be
--    recorded up to 7 days back.
--  * reschedule_appointment — moves an appointment, or books the follow-on
--    to a missed/cancelled one (keeping that record), in one retry-safe call.
--  * Views: the case's last appointment (why it needs attention) and the
--    patient's phone for appointment lists.
--
-- "Unconfirmed" is worked out in the app from the PG's reminder preference
-- (lib/appointments/timing.ts), so no background job is needed.
-- =============================================================================

-- ── message_log ──────────────────────────────────────────────────────────────
create table public.message_log (
  id             uuid primary key default gen_random_uuid(),
  pg_id          uuid not null default auth.uid() references public.pg_profile (id),
  appointment_id uuid not null,
  kind           text not null check (kind in ('booked', 'reminder', 'rescheduled', 'missed')),
  -- Which reminder: the evening before, or the one shortly before.
  reminder       text check (reminder in ('evening', 'soon')),
  -- The appointment time the message was about: a reminder for 11:00 doesn't
  -- count once the appointment has moved to 3:00.
  for_starts_at  timestamptz not null,
  channel        text not null default 'whatsapp_link' check (channel in ('whatsapp_link')),
  status         text not null default 'opened' check (status in ('opened')),
  created_at     timestamptz not null default now(),

  constraint message_log_appointment_same_pg
    foreign key (appointment_id, pg_id) references public.appointment (id, pg_id),
  constraint message_log_reminder_kind
    check ((kind = 'reminder') = (reminder is not null))
);

comment on table public.message_log is
  'Messages the PG opened in WhatsApp for a patient. status = opened: OraMedha does not know whether it was sent or delivered.';

create index message_log_appointment_pg_idx on public.message_log (appointment_id, pg_id);
create index message_log_pg_idx on public.message_log (pg_id, created_at);

alter table public.message_log enable row level security;

create policy "PG reads own messages" on public.message_log
  for select to authenticated using (pg_id = (select auth.uid()));
create policy "PG records own messages" on public.message_log
  for insert to authenticated with check (pg_id = (select auth.uid()));

-- A log: written once, never edited or erased by the app.
revoke all on public.message_log from anon;
revoke update, delete, truncate on public.message_log from authenticated;

-- ── Views ────────────────────────────────────────────────────────────────────
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
  a.purpose,
  p.phone                       as patient_phone,
  c.status                      as case_status
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
  na.purpose             as next_appointment_purpose,
  la.id                  as last_appointment_id,
  la.starts_at           as last_appointment_at,
  la.status              as last_appointment_status
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
-- The case's most recent appointment, whatever happened to it: tells
-- "missed" and "cancelled" apart from "never booked" on the Pending tab.
left join lateral (
  select a.id, a.starts_at, a.status
  from public.appointment a
  where a.case_id = c.id
    and a.deleted_at is null
  order by a.starts_at desc
  limit 1
) la on true
where c.deleted_at is null
  and p.deleted_at is null;

-- ── record_visit: the visit's date ───────────────────────────────────────────
-- Unchanged from 20260926160000 except that the visit can be for a day up to
-- 7 days back (p_visit_date). The added parameter changes the signature, so
-- the old function is dropped rather than left as an ambiguous overload.
drop function public.record_visit(uuid, uuid[], text, boolean, uuid, text, uuid, text, uuid, uuid, timestamptz, integer);

create function public.record_visit(
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
  p_next_duration_min   integer default null,
  p_visit_date          date default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_case           public.patient_case%rowtype;
  v_today          date := public.ist_today();
  -- The day the visit happened: today, or up to 7 days back (a forgotten update).
  v_date           date := coalesce(p_visit_date, v_today);
  v_day_start      timestamptz := (v_date::timestamp at time zone 'Asia/Kolkata');
  v_day_end        timestamptz := ((v_date + 1)::timestamp at time zone 'Asia/Kolkata');
  v_stage_ids      uuid[] := coalesce(p_stage_ids, '{}');
  v_other          text := nullif(btrim(p_other_work), '');
  v_visit_id       uuid;
  v_prev_next_appt uuid;
  v_move_appt      uuid;
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

  if v_date > v_today or v_date < v_today - 7 then
    raise exception 'A visit can be recorded for today or up to 7 days back' using errcode = 'invalid_parameter_value';
  end if;
  -- Recording an older visit after a newer one would wind the case back.
  if v_date < v_today and exists (
    select 1 from public.visit v
    where v.case_id = p_case_id and v.visit_date > v_date and v.deleted_at is null
  ) then
    raise exception 'A later visit is already recorded for this case' using errcode = 'invalid_parameter_value';
  end if;

  if p_modifier_id is not null and exists (
    select 1 from public.modifier m
    where m.id = p_modifier_id and m.stage_id is not null and not (m.stage_id = any (v_stage_ids))
  ) then
    raise exception 'That note only applies to a stage not done today' using errcode = 'invalid_parameter_value';
  end if;

  -- ── 1. That day's visit: reuse, never a second ────────────────────────────
  select v.id, v.next_appointment_id into v_visit_id, v_prev_next_appt
  from public.visit v
  where v.case_id = p_case_id and v.visit_date = v_date and v.deleted_at is null;

  if v_visit_id is null then
    insert into public.visit (id, case_id, visit_date)
    values (p_new_visit_id, p_case_id, v_date)
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

  -- ── 3. That day's appointment for this case → completed ───────────────────
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
  -- The appointment to MOVE rather than add another:
  --   a) the one this visit booked earlier (editing), if still in the future;
  --   b) otherwise (for a next treatment visit) the case's own upcoming
  --      appointment on a later day, e.g. booked at New Patient step 3
  --      before today's visit was updated.
  -- One case never ends up with two upcoming appointments this way.
  select a.id into v_move_appt
  from public.appointment a
  where a.id = v_prev_next_appt
    and a.deleted_at is null
    and a.status in ('scheduled', 'confirmed', 'unconfirmed')
    and a.starts_at > now();

  -- (b) only for a next TREATMENT visit: completing a case cancels leftover
  -- treatment visits (step 5) and books any review as a new appointment.
  if v_move_appt is null and not p_complete_case then
    select a.id into v_move_appt
    from public.appointment a
    where a.case_id = p_case_id
      and a.deleted_at is null
      and a.status in ('scheduled', 'confirmed', 'unconfirmed')
      -- after the visit's day, and not already past (a visit recorded late)
      and a.starts_at >= greatest(v_day_end, now())
      and (p_next_appointment_id is null or a.id <> p_next_appointment_id)
    order by a.starts_at
    limit 1;
  end if;

  if p_next_appointment_id is not null then
    if v_move_appt is not null then
      v_next_appt := v_move_appt;
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
    -- Editing to "no appointment": withdraw the one THIS visit booked earlier,
    -- if it has not happened yet. An appointment the PG booked separately is
    -- left alone.
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

revoke all on function public.record_visit(uuid, uuid[], text, boolean, uuid, text, uuid, text, uuid, uuid, timestamptz, integer, date)
  from public, anon;
grant execute on function public.record_visit(uuid, uuid[], text, boolean, uuid, text, uuid, text, uuid, uuid, timestamptz, integer, date)
  to authenticated;

-- ── reschedule_appointment ───────────────────────────────────────────────────
-- A booked appointment is MOVED (and needs confirming again). A missed or
-- cancelled one is kept as it was — it's part of the patient's history — and
-- a new appointment is booked in its place (rescheduled_from_id).
-- Retry-safe: p_new_id is made on the phone; calling again returns the same.
create or replace function public.reschedule_appointment(
  p_appointment_id uuid,
  p_new_id         uuid,
  p_starts_at      timestamptz,
  p_duration_min   integer
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v public.appointment%rowtype;
begin
  if exists (select 1 from public.appointment where id = p_new_id) then
    return p_new_id;
  end if;

  select * into v
  from public.appointment
  where id = p_appointment_id and deleted_at is null
  for update;
  if not found then
    raise exception 'Appointment not found' using errcode = 'invalid_parameter_value';
  end if;
  if p_starts_at <= now() then
    raise exception 'Pick a time that hasn''t passed' using errcode = 'invalid_parameter_value';
  end if;

  if v.status in ('scheduled', 'confirmed', 'unconfirmed') then
    update public.appointment
    set starts_at = p_starts_at,
        duration_min = p_duration_min,
        status = 'scheduled',
        status_changed_at = now()
    where id = v.id;
    return v.id;
  end if;

  if v.status in ('missed', 'cancelled') then
    insert into public.appointment
      (id, patient_id, case_id, planned_stage_id, starts_at, duration_min, status, purpose, rescheduled_from_id)
    values (
      p_new_id, v.patient_id, v.case_id,
      case
        when v.purpose = 'treatment'
          then coalesce((select c.current_stage_id from public.patient_case c where c.id = v.case_id), v.planned_stage_id)
      end,
      p_starts_at, p_duration_min, 'scheduled', v.purpose, v.id
    );
    return p_new_id;
  end if;

  raise exception 'This appointment can''t be rescheduled' using errcode = 'invalid_parameter_value';
end;
$$;

revoke all on function public.reschedule_appointment(uuid, uuid, timestamptz, integer) from public, anon;
grant execute on function public.reschedule_appointment(uuid, uuid, timestamptz, integer) to authenticated;
