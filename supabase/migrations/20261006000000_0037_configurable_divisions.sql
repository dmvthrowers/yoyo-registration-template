-- 0037: divisions and scoring come from data, not hardcoded 1A / X / SBJ.
--
-- * contest_divisions + contest_division_styles hold each division's scoring rules.
--   supabase/divisions.sql (generated from contest.config.ts by `npm run divisions`) keeps
--   them in sync; the rows below are the template's default yo-yo divisions.
-- * contest_registrations.divisions: enum array → text[]; x_substyle → division_styles
--   jsonb ({"X": ["2A"]}), so any division can have styles and players can pick several.
-- * contest_scores: division FK, optional style_code (which style the routine was judged
--   under), simple_score for the "simple" format; range checks read the division's caps.
-- * contest_results: rebuilt to read caps, multipliers and deductions from those tables.
--   Mirrors lib/divisions-core.ts (freestyleBreakdown / simpleBreakdown); keep in sync.

-- ── Division tables ──────────────────────────────────────────────────────────

create table public.contest_divisions (
  code            text primary key check (code ~ '^[A-Za-z0-9_-]{1,20}$'),
  name            text not null,
  scoring_format  text not null check (scoring_format in ('freestyle', 'simple')),
  tech_cap        numeric(7,2),
  eval_cap        numeric(5,2),
  allow_negative  boolean not null default false,
  stop_points     numeric(5,2) not null default 0,
  discard_points  numeric(5,2) not null default 0,
  detach_points   numeric(5,2) not null default 0,
  simple_max      numeric(7,2),
  has_music       boolean not null default true,
  sort_order      integer not null default 0,
  updated_at      timestamptz not null default now(),
  constraint contest_divisions_format_fields check (
    (scoring_format = 'freestyle' and tech_cap > 0 and eval_cap > 0)
    or (scoring_format = 'simple' and simple_max > 0)
  )
);

create table public.contest_division_styles (
  division_code  text not null references public.contest_divisions (code) on update cascade on delete cascade,
  code           text not null check (code ~ '^[A-Za-z0-9_-]{1,20}$'),
  label          text not null,
  multiplier     numeric(5,3) not null default 1 check (multiplier > 0),
  sort_order     integer not null default 0,
  primary key (division_code, code)
);

alter table public.contest_divisions enable row level security;
alter table public.contest_division_styles enable row level security;
create policy public_can_view_divisions on public.contest_divisions for select to anon, authenticated using (true);
create policy service_role_all_divisions on public.contest_divisions using (auth.role() = 'service_role');
create policy public_can_view_division_styles on public.contest_division_styles for select to anon, authenticated using (true);
create policy service_role_all_division_styles on public.contest_division_styles using (auth.role() = 'service_role');

insert into public.contest_divisions
  (code, name, scoring_format, tech_cap, eval_cap, allow_negative, stop_points, discard_points, detach_points, simple_max, has_music, sort_order)
values
  ('1A', '1A — Single String', 'freestyle', 60, 10, true, 1, 3, 5, null, true, 1),
  ('X', 'X Division', 'freestyle', 60, 10, true, 1, 3, 5, null, true, 2),
  ('SBJ', 'Sport / Beginner / Junior', 'freestyle', 20, 20, false, 0, 0, 0, null, true, 3);

insert into public.contest_division_styles (division_code, code, label, multiplier, sort_order)
values
  ('X', '2A', '2A — Looping', 1.4, 1),
  ('X', '3A', '3A — Two-Handed String', 1.5, 2),
  ('X', '4A', '4A — Offstring', 1.3, 3),
  ('X', '5A', '5A — Freehand', 1.6, 4);

-- ── Views that depend on the columns being changed ───────────────────────────

drop view if exists public.contest_results;
drop view if exists public.contest_public_profiles;

-- ── Registrations ────────────────────────────────────────────────────────────

alter table public.contest_registrations drop constraint if exists x_requires_substyle;
alter table public.contest_registrations alter column divisions type text[] using divisions::text[];
alter table public.contest_registrations add column division_styles jsonb not null default '{}'::jsonb;
update public.contest_registrations
   set division_styles = jsonb_build_object('X', jsonb_build_array(x_substyle::text))
 where x_substyle is not null;
alter table public.contest_registrations drop column x_substyle;
drop type if exists public.x_substyle;
drop type if exists public.division_code;

-- Every division and style a registration names must exist.
create function public.contest_check_registration_divisions() returns trigger
language plpgsql set search_path = '' as $$
declare
  bad text;
