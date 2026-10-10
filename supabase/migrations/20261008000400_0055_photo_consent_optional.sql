-- Photo and video release can be optional (master plan R11, contest.photoConsent = 'optional').
-- The registrations check used to insist the box was ticked; now the app decides. Waiver and code of
-- conduct stay required. Relaxing a check: no data changes, and 'required' (the default) still
-- refuses a missing box in the app's validation.

alter table public.contest_registrations drop constraint if exists waivers_required;
alter table public.contest_registrations add constraint waivers_required check (
  liability_waiver_accepted = true
  and code_of_conduct_accepted = true
);
