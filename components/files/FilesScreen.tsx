"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderOpen } from "lucide-react";
import { FlowHeader } from "@/components/layout/FlowHeader";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedTabs } from "@/components/shared/SegmentedTabs";
import { FILE_KINDS, type FileKind } from "@/lib/files/rules";
import type { CaseFile } from "@/lib/data/files";
import { AddFile } from "./AddFile";
import { FileTile, UploadTile } from "./FileTiles";
import { FileViewer } from "./FileViewer";
import { useCaseUploads } from "./useCaseUploads";

type Filter = "all" | FileKind;

/**
 * Files within a case (mockup screen 8): All / X-rays / Photos / Documents,
 * thumbnails with label and date, newest first. Tap one to view it full
 * screen, rename or delete it. Uploads still on their way show first.
 */
export function FilesScreen({
  patientId,
  caseId,
  title,
  subtitle,
  backHref,
  files,
  today,
  stageNames,
  initialFileId,
}: {
  patientId: string;
  caseId: string;
  title: string;
  subtitle: string;
  backHref: string;
  files: CaseFile[];
  today: string;
  stageNames: string[];
  initialFileId: string | null;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(
    initialFileId && files.some((f) => f.id === initialFileId) ? initialFileId : null,
  );
  const uploads = useCaseUploads(caseId, files.map((f) => f.id));

  const shown = filter === "all" ? files : files.filter((f) => f.kind === filter);
  const shownUploads = filter === "all" ? uploads : uploads.filter((u) => u.kind === filter);
  const openIndex = openId ? shown.findIndex((f) => f.id === openId) : -1;
  const refresh = useCallback(() => router.refresh(), [router]);

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    ...FILE_KINDS.map((k) => ({ key: k.value, label: k.plural })),
  ];

  return (
    <>
      <FlowHeader
        backHref={backHref}
        backLabel="Back to patient"
        title={title}
        subtitle={subtitle}
        right={<AddFile variant="header" target={{ caseId, patientId, stageNames }} />}
      />
      <main className="mx-auto max-w-lg space-y-4 px-4 pt-4 pb-16">
        <SegmentedTabs
          tabs={tabs}
          value={filter}
          onChange={(key) => setFilter(key as Filter)}
          equalWidth={false}
        />

        {shown.length === 0 && shownUploads.length === 0 ? (
          <Card>
            <EmptyState
              icon={<FolderOpen />}
              title={filter === "all" ? "No files yet" : `No ${tabs.find((t) => t.key === filter)!.label.toLowerCase()} yet`}
              description="Take a photo, pick from the gallery, or upload a document. It stays with this case."
              action={<AddFile target={{ caseId, patientId, stageNames }} className="w-full" />}
            />
          </Card>
        ) : (
          <ul className="grid grid-cols-3 gap-x-3 gap-y-4">
            {shownUploads.map((u) => (
              <li key={u.id}>
                <UploadTile item={u} />
              </li>
            ))}
            {shown.map((f) => (
              <li key={f.id}>
                <FileTile file={f} today={today} onOpen={() => setOpenId(f.id)} />
              </li>
            ))}
          </ul>
        )}
      </main>

      {openIndex !== -1 && (
        <FileViewer
          files={shown}
          index={openIndex}
          today={today}
          stageNames={stageNames}
          onIndex={(i) => setOpenId(shown[i]?.id ?? null)}
          onClose={() => setOpenId(null)}
          onChanged={refresh}
        />
      )}
    </>
  );
}
