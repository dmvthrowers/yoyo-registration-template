# Multi-event, multi-organizer: design

Status: **proposal for the owner's review.** Nothing here is built. It turns the owner's rule (2026-10-10) into stages, so each can ship on its own.

> **The rule.** Every event is treated as one of many, and an event can have its own organizers. A deployment that runs one event keeps working exactly as it does today.

This replaces the "one organizer or separate organizers?" question in [`HUB_ROADMAP.md`](HUB_ROADMAP.md) (stage 1) with an answer: both are possible. It is stage 1 plus a light version of stage 3's organizer idea, **inside one deployment**. A shared hub across deployments (stage 3) is still not planned.

## Words

- **Event**: one dated thing people sign up for (VSYC-26, a spring workshop, a kendama jam). Has its own date(s), venue, divisions, fees, schedule, results and archive.
- **Organizer**: a named group that runs events: its own staff, branding, contact address and, later, payout account. DMV Throwers is one. A partner club that borrows the deployment would be another.
- **Deployment**: one running copy of the app and its database. It holds at least one organizer and at least one event.

An event belongs to exactly one organizer. A person can have a role at several.

## What does not change

- A single-event deployment, including VA-States today. It gets a default organizer and a default event (`vsyc26`) through a backfill, and every URL it has now keeps working.
- Config stays the source of truth in stage 1 (`contest.config.ts`). Moving it into the database is stage 2 (see `HUB_ROADMAP.md`).
- Additive migrations first, code that works before and after, applied in the order each PR says.

## The model

```
organizer (id, name, contact, branding)
  └─ event (id, organizer_id, name, dates[], venue, timezone, deadlines, status)
       ├─ competition → divisions (data, reusable across events)
       ├─ registrations / spectators / volunteers
       ├─ run order, scores, music, bracket, schedule state, releases
       ├─ budget, sponsors, form submissions
       └─ roles (grants with an event, or an organizer)
```

IDs are short lowercase slugs (`vsyc26`, `spring-jam`), the same shape `contest_role_grants.event_id` already uses.

## Stage 1a: the event becomes a value, not a singleton

1. **`events` in config.** `contest` and `dayOf` become the **default event's** settings. Add an `events` list of `EventDef` (id, organizerId, name, dates, venue, timezone, deadlines, which competitions it runs, schedule per day). One entry in the list is the default.
2. **Helpers read through an event.** Every place that reads `contest.date`, `contest.name`, `dayOf` and friends (about 30 files today) goes through `eventOf(id)`, with the default event when none is given. No behavior change for one event.
3. **Tests.** A one-event deployment produces byte-identical output before and after (pricing, schedule, results, emails).

Risk: low. No schema change. This is the step that proves the shape.

## Stage 1b: event-scoped data (expand, then contract)

About 35 `contest_*` tables hold event data. Expand in two steps, the way the music and round-plan migrations did:

1. **Expand:** add `event_id text not null default '<default>'` to each event-scoped table, backfill, index it, and widen every unique constraint that implies one-per-event (a player's registration, a run-order slot, a division's release) to include `event_id`. Nothing reads it yet.
2. **Read and write:** routes pass an event through a single `eventScope(req)` helper that returns the event or the default; every query adds `.eq('event_id', …)`. A lint-style test fails if a query on an event table forgets it.
3. **Contract:** drop the column default on tables where a missing event would now be a bug.

Tables that stay **global**: staff accounts and their login, role grant history, comp codes if shared, migration bookkeeping. Tables that become **organizer-scoped**: sponsors and budget lines that span events (decision below).

Production care for VA-States: it uses the `vsyc_` prefix and holds real registrations and payments. Each migration is additive, replayed on a copy first, and applied in the Supabase SQL editor (the API tool hangs on `DROP`). Nothing in stage 1b changes what a signed-in user or a payer sees.

## Stage 1c: URLs and pages per event

