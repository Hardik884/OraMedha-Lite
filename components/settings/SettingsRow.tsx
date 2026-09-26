import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

/** A row in the Settings list: icon, title, one-line summary, chevron. */
export function SettingsRow({
  href,
  icon: Icon,
  title,
  summary,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  summary?: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 px-4 py-3.5 active:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-text-primary">{title}</span>
          {summary && <span className="block text-sm text-text-secondary">{summary}</span>}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-text-disabled" aria-hidden />
      </Link>
    </li>
  );
}

/** A titled group of settings rows. */
export function SettingsGroup({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      {title && <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-text-secondary">{title}</h2>}
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-xs">{children}</div>
    </section>
  );
}
