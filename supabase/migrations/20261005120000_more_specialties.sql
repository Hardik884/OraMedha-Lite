-- =============================================================================
-- More specialties, and revised Endodontic and Prosthodontic steps.
--
-- Steps (names and order) come from the PGs' own lists. ⚠ Every DURATION and
-- GAP below is still a PLACEHOLDER to confirm with PGs (is_placeholder =
-- true), except where a PG gave the number (noted inline). PGs can already
-- override durations and gaps for themselves.
--
--   Endodontics · Primary RCT — revised to 4 visits (≈90% of RCTs):
--     Access opening & BMP → Obturation & post-endo → Crown cutting → Crown cementation
--     Existing cases keep the earlier steps: rewriting them would relabel past
--     visits in PGs' logbooks. The earlier case type stays (renamed, closed to
--     new cases) and new cases use the new one.
--   Prosthodontics · Complete denture — revised:
--     Impression taking → Border moulding → Try-in → Final denture
--   New: Orthodontics, Oral & Maxillofacial Surgery, Periodontics,
--        Pedodontics (many case types to choose from), Implantology.
-- =============================================================================

-- ── Specialties ──────────────────────────────────────────────────────────────
insert into public.specialty (code, name, sort_order) values
  ('orthodontics', 'Orthodontics',                 30),
  ('oral_surgery', 'Oral & Maxillofacial Surgery', 40),
  ('periodontics', 'Periodontics',                 50),
  ('pedodontics',  'Pedodontics',                  60),
  ('implantology', 'Implantology',                 70)
on conflict (code) do nothing;

-- ── Primary RCT: close the earlier case type to new cases ───────────────────
update public.case_type ct
set name = 'Primary RCT (earlier steps)', is_active = false, sort_order = 90
from public.specialty s
where s.id = ct.specialty_id and s.code = 'endodontics' and ct.code = 'primary_rct';

-- ── Complete denture: replace its steps (refuses if anything uses them) ─────
do $$
declare
  v_ct uuid;
begin
  select ct.id into v_ct
  from public.case_type ct join public.specialty s on s.id = ct.specialty_id
  where s.code = 'prosthodontics' and ct.code = 'complete_denture';

  if v_ct is null then
    return;
  end if;
  -- Already revised (re-run): nothing to do.
  if exists (select 1 from public.stage where case_type_id = v_ct and code = 'border_moulding') then
    return;
  end if;
  if exists (select 1 from public.patient_case where case_type_id = v_ct)
     or exists (select 1 from public.pg_stage_override o join public.stage st on st.id = o.stage_id where st.case_type_id = v_ct)
     or exists (select 1 from public.modifier where case_type_id = v_ct) then
    raise exception 'Complete denture is in use; its steps must be revised without deleting them';
  end if;

  update public.stage set next_stage_on_complete_id = null, next_stage_on_partial_id = null where case_type_id = v_ct;
  delete from public.stage where case_type_id = v_ct;
end $$;

-- ── Case types ───────────────────────────────────────────────────────────────
insert into public.case_type (specialty_id, code, name, sort_order, tooth_required)
select s.id, v.code, v.name, v.sort_order, v.tooth_required
from (values
  ('endodontics',  'rct',              'Primary RCT',                10, true),
  ('orthodontics', 'fixed_appliance',  'Fixed orthodontic treatment', 10, false),
  ('oral_surgery', 'extraction',       'Extraction',                 10, true),
  ('periodontics', 'scaling',          'Scaling',                    10, false),
  ('pedodontics',  'pulpotomy',        'Pulpotomy',                  10, true),
  ('pedodontics',  'pulpectomy',       'Pulpectomy',                 20, true),
  ('pedodontics',  'extraction',       'Extraction',                 30, true),
  ('pedodontics',  'restoration',      'Restoration',                40, true),
  ('pedodontics',  'ssc',              'Stainless steel crown',      50, true),
  ('pedodontics',  'space_maintainer', 'Space maintainer',           60, true),
  ('pedodontics',  'preventive',       'Sealants / fluoride',        70, false),
  ('implantology', 'implant',          'Implant',                    10, true)
) as v (specialty_code, code, name, sort_order, tooth_required)
join public.specialty s on s.code = v.specialty_code
on conflict (specialty_id, code) do nothing;

