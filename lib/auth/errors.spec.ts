import { describe, expect, it } from "vitest";
import {
  callbackErrorCode,
  exchangeErrorCode,
  friendlyAuthError,
  isSignInErrorCode,
  signInErrorMessage,
} from "./errors";

describe("friendlyAuthError", () => {
  it.each([
    ["Unsupported provider: provider is not enabled", "Google sign-in isn't switched on yet"],
    ["PKCE code verifier not found in storage", "same browser"],
    ["For security purposes, you can only request this after 30 seconds.", "Too many attempts"],
    ["Failed to fetch", "Couldn't reach OraMedha"],
    ["Signups not allowed for this instance", "New sign-ups are closed"],
    ["weird", "Something went wrong"],
  ])("%s", (raw, expected) => {
    expect(friendlyAuthError(raw)).toContain(expected);
  });
});

describe("callbackErrorCode", () => {
  it("treats a declined Google screen as cancelled", () => {
    expect(callbackErrorCode("access_denied", "The resource owner or authorization server denied the request")).toBe(
      "cancelled",
    );
  });

  it("spots closed sign-ups", () => {
    expect(callbackErrorCode("access_denied", "Signups not allowed for this instance")).toBe("closed");
  });

  it("falls back to failed", () => {
    expect(callbackErrorCode("server_error", null)).toBe("failed");
    expect(callbackErrorCode(null, null)).toBe("failed");
  });
});

describe("exchangeErrorCode", () => {
  it("spots a sign-in finished in another browser", () => {
    expect(exchangeErrorCode("invalid request: both auth code and code verifier should be non-empty")).toBe("browser");
    expect(exchangeErrorCode("PKCE code verifier not found in storage")).toBe("browser");
  });

  it("falls back to failed", () => {
    expect(exchangeErrorCode("invalid flow state, no valid flow state found")).toBe("browser");
    expect(exchangeErrorCode("boom")).toBe("failed");
  });
});

describe("sign-in error codes", () => {
  it("accepts only known codes from the address bar", () => {
    expect(isSignInErrorCode("cancelled")).toBe(true);
    expect(isSignInErrorCode("<script>")).toBe(false);
    expect(isSignInErrorCode(undefined)).toBe(false);
  });

  it("has a sentence for each", () => {
    for (const code of ["cancelled", "browser", "closed", "failed"] as const) {
      expect(signInErrorMessage(code).length).toBeGreaterThan(10);
    }
  });
});
