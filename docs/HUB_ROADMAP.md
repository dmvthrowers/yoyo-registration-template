# Hub roadmap: any skill toy, any event format

**Long-term goal.** One app that runs registration and scoring for any skill toy and any competition
or event format, online or in person. Yo-yo first, then juggling and kendama (diabolo, spin tops and
others after that). It should grow, shrink and combine events: a single event, or a multi-day,
multi-event structure.

This is a direction, not a commitment to a schedule. Work in small steps that each leave a working
app. The live Virginia State Yo-Yo Contest app (VA-States) is the first deployment and stays safe:
real registrants and real payments mean schema, payment and auth changes get production care.

## The model we're heading to

```
Organization (a club)
  └─ Series (e.g. a yearly state contest)
       └─ Event (one edition: one day, or several)
            ├─ Days / sessions     the schedule blocks, per day
            ├─ Competitions        what this template calls divisions: toy, format, entry type, rounds, prizes
            ├─ Registration        people and teams enter competitions; online, walk-up or staff-entered
            ├─ Scoring             a format decides how entries are judged and ranked
            └─ Results & archive   publish, then freeze as static pages and purge the private data
```

Everything above "Competitions" is where today's app is thinnest.

## Where we are

| Capability | State |
| --- | --- |
| Any toy | **Done**: toy wording and presets for yo-yo, kendama, juggling, diabolo, spin tops, mixed (`presets/competitions.ts`) |
| Any format | **Done**: freestyle, panel, manual, ladder, bracket (battles), showcase; solo and team entries; rounds that depend on entrant count; music per round or battle |
| Grow, shrink, combine competitions | **Done within one event**: divisions are data, combo pricing, per-division prizes and age brackets |
| Online and in-person registration | **Partial**: online checkout, comp codes and staff walk-up entry exist; no on-site kiosk or paper-sheet flow |
| Single-day event | **Done**: one schedule, live "run the day", results released per division and round |
| **Multi-day, multi-event** | **Missing**: the event is a singleton (`contest` in `contest.config.ts`, one date, one `dayOf` schedule, tables not tied to an event) |
| Several events in one deployment | **Missing** |
| Several organizations in one deployment | **Missing** (each club runs its own copy of the template) |
| Season archive and purge | **Planned** (see VA-States `docs/specs/season-archive.md`) |

## Decision: one deployment per organization, or one shared hub

- **A. A deployment per organization** (today). Config lives in the repo, each club has its own database,
  Stripe account and data. Simple, safe, cheap, no cross-club data risk. Setup needs a developer.
- **B. One multi-tenant hub.** Config lives in the database with an admin builder; many clubs share one
  deployment. Easy for non-developers, but it makes payments, data separation, support and legal
  (privacy, minors, Stripe Connect) much bigger.

**Recommendation: stay on A and make the event a first-class thing inside it (stage 1), then move config
into the database with an admin builder (stage 2), and only consider B when several clubs are asking (stage 3).**
Each stage ships on its own, and stage 1 is needed for everything after it.

## Stage 1: events, days and multi-event, inside one deployment

Goal: one deployment can hold several events (this year's contest, a workshop day, a side tournament)
and an event can span days. Existing single-event deployments don't change.

1. **`events` in config.** An `EventDef` list: id, name, dates (one or many days), venue, deadlines, fee rules
   and which competitions it runs. A deployment with one event keeps working through a default.
2. **Event-scoped data.** An `event_id` on registrations, entries, run order, scores, music, teams, bracket
   matches, schedule state, releases and prizes. Add it as a column with a default and backfill, in two
   steps (expand, then contract), as the music and round-plan migrations did.
3. **Schedule per day.** `dayOf` becomes a schedule per event day; "run the day" picks today's block list.
4. **Competitions belong to an event, divisions stay data.** The same competition definition can be reused
   by several events; fees, combos and bundles can span competitions in one event (and, later, across events).
5. **Routes and pages per event.** Public pages under an event (`/e/<event>/…`), with the current routes
   mapping to the default event so links don't break.
6. **Results and archive per event.**

Each step is its own PR; none should require a second deployment.

## Stage 2: configuration as data

Move events, competitions, prices, rounds, prizes and schedule from `contest.config.ts` into the database,
with an admin builder (validated by the same pure rules in `lib/divisions-core.ts`) and a "publish" step so a
half-edited event never reaches players. Keep the config file as an import/export format and the source for
presets and tests.

## Stage 3: shared hub (only if needed)

Organizations, per-organization payments (Stripe Connect), role-based staff access across organizations,
data separation and retention rules, a template gallery. Decide this with real demand, not in advance.

## Principles for new work

- **Nothing toy-, club- or event-specific in code.** Names, dates, venues, divisions, prices, formats and wording
  come from configuration. A kendama or juggling event should need no code change.
- **A scoring format is a plugin.** New formats (e.g. a judged trick list, timed relays, head-to-head
  tournaments) should be added by implementing one interface (config shape, entry rules, score entry,
  ranking, results view) and registering it, not by editing every page. Today the formats live in
  `lib/divisions-core.ts` and `lib/standings.ts`; extracting that interface is a stage-1 side task.
- **Registration channels are first-class.** Online, walk-up, staff-entered and (later) bulk or paper import
  all create the same entry, with the channel recorded.
- **Private data has a lifetime.** Every table that holds people's data needs an owner in the archive/purge plan.
- **Safe changes.** Additive migrations first, code that works before and after, applied in the order the PR
  says. Tests for every pure rule.

## Suggested next steps

1. Extract the scoring-format interface and registry (no behavior change; makes formats pluggable).
2. Add `event_id` with a default to the tables, plus tests that a one-event deployment behaves as before.
3. Turn `contest`/`dayOf` into `events` with a default event; build the multi-day schedule.
4. Per-event routes and results; cross-competition bundles.
5. Season archive and purge (so an event can end cleanly).

## Open questions

- Is a "multi-event" deployment mostly one organizer running several related events (a contest plus a
  workshop), or separate organizers sharing a hub? That decides stage 1 versus stage 3.
- Do fees and bundles ever span events (one price for the contest and the workshop)?
- Who builds an event: a developer editing config (stage 1), or a non-technical organizer (stage 2)?
- Which toys and formats are next after yo-yo, juggling and kendama, and do any need a format we don't have?
