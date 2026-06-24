-- ============================================================
-- Migration 030: Ignore inactive buyer projects in matching function
-- and harden SECURITY DEFINER search_path/schema references
-- ============================================================

CREATE OR REPLACE FUNCTION public.match_deals_to_project(p_project_id uuid)
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
  v_is_active boolean;
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
    bp.keywords,
    bp.is_active
  INTO
    v_industry,
    v_revenue_min,
    v_revenue_max,
    v_ebitda_min,
    v_ebitda_max,
    v_ebitda_margin,
    v_location,
    v_keywords,
    v_is_active
  FROM public.buyer_projects bp
  WHERE bp.id = p_project_id;

  IF v_is_active IS DISTINCT FROM true THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT d.id
  FROM public.deals d
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public, pg_temp;
