# OraMedha Lite

A mobile-first app for dental postgraduate students (PGs): patients, appointments, case progress, files and logbook in one place. Sister product of OraMedha — same look, lighter app.

Start with [CLAUDE.md](CLAUDE.md) (product rules) and [docs/](docs/) (journey, screens, design system, build slices).

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

### On your phone (same Wi-Fi)

```bash
npm run dev:phone    # listens on your laptop's network address
```

Find your laptop's Wi-Fi IP (Windows: run `ipconfig`, look under **"Wireless LAN adapter Wi-Fi"** → "IPv4 Address", e.g. `192.168.1.23` — ignore "vEthernet (WSL)" entries) and open `http://192.168.1.23:3000` on the phone. If it doesn't load, allow Node.js through Windows Firewall on private networks.

Hidden UI kit: `/dev/ui` — every component, with a Light / Dark / System switch.

> Installing to the home screen as a full app (and the offline screen) needs HTTPS, so it works on the deployed site, not over `http://192.168…`. On Android Chrome you can still use ⋮ → "Add to Home screen" for a shortcut.

## Checks

```bash
npm run check        # type-check + lint + tests + production build
```

`test/guardrails.spec.ts` fails the tests if a clinical word (e.g. a stage name) is hard-coded in `app/`, `components/` or `lib/`, or if a raw colour / Tailwind palette class is used instead of a design token.

## Database (Supabase)

The app uses a **hosted** Supabase project (region ap-south-1). `.env.local` holds its URL and keys, plus `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD` for the CLI (see `.env.example`). The CLI reads those automatically in this folder.

```bash
npm run db:new -- add_something   # create a new migration file
npm run db:push:dry               # show what would be applied to the hosted DB
npm run db:push                   # apply migrations to the hosted DB
npm run gen:types                 # regenerate types/database.types.ts from the hosted DB
```

Never edit a migration that has already been pushed — add a new one.

### Local stack (optional, for testing)

Needs Docker Desktop. Used to try migrations and run the Row Level Security tests with throwaway users, without touching real data.

```bash
npm run db:start     # local Supabase on ports 543xx
npm run db:reset     # re-apply all migrations to the LOCAL database
npm run test:db      # database tests with throwaway users
npm run dev:local    # the app on http://localhost:3100, wired to the LOCAL database
npm run db:stop
```

**Local-only guard.** `test:db` and `dev:local` refuse to start unless the Supabase URL is localhost, and `dev:local` also makes every Supabase client in the app refuse a non-local URL — so test data can never be written to the hosted project. `dev:local` builds into `.next-local` so it never reuses a bundle compiled for the hosted project. Use plain `npm run dev` / `npm run dev:phone` for the hosted project.

Local phone login: `98765 43210`, code `123456` (see `supabase/config.toml`; no SMS is sent).

## Phone login on the hosted project

Phone OTP is switched on in the Supabase dashboard, not from this repo (never run `supabase config push`; it would overwrite the dashboard settings).

1. **Authentication → Sign In / Providers → Phone** → enable.
2. SMS provider: choose **Twilio** and enter placeholder values (e.g. Account SID `AC00000000000000000000000000000000`, Auth Token `placeholder`, Message Service SID `MG00000000000000000000000000000000`). Real SMS needs a real provider later; test numbers never reach it.
3. **Test phone numbers and OTPs**: add lines like `919876543210=123456` (country code, no `+`), one per tester. Set the expiry date in the future.
4. Optionally raise **SMS OTP expiry** from 60 to 300 seconds.
5. Save. Now sign in on the app with `98765 43210` and code `123456`.

## Procedure templates

All clinical knowledge (specialties, case types, stages, durations, gaps, next steps, modifiers) lives in database rows seeded by `supabase/migrations/*_seed_procedure_templates.sql`. Every seeded value has `is_placeholder = true` until confirmed with PGs. App code never names a stage.

## Where things live

| Path | What |
|---|---|
| `app/(tabs)/` | Today, Patients, Progress (bottom-nav shell) |
| `app/dev/ui/` | Hidden component gallery |
| `components/ui/` | Design-system components (from the OraMedha kit, sized for phones) |
| `components/shared/` | Logo, theme toggle, avatars, status chips, segmented tabs |
| `app/login`, `app/onboarding` | Phone OTP sign-in and first-login onboarding |
| `lib/` | Business logic (pure functions + tests) and Supabase clients |
| `supabase/` | CLI config, migrations (schema, RLS, templates) |
| `test/db/` | Database specs run against the local stack (`npm run test:db`) |
| `middleware.ts` | Session refresh + sign-in redirect |
| `scripts/make-icons.mjs` | Regenerates PWA icons from the brand mark (`npm run icons`) |
