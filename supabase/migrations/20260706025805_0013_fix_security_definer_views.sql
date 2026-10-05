-- Recreated views default to SECURITY DEFINER, which bypasses RLS on the
-- underlying tables. Force SECURITY INVOKER so they run as the querying user.

ALTER VIEW contest_results SET (security_invoker = true);
ALTER VIEW contest_public_profiles SET (security_invoker = true);
