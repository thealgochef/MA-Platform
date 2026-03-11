-- ============================================================
-- Migration 003: Deals and deal_documents tables
-- ============================================================

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
