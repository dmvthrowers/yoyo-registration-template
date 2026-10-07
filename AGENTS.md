# AGENTS.md — Yo-Yo Contest Registration Template

Orientation for any AI agent working in this repo, or in a contest app made from it.

## What this is

A Next.js 15 + Supabase + Stripe app for running a yo-yo or skill toy contest: registration,
payments, music upload, RSVPs, run order, judging, results and surveys. It started as the live
app for the Virginia State Yo-Yo Contest 2026 and was generalized into a template.

**A deployed copy handles real people's data and real money.** Treat schema, payment and auth
changes with production care, not prototype care.

## Where things live

- `contest.config.ts` — every contest-specific value (name, date, venue, deadlines, sponsor,
  links, logos). If you're tempted to hardcode a date, venue or name anywhere, put it here.
- `contest.config.ts` → `competition` — toy wording, divisions, styles, combos, prices and
  judging format per division. `lib/divisions-core.ts` holds the pure rules (fees, selection
  checks, scoring math, the SQL generator) and is unit-tested. `presets/competitions.ts` has
  yoyoFull (every format) / kendama / juggling / diabolo / spintop / mixed examples.
- `docs/FORMATS.md` — the formats (freestyle, panel, manual, ladder, bracket, showcase), team
  entries, rounds, and the API contract for each. Read it before touching judging or results.
- `lib/surveys.ts` — survey questions.
- `docs/HUB_ROADMAP.md` — where this is heading (any toy, any format, multi-day and multi-event) and the stages to get there. Read it before adding anything event- or toy-specific.
- `docs/CONTEST_APP_PLAN.md` — the feature build order (formats, contest-day tools, spectator pages), with the
  status of each item. Its sources are `docs/CONTEST_APP_MASTER_PLAN.md` and `docs/FORMAT_RESEARCH.md`.
- `docs/ROLES.md` — roles, capabilities and the single-pane portal (`lib/roles.ts`). Check permissions with `can()`, never with `role ===`; admin holds every capability.
- `docs/SETUP.md` — the human setup checklist. Keep it accurate when you change setup steps.
- `docs/REPO_GUIDE.md` — architecture and file map. `docs/STRIPE_PAYMENTS.md` — read before
  touching anything that moves money.
- `supabase/migrations/` — schema and RLS. `supabase/seed-demo.sql` — fake demo data.

## Standing rules

- **Config, not literals.** No contest names, dates, venues, sponsor names or organizer URLs in
  code. Use `contest.config.ts` and its helpers (`longDate`, `venueLine`, `deadlineLabel`, …).
  Files tested by `npm test` (`lib/*.test.mjs` targets) must not use the `@/` import alias.
- **Divisions are data.** Never hardcode a division code, style, price or cap in a page or
  route. Read `competition.divisions` (or `DIVISIONS` / `divisionByCode`). After changing
  divisions, run `npm run divisions`: `npm test` fails if `supabase/divisions.sql` is stale.
  The scoring math exists twice, in `lib/divisions-core.ts` and the `contest_results` view
  (migration 0037), so change both together.
- **Migrations replay from scratch.** CI applies every migration to an empty database
  (`scripts/check-migrations.sh`). Add new ones with `supabase migration new`; never edit one a
  deployed contest has already applied. Every public table needs RLS on.
- **Auth fails closed.** Admin routes call `requireAdminRequest()`: a valid Supabase bearer
  token *and* an active `admin` row in `contest_staff_accounts`. Don't loosen it to fix a local
  401; add yourself a staff row.
- **Never commit secrets.** `.env.local.example` holds names and blanks only.
- **Stripe stays in test mode by default.** Docs and examples use `sk_test_` keys. The webhook is
  idempotent on purpose; don't assume it fires exactly once. Prices come from the database row,
  never the client.
- **Optional services fail open or switch off.** Rate limiting with no KV, email with no Resend,
  Sentry/QStash/Healthchecks with no keys. Keep it that way: registration must never hard-fail
  because an optional provider is missing or down.
- **Free-tier choices are deliberate**: singleton clients, 5-minute ISR on public lists, a 30s
  event-flag cache, bounded email waits, the email outbox daily budget.

## Verify

```bash
npm run typecheck && npm run lint && npm test && npm run build
DATABASE_URL=postgres://... scripts/check-migrations.sh   # empty Postgres 15+
```

CI needs placeholder `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to build
(see `.github/workflows/ci.yml`).

## Relationship to the live app

This template is derived from [VA-States](https://github.com/dmvthrowers/VA-States), the live
Virginia State Yo-Yo Contest registration app. **Fixes land in VA-States first**, then are ported
here (shared pieces: `components/form/Field.tsx`, the SEO routes, the accessibility fixes). The two
have drifted in other places (migrations, `db-backup.yml`, `DAY_OF.md`), so port by hand.

**Parity is required.** The live app and this template must stay in step. Every PR here or in
VA-States either ports the change, logs it in [`docs/PARITY.md`](docs/PARITY.md), or says it is
live-only config. Read that file before porting.
