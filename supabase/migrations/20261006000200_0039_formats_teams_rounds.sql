-- 0039: more contest formats, team entries and rounds.
--
-- * Formats: freestyle and manual (0037) plus panel (judged criteria), ladder (trick ladder),
--   bracket (battles) and showcase (not judged). The division's full rules are stored in
--   contest_divisions.config (written by supabase/divisions.sql); triggers read them.
-- * Manual divisions can rank lower-is-better (speed) and record best-of-N attempts.
-- * Team entries (doubles, groups, acts): every member registers and signs for themselves;
--   the captain's registration stands for the team in the run order, scores and brackets.
-- * Rounds (prelims → finals): scores and run order carry a round number.
-- Mirrors lib/divisions-core.ts; keep the two in sync.

-- ── Division rules ───────────────────────────────────────────────────────────

alter table public.contest_divisions drop constraint if exists contest_divisions_scoring_format_check;
alter table public.contest_divisions drop constraint if exists contest_divisions_format_fields;
alter table public.contest_divisions
  add constraint contest_divisions_scoring_format_check
    check (scoring_format in ('freestyle', 'manual', 'panel', 'ladder', 'bracket', 'showcase')),
  add constraint contest_divisions_format_fields check (
    (scoring_format <> 'freestyle' or (tech_cap > 0 and eval_cap > 0))
    and (scoring_format <> 'manual' or manual_max > 0)
  ),
  add column better        text not null default 'higher' check (better in ('higher', 'lower')),
  add column entry_type    text not null default 'solo' check (entry_type in ('solo', 'team')),
  add column team_min      integer,
  add column team_max      integer,
  add column rounds_count  integer not null default 1 check (rounds_count between 1 and 5),
  add column config        jsonb not null default '{}'::jsonb,
  add constraint contest_divisions_team_fields check (
    entry_type = 'solo' or (team_min >= 1 and team_max >= team_min)
  );

-- ── Public names ─────────────────────────────────────────────────────────────

-- The name shown publicly for a registrant: minors who aren't opted into public listing get
-- a nickname, a bracket name that isn't their legal name, or first name + last initial.
create function public.contest_public_name(r public.contest_registrations) returns text
language sql stable set search_path = '' as $$
  select case
    when r.is_minor and not r.is_public then
      coalesce(
        nullif(trim(r.nickname), ''),
        case
          when r.preferred_bracket_name is not null
               and lower(trim(r.preferred_bracket_name)) <> lower(trim(r.first_name || ' ' || r.last_name))
          then r.preferred_bracket_name
        end,
        r.first_name || ' ' || left(r.last_name, 1) || '.'
      )
    else coalesce(r.preferred_bracket_name, r.first_name || ' ' || r.last_name)
  end
$$;

-- ── Teams ────────────────────────────────────────────────────────────────────

create table public.contest_teams (
  id                       uuid primary key default gen_random_uuid(),
  division                 text not null references public.contest_divisions (code) on update cascade,
  name                     text not null check (length(trim(name)) between 1 and 60),
  -- Share this with teammates so they can join while registering.
  join_code                text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 6)),
  captain_registration_id  uuid not null references public.contest_registrations (id) on delete cascade,
  created_at               timestamptz not null default now(),
  unique (division, captain_registration_id),
  unique (division, name)
);

create table public.contest_team_members (
  team_id          uuid not null references public.contest_teams (id) on delete cascade,
  registration_id  uuid not null references public.contest_registrations (id) on delete cascade,
  division         text not null references public.contest_divisions (code) on update cascade,
  joined_at        timestamptz not null default now(),
  primary key (team_id, registration_id),
  -- One team per person per division.
  unique (registration_id, division)
);

alter table public.contest_teams enable row level security;
alter table public.contest_team_members enable row level security;
create policy service_role_all_teams on public.contest_teams using (auth.role() = 'service_role');
create policy service_role_all_team_members on public.contest_team_members using (auth.role() = 'service_role');

