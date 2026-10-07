# Master Plan: Contest App Feature Roadmap

**October 2026.** What we build next, and why each piece looks the way it does.

We looked at how real skill toy events run ([`FORMAT_RESEARCH.md`](FORMAT_RESEARCH.md)) and at the
contest and bracket tools organizers use today, to learn what goes wrong on contest day. This plan
doesn't copy any of them. Every feature below is designed from our own principles, uses our own
names, and fits the app we already have (judge, MC, DJ, overlay, spectate, volunteer and results
pages). Item codes (F, R, S, C, T, O) match [`CONTEST_APP_PLAN.md`](CONTEST_APP_PLAN.md).

---

## What makes it ours

1. **Built for the people in the room.** Volunteer-run contests, staff on phones, patchy venue
   wifi. Every screen works at 360px, with one hand, and survives a reload without losing work.
2. **Kids are in the field.** Minors get privacy by default. In public they're a first name and
   last initial, with no hometown unless a guardian says yes. Nothing that looks like betting.
3. **Free to watch, nothing to sign up for.** Spectators never need an account. No ads, no
   tracking, no third-party scripts.
4. **Every number explains itself.** A spectator can see how a score was made. A player gets their
   own score sheet afterward, so the contest teaches them something.
5. **One app from sign-up to archive.** Registration, music, judging, results and the season
   archive live together. The organizer owns the data, with no exports to someone else's service.
6. **Any skill toy, any organizer.** Toy words, divisions and rules come from config. A kendama jam
   or a juggling day needs no code change, and nothing in code is ours alone.

---

## Part 1: Formats

The six formats (`freestyle`, `panel`, `manual`, `ladder`, `bracket`, `showcase`) cover about 70%
of the events we researched. The gaps, in value order:

| # | Format | Unlocks |
|---|--------|---------|
| F1 | Bracket match scores (`matchScoring: { to: 3, finalsTo: 5 }`) | Kendama trick-deck battles, best-of-N battles |
| F2 | Double elimination | Pro kendama |
| F3 | `race`: heats, finish order or time, top N go through | Kendama speed ladder, joggling, relays |
| F4 | `trickscore`: pick tricks by point value within a time limit | Kendama World Cup style, best-trick sessions |
| F5 | `numbers`: rank by object count, then catches | Juggling numbers, club challenges |
| F6 | `standing`: last one standing in a group | Combat juggling, Quarters for Time, flow battles |
| F7 | Bracket seeds from a prior round (top N of a panel round) | Freestyle qualifier → Top 16 battles |
| F8 | Swiss and round robin, then an optional top cut | Club leagues, battle nights with lots of players |
| F9 | Panel options (trimmed mean, rank average, time penalty, scaling) | Act-style juggling and spin top contests |
| F10 | Tie-breaks set per division | Moshikame-offs, loop-offs, extra time |

Kendama is the biggest gap: none of its four main formats fits our engine cleanly today.

---

## Part 2: Contest day

These don't add formats. They make the formats we have easy to run when the room is loud and the
schedule is slipping.

| # | Feature | How ours works |
|---|---------|----------------|
| T1 | **Scores-in board** | A grid of the run order against the panel: each square fills when that judge's score lands. The head judge sees the gaps at a glance, and each judge's own phone shows "you still owe #14, #15", so nobody has to go find anyone. |
| T2 | **Release gates** | A round goes public only when the scores-in board is full and the head judge taps "checked". Separate gates for the run order and the results, all on the results releases we already have. |
| T3 | **Judge calibration notes** | After the event, each judge privately sees how their scores sat against the rest of the panel. It's for growing judges, not policing them. The organizer sees the panel's overall spread. |
| T4 | **MC cards** | On the existing MC page: one card per competitor in run order, with the name spelled the way the player says it (they enter it at sign-up), how they'd like to be introduced, and their sponsor. Minors' cards follow the privacy rules. Prints as a fallback. |
| T5 | **Music desk** | Players upload to our own storage. Files are named by run order automatically, so nobody renames anything. Uploads lock at the deadline, with a countdown on the player's page. Missing tracks get one reminder. The DJ page plays in run order with "next up" showing. |
| T6 | **Judge practice mode** | Trainees score alongside the panel on the judge page, clearly marked as practice. Their scores never count. Afterward they see how they lined up with the panel. |
| T7 | **Bundles and add-ons** | Enter several divisions at a bundle price (building on combo pricing), add a shirt or merch at checkout, answer the organizer's own questions from config, and pay at the door as a recorded channel. |
| T8 | **Volunteer shifts** | On the existing volunteer page: roles and time slots from config, sign-up, staff confirmation, a reminder the day before, and a day-of roster on `/staff`. |

---

## Part 3: The public side

