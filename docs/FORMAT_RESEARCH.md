# Research: skill toy competition formats and event features

Planning notes, October 2026. This answers the open question in [`HUB_ROADMAP.md`](HUB_ROADMAP.md):
*"Which toys and formats are next after yo-yo, juggling and kendama, and do any need a format we don't have?"*

It covers kendama, juggling, diabolo, spin tops, and related events (cubing, sport stacking, Beyblade,
flow arts). For each one it compares how real events run with what our three templates support today:

- **`yoyo-contest-template`**: the static contest site (presets, division cards, rules pages)
- **`yoyo-registration-template`**: sign-up, judging, results (the VA-States app)
- **`yoyoclub-template`**: the club and meetup site

Nothing here is a ruleset. These are the formats as events publish them, so we can make the templates
able to *describe and run* them. Every number is cited at the end. Confirm the real values with each
organizer before using them.

---

## Bottom line

1. **Our six formats cover about 70% of what we found.** `freestyle`, `panel`, `manual`, `ladder`,
   `bracket`, and `showcase` handle most yo-yo, juggling, and spin top events.
2. **Kendama is the biggest gap.** None of its four main formats fits ours cleanly:
   - The trick-deck Open battle is a bracket where each match is scored to 3 or 5 points.
   - The speed ladder is a race, not "climb until you miss".
   - The KEN game is a letters game.
   - The KWC format is "pick tricks by level value within a time limit".

   Our `ladder` is the yo-yo sport ladder. Calling a kendama speed ladder a `ladder` today would score
   it wrong.
3. **Brackets need more shapes.** Real events also use double elimination (pro kendama), Swiss rounds
   then a top cut (Beyblade), and "last one standing" groups (combat juggling, Quarters for Time,
   flow battles). We only do single elimination.
4. **Panel scoring needs two more ways to combine judges' scores.** IJA drops the high and low score
   per category and has a time penalty. ITSA's Artistic Showcase ranks entries per judge and averages
   the ranks.
5. **Conventions are a different product from contests.** The Congress of Jugglers, the EJC, NAKO,
   and the Philly and Pocono festivals are built around a workshop wall, an open stage, a fire/LED
   session, games, a raffle, and day passes. They have little or no judging. We already have parts of
   this (`side-events`, `merch`, `schedule`). A **`convention` preset** plus a few small features would
   let us run something like the Congress of Jugglers from the templates.

---

## 1. What we have today (baseline)

| Template | Already supports |
| --- | --- |
| Contest site presets | `yoyo-contest`, `kendama-contest` (3 ladders + battle), `diabolo-contest`, `spintop-contest`, `juggling-contest`, `skill-toy-contest`, `trick-battle` |
| Registration formats (`docs/FORMATS.md`) | `freestyle` (clicker + eval), `panel` (criteria sum, judges averaged), `manual` (best of N, higher or lower wins), `ladder` (N tries per trick, climb until you miss), `bracket` (single elimination, judges or audience vote, 3rd-place match), `showcase`; team entries; rounds with `advance` |
| Registration app pages | judge, mc, dj, overlay, stream, spectate, side-events, merch, volunteer, sponsor, results, survey, upload |
| Club presets | yo-yo, kendama, diabolo, juggling, spin top, skill toy, youth program |

---

## 2. Field research by toy

### Kendama

| Format | How it runs | Fits ours? |
| --- | --- | --- |
| **Open (trick deck battle)** | 1v1 bracket. Single elimination for lower levels, **double elimination for pro**. The trick list is published 1–2 months ahead as a card deck. Spin the ken to see who goes first. Draw a card. Players alternate tries, 3 each. Land while the other misses = 1 point. Both land or both miss = card goes to the null pile. **First to 3** (pro finals: 5). If tied when the deck runs out, reshuffle the null pile. | Partly. `bracket` gives one winner per match, with no match score, no deck, and no double elimination. |
| **Freestyle battle** | 1-minute qualifier runs cut 50–200 players to a Top 16. The bracket has two 45-second runs each, alternating. 3 judges score difficulty, creativity, flow, variety, and cleanliness (difficulty first). Results are 3–0 or 2–1, never a tie. | Mostly. Do the qualifier as `panel` rounds, then a `bracket` with judges voting. We can't send the top 16 from a panel round into a bracket. |
| **Speed ladder / Speed Trick** | Land a fixed list in order (about 7 tricks in the US, 10 in the Japanese "Speed Trick B"). No skipping. **First to finish wins.** Big fields run in heats, and the top 1–3 of each heat go through. The British Kendama Association version is timed: 3 qualifying runs, and ties go to a 60-second moshikame-off. | No. Our `ladder` scores "how far you got". This is a race (placing in a heat) or a time (`manual`, lower wins). There are no heats. |
| **KEN game** | Letters game, like SKATE in skateboarding. Set a trick in 1 try. The other player matches in 2 tries. A miss earns a letter. Spell KEN and you're out. "Prove it" once per game. Variants: KENDAMA, DAMA. | Only as a `bracket` with the rules written in `match_format`. Fine for now. |
| **KWC (Kendama World Cup)** | 100–120 tricks in 10–12 levels, published months ahead. Players pick tricks and try them inside a time limit (two 3-minute rounds, 5 tricks each). A trick scores its level. Finals use higher levels with **squared values** and a bonus for landing in order. Peer-judged groups of 4. Slow-motion video review. | No. A new format: "scored trick list". |

