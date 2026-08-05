-- Migration: 20260805130000_create_patient_images.sql
-- Create patient_images table and storage bucket patient-images

CREATE TABLE IF NOT EXISTS public.patient_images (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    image_type text NOT NULL CHECK (image_type IN ('panoramica', 'periapical', 'aleta_mordida', 'oclusal', 'tomografia', 'otra')),
    description text NULL,
    bucket_id text NOT NULL DEFAULT 'patient-images',
    file_path text NOT NULL,
    file_name text NOT NULL,
    uploaded_by uuid NOT NULL REFERENCES auth.users(id),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone NULL DEFAULT NULL,
    deleted_by uuid NULL DEFAULT NULL REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.patient_images ENABLE ROW LEVEL SECURITY;

-- RLS policies for public.patient_images
CREATE POLICY "Allow SELECT to staff on patient_images"
ON public.patient_images FOR SELECT
TO authenticated
USING (
    public.is_admin() OR public.is_odontologo()
);

CREATE POLICY "Allow INSERT to staff on patient_images"
ON public.patient_images FOR INSERT
TO authenticated
WITH CHECK (
    (public.is_admin() OR public.is_odontologo())
    AND uploaded_by = auth.uid()
);

CREATE POLICY "Allow UPDATE to staff on patient_images"
ON public.patient_images FOR UPDATE
TO authenticated
USING (
    public.is_admin() OR public.is_odontologo()
);

CREATE POLICY "Allow DELETE to admins on patient_images"
ON public.patient_images FOR DELETE
TO authenticated
USING (
    public.is_admin()
);

-- Create bucket patient-images
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('patient-images', 'patient-images', false, 5242880)
ON CONFLICT (id) DO UPDATE
SET file_size_limit = 5242880;

-- RLS policies for storage.objects on the patient-images bucket
CREATE POLICY "Allow SELECT to staff on patient-images storage"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'patient-images'
    AND (public.is_admin() OR public.is_odontologo())
);

CREATE POLICY "Allow INSERT to staff on patient-images storage"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'patient-images'
    AND (public.is_admin() OR public.is_odontologo())
);

CREATE POLICY "Allow DELETE to admins on patient-images storage"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'patient-images'
    AND public.is_admin()
);
