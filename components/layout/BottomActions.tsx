import { cn } from "@/lib/utils";

/**
 * BottomActions — the primary action pinned where the thumb rests
 * (design-system.md → "Primary action pinned near the bottom").
 *
 * `aboveNav` sits it on top of the tab bar; otherwise it hugs the bottom edge,
 * clear of the home indicator. The page must leave room for it: `pb-nav-action`
 * on tab pages, `pb-32` on flow pages.
 */
export function BottomActions({
  children,
  aboveNav = false,
  className,
}: {
  children: React.ReactNode;
  aboveNav?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 z-30 px-safe",
        aboveNav
          ? "bottom-[calc(var(--spacing-nav)+env(safe-area-inset-bottom))] pb-3"
          : "bottom-0 border-t border-border bg-background/95 backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3",
        className,
      )}
    >
      <div className="mx-auto flex max-w-lg flex-col gap-2 px-4">{children}</div>
    </div>
  );
}
