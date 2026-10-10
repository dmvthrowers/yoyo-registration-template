-- Open books (master plan O4): more cost categories, and planned figures next to actuals.
-- * category: widened from (sponsor, merch, other) so costs show by category on the public budget page.
-- * planned:  true for a figure published before the event. Planned rows never count toward actual
--             totals or the fundraising goal.
-- Additive for data: existing rows keep their category and are actual (planned = false).

alter table public.contest_budget_entries drop constraint if exists contest_budget_entries_category_check;
alter table public.contest_budget_entries add constraint contest_budget_entries_category_check
  check (category in ('registration', 'sponsor', 'merch', 'spectator', 'venue', 'prizes', 'equipment', 'printing', 'food', 'insurance', 'other'));

alter table public.contest_budget_entries add column if not exists planned boolean not null default false;
