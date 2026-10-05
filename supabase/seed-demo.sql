-- Demo data: fake competitors and spectators so you can click around before launch.
--
-- Run it in the Supabase SQL editor (or psql) AFTER the migrations. Every row uses an
-- @example.com address, and the script refuses to run if real registrations exist.
--
-- Remove the demo rows before you open registration:
--
--   delete from public.contest_registrations where email like '%@example.com';
--   delete from public.contest_spectators   where email like '%@example.com';

do $$
begin
  if exists (select 1 from public.contest_registrations where email not like '%@example.com')
     or exists (select 1 from public.contest_spectators where email not like '%@example.com') then
    raise exception 'Real registrations found. The demo seed only runs on an empty contest database.';
  end if;
end $$;

-- Safe to re-run: start from a clean set of demo rows.
delete from public.contest_registrations where email like '%@example.com';
delete from public.contest_spectators   where email like '%@example.com';

-- Each demo competitor is placed in one of your configured divisions (contest_divisions,
-- round robin) and, where that division has styles, its first style, so the seed works
-- for any toy. Fees are placeholders.
with divs as (
  select d.code, row_number() over (order by d.sort_order, d.code) - 1 as idx, count(*) over () as n,
         (select s.code from public.contest_division_styles s where s.division_code = d.code order by s.sort_order, s.code limit 1) as style
    from public.contest_divisions d
),
people (i, first_name, last_name, nickname, age, pronouns, email, phone, city, state, club, parent_name, parent_email,
        emergency_name, emergency_phone, paid, days_ago, method, fee, source, bio, gear, is_public) as (
  values
  (0, 'Avery',  'Sample',      'Spinner', 24, 'they/them', 'avery@example.com',  '555-0101', 'Springfield', 'IL', 'Springfield Throwers', null, null, 'Pat Sample', '555-0102', true, 20, 'stripe', 2500, 'online', 'Practicing since 2019.', 'Demo Pro', true),
  (1, 'Jordan', 'Example',     null,      16, 'he/him',    'jordan@example.com', '555-0103', 'Peoria',      'IL', null, 'Casey Example', 'casey@example.com', 'Casey Example', '555-0104', true, 12, 'stripe', 2500, 'online', 'First contest!', null, true),
  (2, 'Riley',  'Placeholder', 'Loopy',   31, 'she/her',   'riley@example.com',  '555-0105', 'Chicago',     'IL', 'Windy City Throwers', null, null, 'Sam Placeholder', '555-0106', true, 9, 'stripe', 2500, 'online', null, 'Demo Looper', true),
  (3, 'Morgan', 'Testcase',    null,      12, null,        'morgan@example.com', '555-0107', 'Decatur',     'IL', null, 'Drew Testcase', 'drew@example.com', 'Drew Testcase', '555-0108', false, 0, 'pending', 2000, 'online', null, null, true),
  (4, 'Quinn',  'Demo',        null,      45, null,        'quinn@example.com',  '555-0109', 'Champaign',   'IL', 'Springfield Throwers', null, null, 'Lee Demo', '555-0110', true, 3, 'stripe', 3000, 'online', 'Back after twenty years off.', null, false),
  (5, 'Sky',    'Fakename',    null,      19, 'any',       'sky@example.com',    '555-0111', 'St. Louis',   'MO', null, null, null, 'Ash Fakename', '555-0112', true, 1, 'cash', 3500, 'walk_up', null, null, true)
)
insert into public.contest_registrations
  (first_name, last_name, age_on_event, pronouns, email, phone, city, state, club_affiliation,
   parent_name, parent_email, parent_consented, divisions, division_styles, fee_cents, registration_source,
   walk_up_surcharge, liability_waiver_accepted, photo_video_consent, code_of_conduct_accepted,
   emergency_contact_name, emergency_contact_phone, paid, paid_at, payment_method, amount_paid_cents,
   paid_currency, nickname, bio, yoyo, is_public)
select p.first_name, p.last_name, p.age, p.pronouns, p.email, p.phone, p.city, p.state, p.club,
       p.parent_name, p.parent_email, p.parent_name is not null, array[d.code],
       case when d.style is null then '{}'::jsonb else jsonb_build_object(d.code, jsonb_build_array(d.style)) end,
       p.fee, p.source::public.registration_source, p.source = 'walk_up', true, true, true,
       p.emergency_name, p.emergency_phone, p.paid,
       case when p.paid then now() - make_interval(days => p.days_ago) end,
       p.method::public.payment_method, case when p.paid then p.fee end, case when p.paid then 'usd' end,
       p.nickname, p.bio, p.gear, p.is_public
  from people p
  join divs d on d.idx = p.i % d.n;

insert into public.contest_spectators
  (first_name, last_name, nickname, email, state, club, is_public, liability_accepted, code_of_conduct_accepted, volunteer_interest)
values
  ('Taylor', 'Viewer',   null,     'taylor@example.com', 'IL', 'Springfield Throwers', true,  true, true, true),
  ('Robin',  'Watcher',  'Robbie', 'robin@example.com',  'IL', null,                   false, true, true, false),
  ('Charlie','Audience', null,     'charlie@example.com','IN', null,                   true,  true, true, false);
