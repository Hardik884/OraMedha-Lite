"use client";

import { useState } from "react";
import { FileText, ImageIcon, RotateCw, ScanLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatShortDate } from "@/lib/dates";
import { displayName, type FileKind } from "@/lib/files/rules";
import type { UploadItem } from "@/lib/files/queue";
import { previewUrlFor, removeUpload, retryUpload } from "@/lib/files/upload-store";
import type { CaseFile } from "@/lib/data/files";

export function FileKindIcon({ kind, className }: { kind: FileKind; className?: string }) {
  const Icon = kind === "xray" ? ScanLine : kind === "photo" ? ImageIcon : FileText;
  return <Icon className={className} aria-hidden />;
}

/** The square picture of a file: its thumbnail, or its type's icon. */
export function FileThumb({
  src,
  kind,
  mime,
  className,
}: {
  src: string | null;
  kind: FileKind;
  mime?: string;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-border bg-surface-muted", className)}>
      {src && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed Storage links, not optimisable
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-text-secondary">
          <FileKindIcon kind={kind} className="h-7 w-7" />
          {kind === "document" && mime && (
            <span className="text-[11px] font-semibold uppercase tracking-wide">{docBadge(mime)}</span>
          )}
        </div>
      )}
    </div>
  );
}

function docBadge(mime: string): string {
  if (mime === "application/pdf") return "PDF";
  if (mime.includes("powerpoint") || mime.includes("presentation")) return "PPT";
  if (mime.includes("word")) return "DOC";
  return "File";
}

/** A saved file in a grid: picture, name and date. */
export function FileTile({
  file,
  today,
  onOpen,
  size = "md",
}: {
  file: CaseFile;
  today: string;
  onOpen?: () => void;
  size?: "sm" | "md";
}) {
  const Tag = onOpen ? "button" : "div";
  return (
    <Tag
      {...(onOpen ? { type: "button" as const, onClick: onOpen } : {})}
      className={cn(
        "group block w-full min-w-0 rounded-xl text-left",
        onOpen && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
      )}
    >
      <FileThumb
        src={file.thumbUrl}
        kind={file.kind}
        mime={file.mime}
        className="aspect-square w-full transition-transform group-active:scale-[0.98]"
      />
      <p className={cn("mt-1.5 truncate font-medium text-text-primary", size === "sm" ? "text-xs" : "text-sm")}>
        {file.name}
      </p>
      <p className="text-xs tabular-nums text-text-secondary">{formatShortDate(file.date, today)}</p>
    </Tag>
  );
}

const STATUS_TEXT: Record<UploadItem["status"], string> = {
  waiting: "Waiting…",
  preparing: "Getting ready…",
  uploading: "Uploading",
  saving: "Saving…",
  done: "Saved",
  failed: "Didn't upload",
};

/** A file still on its way: local preview, progress, and Retry / Remove if it failed. */
export function UploadTile({ item }: { item: UploadItem }) {
  const failed = item.status === "failed";
  const pct = Math.round(item.progress * 100);
  return (
    <div className="min-w-0">
      <div className="relative">
        <FileThumb
          src={previewUrlFor(item.id)}
          kind={item.kind}
          mime={item.mime}
          className={cn("aspect-square w-full", !failed && item.status !== "done" && "opacity-70")}
        />
        {item.status !== "done" && (
          <div className="absolute inset-x-2 bottom-2 h-1.5 overflow-hidden rounded-full bg-surface/80" aria-hidden>
            <div
              className={cn("h-full rounded-full transition-[width] duration-300", failed ? "bg-warning" : "bg-accent")}
              style={{ width: `${failed ? 100 : Math.max(4, pct)}%` }}
            />
          </div>
        )}
      </div>
      <p className="mt-1.5 truncate text-sm font-medium text-text-primary">
        {displayName({ label: item.label, originalName: item.originalName, kind: item.kind })}
      </p>
      <p
        className={cn("text-xs", failed ? "text-warning" : "text-text-secondary")}
        role={failed ? "alert" : "status"}
        aria-live="polite"
      >
        {failed || item.error
          ? (item.error ?? STATUS_TEXT.failed)
          : item.status === "uploading"
            ? `${STATUS_TEXT.uploading} ${pct}%`
            : STATUS_TEXT[item.status]}
      </p>
      {(failed || item.retryAt) && (
        <div className="mt-1.5 grid gap-1">
          {item.retryable && (
            <Button size="lg" block variant="outline" className="px-2" onClick={() => retryUpload(item.id)} aria-label="Retry upload">
              <RotateCw className="h-3.5 w-3.5" aria-hidden />
              Retry
            </Button>
          )}
          <Button size="lg" block variant="ghost" className="px-2" onClick={() => removeUpload(item.id)} aria-label="Remove upload">
            <X className="h-3.5 w-3.5" aria-hidden />
            Remove
          </Button>
        </div>
      )}
    </div>
  );
}
