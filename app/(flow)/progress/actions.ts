"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/ids";

export type ProgressActionResult = { ok: true } | { ok: false; error: string };

const FAILED = "Couldn't save. Check your internet and try again.";

/** The "Special case" toggle on the Patient screen. */
export async function setCaseSpecial(input: { caseId: string; special: boolean }): Promise<ProgressActionResult> {
  if (!isUuid(input.caseId) || typeof input.special !== "boolean") return { ok: false, error: FAILED };
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("patient_case")
    .update({ is_special: input.special })
    .eq("id", input.caseId)
    .is("deleted_at", null)
    .select("id");
  if (error || !data?.length) return { ok: false, error: FAILED };
  revalidatePath("/progress");
  return { ok: true };
}

const MAX_TARGET = 1000;

/** Targets per case type: a whole number 1–1000, or empty for none. */
export async function saveTargets(input: { targets: { caseTypeId: string; target: number | null }[] }): Promise<ProgressActionResult> {
  const rows = input.targets;
  if (!Array.isArray(rows) || rows.length > 200 || !rows.every((r) => isUuid(r.caseTypeId))) return { ok: false, error: FAILED };
  if (rows.some((r) => r.target !== null && (!Number.isInteger(r.target) || r.target < 1 || r.target > MAX_TARGET))) {
    return { ok: false, error: `A target is a whole number from 1 to ${MAX_TARGET}.` };
  }
  const supabase = await createServerClient();
  const set = rows.filter((r) => r.target !== null).map((r) => ({ case_type_id: r.caseTypeId, target: r.target! }));
  const cleared = rows.filter((r) => r.target === null).map((r) => r.caseTypeId);

  if (set.length > 0) {
    const { error } = await supabase.from("pg_case_type_target").upsert(set, { onConflict: "pg_id,case_type_id" });
    if (error) return { ok: false, error: FAILED };
  }
  if (cleared.length > 0) {
    const { error } = await supabase.from("pg_case_type_target").delete().in("case_type_id", cleared);
    if (error) return { ok: false, error: FAILED };
  }
  revalidatePath("/progress");
  return { ok: true };
}
