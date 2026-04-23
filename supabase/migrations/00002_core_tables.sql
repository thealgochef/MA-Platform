-- ============================================================
-- Migration 002: Core tables — firms, users, buyer_documents
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
  buyer_type text CHECK (buyer_type IN ('family_office', 'pe', 'vc', 'search_fund', 'independent_sponsor', 'holding_company', 'ma_advisor', 'individual_investor', 'other')),
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
