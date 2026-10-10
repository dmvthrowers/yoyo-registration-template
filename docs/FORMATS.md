# Contest Formats

Every division in `contest.config.ts → competition.divisions` picks one judging format, an entry
type, and optionally rounds. `presets/competitions.ts` has worked examples of all of them
(`yoyoFull` uses every format at once).

| Format | Use it for | How it's judged | Where results come from |
|---|---|---|---|
| `freestyle` | NYYL-style yo-yo, diabolo, top freestyle | Clicker tally normalized per judge + 4 eval categories − deductions | `contest_scores` → `contest_results` |
| `panel` | Artistic Performance, doubles, juggling acts, kendama freestyle, best trick | Each judge scores your criteria; total = sum; judges averaged | `contest_scores.panel_scores` → `contest_results` |
| `manual` | Speed runs, endurance, longest spin, most catches, paper scoresheets | One number per judge, best of N attempts; higher or lower wins | `contest_scores.manual_score` (+ `manual_attempts`) → `contest_results` |
| `ladder` | Kendama / yo-yo trick ladders | A fixed trick list, N tries each; climb until you miss every try | `contest_ladder_attempts` |
| `bracket` | Battles: trick battles, ring battles, last-one-juggling | Single elimination; judges vote each match; an admin confirms | `contest_bracket_matches` + `contest_battle_votes` |
| `showcase` | Exhibitions, guest acts, first-timers | Not judged; appears in the run order | `contest_run_order` |

**Entries.** `entry: { type: 'solo' }` (the default) or
`{ type: 'team', label: 'Pair', min: 2, max: 2, pricing: 'team' | 'person' }`.
- Every team member registers and signs the waiver themselves.
- The **captain** creates the team, which gets a 6-character `join_code`, and teammates enter
  that code when they register.
- The captain's registration stands for the team in the run order, the scores and the brackets.
  `contest_entry_name(registration_id, division)` returns the team name for display.
- `pricing: 'team'` charges the captain once and members $0; `'person'` charges everyone.

**Rounds.** `rounds: [{ name: 'Prelims', advance: 10 }, { name: 'Finals' }]`.
- Rounds apply to freestyle, panel and manual divisions only.
- Scores and run order carry `round` (1-based).
- Advancing takes the top `advance` from a round's standings into the next round's run order;
  ties at the cut all go through.

**Age split (preview).** `split: { above: 15, minBracket: 5, labels: ['Youth', 'Adult'] }` on a division. With more than `above` paid entrants, the run-order screen shows a preview of splitting it into a younger and an older bracket, with a suggested cut age and a field to try another. Each bracket must have at least `minBracket` players. Nothing is applied: a split isn't wired into the run order or results yet.

## Rules that live in one place

`lib/divisions-core.ts` is pure, unit-tested logic used by pages, API routes and tests:

| Area | Functions |
|---|---|
| Fees | `computeFee(…, joining)` and `freeTeamJoins`, for team pricing |
| Panel scoring | `panelTotal`, `panelMax` |
| Manual scoring | `manualBest`, `betterOf`, `compareScores` |
| Ladder | `ladderResult`, `compareLadder`, `ladderNext` |
| Bracket | `buildBracket` (byes go to top seeds), `setWinner` (advances winners and clears stale results downstream), `bracketPlacements`, `majorityPick` |
| Rounds | `roundsOf`, `advancers` |
| Display | `formatSummary(division)`: the one-line description of how a division is judged |

The database copies each division's full rules into `contest_divisions.config`; the triggers in
migration 0039 validate scores, ladder attempts, bracket matches and team sizes against it.

## API contracts

All staff routes take `Authorization: Bearer <supabase access token>` and check
`contest_staff_accounts`. Public GETs never expose legal names of minors: use
`contest_entry_name()` / `contest_public_name()`, or `runOrderDisplayName` in TS.

### Scores — `app/api/scores/route.ts` (freestyle, panel, manual)
- `POST /api/scores` (judge): `{ registration_id, division, round?=1, style_code?, notes?, … }`
  - Freestyle: the sheet fields.
  - Panel: `panel_scores: { [criterionKey]: number }`.
  - Manual: `manual_attempts: (number|null)[]` or `manual_score`.
- `GET /api/scores?division=&round=&mine=1` (judge): this judge's rows for that round.

### Teams
- `GET /api/teams/lookup?code=XXXXXX` (public, rate-limited) →
  `{ team: { name, division, division_name, members, max } }`. It gives a count, never member names.
- `POST /api/register` and `POST /api/admin/walk-up` accept
  `teams?: { [division]: { create: { name } } | { join: { code } } }`.
  - Required for every team division the registrant selects.
  - A join code must belong to that division and the team must have room.
  - Fees use `computeFee(…, joining)`.
  - On success the response includes `teams: [{ division, name, join_code, role: 'captain'|'member' }]`.
