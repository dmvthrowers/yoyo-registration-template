# Stripe Payments

Competitors pay by card through hosted Stripe Checkout and are marked paid automatically by
webhook. Comp / $0 registrations skip payment entirely. Manual Venmo/PayPal/cash/check
payments stay available as a fallback: admins record them with **Mark Paid** in the
dashboard.

**Stay in test mode until you've run the full test below on your deployed app.** Test keys
start with `sk_test_`; nothing you do with them moves real money.

## Code map

- `lib/stripe.ts` — server-only Stripe client (`getStripe`, `hasStripeCredentials`).
- `app/api/checkout/route.ts` — `POST { id }` → creates or reuses a Checkout Session for the
  registration's `fee_cents` and returns the hosted URL.
- `app/api/webhooks/stripe/route.ts` — verifies the Stripe signature and, on
  `checkout.session.completed`, sets `paid = true`, `payment_method = 'stripe'`,
  `paid_at`, `payment_intent_id`, `amount_paid_cents`. Idempotent (safe on replay).
- `lib/payments.ts` — `applyPaidSession()`, the one place a payment gets recorded.
- `lib/pricing.ts` — prices, combo discount, early bird, walk-up surcharge.

## 1. Set up Stripe (test mode)

1. Create a Stripe account. Leave **Test mode** on.
2. **Developers → API keys**: copy the Secret key (`sk_test_…`) into `STRIPE_SECRET_KEY`.
3. **Developers → Webhooks → Add endpoint**:
   - URL: `https://<your-app>/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
     `charge.refunded`.
   - Copy the **Signing secret** (`whsec_…`) into `STRIPE_WEBHOOK_SECRET`.
4. Redeploy so the app picks up the keys.

For local dev, forward webhooks instead:
`stripe listen --forward-to localhost:3000/api/webhooks/stripe` and use the `whsec_…` it prints.

## 2. Test end to end

1. Register with a fee due → you land on Stripe Checkout.
2. Pay with test card `4242 4242 4242 4242`, any future expiry, any CVC/ZIP.
3. You return to `/confirm?id=…&paid=1`; the webhook flips `paid = true` within seconds.
4. Make a 100% comp code in the admin dashboard, register with it → no Stripe, straight to
   confirmation.
5. The admin dashboard shows the registration as paid via `stripe`.
6. Refund the test payment in the Stripe Dashboard → the registration goes back to unpaid.

## 3. Go live

1. Finish Stripe's account activation (business details, bank account).
2. Switch the Dashboard to live mode, create the same webhook endpoint there, and copy the
   **live** `sk_live_…` and its new `whsec_…` into Vercel (Production environment only).
3. Redeploy, then make one real $1 test with a comp code set to the right percentage, and
   refund it.

## Notes

- **Prices** live in `lib/pricing.ts` (cents). Deadlines live in `contest.config.ts`.
- **Manual Mark Paid** (`/api/admin/mark-paid`) is intentionally kept for walk-ups, cash and
  checks.
- **Refunds**: issue them from the Stripe Dashboard. The webhook handles `charge.refunded`.

---

## Refunds (`charge.refunded`)

Stripe sends `charge.refunded` for full **and** partial refunds. The handler lives in
`app/api/webhooks/stripe/route.ts`; the decision logic is the pure function
`refundTransition` in `lib/stripe-refund.ts` (unit-tested in `lib/stripe-refund.test.mjs`,
run with `npm test`). It uses the same signature check as the paid handler.

The registration is matched on `payment_intent_id`, which the paid handler stores.

| Refund | How Stripe reports it | Registration after the webhook | Audit action |
| --- | --- | --- | --- |
| Full | `charge.refunded = true` (or `amount_refunded >= amount`) | `paid = false`, `paid_at = null` (same as admin "mark unpaid"). `payment_method`, `payment_intent_id` and `amount_paid_cents` are kept as the record of the refunded Stripe payment. | `payment_refunded` |
| Partial | `charge.refunded = false`, `0 < amount_refunded < amount` | Unchanged: still `paid = true`. There is no column for a partial amount, and a partly refunded competitor is still registered. | `payment_partially_refunded` (amount refunded + original amount) |
| No payment intent / nothing refunded | — | Unchanged | none |

**Idempotency.** The full-refund update is guarded with `.eq('paid', true)`, so a
re-delivered event matches no rows and returns 200 without a second audit entry. This is
the same guard pattern the paid handler uses (`.eq('paid', false)`). A partial-refund
replay writes a duplicate audit row (harmless; the `event_id` in `details` identifies it).

**Not covered.** If someone re-registers after a full refund, they get a new Checkout Session
and a new payment intent, so an old refund replay can't touch the new payment. Refunds of
manual (Venmo/PayPal/cash/check) payments don't go through Stripe; use admin "mark unpaid".

**Deploy step:** add `charge.refunded` to the webhook endpoint's events in the Stripe
Dashboard (Developers → Webhooks → endpoint → Select events). Test in test mode with
`stripe trigger charge.refunded` or by refunding a test-mode payment. Never test with
live refunds.

## Confirmation, reconciliation and duplicate payments

The original contest had a double payment and missing confirmations. Since migrations
0033–0036:

- **One payable session per registration.** `/api/checkout` reuses an open
  Checkout Session. If the last session is already complete, it records the
  payment and refuses a new one. New sessions use an idempotency key, so two
  tabs or a double click get the same session.
- **One way to record a payment.** `applyPaidSession()` (`lib/payments.ts`)
  is called by the webhook, by the confirm page's status check, and by the
  reconcile sweep. Whichever sees the payment first marks it paid and queues
  the "payment received" email. The rest are no-ops. The rules are in
  `lib/payment-decision.ts`, with unit tests.
- **Late webhooks.** After Stripe redirects back (`?paid=1`), the confirm page
  shows "Confirming your payment…" and polls `/api/checkout/status`. That
  route asks Stripe directly, so the page flips to paid within seconds and
  never offers a second pay button.
- **Lost webhooks.** `/api/cron/reconcile-payments` lists completed sessions
  from the last 3 days and records anything missed. Supabase pg_cron runs it
  every 15 minutes while a checkout was started in the last 3 days. Vercel
  cron runs it daily.
- **Duplicates are flagged, never auto-refunded.** A second payment on a paid
  registration goes into `contest_payment_flags` and the organizer gets an email
  (`ADMIN_ALERT_EMAIL`). Refunding it in Stripe closes the flag automatically.
- **Every webhook event is recorded** in `contest_stripe_events`.

### One-time setup

1. Apply migrations 0033–0036, in order, **before** deploying this code. The
   checkout route writes `checkout_created_at`, which 0034 adds.
2. Set `CRON_SECRET` (16+ characters) in Vercel, and store the same value in
   Supabase Vault:
   `select vault.create_secret('<CRON_SECRET>', 'contest_cron_secret');`
3. In Stripe → Webhooks, make sure the endpoint sends
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`
   and `charge.refunded`.

### Not handled yet

- **Disputes / chargebacks** (`charge.dispute.*`): no handler. A dispute leaves the
  registration `paid=true` and nobody is alerted — watch the Stripe Dashboard. Tracked in
  `docs/ROADMAP.md`.
- **Previews:** preview deployments are off (`vercel.json`), so there's no preview webhook
  endpoint. Test locally with Stripe test keys and `stripe listen`.

### Useful queries

```sql
-- Open duplicate-payment flags
select * from contest_payment_flags where status = 'open' order by created_at;
-- Webhook events that failed or are still unprocessed
select * from contest_stripe_events where processed_at is null order by received_at desc;
-- Emails waiting, or given up on
select template, to_email, not_before, attempts, last_error, dead_at
  from email_outbox where sent_at is null order by created_at desc;
-- Retry an email that was given up on
update email_outbox set dead_at = null, attempts = 0, not_before = now() where id = '<id>';
-- Did Supabase's scheduled calls get through?
select status_code, count(*) from net._http_response group by 1;
```
