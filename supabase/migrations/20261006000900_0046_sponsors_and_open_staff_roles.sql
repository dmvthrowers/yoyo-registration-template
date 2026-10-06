-- 0046: sponsors module, and staff accounts can hold any role (expand step)
--
-- 1. contest_staff_accounts.role was limited to judge, dj, audio_tech and admin. Roles now live in
--    lib/roles.ts and are granted through contest_role_grants, so the column only needs a sane shape.
--    Existing rows are unaffected.
-- 2. contest_sponsors: the sponsor pipeline (prospect to paid) with deliverables. A sponsor's own staff
--    login can be linked (auth_user_id) so they see only their own record. Service role only.

alter table public.contest_staff_accounts drop constraint if exists contest_staff_accounts_role_check;
alter table public.contest_staff_accounts drop constraint if exists contest_staff_accounts_role_shape;
alter table public.contest_staff_accounts
  add constraint contest_staff_accounts_role_shape check (role ~ '^[a-z][a-z0-9_]{0,29}$');

create table if not exists public.contest_sponsors (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  name          text not null check (length(name) between 1 and 120),
  tier          text check (tier is null or length(tier) <= 60),
  status        text not null default 'prospect' check (status in ('prospect', 'contacted', 'committed', 'paid', 'declined')),
  amount_cents  integer not null default 0 check (amount_cents >= 0),
  in_kind       text check (in_kind is null or length(in_kind) <= 300),
  contact_name  text check (contact_name is null or length(contact_name) <= 120),
  contact_email text check (contact_email is null or length(contact_email) <= 320),
  notes         text check (notes is null or length(notes) <= 2000),
  -- [{ "label": "Logo on banner", "done": false }]
  deliverables  jsonb not null default '[]'::jsonb check (jsonb_typeof(deliverables) = 'array'),
  -- the sponsor's own staff login, if they have one
  auth_user_id  uuid
);

create index if not exists idx_contest_sponsors_status on public.contest_sponsors (status);
create index if not exists idx_contest_sponsors_user on public.contest_sponsors (auth_user_id) where auth_user_id is not null;

drop trigger if exists contest_sponsors_updated_at on public.contest_sponsors;
create trigger contest_sponsors_updated_at
  before update on public.contest_sponsors
  for each row execute function set_updated_at();

alter table public.contest_sponsors enable row level security;
drop policy if exists "service_role_all_sponsors" on public.contest_sponsors;
create policy "service_role_all_sponsors" on public.contest_sponsors
  for all using (auth.role() = 'service_role');
