# Repository Guide

For a volunteer developer seeing this codebase for the first time. Read `AGENTS.md` for the
standing rules and `docs/STRIPE_PAYMENTS.md` before touching anything that moves money.
Setting up a new contest? Start with `docs/SETUP.md` instead.

## 1. Purpose

This is a registration and day-of operations app for a yo-yo or skill toy contest. It was
built for the Virginia State Yo-Yo Contest 2026 and generalized; your contest's details live in
`contest.config.ts`. It covers the competitor lifecycle — registration with pricing and comp codes, Stripe card
payments, music upload, spectator and volunteer RSVP, run order, judge scoring, DJ audio access,
results, and post-event surveys — plus staff tooling: admin dashboard, budget, survey invites,
and an audit log of every money and admin action.

Three audiences:

- **Players** register, pay, upload music, view confirmation and results.
- **Staff** score (judges), play music (DJ / audio tech), and edit run order.
- **Admins** manage the roster, payments, budget, run order, codes and surveys.

It runs on Vercel (region `iad1` in `vercel.json`; change it to one near your Supabase
region). Only `main` deploys; preview deployments are disabled in `vercel.json`.

## 2. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 15.5 App Router | `package.json` pins `^15.5.27`. Node 22 (`engines`) |
| Language | TypeScript 5.9 | `npm run typecheck` = `tsc --noEmit`, gated in CI |
| Database / auth | Supabase (Postgres + RLS + Auth + Storage) | Use a project just for this contest |
| Payments | Stripe 17 (hosted Checkout + webhooks) | See `docs/STRIPE_PAYMENTS.md` |
| Email | Resend 4 via an outbox table | `email_outbox`: daily budget, dedupe keys, drained by cron |
| Rate limiting | `@upstash/ratelimit` on `@vercel/kv` | Sliding window per IP; **fails open** if KV is down (deliberate) |
| Errors | Sentry (`@sentry/nextjs`) | Off when `NEXT_PUBLIC_SENTRY_DSN` is unset |
| Job monitoring | Healthchecks.io check-ins (`lib/heartbeat.ts`) | Off when `HEALTHCHECKS_PING_KEY` is unset |
| Queue backstop | Upstash QStash (`lib/qstash.ts`) | Signed schedule can call the email drain |
| UI | Tailwind 3.4, Radix primitives, lucide-react, react-hook-form, zod 3 | |
| Analytics | `@vercel/analytics` | Page views only |

## 3. Layout

| Path | What's there |
|---|---|
| `app/` | App Router pages and API route handlers |
| `app/api/` | ~47 route handlers (grouped in the table below) |
| `lib/` | Shared server logic: errors, auth, Stripe, payments, email, rate limits, pricing, validation |
| `components/` | `BudgetManager`, `DirectoryClient`, `Footer`, `NavBar`, `RunOrderBoard`, `RunOrderManager`, `SurveyContacts`, `SurveyForm`, `SurveyResults`, `VolunteerManager` |
| `proxy.ts` | Redirects legacy `/admin*` pages to `/admin-dashboard`, blocks bot user agents on API GETs, sets `X-Robots-Tag: noindex` on APIs |
| `supabase/migrations/` | 41 migration files, replayed from scratch in CI. `supabase/divisions.sql` (generated) loads your divisions; `supabase/seed-demo.sql` loads fake data |
| `docs/` | `SETUP.md` (new contest checklist), `STRIPE_PAYMENTS.md`, this guide |
| `contest.config.ts` | Name, date, venue, deadlines, links, logos — the one file to edit per contest |
| `.github/workflows/` | `ci.yml`: typecheck → lint → test → build, plus a job that replays every migration on empty Postgres (`scripts/check-migrations.sh`) |
| `.github/dependabot.yml` | Weekly npm (grouped prod/dev patch+minor) and GitHub Actions updates |
| `.env.local.example` | Every env var name with setup notes. Never commit real values |
| `vercel.json` | Region, main-only deploys, daily crons at 00:05 and 00:20 UTC |

### Pages

- Public: `/` (registration), `/competitors`, `/directory`, `/results`, `/results/run-order`
  (gated by the `results_published` event flag), `/budget`, `/fee-calculator`, `/policies`,
  `/spectate`, `/spectators`, `/volunteer`.
- Personal or day-of (noindex): `/confirm`, `/upload`, `/player`, `/portal`, `/spectators/portal`,
  `/staff`, `/judge`, `/dj`, `/admin-dashboard`.
- `/admin/*` is the older admin UI; `proxy.ts` sends it to `/admin-dashboard`.
- `/feedback` redirects to `/survey/spectator` (short link for QR codes). `/survey/[type]` is
  unlisted and noindex.

Each page's `<title>` comes from a small `layout.tsx` next to it (the pages are client
components, so they can't export metadata themselves). The root layout sets the template
`%s · <contest.shortName>`.

