import { APP_NAME } from "@/lib/brand/name";
import Link from "next/link";
import { OraMedhaLogo } from "@/components/shared/OraMedhaLogo";

/**
 * LegalPage — the public Privacy and Terms pages: readable on a phone,
 * reachable without signing in, linked from the login screen.
 */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-2xl bg-background px-5 pt-safe pb-safe">
      <div className="pt-8 pb-6">
        <Link href="/login" aria-label={`${APP_NAME}, sign in`} className="inline-flex">
          <OraMedhaLogo size={24} withWordmark />
        </Link>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-text-primary">{title}</h1>
      <p className="mt-1 text-sm text-text-secondary">Last updated {updated}</p>
      <div className="mt-6 space-y-6 pb-12 text-base leading-relaxed text-text-body">{children}</div>
      <LegalLinks className="border-t border-border py-6" />
    </main>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
      {children}
    </section>
  );
}

export function LegalList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

/** "Privacy · Terms" — on the login screen and at the foot of each legal page. */
export function LegalLinks({ className }: { className?: string }) {
  const link =
    "inline-flex h-11 items-center rounded-lg px-2 text-sm text-text-secondary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";
  return (
    <nav aria-label="Legal" className={className}>
      <div className="flex items-center justify-center gap-1">
        <Link href="/privacy" className={link}>
          Privacy policy
        </Link>
        <span className="text-text-disabled" aria-hidden>
          ·
        </span>
        <Link href="/terms" className={link}>
          Terms of service
        </Link>
      </div>
    </nav>
  );
}
