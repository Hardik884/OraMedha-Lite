"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useBrowserSupabaseClient } from "@/lib/supabase/client";
import { friendlyAuthError } from "@/lib/auth/errors";
import { cleanOtp, formatIndianMobile, OTP_LENGTH, parseIndianMobile } from "@/lib/auth/phone";

/** Seconds before "Send a new code" is offered. */
const RESEND_AFTER_S = 30;

type Step = { kind: "phone" } | { kind: "code"; e164: string; national: string };

/**
 * Phone-OTP sign-in in two steps: number → code. Everything the PG types is
 * digits, so both fields open the numeric keypad, and the code field accepts
 * the SMS auto-fill that Android and iOS offer.
 */
export function LoginForm({ next }: { next: string }) {
  const supabase = useBrowserSupabaseClient();
  const router = useRouter();

  const [step, setStep] = useState<Step>({ kind: "phone" });
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  useEffect(() => {
    if (step.kind === "code") codeRef.current?.focus();
  }, [step.kind]);

  async function sendCode(e164: string, national: string) {
    setBusy(true);
    setError(null);
    const { error: sendError } = await supabase.auth.signInWithOtp({ phone: e164 });
    setBusy(false);
    if (sendError) {
      setError(friendlyAuthError(sendError.message));
      return;
    }
    setStep({ kind: "code", e164, national });
    setCode("");
    setResendIn(RESEND_AFTER_S);
  }

  async function onSubmitPhone(event: React.FormEvent) {
    event.preventDefault();
    const parsed = parseIndianMobile(phone);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    await sendCode(parsed.e164, parsed.national);
  }

  async function verify(token: string) {
    if (step.kind !== "code" || busy) return;
    setBusy(true);
    setError(null);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone: step.e164,
      token,
      type: "sms",
    });
    if (verifyError) {
      setBusy(false);
      setError(friendlyAuthError(verifyError.message));
      return;
    }
    // Stay busy through the navigation so the button can't be tapped twice.
    router.replace(next);
    router.refresh();
  }

  function onCodeChange(value: string) {
    const cleaned = cleanOtp(value);
    setCode(cleaned);
    setError(null);
    // Submit as soon as the last digit lands (including SMS auto-fill).
    if (cleaned.length === OTP_LENGTH) void verify(cleaned);
  }

  if (step.kind === "phone") {
    return (
      <form onSubmit={onSubmitPhone} className="flex flex-1 flex-col" noValidate>
        <Field label="Mobile number" htmlFor="phone" error={error ?? undefined}>
          <div className="flex gap-2">
            <span
              className="flex h-11 shrink-0 items-center rounded-[10px] border border-border bg-surface-muted px-3.5 text-base text-text-body"
              aria-hidden="true"
            >
              +91
            </span>
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="98765 43210"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setError(null);
              }}
              hasError={Boolean(error)}
              aria-label="Mobile number, without +91"
              autoFocus
            />
          </div>
        </Field>

        <div className="mt-auto pt-8">
          <Button type="submit" size="xl" block isLoading={busy}>
            {busy ? "Sending code…" : "Send code"}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (code.length === OTP_LENGTH) void verify(code);
        else setError(`Enter the ${OTP_LENGTH}-digit code`);
      }}
      className="flex flex-1 flex-col"
      noValidate
    >
      <p className="mb-6 text-base text-text-body">
        Code sent to{" "}
        <span className="font-medium text-text-primary tabular-nums">
          +91 {formatIndianMobile(step.national)}
        </span>
      </p>

      <Field label="6-digit code" htmlFor="otp" error={error ?? undefined}>
        <Input
          ref={codeRef}
          id="otp"
          name="otp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={OTP_LENGTH}
          placeholder="••••••"
          value={code}
          onChange={(e) => onCodeChange(e.target.value)}
          hasError={Boolean(error)}
          className="h-14 text-center text-2xl font-semibold tracking-[0.5em] tabular-nums"
        />
      </Field>

      <div className="mt-4 flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="-ml-3"
          onClick={() => {
            setStep({ kind: "phone" });
            setError(null);
          }}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Change number
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="-mr-3"
          disabled={resendIn > 0 || busy}
          onClick={() => void sendCode(step.e164, step.national)}
        >
          {resendIn > 0 ? `Resend in ${resendIn}s` : "Send a new code"}
        </Button>
      </div>

      <div className="mt-auto pt-8">
        <Button type="submit" size="xl" block isLoading={busy}>
          {busy ? "Checking…" : "Sign in"}
        </Button>
      </div>
    </form>
  );
}
