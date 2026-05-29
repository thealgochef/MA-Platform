-- ============================================================
-- Migration 026: Persisted notifications and message read state
-- ============================================================

-- Table: notifications
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event text NOT NULL,
  deal_id uuid REFERENCES deals(id) ON DELETE SET NULL,
  engagement_id uuid REFERENCES deal_engagements(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_id_created_at_idx
  ON notifications (user_id, created_at DESC);

CREATE INDEX notifications_user_id_read_at_idx
  ON notifications (user_id, read_at);

-- Table: message_thread_reads
CREATE TABLE message_thread_reads (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  engagement_id uuid NOT NULL REFERENCES deal_engagements(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, engagement_id)
);

CREATE TRIGGER message_thread_reads_updated_at
  BEFORE UPDATE ON message_thread_reads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION can_access_engagement_thread(p_engagement_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM users u
    JOIN deal_engagements de ON de.id = p_engagement_id
    JOIN deals d ON d.id = de.deal_id
    WHERE u.id = auth.uid()
      AND u.status = 'approved'
      AND (
        u.role = 'admin'
        OR de.buyer_user_id = auth.uid()
        OR d.point_of_contact_id = auth.uid()
      )
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- ========================
-- NOTIFICATIONS
-- ========================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users can read their own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid() AND current_user_is_approved());

CREATE POLICY "Approved users can update their own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid() AND current_user_is_approved())
  WITH CHECK (user_id = auth.uid() AND current_user_is_approved());

CREATE POLICY "Approved admins can read all notifications"
  ON notifications FOR SELECT
  USING (is_admin());

-- ========================
-- MESSAGE_THREAD_READS
-- ========================
ALTER TABLE message_thread_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved participants can read own thread markers"
  ON message_thread_reads FOR SELECT
  USING (
    user_id = auth.uid()
    AND can_access_engagement_thread(engagement_id)
  );

CREATE POLICY "Approved participants can create own thread markers"
  ON message_thread_reads FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND can_access_engagement_thread(engagement_id)
  );

CREATE POLICY "Approved participants can update own thread markers"
  ON message_thread_reads FOR UPDATE
  USING (
    user_id = auth.uid()
    AND can_access_engagement_thread(engagement_id)
  )
  WITH CHECK (
    user_id = auth.uid()
    AND can_access_engagement_thread(engagement_id)
  );
