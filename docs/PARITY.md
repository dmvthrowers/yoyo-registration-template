# Parity: live repos and templates

Our live repos and the public templates stay in step, so the templates are always what we actually
run at a real contest.

| Live repo | Template | What it is |
|---|---|---|
| [`VA-States`](https://github.com/dmvthrowers/VA-States) | this repo | Registration, payments, judging, results |
| [`dmvthrowers.github.io`](https://github.com/dmvthrowers/dmvthrowers.github.io) (`vsyc26*.html`) | [`yoyo-contest-template`](https://github.com/dmvthrowers/yoyo-contest-template) | The static public event site |

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
