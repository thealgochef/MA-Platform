-- Atomically close a deal and its winning engagement so partial close state cannot persist.

CREATE OR REPLACE FUNCTION close_deal_with_winning_engagement(
  p_deal_id uuid,
  p_engagement_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_engagement_id uuid;
BEGIN
  IF p_deal_id IS NULL OR p_engagement_id IS NULL THEN
    RAISE EXCEPTION 'deal_id and engagement_id are required'
      USING ERRCODE = '22023';
  END IF;

  PERFORM 1
  FROM deals
  WHERE id = p_deal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deal not found'
      USING ERRCODE = '22023';
  END IF;

  UPDATE deal_engagements
  SET stage = 'closed'
  WHERE id = p_engagement_id
    AND deal_id = p_deal_id
    AND stage IN ('loi_submitted', 'diligence', 'closed')
  RETURNING id INTO v_updated_engagement_id;

  IF v_updated_engagement_id IS NULL THEN
    RAISE EXCEPTION 'Winning engagement is not eligible to close this deal'
      USING ERRCODE = '22023';
  END IF;

  UPDATE deals
  SET status = 'closed',
      closed_at = now()
  WHERE id = p_deal_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to close deal'
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION close_deal_with_winning_engagement(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION close_deal_with_winning_engagement(uuid, uuid) TO service_role;
