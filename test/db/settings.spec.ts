/**
 * Slice 3 settings tables against the LOCAL stack (`npm run test:db`):
 * preferences, blocked times and both override tables stay private to each
 * PG, overrides can be reset (deleted), and blocked times are soft-delete
 * only with a valid shape.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { loadTemplates, onboardedPg, signedInUser, type Client, type TemplateCaseType } from "./helpers";

let a: { client: Client; id: string };
let b: { client: Client; id: string };
let caseType: TemplateCaseType;
let modifierId: string;

beforeAll(async () => {
  const reader = await signedInUser("settings-tpl");
  const templates = Object.values(await loadTemplates(reader.client));
  caseType = templates[0]!;
  a = await onboardedPg("settings-a", caseType.specialtyId);
  b = await onboardedPg("settings-b", caseType.specialtyId);
  const mod = await a.client.from("modifier").select("id").limit(1).single();
  modifierId = mod.data!.id;
});

describe("preferences", () => {
  it("a PG updates only their own", async () => {
    const hours = { "1": [{ start: "10:00", end: "12:00" }] };
    const saved = await a.client
      .from("pg_preferences")
      .upsert({ pg_id: a.id, working_hours: hours, slot_step_min: 30, reminder_timing: "both" }, { onConflict: "pg_id" });
    expect(saved.error).toBeNull();

    // B tries to overwrite A's row.
    await b.client.from("pg_preferences").update({ slot_step_min: 5 }).eq("pg_id", a.id);
    const mine = await a.client.from("pg_preferences").select("*").single();
    expect(mine.data).toMatchObject({ slot_step_min: 30, reminder_timing: "both", working_hours: hours });

    const bSees = await b.client.from("pg_preferences").select("pg_id");
    expect(bSees.data!.map((r) => r.pg_id)).toEqual([b.id]);
  });

  it("refuses values outside the allowed lists", async () => {
    const bad = await a.client.from("pg_preferences").update({ slot_step_min: 7 }).eq("pg_id", a.id);
    expect(bad.error).not.toBeNull();
    const badReminder = await a.client.from("pg_preferences").update({ reminder_timing: "never" }).eq("pg_id", a.id);
    expect(badReminder.error).not.toBeNull();
  });
});

describe("stage and modifier overrides", () => {
  it("save, stay private, and reset by deleting", async () => {
    const stageId = caseType.stageIds[0]!;
    const save = await a.client
      .from("pg_stage_override")
      .upsert({ pg_id: a.id, stage_id: stageId, duration_min: 90 }, { onConflict: "pg_id,stage_id" });
    expect(save.error).toBeNull();

    // Saving again updates the same row (one override per stage per PG).
    await a.client
      .from("pg_stage_override")
      .upsert({ pg_id: a.id, stage_id: stageId, duration_min: 75 }, { onConflict: "pg_id,stage_id" });
    const rows = await a.client.from("pg_stage_override").select("duration_min").eq("stage_id", stageId);
    expect(rows.data).toEqual([{ duration_min: 75 }]);

    expect((await b.client.from("pg_stage_override").select("id")).data).toHaveLength(0);

    await a.client.from("pg_stage_override").delete().eq("stage_id", stageId);
    expect((await a.client.from("pg_stage_override").select("id")).data).toHaveLength(0);
  });

  it("a PG cannot delete another PG's override", async () => {
    await a.client
      .from("pg_modifier_override")
      .upsert({ pg_id: a.id, modifier_id: modifierId, gap_min_days: 10, gap_max_days: 14 }, { onConflict: "pg_id,modifier_id" });
    await b.client.from("pg_modifier_override").delete().eq("modifier_id", modifierId);
    expect((await a.client.from("pg_modifier_override").select("id")).data).toHaveLength(1);
  });

  it("refuses a gap with only one end, or min above max", async () => {
    const half = await a.client
      .from("pg_stage_override")
      .insert({ stage_id: caseType.stageIds[1]!, gap_min_days: 3 });
    expect(half.error).not.toBeNull();
    const reversed = await a.client
      .from("pg_stage_override")
      .insert({ stage_id: caseType.stageIds[1]!, gap_min_days: 9, gap_max_days: 3 });
    expect(reversed.error).not.toBeNull();
  });
});

describe("blocked times", () => {
  it("are private, soft-delete only, and must have a valid shape", async () => {
    const weekly = await a.client
      .from("pg_blocked_time")
      .insert({ label: "Seminar", kind: "weekly", weekday: 3, start_time: "09:00", end_time: "11:00" })
      .select("id")
      .single();
    expect(weekly.error).toBeNull();

    expect((await b.client.from("pg_blocked_time").select("id")).data).toHaveLength(0);

    const hard = await a.client.from("pg_blocked_time").delete().eq("id", weekly.data!.id);
    expect(hard.error).not.toBeNull();

    const soft = await a.client
      .from("pg_blocked_time")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", weekly.data!.id);
    expect(soft.error).toBeNull();

    const mixed = await a.client
      .from("pg_blocked_time")
      .insert({ label: "Bad", kind: "weekly", weekday: 3, start_time: "11:00", end_time: "09:00" });
    expect(mixed.error).not.toBeNull();
  });
});
