/**
 * Row Level Security and integrity checks, run against the LOCAL stack with
 * two real signed-in PGs (`npm run test:db`).
 *
 * What this proves:
 *  - signed-out visitors can read nothing
 *  - templates are readable, but not writable, by any signed-in PG
 *  - a PG never sees, edits or links to another PG's patients/cases/visits
 *  - soft-delete tables cannot be hard-deleted
 *  - a stage from a different case type is refused
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/types/database.types";

const URL = process.env.TEST_SUPABASE_URL!;
const ANON = process.env.TEST_SUPABASE_ANON_KEY!;
const SERVICE = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY!;

type Client = SupabaseClient<Database>;

const noSession = { auth: { persistSession: false, autoRefreshToken: false } };

async function signedInPg(label: string): Promise<{ client: Client; id: string }> {
  const admin = createClient<Database>(URL, SERVICE, noSession);
  const email = `rls-${label}-${randomUUID()}@test.local`;
  const password = `pw-${randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("createUser failed");

  const client = createClient<Database>(URL, ANON, noSession);
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  return { client, id: data.user.id };
}

/** The first stage of two case types from different specialties. */
async function templateIds(client: Client) {
  const { data: stages, error } = await client
    .from("stage")
    .select("id, sort_order, case_type:case_type_id (id, code, specialty_id)")
    .order("sort_order");
  if (error) throw error;
  const firstStageOf = (caseTypeCode: string) => {
    const row = stages!.find((s) => s.case_type?.code === caseTypeCode);
    if (!row?.case_type) throw new Error(`template ${caseTypeCode} missing`);
    return { stageId: row.id, caseTypeId: row.case_type.id, specialtyId: row.case_type.specialty_id };
  };
  return { firstEndo: firstStageOf("primary_rct"), firstProstho: firstStageOf("crown") };
}

let a: { client: Client; id: string };
let b: { client: Client; id: string };
let tpl: Awaited<ReturnType<typeof templateIds>>;
let aPatientId: string;
let aCaseId: string;
let aVisitId: string;

beforeAll(async () => {
  a = await signedInPg("a");
  b = await signedInPg("b");
  tpl = await templateIds(a.client);

  for (const pg of [a, b]) {
    const profile = await pg.client.from("pg_profile").insert({
      id: pg.id,
      full_name: "Test PG",
      college: "Test College",
      specialty_id: tpl.firstEndo.specialtyId,
    });
    expect(profile.error).toBeNull();
    const settings = await pg.client.from("pg_preferences").insert({});
    expect(settings.error).toBeNull();
  }

  const patient = await a.client
    .from("patient")
    .insert({ full_name: "Patient A", phone: "9876543210" })
    .select("id")
    .single();
  expect(patient.error).toBeNull();
  aPatientId = patient.data!.id;

  const kase = await a.client
    .from("patient_case")
    .insert({
      patient_id: aPatientId,
      case_type_id: tpl.firstEndo.caseTypeId,
      tooth: "46",
      current_stage_id: tpl.firstEndo.stageId,
    })
    .select("id")
    .single();
  expect(kase.error).toBeNull();
  aCaseId = kase.data!.id;

  const visit = await a.client.from("visit").insert({ case_id: aCaseId }).select("id").single();
  expect(visit.error).toBeNull();
  aVisitId = visit.data!.id;

  const vs = await a.client
    .from("visit_stage")
    .insert({ visit_id: aVisitId, stage_id: tpl.firstEndo.stageId, outcome: "partial" });
  expect(vs.error).toBeNull();
});

describe("signed-out visitors", () => {
  it("cannot read templates or clinical data", async () => {
    const anon = createClient<Database>(URL, ANON, noSession);
    const stages = await anon.from("stage").select("id");
    const patients = await anon.from("patient").select("id");
    // Either an explicit permission error or an empty result — never rows.
    expect(stages.data ?? []).toHaveLength(0);
    expect(patients.data ?? []).toHaveLength(0);
  });
});

describe("templates", () => {
  it("are readable by any signed-in PG", async () => {
    const { data, error } = await b.client.from("specialty").select("code");
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });

  it("cannot be changed by a PG", async () => {
    const insert = await a.client.from("specialty").insert({ code: "hacked", name: "Hacked" });
    expect(insert.error).not.toBeNull();

    await a.client.from("stage").update({ default_duration_min: 5 }).eq("id", tpl.firstEndo.stageId);
    const { data } = await b.client
      .from("stage")
      .select("default_duration_min")
      .eq("id", tpl.firstEndo.stageId)
      .single();
    expect(data!.default_duration_min).not.toBe(5);
  });
});

describe("PG isolation", () => {
  it("another PG sees none of A's rows", async () => {
    for (const table of ["pg_profile", "pg_preferences", "patient", "patient_case", "visit", "visit_stage"] as const) {
      const { data, error } = await b.client.from(table).select("*");
      expect(error).toBeNull();
      const leaked = (data ?? []).filter((row) =>
        JSON.stringify(row).includes(a.id),
      );
      expect(leaked, `${table} leaked A's rows to B`).toHaveLength(0);
    }
  });

  it("another PG cannot edit A's patient", async () => {
    await b.client.from("patient").update({ full_name: "Changed by B" }).eq("id", aPatientId);
    const { data } = await a.client.from("patient").select("full_name").eq("id", aPatientId).single();
    expect(data!.full_name).toBe("Patient A");
  });

  it("another PG cannot attach a case to A's patient, even knowing the id", async () => {
    const { error } = await b.client.from("patient_case").insert({
      patient_id: aPatientId,
      case_type_id: tpl.firstEndo.caseTypeId,
    });
    expect(error).not.toBeNull();
  });

  it("a PG cannot create rows owned by someone else", async () => {
    const { error } = await b.client
      .from("patient")
      .insert({ pg_id: a.id, full_name: "Planted", phone: "9876543210" });
    expect(error).not.toBeNull();
  });
});

describe("soft delete", () => {
  it("patients cannot be hard-deleted", async () => {
    const { error } = await a.client.from("patient").delete().eq("id", aPatientId);
    expect(error).not.toBeNull();
    const { data } = await a.client.from("patient").select("id").eq("id", aPatientId);
    expect(data).toHaveLength(1);
  });

  it("setting deleted_at works and the row is kept", async () => {
    const extra = await a.client
      .from("patient")
      .insert({ full_name: "To remove", phone: "9123456780" })
      .select("id")
      .single();
    const { error } = await a.client
      .from("patient")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", extra.data!.id);
    expect(error).toBeNull();
    const { data } = await a.client.from("patient").select("deleted_at").eq("id", extra.data!.id).single();
    expect(data!.deleted_at).not.toBeNull();
  });
});

describe("template integrity", () => {
  it("refuses a stage from a different case type on a visit", async () => {
    const { error } = await a.client
      .from("visit_stage")
      .insert({ visit_id: aVisitId, stage_id: tpl.firstProstho.stageId, outcome: "complete" });
    expect(error).not.toBeNull();
  });

  it("refuses a current stage from a different case type on a case", async () => {
    const { error } = await a.client
      .from("patient_case")
      .update({ current_stage_id: tpl.firstProstho.stageId })
      .eq("id", aCaseId);
    expect(error).not.toBeNull();
  });
});
