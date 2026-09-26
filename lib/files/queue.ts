import { MAX_FILE_BYTES, formatBytes, type FileKind } from "./rules";

/**
 * The upload queue's rules, kept pure so they're tested rather than found out
 * on hospital Wi-Fi. The browser side (lib/files/upload-store.ts) runs them.
 *
 * An upload goes waiting → preparing (shrinking an image) → uploading →
 * saving (the file row) → done. The row is only saved once the bytes are in,
 * so a half-finished upload never shows up as a broken file.
 */
export type UploadStatus = "waiting" | "preparing" | "uploading" | "saving" | "done" | "failed";

export type UploadItem = {
  /** Also the file row's id, made on the phone so every retry is the same file. */
  id: string;
  caseId: string;
  patientId: string;
  /** The visit being updated when the file was added, if any. */
  visitId: string | null;
  kind: FileKind;
  label: string | null;
  originalName: string;
  mime: string;
  size: number;
  status: UploadStatus;
  /** 0–1 */
  progress: number;
  error: string | null;
  retryable: boolean;
  attempts: number;
  addedAt: number;
};

const BUSY: UploadStatus[] = ["preparing", "uploading", "saving"];

export function isBusy(item: UploadItem): boolean {
  return BUSY.includes(item.status);
}

/** Not saved yet. Failed uploads count: closing the page would lose them. */
export function isUnfinished(item: UploadItem): boolean {
  return item.status !== "done";
}

/** Two at a time: quicker than one on decent Wi-Fi, gentle on weak Wi-Fi. */
export const MAX_PARALLEL_UPLOADS = 2;

export function nextToStart(items: UploadItem[], limit = MAX_PARALLEL_UPLOADS): UploadItem[] {
  const free = limit - items.filter(isBusy).length;
  if (free <= 0) return [];
  return items.filter((i) => i.status === "waiting").slice(0, free);
}

export type UploadSummary = { active: number; failed: number; done: number; progress: number };

export function summarizeUploads(items: UploadItem[]): UploadSummary {
  const active = items.filter((i) => i.status === "waiting" || isBusy(i));
  const total = active.reduce((sum, i) => sum + i.size, 0);
  const sent = active.reduce((sum, i) => sum + i.size * i.progress, 0);
  return {
    active: active.length,
    failed: items.filter((i) => i.status === "failed").length,
    done: items.filter((i) => i.status === "done").length,
    progress: total > 0 ? sent / total : 0,
  };
}

/** A failed attempt, as the uploader saw it. */
export type UploadFailure = { offline?: boolean; status?: number };

export function describeUploadError(f: UploadFailure): { message: string; retryable: boolean } {
  if (f.offline) return { message: "No internet. It will try again when you're back online.", retryable: true };
  if (f.status === 0) return { message: "The connection dropped. Tap Retry.", retryable: true };
  if (f.status === 401 || f.status === 403) {
    return { message: "You've been signed out. Sign in again, then add this file again.", retryable: false };
  }
  if (f.status === 413) {
    return { message: `This file is too large. Files can be up to ${formatBytes(MAX_FILE_BYTES)}.`, retryable: false };
  }
  if (f.status === 415) return { message: "This type of file can't be added.", retryable: false };
  return { message: "Couldn't upload. Tap Retry to try again.", retryable: true };
}

/** Automatic retries after a failed attempt; after that the PG taps Retry. */
export function retryDelayMs(attempt: number): number | null {
  if (attempt === 1) return 2000;
  if (attempt === 2) return 6000;
  return null;
}
