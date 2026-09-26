import type { Metadata } from "next";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomActions } from "@/components/layout/BottomActions";
import { Button } from "@/components/ui/button";
import { PatientList } from "@/components/patients/PatientList";
import { listPatients } from "@/lib/data/patients";
import { NEW_PATIENT_PATH } from "@/lib/navigation/paths";

export const metadata: Metadata = { title: "Patients" };

export default async function PatientsPage() {
  const patients = await listPatients();

  return (
    <div className="pb-nav-action">
      <PageHeader title="Patients" subtitle="Everyone you are treating" />
      <PatientList patients={patients} />

      <BottomActions aboveNav>
        <Button asChild size="xl" block className="shadow-md">
          <Link href={`${NEW_PATIENT_PATH}?from=patients`}>
            <UserPlus className="h-5 w-5" aria-hidden />
            New Patient
          </Link>
        </Button>
      </BottomActions>
    </div>
  );
}
