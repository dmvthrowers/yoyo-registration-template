-- Bracket match scores (master plan F1): each side's running score in a bracket match, for divisions that
-- set matchScoring in contest.config.ts (first to N wins). Null until entered. Additive.

alter table public.contest_bracket_matches add column if not exists score_a smallint check (score_a is null or score_a >= 0);
alter table public.contest_bracket_matches add column if not exists score_b smallint check (score_b is null or score_b >= 0);
