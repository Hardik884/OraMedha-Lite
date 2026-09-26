"use client";

import Link from "next/link";
import { AlertTriangle, CircleCheck, Paperclip } from "lucide-react";
import { summarizeUploads } from "@/lib/files/queue";
import { filesPath } from "@/lib/navigation/paths";
import { useCaseUploads } from "./useCaseUploads";

const files = (n: number) => (n === 1 ? "1 file" : `${n} files`);

/**
 * The Files line on Visit Updated: files saved with this visit, and any
 * still uploading (they carry on in the background) or needing a retry.
 */
export function VisitFilesRow({
  patientId,
  caseId,
  visitId,
  savedIds,
  stageName,
}: {
  patientId: string;
  caseId: string;
  visitId: string;
  savedIds: string[];
  stageName: string | null;
}) {
  const uploads = useCaseUploads(caseId, savedIds, { filter: (u) => u.visitId === visitId });
  const summary = summarizeUploads(uploads);
  const saved = savedIds.length + uploads.filter((u) => u.status === "done").length;
  if (saved === 0 && summary.active === 0 && summary.failed === 0) return null;

  const title =
    summary.active > 0
      ? `Uploading ${files(summary.active)} · ${Math.round(summary.progress * 100)}%`
      : summary.failed > 0
        ? `${files(summary.failed)} didn't upload`
        : `${files(saved)} kept with this visit`;
  const detail =
    summary.active > 0
      ? "You can carry on. They're filed with this visit when done."
      : summary.failed > 0
        ? "Open the files to retry."
        : (stageName ?? undefined);

  return (
    <li className="flex items-start gap-3 px-4 py-3.5">
      <span
        className={
          summary.failed > 0 && summary.active === 0
            ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning-bg text-warning"
            : "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent"
        }
      >
        {summary.failed > 0 && summary.active === 0 ? (
          <AlertTriangle className="h-5 w-5" aria-hidden />
        ) : (
          <Paperclip className="h-5 w-5" aria-hidden />
        )}
      </span>
      <span className="min-w-0 flex-1" role="status" aria-live="polite">
        <span className="block text-base font-medium text-text-primary">{title}</span>
        {detail && <span className="block text-sm text-text-secondary">{detail}</span>}
        {summary.failed > 0 && summary.active === 0 && (
          <Link href={filesPath(patientId, caseId)} className="mt-1 inline-block text-sm font-medium text-accent underline-offset-4 hover:underline">
            Open files
          </Link>
        )}
      </span>
      {summary.active === 0 && summary.failed === 0 && (
        <CircleCheck className="mt-2 h-5 w-5 shrink-0 text-success" aria-label="Done" />
      )}
    </li>
  );
}
