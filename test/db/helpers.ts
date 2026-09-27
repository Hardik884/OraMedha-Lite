import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import type { Database } from "@/types/database.types";

export const URL = process.env.TEST_SUPABASE_URL!;
export const ANON = process.env.TEST_SUPABASE_ANON_KEY!;
const SERVICE = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY!;

export type Client = SupabaseClient<Database>;

export const noSession = { auth: { persistSession: false, autoRefreshToken: false } };

/** A throwaway signed-in user on the LOCAL stack. */
export async function signedInUser(label: string): Promise<{ client: Client; id: string }> {
  const admin = createClient<Database>(URL, SERVICE, noSession);
  const email = `db-${label}-${randomUUID()}@oramedha.test`;
  const password = `pw-${randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("createUser failed");

  const client = createClient<Database>(URL, ANON, noSession);
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  return { client, id: data.user.id };
}

/** A signed-in, onboarded PG. */
export async function onboardedPg(label: string, specialtyId: string) {
  const pg = await signedInUser(label);
  const profile = await pg.client.from("pg_profile").insert({
    id: pg.id,
    full_name: "Test PG",
    college: "Test College",
    specialty_id: specialtyId,
  });
  if (profile.error) throw profile.error;
  const prefs = await pg.client.from("pg_preferences").insert({});
  if (prefs.error) throw prefs.error;
  return pg;
}

export type TemplateCaseType = {
  id: string;
  code: string;
  specialtyId: string;
  toothRequired: boolean;
  stageIds: string[];
};

/** All case types with their stage ids in order, keyed by case-type code. */
export async function loadTemplates(client: Client): Promise<Record<string, TemplateCaseType>> {
  const { data, error } = await client
    .from("case_type")
    .select("id, code, specialty_id, tooth_required, stage!stage_case_type_id_fkey (id, sort_order)");
  if (error) throw error;
  return Object.fromEntries(
    data.map((ct) => [
      ct.code,
      {
        id: ct.id,
        code: ct.code,
        specialtyId: ct.specialty_id,
        toothRequired: ct.tooth_required,
        stageIds: [...ct.stage].sort((a, b) => a.sort_order - b.sort_order).map((s) => s.id),
      },
    ]),
  );
}
