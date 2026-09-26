import { afterEach, describe, expect, it, vi } from "vitest";
import { getSupabaseEnv } from "./env";

const HOSTED = "https://abcdefghijklmnop.supabase.co";
const LOCAL = "http://127.0.0.1:54321";

describe("getSupabaseEnv", () => {
  afterEach(() => vi.unstubAllEnvs());

  function stub(url: string, localOnly: boolean) {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
    vi.stubEnv("NEXT_PUBLIC_REQUIRE_LOCAL_SUPABASE", localOnly ? "1" : "");
  }

  it("normal mode allows the hosted project", () => {
    stub(HOSTED, false);
    expect(getSupabaseEnv().url).toBe(HOSTED);
  });

  it("local-only mode (npm run dev:local) refuses the hosted project with a clear message", () => {
    stub(HOSTED, true);
    expect(() => getSupabaseEnv()).toThrow(/only works against the LOCAL Supabase stack/);
  });

  it("local-only mode allows the local stack", () => {
    stub(LOCAL, true);
    expect(getSupabaseEnv().url).toBe(LOCAL);
  });

  it("explains missing configuration", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    expect(() => getSupabaseEnv()).toThrow(/Copy .env.example to .env.local/);
  });
});
