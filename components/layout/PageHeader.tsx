import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  /** A short line under the title, e.g. today's date. */
  subtitle?: string;
  /** Optional action on the right (kept small; main actions go at the bottom). */
  action?: React.ReactNode;
  className?: string;
}

/** The large title at the top of a tab screen. */
export function PageHeader({ title, subtitle, action, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-end justify-between gap-3 pt-5 pb-4", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary leading-tight">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
