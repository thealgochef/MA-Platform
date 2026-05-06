-- Revoke buyer access to CIM/post-NDA deal documents when the deal lifecycle is paused, terminated, or closed.
-- Broker firm members and approved admins keep their existing access for operational/admin purposes.

DROP POLICY IF EXISTS "Authorized users can read deal documents by access state" ON storage.objects;

CREATE POLICY "Authorized users can read deal documents by access state"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'deal-documents'
    AND auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM users u
        WHERE u.id = auth.uid()
          AND u.role = 'admin'
          AND u.status = 'approved'
      )
      OR EXISTS (
        SELECT 1
        FROM users u
        JOIN deals d ON d.id::text = (storage.foldername(name))[1]
        WHERE u.id = auth.uid()
          AND u.role = 'broker'
          AND u.status = 'approved'
          AND d.firm_id = u.firm_id
      )
      OR EXISTS (
        SELECT 1
        FROM users u
        JOIN deals d ON d.id::text = (storage.foldername(name))[1]
        JOIN deal_engagements e ON e.deal_id = d.id AND e.buyer_user_id = u.id
        WHERE u.id = auth.uid()
          AND u.role = 'buyer'
          AND u.status = 'approved'
          AND (
            name = d.teaser_document_path
            OR (name = d.nda_document_path AND e.nda_status IN ('sent', 'signed'))
            OR (
              name = d.cim_document_path
              AND e.cim_released = true
              AND d.status NOT IN ('paused', 'terminated', 'closed')
            )
          )
      )
      OR EXISTS (
        SELECT 1
        FROM users u
        JOIN deal_documents dd ON dd.file_path = name
        JOIN deals d ON d.id = dd.deal_id
        JOIN deal_engagements e ON e.deal_id = dd.deal_id AND e.buyer_user_id = u.id
        WHERE u.id = auth.uid()
          AND u.role = 'buyer'
          AND u.status = 'approved'
          AND (
            dd.access_level = 'pre_nda'
            OR (
              dd.access_level = 'post_nda'
              AND e.nda_status = 'signed'
              AND d.status NOT IN ('paused', 'terminated', 'closed')
            )
          )
      )
    )
  );

DROP POLICY IF EXISTS "Buyers with appropriate access can view deal documents" ON deal_documents;

CREATE POLICY "Buyers with appropriate access can view deal documents"
  ON deal_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM deal_engagements de
      JOIN deals d ON d.id = de.deal_id
      WHERE de.deal_id = deal_documents.deal_id
        AND de.buyer_user_id = auth.uid()
        AND (
          deal_documents.access_level = 'pre_nda'
          OR (
            deal_documents.access_level = 'post_nda'
            AND de.nda_status = 'signed'
            AND d.status NOT IN ('paused', 'terminated', 'closed')
          )
        )
    )
  );
