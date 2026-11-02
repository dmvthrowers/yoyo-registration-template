# Season archive

About a month after a contest, keep the public record as plain static pages and JSON, check it for private data, then
(later) clear the old season. This covers the first two steps, **freeze** and **verify**. They are read-only: nothing here
deletes or changes data. Purging old personal data and music is a separate step that needs your retention decisions first.

## Freeze

```sh
npm run archive -- --season 2027 --template ../my-site/results.html
```

Needs `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. It writes `archive/2027/`:
`index.html`, one page per division with results, and `results.json`.

- It reads standings through `lib/standings.ts`, the same code the public results page uses, so the public-name rules
  (a minor who is not opted in appears as a nickname or first name and last initial) cannot drift.
- `--template <page.html>` reuses that page's head, nav and footer (everything outside its `<main>`) so your site's
  boilerplate stays identical. Without it you get plain pages. Canonical links use `contest.organizer.url`.
- Before writing anything it re-runs the checks below and **refuses to write** if one fails.

## Verify

```sh
npm run archive:verify -- --season 2027 --template ../my-site/results.html
```

Re-reads the folder and fails (exit 1) if row counts differ from the database, or any file contains an email address
(other than your contact address or one already in the template), a phone number, a Stripe or database id, a birth date,
or the legal name of a competitor who is not public.

## Then

Review the pages, copy `archive/<season>/` into your site repo, and merge it as a pull request. `/archive/` is gitignored
here on purpose: the app never publishes it.

## Close sign-ups (archive mode)

Once the contest is over, set `archive.closedAfter` in `contest.config.ts` (usually the end of contest day, e.g.
`'2027-03-13T23:59:59-05:00'`). After that time:

- the home page, `/volunteer` and `/spectate` show a closed page instead of their forms: a thank-you, a "coming next" box
  for `nextShortName` with `next.date` and `next.venue` (keep them `'TBD'` until set), and buttons to `/results`, the
  frozen record (`archive.url`, once it is live) and the next edition's page (`next.url`);
- `/api/volunteer-register` and `/api/spectator-register` refuse new sign-ups (the competitor form already closes at
  `deadlines.onlineRegistration`);
- the gold top bar reads "<shortName> ARCHIVE" and links `next.url`.

Results, the directory and the other read-only pages keep working from the database. Leave `closedAfter` as `""` while
the contest is running. To open sign-ups for the next edition, reset the season and clear or move the date.

## Not built yet

Purge and reset, which delete the season's music, scores, registrants and so on and start the next season clean. They
need decisions first: payment records, waiver and guardian consent retention, anonymize or delete registrants,
whether players keep an account across seasons, and whether to keep a past-champions table.
