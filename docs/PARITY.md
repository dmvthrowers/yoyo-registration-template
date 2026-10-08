# Parity: live repos and templates

Our live repos and the public templates stay in step, so the templates are always what we actually
run at a real contest.

| Live repo | Template | What it is |
|---|---|---|
| [`VA-States`](https://github.com/dmvthrowers/VA-States) | this repo | Registration, payments, judging, results |
| [`dmvthrowers.github.io`](https://github.com/dmvthrowers/dmvthrowers.github.io): `vsyc26*.html`, `assets/css/vsyc26.css` | [`yoyo-contest-template`](https://github.com/dmvthrowers/yoyo-contest-template) | The static public event site |
| [`dmvthrowers.github.io`](https://github.com/dmvthrowers/dmvthrowers.github.io): every other page, `assets/css/main.css` | [`yoyoclub-template`](https://github.com/dmvthrowers/yoyoclub-template) | The static club site |

### One live repo, two templates

The club site and the contest site are one live repo, so they share the domain, the nav and footer
pattern, `assets/js/mobile-enhancements.js` and one place to fix things. That keeps the club side
consistent, and it's staying that way. The cost is on the template side: a change to the live repo
can belong to either template, or to both. Before porting, decide which:

- **Club pages** (`index`, `about`, `events`, `gallery`, `resources`, the guides, …) → club template.
- **Contest pages** (`vsyc26*.html`) → contest template.
- **Shared pieces** (`mobile-enhancements.js`, the skip link, footer and nav structure, CSP pattern,
  accessibility fixes) → both templates.

The templates are generators (`site.jsonc` plus `build.py`), while the live site is hand-written
HTML. So parity means the same pages, sections, features and fixes, not the same files: a new
section on a live page becomes a section the template's generator can produce from config.

### Other template families

The same rule covers the youth group template: [`Scouts-Template-Site`](https://github.com/dmvthrowers/Scouts-Template-Site)
and the two live troop and pack sites built from it. Its pairs and gaps are in that repo's `PARITY.md`.

## The rule

Every PR to a live repo or a template does one of three things, and says which in its description:

1. **Ports the change** to the other repo (link the matching PR).
2. **Logs it below** as a known gap, with the reason and who it's waiting on.
3. **Says it's live-only** because it's our own config or content (names, dates, venue, sponsors,
   wording). Config never goes into a template; code always does.

A fix usually lands in the live repo first, because that's where it was found. It is ported, or
logged here, before the PR merges.

## Known gaps

Audited 2026-10-07 by comparing the two repos' `main` branches. Remove a row when it's closed. The
static-site pairs are tracked in `dmvthrowers.github.io`'s `docs/ROADMAP.md` ("Parity fixes").

### VA-States → template (port into the template)

| Gap | Files in VA-States | Note |
|---|---|---|
| Home-state eligibility and the current champion rule | `lib/residency.ts`, `lib/standings.ts` (`eligible` set, `fetchHomeStateEligible`), migration 0047 | The template still uses the old "entered the champion's state" rule |
| Round plans | `lib/round-plan*.ts`, `lib/use-round-plans.ts`, `components/RoundPlanPanel.tsx`, `/api/rounds/plan`, `/api/admin/rounds/plan`, migration 0045 | |
| Division split | `lib/division-split.ts`, `components/SplitPreviewPanel.tsx`, `/api/admin/division-split` | |
| Prizes | `lib/prizes.ts`, `components/PrizePlanPanel.tsx`, `/api/admin/prizes` | |
| Score status | `lib/score-status.ts`, `/api/admin/score-status` | Groundwork for the scores-in board (T1) |
| Payment dispute flags | `lib/stripe-dispute*.ts`, migration 0046 | |
| Bot check on public forms | `lib/turnstile.ts`, `components/Turnstile.tsx` | Port as an optional service that switches off when its key is blank |
| Nightly encrypted database backup | `.github/workflows/db-backup.yml` | |
| Day-of runbook | `docs/DAY_OF.md` | Make it generic (no VSYC names) |

### Template → VA-States (port into the live app)

| Gap | Files in the template | Note |
|---|---|---|
| Roles, grants and the `/staff` single pane | `lib/roles.ts`, `lib/modules*.ts`, `components/StaffPane.tsx`, `components/ModuleBoard.tsx`, `/api/admin/roles`, `/api/staff/modules`, migrations 0044, 0045, 0047 | A separate project; until then VA-States sponsors stay admin-only |
| Role pages | `app/mc`, `app/media`, `app/merch`, `app/stream`, `app/volunteers`, `app/finance`, `app/admin/event`, `app/admin/staff` | Depend on roles |
| Migration replay in CI | `migrations` job in `.github/workflows/ci.yml`, `scripts/check-migrations.sh` | Proves a fresh database sets up cleanly |
| Setup scripts | `scripts/sync-divisions.mjs`, `scripts/render-auth-emails.mjs` | |
| Dependency versions | `resend` 6, `@vercel/analytics` 2 | VA-States is still on 4 and 1 |
| Tests | `lib/divisions-core.test.mjs`, `lib/formats.test.mjs`, `lib/routine-length.test.mjs` | |

### Both

| Gap | Note |
|---|---|
| 151 of the 236 shared files under `app/`, `lib/` and `components/` differ | Much of it is VSYC wording written into VA-States code (surveys, emails, home page, nav and footer) where the template reads `contest.config.ts`. Move that wording into VA-States' config until every shared file is identical; then a port is a copy. Largest: `lib/surveys.ts`, `app/admin/results/page.tsx`, `lib/email.ts`, `app/page.tsx`, `lib/standings.ts` |
| Migration numbers 0037–0049 mean different things in each repo | Write a mapping table (VA-States number ↔ template number) before porting any schema change; number new migrations the same in both |
| Survey table name | VA-States uses `vsyc26_survey_responses`, the template `contest_survey_responses`; pick the generic name in both |
| Legacy `contest_staff_accounts.role` column | Drop once migrations 0044 and 0045 are everywhere |
