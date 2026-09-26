import type { Metadata } from "next";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Patients" };

export default function PatientsPage() {
  return (
    <>
      <PageHeader title="Patients" subtitle="Everyone you are treating" />
      <Card>
        <EmptyState
          icon={<Users />}
          title="No patients yet"
          description="Patients you add will be listed here, searchable by name, phone or OPD number."
        />
      </Card>
    </>
  );
}
