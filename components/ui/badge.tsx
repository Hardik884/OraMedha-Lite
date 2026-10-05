import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "default"
  | "secondary"
  | "outline"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "accent";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default:   "bg-text-primary text-background",
  secondary: "bg-surface-muted text-text-primary",
  outline:   "border border-border text-text-secondary bg-transparent",
  accent:    "bg-accent-soft text-accent-hover border border-accent-soft-border",
  // Resident: the stronger green, so "Completed" / "Confirmed" read at 4.5:1+ (plain success green is 3.2:1 on its tint).
  success:   "bg-success-bg text-success-strong border border-success-border",
  warning:   "bg-warning-bg text-warning border border-warning-border",
  danger:    "bg-danger-bg text-danger border border-danger-border",
  info:      "bg-info-bg text-info border border-info-border",
};

/**
 * Badge — status chip. Slightly taller than the main app's (py-1) so a chip
 * next to a patient row stays readable at arm's length on a phone.
 */
export function Badge({ variant = "secondary", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium leading-none whitespace-nowrap",
        "[&_svg]:h-3 [&_svg]:w-3 [&_svg]:shrink-0",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
