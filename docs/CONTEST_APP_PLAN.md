# Final Plan: Contest App — What We Have vs. What's Next

**October 2026.** The master plan, compared against what's actually in the codebase today
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
| T1 | Scoring completeness tracker | ❌ | Nothing shows which judges are missing which scores |
| T2 | Staged publishing | 🟡 | `vsyc_results_releases` gives per-division/round result releases + global flag — but no freestyle-order-public or judge-preview stages |
| T3 | Judge consistency analysis | ❌ | — |
| T4 | MC announcer sheets | ❌ | No pronunciation/hometown export |
| T5 | Music workflow (renumber, lock, reminders, playback console) | 🟡 | Music upload + per-division slots exist; no Dropbox renumber, no deadline lock, no bulk reminders, DJ portal exists but check it covers playback |
| T6 | Shadow judging | ❌ | — |
| T7 | Registration passes & add-ons | ❌ | Single-division Stripe checkout only |
| T8 | Volunteer shift sign-ups | 🟡 | Volunteer page + roles exist; no public shift sign-up with time slots |

**Verdict:** T1 is the single highest-leverage build. T2 needs two more stages, not a rebuild.

## 3. Spectator & public experience

| # | Item | Status | Notes |
|---|------|--------|-------|
| T9 | Spectator predictions | ❌ | — |
| T10 | Public activity log | ❌ | — |
| T11 | Score breakdown tooltips | ❌ | — |
| T12 | Heat map toggle | ❌ | — |
| T13 | Freestyle video embeds | 🟡 | `lib/contest-videos.ts` exists; check whether results pages actually render playlists |
| T14 | Round-depth filter + fullscreen | ❌ | — |
| T15 | Standings with clickable match history | ❌ | — |
| T16 | Embeddable results/bracket widget | ❌ | — |
| T17 | Match lifecycle states | ❌ | — |
| T18 | Rich contest info page | 🟡 | Registration exists; division fees/routine lengths/music deadlines not surfaced pre-signup in one view |
| R10 | Live results (WCA Live model) | 🟡 | Results/spectate/overlay pages exist; verify they update mid-event, not just on publish |
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
| R9 | Challonge import/export | ❌ | — |

## 5. What we already have (no work needed)

Registration with Stripe + Turnstile · spectator RSVP · player signup · judge portal · DJ portal ·
run order + walk-up admin · per-division/round results releases · admin registrations/results/brackets/codes/schedule ·
budget section · sponsor pipeline tables (0048/0049, app code in PR #77) · music upload + slots ·
survey/feedback/upload pages · volunteer page (basic) · home-state eligibility · payment dispute flags.

---

## Revised build order (gaps only)

### Phase 1 — Contest-day leverage, minimal code
1. **T1** scoring completeness tracker — the one build that changes contest day
2. **T2** two more publish stages (freestyle order public, judge preview) on the existing releases table
3. **F1** bracket match scoring — smallest format change, unlocks kendama battles
4. **T11+T12** tooltips + heat map — frontend only, immediate spectator trust
5. **T4** MC announcer sheets — small, high day-of value
6. **S7** kendama preset rewrite (config only) + **S2/S3** trick list + prize table pages
7. **R2** $0 add-on divisions

### Phase 2 — Formats + engagement
8. **F3** race/heats · **F6** standing · **F7** bracket seeding · **F9** panel options
9. **T9+T10** predictions + activity log
10. **T5** music workflow completion (lock, renumber, reminders)
11. **T13** video embeds (finish) + **R10** verify live results
12. **T8** volunteer shift sign-ups · **R1** video prelims

### Phase 3 — Bigger / niche
13. **F2** double elim · **F4** trickscore · **F5** numbers · **F8** Swiss/round robin
14. **T3** judge consistency · **T6** shadow judging
15. **T14–T17** bracket spectator suite (depth filter, match history, lifecycle, embed widget)
16. **T16** results embed widget · **R9** Challonge integration · **T7** passes & add-ons
17. **S8** convention preset · **R7/R8** workshop forms + raffle · **C1** games library

### Deliberately not building
NYYL member wizard · AI photo galleries · league competitions map · WCA-style task assignment ·
Challonge template-cloning/Premier mechanics.

---

## Open decisions (unchanged from master plan)

1. Which kendama formats first? 2. Kendama at VSYC-27 or separate jam? 3. Host or partner on a
juggling convention? 4. Challonge: integrate or replace? 5. Girls divisions: add-on or standalone?
6. Video prelims at all? 7. Embeddable widget: free marketing vs. free load? 8. Predictions: any
concerns? 9. Budget tracker: in-app or in finance tracking? 10. Public sponsorship checkout?
