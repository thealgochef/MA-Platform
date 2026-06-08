-- ============================================================
-- Migration 028: Additional messaging hardening
-- ============================================================

-- Ensure message inserts bind deal_id to engagement ownership
DROP POLICY IF EXISTS "Message participants can send messages" ON messages;

CREATE POLICY "Message participants can send messages" ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND current_user_is_approved()
    AND EXISTS (
      SELECT 1 FROM deal_engagements de
      JOIN deals d ON d.id = de.deal_id
      WHERE de.id = messages.engagement_id
        AND de.deal_id = messages.deal_id
        AND (de.buyer_user_id = auth.uid() OR d.point_of_contact_id = auth.uid())
    )
  );

-- Require approved status for thread participants in attachment policies
DROP POLICY IF EXISTS "Thread participants can upload message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Thread participants can read message attachments" ON storage.objects;

CREATE POLICY "Thread participants can upload message attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'message-attachments'
    AND auth.uid() IS NOT NULL
    AND name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.pdf$'
    AND EXISTS (
      SELECT 1
      FROM users u
      JOIN deal_engagements e ON e.id::text = (storage.foldername(name))[1]
      JOIN deals d ON d.id = e.deal_id
      WHERE u.id = auth.uid()
        AND u.status = 'approved'
        AND (
          e.buyer_user_id = auth.uid()
          OR d.point_of_contact_id = auth.uid()
        )
    )
  );

CREATE POLICY "Thread participants can read message attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'message-attachments'
    AND auth.uid() IS NOT NULL
    AND name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.pdf$'
    AND (
      EXISTS (
        SELECT 1
        FROM users u
        JOIN deal_engagements e ON e.id::text = (storage.foldername(name))[1]
        JOIN deals d ON d.id = e.deal_id
        WHERE u.id = auth.uid()
          AND u.status = 'approved'
          AND (
            e.buyer_user_id = auth.uid()
            OR d.point_of_contact_id = auth.uid()
          )
      )
      OR EXISTS (
        SELECT 1
        FROM users u
        WHERE u.id = auth.uid()
          AND u.role = 'admin'
          AND u.status = 'approved'
      )
    )
  );

-- Restrict message thread read RPC execution to authenticated users
REVOKE ALL ON FUNCTION mark_message_thread_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION mark_message_thread_read(uuid) TO authenticated;
