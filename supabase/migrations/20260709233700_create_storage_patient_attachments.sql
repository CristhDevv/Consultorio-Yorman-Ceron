-- Create patient-attachments bucket and its RLS policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('patient-attachments', 'patient-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage.objects on the patient-attachments bucket
CREATE POLICY "Allow SELECT to odontologos and admins"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'patient-attachments'
    AND (public.is_admin() OR public.is_odontologo())
);

CREATE POLICY "Allow INSERT to odontologos and admins"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'patient-attachments'
    AND (public.is_admin() OR public.is_odontologo())
);
