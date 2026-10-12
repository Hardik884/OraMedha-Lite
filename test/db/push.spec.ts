/**
 * Push reminders:
 *  - a PG saves and sees only their own phones; nobody inserts directly
 *  - the scheduler functions refuse without the Vault secret
 *  - "due" = reminder time reached today, today's started appointments still
 *    open, not reminded yet today; after sending, not again that day
 */
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/types/database.types";
import { istToday, istToInstant } from "@/lib/dates";
import { ANON, URL, loadTemplates, noSession, onboardedPg, signedInUser, type Client } from "./helpers";

const SECRET = "local-push-cron-secret-not-a-real-secret";
let a: { client: Client; id: string };
let b: { client: Client; id: string };
const anon = createClient<Database>(URL, ANON, noSession);

const endpoint = () => `https://push.example.test/${randomUUID()}`;

describe("push reminders", () => {
  beforeAll(async () => {
    // A throwaway signed-in client, only to read the templates.
    const probe = await signedInUser("push-probe");
    const templates = await loadTemplates(probe.client);
    const ct = Object.values(templates).find((t) => !t.toothRequired) ?? Object.values(templates)[0]!;
    a = await onboardedPg("push-a", ct.specialtyId);
    b = await onboardedPg("push-b", ct.specialtyId);

    // A's patient with an appointment at 10:00 today (IST).
    const patientId = randomUUID();
    const caseId = randomUUID();
    const created = await a.client.rpc("create_patient_with_case", {
      p_patient_id: patientId,
      p_case_id: caseId,
      p_full_name: "Push Test",
      p_phone: "9876500099",
      p_case_type_id: ct.id,
      p_stage_id: ct.stageIds[0]!,
      p_tooth: ct.toothRequired ? "36" : undefined,
    });
    if (created.error) throw created.error;
    const appt = await a.client
      .from("appointment")
      .insert({ patient_id: patientId, case_id: caseId, starts_at: istToInstant(istToday(), "10:00"), duration_min: 30 });
    if (appt.error) throw appt.error;
  });

  it("saves a phone for the signed-in PG only, and nobody inserts directly", async () => {
    const e = endpoint();
    expect((await a.client.rpc("save_push_subscription", { p_endpoint: e, p_p256dh: "k", p_auth: "a" })).error).toBeNull();
    expect((await a.client.from("push_subscription").select("endpoint")).data).toEqual([{ endpoint: e }]);
    expect((await b.client.from("push_subscription").select("endpoint")).data).toEqual([]);
    const direct = await b.client.from("push_subscription").insert({ endpoint: endpoint(), p256dh: "k", auth: "a" });
    expect(direct.error).not.toBeNull();
    expect((await anon.rpc("save_push_subscription", { p_endpoint: endpoint(), p_p256dh: "k", p_auth: "a" })).error).not.toBeNull();
  });

  it("moves a shared phone to whoever signed in last", async () => {
    const e = endpoint();
    await a.client.rpc("save_push_subscription", { p_endpoint: e, p_p256dh: "k", p_auth: "a" });
    await b.client.rpc("save_push_subscription", { p_endpoint: e, p_p256dh: "k", p_auth: "a" });
    expect((await b.client.from("push_subscription").select("endpoint").eq("endpoint", e)).data).toHaveLength(1);
    expect((await a.client.from("push_subscription").select("endpoint").eq("endpoint", e)).data).toHaveLength(0);
  });

  it("refuses the scheduler functions without the secret", async () => {
    expect((await anon.rpc("wrap_up_reminders_due", { p_secret: "wrong-secret-wrong-secret-wrong-secret" })).error).not.toBeNull();
    expect((await a.client.rpc("wrap_up_reminders_due", { p_secret: "" })).error).not.toBeNull();
    const sent = await anon.rpc("wrap_up_reminders_sent", {
      p_secret: "nope",
      p_pg_ids: [a.id],
      p_ok_endpoints: [],
      p_gone_endpoints: [],
    });
    expect(sent.error).not.toBeNull();
  });

  it("reminds once, after the chosen time, while today's patients are open", async () => {
    const at = (hhmm: string) => istToInstant(istToday(), hhmm);
    const due = async (now: string) => {
      const { data, error } = await anon.rpc("wrap_up_reminders_due", { p_secret: SECRET, p_now: now });
      expect(error).toBeNull();
      return (data ?? []).filter((r) => r.pg_id === a.id);
    };

    // Off by default.
    expect(await due(at("23:00"))).toEqual([]);

    expect((await a.client.from("pg_preferences").update({ wrap_up_reminder_time: "19:00" }).eq("pg_id", a.id)).error).toBeNull();
    expect(await due(at("18:45"))).toEqual([]);
    const rows = await due(at("19:05"));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]!.to_update).toBe(1);

    const gone = rows[0]!.endpoint;
    expect(
      (
        await anon.rpc("wrap_up_reminders_sent", {
          p_secret: SECRET,
          p_pg_ids: [a.id],
          p_ok_endpoints: [],
          p_gone_endpoints: [gone],
          p_now: at("19:05"),
        })
      ).error,
    ).toBeNull();
    expect(await due(at("21:00"))).toEqual([]);
    expect((await a.client.from("push_subscription").select("endpoint").eq("endpoint", gone)).data).toEqual([]);
  });

  it("never lets a PG read someone else's reminder settings", async () => {
    const { data } = await b.client.from("pg_preferences").select("pg_id, wrap_up_reminder_time").eq("pg_id", a.id);
    expect(data).toEqual([]);
  });
});
