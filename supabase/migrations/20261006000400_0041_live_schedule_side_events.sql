-- 0041: live schedule, per-division result releases, and side events.
--
-- * contest_schedule_state: what happened to each block of dayOf.schedule in contest.config.ts
--   (keyed by the block's id). Estimated times are computed in lib/schedule-core.ts.
-- * contest_results_releases: a division's results (per round) went public. Publishing a
--   schedule block writes one; the global results_published flag still shows everything.
-- * contest_side_entries: tries in quick crowd events (longest sleeper, loop challenge).
--   No registration needed: staff type the name. Use first name + last initial for minors.

create table public.contest_schedule_state (
  item_id       text primary key check (item_id ~ '^[a-z0-9][a-z0-9-]{0,40}$'),
  status        text not null default 'upcoming' check (status in ('upcoming', 'live', 'judging', 'done')),
  started_at    timestamptz,
  ended_at      timestamptz,
  published_at  timestamptz,
  updated_by    text,
  updated_at    timestamptz not null default now(),
  constraint contest_schedule_state_order check (
    (status = 'upcoming' and started_at is null)
    or (status <> 'upcoming' and started_at is not null)
  )
);

create table public.contest_results_releases (
  division      text not null references public.contest_divisions (code) on update cascade on delete cascade,
  round         smallint not null default 1 check (round between 1 and 5),
  published_at  timestamptz not null default now(),
  published_by  text,
  primary key (division, round)
);

create table public.contest_side_entries (
  id               uuid primary key default gen_random_uuid(),
  event_code       text not null check (event_code ~ '^[A-Za-z0-9_-]{1,20}$'),
  name             text not null check (length(trim(name)) between 1 and 60),
  value            numeric(12,2) not null check (value >= 0),
  registration_id  uuid references public.contest_registrations (id) on delete set null,
  hidden           boolean not null default false,
  created_by       text,
  created_at       timestamptz not null default now()
);

create index contest_side_entries_event on public.contest_side_entries (event_code, created_at);

alter table public.contest_schedule_state enable row level security;
alter table public.contest_results_releases enable row level security;
alter table public.contest_side_entries enable row level security;
create policy service_role_all_schedule_state on public.contest_schedule_state using (auth.role() = 'service_role');
create policy service_role_all_results_releases on public.contest_results_releases using (auth.role() = 'service_role');
create policy service_role_all_side_entries on public.contest_side_entries using (auth.role() = 'service_role');
