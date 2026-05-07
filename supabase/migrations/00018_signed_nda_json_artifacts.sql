-- Allow the signed NDA bucket to store signed signature artifacts as JSON.
-- Source NDA documents remain constrained to PDFs in deal-documents; this bucket stores
-- the signature metadata produced by the NDA POST flow.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['application/pdf', 'application/json']
WHERE id = 'signed-ndas';