| # | Feature | How ours works |
|---|---------|----------------|
| T9 | **Fan picks** | Just for fun: pick who you think takes each battle. No account, no prizes, no money, saved only in your browser. After the battle it shows "the crowd picked…". Off by default. |
| T10 | **Contest feed** | A plain-language timeline on the spectate page and the stream overlay: "Open Freestyle round 2 is up", "Sport Ladder results are out". Staff see a fuller private version that doubles as the audit log. |
| T11 | **How it was scored** | Every results page explains its format in the toy's own words, with a short note on each column. Each player gets a private score sheet with the per-judge breakdown. |
| T12 | **Score shading** | Optional shading on results tables, so the gaps between places show without reading every number. |
| T13 | **Routine videos** | Each routine's video on the results and player pages (privacy-friendly YouTube embeds), shown only with the player's consent. |
| T14 | **Battle board, phone view** | The bracket opens on the current round and zooms out to the full tree, so a 64-player bracket is usable on a phone. |
| T15 | **Battle board, player path** | Tap a player to follow their run through the bracket, battle by battle. |
| T16 | **Results on club sites** | Club sites built from our club template can show their members' results with a snippet, so results travel with the club. |
| T17 | **Battle board, live status** | Each battle is on deck, battling or done, and that status drives the overlay and a big-screen venue view. |
| T18 | **Contest guide page** | One public page generated from config: divisions, fees, routine lengths, the music deadline in the reader's own time zone, and links to the rules. Everything a player needs before signing up, in one place. |

Also here, from the research: R10 live results per division during the event, S2 trick list page,
S3 prize table, S4 lineup page, S5 watch page, S6 visitor guide.

---

## Part 4: Registration and event features

| # | Feature | Why |
|---|---------|-----|
| R1 | Video prelims: a link per division, a review queue for the panel, and finalist status | Many juggling and spin top contests qualify by video; it also opens up online contests |
| R2 | $0 add-on divisions (Girls, Student) that take a parent division's results filtered by eligibility | More podiums without more stage time |
| R3 | Capped divisions with a waitlist | Limited freestyle spots |
| R4 | Pass types: competitor, multi-day, single-day, under-N free | Conventions and multi-day events |
| R5 | Trick list release date and a self-placement checkbox | Kendama level integrity |
| R6 | Equipment class per entry (reuse `style_code`) | Diabolo 2D/3D, traditional vs. open tops |
| R7 | Workshop-host and performer sign-up forms | Conventions need these |
| R8 | Raffle: tickets, a drawing time on the schedule, an admin draw | Every convention runs one |
| R9 | Bracket import and export (CSV) | Players who already run brackets elsewhere can bring them in, and organizers can take theirs out |

---

## Part 5: Ideas that are only ours

Things none of the tools we looked at do, which fit a free, all-ages club:

| # | Idea | What it is |
|---|------|------------|
| O1 | **First contest path** | A "never competed before?" walkthrough from the contest guide: what happens on the day, what to bring, how scoring works, and a beginner division picker. |
| O2 | **Player page after the contest** | Each player's scores, score sheet, routine video and a printable certificate, in one place they can come back to. |
| O3 | **Club link** | A player can name their home club, and the club's site shows the club's results. The contest becomes part of the club year, not a one-off. |

---

## Part 6: Build order

### Phase 1: Contest-day leverage, before VSYC-27 planning locks

Mostly config and contest-day tools. Little new format code.

- T1 scores-in board
- T2 release gates
- F1 bracket match scores (smallest change, biggest kendama payoff)
- T11 how it was scored + T12 score shading (frontend only)
- T4 MC cards
- S7 kendama preset rewrite with today's formats (speed ladder as `manual`, KEN as `bracket`)
- S2 trick list page, S3 prize table
- R2 $0 add-on divisions (Girls, Student)
- T18 contest guide page + O1 first contest path
- C1 games library (club template)

### Phase 2: New formats and the public side

- F3 `race` with heats
- F6 `standing`
- F7 bracket seeds from a qualifying round
- F9 panel options (trimmed mean, time penalty, rank)
- T10 contest feed + T9 fan picks (if we decide yes)
- T13 routine videos + R10 live results check
- T5 music desk
- O2 player page
- R1 video prelims
- T8 volunteer shifts
- S8 `convention` preset (with R7 forms, R8 raffle)

### Phase 3: Bigger and more niche

- F2 double elimination
- F4 `trickscore`
- F5 `numbers`
- F8 Swiss and round robin (pairs with C2 monthly mini-contests)
- T3 judge calibration notes
- T6 judge practice mode
- T14, T15, T17 battle board
- T16 results on club sites + O3 club link
- R9 bracket import and export
- R4 pass types
- T7 bundles and add-ons

Each format follows the same steps: `divisions-core.ts` with unit tests, an additive migration with
a validation trigger, the judge UI, the public results, the contest site's format words, and a demo
in `examples/`.

---

## Part 7: Decisions needed

1. Which kendama formats come first at a DMV event? (Trick-deck battles plus speed ladder cover
   most US events.)
2. A kendama division at VSYC-27, or a separate kendama jam?
3. Host a juggling convention, or partner with the UMD Juggling Club on the Congress of Jugglers in May?
4. Brackets that already live in another tool: import them (R9), or run every bracket here?
5. Girls divisions: $0 add-ons or standalone divisions?
6. Video prelims and online entries at all?
7. **Results on club sites:** offer the snippet to any club, or only clubs using our club template?
8. **Fan picks:** build it (off by default), or skip it?
9. **Budget:** keep contest money in the app's finance screens, or in separate finance tracking?
10. **Sponsor payments:** keep invoice-only, or let sponsors pay for a tier online?

---

## What we're not building

- A membership sign-up wizard. We're a contest app, not a league; our checkout stays one step.
- AI face-tagged photo galleries. A heavy pipeline and a privacy problem with minors.
- A league-wide competitions map. We run contests, not a league.
- Paid tiers, template marketplaces or upsells. The app is free and the template is public.
- Automatic staff task assignment. Overkill until timed events get big.
