-- ============================================================
-- GENEVA HOLDINGS v1 → v2 MIGRATION
-- Run this in Supabase SQL Editor (single execution)
-- ============================================================
-- This script:
--   1. Drops all v1 objects (triggers, realtime, storage, tables, functions)
--   2. Creates the full v2 schema (tables, triggers, RLS, storage, functions)
-- ============================================================

-- ============================================================
-- PHASE 1: DROP ALL v1 OBJECTS
-- ============================================================

-- 1a. Drop trigger on auth.users (must happen before dropping the function)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 1b. Remove v1 messages from realtime publication (ignore error if not present)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE messages;
EXCEPTION WHEN OTHERS THEN
  -- Publication might not include messages, that's fine
  NULL;
END $$;

-- 1c. Drop ALL existing policies on storage.objects (v1 policies)
-- We use DO block because policy names may or may not exist
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- 1d. Drop v1 storage buckets (can't DELETE from storage.objects directly — Supabase protects it)
-- The v1 bucket 'listing-documents' will remain as an empty orphan (harmless).
-- The v1 bucket 'message-attachments' is reused by v2 (ON CONFLICT DO NOTHING handles it).

-- 1e. Drop v1 tables (reverse FK dependency order)
DROP TABLE IF EXISTS match_views CASCADE;
DROP TABLE IF EXISTS notification_preferences CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS connections CASCADE;
DROP TABLE IF EXISTS interest_requests CASCADE;
DROP TABLE IF EXISTS buyer_criteria CASCADE;
DROP TABLE IF EXISTS listing_documents CASCADE;
DROP TABLE IF EXISTS listings CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 1f. Drop v1 functions
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS check_listing_limit() CASCADE;
DROP FUNCTION IF EXISTS check_criteria_limit() CASCADE;
DROP FUNCTION IF EXISTS update_listings_search_vector() CASCADE;
DROP FUNCTION IF EXISTS update_criteria_search_vector() CASCADE;

-- ============================================================
-- PHASE 2: CREATE v2 FUNCTIONS AND TRIGGERS
-- ============================================================

-- Function: update_updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: handle_new_user (v2 — inserts into public.users, NOT profiles)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'buyer'),
    'pending'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: log_deal_activity
CREATE OR REPLACE FUNCTION log_deal_activity(
  p_deal_id uuid,
  p_actor_id uuid,
  p_action text,
  p_engagement_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO deal_activity_log (deal_id, engagement_id, actor_id, action, metadata)
  VALUES (p_deal_id, p_engagement_id, p_actor_id, p_action, p_metadata)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- PHASE 3: CREATE v2 TABLES
-- ============================================================

-- Table: firms
CREATE TABLE firms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  website text,
  description text,
  location text,
  industry_focus text[] DEFAULT '{}',
  firm_type text NOT NULL CHECK (firm_type IN ('broker', 'buyer')),
  team_members_requested text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER firms_updated_at
  BEFORE UPDATE ON firms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Table: users
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  firm_id uuid REFERENCES firms(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('broker', 'buyer', 'admin')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended', 'banned')),
  title text,
  phone text,
  linkedin text,
  location text,
  buyer_type text CHECK (buyer_type IN ('pe', 'independent_sponsor', 'family_office', 'search_fund', 'private_investor', 'other')),
  accreditation text CHECK (accreditation IN ('income', 'net_worth', 'entity', 'professional', 'none')),
  aum text,
  license_credentials text,
  deal_types text,
  industry_focus text[] DEFAULT '{}',
  membership_agreement_signed boolean NOT NULL DEFAULT false,
  membership_agreement_signed_at timestamptz,
  invited_by uuid REFERENCES users(id) ON DELETE SET NULL,
  invitation_token text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Table: buyer_documents
CREATE TABLE buyer_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table: deals
CREATE TABLE deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES users(id),
  point_of_contact_id uuid NOT NULL REFERENCES users(id),
  project_name text NOT NULL,
  headline text NOT NULL,
  description text NOT NULL,
  geography_display text NOT NULL CHECK (geography_display IN ('state', 'region')),
  state text,
  region text,
  industry text NOT NULL,
  revenue_year_1 numeric,
  ebitda_year_1 numeric,
  revenue_year_2 numeric,
  ebitda_year_2 numeric,
  revenue_year_3 numeric,
  ebitda_year_3 numeric,
  revenue_projection numeric,
  ebitda_projection numeric,
  fiscal_year_labels jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'accepting_iois', 'accepting_lois', 'under_loi', 'paused', 'closed', 'terminated')),
  ioi_due_date date,
  loi_due_date date,
  nda_type text NOT NULL DEFAULT 'platform' CHECK (nda_type IN ('platform', 'custom')),
  nda_document_path text,
  cim_document_path text,
  cim_sharing_preference text NOT NULL DEFAULT 'auto' CHECK (cim_sharing_preference IN ('auto', 'manual')),
  nda_vetting_preference text NOT NULL DEFAULT 'auto' CHECK (nda_vetting_preference IN ('auto', 'manual')),
  teaser_document_path text,
  is_featured boolean NOT NULL DEFAULT false,
  view_count integer NOT NULL DEFAULT 0,
  published_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Table: deal_documents
