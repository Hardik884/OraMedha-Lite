import { describe, expect, it } from "vitest";
import { isLocalSupabaseUrl, localOnlyRefusal } from "./local-guard";

describe("isLocalSupabaseUrl", () => {
  it.each(["http://127.0.0.1:54321", "http://localhost:54321", "http://[::1]:54321"])("allows %s", (url) => {
    expect(isLocalSupabaseUrl(url)).toBe(true);
  });

  it.each([
    "https://abcdefghijklmnop.supabase.co",
    "http://abcdefghijklmnop.supabase.co",
    "https://127.0.0.1:54321", // local stack never uses https; treat as suspicious
    "http://127.0.0.1.evil.example:54321",
    "http://localhost.evil.example",
    "not a url",
    "",
    undefined,
    null,
  ])("refuses %s", (url) => {
    expect(isLocalSupabaseUrl(url)).toBe(false);
  });
});

describe("localOnlyRefusal", () => {
  it("names the host it refused and how to fix it", () => {
    const msg = localOnlyRefusal("npm run test:db", "https://abcdefghijklmnop.supabase.co");
    expect(msg).toContain("abcdefghijklmnop.supabase.co");
    expect(msg).toContain("npm run db:start");
  });
});
