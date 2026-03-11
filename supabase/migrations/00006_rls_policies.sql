-- ============================================================
-- Migration 006: Row Level Security policies for all tables
-- ============================================================

-- Helper: get current user's role from users table
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: get current user's firm_id
CREATE OR REPLACE FUNCTION get_user_firm_id()
RETURNS uuid AS $$
  SELECT firm_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ========================
-- FIRMS
-- ========================
ALTER TABLE firms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on firms"
  ON firms FOR ALL
  USING (is_admin());

CREATE POLICY "Firm members can view their own firm"
  ON firms FOR SELECT
  USING (id = get_user_firm_id());

CREATE POLICY "Firm members can update their own firm"
  ON firms FOR UPDATE
  USING (id = get_user_firm_id());

-- ========================
-- USERS
-- ========================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can read profiles of deal counterparties"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM deal_engagements de
      JOIN deals d ON d.id = de.deal_id
      WHERE (
        -- Current user is a buyer on the engagement and reading the broker POC
        (de.buyer_user_id = auth.uid() AND users.id = d.point_of_contact_id)
        OR
        -- Current user is the broker POC and reading the buyer
        (d.point_of_contact_id = auth.uid() AND users.id = de.buyer_user_id)
        OR
        -- Current user is a broker firm member and reading the buyer
        (d.firm_id = get_user_firm_id() AND users.id = de.buyer_user_id)
      )
    )
  );

CREATE POLICY "Admins can read all users"
  ON users FOR SELECT
  USING (is_admin());

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Admins can update any user"
  ON users FOR UPDATE
  USING (is_admin());

CREATE POLICY "Service role can insert users"
  ON users FOR INSERT
  WITH CHECK (true);

-- ========================
-- BUYER_DOCUMENTS
-- ========================
ALTER TABLE buyer_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage their documents"
  ON buyer_documents FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Brokers reviewing buyer profiles can view documents"
  ON buyer_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM deal_engagements de
      JOIN deals d ON d.id = de.deal_id
      WHERE de.buyer_user_id = buyer_documents.user_id
      AND d.firm_id = get_user_firm_id()
    )
  );

CREATE POLICY "Admins can view all buyer documents"
  ON buyer_documents FOR SELECT
  USING (is_admin());

-- ========================
-- DEALS
-- ========================
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Broker firm members can see their own deals"
  ON deals FOR SELECT
  USING (firm_id = get_user_firm_id());

CREATE POLICY "Approved buyers can see non-draft deals"
  ON deals FOR SELECT
  USING (
    status != 'draft'
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'buyer' AND status = 'approved')
  );

CREATE POLICY "Admins can see all deals"
  ON deals FOR SELECT
  USING (is_admin());

CREATE POLICY "Approved brokers can create deals"
  ON deals FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'broker' AND status = 'approved')
  );

CREATE POLICY "Broker firm members can update their own deals"
  ON deals FOR UPDATE
  USING (firm_id = get_user_firm_id());

CREATE POLICY "Admins can update any deal"
  ON deals FOR UPDATE
  USING (is_admin());

-- ========================
-- DEAL_DOCUMENTS
-- ========================
ALTER TABLE deal_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Broker firm members can manage documents on their deals"
  ON deal_documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM deals WHERE deals.id = deal_documents.deal_id AND deals.firm_id = get_user_firm_id()
    )
  );

CREATE POLICY "Buyers with appropriate access can view deal documents"
  ON deal_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM deal_engagements de
      WHERE de.deal_id = deal_documents.deal_id
      AND de.buyer_user_id = auth.uid()
      AND (
        deal_documents.access_level = 'pre_nda'
        OR (deal_documents.access_level = 'post_nda' AND de.nda_status = 'signed')
      )
    )
  );

CREATE POLICY "Admins can view all deal documents"
  ON deal_documents FOR SELECT
  USING (is_admin());

-- ========================
-- DEAL_ENGAGEMENTS
-- ========================
ALTER TABLE deal_engagements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can see their own engagements"
  ON deal_engagements FOR SELECT
  USING (buyer_user_id = auth.uid());

CREATE POLICY "Broker firm members can see engagements on their deals"
  ON deal_engagements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM deals WHERE deals.id = deal_engagements.deal_id AND deals.firm_id = get_user_firm_id()
    )
  );

CREATE POLICY "Admins can see all engagements"
  ON deal_engagements FOR SELECT
  USING (is_admin());

CREATE POLICY "Buyers can insert engagements"
  ON deal_engagements FOR INSERT
  WITH CHECK (buyer_user_id = auth.uid());

CREATE POLICY "Buyers can update their own engagements"
  ON deal_engagements FOR UPDATE
  USING (buyer_user_id = auth.uid());

