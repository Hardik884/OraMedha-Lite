"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { BellOff, BellRing, Check, ChevronRight, Send, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChoiceList } from "@/components/ui/choice-list";
import { WRAP_UP_REMINDER_TIMES, formatReminderTime, type WrapUpReminderTime } from "@/lib/push/reminder";
import { installPlatform, pushNeedsInstall, type InstallPlatform } from "@/lib/pwa/install";
import { currentEndpoint, isStandalone, pushSupport, subscribeThisPhone, unsubscribeThisPhone, type PushSupport } from "@/lib/push/browser";
import { isNavigationSignal } from "@/lib/navigation/signal";
import {
  removePushSubscription,
  savePushSubscription,
  saveReminderTime,
  sendTestNotification,
} from "@/app/(flow)/settings/reminder/actions";

const OFF = "off";
const NETWORK = "Couldn't reach OraMedha. Check your internet and try again.";

type PhoneState =
  | { kind: "checking" }
  | { kind: "needs_install" }
  | { kind: "unsupported" }
  | { kind: "blocked" }
  | { kind: "off" }
  | { kind: "on"; endpoint: string };

/**
 * The evening wrap-up reminder: when (saved as soon as it's tapped), and
 * whether THIS phone receives it. Each phone is turned on separately.
 */
