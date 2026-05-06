-- ============================================================
-- Migration 010: Fix buyer_type CHECK constraint drift
-- ============================================================

-- Preserve existing individual investor profiles under the canonical
-- private_investor value before tightening the CHECK constraint.
DO $$
DECLARE
  unexpected_buyer_types text;
BEGIN
  SELECT string_agg(DISTINCT buyer_type, ', ' ORDER BY buyer_type)
  INTO unexpected_buyer_types
  FROM users
  WHERE buyer_type IS NOT NULL
    AND buyer_type NOT IN (
      'family_office',
      'pe',
      'vc',
      'search_fund',
      'independent_sponsor',
      'holding_company',
      'ma_advisor',
      'private_investor',
      'individual_investor',
      'other'
    );

  IF unexpected_buyer_types IS NOT NULL THEN
    RAISE EXCEPTION 'Unexpected users.buyer_type values found before CHECK replacement: %', unexpected_buyer_types;
  END IF;
END $$;

UPDATE users
SET buyer_type = 'private_investor'
WHERE buyer_type = 'individual_investor';

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_buyer_type_check;

ALTER TABLE users
  ADD CONSTRAINT users_buyer_type_check
  CHECK (buyer_type IN (
    'family_office',
    'pe',
    'vc',
    'search_fund',
    'independent_sponsor',
    'holding_company',
    'ma_advisor',
    'private_investor',
    'other'
  ));
