/**
 * Slice 2 database behaviour, against the LOCAL stack (`npm run test:db`):
 *  - create_patient_with_case / start_case are all-or-nothing and safe to retry
 *  - the tooth rule comes from the template (tooth_required)
 *  - case_overview finds the right "next appointment"
 *  - both views respect Row Level Security (security_invoker)
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/types/database.types";
import {
  ANON,
  URL,
  loadTemplates,
  noSession,
  onboardedPg,
  signedInUser,
  type Client,
  type TemplateCaseType,
} from "./helpers";

let a: { client: Client; id: string };
let b: { client: Client; id: string };
let toothCase: TemplateCaseType; // a case type that needs a tooth
let noToothCase: TemplateCaseType; // a case type that doesn't
let otherCase: TemplateCaseType; // a different case type than toothCase

function newPatientArgs(caseType: TemplateCaseType, overrides: Record<string, unknown> = {}) {
  return {
    p_patient_id: randomUUID(),
    p_full_name: "Test Patient",
    p_phone: "9876543210",
    p_case_id: randomUUID(),
    p_case_type_id: caseType.id,
    p_stage_id: caseType.stageIds[0]!,
    p_tooth: "36",
    ...overrides,
  };
}

async function counts(client: Client, caseId: string) {
  const visits = await client.from("visit").select("id").eq("case_id", caseId);
  const visitIds = (visits.data ?? []).map((v) => v.id);
  const stages = visitIds.length
    ? await client.from("visit_stage").select("id, outcome").in("visit_id", visitIds)
    : { data: [] };
  return { visits: visitIds.length, stages: stages.data ?? [] };
}

beforeAll(async () => {
  const reader = await signedInUser("tpl");
  const templates = Object.values(await loadTemplates(reader.client));
  toothCase = templates.find((t) => t.toothRequired)!;
  noToothCase = templates.find((t) => !t.toothRequired)!;
  otherCase = templates.find((t) => t.id !== toothCase.id)!;
  expect(toothCase && noToothCase && otherCase).toBeTruthy();

  a = await onboardedPg("cases-a", toothCase.specialtyId);
  b = await onboardedPg("cases-b", toothCase.specialtyId);
});

describe("create_patient_with_case", () => {
  it("creates patient, case, today's visit and its stage in one call", async () => {
    const args = newPatientArgs(toothCase);
    const { data, error } = await a.client.rpc("create_patient_with_case", args);
    expect(error).toBeNull();
    expect(data).toBe(args.p_case_id);

    const kase = await a.client.from("patient_case").select("*").eq("id", args.p_case_id).single();
    expect(kase.data!.current_stage_id).toBe(args.p_stage_id);
    expect(kase.data!.status).toBe("ongoing");

    const c = await counts(a.client, args.p_case_id);
    expect(c.visits).toBe(1);
    expect(c.stages).toEqual([expect.objectContaining({ outcome: null })]);
  });

  it("is safe to retry: the same ids never create duplicates", async () => {
    const args = newPatientArgs(toothCase);
    for (let i = 0; i < 3; i++) {
      const { error } = await a.client.rpc("create_patient_with_case", args);
      expect(error).toBeNull();
    }
    const patients = await a.client.from("patient").select("id").eq("id", args.p_patient_id);
    const cases = await a.client.from("patient_case").select("id").eq("patient_id", args.p_patient_id);
    expect(patients.data).toHaveLength(1);
    expect(cases.data).toHaveLength(1);
    expect((await counts(a.client, args.p_case_id)).visits).toBe(1);
  });

  it("saves nothing at all when any part is invalid", async () => {
    // A stage from a different case type.
    const args = newPatientArgs(toothCase, { p_stage_id: otherCase.stageIds[0] });
    const { error } = await a.client.rpc("create_patient_with_case", args);
    expect(error).not.toBeNull();
    const patient = await a.client.from("patient").select("id").eq("id", args.p_patient_id);
    expect(patient.data).toHaveLength(0);
  });

  it("requires a tooth only when the case type does", async () => {
    const missing = await a.client.rpc("create_patient_with_case", newPatientArgs(toothCase, { p_tooth: undefined }));
    expect(missing.error).not.toBeNull();

    const optional = await a.client.rpc(
      "create_patient_with_case",
      newPatientArgs(noToothCase, { p_tooth: undefined }),
    );
    expect(optional.error).toBeNull();
  });

  it("cannot be called signed out", async () => {
    const anon = createClient<Database>(URL, ANON, noSession);
    const { error } = await anon.rpc("create_patient_with_case", newPatientArgs(toothCase));
    expect(error).not.toBeNull();
  });
});

describe("start_case (another case for the same patient)", () => {
  it("adds a second case, and refuses another PG's patient", async () => {
    const first = newPatientArgs(toothCase);
    await a.client.rpc("create_patient_with_case", first);

    const second = await a.client.rpc("start_case", {
      p_case_id: randomUUID(),
      p_patient_id: first.p_patient_id,
      p_case_type_id: otherCase.id,
      p_stage_id: otherCase.stageIds[0]!,
      p_tooth: "11",
    });
    expect(second.error).toBeNull();
    const cases = await a.client.from("case_overview").select("case_id").eq("patient_id", first.p_patient_id);
    expect(cases.data).toHaveLength(2);

    const stolen = await b.client.rpc("start_case", {
      p_case_id: randomUUID(),
      p_patient_id: first.p_patient_id,
      p_case_type_id: toothCase.id,
      p_stage_id: toothCase.stageIds[0]!,
      p_tooth: "21",
    });
    expect(stolen.error).not.toBeNull();
  });
});

describe("case_overview", () => {
  it("shows the earliest live appointment as next, ignoring cancelled ones", async () => {
    const args = newPatientArgs(toothCase);
    await a.client.rpc("create_patient_with_case", args);

    const read = async () =>
      (await a.client.from("case_overview").select("*").eq("case_id", args.p_case_id).single()).data!;

    expect((await read()).next_appointment_id).toBeNull();

    const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();
    const later = await a.client
      .from("appointment")
      .insert({ patient_id: args.p_patient_id, case_id: args.p_case_id, starts_at: inDays(5), duration_min: 30 })
      .select("id")
      .single();
    const sooner = await a.client
      .from("appointment")
      .insert({ patient_id: args.p_patient_id, case_id: args.p_case_id, starts_at: inDays(2), duration_min: 60 })
      .select("id")
      .single();

    expect((await read()).next_appointment_id).toBe(sooner.data!.id);

    await a.client.from("appointment").update({ status: "cancelled" }).eq("id", sooner.data!.id);
    expect((await read()).next_appointment_id).toBe(later.data!.id);
  });

  it("views respect Row Level Security", async () => {
    const args = newPatientArgs(toothCase);
    await a.client.rpc("create_patient_with_case", args);
    await a.client.from("appointment").insert({
      patient_id: args.p_patient_id,
      case_id: args.p_case_id,
      starts_at: new Date(Date.now() + 86_400_000).toISOString(),
      duration_min: 30,
    });

    const cases = await b.client.from("case_overview").select("case_id, pg_id");
    const appts = await b.client.from("appointment_overview").select("appointment_id, pg_id");
    expect((cases.data ?? []).filter((r) => r.pg_id === a.id)).toHaveLength(0);
    expect((appts.data ?? []).filter((r) => r.pg_id === a.id)).toHaveLength(0);

    const anon = createClient<Database>(URL, ANON, noSession);
    const anonCases = await anon.from("case_overview").select("case_id");
    expect(anonCases.data ?? []).toHaveLength(0);
  });
});
