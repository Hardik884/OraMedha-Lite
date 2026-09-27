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

**Local test sign-in.** Google can't be automated, so on `npm run dev:local` the login screen also shows a yellow **Local test sign-in** box: any address ending in `.test` (e.g. `pg1@oramedha.test`) signs in as a throwaway test PG, created on first use (all test PGs share a local-only password, `local-test-only`, in `lib/auth/test-sign-in.ts`). It only exists when the app is the local test server **and** the Supabase URL is the local stack, and never in a production build — so it can't be switched on against the hosted project. The database tests (`npm run test:db`) create their own users the same way.

## Sign-in (Google)

PGs sign in with **Continue with Google** (Supabase Auth, Google provider, PKCE). Sign-up is open: any Google account can sign in, and a first sign-in goes to onboarding (name pre-filled from Google, then college and specialty).

- The login button sends the PG to Google and back to **`/auth/callback`**, which finishes the sign-in and continues to onboarding, the page they were trying to open, or Today.
- Inside WhatsApp, Instagram, Facebook and other in-app browsers Google refuses to sign anyone in, so the login screen shows **Open in Chrome / Safari** with a **Copy link** button instead.
- Google and Supabase are set up by hand in their dashboards, not from this repo (never run `supabase config push`; it would overwrite the dashboard settings):
  1. **Google Cloud Console:** a project, the OAuth consent screen (app name "OraMedha Lite", scopes `email`, `profile`, `openid` only, **published** "In production" so any Google account can sign in), and a **Web application** OAuth client whose *Authorized redirect URI* is `https://<project-ref>.supabase.co/auth/v1/callback`.
  2. **Supabase → Authentication → Sign In / Providers:** Google on (client ID and secret from step 1); Phone and Email off.
  3. **Supabase → Authentication → URL Configuration:** Site URL = the deployed address; Redirect URLs = `http://localhost:3000/**`, `http://<laptop-wifi-ip>:3000/**` and `https://<deployed-address>/**`.
- Testing on a phone over Wi-Fi (`npm run dev:phone`) needs that Wi-Fi address in the Redirect URLs. If the laptop's address changes, add the new one.

## Procedure templates

All clinical knowledge (specialties, case types, stages, durations, gaps, next steps, modifiers) lives in database rows seeded by `supabase/migrations/*_seed_procedure_templates.sql`. Every seeded value has `is_placeholder = true` until confirmed with PGs. App code never names a stage.

## Where things live

| Path | What |
|---|---|
| `app/(tabs)/` | Today, Patients, Progress (bottom-nav shell) |
| `app/dev/ui/` | Hidden component gallery |
| `components/ui/` | Design-system components (from the OraMedha kit, sized for phones) |
| `components/shared/` | Logo, theme toggle, avatars, status chips, segmented tabs |
| `app/login`, `app/auth/callback`, `app/onboarding` | Google sign-in, its callback, and first-login onboarding |
| `lib/` | Business logic (pure functions + tests) and Supabase clients |
| `supabase/` | CLI config, migrations (schema, RLS, templates) |
| `test/db/` | Database specs run against the local stack (`npm run test:db`) |
| `middleware.ts` | Session refresh + sign-in redirect |
| `scripts/make-icons.mjs` | Regenerates PWA icons from the brand mark (`npm run icons`) |
