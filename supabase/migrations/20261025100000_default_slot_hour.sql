-- New PGs start with 1-hour slots (9:00, 10:00, 11:00…): PGs told us hardly
-- any treatment fits in 15 minutes. Existing PGs keep whatever they chose;
-- anyone can change it in the slot chooser or Settings → Clinic timings.
alter table public.pg_preferences alter column slot_step_min set default 60;
