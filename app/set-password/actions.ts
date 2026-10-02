"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { emailAuthError, validateNewPassword } from "@/lib/auth/email";
import { HOME_PATH, LOGIN_PATH } from "@/lib/auth/routes";

export type SetPasswordState = { error?: string; formError?: string; done?: boolean };

/** Sets a new password for the signed-in PG (after a reset link, or from Settings). */
export async function setPassword(_prev: SetPasswordState, formData: FormData): Promise<SetPasswordState> {
  const raw = formData.get("password");
  const password = typeof raw === "string" ? raw : "";
  const invalid = validateNewPassword(password);
  if (invalid) return { error: invalid };

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(LOGIN_PATH);

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    const message = emailAuthError(error.code, error.message);
    return error.code === "weak_password" || error.code === "same_password" ? { error: message } : { formError: message };
  }
  if (formData.get("from") === "settings") return { done: true };
  redirect(HOME_PATH);
}
