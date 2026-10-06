# Security

This template runs real registrations and card payments, so treat changes to the database,
payments and sign-in with production care.

Built-in protections:
- Never commit real keys. `.env.local` is gitignored; production values live in Vercel.
- Staff sign in with Supabase Auth plus a role row. There's no shared admin password.
- Row level security is on for every table; the browser never gets the service-role key.
- The Stripe webhook verifies signatures, and prices always come from the database.
- CSP and security headers are in `next.config.js`.
- Confirmation links never show a full email address, and are rate limited.
- Analytics strips query strings, so registration ids and upload tokens never reach a log.

**Reporting a problem with the template:** open a GitHub issue. For anything sensitive, use
GitHub's private vulnerability reporting (Security tab) if the maintainer has enabled it.

**For contests run from this template:** report problems to that contest's contact email,
listed in its `contest.config.ts`.
