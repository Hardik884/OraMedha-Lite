import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardPen, MessageCircle, Phone, Stethoscope } from "lucide-react";
import { FlowHeader } from "@/components/layout/FlowHeader";
import { BottomActions } from "@/components/layout/BottomActions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CaseSwitcher } from "@/components/cases/CaseSwitcher";
import { CaseDetails } from "@/components/cases/CaseDetails";
import { NextAppointmentCard } from "@/components/cases/NextAppointmentCard";
import { CaseTimeline } from "@/components/cases/CaseTimeline";
import { FilesPreview } from "@/components/files/FilesPreview";
import { getPatient } from "@/lib/data/patients";
import { getCasesForPatient, getCaseVisits } from "@/lib/data/cases";
import { getCaseFiles } from "@/lib/data/files";
import { getStageNames } from "@/lib/data/templates";
import { requirePg } from "@/lib/pg/require";
import { isUuid } from "@/lib/ids";
import { istToday } from "@/lib/dates";
import { attachFiles, buildTimeline } from "@/lib/cases/timeline";
import { formatIndianMobile } from "@/lib/auth/phone";
import { telHref, whatsappHref } from "@/lib/contact/links";
import { backHrefFor, filesPath, newCasePath, schedulePath, visitPath, type BackTo } from "@/lib/navigation/paths";

export const metadata: Metadata = { title: "Patient" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
      {children}
    </section>
  );
}

/**
 * Patient / Case (mockup screen 2): who the patient is, what this case is,
 * where it stands, when they come next, and what happened so far — readable
 * in five seconds. A patient with several cases gets a switcher.
 */
export default async function PatientPage({
  params,
  searchParams,
}: {
  params: Promise<{ patientId: string }>;
  searchParams: Promise<{ case?: string; from?: string }>;
}) {
  await requirePg();
  const { patientId } = await params;
  const { case: caseParam, from: fromParam } = await searchParams;
  if (!isUuid(patientId)) notFound();

  const [patient, cases] = await Promise.all([getPatient(patientId), getCasesForPatient(patientId)]);
  if (!patient) notFound();

  const from: BackTo | undefined = fromParam === "today" || fromParam === "patients" ? fromParam : undefined;
  const selected = cases.find((c) => c.caseId === caseParam) ?? cases[0] ?? null;
  const [visits, files, stageNames] = selected
    ? await Promise.all([
        getCaseVisits(selected.caseId),
        getCaseFiles(selected.caseId),
        getStageNames(selected.caseTypeId, selected.status === "ongoing" ? selected.currentStageName : null),
      ])
    : [[], [], []];
  const today = istToday();

  const meta = [
    patient.age !== null ? `Age ${patient.age}` : null,
    patient.opdNumber ? `OPD ${patient.opdNumber}` : null,
    `+91 ${formatIndianMobile(patient.phone)}`,
  ].filter(Boolean);

  const needsAppointment = selected?.status === "ongoing" && !selected.nextAppointment;
  const updatedToday = visits.some((v) => v.visitDate === today && v.outcome !== null && v.outcome !== undefined);

  return (
    <>
      <FlowHeader backHref={backHrefFor(from)} backLabel={from === "today" ? "Back to Today" : "Back to Patients"} />

      <main className="mx-auto max-w-lg space-y-6 px-4 pt-4 pb-44">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">{patient.fullName}</h1>
          <p className="mt-1 text-sm text-text-secondary tabular-nums">{meta.join(" · ")}</p>
        </div>

        {cases.length === 0 || !selected ? (
          <Card>
            <EmptyState
              icon={<Stethoscope />}
              title="No case yet"
              description="Start a case to track this patient's treatment."
              action={
                <Button asChild size="xl" block>
                  <Link href={newCasePath(patient.id)}>Start a case</Link>
                </Button>
              }
            />
          </Card>
        ) : (
          <>
            <CaseSwitcher cases={cases} selectedId={selected.caseId} patientId={patient.id} from={from} />

            <CaseDetails kase={selected} />

            <NextAppointmentCard
              kase={selected}
              scheduleHref={schedulePath(patient.id, selected.caseId)}
              today={today}
            />

            <Section title="Case timeline">
              <CaseTimeline
                items={attachFiles(buildTimeline(visits, selected.startedOn, today), files)}
                today={today}
                editHref={visitPath(patient.id, selected.caseId)}
                fileHref={(fileId) => filesPath(patient.id, selected.caseId, { fileId })}
              />
            </Section>

            <FilesPreview
              patientId={patient.id}
              caseId={selected.caseId}
              files={files}
              today={today}
              stageNames={stageNames}
            />
          </>
        )}
      </main>

      <BottomActions>
        {selected?.status === "ongoing" && !updatedToday && (
          <Button asChild size="xl" block>
            <Link href={visitPath(patient.id, selected.caseId)}>
              <ClipboardPen className="h-5 w-5" aria-hidden />
              Update today&apos;s visit
            </Link>
          </Button>
        )}
        {selected?.status === "ongoing" && updatedToday && needsAppointment && (
          <Button asChild size="xl" block>
            <Link href={schedulePath(patient.id, selected.caseId)}>Schedule next visit</Link>
          </Button>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="outline" size="lg">
            <a href={telHref(patient.phone)}>
              <Phone className="h-4 w-4 text-accent" aria-hidden />
              Call
            </a>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href={whatsappHref(patient.phone)} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4 text-accent" aria-hidden />
              WhatsApp
            </a>
          </Button>
        </div>
      </BottomActions>
    </>
  );
}
