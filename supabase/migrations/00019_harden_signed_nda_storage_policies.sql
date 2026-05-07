-- Harden signed NDA JSON artifact storage policies.
-- Signed NDA paths are expected to be: {deal_id}/{signer_user_id}/{artifact_uuid}.json

DROP POLICY IF EXISTS "Authenticated users can upload signed NDAs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read signed NDAs" ON storage.objects;
DROP POLICY IF EXISTS "Buyers can upload signed NDA artifacts scoped to self" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users can read signed NDA artifacts" ON storage.objects;

CREATE POLICY "Buyers can upload signed NDA artifacts scoped to self"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'signed-ndas'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND lower(name) LIKE '%.json'
    AND EXISTS (
      SELECT 1
      FROM users u
      JOIN deal_engagements e
        ON e.buyer_user_id = u.id
       AND e.deal_id::text = (storage.foldername(name))[1]
      WHERE u.id = auth.uid()
        AND u.role = 'buyer'
        AND u.status = 'approved'
    )
  );

CREATE POLICY "Authorized users can read signed NDA artifacts"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'signed-ndas'
    AND auth.uid() IS NOT NULL
    AND (
      (storage.foldername(name))[2] = auth.uid()::text
      OR EXISTS (
        SELECT 1
        FROM users u
        JOIN deals d
          ON d.id::text = (storage.foldername(name))[1]
         AND d.firm_id = u.firm_id
        WHERE u.id = auth.uid()
          AND u.role = 'broker'
          AND u.status = 'approved'
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
