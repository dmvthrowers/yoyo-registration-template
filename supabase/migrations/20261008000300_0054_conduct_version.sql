-- Code of conduct version (master plan P1): which version of the code each person accepted.
-- Null means they signed up before versions were stored. Additive, nothing reads it unless an
-- organizer bumps contest.codeOfConductVersion and goes looking for who accepted the old one.

alter table public.contest_registrations add column if not exists code_of_conduct_version text check (code_of_conduct_version is null or length(code_of_conduct_version) <= 20);
alter table public.contest_spectators    add column if not exists code_of_conduct_version text check (code_of_conduct_version is null or length(code_of_conduct_version) <= 20);
alter table public.contest_volunteers    add column if not exists code_of_conduct_version text check (code_of_conduct_version is null or length(code_of_conduct_version) <= 20);
