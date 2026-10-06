-- 0045: who revoked a role grant (additive; the grants table is from 0044)
alter table public.contest_role_grants add column if not exists revoked_by uuid;
