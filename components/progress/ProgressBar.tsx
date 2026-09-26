import { cn } from "@/lib/utils";

/** A thin bar; green once a target is reached. */
export function ProgressBar({ fraction, reached = false, className }: { fraction: number; reached?: boolean; className?: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, fraction)) * 100);
  return (
    <span
      className={cn("block h-2 overflow-hidden rounded-full bg-surface-muted", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <span
        className={cn("block h-full rounded-full transition-[width] duration-300", reached ? "bg-success" : "bg-accent")}
        style={{ width: `${pct}%` }}
      />
    </span>
  );
}
