# OraMedha Lite — Build Prompts for Claude Code

Use these one at a time, in order. For each slice:

1. Start a fresh session (`/clear`).
2. Paste the slice prompt. Claude Code builds the whole slice without stopping.
3. At the end it runs all checks, commits, pushes to GitHub
   (https://github.com/Hardik884/OraMedha-Lite) and tells you what to try.
   (These finishing steps are written in CLAUDE.md, so every slice follows them.)
4. Try it on your phone before starting the next slice.

---

## Slice 0 — Project setup + OraMedha look

```
Read CLAUDE.md, then everything in /docs, especially /docs/design-system.md
and the reference kit in /docs/oramedha-design/.

Slice 0: project setup and design system. No product screens yet.

1. Set up Next.js 15 (App Router) + TypeScript strict + Tailwind v4 +
   Vitest + ESLint, in the same style as OraMedha. Initialise git.
2. Add Supabase clients (browser + server, using @supabase/ssr) and a
   .env.example. Set up the Supabase CLI folder (supabase/migrations,
   supabase/seed.sql) but no tables yet.
3. Bring in the OraMedha design system from the kit: globals.css tokens
   (light + dark), Geist fonts, theme provider + toggle, logo, and the UI
   components. Adapt them for mobile as design-system.md says (a larger
   button size, 44px+ inputs, 16px input text, safe areas).
4. Build an app shell: mobile layout with a bottom nav (Today, Patients,
   Progress), each tab an empty placeholder page with an EmptyState.
5. Make it an installable PWA: manifest named "OraMedha Lite", OraMedha
   icons, theme colours from the tokens.
6. Add a hidden /dev/ui page that shows every component in light and dark,
   so I can check the look on my phone.

```

---

## Slice 1 — Database + login

```
Read CLAUDE.md and /docs before starting.

Slice 1: database schema, seed data and login.

1. Design the full schema as Supabase migrations: pg_profile, pg_settings,
   specialty, case_type, stage (the procedure templates), patient, case,
   visit, appointment, file. Everything must be specialty-agnostic: clinical
   words only live in template rows, never in code.
   - A stage has: name, order, default duration (min), default gap
     (min–max days), next stage when Complete, next stage when Partial.
   - Add a way to store modifiers (e.g. "Medicament placed") that can
     override the gap or next stage.
   - PG overrides of durations/gaps live in pg_settings or an override table.
2. Row Level Security on every table: a PG only ever sees their own data.
   Template rows are readable by all logged-in PGs.
3. Soft delete (deleted_at) on patient, case, visit, appointment, file.
4. Seed templates for Endodontics (Primary RCT, Retreatment) and
   Prosthodontics (Crown, Complete Denture), with realistic stages.
   Mark the gaps/durations as placeholders for me to confirm with PGs.
5. Phone OTP login with Supabase Auth. Explain how to set up Supabase test
   phone numbers so I can log in without paying for SMS.
6. First-login onboarding: name, college, specialty (from the templates).
7. Generate TypeScript types from the schema.

```

---

## Slice 2 — Add Patient, Patient/Case, Today

```
Read CLAUDE.md and /docs before starting.

Slice 2: the first real loop, with manual scheduling only.

Build these screens, following the mockups' layout (screens 1, 2, 6, 7 in
/docs/screens.jpeg) but OraMedha's look:

1. New Patient, step 1: name, phone, tooth number, case type (required);
   age, OPD number (optional). Must be doable in under 30 seconds.
   Validate phone (Indian 10-digit) and tooth number (FDI notation).
2. New Patient, step 2: "What are you doing today?" — stages loaded from
   the chosen case type's template. Tapping one creates the case and today's
   visit, and sets the current stage.
3. Then: "Schedule the next appointment" with a simple manual date/time
   picker and duration (default from the stage). Allow "Schedule later".
4. Patient/Case screen: name, age, OPD no., Call and WhatsApp buttons
   (tel: and wa.me links), tooth, case type, current stage, status, next
   appointment, case timeline (from visits), and a Files section placeholder.
5. Today screen: date, Today / Pending tabs, list of today's appointments
   (time, name, tooth · case type · stage, status badge). Tapping opens the
   Patient/Case screen. "+ New Patient" button.
6. Patients tab: searchable list of the PG's patients (name, phone, OPD no.).
7. A patient can have more than one case (e.g. two teeth). Show this on the
   Patient screen.

```

---

## Slice 3 — PG settings (availability and defaults)

```
Read CLAUDE.md and /docs before starting.

Slice 3: PG settings. The next-step engine and slot finder (next slices)
need this data.

1. A Settings screen (from a profile icon on Today).
2. Clinic timings: working days and hours (e.g. Mon–Sat, 9:00–13:00 and
   14:00–16:00), plus a slot step (e.g. 15 or 30 min).
3. Blocked times: one-off (e.g. "exam on 3 Oct") and recurring
   (e.g. "seminar every Wednesday 9–11").
4. My clinical defaults: for each stage of my specialty's case types, show
   the template's duration and gap, and let me override them. Show clearly
   which values are template defaults and which are mine.
5. Modifier rules: e.g. "Medicament placed: Calcium hydroxide → next visit
   in 7–14 days", editable by the PG.
6. Reminder timing preference (evening before / 2 hours before / both) —
   store it only; it's used later.
7. Theme (light/dark/system) and sign out.

```

---

## Slice 4 — Update Visit + next-step engine (the hero)

```
Read CLAUDE.md and /docs before starting. This is the most important slice.

Slice 4: Update Visit and the next-step engine.

1. Next-step engine as a pure function in /lib (no database calls):
   input = case type template, current stage, Partial/Complete, optional
   modifier, PG overrides; output = next stage, gap window (min–max days),
   expected duration, and a short plain-English reason
   (e.g. "BMP is ongoing, so the next visit continues BMP").
   Write the unit tests FIRST, covering:
   - Partial → same stage continues
   - Complete → next stage in the template
   - Last stage Complete → case can be completed
   - Modifier overrides the gap or next stage
   - PG override beats template default
   - Works the same for an Endo case and a Prostho case
2. Update Visit screen (mockup screen 3): "What did you do today?" (stages
   from the template, current stage pre-selected, can select more than one
   if several stages were done), Status: Partial / Complete, optional
   modifier, optional note.
3. Next Step screen (mockup screen 4): suggested next step with its reason,
   "Change next step", expected duration. For now the appointment date is
   picked manually (slot finder is the next slice), defaulting to the start
   of the gap window.
4. Saving updates: visit record, case current stage, case timeline, and
   creates the next appointment. Marks today's appointment completed.
5. Visit Updated screen (mockup screen 5) listing what happened.
6. "Complete Case" when the last stage is done.

```

---

## Slice 5 — Slot finder

```
Read CLAUDE.md and /docs before starting.

Slice 5: automatic slot suggestions.

1. Slot finder as a pure function in /lib with unit tests written FIRST:
   input = gap window, duration, clinic timings, blocked times, existing
   appointments, today's date/time; output = the first free slot in the
   window, plus 3–5 alternatives.
   Test cases: skips non-working days, skips blocked times, doesn't overlap
   existing appointments, respects lunch breaks, never suggests the past,
   and says clearly when no slot exists in the window (then offers the
   nearest slot after it).
2. Use it on the Next Step screen: show "Suggested appointment: Tue, 29 Sep
   · 11:00 AM" with an Edit option, and the note "This slot is within your
   timings and doesn't clash with other appointments".
3. "Choose a different slot": a simple list of alternatives grouped by day,
   plus a manual picker.
4. Also use the slot finder in New Patient step 3 and in Reschedule.
5. Handle timezones correctly: everything in Asia/Kolkata.

```

---

## Slice 6 — Files

```
Read CLAUDE.md and /docs before starting.

Slice 6: files within a case (mockup screen 8).

1. Private Supabase Storage bucket with RLS; files shown only via signed URLs.
2. "Add File" on the Patient screen and inside Update Visit: take a photo
   with the camera, pick from gallery, or upload a PDF/PPT/document.
3. Each file gets a type (X-ray, Photo, Document) and is linked to the case,
   and to the visit/stage when added during Update Visit.
4. Compress images on the phone before upload (keep X-rays readable).
5. Files screen: All / X-rays / Photos / Documents filters, thumbnails with
   label and date, tap to view full screen, rename, delete (soft).
6. Show files under each stage in the case timeline.
7. Upload must not block the PG: show progress, allow leaving the screen.

```

---

## Slice 7 — Patient messages and appointment statuses

```
Read CLAUDE.md and /docs before starting.

Slice 7: WhatsApp messages (manual send) and appointment statuses.

1. Message templates in one file in /lib (appointment booked, reminder,
   rescheduled, missed). English first; structure it so Hindi/Marathi can
   be added later.
2. After scheduling, show "Send to patient on WhatsApp" which opens wa.me
   with the message pre-filled. Record that it was sent.
3. Appointment actions: Mark confirmed, Mark missed, Cancel, Reschedule.
   Cancel/missed → the patient shows as "Needs rescheduling".
4. Today → "Needs attention" box and Pending tab: unconfirmed appointments,
   patients missed yesterday, patients with an ongoing case but no next
   appointment. Each item has a one-tap action.
5. Appointments in the past that were never updated are flagged for the PG
   ("Did Rahul come on 25 Sep?").
6. Keep all sending behind one small interface so we can switch to the
   WhatsApp Business API later without touching screens.

```

---

## Slice 8 — Progress and logbook

```
Read CLAUDE.md and /docs before starting.

Slice 8: Progress and logbook (mockup screen 9). All numbers are calculated
from cases and visits. Nothing is typed in by the PG.

1. Progress screen: specialty and period filters (This month / This year /
   All time); completed count per case type with a bar; ongoing count.
2. "Special case" flag on a case (a toggle on the Patient screen), with
   completed / ongoing counts.
3. Optional targets per case type (set in Settings), shown as "8 / 10".
4. Recent activity list from visits.
5. Logbook screen: date, OPD no., patient, tooth, procedure/stage, status,
   filterable by case type and date.
6. Export the logbook to Excel (.xlsx) and PDF.

Use SQL views or queries for the counts (views must use
```

---

## Slice 9 — Polish and put it on PGs' phones

```
Read CLAUDE.md and /docs before starting.

Slice 9: make it ready for Mahek and friends to test.

1. Go through every screen on a 375px-wide phone in light and dark mode and
   fix anything cramped, cut off or hard to tap.
2. Loading skeletons, empty states and friendly error messages everywhere.
3. Weak hospital Wi-Fi: make Update Visit and New Patient safe to retry
   (no duplicate records), and show clearly when something didn't save.
4. Add a short first-run guide (2–3 screens max).
5. Add a "Send feedback" option that saves text to a feedback table.
6. Run typecheck, lint, all tests, and a production build. Fix everything.
7. Give me step-by-step instructions to deploy on Vercel with my Supabase
   project, set up SMS for phone OTP, and share the link with testers.

```

---

## After every slice

```
Before we finish this slice:
1. Run typecheck, lint, tests and a production build; fix anything failing.
2. Check that nothing in components or /lib hard-codes clinical words
   (like BMP, RCT, crown) and that no raw colours are used.
3. Check RLS is enabled on every new table.
4. Tell me in simple words what I can now try on my phone, step by step.
5. List anything you skipped or weren't sure about.
6. Commit with a clear message.
```

## If something goes wrong

```
This isn't working: [describe what you see, or paste the error].
Find the cause first and explain it to me in simple words before fixing it.
```
