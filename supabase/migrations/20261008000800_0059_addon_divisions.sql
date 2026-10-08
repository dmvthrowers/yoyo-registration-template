-- $0 add-on divisions (master plan R2): a division that re-ranks another division's results, e.g. Girls or
-- Student. Its scoring_format is 'addon'. Widening a check, no data changes.

alter table public.contest_divisions drop constraint if exists contest_divisions_scoring_format_check;
alter table public.contest_divisions add constraint contest_divisions_scoring_format_check
  check (scoring_format in ('freestyle', 'manual', 'panel', 'ladder', 'bracket', 'showcase', 'addon'));
