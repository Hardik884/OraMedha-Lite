# OraMedha - Resident

## What this is
OraMedha - Resident is a mobile-first app for dental postgraduate students (PGs). It helps a PG manage their patients, appointments, case progress, files and logbook in one place.

It is a sister product of **OraMedha**, our main dental practice management system (PMS) with advanced features. OraMedha - Resident (formerly "OraMedha Lite"; the repo and folder keep the old name) is a separate, lighter app, but it must look and feel like part of the OraMedha family (see Design below). The product docs in /docs say "OraMedha PG" — that is the same product as OraMedha - Resident.

**Product standard (drives every decision):**
> "I update what clinically happened. OraMedha handles everything around it."
> Not: "I now have another software system to maintain."

If a feature makes the PG type more, tap more, or remember more, it is probably wrong.

## The core loop
Patient added → appointment scheduled → patient informed → patient treated → visit updated → next step suggested → next appointment scheduled → files kept with the case → progress/logbook update automatically → repeat until case complete.

The PG mostly lives in three screens: **Today**, **Patient/Case**, **Update Visit**. Everything else should happen in the background.

## Specialty-agnostic core (important)
OraMedha is NOT endodontics-specific. The core app must work for any dental specialty (Endo, Prostho, Perio, Ortho, OMFS, Pedo, etc.).

- Never hard-code clinical words (like "BMP", "Obturation", "RCT") in components or logic.
- All clinical knowledge lives in **data**, as "procedure templates":
  - Specialty → Case types → ordered Stages
  - Each stage has: name, default duration (min), default gap to next visit (min–max days), and the usual next stage when Complete / when Partial
  - Optional modifiers (e.g. "Medicament placed: Calcium hydroxide") can override the gap or next step
- A PG can override any default in their own settings (e.g. "my crown prep takes 90 min").
- Specialty-specific screens come later. Build generic screens that read from templates.

Example of how the same generic engine handles two specialties:
- Endo · Primary RCT: Access opening → BMP → Obturation
- Prostho · Crown: Tooth preparation → Impression → Trial → Cementation

The engine only knows "current stage, Partial/Complete, modifier, PG defaults → next stage, gap, duration". It never knows what a crown is.

Seed data for v0.1 may include a few templates (e.g. Endo and Prostho) purely to prove the design is generic.

## Tech stack
- Next.js (App Router) + TypeScript (strict)
- Tailwind CSS v4 (same setup as OraMedha: tokens in globals.css via @theme)
- lucide-react icons, clsx + tailwind-merge (`cn()`), @radix-ui/react-slot
- Supabase: Postgres, Auth (open sign-up with Google — OAuth with PKCE via `/auth/callback` — or email + password; email links land on `/auth/confirm`), Storage (X-rays, photos, PDFs)
- Local testing never uses Google: `npm run dev:local` offers a local-only email test sign-in that refuses to exist against the hosted project (`lib/auth/test-sign-in.ts`).
- Vitest for tests
- Installable PWA (PGs open a link and "add to home screen")

## Data model principles
- Core tables: pg_profile, patient, case, visit, appointment, file, procedure_template (specialty / case type / stage / rule), pg_settings (availability, blocked times, overrides, reminder timing).
- **Logbook and progress counts are calculated from visits and cases, never stored or typed separately.** The PG must never re-enter data OraMedha already has.
- Files belong to a case and, when possible, to the visit/stage they were captured at.
- Every table is scoped to the logged-in PG (Supabase Row Level Security on all tables).
- Soft-delete only. Completed cases stay searchable forever.

## UX rules
- Design for a phone held in one hand, in a busy OPD. Big tap targets, minimal typing.
- Add Patient must be doable in under 30 seconds. Required fields only: name, phone, tooth, case type. OPD number and age are optional.
- Prefer taps (choice lists, Partial/Complete toggles) over free text.
- Today screen shows only what needs attention. No analytics dashboards.
- The app suggests; the PG confirms. The PG can always change the suggested date, duration or next step. Clinical judgment stays with the dentist.
- Product docs live in /docs. Follow them for flow and content.

## Design (important)
- **The mockups in /docs/screens.jpeg are NOT the final design.** Use them only for layout, flow and what information each screen shows. Ignore their colours (bright blue), fonts, button and card styles.
- The visual design must match our main product, **OraMedha**: same colour tokens (emerald accent, soft grey-green surfaces), Geist font, same components, light + dark mode.
- Read /docs/design-system.md before building any UI. It explains the rules and the mobile adjustments for Resident.
- /docs/oramedha-design/ is a reference kit copied from the main OraMedha app (globals.css tokens, UI components, theme provider, logo). Copy from it into the app and adapt for mobile; do not import from it or edit it.
- Use token classes only (bg-surface, text-text-primary, bg-accent…). Never raw hex or Tailwind palette colours like bg-blue-600.

## Scheduling (v0.1)
- Default mode: OraMedha suggests a slot → PG confirms.
- Slot finder uses: gap window from the rule, expected duration, PG availability, existing appointments, blocked periods.
- Appointment statuses: scheduled, confirmed, unconfirmed, cancelled (→ reschedule pending), missed, completed.

## Patient communication (v0.1)
- No WhatsApp Business API yet. Use `wa.me` links with a pre-filled message so the PG taps Send.
- Keep message text in one place (templates) so we can switch to the real API later without touching screens.

## Privacy
- This is health data (India DPDP Act). Never log patient names, phones or files to the console or analytics.
- Files in private Supabase storage buckets, accessed via signed URLs only.
- Do not commit secrets. Use .env.local and keep .env.example up to date.

## How we work
- Build in small slices. Each slice must end in something a PG can try on a phone.
- Do not stop to ask for plan approval. Read the slice prompt, make sensible decisions, and build the whole slice end to end.
- When something is unclear, choose the simplest reasonable option, write it down, and keep going. Report these decisions at the end.
- Never invent clinical rules as facts. Where a clinical value is needed (durations, gaps, next steps), use a clearly marked placeholder in seed data and list it at the end for review.
- The next-step engine and slot finder are pure functions with unit tests. Write the tests first.
- Keep components small. Put business logic in /lib, not in UI components.

## Git and GitHub
- Repo: https://github.com/Hardik884/OraMedha-Lite (remote `origin`, branch `main`).
- Commit in small logical steps during a slice, with clear messages.
- Never commit secrets: .env.local and any .env file with real keys must be in .gitignore.
- If a push fails because of authentication, stop and tell me exactly what to run; do not change remotes or force-push.
- Never force-push or rewrite history on `main`.

## Finishing a slice (do this every time, without being asked)
1. Run typecheck, lint, all tests and a production build. Fix everything that fails.
2. Check that no component or /lib file hard-codes clinical words (BMP, RCT, crown…) and that no raw colours are used.
3. Check RLS is enabled on every new table.
4. Commit and push to `origin main`.
5. Tell me in simple words:
   - what I can now try on my phone, step by step
   - any decisions you made on your own
   - any clinical placeholders I should confirm with PGs
   - anything you skipped or weren't sure about

## Docs
- /docs/user-journey.md — end-to-end PG journey
- /docs/concept-screens.md — screen-by-screen concept
- /docs/screens.jpeg — mockups for layout and flow only (not the visual design)
- /docs/design-system.md — how Resident should look (matches OraMedha)
- /docs/build-prompts.md — the slice-by-slice build prompts
- /docs/oramedha-design/ — reference kit from the main OraMedha app