CREATE TABLE deal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES users(id),
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  access_level text NOT NULL DEFAULT 'post_nda' CHECK (access_level IN ('pre_nda', 'post_nda')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table: deal_engagements
CREATE TABLE deal_engagements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  buyer_user_id uuid NOT NULL REFERENCES users(id),
  buyer_firm_id uuid NOT NULL REFERENCES firms(id),
  stage text NOT NULL DEFAULT 'pursued' CHECK (stage IN ('pursued', 'nda_pending', 'nda_signed', 'reviewing', 'ioi_submitted', 'loi_submitted', 'diligence', 'closed', 'passed', 'declined', 'terminated')),
  nda_status text NOT NULL DEFAULT 'not_sent' CHECK (nda_status IN ('not_sent', 'pending_review', 'sent', 'signed', 'declined', 'rejected')),
  nda_signed_at timestamptz,
  nda_document_path text,
  cim_released boolean NOT NULL DEFAULT false,
  cim_released_at timestamptz,
  cim_viewed_at timestamptz,
  cim_downloaded_at timestamptz,
  pass_reason text,
  pass_reason_detail text,
  declined_at timestamptz,
  vetting_status text DEFAULT 'not_required' CHECK (vetting_status IN ('not_required', 'pending', 'approved', 'rejected')),
  vetting_rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(deal_id, buyer_user_id)
);

CREATE TRIGGER deal_engagements_updated_at
  BEFORE UPDATE ON deal_engagements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Table: iois
CREATE TABLE iois (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  engagement_id uuid NOT NULL REFERENCES deal_engagements(id) ON DELETE CASCADE,
  buyer_user_id uuid NOT NULL REFERENCES users(id),
  buyer_firm_id uuid NOT NULL REFERENCES firms(id),
  offer_price numeric NOT NULL,
  multiple numeric NOT NULL,
  earnout text NOT NULL,
  rollover text NOT NULL,
  cash_at_close numeric NOT NULL,
  time_to_close text NOT NULL,
  is_platform boolean NOT NULL,
  is_addon boolean NOT NULL,
  addon_platform_url text,
  escrow text,
  working_capital_peg text,
  special_considerations text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table: lois
CREATE TABLE lois (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  engagement_id uuid NOT NULL REFERENCES deal_engagements(id) ON DELETE CASCADE,
  buyer_user_id uuid NOT NULL REFERENCES users(id),
  buyer_firm_id uuid NOT NULL REFERENCES firms(id),
  offer_price numeric NOT NULL,
  multiple numeric NOT NULL,
  escrow text NOT NULL,
  timing text NOT NULL,
  earnout text NOT NULL,
  rollover text NOT NULL,
  working_capital_peg text NOT NULL,
  cash_at_close numeric NOT NULL,
  is_platform boolean NOT NULL,
  is_addon boolean NOT NULL,
  addon_platform_url text,
  special_considerations text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table: deal_closures
CREATE TABLE deal_closures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL UNIQUE REFERENCES deals(id) ON DELETE CASCADE,
  engagement_id uuid NOT NULL REFERENCES deal_engagements(id),
  buyer_user_id uuid NOT NULL REFERENCES users(id),
  buyer_firm_id uuid NOT NULL REFERENCES firms(id),
  broker_firm_id uuid NOT NULL REFERENCES firms(id),
  enterprise_value numeric NOT NULL,
  buyer_confirmed boolean NOT NULL DEFAULT true,
  broker_confirmed boolean NOT NULL DEFAULT false,
  broker_disputed boolean NOT NULL DEFAULT false,
  dispute_documents_path text,
  success_fee numeric,
  broker_incentive numeric,
  closed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table: buyer_projects
CREATE TABLE buyer_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  buyer_firm_id uuid NOT NULL REFERENCES firms(id),
  name text NOT NULL,
  industry text,
  revenue_min numeric,
  revenue_max numeric,
  ebitda_min numeric,
  ebitda_max numeric,
  ebitda_margin numeric,
  location text,
  keywords text[] DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER buyer_projects_updated_at
  BEFORE UPDATE ON buyer_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Table: messages
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  engagement_id uuid NOT NULL REFERENCES deal_engagements(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES users(id),
  content text,
  attachment_path text,
  attachment_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table: deal_activity_log
CREATE TABLE deal_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  engagement_id uuid REFERENCES deal_engagements(id) ON DELETE SET NULL,
  actor_id uuid NOT NULL REFERENCES users(id),
  action text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table: notification_preferences
CREATE TABLE notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  preferences jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- PHASE 4: CREATE auth.users TRIGGER (after users table exists)
-- ============================================================

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- PHASE 5: ROW LEVEL SECURITY
-- ============================================================

-- RLS helper functions
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_firm_id()
RETURNS uuid AS $$
  SELECT firm_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Enable RLS on all tables
ALTER TABLE firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE iois ENABLE ROW LEVEL SECURITY;
ALTER TABLE lois ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- FIRMS policies
CREATE POLICY "Admins can do everything on firms" ON firms FOR ALL USING (is_admin());
CREATE POLICY "Firm members can view their own firm" ON firms FOR SELECT USING (id = get_user_firm_id());
CREATE POLICY "Firm members can update their own firm" ON firms FOR UPDATE USING (id = get_user_firm_id());

-- USERS policies
CREATE POLICY "Users can read their own profile" ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can read profiles of deal counterparties" ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM deal_engagements de
      JOIN deals d ON d.id = de.deal_id
      WHERE (
        (de.buyer_user_id = auth.uid() AND users.id = d.point_of_contact_id)
        OR (d.point_of_contact_id = auth.uid() AND users.id = de.buyer_user_id)
        OR (d.firm_id = get_user_firm_id() AND users.id = de.buyer_user_id)
      )
    )
  );
CREATE POLICY "Admins can read all users" ON users FOR SELECT USING (is_admin());
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Admins can update any user" ON users FOR UPDATE USING (is_admin());
CREATE POLICY "Service role can insert users" ON users FOR INSERT WITH CHECK (true);

-- BUYER_DOCUMENTS policies
CREATE POLICY "Owner can manage their documents" ON buyer_documents FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Brokers reviewing buyer profiles can view documents" ON buyer_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM deal_engagements de
      JOIN deals d ON d.id = de.deal_id
      WHERE de.buyer_user_id = buyer_documents.user_id AND d.firm_id = get_user_firm_id()
    )
  );
