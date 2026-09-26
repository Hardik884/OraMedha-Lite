import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database.types";
import { getSupabaseEnv } from "./env";

/**
 * createServerClient
 *
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * Reads and writes the session cookies through Next.js `cookies()`, so every
 * query runs as the logged-in PG and Row Level Security applies.
 *
 * NEVER import this from a 'use client' file.
 */
export async function createServerClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createSupabaseServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component, where cookies are read-only. The
          // session refresh happens in middleware instead (added with login).
        }
      },
    },
  });
}
