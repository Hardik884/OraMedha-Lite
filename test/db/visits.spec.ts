/**
 * record_visit against the LOCAL stack (`npm run test:db`).
 */
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { istToday, istToInstant } from "@/lib/dates";
import { loadTemplates, onboardedPg, signedInUser, type Client, type TemplateCaseType } from "./helpers";

let a: { client: Client; id: string };
let b: { client: Client; id: string };
let rct: TemplateCaseType; // ≥3 stages
let other: TemplateCaseType; // a different case type

const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

async function newCase(client: Client, caseType: TemplateCaseType, stageIndex = 0) {
  const patientId = randomUUID();
  const caseId = randomUUID();
  const { error } = await client.rpc("create_patient_with_case", {
    p_patient_id: patientId,
    p_full_name: "Visit Test",
    p_phone: "9876543210",
    p_case_id: caseId,
    p_case_type_id: caseType.id,
    p_stage_id: caseType.stageIds[stageIndex]!,
    p_tooth: "36",
  });
  if (error) throw error;
  return { patientId, caseId };
}

async function todaysAppointment(client: Client, patientId: string, caseId: string) {
  const { data, error } = await client
    .from("appointment")
    .insert({ patient_id: patientId, case_id: caseId, starts_at: istToInstant(istToday(), "00:30"), duration_min: 30 })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

function record(client: Client, args: Record<string, unknown>) {
  // Loosely typed on purpose: some cases deliberately send invalid input.
  return client.rpc("record_visit", { p_new_visit_id: randomUUID(), p_complete_case: false, ...args } as never);
}

async function visitsToday(client: Client, caseId: string) {
  const { data } = await client
    .from("visit")
    .select("id, outcome, other_work, next_stage_id, next_appointment_id, appointment_id, visit_stage!visit_stage_visit_same_pg (stage_id, outcome)")
    .eq("case_id", caseId)
    .eq("visit_date", istToday())
    .is("deleted_at", null);
  return data ?? [];
}

beforeAll(async () => {
  const reader = await signedInUser("visits-tpl");
  const templates = Object.values(await loadTemplates(reader.client));
  rct = templates.find((t) => t.stageIds.length >= 3 && t.toothRequired)!;
  other = templates.find((t) => t.id !== rct.id)!;
  a = await onboardedPg("visits-a", rct.specialtyId);
  b = await onboardedPg("visits-b", rct.specialtyId);
});

describe("record_visit", () => {
  it("fills in today's In-progress visit instead of creating a second one", async () => {
    const { caseId } = await newCase(a.client, rct);
    const [s0, s1] = rct.stageIds;

    const { error } = await record(a.client, {
      p_case_id: caseId,
      p_stage_ids: [s0],
      p_outcome: "complete",
      p_next_stage_id: s1,
    });
    expect(error).toBeNull();

    const visits = await visitsToday(a.client, caseId);
    expect(visits).toHaveLength(1);
    expect(visits[0]).toMatchObject({ outcome: "complete", next_stage_id: s1 });
    expect(visits[0]!.visit_stage).toEqual([{ stage_id: s0, outcome: "complete" }]);

    const kase = await a.client.from("patient_case").select("current_stage_id, status").eq("id", caseId).single();
    expect(kase.data).toEqual({ current_stage_id: s1, status: "ongoing" });
  });

  it("records earlier stages Complete and the furthest one with the chosen outcome", async () => {
    const { caseId } = await newCase(a.client, rct);
    const [s0, s1] = rct.stageIds;
    await record(a.client, { p_case_id: caseId, p_stage_ids: [s1, s0], p_outcome: "partial", p_next_stage_id: s1 });

    const [visit] = await visitsToday(a.client, caseId);
    const byStage = Object.fromEntries(visit!.visit_stage.map((vs) => [vs.stage_id, vs.outcome]));
    expect(byStage).toEqual({ [s0!]: "complete", [s1!]: "partial" });
  });

  it("marks today's appointment completed and books the next one — safely on retry", async () => {
    const { patientId, caseId } = await newCase(a.client, rct);
    const todayAppt = await todaysAppointment(a.client, patientId, caseId);
    const nextId = randomUUID();
    const args = {
      p_case_id: caseId,
      p_stage_ids: [rct.stageIds[0]],
      p_outcome: "complete",
      p_next_stage_id: rct.stageIds[1],
      p_next_appointment_id: nextId,
      p_next_starts_at: inDays(4),
      p_next_duration_min: 60,
    };

    for (let i = 0; i < 3; i++) expect((await record(a.client, args)).error).toBeNull();

    const appts = await a.client
      .from("appointment")
      .select("id, status, planned_stage_id, purpose")
      .eq("case_id", caseId)
      .order("starts_at");
    expect(appts.data).toEqual([
      { id: todayAppt, status: "completed", planned_stage_id: rct.stageIds[0], purpose: "treatment" },
      { id: nextId, status: "scheduled", planned_stage_id: rct.stageIds[1], purpose: "treatment" },
    ]);
    const [visit] = await visitsToday(a.client, caseId);
    expect(visit).toMatchObject({ appointment_id: todayAppt, next_appointment_id: nextId });
  });

  it("editing moves the appointment it booked (not a second one), or withdraws it", async () => {
    const { caseId } = await newCase(a.client, rct);
    const firstId = randomUUID();
    const base = { p_case_id: caseId, p_stage_ids: [rct.stageIds[0]], p_next_stage_id: rct.stageIds[1] };

    await record(a.client, {
      ...base,
      p_outcome: "complete",
      p_next_appointment_id: firstId,
      p_next_starts_at: inDays(4),
      p_next_duration_min: 60,
    });

    // Oops — it was Partial. The phone makes a fresh id for the edit.
    const edited = await record(a.client, {
      ...base,
      p_outcome: "partial",
      p_next_stage_id: rct.stageIds[0],
      p_next_appointment_id: randomUUID(),
      p_next_starts_at: inDays(2),
      p_next_duration_min: 45,
    });
    expect(edited.error).toBeNull();

    const appts = await a.client.from("appointment").select("id, status, duration_min, planned_stage_id").eq("case_id", caseId);
    expect(appts.data).toEqual([{ id: firstId, status: "scheduled", duration_min: 45, planned_stage_id: rct.stageIds[0] }]);

    // Edit again: schedule later → the booked appointment is withdrawn.
    await record(a.client, { ...base, p_outcome: "partial", p_next_stage_id: rct.stageIds[0] });
    const withdrawn = await a.client.from("appointment").select("id, status").eq("case_id", caseId);
    expect(withdrawn.data).toEqual([{ id: firstId, status: "cancelled" }]);
  });

  it("completes a case, cancels treatment visits still to come, and can book a review", async () => {
    const { patientId, caseId } = await newCase(a.client, rct);
    const leftover = await a.client
      .from("appointment")
      .insert({ patient_id: patientId, case_id: caseId, starts_at: inDays(10), duration_min: 30 })
      .select("id")
      .single();
    const reviewId = randomUUID();
    const last = rct.stageIds[rct.stageIds.length - 1]!;

    const { data, error } = await record(a.client, {
      p_case_id: caseId,
      p_stage_ids: [last],
      p_outcome: "complete",
      p_complete_case: true,
      p_next_appointment_id: reviewId,
      p_next_starts_at: inDays(30),
      p_next_duration_min: 15,
    });
    expect(error).toBeNull();
    expect(data).toMatchObject({ case_status: "completed", next_appointment_id: reviewId });

    const kase = await a.client.from("patient_case").select("status, completed_at, current_stage_id").eq("id", caseId).single();
    expect(kase.data).toMatchObject({ status: "completed", current_stage_id: last });
    expect(kase.data!.completed_at).not.toBeNull();

    const appts = await a.client.from("appointment").select("id, status, purpose").eq("case_id", caseId);
    expect(appts.data).toEqual(
      expect.arrayContaining([
        { id: leftover.data!.id, status: "cancelled", purpose: "treatment" },
        { id: reviewId, status: "scheduled", purpose: "review" },
      ]),
    );

    // Editing back to Partial re-opens the case.
    await record(a.client, { p_case_id: caseId, p_stage_ids: [last], p_outcome: "partial", p_next_stage_id: last });
    const reopened = await a.client.from("patient_case").select("status, completed_at").eq("id", caseId).single();
    expect(reopened.data).toEqual({ status: "ongoing", completed_at: null });
  });

  it("records Other work with no template stage", async () => {
    const { caseId } = await newCase(a.client, rct);
    const { error } = await record(a.client, {
      p_case_id: caseId,
      p_stage_ids: [],
      p_other_work: "Emergency visit",
      p_outcome: "complete",
      p_next_stage_id: rct.stageIds[0],
    });
    expect(error).toBeNull();
    const [visit] = await visitsToday(a.client, caseId);
    expect(visit).toMatchObject({ other_work: "Emergency visit" });
    expect(visit!.visit_stage).toEqual([]);
  });

  it("refuses bad input and saves nothing", async () => {
    const { caseId } = await newCase(a.client, rct);
    const nothing = await record(a.client, { p_case_id: caseId, p_stage_ids: [], p_outcome: "complete", p_next_stage_id: rct.stageIds[1] });
    expect(nothing.error).not.toBeNull();

    const wrongType = await record(a.client, {
      p_case_id: caseId,
      p_stage_ids: [other.stageIds[0]],
      p_outcome: "complete",
      p_next_stage_id: rct.stageIds[1],
    });
    expect(wrongType.error).not.toBeNull();

    const noNext = await record(a.client, { p_case_id: caseId, p_stage_ids: [rct.stageIds[0]], p_outcome: "complete" });
    expect(noNext.error).not.toBeNull();

    // The New Patient visit is untouched.
    const [visit] = await visitsToday(a.client, caseId);
    expect(visit!.outcome).toBeNull();
  });

  it("the database refuses a second visit for the same case and day", async () => {
    const { caseId } = await newCase(a.client, rct);
    const dup = await a.client.from("visit").insert({ case_id: caseId });
    expect(dup.error).not.toBeNull();
  });

  it("another PG cannot record a visit on this case", async () => {
    const { caseId } = await newCase(a.client, rct);
    const stolen = await record(b.client, {
      p_case_id: caseId,
      p_stage_ids: [rct.stageIds[0]],
      p_outcome: "complete",
      p_next_stage_id: rct.stageIds[1],
    });
    expect(stolen.error).not.toBeNull();
    const [visit] = await visitsToday(a.client, caseId);
    expect(visit!.outcome).toBeNull();
  });
});