CREATE POLICY "Broker firm members can update engagements on their deals"
  ON deal_engagements FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM deals WHERE deals.id = deal_engagements.deal_id AND deals.firm_id = get_user_firm_id()
    )
  );

CREATE POLICY "Admins can update any engagement"
  ON deal_engagements FOR UPDATE
  USING (is_admin());

-- ========================
-- IOIS
-- ========================
ALTER TABLE iois ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can see their own IOIs"
  ON iois FOR SELECT
  USING (buyer_user_id = auth.uid());

CREATE POLICY "Broker firm members can see IOIs on their deals"
  ON iois FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM deals WHERE deals.id = iois.deal_id AND deals.firm_id = get_user_firm_id()
    )
  );

CREATE POLICY "Admins can see all IOIs"
  ON iois FOR SELECT
  USING (is_admin());

CREATE POLICY "Buyers can submit IOIs"
  ON iois FOR INSERT
  WITH CHECK (buyer_user_id = auth.uid());

-- ========================
-- LOIS
-- ========================
ALTER TABLE lois ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can see their own LOIs"
  ON lois FOR SELECT
  USING (buyer_user_id = auth.uid());

CREATE POLICY "Broker firm members can see LOIs on their deals"
  ON lois FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM deals WHERE deals.id = lois.deal_id AND deals.firm_id = get_user_firm_id()
    )
  );

CREATE POLICY "Admins can see all LOIs"
  ON lois FOR SELECT
  USING (is_admin());

CREATE POLICY "Buyers can submit LOIs"
  ON lois FOR INSERT
  WITH CHECK (buyer_user_id = auth.uid());

-- ========================
-- DEAL_CLOSURES
-- ========================
ALTER TABLE deal_closures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Involved buyer can see deal closure"
  ON deal_closures FOR SELECT
  USING (buyer_user_id = auth.uid());

CREATE POLICY "Involved broker firm can see deal closure"
  ON deal_closures FOR SELECT
  USING (broker_firm_id = get_user_firm_id());

CREATE POLICY "Admins can see all deal closures"
  ON deal_closures FOR SELECT
  USING (is_admin());

CREATE POLICY "Buyers can insert deal closure"
  ON deal_closures FOR INSERT
  WITH CHECK (buyer_user_id = auth.uid());

CREATE POLICY "Broker firm can update deal closure for confirmation"
  ON deal_closures FOR UPDATE
  USING (broker_firm_id = get_user_firm_id());

CREATE POLICY "Admins can update any deal closure"
  ON deal_closures FOR UPDATE
  USING (is_admin());

-- ========================
-- BUYER_PROJECTS
-- ========================
ALTER TABLE buyer_projects ENABLE ROW LEVEL SECURITY;

-- Brokers CANNOT see buyer projects — only buyer-role policies here
CREATE POLICY "Buyers can manage their own projects"
  ON buyer_projects FOR ALL
  USING (buyer_user_id = auth.uid());

CREATE POLICY "Buyer firm members can see firm projects"
  ON buyer_projects FOR SELECT
  USING (
    buyer_firm_id = get_user_firm_id()
    AND get_user_role() = 'buyer'
  );

CREATE POLICY "Admins can see all buyer projects"
  ON buyer_projects FOR SELECT
  USING (is_admin());

-- ========================
-- MESSAGES
-- ========================
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Message participants can see messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM deal_engagements de
      JOIN deals d ON d.id = de.deal_id
      WHERE de.id = messages.engagement_id
      AND (
        de.buyer_user_id = auth.uid()
        OR d.point_of_contact_id = auth.uid()
      )
    )
  );

CREATE POLICY "Message participants can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM deal_engagements de
      JOIN deals d ON d.id = de.deal_id
      WHERE de.id = messages.engagement_id
      AND (
        de.buyer_user_id = auth.uid()
        OR d.point_of_contact_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can see all messages"
  ON messages FOR SELECT
  USING (is_admin());

-- ========================
-- DEAL_ACTIVITY_LOG
-- ========================
ALTER TABLE deal_activity_log ENABLE ROW LEVEL SECURITY;

-- Buyers CANNOT see the deal activity log
CREATE POLICY "Broker firm members can see activity log for their deals"
  ON deal_activity_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM deals WHERE deals.id = deal_activity_log.deal_id AND deals.firm_id = get_user_firm_id()
    )
    AND get_user_role() = 'broker'
  );

CREATE POLICY "Admins can see all activity logs"
  ON deal_activity_log FOR SELECT
  USING (is_admin());

CREATE POLICY "Activity log inserts via service role or triggers"
  ON deal_activity_log FOR INSERT
  WITH CHECK (true);

-- ========================
-- NOTIFICATION_PREFERENCES
-- ========================
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own notification preferences"
  ON notification_preferences FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Admins can see all notification preferences"
  ON notification_preferences FOR SELECT
  USING (is_admin());
