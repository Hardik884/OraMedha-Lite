import { describe, expect, it } from "vitest";
import { GENERIC_LABELS, labelSuggestions, normaliseLabel } from "./labels";

describe("labelSuggestions", () => {
  it("offers the stages first (from the case's template), then generic labels", () => {
    expect(labelSuggestions({ kind: "xray", stageNames: ["Stage B", "Stage A"] })).toEqual([
      "Stage B",
      "Stage A",
      ...GENERIC_LABELS.image,
    ]);
  });

  it("documents get document labels", () => {
    expect(labelSuggestions({ kind: "document", stageNames: [] })).toEqual(GENERIC_LABELS.document);
  });

  it("drops duplicates and blanks, and keeps the list short", () => {
    const out = labelSuggestions({ kind: "photo", stageNames: ["A", "a ", "", "B", "C", "D", "E", "F", "G"] });
    expect(out[0]).toBe("A");
    expect(out.filter((l) => l.toLowerCase().trim() === "a")).toHaveLength(1);
    expect(out).not.toContain("");
    expect(out.length).toBeLessThanOrEqual(8);
  });
});

describe("normaliseLabel", () => {
  it("trims, collapses spaces and treats blank as no label", () => {
    expect(normaliseLabel("  Pre-op   view ")).toBe("Pre-op view");
    expect(normaliseLabel("   ")).toBeNull();
    expect(normaliseLabel(null)).toBeNull();
  });

  it("cuts very long labels", () => {
    expect(normaliseLabel("x".repeat(300))!.length).toBe(120);
  });
});