- `GET /api/confirm?…` also returns `teams` like the above, so the confirm page can show the join code to share.

### Ladder
- `GET /api/ladder?division=` → `{ division, tricks, attemptsPerTrick, entries: [{ registration_id, display_name, attempts: LadderAttempt[], result: LadderResult }] }`.
  - Public once results are published.
  - Staff can always see it; judges need it on the day.
- `POST /api/ladder` (judge) `{ division, registration_id, trick_index, attempt, landed }` upserts one attempt.
- `DELETE /api/ladder` (judge) `{ division, registration_id, trick_index, attempt }` is an undo.

### Brackets
- `GET /api/bracket?division=` (public) → `{ division, matches: [{ id, round, position, is_third_place, entry_a, entry_b, winner, status, a_name, b_name, winner_name }], placements, rounds }`.
  - Judges also get `votes: { match_id: { a, b, mine } }`.
- `POST /api/admin/bracket` (admin) `{ division, action: 'generate' }` builds round 1 from paid entrants, using `buildBracket` with config seeding.
  - Refused once any winner is recorded, unless `force: true`.
  - `{ division, action: 'reset' }` clears the bracket.
- `POST /api/admin/bracket/winner` (admin or run-order editor) `{ match_id, winner }` applies `setWinner` and saves every changed match. `winner: null` clears it.
- `POST /api/bracket/vote` (judge) `{ match_id, pick: 'a'|'b' }` upserts the judge's vote.
- `POST /api/admin/bracket/status` `{ match_id, status: 'pending'|'live'|'done' }` marks which battle is on.

### Rounds
- `GET /api/run-order?division=&round=` (round defaults to 1).
- `POST /api/admin/run-order` body adds `round?`.
- `POST /api/admin/rounds/advance` (admin) `{ division, from_round }`:
  - Builds the next round's run order from that round's standings, best seed last.
  - Ties at the cut all advance.
  - Refused if the next round already has scores.

### Standings — `lib/standings.ts`
- `fetchStandings(supabase)` → `Record<division, DivisionStandings>`.
- `DivisionStandings` is `{ format, better, rounds: { name, rows: StandingRow[] }[], final: StandingRow[] }`.
- `StandingRow` is `{ place, registration_id, display_name, city, state, value, value_label, detail? }`.
- `final` is the overall order:
  - Rounds: last-round finishers first, then everyone else by their best earlier round.
  - Ladder: by `compareLadder`.
  - Bracket: from `bracketPlacements`, then losers by the round they reached.
  - Showcase: empty.

## Audience-decided battles

Set `decidedBy: 'audience'` on a bracket division. This is modelled on the VSYC-26 Stella Duellum
guest event: one-minute routines, random music, no repeated routines, and each winner picked by a
live chat poll on the YouTube stream.

- The admin runs the poll wherever the crowd is (a YouTube or Twitch poll, or a show of hands),
  then types the two vote counts into the match (`votes_a` / `votes_b`).
- The app suggests the winner with `pollWinner`. The admin confirms it, and the winner advances
  as usual.
- With `thirdPlaceByVotes: true` and no third-place match, the two semifinal losers are ranked
  by total votes across the bracket, as Stella Duellum did. `voteTotal` does the counting.
- `rules: [...]` lists battle rules for players and the public bracket page.

### Future: counting votes straight from stream chat

This isn't built yet. The planned design:

- **Voting window.** On the live match, an admin clicks *Open voting*. The app counts chat
  messages like `!a` / `!b` (or `1` / `2`) for N seconds, one vote per chat user, with the last
  message counting. *Close voting* writes the totals into `votes_a` / `votes_b`, and the admin
  confirms.
- **Twitch.** Chat can be read anonymously over Twitch's IRC WebSocket, so it needs no keys.
- **YouTube.** Live chat comes from the YouTube Data API (`liveChatMessages.list`), which needs
  an API key and the stream's live chat ID. Polling uses quota, so the app would only poll while
  a voting window is open. YouTube's own built-in polls don't appear to be readable through the
  API, so chat commands are the dependable route.
- **Both at once.** A stream can be on YouTube and Twitch together; the counts are summed and
  shown per platform.
- **Overlay.** A browser-source page for OBS shows the two names and the live vote bar.
- **Where it runs.** Reading chat needs a long-lived connection, which Vercel functions don't
  provide. It would be a small worker process, or run in the admin's browser tab while the
  battle runs. The browser-tab option needs no new hosting.

## Live schedule

