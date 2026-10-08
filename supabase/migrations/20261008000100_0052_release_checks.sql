-- Release gates (master plan T2): the head judge's "checked" on one round's scores.
-- fingerprint is "<score count>:<score sum>" at the moment of the check; if a score changes
-- afterwards the fingerprint no longer matches and the gate reopens. Additive; nothing reads
-- this table unless dayOf.releaseGates is true in contest.config.ts.

create table public.contest_release_checks (
  division     text not null references public.contest_divisions (code) on update cascade on delete cascade,
  round        smallint not null default 1 check (round between 1 and 5),
  checked_by   text,
  checked_at   timestamptz not null default now(),
  fingerprint  text not null,
  primary key (division, round)
);

alter table public.contest_release_checks enable row level security;
create policy service_role_all_release_checks on public.contest_release_checks using (auth.role() = 'service_role');
