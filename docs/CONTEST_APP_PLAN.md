# Contest App Plan: What We Have vs. What's Next

**October 2026.** The [master plan](CONTEST_APP_MASTER_PLAN.md), compared against what's actually in the codebase today
(va-states registration app + contest site templates). Status per item: ✅ have it, 🟡 partial,
❌ gap. Build order at the bottom includes only real gaps, reprioritized.

---

## 1. Format engine

| # | Item | Status | Notes |
|---|------|--------|-------|
| F1 | Bracket match scoring (to 3 / 5) | ❌ | Bracket stores winner only; no per-match score |
| F2 | Double elimination | ❌ | Single elim only |
| F3 | `race` with heats | ❌ | No heats anywhere |
| F4 | `trickscore` (KWC-style) | ❌ | — |
| F5 | `numbers` (object count → catches) | ❌ | — |
| F6 | `standing` (last one standing) | ❌ | — |
| F7 | Bracket seeding from prior round | ❌ | Rounds and brackets aren't connected |
| F8 | Swiss / round robin | ❌ | — |
| F9 | Panel options (trimmed mean, time penalty, rank) | 🟡 | Panel exists with fixed averaging; no trim/rank/penalty options |
| F10 | Configurable tie-breaks | ❌ | — |

**Verdict:** the format engine is the biggest honest gap. Everything here is ❌ except F9.

## 2. Contest-day operations

| # | Item | Status | Notes |
|---|------|--------|-------|
| T1 | Scores-in board | ❌ | Nothing shows which judges are missing which scores |
| T2 | Release gates | 🟡 | `vsyc_results_releases` gives per-division/round result releases + global flag, but no run-order gate and no head-judge "checked" step |
| T3 | Judge calibration notes | ❌ | — |
| T4 | MC cards | 🟡 | MC page exists; no say-it-like-this name field or per-competitor cards |
| T5 | Music desk | 🟡 | Music upload + per-division slots exist; no run-order file naming, no deadline lock, no reminders; DJ page exists but check it covers playback |
| T6 | Judge practice mode | ❌ | — |
| T7 | Bundles and add-ons | 🟡 | Combo pricing exists; no merch add-ons, custom questions or pay-at-door channel |
| T8 | Volunteer shifts | 🟡 | Volunteer page + roles exist; no shift sign-up with time slots |

**Verdict:** T1 is the single highest-leverage build. T2 needs a run-order gate and a "checked" step, not a rebuild.

## 3. Spectator & public experience

| # | Item | Status | Notes |
|---|------|--------|-------|
| T9 | Fan picks | ❌ | — |
| T10 | Contest feed | ❌ | — |
| T11 | How it was scored | ❌ | — |
| T12 | Score shading | ❌ | — |
| T13 | Routine videos | 🟡 | `lib/contest-videos.ts` exists; check whether results pages actually render playlists |
| T14 | Battle board, phone view | ❌ | — |
| T15 | Battle board, player path | ❌ | — |
| T16 | Results on club sites | ❌ | — |
| T17 | Battle board, live status | ❌ | — |
| T18 | Contest guide page | 🟡 | Registration exists; division fees/routine lengths/music deadlines not surfaced pre-signup in one view |
| R10 | Live results during the event | 🟡 | Results/spectate/overlay pages exist; verify they update mid-event, not just on publish |
| S2 | Trick list page | ❌ | — |
| S3 | Prize table | ❌ | — |
| S4 | Lineup page | ❌ | — |
| S5 | Watch page | ❌ | — |
| S6 | Visitor guide | ❌ | — |

**Verdict:** almost entirely greenfield. T11+T12 are the cheapest wins (frontend only).

## 4. Registration & event features

| # | Item | Status | Notes |
|---|------|--------|-------|
| R1 | Video prelims | ❌ | Upload page exists for music; no video submission + review queue |
| R2 | $0 add-on divisions | ❌ | — |
| R3 | Capped divisions + waitlist | ❌ | — |
| R4 | Pass types (multi-day, single-day, under-N free) | 🟡 | Spectator RSVP exists; no tiered/day passes |
| R5 | Trick list date + self-placement check | ❌ | — |
| R6 | Equipment class per entry | 🟡 | `style_code` exists for yo-yo styles (multipliers); not yet used for equipment classes |
| R7 | Workshop-host / performer forms | ❌ | — |
| R8 | Raffle | ❌ | — |
| R9 | Bracket import and export (CSV) | ❌ | — |

## 5. Ideas that are only ours

| # | Item | Status | Notes |
|---|------|--------|-------|
| O1 | First contest path | ❌ | — |
| O2 | Player page after the contest | 🟡 | Player login exists; no scores, score sheet, video or certificate on it |
| O3 | Club link | ❌ | — |

## 6. What we already have (no work needed)

Registration with Stripe + Turnstile · spectator RSVP · player signup · judge portal · DJ portal ·
run order + walk-up admin · per-division/round results releases · admin registrations/results/brackets/codes/schedule ·
budget section · sponsor pipeline tables (0048/0049, app code in PR #77) · music upload + slots ·
survey/feedback/upload pages · volunteer page (basic) · home-state eligibility · payment dispute flags.

---

## Revised build order (gaps only)

### Phase 1: Contest-day leverage, minimal code
1. **T1** scores-in board, the one build that changes contest day
2. **T2** release gates: a run-order gate and a head-judge "checked" step on the existing releases table
3. **F1** bracket match scores, the smallest format change; unlocks kendama battles
4. **T11+T12** how it was scored + score shading (frontend only)
5. **T4** MC cards, small with high day-of value
6. **S7** kendama preset rewrite (config only) + **S2/S3** trick list and prize table pages
7. **R2** $0 add-on divisions
8. **T18** contest guide page + **O1** first contest path

### Phase 2: Formats and the public side
9. **F3** race/heats · **F6** standing · **F7** bracket seeds · **F9** panel options
10. **T10** contest feed · **T9** fan picks (if we decide yes)
11. **T5** music desk (run-order naming, lock, reminders)
12. **T13** routine videos (finish) + **R10** verify live results · **O2** player page
13. **T8** volunteer shifts · **R1** video prelims

### Phase 3: Bigger / niche
14. **F2** double elim · **F4** trickscore · **F5** numbers · **F8** Swiss/round robin
15. **T3** judge calibration notes · **T6** judge practice mode
16. **T14, T15, T17** battle board
17. **T16** results on club sites + **O3** club link · **R9** bracket import/export · **T7** bundles and add-ons
18. **S8** convention preset · **R7/R8** workshop forms + raffle · **C1** games library

### Deliberately not building
A membership sign-up wizard · AI face-tagged galleries · a league-wide competitions map · paid
tiers or upsells · automatic staff task assignment.

---

## Open decisions

The ten in the [master plan](CONTEST_APP_MASTER_PLAN.md) (Part 7): kendama formats first; kendama at
VSYC-27 or a separate jam; host or partner on a juggling convention; import outside brackets or run
them all here; girls divisions as add-ons or standalone; video prelims at all; who gets the club-site
results snippet; fan picks yes or no; where the budget lives; sponsor payments online or invoice-only.
