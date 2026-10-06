-- 0048: public sponsor inquiries (additive)
--
-- The "Want to sponsor?" form at /sponsor writes here, kept apart from contest_sponsors so an unvetted
-- submission never counts as money. Staff with sponsors.manage review them on /sponsors and either convert
-- one into a sponsor (status 'prospect') or dismiss it. Contact details are personal data: converted rows
-- live on in the pipeline, dismissed rows should be deleted after a set time (see the archive and purge
-- plan). Service role only; the public form posts through the API, never straight to the table.

create table if not exists public.contest_sponsor_inquiries (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  status        text not null default 'new' check (status in ('new', 'converted', 'dismissed')),
  contact_first text not null check (length(contact_first) between 1 and 80),
  contact_last  text not null check (length(contact_last) between 1 and 80),
  email         text not null check (length(email) between 3 and 254 and email like '%_@_%'),
  phone         text check (phone is null or length(phone) <= 40),
  brand_name    text not null check (length(brand_name) between 1 and 160),
  social_handle text check (social_handle is null or length(social_handle) <= 100),
  contact_method text check (contact_method is null or length(contact_method) <= 60),
  website       text check (website is null or (length(website) <= 300 and website ~* '^https?://')),
  logo_url      text check (logo_url is null or (length(logo_url) <= 500 and logo_url ~* '^https?://')),
  -- a tier id or other-choice id from contest.sponsors in contest.config.ts
  tier          text not null check (length(tier) between 1 and 40),
  vendor_table  boolean,
  division_sponsor boolean,
  in_kind       boolean,
  retail_value_cents integer check (retail_value_cents is null or retail_value_cents between 0 and 100000000),
  -- how they would like to pay and who to bill, if not the contact (payment itself happens outside the form)
  payment_method text check (payment_method is null or length(payment_method) <= 60),
  billing_email text check (billing_email is null or (length(billing_email) between 3 and 254 and billing_email like '%_@_%')),
  -- how the name should read on the banner and in posts, if different from the brand name
  display_name  text check (display_name is null or length(display_name) <= 160),
  -- may product they include be used for prize bags, raffles and giveaways (credited to them)
  product_use_ok boolean,
  heard_from    text check (heard_from is null or length(heard_from) <= 80),
  notes         text check (notes is null or length(notes) <= 2000),
  sponsor_id    uuid references public.contest_sponsors (id) on delete set null,
  handled_by    uuid,
  handled_at    timestamptz
);

create index if not exists idx_contest_sponsor_inquiries_status on public.contest_sponsor_inquiries (status, created_at desc);

alter table public.contest_sponsor_inquiries enable row level security;
drop policy if exists "service_role_all_sponsor_inquiries" on public.contest_sponsor_inquiries;
create policy "service_role_all_sponsor_inquiries" on public.contest_sponsor_inquiries
  for all using (auth.role() = 'service_role');
