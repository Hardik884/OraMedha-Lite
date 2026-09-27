"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck } from "lucide-react";
import { BottomActions } from "@/components/layout/BottomActions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { MAX_FEEDBACK_LENGTH } from "@/lib/feedback/screen";
import { formatAppointmentWhen } from "@/lib/dates";
import { sendFeedback } from "./actions";

/** The feedback box, and the PG's last few notes (their own only). */
export function FeedbackForm({
  screen,
  sent,
}: {
  screen: string | null;
  sent: { id: string; message: string; at: string }[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const r = await sendFeedback({ message, screen });
        if (!r.ok) return setError(r.error);
        setMessage("");
        setDone(true);
        router.refresh();
      } catch {
        setError("Couldn't reach OraMedha. Check your internet and try again.");
      }
    });
  }

  return (
    <form onSubmit={submit} method="post" noValidate className="mx-auto max-w-lg space-y-5 px-4 pt-5 pb-32">
      <p className="text-sm text-text-secondary">
        Something confusing, missing or broken? Tell us in a line or two. Please leave out patient names and phone
        numbers.
      </p>
      {done && (
        <p
          className="flex items-center gap-2 rounded-[10px] border border-success-border bg-success-bg px-3.5 py-3 text-sm text-success-strong"
          role="status"
        >
          <CircleCheck className="h-4 w-4 shrink-0" aria-hidden />
          Thank you — sent to the OraMedha team.
        </p>
      )}
      <Field label="Your feedback" htmlFor="feedback" error={error ?? undefined} hint={`${message.length} / ${MAX_FEEDBACK_LENGTH}`}>
        <Textarea
          id="feedback"
          rows={6}
          maxLength={MAX_FEEDBACK_LENGTH}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            setDone(false);
          }}
          placeholder="For example: I'd like to see…"
        />
      </Field>
      {sent.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-text-primary">You sent</h2>
          <Card className="divide-y divide-border">
            {sent.map((f) => (
              <div key={f.id} className="px-4 py-3">
                <p className="whitespace-pre-line text-sm text-text-body">{f.message}</p>
                <p className="mt-1 text-xs text-text-secondary">{formatAppointmentWhen(f.at)}</p>
              </div>
            ))}
          </Card>
        </section>
      )}
      <BottomActions>
        <Button type="submit" size="xl" block isLoading={pending} disabled={!message.trim()}>
          {pending ? "Sending…" : "Send"}
        </Button>
      </BottomActions>
    </form>
  );
}
