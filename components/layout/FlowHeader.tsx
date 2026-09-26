import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * FlowHeader — top bar for screens that open ON TOP of a tab (patient,
 * new patient, scheduling): a back arrow, a title and an optional line under
 * it.
 *
 * Back is either an explicit link (`backHref`) — not history.back(), so it
 * still works when the screen was opened directly — or, inside a multi-step
 * form, an `onBack` handler that returns to the previous step without losing
 * what was typed.
 */
type Back = { backHref: string; onBack?: never } | { onBack: () => void; backHref?: never };

export function FlowHeader({
  backLabel = "Back",
  title,
  subtitle,
  right,
  ...back
}: Back & {
  backLabel?: string;
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-md pt-safe px-safe">
      <div className="mx-auto flex min-h-appbar max-w-lg items-center gap-1 px-2">
        {back.onBack ? (
          <Button variant="ghost" size="icon-lg" aria-label={backLabel} onClick={back.onBack}>
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </Button>
        ) : (
          <Button asChild variant="ghost" size="icon-lg" aria-label={backLabel}>
            <Link href={back.backHref!}>
              <ArrowLeft className="h-5 w-5" aria-hidden />
            </Link>
          </Button>
        )}
        <div className="min-w-0 flex-1 py-2">
          {title && (
            <p className="truncate text-base font-semibold leading-tight text-text-primary">{title}</p>
          )}
          {subtitle && <p className="truncate text-sm leading-tight text-text-secondary">{subtitle}</p>}
        </div>
        {right}
      </div>
    </header>
  );
}
