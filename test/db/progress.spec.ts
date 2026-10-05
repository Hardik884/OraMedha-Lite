/**
 * Progress and logbook read models against the LOCAL stack (`npm run test:db`).
 * PG A's counts and logbook never include PG B's data; deleted and not-yet-
 * updated records never appear; targets are private.
 */
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { istToday } from "@/lib/dates";
import { caseTypeProgress, logbookEntries, resolvePeriod, stageCounts, type LogEntry, type ProgressCase } from "@/lib/progress/count";
import { loadTemplates, onboardedPg, signedInUser, type Client, type TemplateCaseType } from "./helpers";

let a: { client: Client; id: string };
let b: { client: Client; id: string };
let tpl: TemplateCaseType;

async function newCase(client: Client, name: string) {
  const caseId = randomUUID();
  const { error } = await client.rpc("create_patient_with_case", {
    p_patient_id: randomUUID(),
    p_full_name: name,
    p_phone: "9876543210",
    p_case_id: caseId,
    p_case_type_id: tpl.id,
    p_stage_id: tpl.stageIds[0]!,
    p_tooth: "36",
  });
  if (error) throw error;
  return caseId;
}

function record(client: Client, caseId: string, stageIds: string[], complete: boolean) {
  return client.rpc("record_visit", {
    p_case_id: caseId,
    p_stage_ids: stageIds,
    p_outcome: "complete",
    p_complete_case: complete,
    p_new_visit_id: randomUUID(),
    p_next_stage_id: complete ? undefined : tpl.stageIds[stageIds.length]!,
  });
}

async function load(client: Client) {
  const [cases, entries] = await Promise.all([
    client.from("progress_case").select("*"),
    client.from("logbook_entry").select("*"),
  ]);
  if (cases.error) throw cases.error;
  if (entries.error) throw entries.error;
  const pc: ProgressCase[] = cases.data.map((c) => ({
    caseId: c.case_id!,
    caseTypeId: c.case_type_id!,
    status: c.status === "completed" ? "completed" : "ongoing",
    completedOn: c.completed_on,
    isSpecial: !!c.is_special,
    deleted: false,
  }));
  const le: LogEntry[] = entries.data.map((e) => ({
    visitId: e.visit_id!,
    visitDate: e.visit_date!,
    createdAt: e.visit_created_at!,
    patientId: e.patient_id!,
    patientName: e.patient_name!,
    opdNumber: e.opd_number,
    caseId: e.case_id!,
    caseTypeId: e.case_type_id!,
    caseTypeName: e.case_type_name!,
    tooth: e.tooth,
    stageId: e.stage_id!,
    stageName: e.stage_name!,
    stageOrder: e.stage_sort!,
    outcome: e.outcome === "complete" || e.outcome === "partial" ? e.outcome : null,
    isSpecial: !!e.is_special,
    deleted: false,
  }));
  return { cases: cases.data, entries: entries.data, pc, le };
}

let aCompleted: string;
let aOngoing: string;
let aDeletedVisitCase: string;

beforeAll(async () => {
  const reader = await signedInUser("prog-tpl");
  const templates = Object.values(await loadTemplates(reader.client));
  tpl = templates.find((t) => t.stageIds.length >= 3 && t.toothRequired)!;
  a = await onboardedPg("prog-a", tpl.specialtyId);
  b = await onboardedPg("prog-b", tpl.specialtyId);

  // A: one case completed today (all stages in one visit), marked special.
  aCompleted = await newCase(a.client, "A Completed");
  expect((await record(a.client, aCompleted, tpl.stageIds, true)).error).toBeNull();
  expect((await a.client.from("patient_case").update({ is_special: true }).eq("id", aCompleted)).error).toBeNull();

  // A: one case still ongoing, first stage done.
  aOngoing = await newCase(a.client, "A Ongoing");
  expect((await record(a.client, aOngoing, [tpl.stageIds[0]!], false)).error).toBeNull();

  // A: a case whose updated visit was then deleted — must not count.
  aDeletedVisitCase = await newCase(a.client, "A Deleted Visit");
  expect((await record(a.client, aDeletedVisitCase, [tpl.stageIds[0]!], false)).error).toBeNull();
  await a.client.from("visit").update({ deleted_at: new Date().toISOString() }).eq("case_id", aDeletedVisitCase);

  // B: lots of activity of its own.
  for (let i = 0; i < 3; i++) {
    const c = await newCase(b.client, `B ${i}`);
    expect((await record(b.client, c, tpl.stageIds, true)).error).toBeNull();
  }
});

