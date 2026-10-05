-- Applied to production 2026-09-21 (schema_migrations version 20260921210036, name contest_survey_responses).
-- Copied into the repo 2026-09-23 so the repo matches prod; SQL is verbatim from
-- supabase_migrations.schema_migrations. Superseded by 0029, which drops the anon
-- insert policy below (writes now go through POST /api/survey).

create table public.contest_survey_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  survey_type text not null check (survey_type in ('sponsor','competitor','spectator','volunteer')),
  answers jsonb not null,
  contact_name text,
  contact_email text,
  allow_quote boolean not null default false,
  quote_text text
);

alter table public.contest_survey_responses enable row level security;

create policy "anon can insert survey responses"
  on public.contest_survey_responses
  for insert
  to anon
  with check (true);
