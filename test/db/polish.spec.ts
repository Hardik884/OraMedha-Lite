/**
 * Slice 9A against the LOCAL stack (`npm run test:db`): feedback is private
 * to each PG, the guide flag, and a missed review visit on a completed case
 * shows as needing a new appointment.
 */
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { loadTemplates, onboardedPg, signedInUser, type Client, type TemplateCaseType } from "./helpers";

let a: { client: Client; id: string };
let b: { client: Client; id: string };
let tpl: TemplateCaseType;

const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

beforeAll(async () => {
  const reader = await signedInUser("polish-tpl");
  tpl = Object.values(await loadTemplates(reader.client)).find((t) => t.stageIds.length >= 3 && t.toothRequired)!;
  a = await onboardedPg("polish-a", tpl.specialtyId);
  b = await onboardedPg("polish-b", tpl.specialtyId);
});

describe("feedback", () => {
  it("a PG sends and reads only their own; it can't be edited or deleted", async () => {
    expect((await a.client.from("feedback").insert({ message: "Works well", screen: "/today" })).error).toBeNull();
    const mine = await a.client.from("feedback").select("message, screen, pg_id");
    expect(mine.data).toEqual([{ message: "Works well", screen: "/today", pg_id: a.id }]);
    expect((await b.client.from("feedback").select("id")).data).toEqual([]);

    expect((await a.client.from("feedback").update({ message: "x" }).eq("pg_id", a.id)).error).not.toBeNull();
    expect((await a.client.from("feedback").delete().eq("pg_id", a.id)).error).not.toBeNull();
  });

  it("can't be sent as another PG, or empty", async () => {
    expect((await b.client.from("feedback").insert({ message: "Pretend", pg_id: a.id })).error).not.toBeNull();
    expect((await a.client.from("feedback").insert({ message: "   " })).error).not.toBeNull();
  });
});

describe("first-run guide", () => {
  it("starts unseen and is set by the PG on their own profile only", async () => {
    const before = await a.client.from("pg_profile").select("guide_seen_at").eq("id", a.id).single();
    expect(before.data?.guide_seen_at).toBeNull();
    await b.client.from("pg_profile").update({ guide_seen_at: new Date().toISOString() }).eq("id", a.id);
    expect((await a.client.from("pg_profile").select("guide_seen_at").eq("id", a.id).single()).data?.guide_seen_at).toBeNull();
    expect((await a.client.from("pg_profile").update({ guide_seen_at: new Date().toISOString() }).eq("id", a.id)).error).toBeNull();
  });
});

describe("a missed review visit on a completed case", () => {
  it("case_overview names it as the last appointment, with its purpose", async () => {
    const patientId = randomUUID();
    const caseId = randomUUID();
    await a.client.rpc("create_patient_with_case", {
      p_patient_id: patientId,
      p_full_name: "Review Test",
      p_phone: "9876543210",
      p_case_id: caseId,
      p_case_type_id: tpl.id,
      p_stage_id: tpl.stageIds[0]!,
      p_tooth: "36",
    });
    const reviewId = randomUUID();
    const done = await a.client.rpc("record_visit", {
      p_case_id: caseId,
      p_stage_ids: tpl.stageIds,
      p_outcome: "complete",
      p_complete_case: true,
      p_new_visit_id: randomUUID(),
      p_next_appointment_id: reviewId,
      p_next_starts_at: inDays(1),
      p_next_duration_min: 15,
    });
    expect(done.error).toBeNull();
    // The review time comes and goes; the PG marks it missed.
    await a.client.from("appointment").update({ starts_at: inDays(-2), status: "missed" }).eq("id", reviewId);

    const row = await a.client
      .from("case_overview")
      .select("status, next_appointment_id, last_appointment_id, last_appointment_status, last_appointment_purpose")
      .eq("case_id", caseId)
      .single();
    expect(row.data).toEqual({
      status: "completed",
      next_appointment_id: null,
      last_appointment_id: reviewId,
      last_appointment_status: "missed",
      last_appointment_purpose: "review",
    });
  });
});
