-- Applied to prod 2026-07-05 via Supabase MCP.
-- Wrap auth.role() in a scalar subselect so Postgres evaluates it once per
-- query instead of once per row (Supabase RLS performance best practice).

DROP POLICY IF EXISTS "service_role_all_registrations" ON contest_registrations;
CREATE POLICY "service_role_all_registrations" ON contest_registrations
  FOR ALL USING ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "service_role_all_codes" ON contest_comp_codes;
CREATE POLICY "service_role_all_codes" ON contest_comp_codes
  FOR ALL USING ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "service_role_all_audit" ON contest_audit_log;
CREATE POLICY "service_role_all_audit" ON contest_audit_log
  FOR ALL USING ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "service_role_all_run_order" ON contest_run_order;
CREATE POLICY "service_role_all_run_order" ON contest_run_order
  FOR ALL USING ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "service_role_all_scores" ON contest_scores;
CREATE POLICY "service_role_all_scores" ON contest_scores
  FOR ALL USING ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "service_role_all_spectators" ON contest_spectators;
CREATE POLICY "service_role_all_spectators" ON contest_spectators
  FOR ALL USING ((select auth.role()) = 'service_role');
