"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarPlus, Check, CircleCheck, ClipboardPen, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SendMessageButton } from "@/components/messages/SendMessageButton";
import { setAppointmentStatus } from "@/app/(flow)/patients/appointment-actions";
import type { MessageDraft } from "@/lib/messages/draft";
import type { WrapUpAction, WrapUpState } from "@/lib/wrapup/plan";
import { formatAppointmentWhen, formatTime } from "@/lib/dates";
import { cn } from "@/lib/utils";

export type WrapUpRow = {
  id: string;
  patientName: string;
  startsAt: string;
  detail: string;
  state: WrapUpState;
  action: WrapUpAction;
  visitHref: string | null;
  justSaved: boolean;
  nextAt?: string;
  message?: { draft: MessageDraft; openedAt: string | null; label: string };
  follow?: { href: string; label: string };
};

const FAILED = "Couldn't reach OraMedha. Check your internet and try again.";

/** The day's list, with a count of what's left. */
export function WrapUpList({
  rows,
  toUpdate,
  done,
  total,
  today,
}: {
  rows: WrapUpRow[];
  toUpdate: number;
  done: number;
  total: number;
  today: string;
}) {
  const savedRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    savedRef.current?.scrollIntoView({ block: "center" });
  }, []);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-base text-text-body">
          {toUpdate > 0 ? (
            <>
              <span className="font-semibold text-text-primary">{toUpdate}</span> to update ·{" "}
            </>
          ) : null}
          {done} of {total} done
        </p>
        <div className="h-2 overflow-hidden rounded-full bg-surface-muted" aria-hidden>
          <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
        </div>
        {toUpdate === 0 && done === total && (
          <p className="flex items-center gap-2 text-sm font-medium text-success-strong" role="status">
            <CircleCheck className="h-4 w-4" aria-hidden />
            All done for today.
          </p>
        )}
      </div>

      <Card className="overflow-hidden">
        <ul className="divide-y divide-border">
          {rows.map((r) => (
            <li key={r.id} ref={r.justSaved ? savedRef : undefined} className={cn(r.justSaved && "bg-accent-soft/40")}>
              <Row row={r} today={today} />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function Row({ row: r, today }: { row: WrapUpRow; today: string }) {
  const router = useRouter();
  const [confirmMissed, setConfirmMissed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const open = r.state === "to_update" || r.state === "later";

  function mark(to: "missed" | "completed") {
    setError(null);
    startTransition(async () => {
      try {
        const result = await setAppointmentStatus({ appointmentId: r.id, to });
        if (!result.ok) return setError(result.error);
        setConfirmMissed(false);
        router.refresh();
      } catch {
        setError(FAILED);
      }
    });
  }

  return (
    <div className="space-y-3 px-4 py-3.5" data-wrapup={r.state}>
      <div className="flex gap-3">
        <span className="w-[4.25rem] shrink-0 pt-0.5 text-sm font-medium tabular-nums text-text-body">{formatTime(r.startsAt)}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-semibold text-text-primary">{r.patientName}</span>
          {r.detail && <span className="block truncate text-sm text-text-secondary">{r.detail}</span>}
          {r.state === "came" && (
            <>
              <span className="mt-0.5 flex items-center gap-1 text-sm text-success-strong">
                <Check className="h-4 w-4" aria-hidden />
                {r.justSaved ? "Saved" : "Came"}
              </span>
              {r.nextAt && (
                <span className="block text-sm text-text-secondary">Next: {formatAppointmentWhen(r.nextAt, today)}</span>
              )}
            </>
          )}
          {r.state === "missed" && (
            <span className="mt-0.5 flex items-center gap-1 text-sm text-warning">
              <UserX className="h-4 w-4" aria-hidden />
              Didn&apos;t come
            </span>
          )}
          {r.state === "later" && <span className="mt-0.5 block text-sm text-text-secondary">Later today</span>}
        </span>
      </div>

      {open && !confirmMissed && (
        <div className={cn("grid gap-2", r.state === "to_update" ? "grid-cols-2" : "grid-cols-1")}>
          {r.action === "update_visit" && r.visitHref ? (
            <Button asChild size="lg" variant={r.state === "later" ? "outline" : "default"}>
              <Link href={r.visitHref}>
                <ClipboardPen className="h-4 w-4" aria-hidden />
                Came
              </Link>
            </Button>
          ) : (
            <Button
              size="lg"
              variant={r.state === "later" ? "outline" : "default"}
              isLoading={pending}
              disabled={r.state === "later"}
              onClick={() => mark("completed")}
            >
              <Check className="h-4 w-4" aria-hidden />
              Came
            </Button>
          )}
          {r.state === "to_update" && (
            <Button size="lg" variant="outline" onClick={() => setConfirmMissed(true)} disabled={pending}>
              <UserX className="h-4 w-4" aria-hidden />
              Didn&apos;t come
            </Button>
          )}
        </div>
      )}

      {confirmMissed && (
        <div className="space-y-2 rounded-xl border border-border bg-surface-muted p-3">
          <p className="text-sm text-text-body">Mark {r.patientName} as didn&apos;t come?</p>
          <div className="grid grid-cols-2 gap-2">
            <Button size="lg" variant="danger" isLoading={pending} onClick={() => mark("missed")}>
              Yes, mark missed
            </Button>
            <Button size="lg" variant="ghost" onClick={() => setConfirmMissed(false)} disabled={pending}>
              Back
            </Button>
          </div>
        </div>
      )}

      {r.message && (
        <div className="flex items-start justify-between gap-3 pl-[5rem]">
          <span className="pt-3 text-sm text-text-body">{r.message.label}</span>
          <SendMessageButton draft={r.message.draft} openedAt={r.message.openedAt} label={r.message.label} variant="compact" />
        </div>
      )}
      {r.follow && (
        <div className="pl-[4.25rem]">
          <Button asChild size="lg" variant="ghost" className="px-3 text-accent">
            <Link href={r.follow.href}>
              <CalendarPlus className="h-4 w-4" aria-hidden />
              {r.follow.label}
            </Link>
          </Button>
        </div>
      )}

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
