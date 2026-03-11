-- ============================================================
-- Migration 007: Storage buckets and database functions
-- ============================================================

-- ========================
-- STORAGE BUCKETS
-- ========================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('deal-documents', 'deal-documents', false, 52428800, ARRAY['application/pdf']),
  ('message-attachments', 'message-attachments', false, 52428800, ARRAY['application/pdf']),
  ('buyer-documents', 'buyer-documents', false, 52428800, ARRAY['application/pdf']),
  ('signed-ndas', 'signed-ndas', false, 52428800, ARRAY['application/pdf']),
  ('dispute-documents', 'dispute-documents', false, 52428800, ARRAY['application/pdf']);

-- Storage policies for deal-documents
CREATE POLICY "Broker firm members can upload deal documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'deal-documents'
    AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'broker' AND status = 'approved'
    )
  );

CREATE POLICY "Broker firm members can read their deal documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'deal-documents'
    AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'broker' AND status = 'approved'
    )
  );

CREATE POLICY "Buyers with access can read deal documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'deal-documents'
    AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'buyer' AND status = 'approved'
    )
  );

-- Storage policies for buyer-documents
CREATE POLICY "Buyers can upload their documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'buyer-documents'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Buyers can read their own documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'buyer-documents'
    AND auth.uid() IS NOT NULL
  );

-- Storage policies for message-attachments
CREATE POLICY "Authenticated users can upload message attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'message-attachments'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Authenticated users can read message attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'message-attachments'
    AND auth.uid() IS NOT NULL
  );

-- Storage policies for signed-ndas
CREATE POLICY "Authenticated users can upload signed NDAs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'signed-ndas'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Authenticated users can read signed NDAs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'signed-ndas'
    AND auth.uid() IS NOT NULL
  );

-- Storage policies for dispute-documents
CREATE POLICY "Authenticated users can upload dispute documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'dispute-documents'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Authenticated users can read dispute documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'dispute-documents'
    AND auth.uid() IS NOT NULL
  );

-- ========================
-- DATABASE FUNCTIONS
-- ========================

-- Function: match_deals_to_project
-- Returns deal IDs matching a project's criteria
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
  -- Get project criteria
  SELECT
    bp.industry,
    bp.revenue_min,
    bp.revenue_max,
    bp.ebitda_min,
    bp.ebitda_max,
    bp.ebitda_margin,
    bp.location,
    bp.keywords
  INTO
    v_industry,
    v_revenue_min,
    v_revenue_max,
    v_ebitda_min,
    v_ebitda_max,
    v_ebitda_margin,
    v_location,
    v_keywords
  FROM buyer_projects bp
  WHERE bp.id = p_project_id;

  RETURN QUERY
  SELECT d.id
  FROM deals d
  WHERE d.status IN ('accepting_iois', 'accepting_lois', 'under_loi')
    -- Industry filter
    AND (v_industry IS NULL OR d.industry = v_industry)
    -- Revenue range filter
    AND (v_revenue_min IS NULL OR d.revenue_year_3 >= v_revenue_min)
    AND (v_revenue_max IS NULL OR d.revenue_year_3 <= v_revenue_max)
    -- EBITDA range filter
    AND (v_ebitda_min IS NULL OR d.ebitda_year_3 >= v_ebitda_min)
    AND (v_ebitda_max IS NULL OR d.ebitda_year_3 <= v_ebitda_max)
    -- EBITDA margin filter
    AND (v_ebitda_margin IS NULL OR (
      d.revenue_year_3 > 0 AND d.ebitda_year_3 IS NOT NULL
      AND (d.ebitda_year_3 / d.revenue_year_3 * 100) >= v_ebitda_margin
    ))
    -- Location filter
    AND (v_location IS NULL OR d.state = v_location)
    -- Keywords filter (full-text search on headline + description)
    AND (v_keywords IS NULL OR array_length(v_keywords, 1) IS NULL OR EXISTS (
      SELECT 1 FROM unnest(v_keywords) AS kw
      WHERE d.headline ILIKE '%' || kw || '%'
         OR d.description ILIKE '%' || kw || '%'
    ));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
