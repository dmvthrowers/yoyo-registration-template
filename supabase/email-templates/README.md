# Auth email templates

Branded HTML for every Supabase Auth email type, matching the look of the Resend transactional emails in `lib/email.ts`
(navy `#0d1428` background, gold `#C9A84C` accent, gold top border card).

The files here hold `[[PLACEHOLDERS]]` for your contest's name, date, venue and contact
email. Fill them in from `contest.config.ts`:

```bash
npm run auth-emails     # writes supabase/email-templates/dist/*.html
```

There's no API to push these — paste each file from `dist/` into the
**Supabase Dashboard → Authentication → Email Templates**, one at a time:

| File | Dashboard template | Currently used? |
|---|---|---|
| `magic-link.html` | Magic Link | **Yes** — spectator portal sign-in code |
| `reauthentication.html` | Reauthentication | Not yet |
| `confirm-signup.html` | Confirm signup | Not yet (accounts are auto-confirmed) |
| `invite.html` | Invite user | Not yet |
| `reset-password.html` | Reset Password | Not yet (no forgot-password flow yet) |
| `change-email.html` | Change Email Address | Not yet |

**Do this one first:** `magic-link.html` is the only template that actually
fires today. Paste `dist/magic-link.html` into Authentication → Email Templates →
Magic Link, and set the subject to something like "Your <short name> sign-in
code." It renders `{{ .Token }}` as a large code, on purpose — no clickable
link, so mail scanners like Outlook/Defender Safe Links can't burn the
one-time token before the recipient opens the email.

While you're in Authentication settings, also set **Email OTP Expiration**
to `300` (5 minutes) under Authentication → Providers → Email, to match the
countdown shown in the spectator portal UI.

Set **Email OTP Length** to **8** (Authentication → Providers → Email); new
projects default to 6. The frontend (`app/spectators/portal/page.tsx`)
and `magic-link.html` are both set to match that length via a `CODE_LENGTH`
constant. If you ever change the OTP length in Authentication → Providers →
Email, update `CODE_LENGTH` in that file too.

The other five templates are here so they look right the moment any of
those flows get wired up later — nothing to do with them now beyond pasting
them in if you want the dashboard previews to look on-brand.
