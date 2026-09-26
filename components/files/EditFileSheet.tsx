"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ChipSelect } from "@/components/ui/chip-select";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FILE_KINDS, type FileKind } from "@/lib/files/rules";
import { MAX_LABEL_LENGTH, labelSuggestions } from "@/lib/files/labels";
import { LabelChips } from "./LabelChips";
import type { CaseFile } from "@/lib/data/files";
import { updateFile } from "@/app/(flow)/patients/file-actions";

/** Rename / relabel a file: its label and its type. */
export function EditFileSheet({
  file,
  stageNames,
  onClose,
  onSaved,
}: {
  file: CaseFile;
  stageNames: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [label, setLabel] = useState(file.label ?? "");
  const [kind, setKind] = useState<FileKind>(file.kind);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const suggestions = useMemo(() => labelSuggestions({ kind, stageNames }), [kind, stageNames]);

  function save(event?: React.FormEvent) {
    event?.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const result = await updateFile({ fileId: file.id, label, kind });
        if (!result.ok) return setError(result.error);
        onSaved();
      } catch {
        setError("Couldn't reach OraMedha. Check your internet and try again.");
      }
    });
  }

  return (
    <Dialog
      open
      onClose={onClose}
      busy={pending}
      title="Rename file"
      footer={
        <Button size="xl" block isLoading={pending} onClick={() => save()}>
          {pending ? "Saving…" : "Save"}
        </Button>
      }
    >
      <form onSubmit={save} method="post" noValidate className="space-y-5 p-4">
        <section className="space-y-2">
          <Label>Type</Label>
          <ChipSelect label="Type" value={kind} onChange={setKind} options={FILE_KINDS.map((k) => ({ value: k.value, label: k.label }))} />
        </section>
        <Field label="Label" htmlFor="edit-file-label" hint="Leave empty to show the type or the file's own name." error={error ?? undefined}>
          <Input
            id="edit-file-label"
            value={label}
            maxLength={MAX_LABEL_LENGTH}
            onChange={(e) => setLabel(e.target.value)}
            hasError={Boolean(error)}
          />
        </Field>
        <LabelChips suggestions={suggestions} value={label} onChange={setLabel} />
      </form>
    </Dialog>
  );
}
