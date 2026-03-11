-- ============================================================
-- Fix: Users table RLS infinite recursion
-- ============================================================
-- Problem: The "Users can read profiles of deal counterparties" policy
-- calls get_user_firm_id() which queries the users table, triggering
-- RLS evaluation again → infinite recursion.
-- Similarly, "Admins can read all users" calls is_admin() which
-- queries users → recursion.
--
-- Solution: Replace the problematic SELECT policies with a single
-- SECURITY DEFINER function that checks all read conditions
-- without going through RLS.
-- ============================================================

-- Step 1: Drop ALL existing SELECT policies on users table
DROP POLICY IF EXISTS "Users can read their own profile" ON users;
DROP POLICY IF EXISTS "Users can read profiles of deal counterparties" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;

-- Step 2: Create a SECURITY DEFINER function that checks if the
-- requesting user can view a given user row.
-- This runs as the function owner (bypasses RLS) so it won't recurse.
CREATE OR REPLACE FUNCTION can_read_user_profile(target_user_id uuid)
RETURNS boolean AS $$
DECLARE
  requesting_uid uuid := auth.uid();
  requesting_role text;
  requesting_firm_id uuid;
BEGIN
  -- Always allow reading own profile
  IF target_user_id = requesting_uid THEN
    RETURN true;
  END IF;

  -- Get the requesting user's role and firm (direct query, no RLS)
  SELECT role, firm_id INTO requesting_role, requesting_firm_id
  FROM users
  WHERE id = requesting_uid;

  -- Admins can read all users
  IF requesting_role = 'admin' THEN
    RETURN true;
  END IF;

  -- Check if target user is a counterparty via deal_engagements
  -- (buyer can see broker's point_of_contact, broker can see buyer)
  RETURN EXISTS (
    SELECT 1 FROM deal_engagements de
    JOIN deals d ON d.id = de.deal_id
    WHERE (
      -- Current user is a buyer who has an engagement, target is the deal's point of contact
      (de.buyer_user_id = requesting_uid AND target_user_id = d.point_of_contact_id)
      -- Current user is the deal's point of contact, target is a buyer with an engagement
      OR (d.point_of_contact_id = requesting_uid AND target_user_id = de.buyer_user_id)
      -- Current user is in the broker's firm, target is a buyer with an engagement
      OR (d.firm_id = requesting_firm_id AND target_user_id = de.buyer_user_id)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Step 3: Create a single SELECT policy that uses the function
CREATE POLICY "Users can read permitted profiles" ON users
  FOR SELECT
  USING (can_read_user_profile(id));

-- ============================================================
-- Verify: The UPDATE and INSERT policies do NOT cause recursion
-- because they use auth.uid() directly or simple checks.
-- "Users can update their own profile" → USING (id = auth.uid()) ✓
-- "Admins can update any user" → USING (is_admin()) — this DOES
-- call is_admin() which queries users. But is_admin() is SECURITY
-- DEFINER, so it bypasses RLS. ✓
-- "Service role can insert users" → WITH CHECK (true) ✓
-- ============================================================