`contest.config.ts → dayOf.schedule` lists the day's blocks: id, title, a planned `start` in
"HH:MM", `minutes`, and optionally a `division` and `round`. A block can be `fixed: true` (lunch,
awards) so it never moves.

On the day, the admin schedule screen moves each block through its states. A judged block (one
with a division) goes **Start → Close judging → Publish results**. A block with no division goes
**Start → Done**.

- **Publish results** writes `contest_results_releases (division, round)`. That division's
  results go public right away, before the rest of the contest. The global `results_published`
  flag still shows everything at once.
- `liveSchedule()` (`lib/schedule-core.ts`) estimates every block's time:
  - Started blocks use their real times, and a live block runs at least until now.
  - Later blocks follow the block before them. They never start before their planned time
    unless `dayOf.allowEarlyStarts` is set.
  - Fixed blocks stay put.
  - Each block also gets its delay in minutes.

API:
- `GET /api/schedule` (public) → `{ timeZone, now, items: LiveItem[], now_items, next }`.
- `POST /api/admin/schedule` (admin or run-order editor) `{ item_id, action: 'start' | 'close_judging' | 'publish' | 'done' | 'reset' }`
  applies `applyScheduleAction`. Publish writes the release row. Reset clears the block's state
  and removes its release.
- `lib/results-visibility.ts`: `publishedDivisions(supabase)` returns the global flag plus the set
  of `division:round` keys that have been released. Every public results reader uses it: the
  results page, `GET /api/scores`, `GET /api/ladder` and standings.

## Side events

`dayOf.sideEvents` sets up quick crowd events such as longest sleeper or most loops in 60
seconds. They need no registration or fee.

- `kind: 'timer'` gives staff a big stopwatch. `kind: 'counter'` gives a tap +1 counter, which can
  stop itself after `timeLimitSeconds`.
- Each try is a row in `contest_side_entries` with a name and a value.
- `sideLeaderboard()` keeps each person's best try (matched by registration, or by name), and
  ties share a place.
- Staff should type **first name + last initial**, especially for kids.

API:
- `GET /api/side-events` (public) → every event and its leaderboard. `?code=` returns one event.
- `POST /api/staff/side-events` (any active staff role) `{ code, name, value, registration_id? }`.
- `PATCH /api/staff/side-events` `{ id, hidden }` hides a mistaken try.

Pages:
- `/schedule` and `/side-events` are public.
- `/admin/schedule` and `/staff/side-events` are for staff and admins.
- `/overlay/schedule` and `/overlay/side-event?code=` are OBS browser sources.

## Release gates

Off by default. Set `dayOf.releaseGates: true` in `contest.config.ts` and a round's results can be published
(from **Run the Day**) only when two things are true:

1. The scores-in board is full: the round has a run order, every competitor has finished performing and has a
   score from every judge who scored anyone (the same check as `/api/admin/score-status`).
2. The head judge has tapped **Mark scores checked** (`results.publish` capability: admin and judges).

If a score is added or edited after the check, the gate closes again until it is re-checked. Resetting a block
takes back its check. Publishing without a check answers 409 with the reasons, and **Run the Day** shows them.
The global `results_published` switch on `/admin/event` skips the gates on purpose: it is the "show everything"
override. Needs migration `0052_release_checks.sql`.
## Published draws

Every saved run order can say how it was made, and the public run-order page (`/results/run-order`) shows it:

- **Random draw**: the **Random draw** button picks a seed and orders everyone by it. The seed is published; the
  page re-runs the draw in the visitor's browser and says whether the order matches. The algorithm is in
  `lib/draw.ts` (sort the registration ids, then Fisher–Yates driven by sfc32 seeded from the seed text), so anyone
  can re-run it. The server refuses a "random" order that isn't what its seed draws.
- **Rule**: **Auto-sort by pref** and the next-round advance record the rule in words.
- **Hand edit**: needs a reason, shown publicly.

Off by default. Set `dayOf.publishedDraws: true` and a save that doesn't say how the order was made is refused.
With it off, orders save as before and a draw is recorded only when one is sent. Needs migration
`0053_run_order_draws.sql`.
## Code of conduct version

`contest.codeOfConductVersion` (default `'1'`) is stored as `code_of_conduct_version` on every registration,
walk-up, spectator and volunteer when they accept the code. The registrations CSV export has the column. After you
revise the code, bump the version: `lib/conduct-version.ts` sorts people into `current`, `outdated` (accepted an
older version) and `unrecorded` (signed up before versions were stored, null in the database). Judges, staff and
sponsors don't accept the code in a form today, so they aren't covered yet. Needs migration `0054_conduct_version.sql`.
## Photo and video release

