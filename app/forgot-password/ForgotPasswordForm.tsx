"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LOGIN_PATH } from "@/lib/auth/routes";
import { sendResetLink, type EmailFormState } from "@/app/login/email-actions";
import { APP_NAME } from "@/lib/brand/name";

/**
 * Email → a reset link. The answer is the same whether or not the email has
 * an account. Also how a PG who signed up with Google adds a password.
 */
export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<EmailFormState, FormData>(sendResetLink, {});
  return (
    <form action={action} className="flex flex-1 flex-col gap-4" noValidate>
      <Field label="Email" htmlFor="email" error={state.errors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="name@gmail.com"
          defaultValue={state.email}
          hasError={Boolean(state.errors?.email)}
        />
      </Field>
      {state.formError && (
        <p className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-3 text-sm text-danger" role="alert">
          {state.formError}
        </p>
      )}
      {state.sentTo && (
        <div className="flex gap-3 rounded-xl border border-success-border bg-success-bg p-4" role="status">
          <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-success-strong" aria-hidden />
          <p className="text-sm text-text-body">
            If <span className="font-medium text-text-primary">{state.sentTo}</span> has an {APP_NAME} account, a
            link is on its way. Open it on this phone. It can take a minute; check Spam too.
          </p>
        </div>
      )}
      <Button type="submit" size="xl" block isLoading={pending}>
        {pending ? "Sending…" : state.sentTo ? "Send again" : "Send link"}
      </Button>
      <Button asChild variant="ghost" size="lg" className="-ml-3 self-start">
        <Link href={LOGIN_PATH}>
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to sign in
        </Link>
      </Button>
    </form>
  );
}
