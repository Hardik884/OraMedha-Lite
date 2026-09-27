import Link from "next/link";
import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatShortDate } from "@/lib/dates";
import type { TimelineEntry } from "@/lib/cases/timeline";
import type { CaseFile } from "@/lib/data/files";
import { FileThumb } from "@/components/files/FileTiles";

/** Thumbnails shown per timeline entry before "+N". */
const THUMBS_PER_ENTRY = 4;

/**
 * Case history, newest first — built from visits, never typed in. Today's
 * visit has an Edit link, for fixing a mis-tap (e.g. Complete for Partial).
 * Files sit under the visit (stage) they were captured at; tapping one opens
 * it on the Files screen.
 */
export function CaseTimeline({
  items,
  today,
  editHref,
  fileHref,
}: {
  items: TimelineEntry<CaseFile>[];
  today: string;
  editHref?: string;
  fileHref: (fileId: string) => string;
}) {
  return (
    <Card className="px-4 py-2">
      <ol>
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={item.id} className="relative flex gap-3 py-2.5">
              {/* Rail + dot */}
              <div className="relative flex w-3 shrink-0 justify-center" aria-hidden="true">
                {!last && <span className="absolute top-4 -bottom-3 w-px bg-border" />}
                <span
                  className={cn(
                    "relative mt-1.5 h-2.5 w-2.5 rounded-full border-2",
                    i === 0 ? "border-accent bg-accent" : "border-border-strong bg-surface",
                  )}
                />
              </div>
              <div className="w-14 shrink-0 pt-0.5 text-sm tabular-nums text-text-secondary">
                {formatShortDate(item.date, today)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <p
                    className={cn(
                      "min-w-0 text-base leading-snug",
                      item.kind === "visit" ? "font-medium text-text-primary" : "text-text-secondary",
                    )}
                  >
                    {item.title}
                  </p>
                  {item.kind === "visit" && (
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <Badge variant={item.status.variant}>{item.status.label}</Badge>
                      {item.editable && editHref && item.status.label !== "In progress" && (
                        <Link
                          href={editHref}
                          className="-mr-2 flex h-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-accent active:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden />
                          Edit
                        </Link>
                      )}
                    </span>
                  )}
                </div>
                {item.files.length > 0 && <TimelineFiles files={item.files} fileHref={fileHref} />}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function TimelineFiles({ files, fileHref }: { files: CaseFile[]; fileHref: (fileId: string) => string }) {
  const shown = files.slice(0, THUMBS_PER_ENTRY);
  const more = files.length - shown.length;
  return (
    <ul className="mt-2 flex gap-2" aria-label={`${files.length} ${files.length === 1 ? "file" : "files"}`}>
      {shown.map((f, i) => {
        const last = i === shown.length - 1 && more > 0;
        return (
          <li key={f.id}>
            <Link
              href={fileHref(f.id)}
              aria-label={last ? `${f.name} and ${more} more` : f.name}
              className="relative block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              <FileThumb src={f.thumbUrl} kind={f.kind} mime={f.mime} className="h-12 w-12" />
              {last && (
                <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-scrim/55 text-sm font-semibold text-scrim-foreground">
                  +{more}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
