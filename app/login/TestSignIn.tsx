"use client";

import { useActionState } from "react";
import { FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { testSignIn, type TestSignInState } from "./test-actions";

/**
 * Local test server only: sign in as a throwaway test PG without Google.
 * The login page renders this only when lib/auth/test-sign-in.ts allows it,
 * and the action checks again.
 */
export function TestSignIn({ next }: { next: string }) {
  const [state, action, pending] = useActionState<TestSignInState, FormData>(testSignIn, {});
  return (
    <form
      action={action}
      className="mt-6 space-y-3 rounded-xl border border-dashed border-warning-border bg-warning-bg p-4"
      data-test-sign-in
    >
      <p className="flex items-center gap-2 text-sm font-semibold text-warning-strong">
        <FlaskConical className="h-4 w-4" aria-hidden />
        Local test sign-in
      </p>
      <p className="text-xs text-text-body">
        Only on the local test server, against the local database. A new address creates a new test PG.
      </p>
      <input type="hidden" name="next" value={next} />
      <Field label="Test email" htmlFor="test-email" error={state.error}>
        <Input
          id="test-email"
          name="email"
          type="email"
          autoComplete="off"
          defaultValue="pg1@oramedha.test"
          hasError={Boolean(state.error)}
        />
      </Field>
      <Button type="submit" variant="outline" size="lg" block isLoading={pending}>
        Sign in as test PG
      </Button>
    </form>
  );
}
