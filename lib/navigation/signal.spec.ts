import { describe, expect, it } from "vitest";
import { isNavigationSignal } from "./signal";

describe("isNavigationSignal", () => {
  it("recognises Next.js redirects and not-found", () => {
    expect(isNavigationSignal(Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;push;/wrap-up;307;" }))).toBe(true);
    expect(isNavigationSignal({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" })).toBe(true);
  });

  it("treats everything else as a real failure", () => {
    expect(isNavigationSignal(new TypeError("Failed to fetch"))).toBe(false);
    expect(isNavigationSignal({ digest: "1234567" })).toBe(false);
    expect(isNavigationSignal(null)).toBe(false);
    expect(isNavigationSignal("NEXT_REDIRECT")).toBe(false);
  });
});
