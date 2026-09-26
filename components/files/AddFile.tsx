"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Camera, FileText, Images, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChipSelect } from "@/components/ui/chip-select";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  ACCEPT_DOCUMENTS,
  ACCEPT_IMAGES,
  FILE_KINDS,
  MAX_FILES_PER_PICK,
  checkFile,
  defaultKind,
  formatBytes,
  type FileKind,
} from "@/lib/files/rules";
import { MAX_LABEL_LENGTH, labelSuggestions, normaliseLabel } from "@/lib/files/labels";
import { LabelChips } from "./LabelChips";
import { addUploads } from "@/lib/files/upload-store";
import { FileThumb } from "./FileTiles";

type Source = "camera" | "gallery" | "document";

type Picked = {
  source: Source;
  ok: { file: File; mime: string; previewUrl: string | null }[];
  rejected: string[];
};

export type AddFileTarget = {
  caseId: string;
  patientId: string;
  /** Update Visit: the visit the files belong to (made on the phone if not saved yet). */
  visitId?: () => string | null;
  /** From the case's template, offered as one-tap labels. */
  stageNames: string[];
};

const SOURCES: { source: Source; label: string; hint: string; Icon: typeof Camera }[] = [
  { source: "camera", label: "Take a photo", hint: "Opens the camera", Icon: Camera },
  { source: "gallery", label: "Choose photos", hint: "Pick one or several", Icon: Images },
  { source: "document", label: "Upload a document", hint: "PDF, PowerPoint or Word", Icon: FileText },
];

/**
 * "Add file". Two looks:
 *  - `buttons`: Camera · Gallery · Document in a row — one tap to the camera
 *    (Patient screen, Update Visit)
 *  - `header`: a compact "+ Add" that asks which (Files screen)
 * After picking, a short sheet sets the type and an optional label, then the
 * files upload in the background.
 */