-- ── Stages (PLACEHOLDER durations and gaps unless noted) ─────────────────────
insert into public.stage (
  case_type_id, code, name, sort_order,
  default_duration_min, default_gap_min_days, default_gap_max_days
)
select ct.id, v.code, v.name, v.sort_order, v.duration_min, v.gap_min, v.gap_max
from (values
  -- Endodontics · Primary RCT (revised)
  ('endodontics', 'rct', 'access_bmp',           'Access opening & BMP',   10, 60, 7::int, 14::int),
  ('endodontics', 'rct', 'obturation_post_endo', 'Obturation & post-endo', 20, 60, 7,      14),
  ('endodontics', 'rct', 'crown_cutting',        'Crown cutting',          30, 60, 7,      10),
  ('endodontics', 'rct', 'crown_cementation',    'Crown cementation',      40, 30, null,   null),

  -- Prosthodontics · Complete denture (revised)
  ('prosthodontics', 'complete_denture', 'impression',      'Impression taking', 10, 30, 5,    7),
  ('prosthodontics', 'complete_denture', 'border_moulding', 'Border moulding',   20, 45, 5,    7),
  ('prosthodontics', 'complete_denture', 'try_in',          'Try-in',            30, 45, 5,    7),
  ('prosthodontics', 'complete_denture', 'final_denture',   'Final denture',     40, 45, null, null),

  -- Orthodontics · Fixed orthodontic treatment. Stages marked "if indicated"
  -- can be skipped by choosing a different next step at the visit.
  ('orthodontics', 'fixed_appliance', 'records',       'Records: case history, photos, OPG, ceph, impressions', 10, 60, 7,  14),
  ('orthodontics', 'fixed_appliance', 'analysis',      'Analysis, problem list & treatment plan',               20, 30, 7,  14),
  ('orthodontics', 'fixed_appliance', 'banding',       'Banding of molars (if indicated)',                      30, 45, 7,  14),
  ('orthodontics', 'fixed_appliance', 'bonding',       'Bonding of brackets',                                   40, 60, 21, 35),
  ('orthodontics', 'fixed_appliance', 'alignment',     'Initial alignment & levelling (round NiTi archwires)',  50, 30, 21, 35),
  ('orthodontics', 'fixed_appliance', 'space_gaining', 'Space gaining: IPR / extraction (if indicated)',        60, 30, 21, 35),
  ('orthodontics', 'fixed_appliance', 'space_closure', 'Closure of residual spaces',                            70, 30, 21, 35),
  ('orthodontics', 'fixed_appliance', 'finishing',     'Finishing & detailing',                                 80, 30, null, null),

  -- Oral & Maxillofacial Surgery · Extraction. Gap of 7 days given by PGs.
  ('oral_surgery', 'extraction', 'extraction',     'Extraction',     10, 30, 7,    7),
  ('oral_surgery', 'extraction', 'suture_removal', 'Suture removal', 20, 15, null, null),

  -- Periodontics · Scaling: one visit (given by PGs).
  ('periodontics', 'scaling', 'scaling', 'Scaling', 10, 45, null, null),

  -- Pedodontics
  ('pedodontics', 'pulpotomy',        'pulpotomy',       'Pulpotomy',                       10, 45, null, null),
  ('pedodontics', 'pulpectomy',       'access_cleaning', 'Access & canal cleaning',         10, 45, 7,    14),
  ('pedodontics', 'pulpectomy',       'obturation',      'Obturation',                      20, 45, null, null),
  ('pedodontics', 'extraction',       'extraction',      'Extraction',                      10, 30, null, null),
  ('pedodontics', 'restoration',      'restoration',     'Restoration',                     10, 30, null, null),
  ('pedodontics', 'ssc',              'ssc',             'Stainless steel crown',           10, 45, null, null),
  ('pedodontics', 'space_maintainer', 'band_impression', 'Band adaptation & impression',    10, 30, 7,    10),
  ('pedodontics', 'space_maintainer', 'cementation',     'Cementation',                     20, 30, null, null),
  ('pedodontics', 'preventive',       'preventive',      'Sealants / fluoride application', 10, 30, null, null),

  -- Implantology · Implant
  ('implantology', 'implant', 'placement',  'Implant placement',  10, 60, 90,   120),
  ('implantology', 'implant', 'prosthesis', 'Implant prosthesis', 20, 45, null, null)
) as v (specialty_code, case_type_code, code, name, sort_order, duration_min, gap_min, gap_max)
join public.specialty s  on s.code = v.specialty_code
join public.case_type ct on ct.specialty_id = s.id and ct.code = v.case_type_code
on conflict (case_type_id, code) do nothing;