### API route groups

| Group | Job |
|---|---|
| `register` | Competitor registration: rate limit (3/IP/hr) → zod validation → honeypot → event-flag and cutoff checks → atomic comp-code redeem (`redeem_comp_code` RPC) → fee calc (`lib/pricing.ts`) → insert → confirmation email |
| `checkout`, `checkout/status` | Create or reuse a Stripe Checkout Session (rate-limited 10/IP/15 min; idempotency key; refuses already-paid). `/status` lets the confirm page poll and records a paid session directly if the webhook is late (60/IP/5 min) |
| `webhooks/stripe` | Verifies the signature, stores the event in `contest_stripe_events`, then dispatches: completed / async-succeeded → `applyPaidSession()`; `charge.refunded` → `refundTransition()` |
| `player-auth/signup`, `player/*` | Supabase Auth account linked to a registration (signup rate-limited 5/IP/hr); player self-service |
| `spectator-*`, `volunteer-*`, `survey` | RSVPs, volunteer signup, survey submissions — rate-limited |
| `upload` | Two-step music upload: `sign` returns a signed Storage URL, `confirm` checks the object landed. The file goes browser → Storage, never through a function |
| `run-order`, `scores` | Public run order (minors anonymized via `lib/display-name.ts`); judge scoring |
| `ops/*` | Staff ops dashboard, event flags, comp codes, contestant/spectator detail |
| `dj/music-url`, `staff/me` | Signed music URLs for playback; staff identity |
| `admin/*` | ~20 routes, all behind `requireAdminRequest` (Supabase staff bearer with `role='admin'`) |
| `cron/*` | `drain-email` and `reconcile-payments`, behind `requireCronOrAdmin` (`CRON_SECRET`, timing-safe, fails closed). `drain-email` also accepts a signed QStash request |
| `health` | Light probe; `?deep=1` runs a DB query only with the `HEALTHCHECK_TOKEN` header |
| `validate-code` | Comp-code check: per-IP rate limit plus per-code lockout (`lib/comp-code-guard.ts`) |

### Key `lib/` files

| File | Responsibility |
|---|---|
| `api-error.ts` | `apiError(code, msg, requestId)` and `withErrorHandling`, which adds `x-request-id` and turns throws into `internal_error` |
| `rate-limit.ts` | `checkRateLimit(ip, action, max, windowMinutes)`, `getClientIp(headers)` |
| `audit.ts` | `logAudit(action, {...})` → `contest_audit_log`. Never throws |
| `supabase/admin.ts` | Service-role client (bypasses RLS). API routes only, never client components |
| `auth/staff.ts`, `auth/admin-request.ts` | Bearer token → `supabase.auth.getUser()` → `contest_staff_accounts` row with role `admin`, `judge`, `dj` or `audio_tech`. `requireRunOrderEditorRequest` also lets judge/DJ/audio tech edit run order on contest day |
| `auth/cron.ts` | `requireCronOrAdmin` |
| `payments.ts`, `payment-decision.ts` | `applyPaidSession()` — the single path that records a payment (webhook, confirm-page poll, checkout reuse, reconcile sweep). Guarded `eq('paid', false)` update; duplicates go to `contest_payment_flags` plus an admin email, never auto-refunded; a session whose payment was fully refunded is ignored, not re-marked paid |
| `stripe-refund.ts` | `refundTransition()`: full refund → `paid=false`; partial → audit log only |
| `outbox.ts`, `email.ts`, `email-policy.ts` | Email outbox with daily cap (`EMAIL_DAILY_LIMIT`) and a reserve for confirmations |
| `event-flags.ts` | Runtime flags from `contest_event_flags` (`online_registration_open`, `results_published`), cached 30s |
| `divisions-core.ts` | Pure division logic from `contest.config.ts → competition`: fees and combos, selection rules, freestyle/manual scoring math, and the generator for `supabase/divisions.sql`. Unit-tested |
| `pricing.ts`, `validation.ts`, `tokens.ts`, `filename.ts` | Fee wrappers, zod schemas, signed upload tokens, canonical music filenames |

### Tests

`npm test` runs `node --experimental-strip-types --test 'lib/**/*.test.mjs'` — tests over
the pure money logic (`payment-decision`, `stripe-refund`, `email-policy`) and the config
date helpers (`contest-config`). No route-level integration tests yet.

## 4. How it works

### Registration → payment

