"use client";

import { useSyncExternalStore } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { newId } from "@/lib/ids";
import { prepareImage } from "./image-process";
import { storagePathFor, thumbPathFor } from "./paths";
import { CASE_FILES_BUCKET, isImageMime, type FileKind } from "./rules";
import {
  describeUploadError,
  isUnfinished,
  nextToStart,
  retryDelayMs,
  type UploadFailure,
  type UploadItem,
} from "./queue";

/**
 * The phone's upload queue. It lives for the whole app session (not one
 * screen), so the PG can add files and carry on — to Today, another patient —
 * while uploads finish. Each upload: shrink (images) → send the bytes with
 * progress → save the file row. The row id is made here once, so every retry
 * is the same file and a half-done upload never becomes a broken entry.
 *
 * Nothing is logged: file names and patients are health data.
 */

export type NewUpload = {
  file: File;
  mime: string;
  kind: FileKind;
  label: string | null;
  caseId: string;
  patientId: string;
  visitId: string | null;
};

type Work = {
  file: File;
  previewUrl: string | null;
  prepared?: { main: Blob; mime: string; thumb: Blob | null };
  sentMain?: string; // storage path once uploaded
  sentThumb?: string | null;
  retryTimer?: ReturnType<typeof setTimeout>;
  xhr?: XMLHttpRequest;
  cancelled?: boolean;
};

let items: UploadItem[] = [];
const work = new Map<string, Work>();
const listeners = new Set<() => void>();
const savedListeners = new Set<(item: UploadItem) => void>();
const EMPTY: UploadItem[] = [];

function emit() {
  items = [...items];
  for (const l of listeners) l();
}

function update(id: string, patch: Partial<UploadItem>) {
  const at = items.findIndex((i) => i.id === id);
  if (at === -1) return;
  items[at] = { ...items[at]!, ...patch };
  emit();
}

function get(id: string): UploadItem | undefined {
  return items.find((i) => i.id === id);
}

// ── Reading the queue ────────────────────────────────────────────────────────

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useUploads(): UploadItem[] {
  return useSyncExternalStore(subscribe, () => items, () => EMPTY);
}

/** A local preview of an image being uploaded (never a link to the server). */
export function previewUrlFor(id: string): string | null {
  return work.get(id)?.previewUrl ?? null;
}

/** Called each time a file row is saved, e.g. to refresh the screen. */
export function onFileSaved(listener: (item: UploadItem) => void): () => void {
  savedListeners.add(listener);
  return () => savedListeners.delete(listener);
}

// ── Changing the queue ───────────────────────────────────────────────────────

export function addUploads(uploads: NewUpload[]): void {
  for (const u of uploads) {
    const id = newId();
    work.set(id, {
      file: u.file,
      previewUrl: isImageMime(u.mime) ? URL.createObjectURL(u.file) : null,
    });
    items.push({
      id,
      caseId: u.caseId,
      patientId: u.patientId,
      visitId: u.visitId,
      kind: u.kind,
      label: u.label,
      originalName: u.file.name || "file",
      mime: u.mime,
      size: u.file.size,
      status: "waiting",
      progress: 0,
      error: null,
      retryable: true,
      attempts: 0,
      addedAt: Date.now(),
    });
  }
  emit();
  pump();
}

export function retryUpload(id: string): void {
  const w = work.get(id);
  const item = get(id);
  if (!w || !item || !(item.status === "failed" || item.retryAt)) return;
  clearTimeout(w.retryTimer);
  update(id, { status: "waiting", error: null, retryAt: undefined });
  pump();
}

/** Retry everything that failed for a reason worth retrying (e.g. back online). */
export function retryAllFailed(): void {
  for (const i of items) if (i.status === "failed" && i.retryable) retryUpload(i.id);
}

/**
 * Take an upload off the list. If it never became a file, its bytes are
 * removed from Storage too (only unsaved uploads can be, see the policies).
 */
export function removeUpload(id: string): void {
  const w = work.get(id);
  const item = get(id);
  if (!item) return;
  if (w) {
    w.cancelled = true;
    clearTimeout(w.retryTimer);
    w.xhr?.abort();
    if (item.status !== "done") {
      const paths = [w.sentMain, w.sentThumb].filter((p): p is string => !!p);
      if (paths.length > 0) {
        void createBrowserSupabaseClient().storage.from(CASE_FILES_BUCKET).remove(paths).catch(() => {});
      }
    }
    if (w.previewUrl) URL.revokeObjectURL(w.previewUrl);
    work.delete(id);
  }
  items = items.filter((i) => i.id !== id);
  emit();
  pump();
}

/** Forget finished uploads once the screen shows them as saved files. */
export function forgetDone(ids: string[]): void {
  const done = items.filter((i) => ids.includes(i.id) && i.status === "done");
  if (done.length === 0) return;
  for (const i of done) {
    const w = work.get(i.id);
    if (w?.previewUrl) URL.revokeObjectURL(w.previewUrl);
    work.delete(i.id);
  }
  items = items.filter((i) => !done.includes(i));
  emit();
}

export function hasUnfinishedUploads(): boolean {
  return items.some(isUnfinished);
}

// ── Running uploads ──────────────────────────────────────────────────────────

