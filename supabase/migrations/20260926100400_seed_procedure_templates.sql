-- =============================================================================
-- v0.1 procedure templates: Endodontics and Prosthodontics.
--
-- Shipped as a MIGRATION, not seed.sql, because the hosted database needs
-- these rows too (seed.sql only runs on a local `supabase db reset`).
--
-- ⚠ PLACEHOLDERS. Every duration, gap and next-step link below is a starting
-- guess for review with practising PGs — NOT a clinical rule. Every row is
-- flagged is_placeholder = true until confirmed. Change values in a new
-- migration; PGs can already override durations/gaps for themselves.
--
-- Idempotent: re-running inserts nothing that already exists.
-- =============================================================================

-- ── Specialties ──────────────────────────────────────────────────────────────
insert into public.specialty (code, name, sort_order) values
  ('endodontics',    'Endodontics',    10),
  ('prosthodontics', 'Prosthodontics', 20)
on conflict (code) do nothing;

-- ── Case types ───────────────────────────────────────────────────────────────
insert into public.case_type (specialty_id, code, name, sort_order)
select s.id, v.code, v.name, v.sort_order
from (values
  ('endodontics',    'primary_rct',      'Primary RCT',      10),
  ('endodontics',    'retreatment',      'Retreatment',      20),
  ('prosthodontics', 'crown',            'Crown',            10),
  ('prosthodontics', 'complete_denture', 'Complete denture', 20)
) as v (specialty_code, code, name, sort_order)
join public.specialty s on s.code = v.specialty_code
on conflict (specialty_id, code) do nothing;

-- ── Stages (PLACEHOLDER durations and gaps) ──────────────────────────────────
--   duration = expected chair time for the visit (min)
--   gap      = days until the next visit after this stage (NULL = last stage)
insert into public.stage (
  case_type_id, code, name, sort_order,
  default_duration_min, default_gap_min_days, default_gap_max_days
)
select ct.id, v.code, v.name, v.sort_order, v.duration_min, v.gap_min, v.gap_max
from (values
  -- Endodontics · Primary RCT
  ('endodontics', 'primary_rct', 'access_opening', 'Access opening', 10, 45, 3::int,    7::int),
  ('endodontics', 'primary_rct', 'bmp',            'BMP',            20, 60, 7,         14),
  ('endodontics', 'primary_rct', 'obturation',     'Obturation',     30, 60, null,      null),

  -- Endodontics · Retreatment
  -- "Review / continue treatment" is off the main path: it is reached only
  -- when a medicament is placed (see the modifier below).
  ('endodontics', 'retreatment', 'access_opening', 'Access opening',              10, 45, 3,    7),
  ('endodontics', 'retreatment', 'gp_removal',     'GP removal',                  20, 90, 3,    7),
  ('endodontics', 'retreatment', 'review',         'Review / continue treatment', 30, 30, 3,    7),
  ('endodontics', 'retreatment', 'bmp',            'BMP',                         40, 60, 7,    14),
  ('endodontics', 'retreatment', 'obturation',     'Obturation',                  50, 60, null, null),

  -- Prosthodontics · Crown
  ('prosthodontics', 'crown', 'tooth_preparation', 'Tooth preparation', 10, 60, 0,    2),
  ('prosthodontics', 'crown', 'impression',        'Impression',        20, 30, 7,    10),
  ('prosthodontics', 'crown', 'trial',             'Trial',             30, 30, 3,    7),
  ('prosthodontics', 'crown', 'cementation',       'Cementation',       40, 30, null, null),

  -- Prosthodontics · Complete denture
  ('prosthodontics', 'complete_denture', 'primary_impression',    'Primary impression',    10, 30, 3,    7),
  ('prosthodontics', 'complete_denture', 'secondary_impression',  'Secondary impression',  20, 45, 5,    7),
  ('prosthodontics', 'complete_denture', 'jaw_relation',          'Jaw relation',          30, 45, 5,    7),
  ('prosthodontics', 'complete_denture', 'try_in',                'Try-in',                40, 45, 5,    7),
  ('prosthodontics', 'complete_denture', 'insertion',             'Denture insertion',     50, 45, 1,    3),
  ('prosthodontics', 'complete_denture', 'post_insertion_review', 'Post-insertion review', 60, 20, null, null)
) as v (specialty_code, case_type_code, code, name, sort_order, duration_min, gap_min, gap_max)
join public.specialty s  on s.code = v.specialty_code
join public.case_type ct on ct.specialty_id = s.id and ct.code = v.case_type_code
on conflict (case_type_id, code) do nothing;

-- ── Next stage when Complete (PLACEHOLDER) ───────────────────────────────────
-- Left NULL on the last stage of each case type. Next-on-Partial is left NULL
-- everywhere, meaning "the same stage continues".
update public.stage st
set next_stage_on_complete_id = nxt.id
from (values
  ('endodontics',    'primary_rct',      'access_opening',       'bmp'),
  ('endodontics',    'primary_rct',      'bmp',                  'obturation'),
  ('endodontics',    'retreatment',      'access_opening',       'gp_removal'),
  ('endodontics',    'retreatment',      'gp_removal',           'bmp'),
  ('endodontics',    'retreatment',      'review',               'bmp'),
  ('endodontics',    'retreatment',      'bmp',                  'obturation'),
  ('prosthodontics', 'crown',            'tooth_preparation',    'impression'),
  ('prosthodontics', 'crown',            'impression',           'trial'),
  ('prosthodontics', 'crown',            'trial',                'cementation'),
  ('prosthodontics', 'complete_denture', 'primary_impression',   'secondary_impression'),
  ('prosthodontics', 'complete_denture', 'secondary_impression', 'jaw_relation'),
  ('prosthodontics', 'complete_denture', 'jaw_relation',         'try_in'),
  ('prosthodontics', 'complete_denture', 'try_in',               'insertion'),
  ('prosthodontics', 'complete_denture', 'insertion',            'post_insertion_review')
) as v (specialty_code, case_type_code, from_code, to_code)
join public.specialty s  on s.code = v.specialty_code
join public.case_type ct on ct.specialty_id = s.id and ct.code = v.case_type_code
join public.stage nxt    on nxt.case_type_id = ct.id and nxt.code = v.to_code
where st.case_type_id = ct.id
  and st.code = v.from_code
  and st.next_stage_on_complete_id is null;

-- ── Modifiers (PLACEHOLDER) ──────────────────────────────────────────────────
insert into public.modifier (
  case_type_id, stage_id, code, group_label, label,
  override_gap_min_days, override_gap_max_days, override_next_stage_id, sort_order
)
select ct.id, null, v.code, v.group_label, v.label, v.gap_min, v.gap_max, nxt.id, v.sort_order
from (values
  -- Primary RCT: medicament between visits → longer gap, same next step.
  ('endodontics', 'primary_rct', 'medicament_calcium_hydroxide',
     'Medicament placed', 'Calcium hydroxide', 7, 14, null::text, 10),
  -- Retreatment: medicament → longer gap AND next visit is a review.
  ('endodontics', 'retreatment', 'medicament_calcium_hydroxide',
     'Medicament placed', 'Calcium hydroxide', 7, 14, 'review', 10)
) as v (specialty_code, case_type_code, code, group_label, label, gap_min, gap_max, next_code, sort_order)
join public.specialty s  on s.code = v.specialty_code
join public.case_type ct on ct.specialty_id = s.id and ct.code = v.case_type_code
left join public.stage nxt on nxt.case_type_id = ct.id and nxt.code = v.next_code
on conflict (case_type_id, code) do nothing;
