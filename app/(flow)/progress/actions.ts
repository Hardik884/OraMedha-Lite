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

const validTarget = (t: number | null) => t === null || (Number.isInteger(t) && t >= 1 && t <= MAX_TARGET);

/**
 * Targets per case type, and for special cases per specialty: a whole number
 * 1–1000, or empty for none.
 */
export async function saveTargets(input: {
  targets: { caseTypeId: string; target: number | null }[];
  special?: { specialtyId: string; target: number | null }[];
}): Promise<ProgressActionResult> {
  const rows = input.targets;
  const special = input.special ?? [];
  if (!Array.isArray(rows) || rows.length > 200 || !rows.every((r) => isUuid(r.caseTypeId))) return { ok: false, error: FAILED };
  if (!Array.isArray(special) || special.length > 50 || !special.every((r) => isUuid(r.specialtyId))) {
    return { ok: false, error: FAILED };
  }
  if (!rows.every((r) => validTarget(r.target)) || !special.every((r) => validTarget(r.target))) {
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
  const specialSet = special.filter((r) => r.target !== null).map((r) => ({ specialty_id: r.specialtyId, target: r.target! }));
  const specialCleared = special.filter((r) => r.target === null).map((r) => r.specialtyId);
  if (specialSet.length > 0) {
    const { error } = await supabase.from("pg_special_case_target").upsert(specialSet, { onConflict: "pg_id,specialty_id" });
    if (error) return { ok: false, error: FAILED };
  }
  if (specialCleared.length > 0) {
    const { error } = await supabase.from("pg_special_case_target").delete().in("specialty_id", specialCleared);
    if (error) return { ok: false, error: FAILED };
  }
  revalidatePath("/progress");
  return { ok: true };
}
