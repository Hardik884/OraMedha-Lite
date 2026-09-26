"use client";

import { useRef, useState, useTransition } from "react";
import { FlowHeader } from "@/components/layout/FlowHeader";
import { BottomActions } from "@/components/layout/BottomActions";
import { Button } from "@/components/ui/button";
import { ChoiceList } from "@/components/ui/choice-list";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { newId } from "@/lib/ids";
import { SamePhoneHint } from "@/components/patients/SamePhoneHint";
import { formatDuration } from "@/lib/scheduling/defaults";
import {
  validateNewCase,
  validateNewPatient,
  type FieldErrors,
  type NewPatientFields,
} from "@/lib/patients/validate";
import type { CaseTypeOption } from "@/lib/data/templates";
import { addCaseToPatient, createPatientWithCase, type ActionResult } from "@/app/(flow)/patients/actions";

type Mode = { kind: "new-patient" } | { kind: "existing-patient"; patientId: string; patientName: string };

const EMPTY: NewPatientFields = { fullName: "", phone: "", age: "", opdNumber: "", tooth: "", caseTypeId: "" };

/**
 * New Patient (mockup screens 6 → 7), and "add another case" for an existing
 * patient, which is the same flow without the patient's details.
 *
 * Step 1 — details: only name, phone, tooth and case type are required.
 * Step 2 — "What are you doing today?": the chosen case type's stages, from
 *   the template. Tapping one saves everything (patient, case, today's visit)
 *   in a single call and moves on to scheduling.
 *
 * Nothing is saved until step 2, so backing out of step 1 leaves no trace.
 */