-- Team rows must match a team division the member entered, and teams can't overfill.
create function public.contest_check_team_member() returns trigger
language plpgsql set search_path = '' as $$
declare
  t public.contest_teams;
  d public.contest_divisions;
  n integer;
begin
  select * into t from public.contest_teams where id = new.team_id;
  select * into d from public.contest_divisions where code = t.division;
  new.division := t.division;
  if d.entry_type <> 'team' then
    raise exception '% is not a team division', d.code using errcode = '23514';
  end if;
  if not exists (select 1 from public.contest_registrations r
                  where r.id = new.registration_id and t.division = any (r.divisions)) then
    raise exception 'Registration is not entered in %', d.code using errcode = '23514';
  end if;
  select count(*) into n from public.contest_team_members m
   where m.team_id = new.team_id and m.registration_id <> new.registration_id;
  if n + 1 > d.team_max then
    raise exception 'Team % is full (% max)', t.name, d.team_max using errcode = '23514';
  end if;
  return new;
end $$;

create trigger contest_team_members_check before insert or update on public.contest_team_members
  for each row execute function public.contest_check_team_member();

-- The captain is always a member.
create function public.contest_team_add_captain() returns trigger
language plpgsql set search_path = '' as $$
begin
  insert into public.contest_team_members (team_id, registration_id, division)
  values (new.id, new.captain_registration_id, new.division)
  on conflict do nothing;
  return new;
end $$;

create trigger contest_teams_add_captain after insert on public.contest_teams
  for each row execute function public.contest_team_add_captain();

-- Public name for an entry: the team name in team divisions, otherwise the registrant's name.
create function public.contest_entry_name(p_registration_id uuid, p_division text) returns text
language sql stable set search_path = '' as $$
  select coalesce(
    (select t.name from public.contest_teams t
      where t.captain_registration_id = p_registration_id and t.division = p_division),
    (select public.contest_public_name(r) from public.contest_registrations r where r.id = p_registration_id)
  )
$$;

-- ── Rounds, panel and manual scores ──────────────────────────────────────────

drop view if exists public.contest_results;

alter table public.contest_scores
  add column round smallint not null default 1 check (round between 1 and 5),
  add column panel_scores jsonb,
  add column manual_attempts numeric(9,2)[];
alter table public.contest_scores drop constraint if exists contest_scores_registration_id_division_judge_name_key;
alter table public.contest_scores drop constraint if exists uq_contest_scores_judge_user;
alter table public.contest_scores
  add constraint contest_scores_entry_judge_name_key unique (registration_id, division, round, judge_name),
  add constraint uq_contest_scores_judge_user unique (registration_id, division, round, judge_user_id);
alter table public.contest_scores alter column manual_score type numeric(9,2);
-- The judge sheet allows ±500 clicks (the old ±200 cap was too tight for long finals routines).
alter table public.contest_scores drop constraint if exists contest_scores_tech_execution_raw_check;
alter table public.contest_scores
  add constraint contest_scores_tech_execution_raw_check check (tech_execution_raw between -500 and 500);

alter table public.contest_run_order add column round smallint not null default 1 check (round between 1 and 5);
alter table public.contest_run_order drop constraint if exists contest_run_order_division_position_key;
alter table public.contest_run_order drop constraint if exists contest_run_order_division_registration_id_key;
alter table public.contest_run_order
  add constraint contest_run_order_division_round_position_key unique (division, round, position),
  add constraint contest_run_order_division_round_registration_key unique (division, round, registration_id);

alter table public.contest_divisions alter column manual_max type numeric(9,2);

create or replace function public.contest_check_score() returns trigger
language plpgsql set search_path = '' as $$
declare
  d public.contest_divisions;
  c jsonb;
  v numeric;