class UploadError extends Error {
  constructor(readonly failure: UploadFailure) {
    super("upload failed");
  }
}

function pump() {
  for (const item of nextToStart(items)) void run(item.id);
}

function putObject(opts: {
  path: string;
  body: Blob;
  mime: string;
  token: string;
  onProgress: (fraction: number) => void;
  w: Work;
}): Promise<void> {
  const { url, anonKey } = getSupabaseEnv();
  const encoded = opts.path.split("/").map(encodeURIComponent).join("/");
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    opts.w.xhr = xhr;
    xhr.open("POST", `${url}/storage/v1/object/${CASE_FILES_BUCKET}/${encoded}`);
    xhr.setRequestHeader("authorization", `Bearer ${opts.token}`);
    xhr.setRequestHeader("apikey", anonKey);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("content-type", opts.mime);
    xhr.setRequestHeader("cache-control", "max-age=3600");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) opts.onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      opts.w.xhr = undefined;
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      // Already there: an earlier attempt finished but its reply was lost.
      // The path is unique to this file, so it is this file's bytes.
      if (xhr.status === 409 || /"statusCode"\s*:\s*"409"/.test(xhr.responseText)) return resolve();
      const inner = xhr.responseText.match(/"statusCode"\s*:\s*"(\d{3})"/)?.[1];
      reject(new UploadError({ status: inner ? Number(inner) : xhr.status }));
    };
    xhr.onerror = () => {
      opts.w.xhr = undefined;
      reject(new UploadError({ status: 0, offline: !navigator.onLine }));
    };
    xhr.onabort = () => reject(new UploadError({ status: 0 }));
    xhr.send(opts.body);
  });
}

async function run(id: string) {
  const w = work.get(id);
  const start = get(id);
  if (!w || !start) return;
  const attempt = start.attempts + 1;
  update(id, { attempts: attempt, error: null, retryAt: undefined });

  try {
    // 1. Shrink images (once; kept for retries).
    if (!w.prepared) {
      update(id, { status: "preparing" });
      if (isImageMime(start.mime)) {
        const prepared = await prepareImage(w.file, start.kind, start.mime);
        if (!prepared.ok) throw new UploadError({ status: 413 });
        w.prepared = prepared;
      } else {
        w.prepared = { main: w.file, mime: start.mime, thumb: null };
      }
    }
    if (w.cancelled) return;
    const prepared = w.prepared;

    // 2. Send the bytes.
    const supabase = createBrowserSupabaseClient();
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session) throw new UploadError({ status: 401 });
    if (!navigator.onLine) throw new UploadError({ offline: true });

    const ids = { pgId: session.user.id, caseId: start.caseId, fileId: id };
    const mainPath = storagePathFor({ ...ids, mime: prepared.mime });
    const thumbPath = prepared.thumb ? thumbPathFor(ids) : null;
    const total = prepared.main.size + (prepared.thumb?.size ?? 0);

    update(id, { status: "uploading", progress: 0, size: total });
    if (w.sentMain !== mainPath) {
      await putObject({
        path: mainPath,
        body: prepared.main,
        mime: prepared.mime,
        token: session.access_token,
        w,
        onProgress: (f) => update(id, { progress: (f * prepared.main.size) / total }),
      });
      w.sentMain = mainPath;
    }
    if (thumbPath && prepared.thumb && w.sentThumb !== thumbPath) {
      await putObject({
        path: thumbPath,
        body: prepared.thumb,
        mime: "image/jpeg",
        token: session.access_token,
        w,
        onProgress: (f) => update(id, { progress: (prepared.main.size + f * prepared.thumb!.size) / total }),
      });
      w.sentThumb = thumbPath;
    }
    if (w.cancelled) return;

    // 3. Save the file row (retry-safe on the id).
    update(id, { status: "saving", progress: 1 });
    const item = get(id)!;
    const { error } = await supabase.rpc("add_file", {
      p_id: id,
      p_case_id: item.caseId,
      p_kind: item.kind,
      p_storage_path: mainPath,
      p_mime_type: prepared.mime,
      p_size_bytes: prepared.main.size,
      p_label: item.label ?? undefined,
      p_original_name: item.originalName,
      p_thumb_path: thumbPath ?? undefined,
      p_visit_id: item.visitId ?? undefined,
    });
    if (error) throw new UploadError({ status: navigator.onLine ? 500 : 0, offline: !navigator.onLine });

    update(id, { status: "done", progress: 1, error: null });
    // The bytes are no longer needed; keep only the small preview URL.
    w.prepared = undefined;
    const saved = get(id)!;
    for (const l of savedListeners) l(saved);
  } catch (e) {
    if (w.cancelled || !get(id)) return;
    const failure = e instanceof UploadError ? e.failure : { status: 0, offline: !navigator.onLine };
    const { message, retryable } = describeUploadError(failure);
    const delay = retryable && !failure.offline ? retryDelayMs(attempt) : null;
    if (delay) {
      // Still going: it tries again on its own in a moment.
      update(id, { status: "waiting", error: "Connection dropped. Trying again…", retryable, retryAt: Date.now() + delay });
      w.retryTimer = setTimeout(() => retryUpload(id), delay);
    } else {
      update(id, { status: "failed", error: message, retryable, retryAt: undefined });
    }
  } finally {
    pump();
  }
}
