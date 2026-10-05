-- Applied to production 2026-09-20 (schema_migrations version 20260920174212, name 0028_results_public_socials).
-- Copied into the repo 2026-09-23 so the repo matches prod; SQL is verbatim from
-- supabase_migrations.schema_migrations.

-- ─────────────────────────────────────────────────────────────────────────────
-- Expose a competitor's social links on contest_results, gated by the same
-- is_public consent flag that already governs the contest_public_profiles /
-- directory feature. Only surfaced when is_public = true, so this can never
-- leak socials for someone (minor or adult) who hasn't opted into a public
-- profile -- consistent with the 0026/0027 name-masking logic.
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
    WHEN r.is_minor AND NOT r.is_public THEN
      COALESCE(
        NULLIF(TRIM(r.nickname), ''),
        CASE
          WHEN r.preferred_bracket_name IS NOT NULL
               AND LOWER(TRIM(r.preferred_bracket_name)) <> LOWER(TRIM(r.first_name || ' ' || r.last_name))
          THEN r.preferred_bracket_name
        END,
        r.first_name || ' ' || LEFT(r.last_name, 1) || '.'
      )
    ELSE COALESCE(r.preferred_bracket_name, r.first_name || ' ' || r.last_name)
  END AS display_name,
  CASE WHEN r.is_minor AND NOT r.is_public THEN NULL ELSE r.city END AS city,
  r.state,
  r.is_public,
  CASE WHEN r.is_public THEN r.socials ELSE '{}'::jsonb END AS socials,
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
