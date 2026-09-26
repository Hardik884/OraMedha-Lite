"use client";

import type { CaseFile } from "@/lib/data/files";
import { AddFile, type AddFileTarget } from "./AddFile";
import { FileTile, UploadTile } from "./FileTiles";
import { useCaseUploads } from "./useCaseUploads";

/**
 * "Files from today" inside Update Visit: add X-rays, photos or documents
 * while recording the visit. They upload in the background and are filed
 * under this visit and its stage once the visit is saved.
 */
export function VisitFiles({
  target,
  visitId,
  savedFiles,
  today,
}: {
  target: AddFileTarget;
  /** The visit these files belong to, once known (null before the first file). */
  visitId: string | null;
  /** Files already filed under today's visit (when editing it). */
  savedFiles: CaseFile[];
  today: string;
}) {
  const uploads = useCaseUploads(
    target.caseId,
    savedFiles.map((f) => f.id),
    { refresh: false, filter: (u) => visitId !== null && u.visitId === visitId },
  );

  return (
    <section className="space-y-2.5">
      <h2 className="text-base font-semibold text-text-primary">Files from today (optional)</h2>
      {uploads.length + savedFiles.length > 0 && (
        <ul className="grid grid-cols-3 gap-x-3 gap-y-4">
          {uploads.map((u) => (
            <li key={u.id}>
              <UploadTile item={u} />
            </li>
          ))}
          {savedFiles.map((f) => (
            <li key={f.id}>
              <FileTile file={f} today={today} />
            </li>
          ))}
        </ul>
      )}
      <AddFile target={target} />
      <p className="text-xs text-text-secondary">
        Files upload while you carry on, and stay with this visit.
      </p>
    </section>
  );
}