Event practice, from NAKO 2026 (Minneapolis, August 21–23):

- Levels are Beginner, Intermediate, Advanced, Open, and **Student**.
- **Girls divisions at every level, free with competitor registration.**
- Freestyle is limited to set spots for an extra $25.
- A Yank competition runs on Sunday finals.
- A $80 competitor pass includes convention access. A convention pass is $30 for 3 days or $15 for
  one day. Kids under 8 get in free.
- Trick lists come out about a month early, and players are asked to self-place honestly
  ("kentegrity").
- Registration and brackets run on **Challonge**. The stream is on Twitch. Video premieres run
  at night.

Blue Ridge Battle (Asheville, October 10, 2026) is a smaller model:

- Two brackets, Pro Open and Freestyle.
- A cash prize table: $500/$200/$100 per bracket, $1,600 total.
- A DJ lineup.
- Sign-up through Challonge.
- Site pages: Lineup, Watch, Tricks, Guide (visitor guide), Registration.

### Juggling

| Format | How it runs | Fits ours? |
| --- | --- | --- |
| **IJA Juggling Championships** (Individuals, Teams, Juniors under 18) | Acts run 5–8 minutes (Juniors 7 max). 5 categories, each scored 0–10: difficulty, creativity, execution, entertainment, presentation. **Drop the high and low judge in each category**, average the rest, sum, multiply by 2 for a score out of 100. **Time penalty = (seconds over or under)² ÷ 100.** More than 60 seconds off disqualifies. Drop counters inform the judges but don't set the score. **Prelims are by unedited video**, then live finals. | Mostly `panel`. It's missing trimmed means, the time-penalty rule, and video prelims. |
| **IJA Numbers** | Events by prop (balls, rings, clubs, bounce) plus 2- and 3-person passing. Each event has a minimum object count (7–13). A **4-minute window** allows any number of attempts, and **a qualifying run must happen in the first 2 minutes**. To qualify a number, each hand must catch as many times as there are objects. One judge per hand, with flags. Ties get an extra 2 minutes. | No. It ranks first by object count, then by catches. `manual` holds one number. |
| **WJF** | Numbers start at 8 balls / 6 clubs and go up. "789": 5 minutes of 7, 8, or 9 objects. Junior compulsories allow one attempt per move. Equipment rules (white props). | Compulsories are a ladder with 1 try. Numbers needs the format above. |
| **Festival games** | **Combat** (club juggling, last one juggling wins, solo or teams or free-for-all). **Joggling** races (cascade the whole distance, pick up drops). Congress of Jugglers: Quarters for Time (drops are left on the floor, winner takes the quarters), diabolo high toss timed in seconds, distance passing for clubs and diabolo, Simon Says. | Combat and Quarters are "last one standing" (missing). High toss and distance passing fit `manual`. |

### Diabolo

- The first World Diabolo Contest was held in Taiwan in 2025, with **2-diabolo and 3-diabolo
  categories**. Players can enter several categories.
- The US Collegiate Diabolo Competition (Georgia Tech, March 21, 2026) had **solo and team** routines.
  Its detail page didn't load, so the divisions are unconfirmed.
- Judging is the usual freestyle-to-music mix: difficulty, originality, execution, musicality.
- What we lack is **equipment classes inside a division** (2D/3D/Vertax/fixed axle). The diabolo
  preset already mentions them. In the registration app we could use `style_code` the same way the
  yo-yo styles use it.

### Spin tops (ITSA)

- **Open Freestyle**: up to 3 minutes. 85 technical points plus 15 performance points (musicality,
  control, showmanship, 5 each). **The technical score is scaled so the top player gets 85.**
