-- 0040: audience-decided battles (crowd or stream-chat polls).
-- An admin enters each poll's vote counts; the app suggests the winner and can rank the
-- semifinal losers by total votes (bracket.thirdPlaceByVotes).
alter table public.contest_bracket_matches
  add column votes_a integer check (votes_a >= 0),
  add column votes_b integer check (votes_b >= 0);
