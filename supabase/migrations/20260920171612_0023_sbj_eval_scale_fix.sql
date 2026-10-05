-- Applied to production 2026-09-20 (schema_migrations version 20260920171612, name 0023_sbj_eval_scale_fix).
-- Copied into the repo 2026-09-23 so the repo matches prod; SQL is verbatim from
-- supabase_migrations.schema_migrations.

-- SBJ uses a /20 per-category eval scale (Total Eval /80), not the /10 scale
-- (Total Eval /40) that 1A/X use. The 0014 migration hardcoded 0-10 for every
-- division; make it division-aware instead.

ALTER TABLE contest_scores DROP CONSTRAINT IF EXISTS contest_scores_trick_presentation_check;
ALTER TABLE contest_scores DROP CONSTRAINT IF EXISTS contest_scores_performance_quality_check;
ALTER TABLE contest_scores DROP CONSTRAINT IF EXISTS contest_scores_musicality_check;
ALTER TABLE contest_scores DROP CONSTRAINT IF EXISTS contest_scores_routine_construction_check;

ALTER TABLE contest_scores
  ADD CONSTRAINT contest_scores_trick_presentation_check
    CHECK (trick_presentation >= 0 AND trick_presentation <= (CASE WHEN division = 'SBJ' THEN 20 ELSE 10 END)),
  ADD CONSTRAINT contest_scores_performance_quality_check
    CHECK (performance_quality >= 0 AND performance_quality <= (CASE WHEN division = 'SBJ' THEN 20 ELSE 10 END)),
  ADD CONSTRAINT contest_scores_musicality_check
    CHECK (musicality >= 0 AND musicality <= (CASE WHEN division = 'SBJ' THEN 20 ELSE 10 END)),
  ADD CONSTRAINT contest_scores_routine_construction_check
    CHECK (routine_construction >= 0 AND routine_construction <= (CASE WHEN division = 'SBJ' THEN 20 ELSE 10 END));