describe("progress_case and logbook_entry", () => {
  it("PG A sees only A's cases and logbook, never B's", async () => {
    const { cases, entries } = await load(a.client);
    expect(cases.every((c) => c.pg_id === a.id)).toBe(true);
    expect(entries.every((e) => e.pg_id === a.id)).toBe(true);
    expect(cases.some((c) => c.patient_id && entries.some((e) => e.patient_name?.startsWith("B ")))).toBe(false);

    const bView = await load(b.client);
    expect(bView.cases).toHaveLength(3);
    expect(bView.entries.every((e) => e.pg_id === b.id)).toBe(true);
  });

  it("A's counts: 1 completed (today, special), 2 open, stages done counted once each", async () => {
    const { pc, le } = await load(a.client);
    const month = resolvePeriod({ kind: "month" }, istToday());
    const [row] = caseTypeProgress([{ id: tpl.id, name: "T", sortOrder: 1 }], pc, month, {});
    expect(row).toMatchObject({ completed: 1, ongoing: 2 });
    expect(pc.find((c) => c.caseId === aCompleted)).toMatchObject({ isSpecial: true, completedOn: istToday() });

    const counts = Object.fromEntries(stageCounts(le, month).map((s) => [s.stageId, s.count]));
    // Stage 1: the completed case's visit + the ongoing case's visit. The deleted visit doesn't count.
    expect(counts[tpl.stageIds[0]!]).toBe(2);
    expect(counts[tpl.stageIds[1]!]).toBe(1);
  });

  it("the logbook leaves out deleted visits and visits not yet updated", async () => {
    const { le } = await load(a.client);
    expect(le.some((e) => e.caseId === aDeletedVisitCase)).toBe(false);
    const fresh = await newCase(a.client, "A Not Updated"); // its "In progress" visit has no outcome yet
    const after = await load(a.client);
    expect(after.le.some((e) => e.caseId === fresh)).toBe(false);
    expect(logbookEntries(after.le, resolvePeriod({ kind: "all" }, istToday())).every((e) => e.outcome !== null)).toBe(true);
  });

  it("the logbook carries no phone numbers", async () => {
    const { entries } = await load(a.client);
    expect(Object.keys(entries[0]!)).not.toContain("patient_phone");
    expect(JSON.stringify(entries)).not.toContain("9876543210");
  });
});

describe("pg_case_type_target", () => {
  it("each PG sets and sees only their own targets", async () => {
    expect((await a.client.from("pg_case_type_target").insert({ case_type_id: tpl.id, target: 10 })).error).toBeNull();
    expect((await b.client.from("pg_case_type_target").select("id")).data).toEqual([]);
    // B can't change A's target, even by id.
    const { data: mine } = await a.client.from("pg_case_type_target").select("id").single();
    await b.client.from("pg_case_type_target").update({ target: 1 }).eq("id", mine!.id);
    await b.client.from("pg_case_type_target").delete().eq("id", mine!.id);
    const still = await a.client.from("pg_case_type_target").select("target").single();
    expect(still.data?.target).toBe(10);
  });

  it("refuses silly targets and a second target for the same case type", async () => {
    expect((await a.client.from("pg_case_type_target").insert({ case_type_id: tpl.id, target: 5 })).error).not.toBeNull();
    const other = Object.values(await loadTemplates(a.client)).find((t) => t.id !== tpl.id)!;
    expect((await a.client.from("pg_case_type_target").insert({ case_type_id: other.id, target: 0 })).error).not.toBeNull();
  });
});

describe("pg_special_case_target", () => {
  it("each PG sets and sees only their own special-case target", async () => {
    const spec = tpl.specialtyId;
    expect((await a.client.from("pg_special_case_target").insert({ specialty_id: spec, target: 5 })).error).toBeNull();
    expect((await b.client.from("pg_special_case_target").select("id")).data).toEqual([]);
    const { data: mine } = await a.client.from("pg_special_case_target").select("id").single();
    await b.client.from("pg_special_case_target").update({ target: 1 }).eq("id", mine!.id);
    await b.client.from("pg_special_case_target").delete().eq("id", mine!.id);
    expect((await a.client.from("pg_special_case_target").select("target").single()).data?.target).toBe(5);
  });

  it("refuses silly targets and a second target for the same specialty", async () => {
    expect((await a.client.from("pg_special_case_target").insert({ specialty_id: tpl.specialtyId, target: 3 })).error).not.toBeNull();
    expect((await b.client.from("pg_special_case_target").insert({ specialty_id: tpl.specialtyId, target: 0 })).error).not.toBeNull();
    expect((await b.client.from("pg_special_case_target").insert({ specialty_id: tpl.specialtyId, target: 1001 })).error).not.toBeNull();
  });
});
