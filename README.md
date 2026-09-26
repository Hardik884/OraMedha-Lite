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

## Supabase (local)

Needs Docker Desktop.

```bash
npm run db:start     # starts local Supabase; prints API URL + anon key
cp .env.example .env.local   # then paste the URL and anon key in
npm run db:reset     # re-apply migrations + seed.sql
npm run gen:types    # regenerate types/database.types.ts after a migration
```

## Where things live

| Path | What |
|---|---|
| `app/(tabs)/` | Today, Patients, Progress (bottom-nav shell) |
| `app/dev/ui/` | Hidden component gallery |
| `components/ui/` | Design-system components (from the OraMedha kit, sized for phones) |
| `components/shared/` | Logo, theme toggle, avatars, status chips, segmented tabs |
| `lib/` | Business logic (pure functions + tests) and Supabase clients |
| `supabase/` | CLI config, migrations, seed data |
| `scripts/make-icons.mjs` | Regenerates PWA icons from the brand mark (`npm run icons`) |