-- ── Next stage when Complete (PLACEHOLDER) ───────────────────────────────────
update public.stage st
set next_stage_on_complete_id = nxt.id
from (values
  ('endodontics',    'rct',              'access_bmp',           'obturation_post_endo'),
  ('endodontics',    'rct',              'obturation_post_endo', 'crown_cutting'),
  ('endodontics',    'rct',              'crown_cutting',        'crown_cementation'),
  ('prosthodontics', 'complete_denture', 'impression',           'border_moulding'),
  ('prosthodontics', 'complete_denture', 'border_moulding',      'try_in'),
  ('prosthodontics', 'complete_denture', 'try_in',               'final_denture'),
  ('orthodontics',   'fixed_appliance',  'records',              'analysis'),
  ('orthodontics',   'fixed_appliance',  'analysis',             'banding'),
  ('orthodontics',   'fixed_appliance',  'banding',              'bonding'),
  ('orthodontics',   'fixed_appliance',  'bonding',              'alignment'),
  ('orthodontics',   'fixed_appliance',  'alignment',            'space_gaining'),
  ('orthodontics',   'fixed_appliance',  'space_gaining',        'space_closure'),
  ('orthodontics',   'fixed_appliance',  'space_closure',        'finishing'),
  ('oral_surgery',   'extraction',       'extraction',           'suture_removal'),
  ('pedodontics',    'pulpectomy',       'access_cleaning',      'obturation'),
  ('pedodontics',    'space_maintainer', 'band_impression',      'cementation'),
  ('implantology',   'implant',          'placement',            'prosthesis')
) as v (specialty_code, case_type_code, from_code, to_code)
join public.specialty s  on s.code = v.specialty_code
join public.case_type ct on ct.specialty_id = s.id and ct.code = v.case_type_code
join public.stage nxt    on nxt.case_type_id = ct.id and nxt.code = v.to_code
where st.case_type_id = ct.id
  and st.code = v.from_code
  and st.next_stage_on_complete_id is null;

-- ── Modifiers (PLACEHOLDER) ──────────────────────────────────────────────────
-- The revised Primary RCT keeps the medicament note of the earlier one.
insert into public.modifier (
  case_type_id, stage_id, code, group_label, label,
  override_gap_min_days, override_gap_max_days, override_next_stage_id, sort_order
)
select ct.id, null, 'medicament_calcium_hydroxide', 'Medicament placed', 'Calcium hydroxide', 7, 14, null, 10
from public.case_type ct join public.specialty s on s.id = ct.specialty_id
where s.code = 'endodontics' and ct.code = 'rct'
on conflict (case_type_id, code) do nothing;

-- ── Targets follow the revised Primary RCT ───────────────────────────────────
-- A PG's "Primary RCT: 10" target now also applies to the new case type.
insert into public.pg_case_type_target (pg_id, case_type_id, target)
select t.pg_id, new_ct.id, t.target
from public.pg_case_type_target t
join public.case_type old_ct on old_ct.id = t.case_type_id and old_ct.code = 'primary_rct'
join public.specialty s on s.id = old_ct.specialty_id and s.code = 'endodontics'
join public.case_type new_ct on new_ct.specialty_id = s.id and new_ct.code = 'rct'
on conflict (pg_id, case_type_id) do nothing;
