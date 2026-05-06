-- Harden deal and dispute document storage policies.
-- deal-documents paths are expected to begin with {deal_id}/...
-- dispute-documents paths are expected to begin with {deal_id}/...

DROP POLICY IF EXISTS "Broker firm members can upload deal documents" ON storage.objects;
DROP POLICY IF EXISTS "Broker firm members can read their deal documents" ON storage.objects;
DROP POLICY IF EXISTS "Buyers with access can read deal documents" ON storage.objects;
DROP POLICY IF EXISTS "Broker firm members can upload deal documents for owned deals" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users can read deal documents by access state" ON storage.objects;

CREATE POLICY "Broker firm members can upload deal documents for owned deals"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'deal-documents'
    AND auth.uid() IS NOT NULL
    AND lower(name) LIKE '%.pdf'
    AND EXISTS (
      SELECT 1
      FROM users u
      JOIN deals d ON d.id::text = (storage.foldername(name))[1]
      WHERE u.id = auth.uid()
        AND u.role = 'broker'
        AND u.status = 'approved'
        AND d.firm_id = u.firm_id
    )
  );

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
            OR (name = d.cim_document_path AND e.cim_released = true)
          )
      )
      OR EXISTS (
        SELECT 1
        FROM users u
        JOIN deal_documents dd ON dd.file_path = name
        JOIN deal_engagements e ON e.deal_id = dd.deal_id AND e.buyer_user_id = u.id
        WHERE u.id = auth.uid()
          AND u.role = 'buyer'
          AND u.status = 'approved'
          AND (
            dd.access_level = 'pre_nda'
            OR (dd.access_level = 'post_nda' AND e.nda_status = 'signed')
          )
      )
    )
  );

DROP POLICY IF EXISTS "Authenticated users can upload dispute documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read dispute documents" ON storage.objects;
DROP POLICY IF EXISTS "Authorized participants can upload dispute documents" ON storage.objects;
DROP POLICY IF EXISTS "Authorized participants can read dispute documents" ON storage.objects;

CREATE POLICY "Authorized participants can upload dispute documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'dispute-documents'
    AND auth.uid() IS NOT NULL
    AND lower(name) LIKE '%.pdf'
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
        JOIN deal_closures dc ON dc.deal_id::text = (storage.foldername(name))[1]
        WHERE u.id = auth.uid()
          AND u.role = 'buyer'
          AND u.status = 'approved'
          AND dc.buyer_user_id = u.id
      )
    )
  );

CREATE POLICY "Authorized participants can read dispute documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'dispute-documents'
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
        JOIN deal_closures dc ON dc.deal_id::text = (storage.foldername(name))[1]
        WHERE u.id = auth.uid()
          AND u.role = 'buyer'
          AND u.status = 'approved'
          AND dc.buyer_user_id = u.id
      )
    )
  );
