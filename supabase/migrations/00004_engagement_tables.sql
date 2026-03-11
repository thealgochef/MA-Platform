-- ============================================================
-- Migration 004: deal_engagements, iois, lois, deal_closures
-- ============================================================

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

-- Table: iois (Indications of Interest)
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

-- Table: lois (Letters of Intent)
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
