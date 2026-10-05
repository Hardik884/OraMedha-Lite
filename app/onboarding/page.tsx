import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/layout/AuthShell";
import { getCurrentPg } from "@/lib/pg/current";
import { createServerClient } from "@/lib/supabase/server";
import { LOGIN_PATH, safeNextPath } from "@/lib/auth/routes";
import { OnboardingForm } from "./OnboardingForm";
import { APP_NAME } from "@/lib/brand/name";

export const metadata: Metadata = { title: "Welcome" };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNextPath((await searchParams).next);
  const current = await getCurrentPg();
  if (current.state === "signed-out") redirect(LOGIN_PATH);
  if (current.state === "ready") redirect(next);

  // Specialties come from the procedure templates — nothing is hard-coded.
  const supabase = await createServerClient();
  const { data: specialties, error } = await supabase
    .from("specialty")
    .select("id, name")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw new Error(`Could not load specialties: ${error.code}`);

  return (
    <AuthShell title={`Welcome to ${APP_NAME}`} subtitle="Three quick things, once.">
      <OnboardingForm specialties={specialties ?? []} suggestedName={current.suggestedName} next={next} />
    </AuthShell>
  );
}
