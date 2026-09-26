import { describe, expect, it } from "vitest";
import { filterPatients, parsePatientSearch } from "./search";

describe("parsePatientSearch", () => {
  it("empty means everyone", () => {
    expect(parsePatientSearch("")).toEqual({ kind: "all" });
    expect(parsePatientSearch(null)).toEqual({ kind: "all" });
    expect(parsePatientSearch(" , ( ) ")).toEqual({ kind: "all" });
  });

  it("numbers search phone and OPD", () => {
    expect(parsePatientSearch("98765 43210")).toEqual({ kind: "digits", digits: "9876543210" });
    expect(parsePatientSearch("+91 98765 43210")).toEqual({ kind: "digits", digits: "9876543210" });
    expect(parsePatientSearch("1289")).toEqual({ kind: "digits", digits: "1289" });
  });

  it("text searches names, with filter syntax stripped", () => {
    expect(parsePatientSearch("  Rahul  ")).toEqual({ kind: "text", text: "Rahul" });
    expect(parsePatientSearch("a,b)or(c%")).toEqual({ kind: "text", text: "a b or c" });
  });

  it("caps the length", () => {
    const result = parsePatientSearch("x".repeat(80));
    expect(result.kind === "text" && result.text.length).toBe(50);
  });
});

describe("filterPatients", () => {
  const people = [
    { fullName: "Rahul Sharma", phone: "9123456789", opdNumber: null },
    { fullName: "Sneha Kapoor", phone: "9876500001", opdNumber: "1289" },
    { fullName: "Neha Jain", phone: "9876512345", opdNumber: "OPD-77" },
  ];
  const names = (q: string) => filterPatients(people, q).map((p) => p.fullName);

  it("returns everyone for an empty search", () => {
    expect(names("")).toHaveLength(3);
  });

  it("matches the start of any name word, case-insensitively", () => {
    expect(names("rah")).toEqual(["Rahul Sharma"]);
    expect(names("kap")).toEqual(["Sneha Kapoor"]);
    expect(names("neha")).toEqual(["Neha Jain"]);
  });

  it("needs every typed word to match", () => {
    expect(names("sneha kap")).toEqual(["Sneha Kapoor"]);
    expect(names("sneha jain")).toEqual([]);
  });

  it("matches phone and OPD numbers by digits", () => {
    expect(names("98765")).toEqual(["Sneha Kapoor", "Neha Jain"]);
    expect(names("+91 91234 56789")).toEqual(["Rahul Sharma"]);
    expect(names("1289")).toEqual(["Sneha Kapoor"]);
  });

  it("matches an OPD number with letters", () => {
    expect(names("opd-77")).toEqual(["Neha Jain"]);
  });
});