- Any top is allowed. A top that leaves the stage can't be used again. Players must wind their own tops.
- **Artistic Showcase**: teams of 1–4, 3–7 minutes. 5 criteria scored 1–10. **Each judge ranks the
  entries, and the lowest average rank wins.** Ties go to raw total, then Impact.
- Online qualifiers run by video (at least 1.5 minutes of the show).
- Other formats: a sport trick ladder (90 seconds or until the top stops, 1–6 points per trick), a
  "traditional" class (solid wood, fixed metal tip), and longest spin (a 3:19 record at WGO 2019).

### Related events worth borrowing from

| Event | Idea we'd borrow |
| --- | --- |
| **WCA (speedcubing)** | Average of 5 (drop best and worst, mean the middle 3). **Cutoffs**: you get 2 attempts and continue only if one beats the cutoff. A per-attempt **time limit**, after which it's a DNF. Software for groups and task assignment (Groupifier) and **live results** (WCA Live). This is the best model we found for running big timed events quickly. |
| **WSSA sport stacking** | Best of 3 timed tries after 2 warm-ups. Parent/child doubles. Timed relays against the clock, where faults are "scratches". |
| **Beyblade X (WBO)** | **Swiss rounds** (play people with the same record, no one is knocked out early) then a top cut. Swiss matches go to 4 points, top cut to 7. Finishes score 1–3 points by type. A good shape for kids' battle nights with lots of players. |
| **Flow arts (hoop, poi)** | "Last one standing" and king-of-the-hill battles. Audience vote with the host breaking ties. 30-second open spins. Prop-only contests. |
| **Conventions (EJC, Congress of Jugglers, Philly, Pocono)** | Workshop wall plus workshop-host sign-up. Open stage vs. curated gala. Outdoor fire and LED sessions. Games at the end. A raffle drawn at the show. Shirts sold by size (2XL costs more). Free admission paid for by show tickets. "Bring your own fire props." Shared prop pool. |

---

## 3. Gap analysis

### 3a. New scoring formats (registration app, plus matching words in the contest site)

The roadmap rule is "a scoring format is a plugin", so each item below is one plugin. Listed in order
of value to us.

