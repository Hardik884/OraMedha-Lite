"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { ArrowRight, CalendarClock, CircleCheck, Info, Pencil } from "lucide-react";
import { FlowHeader } from "@/components/layout/FlowHeader";
import { BottomActions } from "@/components/layout/BottomActions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChipSelect } from "@/components/ui/chip-select";
import { ChoiceList, type ChoiceOption } from "@/components/ui/choice-list";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiChoiceList } from "@/components/ui/multi-choice-list";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { newId } from "@/lib/ids";
import { addDays, formatAppointmentWhen, formatRelativeDay, isIsoDate, istToInstant, isTime } from "@/lib/dates";
import { defaultNextVisit, durationOptions, formatDuration, type WorkingHours } from "@/lib/scheduling/defaults";
import { describeGap } from "@/lib/settings/overrides";
import {
  applicableModifiers,
  drivingStageOf,
  effectiveStageDuration,
  suggestNextStep,
  type CaseTypeTemplate,
  type NextStepSuggestion,
  type PgModifierOverride,
  type PgStageOverride,
  type ValueSource,
} from "@/lib/engine/next-step";
import { validateVisit } from "@/lib/visits/validate";
import type { TodayVisit } from "@/lib/data/visit";
import { recordVisit, type RecordVisitResult } from "@/app/(flow)/patients/visit-actions";

const OTHER = "__other__";
const REVIEW_DURATIONS = [15, 30, 45, 60];

type Choice = { kind: "stage"; stageId: string } | { kind: "complete" } | null;

function sourceHint(source: ValueSource, stageName: string): string {
  if (source === "yours") return `Your usual time for ${stageName}`;
  if (source === "modifier") return "Set by the note you chose";
  return `Template time for ${stageName}`;
}

function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-3 text-sm text-danger" role="alert">
      {children}
    </p>
  );
}

/**
 * Update Visit (mockup 3) → Next Step (mockup 4).
 *
 * Step 1 records what clinically happened. Step 2 runs the next-step engine
 * on the phone and shows its suggestion with the reason; the PG confirms or
 * changes it. Saving is one retry-safe call. Opened again the same day, the
 * flow edits today's visit instead of adding a second one.
 */
