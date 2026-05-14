-- Add buyer accreditation to users profile data.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS accreditation text;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_accreditation_check;

ALTER TABLE users
  ADD CONSTRAINT users_accreditation_check
  CHECK (accreditation IN ('income', 'net_worth', 'entity', 'professional', 'none'));
