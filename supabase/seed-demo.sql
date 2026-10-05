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

insert into public.contest_registrations
  (first_name, last_name, preferred_bracket_name, age_on_event, pronouns, email, phone, city, state,
   club_affiliation, parent_name, parent_email, parent_consented, divisions, x_substyle, combo_applied,
   early_bird_applied, walk_up_surcharge, fee_cents, registration_source, liability_waiver_accepted, photo_video_consent,
   code_of_conduct_accepted, emergency_contact_name, emergency_contact_phone, paid, paid_at,
   payment_method, amount_paid_cents, paid_currency, nickname, bio, yoyo, string, is_public)
values
  ('Avery',  'Sample',  'Avery S.', 24, 'they/them', 'avery@example.com',  '555-0101', 'Springfield', 'IL',
   'Springfield Throwers', null, null, false, '{1A}', null, false,
   true, false, 2500, 'online', true, true, true, 'Pat Sample', '555-0102', true, now() - interval '20 days',
   'stripe', 2500, 'usd', 'Spinner', 'Throwing since 2019. Loves slack tricks.', 'Demo Pro', 'Poly 8', true),
  ('Jordan', 'Example', null, 16, 'he/him', 'jordan@example.com', '555-0103', 'Peoria', 'IL',
   null, 'Casey Example', 'casey@example.com', true, '{1A,X}', '5A', true,
   false, false, 5000, 'online', true, true, true, 'Casey Example', '555-0104', true, now() - interval '12 days',
   'stripe', 5000, 'usd', null, 'First contest!', null, null, true),
  ('Riley',  'Placeholder', null, 31, 'she/her', 'riley@example.com', '555-0105', 'Chicago', 'IL',
   'Windy City Yo', null, null, false, '{X}', '2A', false,
   false, false, 2500, 'online', true, true, true, 'Sam Placeholder', '555-0106', true, now() - interval '9 days',
   'stripe', 2500, 'usd', 'Loopy', null, 'Demo Looper', null, true),
  ('Morgan', 'Testcase', null, 12, null, 'morgan@example.com', '555-0107', 'Decatur', 'IL',
   null, 'Drew Testcase', 'drew@example.com', true, '{SBJ}', null, false,
   false, false, 2000, 'online', true, true, true, 'Drew Testcase', '555-0108', false, null,
   'pending', null, null, null, null, null, null, true),
  ('Quinn',  'Demo', null, 45, null, 'quinn@example.com', '555-0109', 'Champaign', 'IL',
   'Springfield Throwers', null, null, false, '{1A}', null, false,
   false, false, 3000, 'online', true, true, true, 'Lee Demo', '555-0110', true, now() - interval '3 days',
   'stripe', 3000, 'usd', null, 'Back after twenty years off.', null, null, false),
  ('Sky',    'Fakename', null, 19, 'any', 'sky@example.com', '555-0111', 'St. Louis', 'MO',
   null, null, null, false, '{X}', '4A', false,
   false, true, 3500, 'walk_up', true, true, true, 'Ash Fakename', '555-0112', true, now() - interval '1 day',
   'cash', 3500, 'usd', null, null, null, null, true);

insert into public.contest_spectators
  (first_name, last_name, nickname, email, state, club, is_public, liability_accepted, code_of_conduct_accepted, volunteer_interest)
values
  ('Taylor', 'Viewer',   null,     'taylor@example.com', 'IL', 'Springfield Throwers', true,  true, true, true),
  ('Robin',  'Watcher',  'Robbie', 'robin@example.com',  'IL', null,                   false, true, true, false),
  ('Charlie','Audience', null,     'charlie@example.com','IN', null,                   true,  true, true, false);
