-- Make profile-pictures bucket private and restrict reads to owner only.
UPDATE storage.buckets
SET public = false
WHERE id = 'profile-pictures';

DROP POLICY IF EXISTS "Anyone can view profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view their own profile picture" ON storage.objects;

CREATE POLICY "Authenticated users can view their own profile picture"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'profile-pictures'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
