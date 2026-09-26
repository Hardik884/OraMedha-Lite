"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Phone, Plus, MessageCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton, SkeletonCard, SkeletonRow, SkeletonText } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog } from "@/components/ui/dialog";
import { ChoiceList } from "@/components/ui/choice-list";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { OraMedhaLogo } from "@/components/shared/OraMedhaLogo";
import { PatientAvatar } from "@/components/shared/PatientAvatar";
import { SegmentedTabs } from "@/components/shared/SegmentedTabs";
import { AppointmentStatusBadge } from "@/components/shared/AppointmentStatusBadge";
import { useTheme } from "@/components/providers/ThemeProvider";
import { APPOINTMENT_STATUSES } from "@/lib/appointments/status";

/* Sample content is deliberately generic — no clinical terms live in code. */
const SAMPLE_STAGES = [
  { value: "first", label: "First stage", description: "Usually 45 min" },
  { value: "second", label: "Second stage", description: "Usually 60 min" },
  { value: "third", label: "Third stage", description: "Usually 30 min" },
  { value: "other", label: "Other" },
];

/* Literal class names so Tailwind generates every swatch. */
const SWATCHES: { name: string; className: string }[] = [
  { name: "background", className: "bg-background" },
  { name: "surface", className: "bg-surface" },
  { name: "surface-secondary", className: "bg-surface-secondary" },
  { name: "surface-muted", className: "bg-surface-muted" },
  { name: "border", className: "bg-border" },
  { name: "border-strong", className: "bg-border-strong" },
  { name: "accent", className: "bg-accent" },
  { name: "accent-hover", className: "bg-accent-hover" },
  { name: "accent-soft", className: "bg-accent-soft" },
  { name: "text-primary", className: "bg-text-primary" },
  { name: "text-body", className: "bg-text-body" },
  { name: "text-secondary", className: "bg-text-secondary" },
  { name: "success", className: "bg-success" },
  { name: "warning", className: "bg-warning" },
  { name: "danger", className: "bg-danger" },
  { name: "info", className: "bg-info" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">{title}</h2>
      {children}
    </section>
  );
}

