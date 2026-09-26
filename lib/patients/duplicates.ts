/**
 * "Rahul Sharma already uses this number — same person?" on New Patient.
 * A gentle hint, never a block: families often share one phone.
 */
export type SamePhonePatient = { id: string; fullName: string };

export function samePhoneHint(matches: SamePhonePatient[]): { text: string; openLabel: string } | null {
  if (matches.length === 0) return null;
  const first = matches[0]!;
  const firstName = first.fullName.trim().split(/\s+/)[0] ?? first.fullName;
  const others = matches.length - 1;
  const who =
    others === 0 ? first.fullName : others === 1 ? `${first.fullName} and 1 other patient` : `${first.fullName} and ${others} other patients`;
  return {
    text: `${who} already ${others === 0 ? "uses" : "use"} this number — same person?`,
    openLabel: `Open ${firstName}`,
  };
}
