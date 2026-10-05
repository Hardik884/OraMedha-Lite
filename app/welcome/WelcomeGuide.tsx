"use client";

import { useState, useTransition } from "react";
import { ArrowRight, CalendarCheck, CircleCheck, ClipboardPen, Sparkles, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { markGuideSeen } from "./actions";

type Step = { icon: LucideIcon; title: string; body: string; points: string[] };

/*
 * Three short screens after onboarding. Generic on purpose: no clinical
 * words, the same for every specialty.
 */
const STEPS: Step[] = [
  {
    icon: CalendarCheck,
    title: "Today is home",
    body: "Everyone you're seeing today, and whether they've confirmed.",
    points: ["Reminders to send, one tap each", "Pending: anything that needs a tap", "New Patient in under 30 seconds"],
  },
  {
    icon: ClipboardPen,
    title: "Update once, after clinic",
    body: "After clinic, tap Wrap up the day: for each patient, Came or Didn't come. Tick what you did, choose Partial or Complete, confirm the next visit.",
    points: ["Add X-rays and photos to the visit", "The case timeline fills itself in", "Your logbook counts it automatically"],
  },
  {
    icon: Sparkles,
    title: "OraMedha suggests, you decide",
    body: "It suggests the next step and a free slot within your clinic timings.",
    points: ["Confirm with one tap, or change anything", "Then send the patient a WhatsApp message", "Your clinical judgment always wins"],
  },
];

/** The first-run guide: skippable, shown once (and again from Settings). */
export function WelcomeGuide({ firstName, doneHref }: { firstName: string; doneHref: string }) {
  const [index, setIndex] = useState(0);
  const [pending, startTransition] = useTransition();
  const step = STEPS[index]!;
  const last = index === STEPS.length - 1;
  const Icon = step.icon;

  function finish() {
    startTransition(async () => {
      // Even if this fails (offline), let the PG in; they'd just see the guide once more.
      await markGuideSeen().catch(() => {});
      // A full load, not a client hop: the router may still hold the tabs'
      // earlier "go to the guide" redirect, which would bounce back here.
      window.location.replace(doneHref);
    });
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-6 pt-safe pb-safe">
      <div className="flex justify-end pt-3">
        {!last && (
          <Button variant="ghost" size="lg" onClick={finish} disabled={pending}>
            Skip
          </Button>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-center py-8">
        {index === 0 && <p className="mb-3 text-sm font-medium text-accent">Welcome, {firstName}</p>}
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <Icon className="h-8 w-8" aria-hidden />
        </span>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-text-primary">{step.title}</h1>
        <p className="mt-2 text-base text-text-body">{step.body}</p>
        <ul className="mt-6 space-y-3">
          {step.points.map((p) => (
            <li key={p} className="flex gap-3 text-base text-text-primary">
              <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
              {p}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-4 pb-6">
        <div className="flex justify-center gap-2" aria-label={`Step ${index + 1} of ${STEPS.length}`} role="img">
          {STEPS.map((_, i) => (
            <span key={i} className={cn("h-2 rounded-full transition-all", i === index ? "w-6 bg-accent" : "w-2 bg-border-strong")} />
          ))}
        </div>
        {last ? (
          <Button size="xl" block onClick={finish} isLoading={pending}>
            Start using OraMedha
          </Button>
        ) : (
          <Button size="xl" block onClick={() => setIndex((i) => i + 1)}>
            Next
            <ArrowRight className="h-5 w-5" aria-hidden />
          </Button>
        )}
        {index > 0 && (
          <Button variant="ghost" size="lg" block onClick={() => setIndex((i) => i - 1)}>
            Back
          </Button>
        )}
      </div>
    </main>
  );
}
