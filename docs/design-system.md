# OraMedha - Resident — Design System

OraMedha - Resident is a sister product of **OraMedha**, our main dental practice management system (PMS). Resident must look and feel like part of the same family: same colours, same font, same components, same light/dark behaviour. A dentist who uses both should feel they are in one brand.

The source of truth is the reference kit in `docs/oramedha-design/`. These files are copied from the main OraMedha app. **Reuse them. Do not invent a new palette or new component styles.**

## About the mockups (`docs/screens.jpeg`)

The mockups show **layout, flow and what information goes on each screen**. They are NOT the visual design.

- Use them for: which screens exist, what is on each screen, the order of steps, and where the main action sits.
- Ignore them for: colours (the bright blue), fonts, button styles, card styles, icons, spacing.
- Where the mockups and this document disagree on looks, this document wins.
- If a mockup layout clearly hurts usability on a phone, say so and propose a better one.

Example: the mockup's "Update Today's Visit" button is bright blue. In Resident it is the OraMedha primary `Button` (emerald `bg-accent`), made taller for thumbs.

## What to reuse from the kit

| Kit file | What it gives you |
|---|---|
| `app/globals.css` | All colour, radius and shadow tokens (Tailwind v4 `@theme`), plus the full dark theme. Copy it as the base of Resident's `globals.css`. Remove sections Resident doesn't use (dental chart, heatmap, business-brain severity, KPI tones) only if they add noise. |
| `app/layout.tsx` | Geist + Geist Mono fonts, theme-init script (no flash of wrong theme), `themeColor` for mobile browser bars. |
| `components/ui/*` | Button, Badge, Card, Input, Field, Label, Select, Dialog, Textarea, Skeleton, Separator, EmptyState. Copy them and adapt. |
| `components/shared/SegmentedTabs.tsx` | Use for Today / Pending tabs, Ongoing / Completed, file filters. |
| `components/shared/*StatusBadge.tsx` | Pattern for appointment status chips (Confirmed, Unconfirmed, Missed…). |
| `components/shared/PatientAvatar.tsx` | Patient initials avatar. |
| `components/shared/ThemeToggle.tsx`, `components/providers/ThemeProvider.tsx`, `lib/theme/*` | Light / Dark / System theme switching. |
| `components/shared/DentGrowLogo.tsx`, `lib/brand/mark.ts`, `public/brand/oramedha-mark.png`, `app/icon.*` | The OraMedha logo mark and favicons. The logo is drawn via a CSS mask so it follows the theme. |

The components depend on `cn()` from `@/lib/utils` (clsx + tailwind-merge), `@radix-ui/react-slot`, and `lucide-react` for icons. Add those to Resident.

## Core look (quick summary)

- **Font:** Geist (sans), Geist Mono for numbers where alignment matters.
- **Page background:** `bg-background` (#F6F8F6, soft grey-green). **Cards:** `bg-surface` (white) with `border-border`, `rounded-xl`, very soft shadow.
- **Brand accent:** emerald `accent` (#0D6B5E). Use it sparingly: primary buttons, active tab, selected option, links. Never as a big background wash.
- **Text ramp:** `text-text-primary` → `text-text-strong` → `text-text-body` → `text-text-secondary`.
- **Status colours:** `success` (Confirmed, Completed), `warning` (Unconfirmed, Pending), `danger` (Missed, Cancelled), `info` (neutral notices). Use the `Badge` variants, not custom colours.
- **Dark mode:** supported from day one. Always use token classes (`bg-surface`, `text-text-primary`…), never raw hex values or Tailwind palette colours like `bg-blue-600`. Then dark mode works for free.
- **Icons:** lucide-react only.

## What changes for Resident (mobile-first)

The main OraMedha app is desktop/tablet-first. Resident is phone-first, used one-handed in a busy OPD. Keep the same look, but adjust sizes:

- **Tap targets at least 44px tall.** Main actions (Update Visit, Next, Confirm & Schedule) use a full-width button about 48px tall (`h-12`). Add a Resident size (e.g. `size="xl"`) to `Button` rather than overriding classes on every screen.
- **Choice lists** (stages, case types) are full-width rows at least 48px tall, with a clear selected state: `bg-accent-soft` + `border-accent-soft-border` + emerald text or a check icon.
- **Inputs** at least 44px tall, 16px text (prevents iOS zoom on focus).
- **Bottom navigation** for Today / Patients / Progress, with the active tab in emerald.
- **Primary action pinned** near the bottom of the screen, within thumb reach.
- Respect safe areas (`env(safe-area-inset-bottom)`) for the bottom nav and pinned buttons.
- Keep the calm, restrained feel of OraMedha: soft shadows, lots of white space, no gradients, no loud colours.

## Rules

1. Before creating a component, check whether the kit already has one.
2. No raw hex colours or Tailwind palette colours in components. Tokens only.
3. If you need a new token, add it to `globals.css` in both light and dark themes, following the kit's comments.
4. Keep the product name as **OraMedha - Resident** in titles, the app manifest and the login screen, with the OraMedha mark.
5. `docs/oramedha-design/` is read-only reference. Copy from it into the app; don't import from it and don't edit it.