export function AddFile({
  target,
  variant = "buttons",
  className,
}: {
  target: AddFileTarget;
  variant?: "buttons" | "header";
  className?: string;
}) {
  const inputs = useRef<Record<Source, HTMLInputElement | null>>({ camera: null, gallery: null, document: null });
  const [choosing, setChoosing] = useState(false);
  const [picked, setPicked] = useState<Picked | null>(null);

  function open(source: Source) {
    setChoosing(false);
    const input = inputs.current[source];
    if (!input) return;
    input.value = "";
    input.click();
  }

  function onChange(source: Source, list: FileList | null) {
    const files = Array.from(list ?? []);
    if (files.length === 0) return;
    const rejected: string[] = [];
    if (files.length > MAX_FILES_PER_PICK) {
      rejected.push(`Only the first ${MAX_FILES_PER_PICK} files were taken. Add the rest in another go.`);
    }
    const ok: Picked["ok"] = [];
    for (const file of files.slice(0, MAX_FILES_PER_PICK)) {
      const check = checkFile(file);
      if (!check.ok) rejected.push(check.reason);
      else ok.push({ file, mime: check.mime, previewUrl: check.isImage ? URL.createObjectURL(file) : null });
    }
    setPicked({ source, ok, rejected });
  }

  return (
    <>
      {variant === "buttons" ? (
        <div className={cn("grid grid-cols-3 gap-2", className)}>
          {SOURCES.map(({ source, Icon }) => (
            <Button key={source} variant="outline" size="lg" className="h-14 flex-col gap-0.5 px-2" onClick={() => open(source)}>
              <Icon className="h-5 w-5 text-accent" aria-hidden />
              <span className="text-xs">{source === "camera" ? "Camera" : source === "gallery" ? "Gallery" : "Document"}</span>
            </Button>
          ))}
        </div>
      ) : (
        <Button variant="ghost" size="lg" className={cn("text-accent", className)} onClick={() => setChoosing(true)}>
          <Plus className="h-5 w-5" aria-hidden />
          Add
        </Button>
      )}

      {/* The phone's own pickers. */}
      <input
        ref={(el) => {
          inputs.current.camera = el;
        }}
        type="file"
        accept={ACCEPT_IMAGES}
        capture="environment"
        className="hidden"
        onChange={(e) => onChange("camera", e.target.files)}
      />
      <input
        ref={(el) => {
          inputs.current.gallery = el;
        }}
        type="file"
        accept={ACCEPT_IMAGES}
        multiple
        className="hidden"
        onChange={(e) => onChange("gallery", e.target.files)}
      />
      <input
        ref={(el) => {
          inputs.current.document = el;
        }}
        type="file"
        accept={ACCEPT_DOCUMENTS}
        multiple
        className="hidden"
        onChange={(e) => onChange("document", e.target.files)}
      />

      <Dialog open={choosing} onClose={() => setChoosing(false)} title="Add a file" size="sm">
        <ul className="p-2">
          {SOURCES.map(({ source, label, hint, Icon }) => (
            <li key={source}>
              <button
                type="button"
                onClick={() => open(source)}
                className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-surface-muted active:bg-surface-pressed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span>
                  <span className="block text-base font-medium text-text-primary">{label}</span>
                  <span className="block text-sm text-text-secondary">{hint}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Dialog>

      {picked && <DetailsSheet picked={picked} target={target} onClose={() => setPicked(null)} />}
    </>
  );
}

function DetailsSheet({ picked, target, onClose }: { picked: Picked; target: AddFileTarget; onClose: () => void }) {
  const firstMime = picked.ok[0]?.mime ?? "";
  const [kind, setKind] = useState<FileKind>(defaultKind(firstMime, picked.source === "document" ? "document" : "photo"));
  const [label, setLabel] = useState("");
  const suggestions = useMemo(() => labelSuggestions({ kind, stageNames: target.stageNames }), [kind, target.stageNames]);

  // Local previews are only needed while this sheet is open.
  useEffect(() => {
    return () => {
      for (const p of picked.ok) if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
    };
  }, [picked]);

  const count = picked.ok.length;
  const noun = kind === "xray" ? (count === 1 ? "X-ray" : "X-rays") : kind === "photo" ? (count === 1 ? "photo" : "photos") : count === 1 ? "document" : "documents";

  function upload() {
    const visitId = target.visitId?.() ?? null;
    addUploads(
      picked.ok.map((p) => ({
        file: p.file,
        mime: p.mime,
        kind,
        label: normaliseLabel(label),
        caseId: target.caseId,
        patientId: target.patientId,
        visitId,
      })),
    );
    onClose();
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={count === 0 ? "Nothing to add" : count === 1 ? `Add ${kind === "xray" ? "an" : "a"} ${noun}` : `Add ${count} ${noun}`}
      footer={
        count > 0 ? (
          <Button size="xl" block onClick={upload}>
            Upload
          </Button>
        ) : (
          <Button size="xl" block variant="secondary" onClick={onClose}>
            Close
          </Button>
        )
      }
    >
      <div className="space-y-5 p-4">
        {count > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {picked.ok.map((p, i) => (
              <div key={i} className="w-20 shrink-0">
                <FileThumb src={p.previewUrl} kind={p.previewUrl ? "photo" : "document"} mime={p.mime} className="aspect-square w-20" />
                {!p.previewUrl && (
                  <p className="mt-1 truncate text-xs text-text-secondary">
                    {p.file.name} · {formatBytes(p.file.size)}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {picked.rejected.length > 0 && (
          <div className="rounded-[10px] border border-warning-border bg-warning-bg px-3.5 py-3 text-sm text-warning" role="alert">
            <p className="flex items-center gap-2 font-medium">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
              {picked.rejected.length === 1 ? "One file can't be added" : "Some files can't be added"}
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-9">
              {picked.rejected.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {count > 0 && (
          <>
            <section className="space-y-2">
              <Label>Type</Label>
              <ChipSelect
                label="Type"
                value={kind}
                onChange={setKind}
                options={FILE_KINDS.map((k) => ({ value: k.value, label: k.label }))}
              />
            </section>

            <section className="space-y-2">
              <Label htmlFor="file-label">Label (optional)</Label>
              <LabelChips suggestions={suggestions} value={label} onChange={setLabel} />
              <Input
                id="file-label"
                value={label}
                maxLength={MAX_LABEL_LENGTH}
                placeholder="Or type a label"
                onChange={(e) => setLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    upload();
                  }
                }}
              />
              {count > 1 && <p className="text-xs text-text-secondary">The label is used for all {count} files.</p>}
            </section>
          </>
        )}
      </div>
    </Dialog>
  );
}
