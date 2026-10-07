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
| T19 | Scoring that survives bad signal | ❌ | Judge page has no offline save; a dropped connection loses the unsent score |

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
| R11 | Photo and video consent | ❌ | Minor name opt-in exists (`contest_public_name()`); no photo or video consent |

## 5. Ideas that are only ours

| # | Item | Status | Notes |
|---|------|--------|-------|
| O1 | First contest path | ❌ | — |
| O2 | Player page after the contest | 🟡 | Player login exists; no scores, score sheet, video or certificate on it |
| O3 | Club link | ❌ | — |
| O4 | Open books | 🟡 | Budget and finance screens exist for staff; nothing public |
| O5 | Rules with a changelog | 🟡 | Rules pages exist; no version or change list |

## 5b. Learned from the event hub

| # | Item | Status | Notes |
|---|------|--------|-------|
| E1 | Subscribe with filters | 🟡 | One spectator `.ics` (`lib/ics.ts`); no per-division, per-player or RSS feeds |
| E2 | One event shape for both apps | ❌ | Waits on hub stage 1 (`EventDef`) |
| E3 | Publish to the community calendar | ❌ | — |
| E4 | Daily housekeeping | 🟡 | Crons exist for email and payment reconcile; deadlines, locks, reminders and purge are manual |
| E5 | Report a problem | ❌ | — |
| E6 | Status page | ❌ | — |
| E7 | Submit an event, no account | ❌ | Regional circuit only |
| E8 | Email stub for new deployments | 🟡 | With no `RESEND_API_KEY` the outbox keeps retrying (`lib/outbox.ts`); nothing is lost, but there is no log or preview of what would have gone out |
| E9 | First admin, once | 🟡 | Done by a hand-run SQL insert (`docs/SETUP.md` §6); safe, but a one-time step would be simpler for non-developers |
| E10 | Agent skills in the repo | ❌ | — |

Already shared with the hub: honeypot and rate limits, hashed one-time tokens, magic-link portals, an
audit log.

## 6. What we already have (no work needed)

Registration with Stripe + Turnstile · spectator RSVP · player signup · judge portal · DJ portal ·
run order + walk-up admin · per-division/round results releases · admin registrations/results/brackets/codes/schedule ·
budget section · sponsor pipeline tables (0048/0049, app code in PR #77) · music upload + slots ·
survey/feedback/upload pages · volunteer page (basic) · home-state eligibility · payment dispute flags.

---

## Revised build order (gaps only)

### Phase 1: Contest-day leverage, minimal code
1. **T1** scores-in board, the one build that changes contest day
2. **T19** scoring that survives bad signal · **R11** photo and video consent
3. **T2** release gates: a run-order gate and a head-judge "checked" step on the existing releases table
4. **F1** bracket match scores, the smallest format change; unlocks kendama battles
5. **T11+T12** how it was scored + score shading (frontend only)
6. **T4** MC cards, small with high day-of value
7. **S7** kendama preset rewrite (config only) + **S2/S3** trick list and prize table pages
8. **R2** $0 add-on divisions
9. **T18** contest guide page + **O1** first contest path
10. **E8** email stub · **E9** first admin once
11. **O5** rules with a changelog · **O4** open books

### Phase 2: Formats and the public side
12. **F3** race/heats · **F6** standing · **F7** bracket seeds · **F9** panel options
13. **T10** contest feed · **T9** fan picks (if we decide yes)
14. **T5** music desk (run-order naming, lock, reminders)
15. **T13** routine videos (finish) + **R10** verify live results · **O2** player page
16. **T8** volunteer shifts · **R1** video prelims
17. **E1** filtered feeds · **E4** daily housekeeping · **E5** report a problem · **E6** status page · **E2** one event shape

### Phase 3: Bigger / niche
18. **F2** double elim · **F4** trickscore · **F5** numbers · **F8** Swiss/round robin
19. **T3** judge calibration notes · **T6** judge practice mode
20. **T14, T15, T17** battle board
21. **T16** results on club sites + **O3** club link · **R9** bracket import/export · **T7** bundles and add-ons
22. **E3** publish to the community calendar · **E7** submit an event, no account · **E10** agent skills
23. **S8** convention preset · **R7/R8** workshop forms + raffle · **C1** games library

### Deliberately not building
A membership sign-up wizard · AI face-tagged galleries · a league-wide competitions map · paid
tiers or upsells · automatic staff task assignment.

---

## Open decisions

The eleven in the [master plan](CONTEST_APP_MASTER_PLAN.md) (Part 7): kendama formats first; kendama at
VSYC-27 or a separate jam; host or partner on a juggling convention; import outside brackets or run
them all here; girls divisions as add-ons or standalone; video prelims at all; who gets the club-site
results snippet; fan picks yes or no; where the public budget's books are kept; sponsor payments online or invoice-only; the event hub and this app as two apps or one.