| # | Proposal | Covers | Notes |
| --- | --- | --- | --- |
| F1 | **`bracket` match scoring**: `matchScoring: { to: 3, finalsTo: 5 }`, recording the score per match (e.g. 3–1) | Kendama Open, Beyblade, best-of-3 battles | Smallest change with the biggest kendama payoff. Today a bracket match only stores a winner. |
| F2 | **`bracket.elimination: 'double'`** with a losers bracket and grand final | Pro kendama | `buildBracket` and `setWinner` in `divisions-core.ts` need a losers-side tree. Medium-sized job. |
| F3 | **`race`**: ordered trick list, run in **heats**, record finish order (or finish time), top N per heat go through | Kendama speed ladder, joggling, relays | Reuse `rounds.advance` and add `heatSize`. If timed, store as `manual` lower wins. |
| F4 | **`trickscore`**: trick list where each trick has a **level/points** value; player picks N in a time limit; sum (optional `square: true`, `orderBonus`) | KWC, ITSA sport ladder (1–6 points), "best trick" sessions | Judges tap "landed" per trick, like the `ladder` UI. |
| F5 | **`numbers`**: rank by object count, then catches; per-prop events; time window; qualifying run | IJA and WJF numbers, club "most catches" | Two-key `compareScores`. Could be `manual` with a `secondary` field. |
| F6 | **`standing`** (last one standing): one group heat, record the order people drop out | Combat juggling, Quarters for Time, flow battles, loop-offs | Very small: placement = reverse drop order. |
| F7 | **Bracket seeding from a prior round**: top N of a `panel`/`freestyle` round become bracket seeds | Kendama freestyle (qualifier then Top 16), yo-yo battles | Connects rounds to brackets. |
| F8 | **Swiss and round robin**: `elimination: 'swiss' \| 'roundrobin'` with N rounds, then optional top cut | Beyblade, small club leagues, monthly ladders | Lower priority. Useful for club nights more than contests. |
| F9 | **Panel options**: `aggregate: 'mean' \| 'trimmed' \| 'rank'`, `scale` (e.g. ×2 to 100), `normalizeTop` (ITSA's 85), `timePenalty: { min, max, formula: 'square/100', dqOver }`, `tiebreak: [...]` | IJA Championships, ITSA Artistic, any act-style contest | Config only. The existing `panelTotal` logic stays the default. |
| F10 | **Configurable tie-breaks per division**: e.g. "moshikame 60s", "loop-off", "replay null pile", "extra 2 minutes" | Kendama, yo-yo ladders, numbers | Text plus an optional extra `manual` round. |

**Quick win with no code:** document how to use the existing formats for kendama today. Speed ladder =
`manual`, seconds, lower wins, 3 attempts. KEN game = `bracket` with `match_format`. Then rename or
re-describe the kendama preset's "Trick ladder" divisions. Right now our kendama preset describes
Beginner/Intermediate/Open as yo-yo-style ladders, which isn't how kendama ladders run.

### 3b. Registration features

| # | Proposal | Why |
| --- | --- | --- |
| R1 | **Video prelim submission**: a URL field per division (unlisted YouTube or Vimeo), a review queue for a selection panel, and "finalist" status | IJA, ITSA, and WJF all qualify by video. This also opens up online contests. |
| R2 | **Add-on divisions at $0** (e.g. Girls / Women, Student) that copy a parent division's results filtered by eligibility | NAKO's girls divisions; youth and student categories |
| R3 | **Capped divisions** (limited spots), with a waitlist | NAKO freestyle has limited spots |
| R4 | **Pass types**: competitor pass (includes entry), multi-day spectator pass, single-day pass, under-N free | NAKO and conventions. Spectator tickets exist; day passes and age rules are new. |
| R5 | **Trick list release date + self-placement acknowledgement** ("I've read the Intermediate list and I'm not over-placed") | Kendama level integrity. Plain config, plus one checkbox. |
| R6 | **Equipment class / style per entry** (diabolo 2D/3D/Vertax; top traditional vs open) | Reuse `style_code` |
| R7 | **Workshop-host and performer sign-up forms** | Congress of Jugglers uses Google Forms for both. Fits the "forms on our own system" plan in the roadmap. |
| R8 | **Raffle**: tickets sold at check-in or merch, drawing time on the schedule, winner drawn in admin | Every convention we looked at does one |
| R9 | **Bracket import and export (CSV)** | The kendama scene often runs brackets in other tools. Let organizers bring a bracket in or take theirs out. |
| R10 | **Live results page per division** like WCA Live (we have `results`, `spectate`, `overlay`; check they update during the event, not only once published) | Spectators and the stream |

### 3c. Contest site (`yoyo-contest-template`) features

| # | Proposal |
| --- | --- |
| S1 | **Format words** for the new formats (`race`, `trickscore`, `numbers`, `standing`, `double`/`swiss` brackets, `matchScoring`) so the site and the app describe them the same way |
| S2 | **Trick list page**: printable, one list per level, with a release date and "last updated". Blue Ridge Battle and NAKO both treat this as a main page. |
| S3 | **Prize table** per division (cash or prizes, 1st–3rd) |
| S4 | **Lineup page** (featured players, judges, DJs, guest performers), with the minors privacy rules applied |
| S5 | **Watch page**: stream link, schedule of stream segments, past videos. YouTube-nocookie or Twitch link-out, following the CSP rules. |
| S6 | **Visitor guide**: parking, food, nearby places, accessibility, kids, what to bring |
| S7 | **`kendama-contest` preset rewrite**: Open (trick deck, to 3 / 5 in finals), Speed Ladder (race in heats), Freestyle (qualifier then Top 16 battles), KEN game side bracket, Girls add-on, published trick list dates |
| S8 | **`convention` preset** (new): multi-day hours, workshop wall, open stage, public show, fire/LED session with safety rules, games, raffle, merch by size, prop share. No judged divisions required. Example: `demo-juggling-convention.jsonc`, modeled on the Congress of Jugglers. |

### 3d. Club and meetup site (`yoyoclub-template`) features

| # | Proposal |
| --- | --- |
| C1 | **Games library**: short rules for meetup games we can run with no setup: KEN/letters game, Quarters for Time, combat, longest sleeper or spin, moshikame-off, loop-off, diabolo high toss, Simon Says. Each preset picks its own. |
| C2 | **Monthly mini-contest**: one house-rules format per month (e.g. a race ladder in January, a KEN bracket in February) with a running season table. Swiss or round robin suits this. |
| C3 | **Regional calendar**: nearby festivals and contests (e.g. Congress of Jugglers in May, Philly in June, Pocono in February/March, NAKO in August, VSYC in September) as outbound links |
| C4 | **Workshop rotation**: who's teaching what next meetup, plus a "want to teach?" link |

---

## 4. Suggested order

**Phase 1 (before VSYC-27 planning locks): describe kendama and conventions correctly, little code**

- S7 kendama preset rewrite using today's formats (speed ladder as `manual`, KEN as `bracket`)
- S2 trick list page, S3 prize table
- F1 bracket match scoring
- R2 add-on divisions at $0 (Girls, Student)
- C1 games library

**Phase 2: new formats that unlock whole events**

- F3 `race` with heats
- F6 `standing`
- F7 bracket seeding from a round
- F9 panel options (trimmed mean, time penalty, rank)
- R1 video prelims
- S8 `convention` preset with R7 forms and R8 raffle

**Phase 3: bigger or more niche**

- F2 double elimination
- F4 `trickscore` (KWC-style)
- F5 `numbers`
- F8 Swiss / round robin (pairs with C2 monthly mini-contests)
- R9 bracket import and export
- R4 pass types

Each format is added in the same order every time:

1. Add the format to `divisions-core.ts`, with unit tests.
2. Write an additive migration with a validation trigger.
3. Build the judge UI.
4. Update the public results.
5. Add the format word to the contest site.
6. Add a demo in `examples/`.

---

## 5. Questions to decide

1. **Which kendama formats do we want at a DMV event first?** Open trick-deck plus speed ladder covers
   most US events. The KWC style is niche.
2. **Run a kendama division at VSYC-27, or a separate kendama jam?** Blue Ridge Battle shows a
   two-bracket, one-night event works.
3. **Should we host a convention?** Or partner with the UMD Juggling Club on the Congress of Jugglers
   (May, College Park) and run yo-yo workshops and games there? Partnering costs less and fits the
   regional calendar.
4. **Brackets that already live in another tool: import them, or run every bracket here?** Our app
   owns waivers, payments, and privacy.
5. **Girls / women divisions:** add-on at $0 (NAKO model) or a standalone division?
6. **Video prelims:** do we want online entries at all? They widen the field but add review work and
   a privacy policy for videos of minors.

---

## Sources

- [Sol Kendamas: kendama competition formats explained](https://www.solkendamas.com/blogs/announcements/kendama-competition-formats-explained-a-complete-guide-to-how-kendama-tournaments-work)
- [Blue Ridge Battle](https://blueridgebattle.org/)
- [North American Kendama Open 2026 (Sweets Kendamas)](https://sweetskendamas.com/pages/nako)
- [Kendama World Cup 2019 official trick list (kendama.de)](https://www.kendama.de/en/blog/kendama-worldcup-2019-official-tricklist)
- [British Kendama Association competition pages](https://kendama.co.uk/EKO2015-eko.html)
- [IJA Juggling Championships rules](https://www.juggle.org/ija-juggling-championships-rules/)
- [IJA Numbers Championships rules](https://festival.juggle.org/ija-numbers-championships-rules/)
- [IJA Fight Night Combat](https://festival.juggle.org/events/event/fight-night-combat-juggling/) and [About Fight Night Combat](https://fightnightcombat.com/about-fnc.html)
- [World Juggling Federation (Wikipedia)](https://en.wikipedia.org/wiki/World_Juggling_Federation)
- [EJC (eja.net)](https://eja.net/ejc/)
- [Philadelphia Juggling Festival 2026](https://www.juggle.org/philadelphia-juggling-festival-2026/), [Pocono Juggle and Circus Arts Festival 2026](https://www.juggle.org/pocono-juggle-and-circus-arts-festival-2026-in-lansford-pennsylvania/)
- [World Diabolo Contest 2025 coverage (SAYS)](https://says.com/my/lifestyle/malaysian-wins-silver-bronze-at-world-diabolo-contest-2025)
- [2026 US Collegiate Diabolo Competition (Georgia Tech)](https://calendar.gatech.edu/event/2026/03/21/2026-us-collegiate-diabolo-competition)
- [ITSA Tokyo 2026 spintop contest rules](https://spintops.org/?p=3293), [WGO Spin Top Contest Rules 2024](https://www.wgo.ca/Documents/Competitions/WGO%20Spin%20Top%20Contest%20Rules%202024.pdf)
- [WCA software tools](https://www.worldcubeassociation.org/score-tools), [WCA Regulations](https://www.worldcubeassociation.org/regulations)
- [WSSA competitive stacks](https://www.thewssa.com/about/competitive-stacks)
- [Beyblade X play formats (Mall of Toys)](https://malloftoys.com/en-ca/blogs/news/different-types-of-beyblade-x-play-formats-explained)
- [Intermountain Hoop Dance Competition criteria](https://redbuttegarden.org/events/hoop-dance/intermountain-hoop-dance-competition-criteria/), [Flowtoys contest](https://flowtoys.com/pages/contest-life-is-beautiful)
- UMD Juggling Club, 2026 Congress of Jugglers announcement (shared by the organizer)
