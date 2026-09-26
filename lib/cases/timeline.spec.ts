import { describe, expect, it } from "vitest";
import { buildTimeline } from "./timeline";

describe("buildTimeline", () => {
  it("lists visits newest first and ends with Case started", () => {
    const items = buildTimeline(
      [
        { id: "v1", visitDate: "2026-09-18", stages: [{ name: "Stage A", outcome: "complete", sortOrder: 10 }] },
        { id: "v2", visitDate: "2026-09-25", stages: [{ name: "Stage B", outcome: null, sortOrder: 20 }] },
      ],
      "2026-09-18",
    );
    expect(items.map((i) => [i.date, i.title])).toEqual([
      ["2026-09-25", "Stage B"],
      ["2026-09-18", "Stage A"],
      ["2026-09-18", "Case started"],
    ]);
  });

  it("shows a not-yet-updated visit as In progress", () => {
    const [item] = buildTimeline(
      [{ id: "v", visitDate: "2026-09-26", stages: [{ name: "Stage A", outcome: null, sortOrder: 10 }] }],
      "2026-09-26",
    );
    expect(item!.kind === "visit" && item!.status).toEqual({ label: "In progress", variant: "accent" });
  });

  it("joins several stages done in one visit, in template order", () => {
    const [item] = buildTimeline(
      [
        {
          id: "v",
          visitDate: "2026-09-26",
          stages: [
            { name: "Stage B", outcome: "partial", sortOrder: 20 },
            { name: "Stage A", outcome: "complete", sortOrder: 10 },
          ],
        },
      ],
      "2026-09-26",
    );
    expect(item!.title).toBe("Stage A + Stage B");
    expect(item!.kind === "visit" && item!.status.label).toBe("Partial");
  });

  it("marks a visit Completed only when every stage was", () => {
    const [item] = buildTimeline(
      [{ id: "v", visitDate: "2026-09-26", stages: [{ name: "Stage A", outcome: "complete", sortOrder: 10 }] }],
      "2026-09-26",
    );
    expect(item!.kind === "visit" && item!.status.label).toBe("Completed");
  });

  it("a brand-new case has just its start", () => {
    expect(buildTimeline([], "2026-09-26")).toEqual([
      { kind: "started", id: "started", date: "2026-09-26", title: "Case started" },
    ]);
  });
});
