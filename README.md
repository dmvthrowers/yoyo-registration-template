# Yo-Yo Contest Registration Template

Registration, payments and day-of operations for a yo-yo or skill toy contest. Competitors
register and pay by card. Spectators and volunteers RSVP. Judges score from their phones, the DJ
plays everyone's music, and results publish when you say so.

Built for the [Virginia State Yo-Yo Contest 2026](https://dmvthrowers.club/vsyc26.html), where
it handled real registrations and payments, then generalized so any contest can run it.
Need a public contest website too? Pair it with
[yoyo-contest-template](https://github.com/dmvthrowers/yoyo-contest-template).

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fdmvthrowers%2Fyoyo-registration-template&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY,STRIPE_SECRET_KEY,STRIPE_WEBHOOK_SECRET,NEXT_PUBLIC_BASE_URL,CRON_SECRET&envDescription=Supabase%20and%20Stripe%20(test%20mode)%20keys.%20See%20docs%2FSETUP.md.&envLink=https%3A%2F%2Fgithub.com%2Fdmvthrowers%2Fyoyo-registration-template%2Fblob%2Fmain%2Fdocs%2FSETUP.md&project-name=contest-registration&repository-name=contest-registration)

**Start here: [`docs/SETUP.md`](docs/SETUP.md)**, the step-by-step checklist from a blank
copy to open registration.

## Quick start

- **Time:** about 2 hours the first time. **Cost:** free accounts on GitHub, Vercel, Supabase and
  Stripe (Stripe charges its normal card fees only when you take real payments).
- **Skills:** you can edit one settings file and paste keys into Vercel.
1. Click **Use this template**, then **Deploy with Vercel** (the button above).
2. Edit `contest.config.ts`: name, date, venue, divisions, prices.
3. Create a Supabase project and run the migrations in `supabase/migrations/`.
4. Add your Stripe test keys, register with a test card, and check the confirmation email.

`docs/SETUP.md` walks through every step in order.

## What you get

- **Competitor registration** for any skill toy: your own divisions, styles, combo pricing,
  early bird, walk-up surcharge and comp/discount codes. Presets for yo-yo, kendama, diabolo,
  spinning top and mixed contests
- **Stripe Checkout** with webhook reconciliation, duplicate-payment protection and refunds
- **Music upload** straight to storage, one track per division and round (and battle music, if you run battles), with a deadline, reminder emails,
  an optional lo-fi fallback for empty slots, and a DJ page that plays it in run order
- **Spectator and volunteer RSVPs** with an opt-in public directory
- **Formats for any skill toy contest**: freestyle (NYYL-style), panel-judged (Artistic
  Performance, doubles, acts), timed or scored events with attempts (speed, endurance, longest
  spin), trick ladders, battle brackets with judge voting, and not-judged showcases
- **Doubles, groups and acts**: every member registers themselves; captains share a join code;
  charge per person or once per team
- **Rounds**: prelims → finals with the top N advancing
- **Day-of tools**: run order, judge scoring on phones, battle voting, staff portal, walk-up registration
- **Results page** that stays private until you publish it
- **Admin dashboard**: roster, payments, comp codes, budget, volunteers, CSV export
- **Post-event surveys** for every role, with a results tab and email invites
- **Emails** through an outbox with a daily budget, so confirmations always get through

## What you change

| File | What |
|---|---|
| `contest.config.ts` | Name, date, venue, deadlines, sponsor, links, logos, and the `competition` block: toy, divisions, prices, judging. Most contests only edit this |
| `presets/competitions.ts` | Ready-made kendama, diabolo, spinning top and mixed-toy division sets |
| `public/logo-*.png` | Your logo |
| `app/globals.css`, `tailwind.config.js` | Colors |
| `.env.local` / Vercel env vars | Service keys (see `.env.local.example`) |

## Services

| Service | Needed | Free tier works? |
|---|---|---|
| [Vercel](https://vercel.com) | yes | yes |
| [Supabase](https://supabase.com) | yes | yes |
| [Stripe](https://stripe.com) | yes (test mode until launch) | no monthly fee; per-transaction fees |
| [Resend](https://resend.com) | optional; email is queued but not sent without it | yes, 100/day |
| [Upstash](https://upstash.com) (via Vercel KV) | optional; rate limiting is off without it | yes |
| Sentry, Healthchecks.io, QStash | optional | yes |

Optional services switch off cleanly when their env vars are blank.

## Local development

```bash
npm install
cp .env.local.example .env.local   # Supabase + Stripe test keys at minimum
npm run dev                        # http://localhost:3000
```

Forward Stripe webhooks while testing payments:
`stripe listen --forward-to localhost:3000/api/webhooks/stripe`.

| Command | Does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit tests for the payment, email and date logic |
| `npm run divisions` | Check the divisions in your config and regenerate `supabase/divisions.sql` |
| `npm run auth-emails` | Fill the Supabase auth email templates from your config |
| `scripts/check-migrations.sh` | Replay every migration and the demo seed on an empty Postgres (`DATABASE_URL`) |

CI runs typecheck, lint, tests, build and the migration replay on every pull request.

## Docs

- [`docs/SETUP.md`](docs/SETUP.md) — set up a new contest
- [`docs/FORMATS.md`](docs/FORMATS.md) — every judging format, team entries and rounds
- [`docs/REPO_GUIDE.md`](docs/REPO_GUIDE.md) — how the app works, file by file
- [`docs/STRIPE_PAYMENTS.md`](docs/STRIPE_PAYMENTS.md) — payments, refunds, reconciliation
- [`AGENTS.md`](AGENTS.md) — rules for AI coding agents (and a good read for people)

## Security

See [`SECURITY.md`](SECURITY.md) for what's built in and how to report a problem.

## License

Public domain ([Unlicense](LICENSE)). No credit needed, but we'd love to hear about your contest.
