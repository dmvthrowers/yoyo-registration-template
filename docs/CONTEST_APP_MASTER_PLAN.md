# Master Plan: Contest App Feature Roadmap

**October 2026.** Merges three sources into one build order:

1. **Claude's skill-toy format research** ([`FORMAT_RESEARCH.md`](FORMAT_RESEARCH.md)) — what formats real kendama, juggling, diabolo, spin top, cubing, stacking, and Beyblade events run, and where our templates fall short.
2. **compete.yoyocontest.com teardown** (public site + admin, via an organizer account) — how the NYYL platform runs contest day: scoring oversight, publishing, music, registration.
3. **Challonge teardown** (Stella Duellum 2026 bracket) — what a dedicated bracket product does that we don't.

Claude's item codes (F1, R1, S1, C1) are kept for traceability. New items from the teardowns are coded **T1–T12**.

---

## Part 1 — Format engine gaps (Claude)

The six formats (`freestyle`, `panel`, `manual`, `ladder`, `bracket`, `showcase`) cover ~70% of events. The gaps, in value order:

| # | Format | Unlocks |
|---|--------|---------|
| F1 | Bracket match scoring (`matchScoring: { to: 3, finalsTo: 5 }`) | Kendama Open trick-deck battles, best-of-N battles |
| F2 | Double elimination brackets | Pro kendama |
| F3 | `race` — heats, finish order/time, top N advance | Kendama speed ladder, joggling, relays |
| F4 | `trickscore` — pick tricks by point value in a time limit | Kendama World Cup style, best-trick sessions |
| F5 | `numbers` — rank by object count, then catches | IJA/WJF numbers, club challenges |
| F6 | `standing` — last-one-standing group heats | Combat juggling, Quarters for Time, flow battles |
| F7 | Bracket seeding from a prior round (top N of panel → bracket) | Kendama freestyle qualifiers → Top 16 |
| F8 | Swiss / round robin + top cut | Beyblade, club leagues, monthly mini-contests |
| F9 | Panel scoring options (trimmed mean, rank averaging, time penalty, scaling) | IJA Championships, ITSA Artistic Showcase |
| F10 | Configurable tie-breaks per division | Kendama moshikame-offs, loop-offs |

Kendama is the single biggest gap: none of its four main formats (Open trick-deck, speed ladder, KEN game, KWC) fits our engine cleanly today.

---

## Part 2 — Contest-day operations (compete.yoyocontest.com admin)

These are the highest-leverage items in the whole plan. They don't add formats — they make the formats we have runnable under pressure.

| # | Feature | What it is | Why it matters |
|---|---------|-----------|----------------|
| T1 | **Scoring completeness tracker** | Final-scores view lists exactly which judges haven't scored which players ("#14 — TE missing: Daniel, Tyler") | On contest day this replaces hunting people down with knowing instantly |
| T2 | **Staged publishing pipeline** | Per-division toggles: freestyle order public → rankings to judges → results public, plus bulk publish | Prevents premature results; judge-preview step catches errors before the crowd sees them |
| T3 | **Judge consistency analysis** | Std dev of normalized scores per player across judges, sortable, flags outliers | Catches a judge who's scoring a different contest than everyone else |
| T4 | **MC announcer sheets** | PDF export: run order, name, age, hometown, pronunciation, sponsor | Whoever's on mic will thank you |
| T5 | **Music workflow** | Dropbox folder per contest, "renumber files" prefixes filenames with freestyle order, lock uploads after deadline, bulk reminder emails, contest-day playback console | They built all of this because music is where contest day breaks |
| T6 | **Shadow judging** | Parallel unofficial scoring, never touches real results, optional anonymized self-comparison | Trains new judges with zero risk |
| T7 | **Registration passes & add-ons** | Bundle divisions at flat price; T-shirts/merch add-ons; custom registration questions; cash-only at-door mode | Direct revenue + fewer "can I just pay at the door?" problems |
| T8 | **Volunteer shift sign-ups** | Public sign-up page with jobs + time slots, accept-toggle, CSV export | We have no volunteer management at all today |

---

## Part 3 — Spectator & public experience (public teardown + Challonge)

| # | Feature | Source | Notes |
|---|---------|--------|-------|
| T9 | **Spectator predictions** (bracket-pick tab) | Challonge | Zero-cost engagement loop; turns viewers into participants |
| T10 | **Public activity log** | Challonge | Timestamped feed of score reports, match start/pause — transparency without a live dashboard, doubles as audit trail |
| T11 | **Score breakdown tooltips** | compete.yoyocontest.com | Plain-language "what is this?" on every results column — builds trust with non-expert spectators |
| T12 | **Heat map toggle** on leaderboards | compete.yoyocontest.com | Instant visual comparison across competitors; pure frontend |
| T13 | **Freestyle video embeds** on results pages | compete.yoyocontest.com | YouTube playlist per competitor with count badge |
| T14 | **Round-depth view filter** (Full / Top 16 / Top 8) + fullscreen | Challonge | Solves huge-bracket-on-phone; fullscreen mode for venue displays |
| T15 | **Standings with clickable match history** | Challonge | Each player's W/L per round jumps to that match |
| T16 | **Embeddable results/bracket widget** | Both | iframe snippet organizers embed on their own sites — every embed markets the product |
| T17 | **Match lifecycle states** (started / paused / reported) | Challonge | Seed of "now playing" displays and station management |
| T18 | **Rich contest info page** — fees, routine lengths, music deadlines (dual timezone), division cards | compete.yoyocontest.com | Surface pre-signup instead of burying it in the form |