export function Gallery() {
  const { resolvedTheme, mounted } = useTheme();
  const [stage, setStage] = useState<string | null>("second");
  const [outcome, setOutcome] = useState<string | null>("partial");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [duration, setDuration] = useState("60");

  return (
    <div className="min-h-dvh bg-background">
      {/* Sticky theme switch: flip the whole page between light and dark. */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-md pt-safe">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-2 px-4 py-2">
          <Button asChild variant="ghost" size="icon-lg" aria-label="Back to app">
            <Link href="/today">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-8 px-4 py-6 pb-safe">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">UI kit</h1>
          <p className="text-sm text-text-secondary">
            Every component, as it will look on a phone. Showing{" "}
            <span className="font-medium text-text-primary">{mounted ? resolvedTheme : "…"}</span>{" "}
            — use the switch above to compare Light and Dark.
          </p>
        </div>

        <Section title="Brand">
          <Card className="flex flex-col items-start gap-5 p-4">
            <OraMedhaLogo size={28} withWordmark />
            <OraMedhaLogo size={20} withWordmark />
            <OraMedhaLogo size={32} />
          </Card>
        </Section>

        <Section title="Colour tokens">
          <div className="grid grid-cols-4 gap-2">
            {SWATCHES.map((s) => (
              <div key={s.name} className="space-y-1">
                <div className={`h-12 rounded-lg border border-border ${s.className}`} />
                <p className="truncate text-[11px] leading-tight text-text-secondary">{s.name}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Typography">
          <Card className="space-y-2 p-4">
            <p className="text-2xl font-semibold tracking-tight">Page title 24</p>
            <p className="text-lg font-semibold">Section title 18</p>
            <p className="text-base text-text-primary">Body 16 — primary text</p>
            <p className="text-sm text-text-body">Body 14 — secondary copy</p>
            <p className="text-sm text-text-secondary">Meta 14 — dates, hints</p>
            <p className="font-mono text-sm tabular-nums text-text-strong">Mono 10:30 AM · 46 · 60 min</p>
          </Card>
        </Section>

        <Section title="Buttons — Lite sizes">
          <div className="space-y-3">
            <Button size="xl" block>
              Primary action (xl)
            </Button>
            <Button size="xl" block variant="outline">
              Secondary action (xl)
            </Button>
            <Button size="xl" block isLoading>
              Saving…
            </Button>
            <Button size="xl" block disabled>
              Disabled
            </Button>
          </div>
        </Section>

        <Section title="Buttons — variants">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="lg">Default</Button>
            <Button size="lg" variant="secondary">Secondary</Button>
            <Button size="lg" variant="outline">Outline</Button>
            <Button size="lg" variant="ghost">Ghost</Button>
            <Button size="lg" variant="danger">Danger</Button>
            <Button variant="link">Link</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="icon-lg" variant="outline" aria-label="Call">
              <Phone className="h-5 w-5" />
            </Button>
            <Button size="icon-lg" variant="outline" aria-label="WhatsApp">
              <MessageCircle className="h-5 w-5" />
            </Button>
            <Button size="icon-lg" aria-label="Add">
              <Plus className="h-5 w-5" />
            </Button>
            <Button size="md" variant="secondary">md</Button>
            <Button size="sm" variant="secondary">sm</Button>
          </div>
        </Section>

        <Section title="Badges">
          <div className="flex flex-wrap gap-2">
            <Badge variant="default">Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="accent">Accent</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="danger">Danger</Badge>
            <Badge variant="info">Info</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {APPOINTMENT_STATUSES.map((s) => (
              <AppointmentStatusBadge key={s} status={s} />
            ))}
          </div>
        </Section>

        <Section title="Cards & list rows">
          <Card>
            <CardHeader>
              <CardTitle>Card title</CardTitle>
              <CardDescription>Cards sit on the page background with a soft border.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-body">Card body content.</p>
            </CardContent>
            <CardFooter className="justify-end">
              <Button size="lg" variant="ghost">Action</Button>
            </CardFooter>
          </Card>

          <Card className="divide-y divide-border overflow-hidden">
            {[
              { time: "9:00 AM", name: "Rahul Sharma", status: "confirmed" as const },
              { time: "10:00 AM", name: "Neha Jain", status: "unconfirmed" as const },
              { time: "11:30 AM", name: "Aman Verma", status: "missed" as const },
            ].map((row) => (
              <button
                key={row.name}
                type="button"
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-surface-muted"
              >
                <PatientAvatar name={row.name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-medium">{row.name}</span>
                  <span className="block truncate text-sm text-text-secondary">
                    {row.time} · Tooth · Case type · Stage
                  </span>
                </span>
                <AppointmentStatusBadge status={row.status} />
                <ChevronRight className="h-4 w-4 shrink-0 text-text-disabled" aria-hidden />
              </button>
            ))}
          </Card>
        </Section>

        <Section title="Choice list (tap, don't type)">
          <ChoiceList
            label="What did you do today?"
            options={SAMPLE_STAGES}
            value={stage}
            onChange={setStage}
          />
          <ChoiceList
            label="How far did you get?"
            layout="row"
            options={[
              { value: "partial", label: "Partial" },
              { value: "complete", label: "Complete" },
            ]}
            value={outcome}
            onChange={setOutcome}
          />
        </Section>

        <Section title="Segmented tabs">
          <SegmentedTabs
            tabs={[
              { key: "today", label: "Today", count: 8 },
              { key: "pending", label: "Pending", count: 3 },
            ]}
            panels={{
              today: <p className="text-sm text-text-secondary">Today panel</p>,
              pending: <p className="text-sm text-text-secondary">Pending panel</p>,
            }}
          />
        </Section>

        <Section title="Form fields">
          <Card className="space-y-5 p-4">
            <Field label="Patient name" htmlFor="dev-name" required>
              <Input id="dev-name" placeholder="Full name" autoComplete="off" />
            </Field>
            <Field label="Phone" htmlFor="dev-phone" required hint="10-digit mobile number">
              <Input id="dev-phone" type="tel" inputMode="numeric" placeholder="98765 43210" />
            </Field>
            <Field label="Tooth" htmlFor="dev-tooth" error="Enter a valid tooth number">
              <Input id="dev-tooth" inputMode="numeric" defaultValue="99" hasError />
            </Field>
            <Field label="Duration" htmlFor="dev-duration">
              <Select id="dev-duration" value={duration} onChange={(e) => setDuration(e.target.value)}>
                <option value="30">30 min</option>
                <option value="45">45 min</option>
                <option value="60">60 min</option>
                <option value="90">90 min</option>
              </Select>
            </Field>
            <Field label="Note" htmlFor="dev-note">
              <Textarea id="dev-note" placeholder="Optional" />
            </Field>
            <Field label="Disabled" htmlFor="dev-disabled">
              <Input id="dev-disabled" disabled value="Not editable" readOnly />
            </Field>
          </Card>
        </Section>

        <Section title="Avatars">
          <div className="flex items-center gap-3">
            <PatientAvatar name="Rahul Sharma" size="sm" />
            <PatientAvatar name="Neha Jain" />
            <PatientAvatar name="Aman Verma" size="lg" />
            <PatientAvatar name="Riya Singh" size="lg" />
          </div>
        </Section>

        <Section title="Loading skeletons">
          <Card className="overflow-hidden">
            <SkeletonRow />
            <Separator />
            <SkeletonRow />
          </Card>
          <SkeletonCard />
          <div className="space-y-2">
            <Skeleton className="h-12 w-full rounded-[12px]" />
            <SkeletonText lines={2} />
          </div>
        </Section>

        <Section title="Empty state">
          <Card>
            <EmptyState
              icon={<CalendarDays />}
              title="No appointments today"
              description="Short, friendly explanation of what will appear here."
              action={
                <Button size="xl" block>
                  <Plus className="h-5 w-5" aria-hidden />
                  Main action
                </Button>
              }
            />
          </Card>
        </Section>

        <Section title="Dialog (bottom sheet on phones)">
          <Button size="xl" block variant="outline" onClick={() => setDialogOpen(true)}>
            Open dialog
          </Button>
          <Dialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            title="Change next step"
            description="Pick what happens at the next visit."
            footer={
              <Button size="xl" block onClick={() => setDialogOpen(false)}>
                Confirm
              </Button>
            }
          >
            <div className="p-4">
              <ChoiceList
                label="Next step"
                options={SAMPLE_STAGES}
                value={stage}
                onChange={setStage}
              />
            </div>
          </Dialog>
        </Section>

        <Section title="Theme toggle">
          <ThemeToggle className="w-full" />
          <ThemeToggle compact />
        </Section>

        <Section title="Separator">
          <Separator />
        </Section>
      </main>
    </div>
  );
}
