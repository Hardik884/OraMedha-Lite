"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/email";
import { FORGOT_PASSWORD_PATH } from "@/lib/auth/routes";
import {
  resendConfirmation,
  signInWithEmail,
  signUpWithEmail,
  type EmailFormState,
} from "./email-actions";

type Mode = "sign-in" | "sign-up";

/**
 * Email + password: sign in, or create an account (one tap switches). After
 * creating an account with email confirmation on, shows "check your inbox".
 */
export function EmailSignIn({ next }: { next: string }) {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [signInState, signIn, signingIn] = useActionState<EmailFormState, FormData>(signInWithEmail, {});
  const [signUpState, signUp, signingUp] = useActionState<EmailFormState, FormData>(signUpWithEmail, {});
  const [resendState, resend, resending] = useActionState<EmailFormState, FormData>(resendConfirmation, {});

  const state = mode === "sign-in" ? signInState : signUpState;
  const pending = mode === "sign-in" ? signingIn : signingUp;
  const sentTo = resendState.sentTo ?? signUpState.sentTo;

  if (mode === "sign-up" && signUpState.sentTo) {
    return <CheckInbox email={signUpState.sentTo} next={next} resend={resend} resending={resending} resendState={resendState} />;
  }

  return (
    <form action={mode === "sign-in" ? signIn : signUp} className="space-y-4" noValidate data-email-form={mode}>
      <input type="hidden" name="next" value={next} />
      <Field label="Email" htmlFor="email" error={state.errors?.email}>
        <Input
          key={`email-${mode}`}
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="name@gmail.com"
          defaultValue={state.email ?? signInState.email ?? signUpState.email}
          hasError={Boolean(state.errors?.email)}
        />
      </Field>
      <Field
        label={mode === "sign-in" ? "Password" : "Choose a password"}
        htmlFor="password"
        error={state.errors?.password}
        hint={mode === "sign-up" ? `At least ${MIN_PASSWORD_LENGTH} characters, with letters and numbers` : undefined}
      >
        <PasswordInput
          key={`password-${mode}`}
          id="password"
          name="password"
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          hasError={Boolean(state.errors?.password)}
        />
      </Field>

      {state.formError && (
        <p className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-3 text-sm text-danger" role="alert">
          {state.formError}
        </p>
      )}
      {mode === "sign-in" && signInState.canResend && !sentTo && (
        <Button
          type="submit"
          formAction={resend}
          variant="outline"
          size="lg"
          block
          isLoading={resending}
        >
          Send the confirmation email again
        </Button>
      )}
      {mode === "sign-in" && sentTo && (
        <p className="rounded-[10px] border border-success-border bg-success-bg px-3.5 py-3 text-sm text-success-strong" role="status">
          Sent. Open the link in the email, then sign in.
        </p>
      )}

      <Button type="submit" size="xl" block isLoading={pending}>
        {mode === "sign-in" ? (pending ? "Signing in…" : "Sign in") : pending ? "Creating account…" : "Create account"}
      </Button>

      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="-ml-3 text-accent"
          onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
        >
          {mode === "sign-in" ? "Create an account" : "I have an account"}
        </Button>
        {mode === "sign-in" && (
          <Link
            href={FORGOT_PASSWORD_PATH}
            className="-mr-2 inline-flex h-11 items-center rounded-lg px-2 text-sm font-medium text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Forgot password?
          </Link>
        )}
      </div>
    </form>
  );
}

function CheckInbox({
  email,
  next,
  resend,
  resending,
  resendState,
}: {
  email: string;
  next: string;
  resend: (formData: FormData) => void;
  resending: boolean;
  resendState: EmailFormState;
}) {
  return (
    <form action={resend} className="space-y-4" data-check-inbox>
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="next" value={next} />
      <div className="flex gap-3 rounded-xl border border-success-border bg-success-bg p-4" role="status">
        <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-success-strong" aria-hidden />
        <div className="space-y-1 text-sm text-text-body">
          <p className="font-semibold text-text-primary">Check your email</p>
          <p>
            We sent a link to <span className="font-medium text-text-primary">{email}</span>. Open it on this phone to
            finish creating your account. It can take a minute; check Spam too.
          </p>
        </div>
      </div>
      {resendState.formError && (
        <p className="text-sm text-danger" role="alert">
          {resendState.formError}
        </p>
      )}
      <Button type="submit" variant="outline" size="lg" block isLoading={resending}>
        {resendState.sentTo ? "Sent again" : "Send the email again"}
      </Button>
    </form>
  );
}
