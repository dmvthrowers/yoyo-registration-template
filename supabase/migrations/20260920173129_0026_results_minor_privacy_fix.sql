-- Applied to production 2026-09-20 (schema_migrations version 20260920173129, name 0026_results_minor_privacy_fix).
-- Copied into the repo 2026-09-23 so the repo matches prod; SQL is verbatim from
-- supabase_migrations.schema_migrations.

-- ─────────────────────────────────────────────────────────────────────────────
-- PRIVACY FIX: contest_results was exposing every minor's full legal/bracket name
-- and exact city on the public results page, regardless of is_public. The rest
-- of the app (run-order, lib/display-name.ts) deliberately withholds a minor's
-- legal name unless a guardian has opted them into public listing -- results
-- never applied that rule at all. 17 minors in the current dataset have
-- is_public = false and were fully named (several on division podiums).
--
-- This masks display_name to "First L." and nulls out city for any
-- is_minor = true AND is_public = false registrant. State is deliberately
-- kept (unlike run-order's full location hide) so the results page's
-- VA-resident / out-of-state aggregates keep working -- state alone, paired
-- with an initialed name, is not personally identifying the way city+full
-- name is.
-- ─────────────────────────────────────────────────────────────────────────────

DROP VIEW IF EXISTS contest_results;

CREATE VIEW contest_results AS
WITH judge_max AS (
  SELECT
    division,
    COALESCE(judge_user_id::text, judge_name) AS judge_key,
    MAX(tech_execution_raw) FILTER (WHERE tech_execution_raw > 0) AS max_raw
  FROM contest_scores
  WHERE is_official_import = false
  GROUP BY division, COALESCE(judge_user_id::text, judge_name)
)
SELECT
  s.division,
  COALESCE(s.judge_display_name, s.judge_name) AS judge_name,
  s.judge_user_id,
  r.id            AS registration_id,
  CASE
    WHEN r.is_minor AND NOT r.is_public THEN r.first_name || ' ' || LEFT(r.last_name, 1) || '.'
    ELSE COALESCE(r.preferred_bracket_name, r.first_name || ' ' || r.last_name)
  END AS display_name,
  CASE WHEN r.is_minor AND NOT r.is_public THEN NULL ELSE r.city END AS city,
  r.state,
  s.tech_execution_raw,
  CASE WHEN s.division = 'SBJ' THEN 20 ELSE 60 END AS tech_execution_cap,
  CASE
    WHEN s.is_official_import THEN s.tech_execution_override
    WHEN jm.max_raw IS NULL OR s.tech_execution_raw <= 0 THEN 0
    ELSE LEAST(
      CASE WHEN s.division = 'SBJ' THEN 20 ELSE 60 END,
      ROUND((s.tech_execution_raw / jm.max_raw) * (CASE WHEN s.division = 'SBJ' THEN 20 ELSE 60 END), 2)
    )
  END AS tech_execution_normalized,
  s.trick_presentation,
  s.performance_quality,
  s.musicality,
  s.routine_construction,
  ROUND(s.trick_presentation + s.performance_quality + s.musicality + s.routine_construction, 2) AS total_eval,
  s.stop_count,
  s.discard_count,
  s.detach_count,
  CASE WHEN s.division = 'SBJ' THEN 0 ELSE s.stop_count * 1 + s.discard_count * 3 + s.detach_count * 5 END AS deduction_points,
  CASE
    WHEN s.is_official_import THEN s.final_score_override
    ELSE GREATEST(
      0,
      ROUND(
        (CASE
          WHEN jm.max_raw IS NULL OR s.tech_execution_raw <= 0 THEN 0
          ELSE LEAST(
            CASE WHEN s.division = 'SBJ' THEN 20 ELSE 60 END,
            (s.tech_execution_raw / jm.max_raw) * (CASE WHEN s.division = 'SBJ' THEN 20 ELSE 60 END)
          )
        END)
        + s.trick_presentation + s.performance_quality + s.musicality + s.routine_construction
        - (CASE WHEN s.division = 'SBJ' THEN 0 ELSE s.stop_count * 1 + s.discard_count * 3 + s.detach_count * 5 END),
        2
      )
    )
  END AS final_score,
  s.notes,
  s.created_at
FROM contest_scores s
JOIN contest_registrations r ON r.id = s.registration_id
LEFT JOIN judge_max jm
  ON jm.division = s.division AND jm.judge_key = COALESCE(s.judge_user_id::text, s.judge_name)
ORDER BY s.division, final_score DESC;

ALTER VIEW contest_results SET (security_invoker = true);