CREATE POLICY "Admins can view all buyer documents" ON buyer_documents FOR SELECT USING (is_admin());

-- DEALS policies
CREATE POLICY "Broker firm members can see their own deals" ON deals FOR SELECT USING (firm_id = get_user_firm_id());
CREATE POLICY "Approved buyers can see non-draft deals" ON deals FOR SELECT
  USING (
    status != 'draft'
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'buyer' AND status = 'approved')
  );
CREATE POLICY "Admins can see all deals" ON deals FOR SELECT USING (is_admin());
CREATE POLICY "Approved brokers can create deals" ON deals FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'broker' AND status = 'approved'));
CREATE POLICY "Broker firm members can update their own deals" ON deals FOR UPDATE USING (firm_id = get_user_firm_id());
CREATE POLICY "Admins can update any deal" ON deals FOR UPDATE USING (is_admin());

-- DEAL_DOCUMENTS policies
CREATE POLICY "Broker firm members can manage documents on their deals" ON deal_documents FOR ALL
  USING (EXISTS (SELECT 1 FROM deals WHERE deals.id = deal_documents.deal_id AND deals.firm_id = get_user_firm_id()));
CREATE POLICY "Buyers with appropriate access can view deal documents" ON deal_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM deal_engagements de
      WHERE de.deal_id = deal_documents.deal_id AND de.buyer_user_id = auth.uid()
      AND (deal_documents.access_level = 'pre_nda' OR (deal_documents.access_level = 'post_nda' AND de.nda_status = 'signed'))
    )
  );
CREATE POLICY "Admins can view all deal documents" ON deal_documents FOR SELECT USING (is_admin());

-- DEAL_ENGAGEMENTS policies
CREATE POLICY "Buyers can see their own engagements" ON deal_engagements FOR SELECT USING (buyer_user_id = auth.uid());
CREATE POLICY "Broker firm members can see engagements on their deals" ON deal_engagements FOR SELECT
  USING (EXISTS (SELECT 1 FROM deals WHERE deals.id = deal_engagements.deal_id AND deals.firm_id = get_user_firm_id()));
