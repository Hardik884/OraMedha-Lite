"use server";

import { createServerClient } from "@/lib/supabase/server";
import { cleanScreen, validateFeedback } from "@/lib/feedback/screen";

export type FeedbackResult = { ok: true } | { ok: false; error: string };

/** Saves feedback as the signed-in PG (Row Level Security sets and checks pg_id). */
export async function sendFeedback(input: { message: string; screen: string | null }): Promise<FeedbackResult> {
  const v = validateFeedback(input?.message);
  if (!v.ok) return v;
  const supabase = await createServerClient();
  const { error } = await supabase.from("feedback").insert({ message: v.value, screen: cleanScreen(input.screen) });
  if (error) return { ok: false, error: "Couldn't send. Check your internet and try again." };
  return { ok: true };
}
