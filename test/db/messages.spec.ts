/**
 * Slice 7 against the LOCAL stack (`npm run test:db`): the message log,
 * recording a forgotten visit up to 7 days back, and rescheduling.
 */
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { addDays, istToInstant, istToday } from "@/lib/dates";
import { loadTemplates, onboardedPg, signedInUser, type Client, type TemplateCaseType } from "./helpers";

let a: { client: Client; id: string };
let b: { client: Client; id: string };
let tpl: TemplateCaseType;

const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

async function newCase(client: Client) {
  const patientId = randomUUID();
  const caseId = randomUUID();
  const { error } = await client.rpc("create_patient_with_case", {
    p_patient_id: patientId,
    p_full_name: "Message Test",
    p_phone: "9876543210",
    p_case_id: caseId,
    p_case_type_id: tpl.id,
    p_stage_id: tpl.stageIds[0]!,
    p_tooth: "36",
  });
  if (error) throw error;
  return { patientId, caseId };
}

async function book(client: Client, patientId: string, caseId: string, startsAt: string, status = "scheduled") {
  const { data, error } = await client
    .from("appointment")
    .insert({ patient_id: patientId, case_id: caseId, starts_at: startsAt, duration_min: 30, status })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

/** A case started 10 days ago (its first "In progress" visit moved back to then). */
async function olderCase(client: Client) {
  const c = await newCase(client);
  const moved = await client
    .from("visit")
    .update({ visit_date: addDays(istToday(), -10) })
    .eq("case_id", c.caseId);
  if (moved.error) throw moved.error;
  return c;
}

beforeAll(async () => {
  const reader = await signedInUser("msg-tpl");
  const templates = Object.values(await loadTemplates(reader.client));
  tpl = templates.find((t) => t.stageIds.length >= 3 && t.toothRequired)!;
  a = await onboardedPg("msg-a", tpl.specialtyId);
  b = await onboardedPg("msg-b", tpl.specialtyId);
});

describe("message_log", () => {
  it("records that WhatsApp was opened for the PG's own appointment", async () => {
    const { patientId, caseId } = await newCase(a.client);
    const apptId = await book(a.client, patientId, caseId, inDays(2));
    const { error } = await a.client
      .from("message_log")
      .insert({ appointment_id: apptId, kind: "booked", for_starts_at: inDays(2) });
    expect(error).toBeNull();
    const { data } = await a.client.from("message_log").select("kind, status, channel").eq("appointment_id", apptId);
    expect(data).toEqual([{ kind: "booked", status: "opened", channel: "whatsapp_link" }]);
  });

  it("a reminder must say which one; other kinds must not", async () => {
    const { patientId, caseId } = await newCase(a.client);
    const apptId = await book(a.client, patientId, caseId, inDays(1));
    const bad = await a.client.from("message_log").insert({ appointment_id: apptId, kind: "reminder", for_starts_at: inDays(1) });
    expect(bad.error).not.toBeNull();
    const ok = await a.client
      .from("message_log")
      .insert({ appointment_id: apptId, kind: "reminder", reminder: "evening", for_starts_at: inDays(1) });
    expect(ok.error).toBeNull();
  });

  it("PG B can't read PG A's messages or log one against A's appointment", async () => {
    const { patientId, caseId } = await newCase(a.client);
    const apptId = await book(a.client, patientId, caseId, inDays(2));
    await a.client.from("message_log").insert({ appointment_id: apptId, kind: "booked", for_starts_at: inDays(2) });

    const read = await b.client.from("message_log").select("id").eq("appointment_id", apptId);
    expect(read.data).toEqual([]);
    const write = await b.client.from("message_log").insert({ appointment_id: apptId, kind: "booked", for_starts_at: inDays(2) });
    expect(write.error).not.toBeNull();
  });

  it("is a log: entries can't be edited or deleted", async () => {
    const { patientId, caseId } = await newCase(a.client);
    const apptId = await book(a.client, patientId, caseId, inDays(2));
    await a.client.from("message_log").insert({ appointment_id: apptId, kind: "booked", for_starts_at: inDays(2) });
    expect((await a.client.from("message_log").update({ kind: "missed" }).eq("appointment_id", apptId)).error).not.toBeNull();
    expect((await a.client.from("message_log").delete().eq("appointment_id", apptId)).error).not.toBeNull();
  });
});

describe("record_visit for an earlier day", () => {
  function record(caseId: string, date: string | undefined, next?: { id: string; at: string }) {
    return a.client.rpc("record_visit", {
      p_case_id: caseId,
      p_stage_ids: [tpl.stageIds[0]!],
      p_outcome: "complete",
      p_complete_case: false,
      p_new_visit_id: randomUUID(),
      p_next_stage_id: tpl.stageIds[1]!,
      p_next_appointment_id: next?.id,
      p_next_starts_at: next?.at,
      p_next_duration_min: next ? 45 : undefined,
      p_visit_date: date,
    });
  }

  it("records the visit on that day and completes that day's forgotten appointment", async () => {
    const { patientId, caseId } = await olderCase(a.client);
    const day = addDays(istToday(), -3);
    const forgotten = await book(a.client, patientId, caseId, istToInstant(day, "10:00"));

    expect((await record(caseId, day)).error).toBeNull();

    const visit = await a.client.from("visit").select("visit_date, outcome, appointment_id").eq("case_id", caseId).eq("visit_date", day).single();
    expect(visit.data).toEqual({ visit_date: day, outcome: "complete", appointment_id: forgotten });
    const appt = await a.client.from("appointment").select("status").eq("id", forgotten).single();
    expect(appt.data?.status).toBe("completed");
  });

  it("moves the case's upcoming appointment rather than a past one, and never books into the past", async () => {
    const { patientId, caseId } = await olderCase(a.client);
    const day = addDays(istToday(), -2);
    await book(a.client, patientId, caseId, istToInstant(day, "10:00"));
    const upcoming = await book(a.client, patientId, caseId, inDays(3));

    const at = inDays(5);
    expect((await record(caseId, day, { id: randomUUID(), at })).error).toBeNull();
    const moved = await a.client.from("appointment").select("starts_at, duration_min").eq("id", upcoming).single();
    expect(Date.parse(moved.data!.starts_at)).toBe(Date.parse(at));
    const live = await a.client
      .from("appointment")
      .select("id")
      .eq("case_id", caseId)
      .in("status", ["scheduled", "confirmed", "unconfirmed"]);
    expect(live.data).toHaveLength(1);
  });

  it("allows up to 7 days back, not 8, and never a future day", async () => {
    const { caseId } = await olderCase(a.client);
    expect((await record(caseId, addDays(istToday(), -8))).error?.message).toMatch(/up to 7 days back/);
    expect((await record(caseId, addDays(istToday(), 1))).error?.message).toMatch(/up to 7 days back/);
    expect((await record(caseId, addDays(istToday(), -7))).error).toBeNull();
  });

  it("refuses an older visit once a later one is recorded (it would wind the case back)", async () => {
    const { caseId } = await olderCase(a.client);
    expect((await record(caseId, addDays(istToday(), -1))).error).toBeNull();
    expect((await record(caseId, addDays(istToday(), -4))).error?.message).toMatch(/later visit/);
  });

  it("today still works without a date, as before", async () => {
    const { caseId } = await newCase(a.client);
    expect((await record(caseId, undefined)).error).toBeNull();
  });
});

describe("reschedule_appointment", () => {
  it("moves a booked appointment (same id) and it needs confirming again", async () => {
    const { patientId, caseId } = await newCase(a.client);
    const id = await book(a.client, patientId, caseId, inDays(2), "confirmed");
    const at = inDays(4);
    const { data, error } = await a.client.rpc("reschedule_appointment", {
      p_appointment_id: id,
      p_new_id: randomUUID(),
      p_starts_at: at,
      p_duration_min: 60,
    });
    expect(error).toBeNull();
    expect(data).toBe(id);
    const row = await a.client.from("appointment").select("starts_at, duration_min, status").eq("id", id).single();
    expect(row.data).toMatchObject({ duration_min: 60, status: "scheduled" });
    expect(Date.parse(row.data!.starts_at)).toBe(Date.parse(at));
  });

  it("keeps a missed appointment and books a new one in its place — retry-safe", async () => {
    const { patientId, caseId } = await newCase(a.client);
    const missed = await book(a.client, patientId, caseId, inDays(-1), "missed");
    const newId = randomUUID();
    const args = { p_appointment_id: missed, p_new_id: newId, p_starts_at: inDays(3), p_duration_min: 30 };
    expect((await a.client.rpc("reschedule_appointment", args)).data).toBe(newId);
    expect((await a.client.rpc("reschedule_appointment", args)).data).toBe(newId);

    const rows = await a.client.from("appointment").select("id, status, rescheduled_from_id").eq("case_id", caseId).order("starts_at");
    expect(rows.data).toEqual([
      { id: missed, status: "missed", rescheduled_from_id: null },
      { id: newId, status: "scheduled", rescheduled_from_id: missed },
    ]);

    const overview = await a.client.from("case_overview").select("next_appointment_id, last_appointment_id, last_appointment_status").eq("case_id", caseId).single();
    expect(overview.data).toEqual({ next_appointment_id: newId, last_appointment_id: newId, last_appointment_status: "scheduled" });
  });

  it("refuses a time that has passed, a completed appointment, and another PG's appointment", async () => {
    const { patientId, caseId } = await newCase(a.client);
    const id = await book(a.client, patientId, caseId, inDays(2));
    const past = await a.client.rpc("reschedule_appointment", { p_appointment_id: id, p_new_id: randomUUID(), p_starts_at: inDays(-1), p_duration_min: 30 });
    expect(past.error?.message).toMatch(/passed/);

    const done = await book(a.client, patientId, caseId, inDays(-2), "completed");
    const completed = await a.client.rpc("reschedule_appointment", { p_appointment_id: done, p_new_id: randomUUID(), p_starts_at: inDays(2), p_duration_min: 30 });
    expect(completed.error?.message).toMatch(/can't be rescheduled/);

    const other = await b.client.rpc("reschedule_appointment", { p_appointment_id: id, p_new_id: randomUUID(), p_starts_at: inDays(5), p_duration_min: 30 });
    expect(other.error?.message).toMatch(/not found/);
  });
});

describe("case_overview: why a case needs attention", () => {
  it("shows the last appointment's status when nothing is booked", async () => {
    const { patientId, caseId } = await newCase(a.client);
    await book(a.client, patientId, caseId, inDays(-3), "cancelled");
    const row = await a.client.from("case_overview").select("next_appointment_id, last_appointment_status").eq("case_id", caseId).single();
    expect(row.data).toEqual({ next_appointment_id: null, last_appointment_status: "cancelled" });
  });
});
