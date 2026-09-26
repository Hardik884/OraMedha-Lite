import type { FileKind } from "./rules";

/**
 * One-tap label suggestions. Clinical names come from the case's template
 * (its stage names) — never from code. The generic ones apply to any
 * specialty.
 */
export const GENERIC_LABELS: { image: string[]; document: string[] } = {
  image: ["Pre-op", "Post-op", "Follow-up"],
  document: ["Consent form", "Report", "Case presentation"],
};

export const MAX_LABEL_LENGTH = 120;
const MAX_SUGGESTIONS = 8;

export function labelSuggestions({ kind, stageNames }: { kind: FileKind; stageNames: string[] }): string[] {
  const generic = kind === "document" ? GENERIC_LABELS.document : GENERIC_LABELS.image;
  const stages = kind === "document" ? [] : stageNames;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of [...stages, ...generic]) {
    const label = raw.trim();
    const key = label.toLowerCase();
    if (!label || seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  // Keep the generic labels visible even when a template has many stages.
  const stageCount = Math.max(0, MAX_SUGGESTIONS - generic.length);
  const fromStages = out.filter((l) => !generic.includes(l)).slice(0, stageCount);
  return [...fromStages, ...generic.filter((g) => out.includes(g))];
}

export function normaliseLabel(value: string | null | undefined): string | null {
  const label = (value ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_LABEL_LENGTH);
  return label || null;
}
