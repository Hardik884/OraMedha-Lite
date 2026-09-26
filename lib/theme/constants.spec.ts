import { describe, expect, it } from "vitest";
import { DEFAULT_THEME_PREFERENCE, THEME_STORAGE_KEY, isThemePreference } from "./constants";
import { THEME_INIT_SCRIPT } from "./script";

describe("theme preference", () => {
  it("accepts only light, dark and system", () => {
    expect(isThemePreference("light")).toBe(true);
    expect(isThemePreference("dark")).toBe(true);
    expect(isThemePreference("system")).toBe(true);
    expect(isThemePreference("blue")).toBe(false);
    expect(isThemePreference(null)).toBe(false);
  });

  it("the no-flash script reads the same key and default as the provider", () => {
    expect(THEME_INIT_SCRIPT).toContain(JSON.stringify(THEME_STORAGE_KEY));
    expect(THEME_INIT_SCRIPT).toContain(`s=${JSON.stringify(DEFAULT_THEME_PREFERENCE)}`);
  });

  it("the no-flash script is valid JavaScript", () => {
    expect(() => new Function(THEME_INIT_SCRIPT)).not.toThrow();
  });
});
