"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Download, ExternalLink, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { formatShortDate } from "@/lib/dates";
import { formatBytes, kindLabel } from "@/lib/files/rules";
import { fileContentPath } from "@/lib/navigation/paths";
import type { CaseFile } from "@/lib/data/files";
import { deleteFile } from "@/app/(flow)/patients/file-actions";
import { EditFileSheet } from "./EditFileSheet";
import { FileKindIcon } from "./FileTiles";
import { ZoomableImage } from "./ZoomableImage";
import { isNavigationSignal } from "@/lib/navigation/signal";

const iconButton =
  "flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-scrim-foreground hover:bg-scrim-foreground/10 active:bg-scrim-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scrim-foreground disabled:opacity-30";

/**
 * One file, full screen. Images: pinch-zoom (the full-size file, loaded
 * through a fresh short-lived link). Documents: open or download. Rename and
 * delete from the top bar; previous / next to go through the case's files.
 */
export function FileViewer({
  files,
  index,
  today,
  stageNames,
  onIndex,
  onClose,
  onChanged,
}: {
  files: CaseFile[];
  index: number;
  today: string;
  stageNames: string[];
  onIndex: (index: number) => void;
  onClose: () => void;
  onChanged: () => void;
}) {
  const file = files[index];
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => setBroken(false), [file?.id]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (editing || confirming) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index > 0) onIndex(index - 1);
      if (e.key === "ArrowRight" && index < files.length - 1) onIndex(index + 1);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [editing, confirming, index, files.length, onClose, onIndex]);

  if (!file) return null;

  function remove() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteFile({ fileId: file!.id });
        if (!result.ok) return setError(result.error);
        setConfirming(false);
        onChanged();
        onClose();
      } catch (error) {
        if (isNavigationSignal(error)) return;
        setError("Couldn't reach OraMedha. Check your internet and try again.");
      }
    });
  }

  const meta = [kindLabel(file.kind), file.stageName, formatShortDate(file.date, today)].filter(Boolean).join(" · ");
  const showImage = file.isImage && !broken;

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-scrim text-scrim-foreground" role="dialog" aria-modal="true" aria-label={file.name}>
      <div className="flex items-center gap-1 px-2 pt-safe">
        <button type="button" className={iconButton} onClick={onClose} aria-label="Close">
          <X className="h-6 w-6" aria-hidden />
        </button>
        <div className="min-w-0 flex-1 py-2">
          <p className="truncate text-base font-semibold">{file.name}</p>
          <p className="truncate text-sm text-scrim-foreground/70">{meta}</p>
        </div>
        <button type="button" className={iconButton} onClick={() => setEditing(true)} aria-label="Rename">
          <Pencil className="h-5 w-5" aria-hidden />
        </button>
        <button type="button" className={iconButton} onClick={() => setConfirming(true)} aria-label="Delete">
          <Trash2 className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        {showImage ? (
          <ZoomableImage key={file.id} src={fileContentPath(file.id)} alt={file.name} onError={() => setBroken(true)} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
            <FileKindIcon kind={file.kind} className="h-16 w-16 text-scrim-foreground/80" />
            <div>
              <p className="text-base font-medium">{file.originalName ?? file.name}</p>
              <p className="text-sm text-scrim-foreground/70">{formatBytes(file.sizeBytes)}</p>
              {file.isImage && (
                <p className="mt-2 text-sm text-scrim-foreground/70">This phone can&apos;t show this photo here. Open it instead.</p>
              )}
            </div>
            <div className="flex w-full max-w-xs flex-col gap-2">
              <Button asChild size="xl" block>
                <a href={fileContentPath(file.id)} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-5 w-5" aria-hidden />
                  Open
                </a>
              </Button>
              <Button asChild size="lg" variant="ghost" block className="text-scrim-foreground hover:bg-scrim-foreground/10 active:bg-scrim-foreground/20">
                <a href={fileContentPath(file.id, { download: true })}>
                  <Download className="h-4 w-4" aria-hidden />
                  Download
                </a>
              </Button>
            </div>
          </div>
        )}
      </div>

      {files.length > 1 && (
        <div className="flex items-center justify-between px-2 pb-safe">
          <button type="button" className={iconButton} disabled={index === 0} onClick={() => onIndex(index - 1)} aria-label="Previous file">
            <ChevronLeft className="h-6 w-6" aria-hidden />
          </button>
          <span className="text-sm tabular-nums text-scrim-foreground/70">
            {index + 1} of {files.length}
          </span>
          <button
            type="button"
            className={iconButton}
            disabled={index === files.length - 1}
            onClick={() => onIndex(index + 1)}
            aria-label="Next file"
          >
            <ChevronRight className="h-6 w-6" aria-hidden />
          </button>
        </div>
      )}

      {editing && (
        <EditFileSheet
          file={file}
          stageNames={stageNames}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            onChanged();
          }}
        />
      )}

      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        busy={pending}
        title="Delete this file?"
        description="It's removed from this case."
        size="sm"
        footer={
          <div className="grid grid-cols-2 gap-2">
            <Button size="lg" variant="secondary" disabled={pending} onClick={() => setConfirming(false)}>
              Keep
            </Button>
            <Button size="lg" variant="danger" isLoading={pending} onClick={remove}>
              Delete
            </Button>
          </div>
        }
      >
        {error ? (
          <p className="p-4 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
      </Dialog>
    </div>,
    document.body,
  );
}