export function NewCaseFlow({
  mode,
  caseTypes,
  backHref,
}: {
  mode: Mode;
  caseTypes: CaseTypeOption[];
  backHref: string;
}) {
  const isNewPatient = mode.kind === "new-patient";
  const [step, setStep] = useState<"details" | "stage">("details");
  const [fields, setFields] = useState<NewPatientFields>({
    ...EMPTY,
    // One case type? Pre-select it — one less tap.
    caseTypeId: caseTypes.length === 1 ? caseTypes[0]!.id : "",
  });
  const [errors, setErrors] = useState<FieldErrors<keyof NewPatientFields>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [savingStageId, setSavingStageId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Ids are made once, on the first save attempt, and reused on every retry.
  const ids = useRef<{ patientId: string; caseId: string } | null>(null);

  const caseType = caseTypes.find((ct) => ct.id === fields.caseTypeId) ?? null;
  const toothRequired = caseType?.toothRequired ?? true;

  function set<K extends keyof NewPatientFields>(key: K, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function goToStages(event: React.FormEvent) {
    event.preventDefault();
    const result = isNewPatient
      ? validateNewPatient(fields, toothRequired)
      : validateNewCase(fields, toothRequired);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setFormError(null);
    setStep("stage");
    window.scrollTo({ top: 0 });
  }

  function save(stageId: string) {
    if (pending) return;
    ids.current ??= {
      patientId: isNewPatient ? newId() : mode.patientId,
      caseId: newId(),
    };
    const { patientId, caseId } = ids.current;
    setSavingStageId(stageId);
    setFormError(null);

    startTransition(async () => {
      let result: ActionResult<keyof NewPatientFields> | undefined;
      try {
        result = isNewPatient
          ? await createPatientWithCase({ patientId, caseId, stageId, fields })
          : await addCaseToPatient({ patientId, caseId, stageId, fields });
      } catch {
        // Network dropped. The same ids are reused on the next tap.
        result = { formError: "Couldn't reach OraMedha. Check your internet and tap again." };
      }
      // Success redirects to scheduling; we only get here on a problem.
      setSavingStageId(null);
      if (result?.errors && Object.keys(result.errors).length > 0) {
        setErrors(result.errors);
        setStep("details");
      } else if (result?.formError) {
        setFormError(result.formError);
      }
    });
  }

  // ── Step 2: what are you doing today? ─────────────────────────────────────
  if (step === "stage" && caseType) {
    const who = isNewPatient ? fields.fullName.trim() : mode.patientName;
    const tooth = validateNewCase(fields, toothRequired);
    const toothLabel = tooth.ok ? tooth.value.tooth : null;
    return (
      <>
        <FlowHeader
          onBack={() => setStep("details")}
          title={toothLabel ? `${who} · ${toothLabel}` : who}
          subtitle={caseType.name}
        />
        <main className="mx-auto max-w-lg px-4 pt-5 pb-10">
          <h1 className="mb-1 text-xl font-semibold tracking-tight text-text-primary">
            What are you doing today?
          </h1>
          <p className="mb-5 text-sm text-text-secondary">Tap the stage. You&apos;ll book the next visit after.</p>

          <ChoiceList
            label="What are you doing today?"
            value={savingStageId}
            onChange={save}
            options={caseType.stages.map((s) => ({
              value: s.id,
              label: s.name,
              description:
                savingStageId === s.id ? "Saving…" : `Usually ${formatDuration(s.durationMin)}`,
              disabled: pending && savingStageId !== s.id,
            }))}
          />

          {formError && (
            <p
              className="mt-4 rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-3 text-sm text-danger"
              role="alert"
            >
              {formError}
            </p>
          )}
        </main>
      </>
    );
  }

  // ── Step 1: details ───────────────────────────────────────────────────────
  return (
    <>
      <FlowHeader
        backHref={backHref}
        title={isNewPatient ? "New patient" : "New case"}
        subtitle={isNewPatient ? undefined : mode.patientName}
      />
      <form onSubmit={goToStages} method="post" noValidate className="mx-auto max-w-lg space-y-5 px-4 pt-5 pb-32">
        {isNewPatient && (
          <>
            <Field label="Name" htmlFor="fullName" required error={errors.fullName}>
              <Input
                id="fullName"
                autoComplete="off"
                autoCapitalize="words"
                enterKeyHint="next"
                value={fields.fullName}
                onChange={(e) => set("fullName", e.target.value)}
                hasError={Boolean(errors.fullName)}
                autoFocus
              />
            </Field>

            <Field label="Phone number" htmlFor="phone" required error={errors.phone}>
              <div className="flex gap-2">
                <span
                  className="flex h-11 shrink-0 items-center rounded-[10px] border border-border bg-surface-muted px-3.5 text-base text-text-body"
                  aria-hidden="true"
                >
                  +91
                </span>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="off"
                  enterKeyHint="next"
                  placeholder="98765 43210"
                  value={fields.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  hasError={Boolean(errors.phone)}
                />
              </div>
            </Field>
            <SamePhoneHint phone={fields.phone} />

            <div className="grid grid-cols-2 gap-3">
              <Field label="Age" htmlFor="age" error={errors.age}>
                <Input
                  id="age"
                  inputMode="numeric"
                  enterKeyHint="next"
                  placeholder="Optional"
                  value={fields.age}
                  onChange={(e) => set("age", e.target.value)}
                  hasError={Boolean(errors.age)}
                />
              </Field>
              <Field label="OPD number" htmlFor="opdNumber" error={errors.opdNumber}>
                <Input
                  id="opdNumber"
                  autoCapitalize="characters"
                  enterKeyHint="next"
                  placeholder="Optional"
                  value={fields.opdNumber}
                  onChange={(e) => set("opdNumber", e.target.value)}
                  hasError={Boolean(errors.opdNumber)}
                />
              </Field>
            </div>
          </>
        )}

        <Field
          label={toothRequired ? "Tooth number" : "Tooth number (optional)"}
          htmlFor="tooth"
          required={toothRequired}
          error={errors.tooth}
          hint={errors.tooth ? undefined : "FDI, e.g. 36. Several: 11, 21"}
        >
          <Input
            id="tooth"
            inputMode="decimal"
            enterKeyHint="done"
            placeholder="e.g. 36"
            value={fields.tooth}
            onChange={(e) => set("tooth", e.target.value)}
            hasError={Boolean(errors.tooth)}
            autoFocus={!isNewPatient}
          />
        </Field>

        <div className="space-y-2">
          <Label required>Case type</Label>
          <ChoiceList
            label="Case type"
            value={fields.caseTypeId || null}
            onChange={(id) => set("caseTypeId", id)}
            options={caseTypes.map((ct) => ({ value: ct.id, label: ct.name }))}
          />
          {errors.caseTypeId && (
            <p className="text-sm text-danger" role="alert">
              {errors.caseTypeId}
            </p>
          )}
        </div>

        <BottomActions>
          <Button type="submit" size="xl" block>
            Next
          </Button>
        </BottomActions>
      </form>
    </>
  );
}

