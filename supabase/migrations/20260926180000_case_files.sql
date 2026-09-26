-- =============================================================================
-- Slice 6: files within a case.
--
--  * A PRIVATE Storage bucket, "case-files". Objects live at
--      <pg_id>/<case_id>/<file_id>/original.<ext>   (the file itself)
--      <pg_id>/<case_id>/<file_id>/thumb.jpg        (a small preview, images)
--    Paths never carry patient names. The app only ever shows files through
--    short-lived signed URLs; the bucket has no public access.
--  * Storage policies: a PG can only upload into their own folder, for one of
--    their own cases, and only read their own objects. Objects of a
--    soft-deleted file can no longer be read.
--  * A file row only exists once its upload has finished: add_file() refuses
--    a row whose object is not in Storage yet.
--  * Files added during Update Visit are linked to that visit and its stage.
--    The visit may not be saved yet when an upload finishes (the PG keeps
--    going while uploads run), so the row remembers the visit it was added
--    in (pending_visit_id) and is linked the moment that visit is saved.
-- =============================================================================

-- ── Bucket ───────────────────────────────────────────────────────────────────
-- 25 MB per file and an allowed-types list, enforced by Storage itself. The
-- app checks the same list first (lib/files/rules.ts) to give a friendly
-- message before anything is sent.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'case-files',
  'case-files',
  false,
  26214400,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- ── file: optional label, original name, thumbnail, pending visit ────────────
alter table public.file alter column label drop not null;
alter table public.file drop constraint file_label_check;
alter table public.file add constraint file_label_check
  check (label is null or length(btrim(label)) between 1 and 120);

alter table public.file drop constraint file_size_bytes_check;
alter table public.file add constraint file_size_bytes_check
  check (size_bytes > 0 and size_bytes <= 26214400);

alter table public.file
  add column original_name    text check (original_name is null or length(original_name) between 1 and 200),
  add column thumb_path       text unique,
  add column pending_visit_id uuid;

comment on column public.file.label is
  'Optional label typed or picked by the PG. When empty the app shows the type or the original file name.';
comment on column public.file.original_name is
  'The name the file had on the phone (shown for documents, used as the download name). Never part of the storage path.';
comment on column public.file.thumb_path is
  'Small JPEG preview made on the phone at upload time (images only).';
comment on column public.file.pending_visit_id is
  'Set when the file was added during Update Visit before that visit was saved; cleared once linked (visit_id).';

-- Paths follow the layout above, so a row can only point at its own objects.
alter table public.file add constraint file_storage_path_layout check (
  split_part(storage_path, '/', 2) = case_id::text
  and split_part(storage_path, '/', 3) = id::text
  and split_part(storage_path, '/', 4) like 'original.%'
  and split_part(storage_path, '/', 5) = ''
);
alter table public.file add constraint file_thumb_path_layout check (
  thumb_path is null
  or thumb_path = split_part(storage_path, '/', 1) || '/' || case_id || '/' || id || '/thumb.jpg'
);
alter table public.file add constraint file_one_visit_link
  check (visit_id is null or pending_visit_id is null);

create index file_pending_visit_idx on public.file (pending_visit_id) where pending_visit_id is not null;

