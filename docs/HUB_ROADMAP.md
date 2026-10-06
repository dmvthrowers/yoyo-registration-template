# Hub roadmap: any skill toy, any event format

**Long-term goal.** One app that runs registration and scoring for any skill toy and any competition
or event format, online or in person. Yo-yo first, then juggling and kendama (diabolo, spin tops and
others after that). It should grow, shrink and combine events: a single event, or a multi-day,
multi-event structure.

This is a direction, not a commitment to a schedule. Work in small steps that each leave a working
app. The live Virginia State Yo-Yo Contest app (VA-States) is the first deployment and stays safe:
real registrants and real payments mean schema, payment and auth changes get production care.

## Decisions so far (owner)

- **Path (updated):** build it as a **multi-event, multi-club hub**: one deployment can hold several
  organizations (clubs) and several events each, with roles per organization and event. It is also **portable**:
  anyone can deploy their own copy for their own region. The first hub serves the Mid-Atlantic. (This replaces
  the earlier "one deployment per organization, hub only if asked" path; the staged work below is reordered
  accordingly.)
- **Free tiers are the limit.** The Mid-Atlantic hub runs on free tiers, so it can't scale past that region
  without funding. Design for it (see "Designing for free tiers").
- **Who it's for first:** the Mid-Atlantic community (DMV Throwers and its region). It may expand beyond that.
- **Anyone can build and deploy it.** The template is public and meant to be used by other clubs and regions
  without our help. That is a design requirement, not a nice-to-have (see below).

### What "anyone can deploy it" means for the work

- **No Mid-Atlantic or DMV Throwers specifics in the template**, ever: names, places, dates, domains, sponsor and
  contact details, example data and wording all come from configuration. Our own contest is just one config.
- **Setup is documented end to end** (`docs/SETUP.md`) for someone who has never seen the repo, with a checklist,
  the services they need (Supabase, Stripe, Resend, Vercel) and what each costs, and a demo seed so a fresh copy
  shows something real on day one.
- **Safe defaults:** a fresh deployment is private until the organizer turns things on (registration closed,
  results unpublished), takes no real payments until Stripe is configured, and collects no more personal data than
  the config asks for.
- **Another region can run its own series** with its own divisions, formats, prices, rules and branding by editing
  configuration, and can pull in template updates without conflicts (config and presets stay separate from code).
- **Multiple organizers in one region** (a regional circuit of events run by different clubs) is a possible variation
  of stage 3. It isn't designed yet; stage 1 keeps the event self-contained so it stays possible.
- **Our deployment follows the same path.** VA-States is the first deployment and the proving ground: a change
  lands there when it's safe for a live contest, and in the template when it's generic.

### Designing for free tiers

The hub runs on free plans (Supabase database, auth and storage; Vercel hobby hosting; Resend email; Stripe has
no monthly fee). That is a hard budget, so the design rules are:

- **One deployment, many organizations**, separated by an `organization_id` on every row and enforced in the
  database (row level security), not only in the app. No per-club servers, databases or services.
- **Small data**: music and media are the big files. Per-event storage budgets, lo-fi pool shared, the season
  archive and purge (so old events free their space), and compressed uploads with size limits.
- **Email is rationed**: a queue with daily caps (already built), digests instead of one email per change, and a
  per-organization allowance so one club can't use the whole hub's quota.
- **Cheap reads**: static or cached public pages (results, schedule, directory), polling instead of realtime
  where possible, indexes on the hot paths.
- **Show the limits**: an admin "usage" panel (rows, storage, emails today, auth users) with warnings before a
  free-tier cap is hit, and a documented upgrade path (which plan, what it costs) for a region that grows.
- **Portable**: everything above is configuration and migrations in the repo, so another region deploys its own
  hub (its own free accounts) instead of sharing ours, and a region that outgrows free tiers pays for its own
  plans. Nothing assumes our accounts.

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

## Stage 1: organizations, events and days, inside one deployment

Goal: one deployment can hold several organizations, each with several events (this year's contest, a workshop
day, a side tournament), and an event can span days. Existing single-event deployments don't change.

0. **Organizations.** An `organization_id` (with a default organization for existing data) beside `event_id`,
   with row level security so one club never sees another's private data; roles are granted per organization
   and event (`docs/ROLES.md`).

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

## Stage 3: growing the hub

What a hub needs once several clubs share it, beyond stage 1: per-organization payments (each club connects its
own Stripe account, Stripe Connect), a self-serve "create my organization" flow, per-organization branding and
domains, usage limits and a billing path for regions that outgrow free tiers, and a template gallery of presets.
Roles and the portal (`docs/ROLES.md`) cut across all stages and ship in their own small steps.

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

Two tracks run side by side: the **event/organization model** below, and **roles and the portal** (`docs/ROLES.md`:
core done, then a grants table, identity with roles, routes on capabilities, the single-pane portal, and the new
modules for stream, media, MC, merch, sponsors and finance).

1. Extract the scoring-format interface and registry (no behavior change; makes formats pluggable). Started: the
   capability table is in (`FORMATS` in `lib/divisions-core.ts`); the standings and results screens come next.
2. Add `event_id` with a default to the tables, plus tests that a one-event deployment behaves as before.
3. Turn `contest`/`dayOf` into `events` with a default event; build the multi-day schedule.
4. Per-event routes and results; cross-competition bundles.
5. Season archive and purge (so an event can end cleanly).

## Open questions

- Is a "multi-event" deployment mostly one organizer running several related events (a contest plus a
  workshop), or separate organizers sharing a hub? (Leaning: one organizer first, regional circuit later.)
- Do fees and bundles ever span events (one price for the contest and the workshop)?
- Who builds an event: a developer editing config (stage 1), or a non-technical organizer (stage 2)?
- Which toys and formats are next after yo-yo, juggling and kendama, and do any need a format we don't have?