CREATE POLICY "Admins can see all engagements" ON deal_engagements FOR SELECT USING (is_admin());
CREATE POLICY "Buyers can insert engagements" ON deal_engagements FOR INSERT WITH CHECK (buyer_user_id = auth.uid());
CREATE POLICY "Buyers can update their own engagements" ON deal_engagements FOR UPDATE USING (buyer_user_id = auth.uid());
CREATE POLICY "Broker firm members can update engagements on their deals" ON deal_engagements FOR UPDATE
  USING (EXISTS (SELECT 1 FROM deals WHERE deals.id = deal_engagements.deal_id AND deals.firm_id = get_user_firm_id()));
CREATE POLICY "Admins can update any engagement" ON deal_engagements FOR UPDATE USING (is_admin());

-- IOIS policies
CREATE POLICY "Buyers can see their own IOIs" ON iois FOR SELECT USING (buyer_user_id = auth.uid());
CREATE POLICY "Broker firm members can see IOIs on their deals" ON iois FOR SELECT
  USING (EXISTS (SELECT 1 FROM deals WHERE deals.id = iois.deal_id AND deals.firm_id = get_user_firm_id()));
CREATE POLICY "Admins can see all IOIs" ON iois FOR SELECT USING (is_admin());
CREATE POLICY "Buyers can submit IOIs" ON iois FOR INSERT WITH CHECK (buyer_user_id = auth.uid());

-- LOIS policies
CREATE POLICY "Buyers can see their own LOIs" ON lois FOR SELECT USING (buyer_user_id = auth.uid());
CREATE POLICY "Broker firm members can see LOIs on their deals" ON lois FOR SELECT
  USING (EXISTS (SELECT 1 FROM deals WHERE deals.id = lois.deal_id AND deals.firm_id = get_user_firm_id()));
CREATE POLICY "Admins can see all LOIs" ON lois FOR SELECT USING (is_admin());
CREATE POLICY "Buyers can submit LOIs" ON lois FOR INSERT WITH CHECK (buyer_user_id = auth.uid());

-- DEAL_CLOSURES policies
CREATE POLICY "Involved buyer can see deal closure" ON deal_closures FOR SELECT USING (buyer_user_id = auth.uid());
CREATE POLICY "Involved broker firm can see deal closure" ON deal_closures FOR SELECT USING (broker_firm_id = get_user_firm_id());
CREATE POLICY "Admins can see all deal closures" ON deal_closures FOR SELECT USING (is_admin());
CREATE POLICY "Buyers can insert deal closure" ON deal_closures FOR INSERT WITH CHECK (buyer_user_id = auth.uid());
CREATE POLICY "Broker firm can update deal closure for confirmation" ON deal_closures FOR UPDATE USING (broker_firm_id = get_user_firm_id());
CREATE POLICY "Admins can update any deal closure" ON deal_closures FOR UPDATE USING (is_admin());

-- BUYER_PROJECTS policies
CREATE POLICY "Buyers can manage their own projects" ON buyer_projects FOR ALL USING (buyer_user_id = auth.uid());
CREATE POLICY "Buyer firm members can see firm projects" ON buyer_projects FOR SELECT
  USING (buyer_firm_id = get_user_firm_id() AND get_user_role() = 'buyer');
CREATE POLICY "Admins can see all buyer projects" ON buyer_projects FOR SELECT USING (is_admin());

-- MESSAGES policies
CREATE POLICY "Message participants can see messages" ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM deal_engagements de JOIN deals d ON d.id = de.deal_id
      WHERE de.id = messages.engagement_id
      AND (de.buyer_user_id = auth.uid() OR d.point_of_contact_id = auth.uid())
    )
  );
CREATE POLICY "Message participants can send messages" ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM deal_engagements de JOIN deals d ON d.id = de.deal_id
      WHERE de.id = messages.engagement_id
      AND (de.buyer_user_id = auth.uid() OR d.point_of_contact_id = auth.uid())
    )
  );
CREATE POLICY "Admins can see all messages" ON messages FOR SELECT USING (is_admin());

-- DEAL_ACTIVITY_LOG policies
CREATE POLICY "Broker firm members can see activity log for their deals" ON deal_activity_log FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM deals WHERE deals.id = deal_activity_log.deal_id AND deals.firm_id = get_user_firm_id())
    AND get_user_role() = 'broker'
  );
CREATE POLICY "Admins can see all activity logs" ON deal_activity_log FOR SELECT USING (is_admin());
CREATE POLICY "Activity log inserts via service role or triggers" ON deal_activity_log FOR INSERT WITH CHECK (true);

