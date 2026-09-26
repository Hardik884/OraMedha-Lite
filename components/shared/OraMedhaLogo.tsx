import { MARK_ASPECT, MARK_SRC } from "@/lib/brand/mark";

/**
 * OraMedhaLogo — the OraMedha mark, with an optional "OraMedha Lite" wordmark.
 * (DentGrowLogo in the main app.)
 *
 * `size` is the mark's HEIGHT; width follows from MARK_ASPECT (~2:1).
 *
 * The mark is painted with `background-color` through a CSS mask rather than
 * drawn as an <img>, so one black PNG follows the theme:
 *   `themed` (default) — `--text-primary`: near-black on light, near-white on dark.
 *   `mono` — `currentColor`, for a painted surface that sets its own colour.
 */

/** Wordmark font-size as a fraction of the mark's height (main app value). */
const WORDMARK_RATIO = 0.78;
/** Gap between mark and wordmark, as a fraction of the wordmark's font size. */
const LOCKUP_GAP_RATIO = 0.5;

interface OraMedhaLogoProps {
  /** HEIGHT of the mark in px; width follows from MARK_ASPECT. Default: 28. */
  size?: number;
  /** Render the "OraMedha Lite" wordmark beside the mark. Default: false. */
  withWordmark?: boolean;
  /** `themed` for a normal surface, `mono` for a painted brand surface. */
  variant?: "themed" | "mono";
  className?: string;
}

export function OraMedhaLogo({
  size = 28,
  withWordmark = false,
  variant = "themed",
  className,
}: OraMedhaLogoProps) {
  const fontSize = Math.round(size * WORDMARK_RATIO);
  const paint = variant === "mono" ? "currentColor" : "var(--text-primary)";

  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: Math.round(fontSize * LOCKUP_GAP_RATIO),
      }}
    >
      <span
        role="img"
        aria-label={withWordmark ? undefined : "OraMedha Lite"}
        aria-hidden={withWordmark || undefined}
        style={{
          width: Math.round(size * MARK_ASPECT),
          height: size,
          flexShrink: 0,
          display: "block",
          backgroundColor: paint,
          WebkitMaskImage: `url("${MARK_SRC}")`,
          maskImage: `url("${MARK_SRC}")`,
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
          // `contain`: the mark must never be cropped.
          WebkitMaskSize: "contain",
          maskSize: "contain",
        }}
      />

      {withWordmark && (
        <span
          style={{
            fontSize,
            fontWeight: 600,
            letterSpacing: "-0.025em",
            color: paint,
            lineHeight: 1,
            userSelect: "none",
            whiteSpace: "nowrap",
          }}
        >
          OraMedha
          {/* "Lite" is quieter than the parent brand, never a second colour. */}
          <span
            style={{
              fontWeight: 500,
              marginLeft: "0.28em",
              color: variant === "mono" ? "currentColor" : "var(--text-secondary)",
            }}
          >
            Lite
          </span>
        </span>
      )}
    </div>
  );
}
