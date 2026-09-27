import { cn } from "@/lib/utils";

interface PatientAvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-lg",
};

/**
 * Identity palette — a patient always gets the same swatch, derived from their
 * name. Deliberately quiet: these are background chips behind two initials, not
 * status indicators. Each entry pairs a status tint with its own text colour so
 * the pair stays legible in either theme.
 */
const PALETTES = [
  "bg-surface-muted text-text-body",
  "bg-info-bg text-info",
  "bg-success-bg text-success-strong",
  "bg-warning-bg text-warning",
  "bg-danger-bg text-danger",
  "bg-accent-soft text-accent",
  "bg-accent-subtle-bg text-accent-hover",
];

export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function PatientAvatar({ name, size = "md", className }: PatientAvatarProps) {
  // Deterministic palette selection from name
  const idx =
    name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % PALETTES.length;
  const palette = PALETTES[idx]!;

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-medium shrink-0",
        SIZE_CLASSES[size],
        palette,
        className
      )}
      // The name is shown next to the avatar everywhere it is used, so the
      // initials are decoration for screen readers.
      aria-hidden="true"
    >
      {getInitials(name)}
    </div>
  );
}
