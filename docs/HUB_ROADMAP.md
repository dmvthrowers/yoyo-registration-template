# Hub roadmap: any skill toy, any event format

**Long-term goal.** One app that runs registration and scoring for any skill toy and any competition
or event format, online or in person. Yo-yo first, then juggling and kendama (diabolo, spin tops and
others after that). It should grow, shrink and combine events: a single event, or a multi-day,
multi-event structure.

This is a direction, not a commitment to a schedule. Work in small steps that each leave a working
app. The live Virginia State Yo-Yo Contest app (VA-States) is the first deployment and stays safe:
real registrants and real payments mean schema, payment and auth changes get production care.

## Decisions so far (owner)

- **Path:** stay on one deployment per organization and make the event first-class inside it (stage 1), then
  configuration as data (stage 2). A shared hub (stage 3) is not planned unless several clubs ask.
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

## Sponsor inquiry form (first version built)

**Built:** `/sponsor` (config in `contest.sponsors`: tiers, other choices, contact methods, where people heard of you), `POST /api/sponsor-inquiry` (honeypot, per-IP rate limit, validation from config), table `contest_sponsor_inquiries` (migration 0048), notice and confirmation emails (`SPONSOR_NOTICE_EMAIL`), and a **New inquiries** panel on `/sponsors` with Add as prospect and Dismiss. Fields mirror a typical hosted-form version (name, email, phone, brand, handle, contact method, website, logo link, tier, vendor table, division sponsorship, product and retail value, how heard, notes). Prices and slots left are shown on the form; payment happens outside it (sponsors say how they would like to pay; you send an invoice or link). **Not built yet:** logo upload (a link for now), deliverable checklists pre-filled by tier, CSV import of old submissions, and the dismissed-inquiry deletion job. How it works and the open questions: [`SPONSOR_FORM.md`](SPONSOR_FORM.md). The original plan follows.

An organizer should be able to take sponsor inquiries without a third-party form service. Plan: a public
`/sponsor` page whose tiers and benefits come from config (`contest.sponsors`), so nothing is event-specific in
code. It writes to a new `contest_sponsor_inquiries` table (service role only), kept apart from
`contest_sponsors` so an unvetted submission never counts toward pledged money. Staff with `sponsors.manage`
review inquiries on `/sponsors` and **convert** one into a prospect (message copied into notes) or **dismiss**
it. Spam control without tracking: a honeypot, a per-IP rate limit and server validation; no CAPTCHA service or
analytics. The organizer gets a notice email and the sender a plain confirmation, through the existing email
layer, with the notice address in config. Inquiries hold contact details, so they get an owner in the archive and
purge plan (converted ones live on in the pipeline; dismissed ones are deleted after a set time). A deployment
that already has an old form can import its submissions (CSV) as prospects.

Shape of the form, from a real sponsor package (kept generic here; each organizer's tiers, prices and dates live in
config): **tiers** with a name, a minimum cash amount, an optional slot cap and a benefit list; an **in-kind**
route where product or services are counted at retail value (a per-tier equivalent), also alongside cash; an
optional **table add-on** with a price, a discounted price for clubs and a total cap; **brand team players** for
the top tiers; a **logo upload** with accepted formats and a deadline; **shipping** for advance product with a
cut-off date; contact and brand details. Slot caps are enforced against committed and paid sponsors, and the form
shows what is left. Converting an inquiry creates the sponsor with that tier's deliverables already listed as a
checklist (banner logo, shout-outs, posts, table, recap), which `/sponsors` already tracks. Payment stays outside
the form by default (an invoice link after review); online payment is a later option.

Outreach lists (prospects found by research) belong in the same pipeline as `prospect` rows with their notes,
admin-only, rather than in documents, so contacting, converting and reporting happen in one place.

Open: whether to show prices and remaining slots on the public form, whether sponsors ever pay online or always by
invoice, and whether a sponsor can log in to see their own tier (the `sponsor` role already can, once an organizer
links the account).