- Current routes map to the default event, so links never break.
- New: `/e/<event>/…` for the public pages (register, schedule, results, prizes, guide, rules, directory), and `/e/<event>/admin/…` for the staff pages that are event-bound.
- An event home page lists the organizer's events; a deployment home lists organizers only if there is more than one.
- A custom domain per organizer is a hosting setting, not app code, and is out of scope here.

## Stage 1d: roles and organizers

`contest_role_grants` already has `event_id`. Add an `organizer_id` alongside it (null = every organizer), so a grant can be: everywhere, one organizer's events, or one event. `can(grants, capability, event)` already takes an event; it learns the organizer.

The **Organizer** role stays "runs the day-to-day, no settings or role changes" for the events it is granted. A new top-level **Platform admin** (the person who runs the deployment) can create organizers and events; organizer admins can create events within their organizer. Everything else about roles is unchanged.

## Data separation between organizers

This is the part that carries real risk, because registrations include minors' details.

- The database stays service-role only behind the app, as today (Row Level Security denies direct access). So **the app is the boundary**. Every event-scoped read goes through `eventScope`, which also checks the signed-in staff member has a grant for that event's organizer. A missing check is a data leak, so:
  - one helper, no ad-hoc queries on event tables;
  - a test that walks every API route and asserts a staff member of organizer A gets a 403/404 for organizer B's event;
  - exports, email lists and audit views are event-scoped by the same helper.
- Players and spectators are **per event**. A returning player is matched by email only inside one organizer's events, never across organizers, unless they sign in themselves.
- Each organizer's retention rules and purge run per event (the season purge already takes a season; it learns an event).

## Payments

Today there is one Stripe account per deployment. With several organizers that stops being right: money for organizer B must not land in organizer A's account.

- **Stage 1 (recommended):** a Stripe key per organizer, stored as a deployment secret and selected by the event's organizer. Webhooks identify the organizer from the payment's metadata. Simple, no platform fees, but each organizer needs its own Stripe account and the deployer adds secrets.
- **Later:** Stripe Connect, so organizers onboard themselves. Bigger (platform agreement, compliance); only if organizers other than us actually appear.
- An event can run with no payment provider at all (free, or pay at the door recorded as a channel), as `HUB_ROADMAP.md` already requires.

## Archive and purge

The season archive and purge (`SEASON_ARCHIVE.md`, migration 0060 in VA-States) become per event: archive an event, anonymize its registrants after the archive merges, keep stats and past champions, keep payment records 7 years, delete dismissed sponsor inquiries after a year, purge the audit log 12 months after the event (the owner's rules). A closed event is read-only and keeps its URL.

## Emails and branding

Each organizer sets its name, from-address (domain must be verified with the email provider), reply-to, colors and logo. Emails and the footer read them from the event's organizer. The deployment's default organizer is today's config, so nothing changes for one organizer.

## Parity with VA-States

The template and the live app stay in parity (owner rule). Order: design review → template stage 1a → port 1a → template 1b migrations → apply to VA-States in the SQL editor → port 1b code → 1c → 1d. VA-States keeps its own config and data; the code is shared. Each step is its own PR, each lists its parity line, and nothing ships to VA-States that has not run against a copy of its data first.

## Decisions I need (with my recommendation)

1. **Payments per organizer.** Recommend: a Stripe key per organizer now; Stripe Connect only if outside organizers appear.
2. **Who creates organizers and events.** Recommend: platform admin creates organizers; an organizer admin creates events; both start as config edits (stage 1) and get a screen in stage 2.
3. **Do sponsors and budget span events?** Recommend: sponsors are organizer-level (a sponsor can back several events); budget lines belong to one event, with an organizer roll-up.
4. **Player identity across events.** Recommend: a player account is per organizer, so a returning player keeps their profile within one organizer and is never visible to another.
5. **URL shape.** Recommend: `/e/<event>/…` with the default event on today's routes.

## Out of scope here

A shared hub across deployments, a public directory of organizers, per-organizer custom domains, and moving configuration into the database (stage 2).