```mermaid
flowchart TD
  A[POST /api/register] --> B{rate limit 3/IP/hr}
  B --> C[zod + honeypot + flags/cutoffs]
  C --> D[redeem_comp_code RPC]
  D --> E[calculateFee]
  E --> F[insert contest_registrations]
  F --> G{fee due?}
  G -->|no| H[/confirm]
  G -->|yes| I[POST /api/checkout]
  I --> J{open session?}
  J -->|yes| K[reuse URL]
  J -->|no| L[create session, idempotency key]
  L --> M[Stripe hosted checkout]
  M --> N[POST /api/webhooks/stripe]
  N --> O[verify signature, store in contest_stripe_events]
  O --> P[applyPaidSession]
  T[GET /api/checkout/status] -.-> P
  U[cron reconcile-payments] -.-> P
```

`applyPaidSession()` is the one choke point and it is idempotent. The amount charged is always
`fee_cents` from the database row — no client-supplied price anywhere.

### Staff and admin auth

Staff sign in with Supabase Auth. Every admin route starts with `requireAdminRequest()`, which
validates the bearer token with Supabase and looks up an active `admin` row in
`contest_staff_accounts`. There is **no** shared admin password or PIN: `ADMIN_USERNAME`,
`ADMIN_PASSWORD`, `DJ_PIN` and `JUDGE_PIN` are not read by any code.

### Divisions and scoring

Divisions live in `contest.config.ts → competition.divisions`. The app reads them directly;
the database gets a copy in `contest_divisions` / `contest_division_styles` through the
generated `supabase/divisions.sql` (`npm run divisions`), because the results view and the
integrity triggers need the caps and multipliers too.

- **Registrations** store `divisions text[]` and `division_styles jsonb` (`{"X": ["2A","3A"]}`).
  A trigger rejects unknown divisions or styles; another blocks deleting a division or style
  that registrations still use.
- **Scores**: one row per judge per competitor per division. `freestyle` divisions fill the
  sheet columns; `manual` divisions fill `manual_score`. `style_code` records which style the
  routine was judged under when the competitor entered more than one; otherwise their only
  style is used. A trigger checks every value against the division's caps.
- **`contest_results`** (view) turns rows into `final_score`. Freestyle tech is normalized to
  each judge's own best multiplied tally. `lib/divisions-core.ts` (`freestyleBreakdown`,
  `manualBreakdown`) does the same math for the judge screen and `/api/scores`; change both
  together. Standings average each competitor's `final_score` across judges.

### Music upload

One track per division the player entered that uses music (`contest_music`, unique on
registration + division; a 1A + X player has two slots). `GET /api/upload?token=…` lists the slots.
`/upload?token=…` (token minted at registration) → `POST /api/upload {action:'sign', division}`
checks payment, deadline (`contest.deadlines.musicUpload`), the division, mime (mp3/wav/m4a) and
size (128 MB) and returns a signed upload URL for bucket `contest-music` (file
`DIVISION_Last_First.ext`) → browser PUTs the file → `{action:'confirm', division}` re-derives the
filename server-side, checks the object exists, records the track, emails a receipt and writes
`music_received` / `music_replaced` to the audit log. A slot that already holds the player's own
track is refused (409) unless the request says `replace: true`, and the page asks first. Staff
upload through `/api/admin/music-upload` (POST then PATCH) on the run order screens, per division.
The DJ queue, run order, player page and CSV export all resolve the track per division
(`lib/music.ts` has the pure helpers). The old single slot (`contest_registrations.music_path` /
`music_filename`) is no longer read; a later migration can drop it.
`contest_registrations.music_uploaded_at` is kept current by a trigger ("has a real track").

Empty slots: the admin dashboard's **Music** tab shows slots per division, sends per-division
reminder emails (`/api/admin/music-reminders`, dry-run by default, once a day per person and set
of divisions, before the deadline) and assigns a random lo-fi track to every still-empty slot
(`/api/admin/music-fallback`, dry-run by default, after the deadline unless forced, never
overwrites a track). The lo-fi pool is the `lofi/` folder of the `contest-music` bucket: put only
tracks you have the right to play there. A fallback is a `contest_music` row with `source =
'fallback'`; staff see "LO-FI (no upload)", and a player's own upload replaces it.

## 5. Config and environments

Contest details are in `contest.config.ts`. Secrets and service keys are env vars;
`.env.local.example` lists every name with notes. Production values live in Vercel → Settings →
Environment Variables.

- **Local:** `cp .env.local.example .env.local`, fill Supabase and Stripe **test** keys,
  `npm run dev`. Forward webhooks with
  `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.
- **Production:** live Stripe keys; the live webhook endpoint must subscribe to
  `checkout.session.completed`, `checkout.session.async_payment_succeeded` and
  `charge.refunded`.
- **Migrations:** apply with `supabase db push` (Supabase CLI). Add new ones with
  `supabase migration new <name>`; never hand-run SQL that isn't committed. CI replays them all
  on an empty database, so a migration that only works on top of history fails the build.

## 6. Where to go next

- `docs/SETUP.md` — set up a new contest, step by step.
- `docs/STRIPE_PAYMENTS.md` — the payment flow end to end.
