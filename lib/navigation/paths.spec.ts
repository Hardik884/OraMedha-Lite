import { describe, expect, it } from "vitest";
import { backHrefFor, newCasePath, patientPath, schedulePath } from "./paths";

describe("screen paths", () => {
  it("patientPath", () => {
    expect(patientPath("p1")).toBe("/patients/p1");
    expect(patientPath("p1", { caseId: "c1", from: "today" })).toBe("/patients/p1?case=c1&from=today");
  });

  it("schedulePath", () => {
    expect(schedulePath("p1", "c1")).toBe("/patients/p1/cases/c1/schedule");
    expect(schedulePath("p1", "c1", { isNew: true })).toBe("/patients/p1/cases/c1/schedule?new=1");
  });

  it("newCasePath", () => {
    expect(newCasePath("p1")).toBe("/patients/p1/cases/new");
  });

  it("backHrefFor only trusts known values", () => {
    expect(backHrefFor("today")).toBe("/today");
    expect(backHrefFor("patients")).toBe("/patients");
    expect(backHrefFor("https://evil.example")).toBe("/patients");
    expect(backHrefFor(null)).toBe("/patients");
  });
});
