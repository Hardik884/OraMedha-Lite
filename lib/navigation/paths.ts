/**
 * URLs of the screens, built in one place so links and redirects agree.
 */
export type BackTo = "today" | "patients";

export function patientPath(patientId: string, opts: { caseId?: string; from?: BackTo } = {}): string {
  const params = new URLSearchParams();
  if (opts.caseId) params.set("case", opts.caseId);
  if (opts.from) params.set("from", opts.from);
  const query = params.toString();
  return `/patients/${patientId}${query ? `?${query}` : ""}`;
}

export function schedulePath(patientId: string, caseId: string, opts: { isNew?: boolean } = {}): string {
  return `/patients/${patientId}/cases/${caseId}/schedule${opts.isNew ? "?new=1" : ""}`;
}

export function newCasePath(patientId: string): string {
  return `/patients/${patientId}/cases/new`;
}

export const NEW_PATIENT_PATH = "/patients/new";

/** Where the back arrow on the patient screen goes. */
export function backHrefFor(from: string | null | undefined): string {
  return from === "today" ? "/today" : "/patients";
}
