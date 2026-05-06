-- ============================================================
-- Migration 011: Harden profile update security
-- ============================================================

-- Browser-authenticated updates may only change safe profile fields.
-- Service-role server paths (signup/admin APIs) bypass this guard so they can
-- continue to manage auth-driving columns intentionally.
CREATE OR REPLACE FUNCTION prevent_sensitive_user_self_update()
RETURNS trigger AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id OR
     NEW.role IS DISTINCT FROM OLD.role OR
     NEW.status IS DISTINCT FROM OLD.status OR
     NEW.firm_id IS DISTINCT FROM OLD.firm_id OR
     NEW.email IS DISTINCT FROM OLD.email OR
     NEW.membership_agreement_signed IS DISTINCT FROM OLD.membership_agreement_signed OR
     NEW.membership_agreement_signed_at IS DISTINCT FROM OLD.membership_agreement_signed_at OR
     NEW.invited_by IS DISTINCT FROM OLD.invited_by OR
     NEW.invitation_token IS DISTINCT FROM OLD.invitation_token OR
     NEW.created_at IS DISTINCT FROM OLD.created_at OR
     NEW.updated_at IS DISTINCT FROM OLD.updated_at THEN
    RAISE EXCEPTION 'Authenticated users cannot update sensitive profile fields'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS aa_prevent_sensitive_user_self_update ON users;
CREATE TRIGGER aa_prevent_sensitive_user_self_update
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION prevent_sensitive_user_self_update();

DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Helper for policies that need approved-role checks.
CREATE OR REPLACE FUNCTION current_user_is_approved(required_role text DEFAULT NULL)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM users
    WHERE id = auth.uid()
      AND status = 'approved'
      AND (required_role IS NULL OR role = required_role)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Override the role-only helper from earlier migrations so every remaining
-- admin RLS policy that references is_admin() also requires approved status.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM users
    WHERE id = auth.uid()
      AND role = 'admin'
      AND status = 'approved'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- buyer_projects: owners/firm buyers must also be approved buyers.
DROP POLICY IF EXISTS "Buyers can manage their own projects" ON buyer_projects;
DROP POLICY IF EXISTS "Buyer firm members can see firm projects" ON buyer_projects;
DROP POLICY IF EXISTS "Admins can see all buyer projects" ON buyer_projects;

CREATE POLICY "Approved buyers can read their own projects"
  ON buyer_projects FOR SELECT
  USING (buyer_user_id = auth.uid() AND current_user_is_approved('buyer'));

CREATE POLICY "Approved buyer firm members can read firm projects"
  ON buyer_projects FOR SELECT
  USING (buyer_firm_id = get_user_firm_id() AND current_user_is_approved('buyer'));

CREATE POLICY "Approved buyers can create their own projects"
  ON buyer_projects FOR INSERT
  WITH CHECK (buyer_user_id = auth.uid() AND current_user_is_approved('buyer'));

CREATE POLICY "Approved buyers can update their own projects"
  ON buyer_projects FOR UPDATE
  USING (buyer_user_id = auth.uid() AND current_user_is_approved('buyer'))
  WITH CHECK (buyer_user_id = auth.uid() AND current_user_is_approved('buyer'));

CREATE POLICY "Approved buyers can delete their own projects"
  ON buyer_projects FOR DELETE
  USING (buyer_user_id = auth.uid() AND current_user_is_approved('buyer'));

CREATE POLICY "Admins can see all buyer projects"
  ON buyer_projects FOR SELECT
  USING (is_admin());

-- firms: require approved status for browser-authenticated admin/member updates.
DROP POLICY IF EXISTS "Admins can do everything on firms" ON firms;
DROP POLICY IF EXISTS "Firm members can update their own firm" ON firms;
DROP POLICY IF EXISTS "Approved firm members can update their own firm" ON firms;

CREATE POLICY "Admins can do everything on firms"
  ON firms FOR ALL
  USING (current_user_is_approved('admin'))
  WITH CHECK (current_user_is_approved('admin'));

CREATE POLICY "Approved firm members can update their own firm"
  ON firms FOR UPDATE
  USING (
    id = get_user_firm_id()
    AND current_user_is_approved()
    AND get_user_role() IN ('broker', 'buyer', 'admin')
  )
  WITH CHECK (
    id = get_user_firm_id()
    AND current_user_is_approved()
    AND get_user_role() IN ('broker', 'buyer', 'admin')
  );
