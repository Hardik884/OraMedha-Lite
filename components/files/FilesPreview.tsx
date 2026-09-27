"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { filesPath } from "@/lib/navigation/paths";
import type { CaseFile } from "@/lib/data/files";
import { AddFile } from "./AddFile";
import { FileTile, UploadTile } from "./FileTiles";
import { useCaseUploads } from "./useCaseUploads";

const PREVIEW_COUNT = 3;

/**
 * The Files section of the Patient / Case screen: the latest three files,
 * "View all", any uploads still on their way, and one-tap Add.
 */
export function FilesPreview({
  patientId,
  caseId,
  files,
  today,
  stageNames,
}: {
  patientId: string;
  caseId: string;
  files: CaseFile[];
  today: string;
  stageNames: string[];
}) {
  const router = useRouter();
  const uploads = useCaseUploads(caseId, files.map((f) => f.id));
  const latest = files.slice(0, PREVIEW_COUNT);

  return (
    <section className="space-y-2.5" aria-labelledby="files-heading">
      <div className="flex items-center justify-between">
        <h2 id="files-heading" className="text-sm font-semibold text-text-primary">
          Files{files.length > 0 && <span className="font-normal text-text-secondary"> ({files.length})</span>}
        </h2>
        {files.length > 0 && (
          <Link
            href={filesPath(patientId, caseId)}
            className="-mr-2 flex h-11 items-center gap-0.5 rounded-lg px-2 text-sm font-medium text-accent active:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            View all
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </div>
      <Card className="space-y-4 p-4">
        {uploads.length + latest.length > 0 ? (
          <ul className="grid grid-cols-3 gap-x-3 gap-y-4">
            {uploads.map((u) => (
              <li key={u.id}>
                <UploadTile item={u} />
              </li>
            ))}
            {latest.map((f) => (
              <li key={f.id}>
                <FileTile
                  file={f}
                  today={today}
                  onOpen={() => router.push(filesPath(patientId, caseId, { fileId: f.id }))}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-text-secondary">X-rays, photos and documents for this case are kept here.</p>
        )}
        <AddFile target={{ caseId, patientId, stageNames }} />
      </Card>
    </section>
  );
}
