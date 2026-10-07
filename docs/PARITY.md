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

From the VA-States roadmap (re-checked 2026-10-06) and `AGENTS.md`. Remove a row when it's closed.

| Gap | Where it is | Missing from | Note |
|---|---|---|---|
| Battles, round plans, disputes, split, champion, prizes, score status | VA-States | template | The template's champion rule is the older one |
| Roles and portals (grants, `/staff` single pane, organizer and sponsor roles) | template | VA-States | VA-States sponsors are admin-only until roles are ported (a separate project) |
| Migrations, `db-backup.yml`, `DAY_OF.md` | both | — | Drifted; port by hand, not by copying files |
| Legacy `contest_staff_accounts.role` column | both | — | Drop once migrations 0044 and 0045 are everywhere |
| VSYC public pages vs. the contest site template | `dmvthrowers.github.io` | `yoyo-contest-template` | Not audited yet; do a first pass and fill in this row |
| Club pages vs. the club site template | `dmvthrowers.github.io` | `yoyoclub-template` | Not audited yet; do a first pass and fill in this row |
