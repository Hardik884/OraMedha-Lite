"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useMemo } from "react";
import type { Database } from "@/types/database.types";
import { getSupabaseEnv } from "./env";

/**
 * createBrowserSupabaseClient
 *
 * Supabase client for Client Components ('use client') only — auth state
 * listeners, direct-to-Storage uploads, realtime. The session lives in cookies
 * shared with the server client, so both see the same logged-in PG.
 *
 * Row Level Security is the security boundary: this client runs with the
 * public anon key and can only ever see the logged-in PG's own rows.
 */
export function createBrowserSupabaseClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient<Database>(url, anonKey);
}

/** A stable browser client for the lifetime of a component. */
export function useBrowserSupabaseClient() {
  return useMemo(() => createBrowserSupabaseClient(), []);
}
