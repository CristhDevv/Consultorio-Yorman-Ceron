-- RLS policy for storage.objects on the patient-attachments bucket to allow DELETE to admins
CREATE POLICY "Allow DELETE to admins"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'patient-attachments'
    AND public.is_admin()
);
