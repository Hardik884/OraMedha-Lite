/**
 * After a successful save, a server action moves the PG on with Next.js's
 * redirect() (or notFound()). On the phone that arrives as a thrown signal,
 * not a failure: a catch block that treats every throw as "no internet"
 * would flash "Couldn't reach OraMedha" for a moment before the next screen
 * opens. Every catch around a server action checks this first and lets the
 * navigation happen.
 */
export function isNavigationSignal(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("digest" in error)) return false;
  const digest = String((error as { digest: unknown }).digest);
  return digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK") || digest === "NEXT_NOT_FOUND";
}