-- NOTIFICATION_PREFERENCES policies
CREATE POLICY "Users can manage their own notification preferences" ON notification_preferences FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Admins can see all notification preferences" ON notification_preferences FOR SELECT USING (is_admin());

-- ============================================================
-- PHASE 6: STORAGE BUCKETS AND POLICIES
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('deal-documents', 'deal-documents', false, 52428800, ARRAY['application/pdf']),
  ('message-attachments', 'message-attachments', false, 52428800, ARRAY['application/pdf']),
  ('buyer-documents', 'buyer-documents', false, 52428800, ARRAY['application/pdf']),
  ('signed-ndas', 'signed-ndas', false, 52428800, ARRAY['application/pdf']),
  ('dispute-documents', 'dispute-documents', false, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for deal-documents
CREATE POLICY "Broker firm members can upload deal documents" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'deal-documents' AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'broker' AND status = 'approved'));
CREATE POLICY "Broker firm members can read their deal documents" ON storage.objects FOR SELECT
  USING (bucket_id = 'deal-documents' AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'broker' AND status = 'approved'));
CREATE POLICY "Buyers with access can read deal documents" ON storage.objects FOR SELECT
  USING (bucket_id = 'deal-documents' AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'buyer' AND status = 'approved'));

-- Storage policies for buyer-documents
CREATE POLICY "Buyers can upload their documents" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'buyer-documents' AND auth.uid() IS NOT NULL);
CREATE POLICY "Buyers can read their own documents" ON storage.objects FOR SELECT
  USING (bucket_id = 'buyer-documents' AND auth.uid() IS NOT NULL);

-- Storage policies for message-attachments
CREATE POLICY "Authenticated users can upload message attachments" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'message-attachments' AND auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can read message attachments" ON storage.objects FOR SELECT
  USING (bucket_id = 'message-attachments' AND auth.uid() IS NOT NULL);

-- Storage policies for signed-ndas
CREATE POLICY "Authenticated users can upload signed NDAs" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'signed-ndas' AND auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can read signed NDAs" ON storage.objects FOR SELECT
  USING (bucket_id = 'signed-ndas' AND auth.uid() IS NOT NULL);

-- Storage policies for dispute-documents
CREATE POLICY "Authenticated users can upload dispute documents" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'dispute-documents' AND auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can read dispute documents" ON storage.objects FOR SELECT
  USING (bucket_id = 'dispute-documents' AND auth.uid() IS NOT NULL);

-- ============================================================
-- PHASE 7: DATABASE FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION match_deals_to_project(p_project_id uuid)
RETURNS TABLE (deal_id uuid) AS $$
DECLARE
  v_industry text;
  v_revenue_min numeric;
  v_revenue_max numeric;
  v_ebitda_min numeric;
  v_ebitda_max numeric;
  v_ebitda_margin numeric;
  v_location text;
  v_keywords text[];
BEGIN
  SELECT bp.industry, bp.revenue_min, bp.revenue_max, bp.ebitda_min, bp.ebitda_max,
         bp.ebitda_margin, bp.location, bp.keywords
  INTO v_industry, v_revenue_min, v_revenue_max, v_ebitda_min, v_ebitda_max,
       v_ebitda_margin, v_location, v_keywords
  FROM buyer_projects bp WHERE bp.id = p_project_id;

  RETURN QUERY
  SELECT d.id FROM deals d
  WHERE d.status IN ('accepting_iois', 'accepting_lois', 'under_loi')
    AND (v_industry IS NULL OR d.industry = v_industry)
    AND (v_revenue_min IS NULL OR d.revenue_year_3 >= v_revenue_min)
    AND (v_revenue_max IS NULL OR d.revenue_year_3 <= v_revenue_max)
    AND (v_ebitda_min IS NULL OR d.ebitda_year_3 >= v_ebitda_min)
    AND (v_ebitda_max IS NULL OR d.ebitda_year_3 <= v_ebitda_max)
    AND (v_ebitda_margin IS NULL OR (
      d.revenue_year_3 > 0 AND d.ebitda_year_3 IS NOT NULL
      AND (d.ebitda_year_3 / d.revenue_year_3 * 100) >= v_ebitda_margin
    ))
    AND (v_location IS NULL OR d.state = v_location)
    AND (v_keywords IS NULL OR array_length(v_keywords, 1) IS NULL OR EXISTS (
      SELECT 1 FROM unnest(v_keywords) AS kw
      WHERE d.headline ILIKE '%' || kw || '%' OR d.description ILIKE '%' || kw || '%'
    ));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- PHASE 8: REALTIME
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- ============================================================
-- DONE — v2 schema is fully deployed
-- ============================================================
