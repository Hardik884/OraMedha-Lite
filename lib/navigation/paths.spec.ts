import { describe, expect, it } from "vitest";
import {
  backHrefFor,
  bookedPath,
  reschedulePath,
  fileContentPath,
  filesPath,
  newCasePath,
  patientPath,
  schedulePath,
  visitPath,
  visitUpdatedPath,
} from "./paths";

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

  it("visit paths", () => {
    expect(visitPath("p1", "c1")).toBe("/patients/p1/cases/c1/visit");
    expect(visitUpdatedPath("p1", "c1")).toBe("/patients/p1/cases/c1/visit/updated");
  });
});

describe("file paths", () => {
  it("filesPath", () => {
    expect(filesPath("p1", "c1")).toBe("/patients/p1/cases/c1/files");
    expect(filesPath("p1", "c1", { fileId: "f1" })).toBe("/patients/p1/cases/c1/files?file=f1");
  });

  it("fileContentPath", () => {
    expect(fileContentPath("f1")).toBe("/api/files/f1");
    expect(fileContentPath("f1", { download: true })).toBe("/api/files/f1?download=1");
  });
});

describe("appointment paths", () => {
  it("bookedPath", () => {
    expect(bookedPath("p1", "a1")).toBe("/patients/p1/appointments/a1");
    expect(bookedPath("p1", "a1", { rescheduled: true })).toBe("/patients/p1/appointments/a1?rescheduled=1");
    expect(bookedPath("p1", "a1", { isNew: true })).toBe("/patients/p1/appointments/a1?new=1");
  });

  it("reschedulePath", () => {
    expect(reschedulePath("p1", "a1")).toBe("/patients/p1/appointments/a1/reschedule");
  });

  it("visitPath and visitUpdatedPath take an earlier date", () => {
    expect(visitPath("p1", "c1", { date: "2026-09-25" })).toBe("/patients/p1/cases/c1/visit?date=2026-09-25");
    expect(visitUpdatedPath("p1", "c1", { date: "2026-09-25" })).toBe("/patients/p1/cases/c1/visit/updated?date=2026-09-25");
  });
});
