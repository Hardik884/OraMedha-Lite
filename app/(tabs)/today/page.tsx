import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { formatDayHeading } from "@/lib/dates";

export const metadata: Metadata = { title: "Today" };

// Rendered per request so the date heading is always today's (India time).
export const dynamic = "force-dynamic";

export default function TodayPage() {
  return (
    <>
      <PageHeader title="Today" subtitle={formatDayHeading(new Date())} />
      <Card>
        <EmptyState
          icon={<CalendarDays />}
          title="No appointments today"
          description="When you add patients and book their visits, today's list will appear here — who is coming, what you are doing, and who is confirmed."
        />
      </Card>
    </>
  );
}
