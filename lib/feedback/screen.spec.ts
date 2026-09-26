import { describe, expect, it } from "vitest";
import { cleanScreen, settingsBackHref, validateFeedback } from "./screen";

describe("cleanScreen", () => {
  it("keeps a plain app path", () => {
    expect(cleanScreen("/today")).toBe("/today");
    expect(cleanScreen("/progress/logbook?period=all")).toBe("/progress/logbook");
  });
  it("never keeps a record id", () => {
    expect(cleanScreen("/patients/3f2b8a1c-1d2e-4f5a-9b8c-7d6e5f4a3b2c/cases/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/files")).toBe(
      "/patients/:id/cases/:id/files",
    );
  });
  it("refuses anything that isn't a same-site path", () => {
    expect(cleanScreen("https://evil.example")).toBeNull();
    expect(cleanScreen("//evil.example")).toBeNull();
    expect(cleanScreen("/a b<script>")).toBeNull();
    expect(cleanScreen(null)).toBeNull();
  });
});

describe("settingsBackHref", () => {
  it("back to the tab Settings was opened from", () => {
    expect(settingsBackHref("/progress")).toBe("/progress");
    expect(settingsBackHref("/patients")).toBe("/patients");
    expect(settingsBackHref("/elsewhere")).toBe("/today");
    expect(settingsBackHref(undefined)).toBe("/today");
  });
});

describe("validateFeedback", () => {
  it("trims, needs some text, caps the length", () => {
    expect(validateFeedback("  works well  ")).toEqual({ ok: true, value: "works well" });
    expect(validateFeedback("   ").ok).toBe(false);
    expect(validateFeedback("x".repeat(2001)).ok).toBe(false);
    expect(validateFeedback(42).ok).toBe(false);
  });
});