Also from Claude's list, fitting here: R10 live results per division (WCA Live model), S2 trick list page, S3 prize table, S4 lineup page, S5 watch page, S6 visitor guide.

---

## Part 4 — Registration & event features (Claude R-list, kept)

| # | Feature | Why |
|---|---------|-----|
| R1 | Video prelim submission + review queue + finalist status | IJA, ITSA, WJF all qualify by video; opens online contests |
| R2 | $0 add-on divisions (Girls, Student) copying parent results filtered by eligibility | NAKO model |
| R3 | Capped divisions with waitlist | Limited freestyle spots |
| R4 | Pass types (competitor / multi-day / single-day / under-N free) | NAKO + conventions |
| R5 | Trick list release date + self-placement acknowledgement | Kendama level integrity |
| R6 | Equipment class per entry (`style_code`: diabolo 2D/3D/Vertax) | Small, clean |
| R7 | Workshop-host & performer sign-up forms | Convention preset needs these |
| R8 | Raffle (tickets, drawing time, admin draw) | Every convention does one |
| R9 | Challonge import/export or link-out | Meet kendama players where they are |

---

## Part 5 — Unified build order

### Phase 1 — Contest-day leverage + correct descriptions (before VSYC-27 planning locks)

Mostly config and high-leverage ops. Little new format code.

- T1 scoring completeness tracker
- T2 staged publishing pipeline
- F1 bracket match scoring (smallest change, biggest kendama payoff)
- T11 score tooltips + T12 heat map (frontend only)
- T4 MC announcer sheets
- S7 kendama preset rewrite using today's formats (speed ladder as `manual`, KEN as `bracket`)
- S2 trick list page, S3 prize table
- R2 $0 add-on divisions (Girls, Student)
- C1 games library (club template)

### Phase 2 — New formats + spectator engagement

- F3 `race` with heats
- F6 `standing` (last one standing)
- F7 bracket seeding from qualifying round
- F9 panel scoring options (trimmed mean, time penalty, rank)
- T9 spectator predictions + T10 activity log
- T13 video embeds + R10 live results check
- T5 music workflow (renumber, lock, reminders)
- R1 video prelims
- T8 volunteer sign-ups
- S8 `convention` preset (with R7 forms, R8 raffle)

### Phase 3 — Bigger and more niche

- F2 double elimination
- F4 `trickscore` (KWC-style)
- F5 `numbers`
- F8 Swiss / round robin (pairs with C2 monthly mini-contests)
- T3 judge consistency analysis
- T6 shadow judging
- T16 embeddable widget
- T17 match lifecycle / now-playing
- R9 Challonge integration
- R4 pass types
- T7 registration passes & add-ons

Each format follows the same pipeline: `divisions-core.ts` + unit tests → additive migration with validation trigger → judge UI → public results → contest-site format words → demo in `examples/`.

---

## Part 6 — Decisions needed

From Claude's research:

1. Which kendama formats come first at a DMV event? (Open trick-deck + speed ladder covers most US events.)
2. Kendama division at VSYC-27, or a separate kendama jam like Blue Ridge Battle?
3. Host our own juggling convention, or partner with UMD Juggling Club on the Congress of Jugglers in May?
4. Challonge: integrate or replace?
5. Girls divisions: free add-ons (NAKO model) or standalone divisions?
6. Video prelims / online entries at all?

New from the teardowns:

7. **Embeddable widget strategy** — do we want other contests embedding our results/brackets? It's free marketing but also free load.
8. **Spectator predictions** — any concern about pick'em-style features, or full steam ahead?
9. **Budget tracker in-app?** compete.yoyocontest.com bakes contest P&L into admin. Ours could live in the finance tracking instead — decide where it belongs.
10. **Sponsorship purchase flow** — PR #77 covers the sponsor pipeline; do we also want their public "buy a sponsorship level" checkout?

---

## Appendix — What we deliberately skip

- NYYL's 6-step member signup wizard (their membership model, not ours — our Stripe flow is simpler)
- AI face-tagged photo galleries (heavy pipeline; revisit if we become a media hub)
- Their league-level competitions map (we're one contest, not a league)
- Challonge's template-cloning and Premier upsells (their business model)
- WCA Groupifier-style task assignment (overkill until timed events get big)
