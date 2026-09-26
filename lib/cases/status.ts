import type { BadgeVariant } from "@/components/ui/badge";

export const CASE_STATUSES = ["ongoing", "completed", "discontinued"] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

export function isCaseStatus(value: unknown): value is CaseStatus {
  return typeof value === "string" && (CASE_STATUSES as readonly string[]).includes(value);
}

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  ongoing: "Ongoing",
  completed: "Completed",
  discontinued: "Discontinued",
};

export const CASE_STATUS_VARIANTS: Record<CaseStatus, BadgeVariant> = {
  ongoing: "accent",
  completed: "success",
  discontinued: "secondary",
};

/** "46 · <case type name>" — how a case is named in lists and switchers. */
export function caseLabel(tooth: string | null, caseTypeName: string): string {
  return tooth ? `${tooth} · ${caseTypeName}` : caseTypeName;
}
