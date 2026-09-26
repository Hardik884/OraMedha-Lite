import { describe, expect, it } from "vitest";
import { logbookQueryString, parseLogbookQuery } from "./query";

describe("parseLogbookQuery", () => {
  it("defaults to this year and all case types", () => {
    const f = parseLogbookQuery({}, "2026-09-27", ["a"]);
    expect(f).toMatchObject({ caseTypeId: null, period: { kind: "year", from: "2026-01-01", to: "2026-12-31" } });
  });

  it("ignores a case type that isn't one of the PG's", () => {
    expect(parseLogbookQuery({ caseType: "zzz" }, "2026-09-27", ["a"]).caseTypeId).toBeNull();
    expect(parseLogbookQuery({ caseType: "a" }, "2026-09-27", ["a"]).caseTypeId).toBe("a");
  });

  it("round-trips a custom range", () => {
    const f = parseLogbookQuery({ period: "custom", from: "2026-09-01", to: "2026-09-15", caseType: "a" }, "2026-09-27", ["a"]);
    expect(logbookQueryString(f)).toEqual({ caseType: "a", period: "custom", from: "2026-09-01", to: "2026-09-15" });
  });
});