begin
  if new.is_official_import then
    return new;
  end if;
  select * into d from public.contest_divisions where code = new.division;
  if d.scoring_format not in ('freestyle', 'manual', 'panel') then
    raise exception '% (%) is not scored on a score sheet', d.code, d.scoring_format using errcode = '23514';
  end if;
  if new.round > d.rounds_count then
    raise exception '% has % round(s)', d.code, d.rounds_count using errcode = '23514';
  end if;
  if d.scoring_format = 'freestyle' then
    if greatest(new.trick_presentation, new.performance_quality, new.musicality, new.routine_construction) > d.eval_cap then
      raise exception 'Evaluation categories in % are scored out of %', d.code, d.eval_cap using errcode = '23514';
    end if;
    if not d.allow_negative and new.tech_execution_raw < 0 then
      raise exception '% does not use negative clicks', d.code using errcode = '23514';
    end if;
  elsif d.scoring_format = 'manual' then
    if new.manual_score is not null and new.manual_score > d.manual_max then
      raise exception '% is scored out of %', d.code, d.manual_max using errcode = '23514';
    end if;
    if exists (select 1 from unnest(coalesce(new.manual_attempts, '{}')) a where a < 0 or a > d.manual_max) then
      raise exception '% attempts must be between 0 and %', d.code, d.manual_max using errcode = '23514';
    end if;
  else
    if new.panel_scores is null or jsonb_typeof(new.panel_scores) <> 'object' then
      raise exception '% needs panel_scores', d.code using errcode = '23514';
    end if;
    for c in select * from jsonb_array_elements(d.config -> 'scoring' -> 'criteria') loop
      v := (new.panel_scores ->> (c ->> 'key'))::numeric;
      if v is not null and (v < 0 or v > (c ->> 'max')::numeric) then
        raise exception '% is scored out of %', c ->> 'label', c ->> 'max' using errcode = '23514';
      end if;
    end loop;
  end if;
  if new.style_code is not null and not exists (
       select 1 from public.contest_division_styles s where s.division_code = new.division and s.code = new.style_code) then
    raise exception 'Unknown style % for %', new.style_code, new.division using errcode = '23514';
  end if;
  return new;
end $$;

-- ── Trick ladder ─────────────────────────────────────────────────────────────

create table public.contest_ladder_attempts (
  id               uuid primary key default gen_random_uuid(),
  division         text not null references public.contest_divisions (code) on update cascade,
  registration_id  uuid not null references public.contest_registrations (id) on delete cascade,
  trick_index      integer not null check (trick_index >= 0),
  attempt          integer not null check (attempt >= 1),
  landed           boolean not null,
  judge_user_id    uuid,
  judge_name       text,
  created_at       timestamptz not null default now(),
  unique (division, registration_id, trick_index, attempt)
);

alter table public.contest_ladder_attempts enable row level security;
create policy service_role_all_ladder_attempts on public.contest_ladder_attempts using (auth.role() = 'service_role');

create function public.contest_check_ladder_attempt() returns trigger
language plpgsql set search_path = '' as $$
declare
  d public.contest_divisions;
begin
  select * into d from public.contest_divisions where code = new.division;
  if d.scoring_format <> 'ladder' then
    raise exception '% is not a trick ladder', d.code using errcode = '23514';
  end if;
  if new.trick_index >= jsonb_array_length(d.config -> 'scoring' -> 'tricks') then
    raise exception '% has % tricks', d.code, jsonb_array_length(d.config -> 'scoring' -> 'tricks') using errcode = '23514';
  end if;
  if new.attempt > (d.config -> 'scoring' ->> 'attemptsPerTrick')::integer then
    raise exception '% allows % attempts per trick', d.code, d.config -> 'scoring' ->> 'attemptsPerTrick' using errcode = '23514';
  end if;
  return new;
end $$;

create trigger contest_ladder_attempts_check before insert or update on public.contest_ladder_attempts
  for each row execute function public.contest_check_ladder_attempt();

-- ── Battle brackets ──────────────────────────────────────────────────────────

create table public.contest_bracket_matches (
  id              uuid primary key default gen_random_uuid(),
  division        text not null references public.contest_divisions (code) on update cascade,
  round           integer not null check (round >= 1),
  position        integer not null check (position >= 1),
  is_third_place  boolean not null default false,
  entry_a         uuid references public.contest_registrations (id) on delete set null,
  entry_b         uuid references public.contest_registrations (id) on delete set null,
  winner          uuid references public.contest_registrations (id) on delete set null,
  status          text not null default 'pending' check (status in ('pending', 'live', 'done')),
  updated_at      timestamptz not null default now(),
  unique (division, round, position, is_third_place),
  constraint contest_bracket_winner_is_entrant check (winner is null or winner = entry_a or winner = entry_b)
);

