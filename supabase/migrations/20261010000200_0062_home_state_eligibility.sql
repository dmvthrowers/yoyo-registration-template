-- 0062: home-state eligibility for the state champion (parity with VA-States 0047; build plan Wave 8, row 8.1)
--
-- Residency is decided by home address. Registration collects a home street address and ZIP and a
-- "I live in <state> at this address" confirmation (asked of anyone entering the champion's state, as set by
-- contest.stateChampion.state), and an organizer can override the result either way. Purely additive.
--
--   home_address / home_zip   private: never selected by a public view; admin screens only.
--   home_state_confirmed      the registrant's confirmation.
--   home_state_override       null = automatic; true/false = an organizer's decision.
--
-- No backfill here: a new deployment has no registrations yet. If you are adding this to a contest that already has
-- registrations and you want its past champions unchanged, run once:
--   update public.contest_registrations set home_state_confirmed = true where upper(state) = '<champion state>';
-- Safe to run twice.

alter table public.contest_registrations add column if not exists home_address text check (home_address is null or length(home_address) <= 200);
alter table public.contest_registrations add column if not exists home_zip text check (home_zip is null or home_zip ~ '^\d{5}(-\d{4})?$');
alter table public.contest_registrations add column if not exists home_state_confirmed boolean not null default false;
alter table public.contest_registrations add column if not exists home_state_override boolean;