-- ── Private helpers (not exposed through the API) ────────────────────────────
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- Has this path (in the caller's own folder) finished uploading?
-- SECURITY DEFINER only so add_file can check the object before the file row
-- exists (reading an object normally needs its row, see the policies below).
create or replace function private.case_file_uploaded(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select split_part(p_path, '/', 1) = (select auth.uid())::text
     and exists (
       select 1 from storage.objects o
       where o.bucket_id = 'case-files' and o.name = p_path
     );
$$;

-- The stage a visit is filed under: the furthest stage worked on (the same
-- rule record_visit uses). NULL for a visit with only "Other" work.
create or replace function private.visit_main_stage(p_visit_id uuid)
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$
  select vs.stage_id
  from public.visit_stage vs
  join public.stage s on s.id = vs.stage_id
  where vs.visit_id = p_visit_id
  order by s.sort_order desc
  limit 1;
$$;

revoke all on function private.case_file_uploaded(text) from public;
revoke all on function private.visit_main_stage(uuid) from public;
grant execute on function private.case_file_uploaded(text) to authenticated;
grant execute on function private.visit_main_stage(uuid) to authenticated;

-- ── add_file: the row, once the upload has finished ──────────────────────────
-- Retry-safe: the phone makes the id, and calling again with the same id
-- returns it without adding a second row.
create or replace function public.add_file(
  p_id            uuid,
  p_case_id       uuid,
  p_kind          text,
  p_storage_path  text,
  p_mime_type     text,
  p_size_bytes    bigint,
  p_label         text default null,
  p_original_name text default null,
  p_thumb_path    text default null,
  p_visit_id      uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_visit uuid;
begin
  if exists (select 1 from public.file where id = p_id) then
    return p_id;
  end if;

  if not exists (
    select 1 from public.patient_case where id = p_case_id and deleted_at is null
  ) then
    raise exception 'Case not found' using errcode = 'invalid_parameter_value';
  end if;

  if not private.case_file_uploaded(p_storage_path)
     or (p_thumb_path is not null and not private.case_file_uploaded(p_thumb_path)) then
    raise exception 'The file has not finished uploading' using errcode = 'invalid_parameter_value';
  end if;

  if p_visit_id is not null then
    select v.id into v_visit
    from public.visit v
    where v.id = p_visit_id and v.case_id = p_case_id and v.deleted_at is null;
  end if;

  insert into public.file (
    id, case_id, visit_id, pending_visit_id, stage_id, kind, label, original_name,
    storage_path, thumb_path, mime_type, size_bytes
  )
  values (
    p_id, p_case_id, v_visit,
    case when v_visit is null then p_visit_id end,
    case when v_visit is not null then private.visit_main_stage(v_visit) end,
    p_kind,
    nullif(btrim(p_label), ''),
    nullif(btrim(left(p_original_name, 200)), ''),
    p_storage_path, p_thumb_path, p_mime_type, p_size_bytes
  );
  return p_id;
end;
$$;

revoke all on function public.add_file(uuid, uuid, text, text, text, bigint, text, text, text, uuid) from public, anon;
grant execute on function public.add_file(uuid, uuid, text, text, text, bigint, text, text, text, uuid) to authenticated;

-- ── Link files to their visit when the visit is saved ────────────────────────
-- record_visit writes the visit's stages and then updates the visit row, so
-- this runs with the final stages in place. Editing the visit later re-files
-- its files under the (possibly changed) stage.
create or replace function private.link_visit_files()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_stage uuid := private.visit_main_stage(new.id);
begin
  update public.file f
  set visit_id = new.id,
      pending_visit_id = null,
      stage_id = v_stage
  where f.case_id = new.case_id
    and f.pg_id = new.pg_id
    and (f.pending_visit_id = new.id or f.visit_id = new.id)
    and (f.visit_id is distinct from new.id
         or f.pending_visit_id is not null
         or f.stage_id is distinct from v_stage);
  return null;
end;
$$;

revoke all on function private.link_visit_files() from public;

create trigger visit_links_files
  after insert or update on public.visit
  for each row
  when (new.deleted_at is null)
  execute function private.link_visit_files();

-- ── Storage policies ─────────────────────────────────────────────────────────
-- Folder 1 is the PG, folder 2 the case, folder 3 the file id.

create policy "PG uploads case files to own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'case-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and array_length(storage.foldername(name), 1) = 3
    and exists (
      select 1 from public.patient_case c
      where c.id::text = (storage.foldername(name))[2]
        and c.deleted_at is null
    )
  );

-- Own objects only, and never those of a deleted file.
create policy "PG reads own case files" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'case-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not exists (
      select 1 from public.file f
      where f.id::text = (storage.foldername(name))[3]
        and f.deleted_at is not null
    )
  );

-- Only an upload that never became a file (cancelled, or failed before its
-- row was saved) can be removed. Saved files are soft-deleted, never erased.
create policy "PG removes own unsaved uploads" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'case-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not exists (
      select 1 from public.file f
      where f.id::text = (storage.foldername(name))[3]
    )
  );
