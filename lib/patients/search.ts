/**
 * Patients search.
 *
 * The search runs ON THE PHONE over the PG's own patient list, never through a
 * URL: a query in the address bar would put patient names in the browser
 * history and in the server's request logs.
 *
 * parsePatientSearch decides what kind of search the PG meant (digits → phone
 * or OPD number, words → name or OPD). Punctuation is stripped — nobody
 * searches a patient list for it.
 */
export type PatientSearch =
  | { kind: "all" }
  | { kind: "digits"; digits: string }
  | { kind: "text"; text: string };

export function parsePatientSearch(input: string | null | undefined): PatientSearch {
  const cleaned = (input ?? "")
    .replace(/[,()"'\\%_*:]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50);
  if (!cleaned) return { kind: "all" };

  // "98765 43210" or "+91 98765…" → search phone/OPD by digits.
  const digitsOnly = cleaned.replace(/[\s+\-.]/g, "");
  if (/^\d+$/.test(digitsOnly)) {
    const digits = digitsOnly.length > 10 && digitsOnly.startsWith("91") ? digitsOnly.slice(2) : digitsOnly;
    return { kind: "digits", digits };
  }
  return { kind: "text", text: cleaned };
}

export type SearchablePatient = { fullName: string; phone: string; opdNumber: string | null };

export function filterPatients<T extends SearchablePatient>(patients: T[], query: string): T[] {
  const search = parsePatientSearch(query);
  if (search.kind === "all") return patients;

  if (search.kind === "digits") {
    return patients.filter(
      (p) => p.phone.includes(search.digits) || (p.opdNumber ?? "").includes(search.digits),
    );
  }

  // Every word must match the start of a word in the name, or the OPD number.
  const words = search.text.toLowerCase().split(" ");
  return patients.filter((p) => {
    const nameWords = p.fullName.toLowerCase().split(/\s+/);
    const opd = (p.opdNumber ?? "").toLowerCase();
    return words.every((w) => nameWords.some((n) => n.startsWith(w)) || opd.includes(w));
  });
}