## Forms on our own system (future state)

Every public form an organizer runs (sponsor inquiry, vendor or merch-table application, volunteer interest,
media or press request, feedback, a one-off sign-up) should live in the hub instead of a third-party form
service, so the data stays under the organizer's control and the same spam, privacy and retention rules apply to
all of them. Sponsor inquiry above is the first one; the rest follow the same shape.

- **A form is configuration plus a submission table**, not new code per form: a `forms` config (id, title, intro,
  fields with type, label, help text, required, options, max length; a success message; who is notified; which
  role reviews it) validated by one pure module, rendered by one public page (`/f/[id]`), stored in one
  `contest_form_submissions` table (form id, answers as JSON, status, reviewer, timestamps). Field types stay small
  on purpose: short text, long text, email, phone, choice, multiple choice, number, yes/no.
- **Review lives in the role portals.** A submission shows up for the role that owns it (sponsor inquiries for
  `sponsors.manage`, volunteer interest for `volunteers.manage`, merch applications for `merch.manage`), with
  convert, reply and dismiss actions. Admin sees all of them.
- **One set of protections:** honeypot, per-IP rate limit, server-side validation against the form's own
  definition, size limits, no CAPTCHA service and no analytics, plain-language errors, works at 360px and with a
  keyboard.
- **Retention is per form** and listed in the archive and purge plan; exports are CSV.
- **Later, a builder:** an admin screen to create and edit forms without touching the config file (with a publish
  step so a half-edited form never goes live), and import of old third-party submissions.
- **Why not now:** only the sponsor inquiry form is wanted for VSYC-27. Building it as the first instance of this
  shape keeps the later forms cheap without building a form builder before it's needed.

## Contest app feature plan (October 2026)

What to build inside the app once events are first-class. It starts from how real kendama, juggling,
diabolo, spin top and related events run, and from what tends to go wrong on contest day. Every
feature is designed around our own principles (built for the people in the room, minors private by
default, free to watch, every number explains itself, one app from sign-up to archive, any toy).

- [`FORMAT_RESEARCH.md`](FORMAT_RESEARCH.md): the field research, with sources. New formats (F1–F10),
  registration features (R1–R10), contest-site pages (S1–S8) and club-site ideas (C1–C4).
- [`CONTEST_APP_MASTER_PLAN.md`](CONTEST_APP_MASTER_PLAN.md): the plan in our own terms: principles,
  formats, contest-day tools and public features (T1–T18), ideas only we have (O1–O3), build order and
  the decisions needed.
- [`CONTEST_APP_PLAN.md`](CONTEST_APP_PLAN.md): the master plan checked against what VA-States and the
  templates already have (have it, partial, gap), with the build order cut down to the real gaps.

**Phase 1, in short:** a scores-in board (which judges still owe which scores), release gates with a
head-judge check, bracket match scores (to 3 / to 5), "how it was scored" notes and score shading, MC
cards, a kendama preset that describes kendama correctly with today's formats, trick list and prize table
pages, $0 add-on divisions, and a contest guide page with a first-contest path. Each new format is a
plugin (see "Principles for new work") and follows the same order: `divisions-core.ts` with tests, additive migration, judge UI, public results, contest-site words, demo.

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
  workshop), or separate organizers sharing a hub? (Leaning: one organizer first, regional circuit later.)
- Do fees and bundles ever span events (one price for the contest and the workshop)?
- Who builds an event: a developer editing config (stage 1), or a non-technical organizer (stage 2)?
- Which toys and formats are next after yo-yo, juggling and kendama, and do any need a format we don't have?
  Answered in [`FORMAT_RESEARCH.md`](FORMAT_RESEARCH.md): the six formats cover about 70% of events; kendama
  is the biggest gap. Its own open questions are in [`CONTEST_APP_MASTER_PLAN.md`](CONTEST_APP_MASTER_PLAN.md) (Part 6).
