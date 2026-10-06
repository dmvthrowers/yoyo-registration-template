-- 0043: music tracks per slot (expand step, applies on top of 0042)
--
-- 0042 gave each player one track per division. Divisions can now ask for several tracks: one
-- per round (prelims, semi-final, final) and/or extras such as battle music, all defined in
-- contest.config.ts (musicSlotsOf). So a row is now (registration, division, slot):
--   * slot 'main' is the division's single routine track: every existing row, and what a
--     division with `music: true` keeps using, so nothing changes until the config asks for more.
--   * a round's track uses the round's key ('prelims', 'final'...), an extra its own key ('battle').
-- Additive: one new column, and the unique key widens from (registration, division) to
-- (registration, division, slot). The triggers from 0042 are unchanged.

alter table public.contest_music
  add column slot text not null default 'main'
  check (slot ~ '^[a-z0-9][a-z0-9_-]{0,29}$');

alter table public.contest_music drop constraint contest_music_registration_id_division_key;
alter table public.contest_music add constraint contest_music_registration_division_slot_key
  unique (registration_id, division, slot);
