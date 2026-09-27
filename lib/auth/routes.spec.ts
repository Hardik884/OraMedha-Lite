import { describe, expect, it } from "vitest";
import {
  authCallbackUrl,
  authRedirectFor,
  destinationAfterSignIn,
  isPublicPath,
  loginPath,
  safeNextPath,
} from "./routes";

describe("isPublicPath", () => {
  it("allows login, the sign-in callback, offline and the UI kit", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/auth/callback")).toBe(true);
    expect(isPublicPath("/offline")).toBe(true);
    expect(isPublicPath("/dev/ui")).toBe(true);
  });

  it("protects everything else", () => {
    expect(isPublicPath("/today")).toBe(false);
    expect(isPublicPath("/onboarding")).toBe(false);
    expect(isPublicPath("/loginx")).toBe(false);
    expect(isPublicPath("/authx")).toBe(false);
  });
});

describe("safeNextPath", () => {
  it("keeps same-site paths", () => {
    expect(safeNextPath("/patients?q=ra")).toBe("/patients?q=ra");
  });

  it.each([
    null,
    "",
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/login",
    "/auth/callback?code=x",
  ])("falls back to Today for %s", (next) => {
    expect(safeNextPath(next)).toBe("/today");
  });
});

describe("authCallbackUrl", () => {
  it("remembers where the PG was going", () => {
    expect(authCallbackUrl("https://lite.example", "/patients/abc")).toBe(
      "https://lite.example/auth/callback?next=%2Fpatients%2Fabc",
    );
  });

  it("leaves out Today and anything unsafe", () => {
    expect(authCallbackUrl("http://localhost:3000", "/today")).toBe("http://localhost:3000/auth/callback");
    expect(authCallbackUrl("http://localhost:3000", "//evil.example")).toBe("http://localhost:3000/auth/callback");
  });
});

describe("destinationAfterSignIn", () => {
  it("sends a PG with a profile where they were going", () => {
    expect(destinationAfterSignIn(true, "/progress")).toBe("/progress");
    expect(destinationAfterSignIn(true, null)).toBe("/today");
  });

  it("sends a new PG to onboarding first, still remembering the page", () => {
    expect(destinationAfterSignIn(false, null)).toBe("/onboarding");
    expect(destinationAfterSignIn(false, "/progress")).toBe("/onboarding?next=%2Fprogress");
  });
});

describe("loginPath", () => {
  it("builds the login address", () => {
    expect(loginPath()).toBe("/login");
    expect(loginPath({ error: "cancelled" })).toBe("/login?error=cancelled");
    expect(loginPath({ error: "failed", next: "/patients" })).toBe("/login?error=failed&next=%2Fpatients");
  });
});

describe("authRedirectFor", () => {
  it("sends a signed-out visitor to login, remembering the page", () => {
    expect(authRedirectFor("/patients", "?q=ra", false)).toEqual({
      to: "/login?next=%2Fpatients%3Fq%3Dra",
    });
  });

  it("does not bother remembering the home page", () => {
    expect(authRedirectFor("/today", "", false)).toEqual({ to: "/login" });
    expect(authRedirectFor("/", "", false)).toEqual({ to: "/login" });
  });

  it("lets a signed-out visitor see public pages", () => {
    expect(authRedirectFor("/login", "", false)).toBeNull();
    expect(authRedirectFor("/auth/callback", "?code=abc", false)).toBeNull();
    expect(authRedirectFor("/dev/ui", "", false)).toBeNull();
  });

  it("forwards a sign-in code that landed on the home or login page", () => {
    expect(authRedirectFor("/", "?code=abc", false)).toEqual({ to: "/auth/callback?code=abc" });
    expect(authRedirectFor("/login", "?code=abc&next=%2Fprogress", false)).toEqual({
      to: "/auth/callback?code=abc&next=%2Fprogress",
    });
  });

  it("moves a signed-in PG off the login page", () => {
    expect(authRedirectFor("/login", "", true)).toEqual({ to: "/today" });
    expect(authRedirectFor("/login", "?next=%2Fprogress", true)).toEqual({ to: "/progress" });
  });

  it("leaves signed-in PGs alone elsewhere", () => {
    expect(authRedirectFor("/progress", "", true)).toBeNull();
  });
});