export function UpdateVisitFlow({
  patientId,
  caseId,
  title,
  subtitle,
  template,
  overrides,
  workingHours,
  today,
  currentStageId,
  todayVisit,
  todaysAppointmentAt,
  backHref,
}: {
  patientId: string;
  caseId: string;
  title: string;
  subtitle: string;
  template: CaseTypeTemplate;
  overrides: { stages: PgStageOverride[]; modifiers: PgModifierOverride[] };
  workingHours: WorkingHours;
  today: string;
  currentStageId: string | null;
  todayVisit: TodayVisit | null;
  todaysAppointmentAt: string | null;
  backHref: string;
}) {
  const isEdit = todayVisit?.outcome != null;

  // ── Step 1 state ───────────────────────────────────────────────────────────
  const initialStages =
    todayVisit && todayVisit.stageIds.length > 0 ? todayVisit.stageIds : currentStageId ? [currentStageId] : [];
  const [step, setStep] = useState<"visit" | "next">("visit");
  const [picked, setPicked] = useState<string[]>([
    ...initialStages,
    ...(todayVisit?.otherWork ? [OTHER] : []),
  ]);
  const [otherWork, setOtherWork] = useState(todayVisit?.otherWork ?? "");
  const [outcome, setOutcome] = useState<string | null>(todayVisit?.outcome ?? null);
  const [modifierId, setModifierId] = useState<string>(todayVisit?.modifierId ?? "");
  const [note, setNote] = useState(todayVisit?.note ?? "");
  const [visitErrors, setVisitErrors] = useState<Partial<Record<string, string>>>({});

  const stageIds = picked.filter((p) => p !== OTHER);
  const otherSelected = picked.includes(OTHER);
  const driving = drivingStageOf(template, stageIds);
  const modifiers = applicableModifiers(template, driving);
  const activeModifier = modifiers.some((m) => m.id === modifierId) ? modifierId : "";

  // ── Step 2 state ───────────────────────────────────────────────────────────
  const [suggestion, setSuggestion] = useState<NextStepSuggestion | null>(null);
  const [choice, setChoice] = useState<Choice>(null);
  const [durationMin, setDurationMin] = useState(30);
  const [durationSource, setDurationSource] = useState<{ source: ValueSource; stageName: string } | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [review, setReview] = useState(false);
  const [changing, setChanging] = useState(false);
  const [nextErrors, setNextErrors] = useState<RecordVisitResult["errors"]>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Made once and reused on every retry (see recordVisit).
  const ids = useRef<{ visitId: string; appointmentId: string } | null>(null);

  const stageById = useMemo(() => new Map(template.stages.map((s) => [s.id, s])), [template]);

  function goToNext(event: React.FormEvent) {
    event.preventDefault();
    const result = validateVisit({ stageIds, otherSelected, otherWork, outcome, note });
    if (!result.ok) {
      setVisitErrors(result.errors);
      return;
    }
    setVisitErrors({});

    const s = suggestNextStep({
      template,
      stagesDone: stageIds,
      otherWork: otherSelected ? otherWork : null,
      outcome: result.value.outcome,
      modifierId: activeModifier || null,
      overrides,
    });
    setSuggestion(s);
    setNextErrors({});
    setFormError(null);

    if (s.kind === "next_visit") {
      applyChoice({ kind: "stage", stageId: s.nextStage.id }, s);
    } else if (s.kind === "case_complete") {
      applyChoice({ kind: "complete" }, s);
    } else {
      setChoice(null);
      setDurationSource(null);
      const d = defaultNextVisit({ today, gapMinDays: null, workingHours });
      setDate(d.date);
      setTime(d.time);
    }
    setStep("next");
    window.scrollTo({ top: 0 });
  }

  function applyChoice(next: Choice, s: NextStepSuggestion | null = suggestion) {
    setChoice(next);
    setNextErrors({});
    if (next?.kind === "stage") {
      const stage = stageById.get(next.stageId)!;
      const isSuggested = s?.kind === "next_visit" && s.nextStage.id === next.stageId;
      const eff = isSuggested
        ? { durationMin: s.durationMin, source: s.durationSource }
        : effectiveStageDuration(stage, overrides.stages);
      setDurationMin(eff.durationMin);
      setDurationSource({ source: eff.source, stageName: stage.name });
      const gap = s?.kind === "next_visit" ? s.gap : null;
      const d = defaultNextVisit({ today, gapMinDays: gap?.minDays ?? null, workingHours });
      setDate(d.date);
      setTime(d.time);
    } else if (next?.kind === "complete") {
      setReview(false);
      setDate("");
      setTime(defaultNextVisit({ today, gapMinDays: null, workingHours }).time);
      setDurationMin(30);
    }
  }

  function save(schedule: "now" | "later") {
    if (!choice) {
      setNextErrors({ stage: "Choose the next step" });
      return;
    }
    ids.current ??= { visitId: newId(), appointmentId: newId() };
    const { visitId, appointmentId } = ids.current;
    setFormError(null);
    startTransition(async () => {
      let result: RecordVisitResult | undefined;
      try {
        result = await recordVisit({
          patientId,
          caseId,
          visitId,
          appointmentId,
          visit: { stageIds, otherSelected, otherWork, outcome, note },
          modifierId: activeModifier || null,
          next:
            choice.kind === "stage"
              ? { kind: "stage", stageId: choice.stageId, schedule, date, time, durationMin }
              : { kind: "complete", review, date, time, durationMin },
        });
      } catch {
        result = { formError: "Couldn't reach OraMedha. Check your internet and try again." };
      }
      if (result?.errors) {
        const { stages, otherWork: ow, outcome: oc, note: n, ...rest } = result.errors;
        if (stages || ow || oc || n) {
          setVisitErrors({ stages, otherWork: ow, outcome: oc, note: n });
          setStep("visit");
        }
        setNextErrors(rest);
      }
      if (result?.formError) setFormError(result.formError);
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // Step 1 — What did you do today?
  // ════════════════════════════════════════════════════════════════════════
  if (step === "visit") {
    return (
      <>
        <FlowHeader backHref={backHref} title={title} subtitle={subtitle} />
        <form onSubmit={goToNext} method="post" noValidate className="mx-auto max-w-lg space-y-6 px-4 pt-5 pb-32">
          {isEdit && (
            <p className="flex items-center gap-2 rounded-[10px] border border-info-border bg-info-bg px-3.5 py-3 text-sm text-info">
              <Pencil className="h-4 w-4 shrink-0" aria-hidden />
              You&apos;re editing today&apos;s visit. Saving updates it — no second visit is added.
            </p>
          )}
          {!isEdit && todaysAppointmentAt && (
            <p className="text-sm text-text-secondary">
              Today&apos;s appointment ({formatAppointmentWhen(todaysAppointmentAt, today)}) will be marked completed.
            </p>
          )}

          <section className="space-y-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-text-primary">1. What did you do today?</h1>
            <p className="text-sm text-text-secondary">Tick every stage you worked on.</p>
            <MultiChoiceList
              label="What did you do today?"
              values={picked}
              onChange={(v) => {
                setPicked(v);
                setVisitErrors((e) => ({ ...e, stages: undefined }));
              }}
              options={[
                ...template.stages.map((s) => ({
                  value: s.id,
                  label: s.name,
                  // When editing, the case has already moved on, so this hint would mislead.
                  description: !isEdit && s.id === currentStageId ? "Current stage" : undefined,
                })),
                { value: OTHER, label: "Other", description: "Something not in this list" },
              ]}
            />
            {visitErrors.stages && (
              <p className="text-sm text-danger" role="alert">
                {visitErrors.stages}
              </p>
            )}
            {otherSelected && (
              <Field label="What else?" htmlFor="other-work" error={visitErrors.otherWork}>
                <Input
                  id="other-work"
                  maxLength={200}
                  placeholder="A few words"
                  value={otherWork}
                  onChange={(e) => {
                    setOtherWork(e.target.value);
                    setVisitErrors((x) => ({ ...x, otherWork: undefined }));
                  }}
                  hasError={Boolean(visitErrors.otherWork)}
                />
              </Field>
            )}
          </section>

          <section className="space-y-2.5">
            <h2 className="text-xl font-semibold tracking-tight text-text-primary">2. How far did you get?</h2>
            {driving && stageIds.length > 1 && (
              <p className="text-sm text-text-secondary">
                For {driving.name}, the furthest stage today. The others are recorded as complete.
              </p>
            )}
            <ChoiceList
              label="How far did you get?"
              layout="row"
              value={outcome}
              onChange={(v) => {
                setOutcome(v);
                setVisitErrors((e) => ({ ...e, outcome: undefined }));
              }}
              options={[
                { value: "partial", label: "Partial" },
                { value: "complete", label: "Complete" },
              ]}
            />
            {visitErrors.outcome && (
              <p className="text-sm text-danger" role="alert">
                {visitErrors.outcome}
              </p>
            )}
          </section>

          {modifiers.length > 0 && (
            <section className="space-y-2.5">
              <h2 className="text-base font-semibold text-text-primary">Anything to note? (optional)</h2>
              <ChoiceList
                label="Anything to note?"
                value={activeModifier}
                onChange={setModifierId}
                options={[{ value: "", label: "Nothing" }, ...modifiers.map((m) => ({ value: m.id, label: m.label }))]}
              />
            </section>
          )}

          <Field label="Note (optional)" htmlFor="visit-note" error={visitErrors.note}>
            <Textarea
              id="visit-note"
              rows={3}
              maxLength={2000}
              placeholder="Anything you want to remember"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[80px]"
            />
          </Field>

          <BottomActions>
            <Button type="submit" size="xl" block>
              Next
              <ArrowRight className="h-5 w-5" aria-hidden />
            </Button>
          </BottomActions>
        </form>
      </>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // Step 2 — Next step
  // ════════════════════════════════════════════════════════════════════════
  const chosenStage = choice?.kind === "stage" ? stageById.get(choice.stageId) : undefined;
  const gap = suggestion?.kind === "next_visit" && choice?.kind === "stage" ? suggestion.gap : null;
  const windowFrom = gap ? addDays(today, gap.minDays) : null;
  const windowTo = gap ? addDays(today, gap.maxDays) : null;
  const outsideWindow = !!(windowFrom && windowTo && isIsoDate(date) && (date < windowFrom || date > windowTo));
  const preview = isIsoDate(date) && isTime(time) ? formatAppointmentWhen(istToInstant(date, time), today) : null;
  const booked = todayVisit?.nextAppointment;
  const bookedLive =
    booked && ["scheduled", "confirmed", "unconfirmed"].includes(booked.status) && new Date(booked.startsAt) > new Date();
  const isChoiceSuggested =
    (suggestion?.kind === "next_visit" && choice?.kind === "stage" && choice.stageId === suggestion.nextStage.id) ||
    (suggestion?.kind === "case_complete" && choice?.kind === "complete");

  const choiceOptions: ChoiceOption[] = [
    ...template.stages.map((s) => ({ value: s.id, label: s.name })),
    { value: "__complete__", label: "Complete the case", description: "No more treatment visits" },
  ];

  return (
    <>
      <FlowHeader onBack={() => setStep("visit")} title={title} subtitle={subtitle} />
      <main className="mx-auto max-w-lg space-y-6 px-4 pt-5 pb-44">
        {/* Suggestion */}
        {suggestion?.kind === "needs_choice" && !choice ? (
          <section className="space-y-2.5">
            <Card className="flex gap-3 p-4">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-info" aria-hidden />
              <p className="text-sm text-text-body">{suggestion.reason}</p>
            </Card>
            <h1 className="text-xl font-semibold tracking-tight text-text-primary">What&apos;s next?</h1>
            <ChoiceList
              label="What's next?"
              value={null}
              onChange={(v) => applyChoice(v === "__complete__" ? { kind: "complete" } : { kind: "stage", stageId: v })}
              options={choiceOptions}
            />
            {nextErrors?.stage && (
              <p className="text-sm text-danger" role="alert">
                {nextErrors.stage}
              </p>
            )}
          </section>
        ) : (
          <section className="rounded-xl border border-accent-soft-border bg-accent-subtle-bg p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
              <CircleCheck className="h-4 w-4" aria-hidden />
              {isChoiceSuggested ? "Suggested next step" : "Your next step"}
            </p>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-text-primary">
              {choice?.kind === "complete" ? "Complete the case" : (chosenStage?.name ?? "")}
            </h1>
            {suggestion && suggestion.kind !== "needs_choice" && (
              <p className="mt-1 text-sm text-text-body">
                {isChoiceSuggested
                  ? suggestion.reason
                  : `You changed this. OraMedha suggested ${
                      suggestion.kind === "next_visit" ? suggestion.nextStage.name : "completing the case"
                    }.`}
              </p>
            )}
            <Button variant="ghost" size="lg" className="-ml-3 mt-1 text-accent" onClick={() => setChanging(true)}>
              <Pencil className="h-4 w-4" aria-hidden />
              Change next step
            </Button>
          </section>
        )}

        {/* Next visit: appointment + duration */}
        {choice?.kind === "stage" && (
          <>
            <section className="space-y-2.5">
              <h2 className="text-base font-semibold text-text-primary">Next appointment</h2>
              {windowFrom && windowTo && (
                <p className="text-sm text-text-secondary">
                  Usual window: {formatRelativeDay(windowFrom, today)} – {formatRelativeDay(windowTo, today)} (
                  {describeGap(gap!.minDays, gap!.maxDays)})
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date" htmlFor="next-date" error={nextErrors?.date}>
                  <Input
                    id="next-date"
                    type="date"
                    min={today}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    hasError={Boolean(nextErrors?.date)}
                  />
                </Field>
                <Field label="Time" htmlFor="next-time" error={nextErrors?.time}>
                  <Input
                    id="next-time"
                    type="time"
                    step={300}
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    hasError={Boolean(nextErrors?.time)}
                  />
                </Field>
              </div>
              {outsideWindow && (
                <p className="text-sm text-warning">That&apos;s outside the usual window — fine if you meant it.</p>
              )}
              {preview && (
                <p className="flex items-center gap-2 text-base font-semibold text-text-primary">
                  <CalendarClock className="h-5 w-5 text-accent" aria-hidden />
                  {preview}
                </p>
              )}
            </section>

            <section className="space-y-2.5">
              <Label>Expected duration</Label>
              <ChipSelect
                label="Expected duration"
                value={durationMin}
                onChange={setDurationMin}
                options={durationOptions(durationMin).map((m) => ({ value: m, label: formatDuration(m) }))}
              />
              {durationSource && (
                <p className="text-xs text-text-secondary">
                  {sourceHint(durationSource.source, durationSource.stageName)}
                </p>
              )}
            </section>
          </>
        )}

        {/* Complete the case: optional review */}
        {choice?.kind === "complete" && (
          <section className="space-y-3">
            <p className="text-sm text-text-secondary">
              The case is marked complete. Its timeline and files stay with the patient.
            </p>
            <Card className="p-3 pl-4">
              <div className="flex items-center justify-between gap-2">
                <span id="review-label" className="text-base font-medium text-text-primary">
                  Book a review visit
                </span>
                <Switch checked={review} onChange={setReview} aria-labelledby="review-label" />
              </div>
              {review && (
                <div className="mt-3 space-y-3 pr-1">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Date" htmlFor="review-date" error={nextErrors?.date}>
                      <Input
                        id="review-date"
                        type="date"
                        min={today}
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        hasError={Boolean(nextErrors?.date)}
                      />
                    </Field>
                    <Field label="Time" htmlFor="review-time" error={nextErrors?.time}>
                      <Input
                        id="review-time"
                        type="time"
                        step={300}
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        hasError={Boolean(nextErrors?.time)}
                      />
                    </Field>
                  </div>
                  <ChipSelect
                    label="Review duration"
                    value={durationMin}
                    onChange={setDurationMin}
                    options={REVIEW_DURATIONS.map((m) => ({ value: m, label: formatDuration(m) }))}
                  />
                </div>
              )}
            </Card>
          </section>
        )}

        {isEdit && bookedLive && (
          <p className="flex gap-2 rounded-[10px] border border-info-border bg-info-bg px-3.5 py-3 text-sm text-info">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              This visit already booked {formatAppointmentWhen(booked!.startsAt, today)}.{" "}
              {choice?.kind === "complete"
                ? "Saving moves it to the review time, or cancels it if no review is booked."
                : "Confirm & schedule moves it; schedule later cancels it."}
            </span>
          </p>
        )}

        {formError && <ErrorNote>{formError}</ErrorNote>}

        <BottomActions>
          {choice?.kind === "complete" ? (
            <Button size="xl" block isLoading={pending} onClick={() => save("now")}>
              {pending ? "Saving…" : "Complete case"}
            </Button>
          ) : (
            <>
              <Button size="xl" block isLoading={pending} disabled={!choice} onClick={() => save("now")}>
                {pending ? "Saving…" : "Confirm & schedule"}
              </Button>
              <Button variant="ghost" size="lg" block disabled={pending || !choice} onClick={() => save("later")}>
                Save — schedule later
              </Button>
            </>
          )}
        </BottomActions>
      </main>

      <Dialog open={changing} onClose={() => setChanging(false)} title="Change next step">
        <div className="p-4">
          <ChoiceList
            label="Next step"
            value={choice?.kind === "complete" ? "__complete__" : choice?.kind === "stage" ? choice.stageId : null}
            onChange={(v) => {
              applyChoice(v === "__complete__" ? { kind: "complete" } : { kind: "stage", stageId: v });
              setChanging(false);
            }}
            options={choiceOptions.map((o) =>
              (suggestion?.kind === "next_visit" && o.value === suggestion.nextStage.id) ||
              (suggestion?.kind === "case_complete" && o.value === "__complete__")
                ? { ...o, description: o.description ? `Suggested · ${o.description}` : "Suggested" }
                : o,
            )}
          />
        </div>
      </Dialog>
    </>
  );
}
