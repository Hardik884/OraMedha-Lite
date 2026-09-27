import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/types/database.types";
import { ANON, noSession, signedInUser, URL } from "./helpers";

/**
 * Sign-in on the local stack mirrors the hosted set-up: PGs use Google, phone
 * sign-in is off. Email + password exists only here, for test PGs.
 */
describe("sign-in methods (local stack)", () => {
  it("refuses phone sign-in", async () => {
    const client = createClient<Database>(URL, ANON, noSession);
    const { error } = await client.auth.signInWithOtp({ phone: "+919876543210" });
    expect(error).not.toBeNull();
  });

  it("signs a test PG in with email and password", async () => {
    const pg = await signedInUser("auth");
    const { data } = await pg.client.auth.getUser();
    expect(data.user?.id).toBe(pg.id);
    expect(data.user?.email).toMatch(/@oramedha\.test$/);
  });
});
