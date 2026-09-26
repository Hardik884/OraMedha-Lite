import type { Metadata } from "next";
import { SlidersHorizontal } from "lucide-react";
import { FlowHeader } from "@/components/layout/FlowHeader";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requirePg } from "@/lib/pg/require";
import { getModifierDefaults } from "@/lib/data/settings";
import { ModifierRules } from "./ModifierRules";

export const metadata: Metadata = { title: "Modifier rules" };

export default async function ModifiersPage() {
  const pg = await requirePg();
  const modifiers = await getModifierDefaults(pg.specialty.id);
  return (
    <>
      <FlowHeader backHref="/settings" backLabel="Back to Settings" title="Modifier rules" subtitle={pg.specialty.name} />
      {modifiers.length === 0 ? (
        <main className="mx-auto max-w-lg px-4 pt-5">
          <Card>
            <EmptyState
              icon={<SlidersHorizontal />}
              title="No modifier rules yet"
              description="Your specialty's templates don't have any notes that change the next visit."
            />
          </Card>
        </main>
      ) : (
        <ModifierRules modifiers={modifiers} />
      )}
    </>
  );
}
