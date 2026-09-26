"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type DialogSize = "sm" | "md" | "lg";

const SIZE_CLASSES: Record<DialogSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-2xl",
};

interface DialogProps {
  open: boolean;
  onClose: () => void;
  /** Optional dialog title rendered in the header. */
  title?: string;
  /** Optional subtitle rendered under the title. */
  description?: string;
  children: ReactNode;
  /** Width on tablet/desktop. On a phone the dialog is always full width. */
  size?: DialogSize;
  /**
   * When true, the dialog is "busy" (e.g. saving). Backdrop taps and the
   * Escape key are ignored, and the close button is disabled, so an in-flight
   * save cannot be interrupted by an accidental close.
   */
  busy?: boolean;
  /** Hide the header entirely (no title bar / close button). */
  hideHeader?: boolean;
  /** Optional pinned footer (e.g. the primary action), kept in thumb reach. */
  footer?: ReactNode;
}

/**
 * Dialog
 *
 * The main OraMedha app's modal, adapted for a phone held in one hand:
 *   - On phones it is a BOTTOM SHEET: anchored to the bottom edge, full width,
 *     rounded top corners, clear of the home indicator (safe area). The close
 *     button and actions sit where the thumb already is.
 *   - From `sm` up it is the main app's centred modal.
 *   - Focus trap + focus restoration, Escape and backdrop to close (disabled
 *     while `busy`), body scroll lock.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
  busy = false,
  hideHeader = false,
  footer,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Escape to close (ignored while busy)
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose, busy]);

  // Body scroll lock
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Focus management: move focus into the dialog on open, restore on close.
  // The panel itself takes focus rather than the first input, so opening a
  // sheet on a phone does not immediately throw up the keyboard.
  useEffect(() => {
    if (open) {
      previouslyFocused.current = document.activeElement as HTMLElement | null;
      const id = setTimeout(() => panelRef.current?.focus(), 50);
      return () => clearTimeout(id);
    }
    previouslyFocused.current?.focus?.();
  }, [open]);

  // Simple focus trap
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "Tab") return;
    const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables || focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title ?? "Dialog"}
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-scrim/45 backdrop-blur-[2px] animate-fade-in"
        onClick={() => !busy && onClose()}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          "relative z-10 w-full bg-surface border border-border shadow-xl outline-none",
          "flex flex-col overflow-hidden",
          // Phone: bottom sheet
          "rounded-t-2xl border-b-0 max-h-[92dvh] animate-sheet-up",
          // Tablet/desktop: centred modal
          "sm:rounded-xl sm:border-b sm:max-h-[90dvh] sm:animate-fade-in-up",
          SIZE_CLASSES[size]
        )}
      >
        {/* Grab handle — a visual cue that this is a sheet. */}
        <div className="flex justify-center pt-2 sm:hidden" aria-hidden="true">
          <div className="h-1 w-10 rounded-full bg-border-strong" />
        </div>

        {!hideHeader && (
          <div className="flex items-start justify-between gap-3 pl-4 pr-2 pt-2 pb-3 sm:px-6 sm:py-4 sm:pr-4 border-b border-border shrink-0">
            <div className="min-w-0 pt-2">
              {title && (
                <h2 className="text-base font-semibold text-text-primary">{title}</h2>
              )}
              {description && (
                <p className="text-sm text-text-secondary mt-0.5">{description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              aria-label="Close"
              className="flex h-11 w-11 items-center justify-center rounded-[10px] text-text-secondary hover:text-text-primary hover:bg-surface-muted active:bg-border transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>

        {footer ? (
          <div className="shrink-0 border-t border-border bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-4">
            {footer}
          </div>
        ) : (
          <div className="shrink-0 pb-safe sm:pb-0" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
