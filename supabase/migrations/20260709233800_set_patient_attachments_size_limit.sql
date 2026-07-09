-- Set 5 MB file size limit on patient-attachments bucket.
-- allowed_mime_types is intentionally left null: the bucket uses no allowlist
-- because the business rule is a blocklist of executables, which is enforced
-- in the upload Server Action, not at the storage bucket level.
UPDATE storage.buckets
SET file_size_limit = 5242880
WHERE id = 'patient-attachments';
