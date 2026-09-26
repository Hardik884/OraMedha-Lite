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

/**
 * Update Visit (and editing today's visit) for one case. `date` records a
 * forgotten visit from an earlier day (up to 7 days back).
 */
export function visitPath(patientId: string, caseId: string, opts: { date?: string } = {}): string {
  return `/patients/${patientId}/cases/${caseId}/visit${opts.date ? `?date=${opts.date}` : ""}`;
}

/** "Visit updated" — what just happened. */
export function visitUpdatedPath(patientId: string, caseId: string, opts: { date?: string } = {}): string {
  return `/patients/${patientId}/cases/${caseId}/visit/updated${opts.date ? `?date=${opts.date}` : ""}`;
}

/** All files of one case (mockup screen 8); `file` opens one straight away. */
export function filesPath(patientId: string, caseId: string, opts: { fileId?: string } = {}): string {
  return `/patients/${patientId}/cases/${caseId}/files${opts.fileId ? `?file=${opts.fileId}` : ""}`;
}

/** Opens a file's bytes through a short-lived signed link. */
export function fileContentPath(fileId: string, opts: { download?: boolean } = {}): string {
  return `/api/files/${fileId}${opts.download ? "?download=1" : ""}`;
}

/** After booking: the appointment, with "Send to patient on WhatsApp". */
export function bookedPath(patientId: string, appointmentId: string, opts: { rescheduled?: boolean; isNew?: boolean } = {}): string {
  const params = new URLSearchParams();
  if (opts.rescheduled) params.set("rescheduled", "1");
  if (opts.isNew) params.set("new", "1");
  const query = params.toString();
  return `/patients/${patientId}/appointments/${appointmentId}${query ? `?${query}` : ""}`;
}

/** Choose a new time for an appointment (the slot finder suggests one). */
export function reschedulePath(patientId: string, appointmentId: string): string {
  return `/patients/${patientId}/appointments/${appointmentId}/reschedule`;
}

/** The logbook, optionally already filtered (the same query the exports take). */
export const LOGBOOK_PATH = "/progress/logbook";
export function logbookPath(query: Record<string, string | null | undefined> = {}): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v) params.set(k, v);
  const q = params.toString();
  return `${LOGBOOK_PATH}${q ? `?${q}` : ""}`;
}
