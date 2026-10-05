-- Confirmed volunteers get 50% off their own the contest entry fee. When an admin
-- flips a volunteer's status to 'confirmed' (see app/api/admin/volunteers/[id]/route.ts),
-- the app auto-generates a single-use 50%-off row in contest_comp_codes and
-- stores the code here for reference/resend. This column is app-managed,
-- not user-submitted.

ALTER TABLE contest_volunteers
  ADD COLUMN IF NOT EXISTS comp_code text REFERENCES contest_comp_codes (code) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_contest_volunteers_comp_code
  ON contest_volunteers (comp_code) WHERE comp_code IS NOT NULL;
