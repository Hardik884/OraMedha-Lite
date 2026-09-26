/**
 * Two PGs' appointments never affect each other's slots — proven with the
 * exact query the app uses (loadSchedulingData) against the LOCAL stack.
 */
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { addDays, istToday, istToInstant } from "@/lib/dates";
import { loadSchedulingData } from "@/lib/data/scheduling-query";
import { findSlots } from "@/lib/scheduling/slot-finder";
import { loadTemplates, onboardedPg, signedInUser, type Client } from "./helpers";

let a: { client: Client; id: string };
let b: { client: Client; id: string };
const today = istToday();
// A working day comfortably in the future (default timings: Mon–Sat).
let day = addDays(today, 3);
while (new Date(`${day}T00:00:00Z`).getUTCDay() === 0) day = addDays(day, 1);

async function bookAt(pg: { client: Client }, caseTypeId: string, stageId: string, time: string) {
  const patientId = randomUUID();
  await pg.client.rpc("create_patient_with_case", {
    p_patient_id: patientId,
    p_full_name: "Slot Test",
    p_phone: "9876543210",
    p_case_id: randomUUID(),
    p_case_type_id: caseTypeId,
    p_stage_id: stageId,
    p_tooth: "36",
  });
  const { error } = await pg.client
    .from("appointment")
    .insert({ patient_id: patientId, starts_at: istToInstant(day, time), duration_min: 60 });
  if (error) throw error;
}

beforeAll(async () => {
  const reader = await signedInUser("slots-tpl");
  const t = Object.values(await loadTemplates(reader.client)).find((x) => x.toothRequired)!;
  a = await onboardedPg("slots-a", t.specialtyId);
  b = await onboardedPg("slots-b", t.specialtyId);
  // Both PGs book 9:00–10:00 on the same day; B also books 10:00–11:00.
  await bookAt(a, t.id, t.stageIds[0]!, "09:00");
  await bookAt(b, t.id, t.stageIds[0]!, "09:00");
  await bookAt(b, t.id, t.stageIds[0]!, "10:00");
});

describe("slot finder inputs are per PG", () => {
  it("each PG only ever loads their own appointments", async () => {
    const dataA = await loadSchedulingData(a.client, today);
    const dataB = await loadSchedulingData(b.client, today);
    expect(dataA.appointments).toHaveLength(1);
    expect(dataB.appointments).toHaveLength(2);
  });

  it("so A's first free slot ignores B's bookings", async () => {
    const data = await loadSchedulingData(a.client, today);
    const r = findSlots({ ...data, window: { from: day, to: day }, durationMin: 60, now: new Date() });
    expect(r.kind !== "none" && r.first.time).toBe("10:00"); // after A's own 9:00, not after B's 10:00
  });
});
