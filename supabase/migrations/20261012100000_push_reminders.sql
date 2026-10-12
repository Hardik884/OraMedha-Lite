-- =============================================================================
-- Push notifications: the evening "wrap up the day" reminder.
--
--   pg_preferences.wrap_up_reminder_time — the PG's chosen time (IST), or
--     NULL for off. wrap_up_reminded_on — the IST day last reminded, so a PG
--     gets at most one reminder a day.
--   push_subscription — one row per phone/browser that allowed notifications
--     (the browser's push endpoint and keys). A PG can have several phones.
--
-- Sending happens outside the database (web push needs encryption the
-- database can't do): a scheduler (pg_cron, set up on the hosted project
-- only — see README) calls the app's /api/push/wrap-up every 15 minutes. That
-- route asks wrap_up_reminders_due() who to remind. These scheduler functions
-- run as SECURITY DEFINER (they read every PG's rows) and refuse to do
-- anything without the secret kept in Supabase Vault ("push_cron_secret").
-- Notifications carry counts only, never patient names.
-- =============================================================================

alter table public.pg_preferences
  add column wrap_up_reminder_time time
    check (wrap_up_reminder_time is null or wrap_up_reminder_time between '12:00' and '23:59'),
  add column wrap_up_reminded_on date;

comment on column public.pg_preferences.wrap_up_reminder_time is
  'Evening wrap-up reminder time (India time), or NULL for off.';

-- ── push_subscription ────────────────────────────────────────────────────────
create table public.push_subscription (
  id              uuid primary key default gen_random_uuid(),
  pg_id           uuid not null default auth.uid() references public.pg_profile (id),
  endpoint        text not null unique check (endpoint ~ '^https://' and length(endpoint) <= 2000),
  p256dh          text not null check (length(p256dh) between 1 and 200),
  auth            text not null check (length(auth) between 1 and 100),
  user_agent      text check (length(user_agent) <= 400),
  created_at      timestamptz not null default now(),
  last_success_at timestamptz
);

create index push_subscription_pg_idx on public.push_subscription (pg_id);

comment on table public.push_subscription is
  'A phone or browser that allowed notifications for a PG. Not health data, but still private.';

alter table public.push_subscription enable row level security;

create policy "PG reads own push subscriptions" on public.push_subscription
  for select to authenticated using (pg_id = (select auth.uid()));
-- Subscriptions are only added through save_push_subscription() below.
create policy "PG removes own push subscriptions" on public.push_subscription
  for delete to authenticated using (pg_id = (select auth.uid()));

revoke all on public.push_subscription from anon;
revoke insert, update, truncate on public.push_subscription from authenticated;

-- ── Saving this phone's subscription ─────────────────────────────────────────
-- The same phone can move between PGs (a shared phone, a new sign-in): the
-- endpoint then belongs to whoever signed in last.
create or replace function public.save_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pg uuid := auth.uid();
begin
  if v_pg is null or not exists (select 1 from public.pg_profile where id = v_pg) then
    raise exception 'not signed in';
  end if;
  delete from public.push_subscription where endpoint = p_endpoint;
  insert into public.push_subscription (pg_id, endpoint, p256dh, auth, user_agent)
  values (v_pg, p_endpoint, p_p256dh, p_auth, left(p_user_agent, 400));
end;
$$;

revoke all on function public.save_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;

-- ── Scheduler functions (secret required) ────────────────────────────────────
create or replace function private.push_secret_ok(p_secret text) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    p_secret is not null and length(p_secret) >= 32 and p_secret = (
      select decrypted_secret from vault.decrypted_secrets where name = 'push_cron_secret' limit 1
    ),
    false
  );
$$;

revoke all on function private.push_secret_ok(text) from public, anon, authenticated;

-- Who should get the reminder now: their time has come today (IST), they
-- haven't had it today, and some of today's appointments that have already
-- started are still not updated. One row per phone.
create or replace function public.wrap_up_reminders_due(p_secret text, p_now timestamptz default now())
returns table (pg_id uuid, to_update integer, endpoint text, p256dh text, auth text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_local timestamp := p_now at time zone 'Asia/Kolkata';
begin
  if not private.push_secret_ok(p_secret) then
    raise exception 'not allowed';
  end if;
  return query
  with due as (
    select pr.pg_id, count(a.id)::integer as to_update
    from public.pg_preferences pr
    join public.appointment a
      on a.pg_id = pr.pg_id
     and a.deleted_at is null
     and a.status in ('scheduled', 'confirmed', 'unconfirmed')
     and a.starts_at <= p_now
     and (a.starts_at at time zone 'Asia/Kolkata')::date = v_local::date
    where pr.wrap_up_reminder_time is not null
      and v_local::time >= pr.wrap_up_reminder_time
      and pr.wrap_up_reminded_on is distinct from v_local::date
    group by pr.pg_id
  )
  select d.pg_id, d.to_update, s.endpoint, s.p256dh, s.auth
  from due d
  join public.push_subscription s on s.pg_id = d.pg_id;
end;
$$;

-- After sending: remember who was reminded today, and forget phones that
-- told us they no longer accept notifications.
create or replace function public.wrap_up_reminders_sent(
  p_secret text,
  p_pg_ids uuid[],
  p_ok_endpoints text[],
  p_gone_endpoints text[],
  p_now timestamptz default now()
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.push_secret_ok(p_secret) then
    raise exception 'not allowed';
  end if;
  update public.pg_preferences
     set wrap_up_reminded_on = (p_now at time zone 'Asia/Kolkata')::date
   where pg_id = any (p_pg_ids);
  update public.push_subscription set last_success_at = p_now where endpoint = any (p_ok_endpoints);
  delete from public.push_subscription where endpoint = any (p_gone_endpoints);
end;
$$;

-- Callable by the app's server without a signed-in PG; the secret is the lock.
revoke all on function public.wrap_up_reminders_due(text, timestamptz) from public;
revoke all on function public.wrap_up_reminders_sent(text, uuid[], text[], text[], timestamptz) from public;
grant execute on function public.wrap_up_reminders_due(text, timestamptz) to anon, authenticated;
grant execute on function public.wrap_up_reminders_sent(text, uuid[], text[], text[], timestamptz) to anon, authenticated;