begin
  select d into bad from unnest(new.divisions) d
   where not exists (select 1 from public.contest_divisions cd where cd.code = d) limit 1;
  if bad is not null then
    raise exception 'Unknown division: %', bad using errcode = '23514';
  end if;

  if jsonb_typeof(new.division_styles) <> 'object' then
    raise exception 'division_styles must be a JSON object' using errcode = '23514';
  end if;
  select k.key || '/' || coalesce(s.value, '?') into bad
    from jsonb_each(new.division_styles) k
    left join lateral jsonb_array_elements_text(case when jsonb_typeof(k.value) = 'array' then k.value else '[]'::jsonb end) s(value) on true
   where jsonb_typeof(k.value) <> 'array'
      or not (k.key = any (new.divisions))
      or (s.value is not null and not exists (
            select 1 from public.contest_division_styles st where st.division_code = k.key and st.code = s.value))
   limit 1;
  if bad is not null then
    raise exception 'Unknown or unselected division style: %', bad using errcode = '23514';
  end if;
  return new;
end $$;

create trigger contest_registrations_check_divisions
  before insert or update of divisions, division_styles on public.contest_registrations
  for each row execute function public.contest_check_registration_divisions();

-- A division or style still used by a registration can't be deleted or renamed away.
create function public.contest_protect_used_divisions() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_table_name = 'contest_divisions' then
    if (tg_op = 'DELETE' or new.code <> old.code)
       and exists (select 1 from public.contest_registrations r where old.code = any (r.divisions)) then
      raise exception 'Division % is used by registrations; remove it from them first', old.code using errcode = '23503';
    end if;
  else
    if (tg_op = 'DELETE' or new.code <> old.code)
       and exists (select 1 from public.contest_registrations r
                    where r.division_styles -> old.division_code ? old.code) then
      raise exception 'Style %/% is used by registrations', old.division_code, old.code using errcode = '23503';
    end if;
  end if;
  return coalesce(new, old);
end $$;

create trigger contest_divisions_protect before update or delete on public.contest_divisions
  for each row execute function public.contest_protect_used_divisions();
create trigger contest_division_styles_protect before update or delete on public.contest_division_styles
  for each row execute function public.contest_protect_used_divisions();

-- ── Run order and scores ─────────────────────────────────────────────────────

alter table public.contest_run_order drop constraint if exists contest_run_order_division_check;
alter table public.contest_run_order
  add constraint contest_run_order_division_fkey foreign key (division)
  references public.contest_divisions (code) on update cascade;

alter table public.contest_scores drop constraint if exists contest_scores_trick_presentation_check;
alter table public.contest_scores drop constraint if exists contest_scores_performance_quality_check;
alter table public.contest_scores drop constraint if exists contest_scores_musicality_check;
alter table public.contest_scores drop constraint if exists contest_scores_routine_construction_check;
alter table public.contest_scores
  add constraint contest_scores_division_fkey foreign key (division)
  references public.contest_divisions (code) on update cascade;
alter table public.contest_scores add column style_code text;
alter table public.contest_scores add column simple_score numeric(7,2) check (simple_score >= 0);
alter table public.contest_scores
  add constraint contest_scores_eval_nonnegative check (
    trick_presentation >= 0 and performance_quality >= 0 and musicality >= 0 and routine_construction >= 0);

-- Ranges depend on the division: eval categories ≤ eval_cap, simple_score ≤ simple_max,
-- no negative clicks where the division doesn't allow them, style must exist.
create function public.contest_check_score() returns trigger
language plpgsql set search_path = '' as $$
declare
  d public.contest_divisions;
begin
  if new.is_official_import then
    return new;
  end if;
  select * into d from public.contest_divisions where code = new.division;
  if d.scoring_format = 'freestyle' then
    if greatest(new.trick_presentation, new.performance_quality, new.musicality, new.routine_construction) > d.eval_cap then
      raise exception 'Evaluation categories in % are scored out of %', d.code, d.eval_cap using errcode = '23514';
    end if;
    if not d.allow_negative and new.tech_execution_raw < 0 then
      raise exception '% does not use negative clicks', d.code using errcode = '23514';
    end if;
  elsif new.simple_score is not null and new.simple_score > d.simple_max then
    raise exception '% is scored out of %', d.code, d.simple_max using errcode = '23514';
  end if;
  if new.style_code is not null and not exists (
       select 1 from public.contest_division_styles s where s.division_code = new.division and s.code = new.style_code) then
    raise exception 'Unknown style % for %', new.style_code, new.division using errcode = '23514';
  end if;
  return new;
end $$;

create trigger contest_scores_check before insert or update on public.contest_scores
  for each row execute function public.contest_check_score();

-- ── contest_public_profiles (unchanged apart from the divisions type) ────────

create view public.contest_public_profiles as
select r.id,
       'competitor'::text as role,
       coalesce(r.nickname, r.preferred_bracket_name, r.first_name || ' ' || r.last_name) as display_name,
       r.pronouns, r.city, r.state, r.club_affiliation as club, r.team, r.bio, r.photo_url, r.socials,
       r.divisions as divisions,
       r.age_bracket,
       r.is_public as is_public_default
  from public.contest_registrations r
 where r.paid = true and r.is_public = true
