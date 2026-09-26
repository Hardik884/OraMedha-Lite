import type { Metadata } from "next";
import { ChartColumnIncreasing } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Progress" };

export default function ProgressPage() {
  return (
    <>
      <PageHeader title="Progress" subtitle="Your cases and logbook" />
      <Card>
        <EmptyState
          icon={<ChartColumnIncreasing />}
          title="Nothing to count yet"
          description="Your completed cases and logbook fill in automatically from the visits you update. Nothing to type in."
        />
      </Card>
    </>
  );
}
