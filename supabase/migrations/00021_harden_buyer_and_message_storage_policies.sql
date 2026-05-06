-- Harden buyer document and message attachment storage policies.
-- buyer-documents paths are expected to be {auth.uid()}/{generated}.pdf.
-- message-attachments paths are expected to be {deal_engagements.id}/{generated_uuid}.pdf.

DROP POLICY IF EXISTS "Buyers can upload their documents" ON storage.objects;
DROP POLICY IF EXISTS "Buyers can read their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Buyers can upload own scoped buyer documents" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users can read scoped buyer documents" ON storage.objects;

CREATE POLICY "Buyers can upload own scoped buyer documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'buyer-documents'
    AND auth.uid() IS NOT NULL
    AND name ~* ('^' || auth.uid()::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.pdf$')
  );

CREATE POLICY "Authorized users can read scoped buyer documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'buyer-documents'
    AND auth.uid() IS NOT NULL
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1
        FROM users u
        WHERE u.id = auth.uid()
          AND u.role = 'admin'
          AND u.status = 'approved'
      )
      OR EXISTS (
        SELECT 1
        FROM users u
        JOIN buyer_documents bd
          ON bd.file_path = name
         AND bd.user_id::text = (storage.foldername(name))[1]
        JOIN deal_engagements e
          ON e.buyer_user_id = bd.user_id
        JOIN deals d
          ON d.id = e.deal_id
        WHERE u.id = auth.uid()
          AND u.role = 'broker'
          AND u.status = 'approved'
          AND d.firm_id = u.firm_id
      )
    )
  );

DROP POLICY IF EXISTS "Authenticated users can upload message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read message attachments" ON storage.objects;
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
      FROM deal_engagements e
      JOIN deals d ON d.id = e.deal_id
      WHERE e.id::text = (storage.foldername(name))[1]
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
        FROM deal_engagements e
        JOIN deals d ON d.id = e.deal_id
        WHERE e.id::text = (storage.foldername(name))[1]
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