create table public.contest_battle_votes (
  match_id       uuid not null references public.contest_bracket_matches (id) on delete cascade,
  judge_user_id  uuid not null,
  judge_name     text,
  pick           text not null check (pick in ('a', 'b')),
  created_at     timestamptz not null default now(),
  primary key (match_id, judge_user_id)
);

alter table public.contest_bracket_matches enable row level security;
alter table public.contest_battle_votes enable row level security;
create policy service_role_all_bracket_matches on public.contest_bracket_matches using (auth.role() = 'service_role');
create policy service_role_all_battle_votes on public.contest_battle_votes using (auth.role() = 'service_role');

create function public.contest_check_bracket_match() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.contest_divisions d where d.code = new.division and d.scoring_format = 'bracket') then
    raise exception '% is not a bracket division', new.division using errcode = '23514';
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger contest_bracket_matches_check before insert or update on public.contest_bracket_matches
  for each row execute function public.contest_check_bracket_match();

-- ── contest_results (freestyle, panel, manual) ───────────────────────────────

create view public.contest_results as
with scored as (
  select s.*,
         r.is_public, r.city as reg_city, r.state as reg_state, r.socials as reg_socials, r.is_minor,
         d.scoring_format, d.tech_cap, d.eval_cap, d.stop_points, d.discard_points, d.detach_points,
         d.manual_max, d.better,
         coalesce(st.multiplier, 1.00) as style_multiplier,
         coalesce(s.style_code,
           case when jsonb_typeof(r.division_styles -> s.division) = 'array'
                     and jsonb_array_length(r.division_styles -> s.division) = 1
                then r.division_styles -> s.division ->> 0 end) as effective_style,
         (select coalesce(sum(least((c ->> 'max')::numeric, greatest(0, coalesce((s.panel_scores ->> (c ->> 'key'))::numeric, 0)))), 0)
            from jsonb_array_elements(case when d.scoring_format = 'panel' then d.config -> 'scoring' -> 'criteria' else '[]'::jsonb end) c
         ) as panel_total,
         public.contest_entry_name(s.registration_id, s.division) as entry_name
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
  -- Each judge's top raw tally after style multipliers, per round: multiply, then normalize.
  select division, round, coalesce(judge_user_id::text, judge_name) as judge_key,
         max(tech_execution_raw * style_multiplier) filter (where tech_execution_raw > 0) as max_raw
    from scored
   where not is_official_import and scoring_format = 'freestyle'
   group by division, round, coalesce(judge_user_id::text, judge_name)
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
      on jm.division = sc.division and jm.round = sc.round
     and jm.judge_key = coalesce(sc.judge_user_id::text, sc.judge_name)
)
select
  c.division,
  c.round,
  coalesce(c.judge_display_name, c.judge_name) as judge_name,
  c.judge_user_id,
  c.registration_id,
  c.entry_name as display_name,
  case when c.is_minor and not c.is_public then null else c.reg_city end as city,
  c.reg_state as state,
  c.is_public,
  case when c.is_public then c.reg_socials else '{}'::jsonb end as socials,
  c.scoring_format,
  c.better,
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
  c.manual_score,
  c.manual_attempts,
  c.panel_scores,
  case
    when c.is_official_import then c.final_score_override
    when c.scoring_format = 'manual' then least(c.manual_max, greatest(0, round(coalesce(c.manual_score, 0), 2)))
    when c.scoring_format = 'panel' then round(c.panel_total, 2)
    else greatest(0, round(c.tech_norm + c.trick_presentation + c.performance_quality + c.musicality + c.routine_construction - c.deductions, 2))
  end as final_score,
  c.notes,
  c.created_at
from computed c
order by c.division, c.round, final_score desc;

alter view public.contest_results set (security_invoker = true);
