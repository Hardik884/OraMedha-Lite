import { describe, expect, it } from "vitest";
import { attachFiles, buildTimeline } from "./timeline";

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

  it("adds Other work to the title and uses the visit's own outcome when that's all there is", () => {
    const [item] = buildTimeline(
      [{ id: "v", visitDate: "2026-09-26", stages: [], otherWork: "Pain relief", outcome: "complete" }],
      "2026-09-20",
    );
    expect(item!.title).toBe("Pain relief");
    expect(item!.kind === "visit" && item!.status.label).toBe("Completed");
  });

  it("only today's visit is editable", () => {
    const items = buildTimeline(
      [
        { id: "a", visitDate: "2026-09-26", stages: [{ name: "S", outcome: "partial", sortOrder: 1 }] },
        { id: "b", visitDate: "2026-09-20", stages: [{ name: "S", outcome: "complete", sortOrder: 1 }] },
      ],
      "2026-09-20",
      "2026-09-26",
    );
    expect(items.map((i) => i.kind === "visit" && i.editable)).toEqual([true, false, false]);
  });
});

describe("attachFiles", () => {
  const items = buildTimeline(
    [
      { id: "v1", visitDate: "2026-09-18", stages: [{ name: "Stage A", outcome: "complete", sortOrder: 10 }] },
      { id: "v2", visitDate: "2026-09-25", stages: [{ name: "Stage B", outcome: "partial", sortOrder: 20 }] },
    ],
    "2026-09-10",
  );
  const f = (id: string, date: string, visitId: string | null = null, createdAt = `${date}T10:00:00Z`) => ({
    id,
    date,
    visitId,
    createdAt,
  });

  it("puts a file added during Update Visit under that visit", () => {
    const out = attachFiles(items, [f("a", "2026-09-20", "v1")]);
    expect(out.find((e) => e.id === "v1")!.files.map((x) => x.id)).toEqual(["a"]);
  });

  it("puts a file added from the Patient screen under the same day's visit, or Case started", () => {
    const out = attachFiles(items, [f("a", "2026-09-25"), f("b", "2026-09-10")]);
    expect(out.find((e) => e.id === "v2")!.files.map((x) => x.id)).toEqual(["a"]);
    expect(out.find((e) => e.kind === "started")!.files.map((x) => x.id)).toEqual(["b"]);
  });

  it("gives other days their own 'Files added' entry, in date order", () => {
    const out = attachFiles(items, [f("a", "2026-09-21"), f("b", "2026-09-21", null, "2026-09-21T09:00:00Z"), f("c", "2026-09-26")]);
    expect(out.map((e) => [e.date, e.title])).toEqual([
      ["2026-09-26", "Files added"],
      ["2026-09-25", "Stage B"],
      ["2026-09-21", "Files added"],
      ["2026-09-18", "Stage A"],
      ["2026-09-10", "Case started"],
    ]);
    // Oldest first within an entry.
    expect(out[2]!.files.map((x) => x.id)).toEqual(["b", "a"]);
  });

  it("keeps entries without files", () => {
    expect(attachFiles(items, []).every((e) => e.files.length === 0)).toBe(true);
  });
});
