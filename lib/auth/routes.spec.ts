import { describe, expect, it } from "vitest";
import { authRedirectFor, isPublicPath, safeNextPath } from "./routes";

describe("isPublicPath", () => {
  it("allows login, offline and the UI kit", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/offline")).toBe(true);
    expect(isPublicPath("/dev/ui")).toBe(true);
  });

  it("protects everything else", () => {
    expect(isPublicPath("/today")).toBe(false);
    expect(isPublicPath("/onboarding")).toBe(false);
    expect(isPublicPath("/loginx")).toBe(false);
  });
});

describe("safeNextPath", () => {
  it("keeps same-site paths", () => {
    expect(safeNextPath("/patients?q=ra")).toBe("/patients?q=ra");
  });

  it.each([null, "", "https://evil.example", "//evil.example", "/\\evil.example", "/login"])(
    "falls back to Today for %s",
    (next) => {
      expect(safeNextPath(next)).toBe("/today");
    },
  );
});

describe("authRedirectFor", () => {
  it("sends a signed-out visitor to login, remembering the page", () => {
    expect(authRedirectFor("/patients", "?q=ra", false)).toEqual({
      to: "/login?next=%2Fpatients%3Fq%3Dra",
    });
  });

  it("does not bother remembering the home page", () => {
    expect(authRedirectFor("/today", "", false)).toEqual({ to: "/login" });
  });

  it("lets a signed-out visitor see public pages", () => {
    expect(authRedirectFor("/login", "", false)).toBeNull();
    expect(authRedirectFor("/dev/ui", "", false)).toBeNull();
  });

  it("moves a signed-in PG off the login page", () => {
    expect(authRedirectFor("/login", "", true)).toEqual({ to: "/today" });
  });

  it("leaves signed-in PGs alone elsewhere", () => {
    expect(authRedirectFor("/progress", "", true)).toBeNull();
  });
});