`contest.photoConsent` is `'required'` by default: everyone ticks the release to enter, as before. Set it to
`'optional'` and the box can stay empty (a guardian's choice for minors). The registration form says so, a walk-up
no longer assumes consent, and the media team gets a **Do-not-photograph list** at `/media/consent`
(`media.upload` or `media.publish`) with entrants and volunteers who opted out. Apply migration
`0055_photo_consent_optional.sql` first: it stops the database insisting on the box. There is no per-person
photo gallery in the template yet, so the list is how consent is honored today.
## How it was scored

The results page ends with each division's scoring in plain words, with a "How it's scored" note for every number
(`lib/how-scored.ts`). The words are built from the division's own scoring config, so changing a cap or a deduction
in `contest.config.ts` changes the explanation too.

`contest.resultsShading: true` shades each row of the freestyle, panel and manual results tables by how close it is to
the best score (best row filled to the right edge, worst almost clear), so the gaps between places show without reading
every number. Off by default. The score is always printed too, so shading is never the only signal.

Not built yet: a per-judge, per-category public score sheet for each player (the second half of T11). That needs
decisions on how judges are named publicly; see the build plan.
## MC cards

`/mc/cards` (`mc.script`: admin and the MC) shows one card per competitor in run order, for any division and round:
the name to read, how to say it, how they want to be introduced, their sponsor and club. Players fill three optional
boxes on the registration form ("How to Say Your Name", "Sponsor", "How Should the Announcer Introduce You?"). **Print**
gives a plain black-on-white fallback. The announcer reads names to the room, so cards follow the public-name rules:
a minor whose guardian hasn't opted into public listing appears as a handle or first name + last initial, with no
location and no pronunciation (it would spell the surname). Needs migration `0056_mc_card_fields.sql`.
## Rules page

`/rules` shows the current rules version, each division's scoring in a line, and a dated list of every change, newest
first (`contest.rulesPage` in `contest.config.ts`). When you change a rule, add an entry at the top of `changes` and
set `version` to match; a test fails if they disagree or a date is malformed. Publish it before registration opens.
`enabled: false` drops the page and its footer link. Your own full rules page (`contest.links.rules`) is linked from it.
## Open books

The public budget page (`/budget`) adds a **By Category** section: income and costs by category, with a **Planned**
column next to **Actual**. In the admin Budget tab, tick **Planned figure** to publish a number before the event;
planned rows never count toward the totals or the fundraising goal. Categories: registration (planned only, since
actual registration income is read live from paid fees), sponsor, merch, spectator income, venue, prizes, equipment,
printing, food, insurance and other. `contest.budgetLeftoverNote` says where any surplus goes. Needs migration
`0057_open_books.sql`.
## Contest guide

`/guide` is one public page built from `contest.config.ts`: date and venue, every division with its fee, how it is
judged and its routine length, the registration and music-upload deadlines (in the venue's time zone and, when it
differs, the reader's own), and a "Never competed before?" path: divisions marked `beginnerFriendly: true`, the
`contest.guide.bring` list and the day's planned schedule. Nothing to write by hand; change the config and the page
follows. `contest.guide.enabled: false` drops the page and its footer link.
## Bracket match scores

For battles won on points (kendama trick-deck battles, best-of-N), add `matchScoring` to a bracket division:

```ts
scoring: { format: 'bracket', seeding: 'random', thirdPlaceMatch: true, matchScoring: { to: 3, finalsTo: 5 } }
```

First to `to` wins a match; the final plays to `finalsTo` (default: same as `to`); the third-place match plays to
`to`. On the admin and judge bracket screens the selected match shows a **+ / −** counter for each side; **Save score**
stores it (`/api/admin/bracket/score`). When a side reaches the target it is set as the winner exactly as **Confirm**
would (advancing, filling the third-place match), and a score that is no longer decisive takes a standing winner back.
Play stops at the target, so a score above it, or both sides on it, is refused. Running scores show on the public
bracket. Taking a result back removes the scores of any later match whose entrants change. Needs migration
`0058_bracket_match_scores.sql`. Without `matchScoring`, brackets work as before.
## Trick lists page

`/tricks` lists the tricks of every `ladder` division in order, with how the ladder works (tries per trick, or points).
It is built from `competition.divisions`, so it appears, with a footer link and a sitemap entry, only when a ladder
division exists. Nothing to write by hand.

## Kendama preset

`presets/competitions.ts` → `kendama` now describes kendama with today's formats: the **Speed Ladder** is a timed
`manual` division (lowest seconds wins, best of two runs); **Kendama Battle** is a `bracket` with
`matchScoring: { to: 3, finalsTo: 5 }` (trade tricks from the deck, a point per trick won); the **Trick Ladder** and
**Freestyle** stay as they were. Copy it over `competition` in `contest.config.ts` and run `npm run divisions`.
