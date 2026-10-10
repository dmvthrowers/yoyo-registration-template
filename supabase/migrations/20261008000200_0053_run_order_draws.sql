-- Published draws (master plan P4): how each saved run order was made. One row per save, newest wins.
--   random: seed + the submitted order; anyone can re-run lib/draw.ts and get the same order.
--   rule:   the written-out rule (for example "Reverse rank from the previous round").
--   manual: a hand edit, with the reason.
-- Additive. The admin route writes it; the public run-order page reads the latest row per round.

create table public.contest_run_order_draws (
  id          uuid primary key default gen_random_uuid(),
  division    text not null references public.contest_divisions (code) on update cascade on delete cascade,
  round       smallint not null default 1 check (round between 1 and 5),
  method      text not null check (method in ('random', 'rule', 'manual')),
  seed        text check (seed is null or seed ~ '^[a-z0-9-]{4,64}$'),
  rule        text check (rule is null or length(rule) <= 200),
  reason      text check (reason is null or length(reason) <= 300),
  order_ids   uuid[] not null,
  made_by     text,
  created_at  timestamptz not null default now(),
  check (method <> 'random' or seed is not null)
);

create index contest_run_order_draws_round_idx on public.contest_run_order_draws (division, round, created_at desc);

alter table public.contest_run_order_draws enable row level security;
create policy service_role_all_run_order_draws on public.contest_run_order_draws using (auth.role() = 'service_role');
