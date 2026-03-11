-- ============================================================
-- Fix: firms table missing INSERT policy for signup
-- ============================================================
-- Problem: The firms table has RLS enabled but only admins can
-- insert. During broker/buyer signup, the user needs to create
-- a firm row, but RLS blocks the insert silently.
--
-- Solution: Add an INSERT policy allowing any authenticated user
-- to create a firm. The signup flow creates the firm first, then
-- links it to the user via firm_id.
-- ============================================================

-- Allow authenticated users to insert a firm (needed during signup)
CREATE POLICY "Authenticated users can create a firm" ON firms
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Also allow users to SELECT the firm they just created
-- (needed immediately after insert to get the firm.id back)
-- The existing "Firm members can view their own firm" policy
-- won't work because the user's firm_id hasn't been set yet.
-- We need a policy that allows reading a firm if the user just created it.
-- Since we can't easily track "just created", allow users to read
-- any firm they're a member of OR any firm (the data isn't sensitive).
-- Actually, firm names/websites aren't confidential — but let's keep
-- it scoped. The .select() after .insert() runs in the same
-- transaction context, so the INSERT policy covers the returned row.
