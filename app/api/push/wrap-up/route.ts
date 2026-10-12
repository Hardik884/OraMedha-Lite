import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { pushConfigured, sendPush } from "@/lib/push/send";
import { wrapUpReminderMessage } from "@/lib/push/reminder";
import { APP_NAME } from "@/lib/brand/name";

/**
 * POST /api/push/wrap-up — called every 15 minutes by the scheduler on the
 * hosted database (pg_cron), with `Authorization: Bearer <PUSH_CRON_SECRET>`.
 *
 * Asks the database who is due an evening wrap-up reminder, sends one
 * notification per phone, then records who was reminded and forgets phones
 * that no longer accept notifications. Answers with counts only.
 */
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

function authorised(request: NextRequest, secret: string | undefined): secret is string {
  if (!secret || secret.length < 32) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function POST(request: NextRequest) {
  const secret = process.env.PUSH_CRON_SECRET;
  if (!authorised(request, secret)) return new NextResponse("Not allowed", { status: 401, headers: NO_STORE });
  if (!pushConfigured()) return NextResponse.json({ error: "push not configured" }, { status: 503, headers: NO_STORE });

  const { url, anonKey } = getSupabaseEnv();
  const db = createClient<Database>(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const now = new Date().toISOString();

  const { data: due, error } = await db.rpc("wrap_up_reminders_due", { p_secret: secret, p_now: now });
  if (error) {
    console.error("Wrap-up reminders: could not load", error.code);
    return NextResponse.json({ error: "could not load" }, { status: 500, headers: NO_STORE });
  }

  const ok: string[] = [];
  const gone: string[] = [];
  const reminded = new Set<string>();
  for (const row of due ?? []) {
    const result = await sendPush(row, wrapUpReminderMessage(APP_NAME, row.to_update));
    if (result === "ok") {
      ok.push(row.endpoint);
      reminded.add(row.pg_id);
    } else if (result === "gone") {
      gone.push(row.endpoint);
    }
  }

  if ((due ?? []).length > 0) {
    const saved = await db.rpc("wrap_up_reminders_sent", {
      p_secret: secret,
      p_pg_ids: [...reminded],
      p_ok_endpoints: ok,
      p_gone_endpoints: gone,
      p_now: now,
    });
    if (saved.error) console.error("Wrap-up reminders: could not record", saved.error.code);
  }

  return NextResponse.json({ phones: (due ?? []).length, sent: ok.length, gone: gone.length, pgs: reminded.size }, { headers: NO_STORE });
}
