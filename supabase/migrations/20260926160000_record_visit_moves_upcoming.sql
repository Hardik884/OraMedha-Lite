-- =============================================================================
-- record_visit: move the case's upcoming appointment instead of adding one.
--
-- Found while testing Slice 5: a case booked at New Patient step 3 (say for
-- Tuesday), then updated the same day, ended up with TWO upcoming
-- appointments — the Tuesday one and the new one from Next Step — because
-- record_visit only moved an appointment the visit itself had booked.
--
-- Now "Confirm & schedule" moves the case's upcoming appointment (the one
-- this visit booked, else the case's next one on a later day). "Schedule
-- later" still only withdraws an appointment this visit booked; one booked
-- separately is kept. Everything else is unchanged from 20260926140000.
-- =============================================================================

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
      and a.starts_at >= v_day_end
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