union all
select s.id, 'spectator'::text, coalesce(s.nickname, s.first_name || ' ' || s.last_name),
       s.pronouns, null::text, s.state, s.club, s.team, s.bio, s.photo_url, s.socials,
       null::text[], null::text, s.is_public
  from public.contest_spectators s
 where s.is_public = true
union all
select sa.id, sa.role, sa.display_name, sa.pronouns, null::text, null::text, null::text, null::text,
       sa.bio, sa.photo_url, sa.socials, null::text[], null::text, sa.is_public_profile
  from public.contest_staff_accounts sa
 where sa.is_active = true and sa.is_public_profile = true;

alter view public.contest_public_profiles set (security_invoker = true);

-- ── contest_results ──────────────────────────────────────────────────────────

create view public.contest_results as
with scored as (
  select s.*,
         r.is_minor, r.is_public, r.nickname, r.preferred_bracket_name, r.first_name, r.last_name,
         r.city as reg_city, r.state as reg_state, r.socials as reg_socials,
         d.scoring_format, d.tech_cap, d.eval_cap, d.stop_points, d.discard_points, d.detach_points, d.simple_max,
         coalesce(st.multiplier, 1.00) as style_multiplier,
         coalesce(s.style_code,
           case when jsonb_typeof(r.division_styles -> s.division) = 'array'
                     and jsonb_array_length(r.division_styles -> s.division) = 1
                then r.division_styles -> s.division ->> 0 end) as effective_style
    from public.contest_scores s
    join public.contest_registrations r on r.id = s.registration_id
    join public.contest_divisions d on d.code = s.division
    left join public.contest_division_styles st
      on st.division_code = s.division
     and st.code = coalesce(s.style_code,
           case when jsonb_typeof(r.division_styles -> s.division) = 'array'
                     and jsonb_array_length(r.division_styles -> s.division) = 1
                then r.division_styles -> s.division ->> 0 end)
),
judge_max as (
  -- Each judge's top raw tally after style multipliers: multiply, then normalize.
  select division, coalesce(judge_user_id::text, judge_name) as judge_key,
         max(tech_execution_raw * style_multiplier) filter (where tech_execution_raw > 0) as max_raw
    from scored
   where not is_official_import and scoring_format = 'freestyle'
   group by division, coalesce(judge_user_id::text, judge_name)
),
computed as (
  select sc.*,
         case
           when sc.scoring_format <> 'freestyle' then 0
           when sc.is_official_import then sc.tech_execution_override
           when jm.max_raw is null or sc.tech_execution_raw <= 0 then 0
           else least(sc.tech_cap, round((sc.tech_execution_raw * sc.style_multiplier / jm.max_raw) * sc.tech_cap, 2))
         end as tech_norm,
         case when sc.scoring_format = 'freestyle'
              then sc.stop_count * sc.stop_points + sc.discard_count * sc.discard_points + sc.detach_count * sc.detach_points
              else 0 end as deductions
    from scored sc
    left join judge_max jm
      on jm.division = sc.division and jm.judge_key = coalesce(sc.judge_user_id::text, sc.judge_name)
)
select
  c.division,
  coalesce(c.judge_display_name, c.judge_name) as judge_name,
  c.judge_user_id,
  c.registration_id,
  case
    when c.is_minor and not c.is_public then
      coalesce(
        nullif(trim(c.nickname), ''),
        case
          when c.preferred_bracket_name is not null
               and lower(trim(c.preferred_bracket_name)) <> lower(trim(c.first_name || ' ' || c.last_name))
          then c.preferred_bracket_name
        end,
        c.first_name || ' ' || left(c.last_name, 1) || '.'
      )
    else coalesce(c.preferred_bracket_name, c.first_name || ' ' || c.last_name)
  end as display_name,
  case when c.is_minor and not c.is_public then null else c.reg_city end as city,
  c.reg_state as state,
  c.is_public,
  case when c.is_public then c.reg_socials else '{}'::jsonb end as socials,
  c.scoring_format,
  c.effective_style as style_code,
  c.tech_execution_raw,
  c.style_multiplier,
  c.tech_cap as tech_execution_cap,
  c.tech_norm as tech_execution_normalized,
  c.trick_presentation,
  c.performance_quality,
  c.musicality,
  c.routine_construction,
  round(c.trick_presentation + c.performance_quality + c.musicality + c.routine_construction, 2) as total_eval,
  c.stop_count,
  c.discard_count,
  c.detach_count,
  c.deductions as deduction_points,
  c.simple_score,
  case
    when c.is_official_import then c.final_score_override
    when c.scoring_format = 'simple' then least(c.simple_max, greatest(0, round(coalesce(c.simple_score, 0), 2)))
    else greatest(0, round(c.tech_norm + c.trick_presentation + c.performance_quality + c.musicality + c.routine_construction - c.deductions, 2))
  end as final_score,
  c.notes,
  c.created_at
from computed c
order by c.division, final_score desc;

alter view public.contest_results set (security_invoker = true);
