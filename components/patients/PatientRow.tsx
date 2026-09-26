import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PatientAvatar } from "@/components/shared/PatientAvatar";
import { formatIndianMobile } from "@/lib/auth/phone";
import { patientPath } from "@/lib/navigation/paths";
import type { PatientListItem } from "@/lib/data/patients";

export function PatientRow({ patient }: { patient: PatientListItem }) {
  const detail = [
    formatIndianMobile(patient.phone),
    patient.opdNumber ? `OPD ${patient.opdNumber}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li>
      <Link
        href={patientPath(patient.id, { from: "patients" })}
        className="flex items-center gap-3 px-4 py-3 active:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
      >
        <PatientAvatar name={patient.fullName} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-semibold text-text-primary">{patient.fullName}</span>
          <span className="block truncate text-sm tabular-nums text-text-secondary">{detail}</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-text-disabled" aria-hidden />
      </Link>
    </li>
  );
}
