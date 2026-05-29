-- ============================================================
-- Migration 027: Harden messaging policies and read markers
-- ============================================================

-- Optimize thread-list message scans
CREATE INDEX IF NOT EXISTS messages_engagement_id_created_at_desc_idx
  ON messages (engagement_id, created_at DESC);

-- Use DB clock for read markers via authenticated RPC (SECURITY INVOKER keeps RLS enforcement)
CREATE OR REPLACE FUNCTION mark_message_thread_read(p_engagement_id uuid)
RETURNS void AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO message_thread_reads (user_id, engagement_id, last_read_at)
  VALUES (auth.uid(), p_engagement_id, now())
  ON CONFLICT (user_id, engagement_id)
  DO UPDATE SET
    last_read_at = now(),
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY INVOKER VOLATILE SET search_path = public;

-- Harden deal_engagements buyer/broker policies to approved users only
DROP POLICY IF EXISTS "Buyers can see their own engagements" ON deal_engagements;
DROP POLICY IF EXISTS "Broker firm members can see engagements on their deals" ON deal_engagements;
DROP POLICY IF EXISTS "Buyers can insert engagements" ON deal_engagements;
DROP POLICY IF EXISTS "Buyers can update their own engagements" ON deal_engagements;
DROP POLICY IF EXISTS "Broker firm members can update engagements on their deals" ON deal_engagements;

CREATE POLICY "Buyers can see their own engagements" ON deal_engagements FOR SELECT
  USING (buyer_user_id = auth.uid() AND current_user_is_approved('buyer'));

CREATE POLICY "Broker firm members can see engagements on their deals" ON deal_engagements FOR SELECT
  USING (
    current_user_is_approved('broker')
    AND EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_engagements.deal_id
        AND deals.firm_id = get_user_firm_id()
    )
  );

CREATE POLICY "Buyers can insert engagements" ON deal_engagements FOR INSERT
  WITH CHECK (buyer_user_id = auth.uid() AND current_user_is_approved('buyer'));

CREATE POLICY "Buyers can update their own engagements" ON deal_engagements FOR UPDATE
  USING (buyer_user_id = auth.uid() AND current_user_is_approved('buyer'))
  WITH CHECK (buyer_user_id = auth.uid() AND current_user_is_approved('buyer'));

CREATE POLICY "Broker firm members can update engagements on their deals" ON deal_engagements FOR UPDATE
  USING (
    current_user_is_approved('broker')
    AND EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_engagements.deal_id
        AND deals.firm_id = get_user_firm_id()
    )
  )
  WITH CHECK (
    current_user_is_approved('broker')
    AND EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_engagements.deal_id
        AND deals.firm_id = get_user_firm_id()
    )
  );

-- Harden messages participant policies to approved users only
DROP POLICY IF EXISTS "Message participants can see messages" ON messages;
DROP POLICY IF EXISTS "Message participants can send messages" ON messages;

CREATE POLICY "Message participants can see messages" ON messages FOR SELECT
  USING (
    current_user_is_approved()
    AND EXISTS (
      SELECT 1 FROM deal_engagements de
      JOIN deals d ON d.id = de.deal_id
      WHERE de.id = messages.engagement_id
        AND (de.buyer_user_id = auth.uid() OR d.point_of_contact_id = auth.uid())
    )
  );

CREATE POLICY "Message participants can send messages" ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND current_user_is_approved()
    AND EXISTS (
      SELECT 1 FROM deal_engagements de
      JOIN deals d ON d.id = de.deal_id
      WHERE de.id = messages.engagement_id
        AND (de.buyer_user_id = auth.uid() OR d.point_of_contact_id = auth.uid())
    )
  );
