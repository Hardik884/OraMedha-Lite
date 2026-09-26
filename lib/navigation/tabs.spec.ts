import { describe, expect, it } from "vitest";
import { activeTabFor, NAV_TABS } from "./tabs";

describe("bottom navigation", () => {
  it("has exactly Today, Patients and Progress, in that order", () => {
    expect(NAV_TABS.map((t) => t.label)).toEqual(["Today", "Patients", "Progress"]);
  });

  it("highlights the tab for its own page", () => {
    expect(activeTabFor("/today")).toBe("today");
    expect(activeTabFor("/patients")).toBe("patients");
    expect(activeTabFor("/progress")).toBe("progress");
  });

  it("keeps the parent tab highlighted on nested screens", () => {
    expect(activeTabFor("/patients/abc-123")).toBe("patients");
  });

  it("does not match a different route that merely shares a prefix", () => {
    expect(activeTabFor("/patients-archive")).toBeNull();
    expect(activeTabFor("/dev/ui")).toBeNull();
  });
});