export function ReminderSettings({
  initialTime,
  savedEndpoints,
  publicKey,
}: {
  initialTime: WrapUpReminderTime | null;
  /** Phones this PG has already turned on (endpoints). */
  savedEndpoints: string[];
  publicKey: string | null;
}) {
  const [time, setTime] = useState<string>(initialTime ?? OFF);
  const [timeStatus, setTimeStatus] = useState<"idle" | "saved" | "error">("idle");
  const [phone, setPhone] = useState<PhoneState>({ kind: "checking" });
  const [platform, setPlatform] = useState<InstallPlatform | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    void (async () => {
      const p = installPlatform(navigator.userAgent, isStandalone());
      setPlatform(p);
      const support: PushSupport = pushSupport();
      if (pushNeedsInstall(p)) return setPhone({ kind: "needs_install" });
      if (support === "unsupported") return setPhone({ kind: "unsupported" });
      if (support === "denied") return setPhone({ kind: "blocked" });
      const endpoint = await currentEndpoint();
      setPhone(endpoint && savedEndpoints.includes(endpoint) ? { kind: "on", endpoint } : { kind: "off" });
    })();
  }, [savedEndpoints]);

  function chooseTime(next: string) {
    const previous = time;
    setTime(next);
    setTimeStatus("idle");
    startTransition(async () => {
      try {
        const r = await saveReminderTime(next === OFF ? null : next);
        if (!r.ok) throw new Error(r.error);
        setTimeStatus("saved");
      } catch (error) {
        if (isNavigationSignal(error)) return;
        setTime(previous);
        setTimeStatus("error");
      }
    });
  }

  function turnOn() {
    if (!publicKey) return;
    setMessage(null);
    startTransition(async () => {
      try {
        const keys = await subscribeThisPhone(publicKey);
        if (!keys) {
          setPhone(pushSupport() === "denied" ? { kind: "blocked" } : { kind: "off" });
          return;
        }
        const r = await savePushSubscription({ ...keys, userAgent: navigator.userAgent });
        if (!r.ok) return setMessage({ tone: "error", text: r.error });
        setPhone({ kind: "on", endpoint: keys.endpoint });
        if (time === OFF) chooseTime("19:00");
      } catch (error) {
        if (isNavigationSignal(error)) return;
        setMessage({ tone: "error", text: "Couldn't turn on notifications on this phone. Please try again." });
      }
    });
  }

  function turnOff() {
    setMessage(null);
    startTransition(async () => {
      try {
        const endpoint = (await unsubscribeThisPhone()) ?? (phone.kind === "on" ? phone.endpoint : null);
        if (endpoint) await removePushSubscription(endpoint);
        setPhone({ kind: "off" });
      } catch (error) {
        if (isNavigationSignal(error)) return;
        setMessage({ tone: "error", text: NETWORK });
      }
    });
  }

  function test() {
    setMessage(null);
    startTransition(async () => {
      try {
        const r = await sendTestNotification();
        setMessage(r.ok ? { tone: "ok", text: "Sent. It should appear in a few seconds." } : { tone: "error", text: r.error });
      } catch (error) {
        if (isNavigationSignal(error)) return;
        setMessage({ tone: "error", text: NETWORK });
      }
    });
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-text-secondary">
        One notification in the evening, only on days when some of today&apos;s patients still need updating. It shows
        how many, never their names.
      </p>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-text-primary">Remind me at</h2>
        <ChoiceList
          label="Remind me at"
          value={time}
          onChange={chooseTime}
          options={[
            { value: OFF, label: "Off" },
            ...WRAP_UP_REMINDER_TIMES.map((t) => ({ value: t, label: formatReminderTime(t) })),
          ]}
        />
        <p className="flex min-h-5 items-center gap-1.5 text-sm" aria-live="polite">
          {timeStatus === "saved" && (
            <span className="flex items-center gap-1 text-success">
              <Check className="h-4 w-4" aria-hidden /> Saved
            </span>
          )}
          {timeStatus === "error" && <span className="text-danger">{NETWORK}</span>}
        </p>
      </section>

      <section className="space-y-2" data-phone-state={phone.kind}>
        <h2 className="text-sm font-semibold text-text-primary">This phone</h2>
        <Card className="space-y-3 p-4">
          {!publicKey ? (
            <p className="text-sm text-text-body">Notifications aren&apos;t set up on the server yet.</p>
          ) : phone.kind === "checking" ? (
            <p className="text-sm text-text-secondary">Checking…</p>
          ) : phone.kind === "needs_install" ? (
            <>
              <Status icon={<Smartphone className="h-5 w-5" aria-hidden />} title="Add the app to your home screen first">
                iPhones only show notifications from apps on the home screen. Add it, open it from the icon, then
                come back here.
              </Status>
              <Button asChild size="lg" block variant="outline">
                <Link href="/settings/install?from=reminder">
                  How to add to home screen
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </>
          ) : phone.kind === "unsupported" ? (
            <Status icon={<BellOff className="h-5 w-5" aria-hidden />} title="This browser can't show notifications">
              Open the app in Chrome on Android, or from the home-screen icon on iPhone.
            </Status>
          ) : phone.kind === "blocked" ? (
            <Status icon={<BellOff className="h-5 w-5" aria-hidden />} title="Notifications are blocked">
              {platform === "android"
                ? "In Chrome: ⋮ → Settings → Site settings → Notifications → allow this site. Then come back here."
                : "In your phone's Settings → Notifications, allow this app. Then come back here."}
            </Status>
          ) : phone.kind === "on" ? (
            <>
              <Status icon={<BellRing className="h-5 w-5" aria-hidden />} title="On for this phone">
                {time === OFF ? "Choose a time above to get the reminder." : `You'll get the reminder at ${formatReminderTime(time)}.`}
              </Status>
              <div className="grid grid-cols-2 gap-2">
                <Button size="lg" variant="outline" onClick={test} isLoading={pending}>
                  <Send className="h-4 w-4" aria-hidden />
                  Send a test
                </Button>
                <Button size="lg" variant="ghost" onClick={turnOff} disabled={pending}>
                  Turn off
                </Button>
              </div>
            </>
          ) : (
            <>
              <Status icon={<BellOff className="h-5 w-5" aria-hidden />} title="Off for this phone">
                Your phone will ask you to allow notifications. Tap Allow.
              </Status>
              <Button size="xl" block onClick={turnOn} isLoading={pending}>
                <BellRing className="h-5 w-5" aria-hidden />
                Turn on notifications
              </Button>
            </>
          )}
          {message && (
            <p className={message.tone === "ok" ? "text-sm text-success-strong" : "text-sm text-danger"} role="status">
              {message.text}
            </p>
          )}
        </Card>
        <p className="text-xs text-text-secondary">Using another phone too? Turn it on there as well.</p>
      </section>
    </div>
  );
}

function Status({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">{icon}</span>
      <span className="min-w-0">
        <span className="block text-base font-semibold text-text-primary">{title}</span>
        <span className="block text-sm text-text-body">{children}</span>
      </span>
    </div>
  );
}
