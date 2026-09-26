"use server";

import { createServerClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/ids";
import { isFileKind, type FileKind } from "@/lib/files/rules";
import { normaliseLabel } from "@/lib/files/labels";

export type FileActionResult = { ok: true } | { ok: false; error: string };

const FAILED = "Couldn't save. Check your internet and try again.";

/** Rename / relabel: the label (blank = none) and the type. */
export async function updateFile(input: { fileId: string; label: string; kind: FileKind }): Promise<FileActionResult> {
  if (!isUuid(input.fileId) || !isFileKind(input.kind)) return { ok: false, error: FAILED };
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("file")
    .update({ label: normaliseLabel(input.label), kind: input.kind })
    .eq("id", input.fileId)
    .is("deleted_at", null)
    .select("id");
  if (error) return { ok: false, error: FAILED };
  if (!data || data.length === 0) return { ok: false, error: "This file was already deleted." };
  return { ok: true };
}

/** Soft delete: the file leaves the case; the record is kept. */
export async function deleteFile(input: { fileId: string }): Promise<FileActionResult> {
  if (!isUuid(input.fileId)) return { ok: false, error: FAILED };
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("file")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", input.fileId)
    .is("deleted_at", null);
  if (error) return { ok: false, error: FAILED };
  return { ok: true };
}
