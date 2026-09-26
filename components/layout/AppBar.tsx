import Link from "next/link";
import { OraMedhaLogo } from "@/components/shared/OraMedhaLogo";

/**
 * AppBar — the slim top bar: the OraMedha Lite lockup on the left, room on the
 * right for the profile/settings entry (Slice 3). Clears the notch via the
 * safe-area inset.
 */
export function AppBar({ right }: { right?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-md pt-safe px-safe">
      <div className="mx-auto flex h-appbar max-w-lg items-center justify-between gap-3 px-4">
        <Link
          href="/today"
          aria-label="OraMedha Lite — Today"
          className="-mx-1 flex h-11 items-center rounded-lg px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <OraMedhaLogo size={20} withWordmark />
        </Link>
        {right}
      </div>
    </header>
  );
}
