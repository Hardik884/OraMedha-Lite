import { beforeAll, describe, expect, it } from "vitest";
import { signedInUser, type Client } from "./helpers";

/**
 * The procedure templates as shipped: every case type a PG can start must
 * walk from its first stage to a last stage, so the next-step engine always
 * has somewhere to go and every case can be completed.
 */
let client: Client;

beforeAll(async () => {
  ({ client } = await signedInUser("templates"));
});

type StageRow = {
  id: string;
  sort_order: number;
  default_gap_min_days: number | null;
  next_stage_on_complete_id: string | null;
};

describe("procedure templates", () => {
  it("every active case type runs from its first stage to a last stage", async () => {
    const { data, error } = await client
      .from("case_type")
      .select("code, is_active, specialty:specialty_id (code), stage!stage_case_type_id_fkey (id, sort_order, default_gap_min_days, next_stage_on_complete_id)")
      .eq("is_active", true);
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(15);

    for (const ct of data!) {
      const stages = [...(ct.stage as StageRow[])].sort((a, b) => a.sort_order - b.sort_order);
      expect(stages.length, ct.code).toBeGreaterThan(0);
      const byId = new Map(stages.map((s) => [s.id, s]));
      let current: StageRow | undefined = stages[0];
      const seen = new Set<string>();
      while (current && current.next_stage_on_complete_id) {
        expect(seen.has(current.id), `${ct.code} loops`).toBe(false);
        seen.add(current.id);
        // A stage that leads on has a gap before the next visit.
        expect(current.default_gap_min_days, `${ct.code} gap`).not.toBeNull();
        current = byId.get(current.next_stage_on_complete_id);
      }
      // The last stage has no gap: completing it completes the case.
      expect(current?.default_gap_min_days ?? null, `${ct.code} last stage`).toBeNull();
    }
  });

  it("offers every specialty, and closes the earlier Primary RCT steps to new cases", async () => {
    const { data: specialties } = await client.from("specialty").select("code").eq("is_active", true);
    expect(specialties!.map((s) => s.code).sort()).toEqual(
      ["endodontics", "implantology", "oral_surgery", "orthodontics", "pedodontics", "periodontics", "prosthodontics"],
    );
    const { data: rct } = await client.from("case_type").select("code, is_active").in("code", ["primary_rct", "rct"]);
    expect(rct).toEqual(
      expect.arrayContaining([
        { code: "primary_rct", is_active: false },
        { code: "rct", is_active: true },
      ]),
    );
  });
});
