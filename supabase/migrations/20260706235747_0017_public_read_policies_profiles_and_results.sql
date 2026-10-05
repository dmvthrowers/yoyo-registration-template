-- Applied to production 2026-07-06 (schema_migrations version 20260706235747, name 0017_public_read_policies_profiles_and_results).
-- Copied into the repo 2026-09-23 so the repo matches prod; SQL is verbatim from
-- supabase_migrations.schema_migrations.

-- Public-facing read access for the player directory and results page.
-- Base tables stay locked to service_role for writes; these only add
-- narrow, read-only SELECT policies for anon/authenticated.

-- Competitors: only paid + opted-in rows are publicly visible.
create policy "public_can_view_public_registrations"
on public.contest_registrations
for select
to anon, authenticated
using (paid = true and is_public = true);

-- Spectators: only opted-in rows.
create policy "public_can_view_public_spectators"
on public.contest_spectators
for select
to anon, authenticated
using (is_public = true);

-- Staff: only active + opted-in public profiles.
create policy "public_can_view_public_staff_profiles"
on public.contest_staff_accounts
for select
to anon, authenticated
using (is_active = true and is_public_profile = true);

-- Event flags need to be readable so the results gate can be checked
-- client-side and by the scores policy below.
create policy "public_can_view_event_flags"
on public.contest_event_flags
for select
to anon, authenticated
using (true);

-- Scores: only visible once results_published flag is true.
create policy "public_can_view_scores_when_published"
on public.contest_scores
for select
to anon, authenticated
using (
  exists (
    select 1 from public.contest_event_flags f
    where f.key = 'results_published' and f.value_bool = true
  )
);
