"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/email";
import { setPassword, type SetPasswordState } from "./actions";

export function SetPasswordForm({ fromSettings }: { fromSettings: boolean }) {
  const [state, action, pending] = useActionState<SetPasswordState, FormData>(setPassword, {});
  return (
    <form action={action} className="flex flex-1 flex-col gap-4" noValidate>
      {fromSettings && <input type="hidden" name="from" value="settings" />}
      <Field
        label="New password"
        htmlFor="password"
        error={state.error}
        hint={`At least ${MIN_PASSWORD_LENGTH} characters, with letters and numbers`}
      >
        <PasswordInput id="password" name="password" autoComplete="new-password" hasError={Boolean(state.error)} />
      </Field>
      {state.formError && (
        <p className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-3 text-sm text-danger" role="alert">
          {state.formError}
        </p>
      )}
      {state.done && (
        <p
          className="flex items-center gap-2 rounded-[10px] border border-success-border bg-success-bg px-3.5 py-3 text-sm text-success-strong"
          role="status"
        >
          <CircleCheck className="h-4 w-4 shrink-0" aria-hidden />
          Password saved.
        </p>
      )}
      <div className="mt-auto space-y-2 pt-6">
        <Button type="submit" size="xl" block isLoading={pending}>
          {pending ? "Saving…" : "Save password"}
        </Button>
        {fromSettings && (
          <Button asChild variant="ghost" size="lg" block>
            <Link href="/settings">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to Settings
            </Link>
          </Button>
        )}
      </div>
    </form>
  );
}
