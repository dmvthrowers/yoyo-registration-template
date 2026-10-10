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

Owner rule (2026-10-10): **the template and the live repo stay in parity.** Core features exist in both;
the live repo may differ only where it holds real data or its own config and content. A feature in one
goes into the other, in the same way as above (port, log, or say it's live-only).

Audited 2026-10-10 by comparing the two repos' `main` branches file by file (app, lib, components,
scripts, workflows, docs). Remove a row when it's closed. The static-site pairs are tracked in
`dmvthrowers.github.io`'s `docs/ROADMAP.md` ("Parity fixes") and `docs/BUILD_PLAN.md`.

### VA-States → template (port into the template)

| Gap | Files in VA-States | Note |
|---|---|---|
| Home-state eligibility and the current champion rule | `lib/residency.ts`, `lib/standings.ts` (`eligible` set), migration 0047 | Owner: a config option, off when `stateChampion.state` is blank. The template still uses the old rule |
| Season purge and reset | `lib/season-purge.ts`, `scripts/purge.ts`, `scripts/results-gaps.sql`, migration 0060 | Template has the design (`docs/SEASON_ARCHIVE.md`) but no code |
| Money-path route test harness | `lib/testing/route-harness.mjs`, `lib/testing/stubs/*` | Stubs for Stripe, Supabase, auth, email, Turnstile; the route tests that use them come with it |
| Nightly encrypted database backup | `.github/workflows/db-backup.yml` | |
| Day-of runbook | `docs/DAY_OF.md` | Make it generic (no VSYC names) |
| Registration audit and spec docs | `docs/REGISTRATION_AUDIT.md`, `docs/specs/*` | Keep what is generic |

### Template → VA-States (port into the live app)

| Gap | Files in the template | Note |
|---|---|---|
| Roles, grants and the `/staff` single pane | `lib/roles.ts`, `lib/modules*.ts`, `components/StaffPane.tsx`, `components/ModuleBoard.tsx`, `/api/admin/roles`, `/api/staff/modules`, migrations 0044, 0045, 0047 | Owner: yes. The biggest port and the one that touches sign-in, so it goes last, behind a flag, with route tests |
| Role pages | `app/mc`, `app/media` (+ `consent`), `app/merch`, `app/stream`, `app/volunteers`, `app/finance`, `app/admin/event`, `app/admin/staff`, `/api/staff/media-consent`, `lib/media-consent.ts` | Depend on roles. MC cards already ported (admin only) |
| Schedule clash check | `lib/schedule-conflicts.ts`, `components/ScheduleConflicts.tsx`, `/api/admin/schedule-conflicts` | No migration; reads paid registrations |
| Public pages: contest guide, rules with changelog, trick lists | `app/guide`, `app/rules`, `app/tricks`, `lib/contest-guide.ts`, `lib/rules-changelog.ts` | Config-driven; content stays in VA-States' config |
| Forms on our own system | `lib/forms.ts`, `lib/forms-server.ts`, `/api/forms/[id]`, `/api/admin/forms`, `/forms/[id]`, `/forms-review`, migration 0061 | Off unless `contest.forms` has a form. Owner: parity applies, so it ports; VA-States adds forms as it needs them |
| Setup safety | `lib/email-stub.ts`, `lib/first-admin.ts`, `scripts/first-admin.ts`, `scripts/render-auth-emails.mjs` | Email log stub and first admin once |
| Local deadline display | `components/LocalDeadline.tsx` | |
| Dependency versions | `resend` 6, `@vercel/analytics` 2 | VA-States is still on 4 and 1 |

### Both

| Gap | Note |
|---|---|
| 151 of the 236 shared files under `app/`, `lib/` and `components/` differ | Much of it is VSYC wording written into VA-States code (surveys, emails, home page, nav and footer) where the template reads `contest.config.ts`. Move that wording into VA-States' config until every shared file is identical; then a port is a copy. Largest: `lib/surveys.ts`, `app/admin/results/page.tsx`, `lib/email.ts`, `app/page.tsx`, `lib/standings.ts` |
| Migration numbers 0037–0049 mean different things in each repo | Write a mapping table (VA-States number ↔ template number) before porting any schema change; number new migrations the same in both |
| Survey table name | VA-States uses `vsyc26_survey_responses`, the template `contest_survey_responses`; pick the generic name in both |
| Legacy `contest_staff_accounts.role` column | Drop once migrations 0044 and 0045 are everywhere |
