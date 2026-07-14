-- ============================================================
-- Migration 029: Add deal_views table and increment_deal_view_count function
-- ============================================================

-- Create deal_views table
CREATE TABLE IF NOT EXISTS deal_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT deal_views_unique_deal_user UNIQUE (deal_id, user_id)
);

-- Enable RLS
ALTER TABLE deal_views ENABLE ROW LEVEL SECURITY;

-- Clean up existing policies if any
DROP POLICY IF EXISTS "Users can see their own views" ON deal_views;
DROP POLICY IF EXISTS "Broker firm members can see views on their deals" ON deal_views;
DROP POLICY IF EXISTS "Admins can see all views" ON deal_views;

-- Enable SELECT policies
CREATE POLICY "Users can see their own views" ON deal_views FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Broker firm members can see views on their deals" ON deal_views FOR SELECT
  USING (
    current_user_is_approved('broker')
    AND EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_views.deal_id
        AND deals.firm_id = get_user_firm_id()
    )
  );

CREATE POLICY "Admins can see all views" ON deal_views FOR SELECT
  USING (is_admin());

-- Recreate increment_deal_view_count function with single-increment per buyer logic
CREATE OR REPLACE FUNCTION increment_deal_view_count(p_deal_id uuid)
RETURNS void AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  -- Only proceed if the user is authenticated, approved, and a buyer, and the deal is not draft
  IF v_user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM deals d
    WHERE d.id = p_deal_id
      AND d.status != 'draft'
      AND EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = v_user_id
          AND u.role = 'buyer'
          AND u.status = 'approved'
      )
  ) THEN
    -- Try to record the view. If it already exists (on conflict), this will do nothing.
    INSERT INTO deal_views (deal_id, user_id)
    VALUES (p_deal_id, v_user_id)
    ON CONFLICT (deal_id, user_id) DO NOTHING;

    -- If a new row was actually inserted, we update the view_count on the deal
    IF FOUND THEN
      UPDATE deals
      SET view_count = view_count + 1
      WHERE id = p_deal_id;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Revoke execute from public/anon and grant only to authenticated users
REVOKE ALL ON FUNCTION increment_deal_view_count(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION increment_deal_view_count(uuid) TO authenticated;
