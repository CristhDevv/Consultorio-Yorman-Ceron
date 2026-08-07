-- Migration: 20260806143500_patient_images_rls_and_trigger.sql
-- Description: Create trigger to inherit branch_id from patients and implement branch-aware RLS policies on patient_images

-- 1. Trigger function and trigger to inherit branch_id
CREATE OR REPLACE FUNCTION public.set_patient_image_branch_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    SELECT branch_id INTO NEW.branch_id FROM public.patients WHERE id = NEW.patient_id;
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS inherit_patient_image_branch_id ON public.patient_images;
CREATE TRIGGER inherit_patient_image_branch_id
BEFORE INSERT ON public.patient_images
FOR EACH ROW
EXECUTE FUNCTION public.set_patient_image_branch_id();

-- 2. Drop existing SELECT, INSERT, and UPDATE policies on patient_images
DROP POLICY IF EXISTS "Allow SELECT to staff on patient_images" ON public.patient_images;
DROP POLICY IF EXISTS "Allow INSERT to staff on patient_images" ON public.patient_images;
DROP POLICY IF EXISTS "Allow UPDATE to staff on patient_images" ON public.patient_images;

-- 3. Recreate policies with branch-aware controls
CREATE POLICY "Allow SELECT to staff on patient_images" ON public.patient_images
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR (
    public.is_odontologo()
    AND (
      branch_id IS NULL
      OR branch_id IN (
        SELECT branch_id FROM public.dentist_branches WHERE dentist_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Allow INSERT to staff on patient_images" ON public.patient_images
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
  OR (
    public.is_odontologo()
    AND uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.patients WHERE id = patient_id
    )
    AND (
      (SELECT branch_id FROM public.patients WHERE id = patient_id) IS NULL
      OR (SELECT branch_id FROM public.patients WHERE id = patient_id) IN (
        SELECT branch_id FROM public.dentist_branches WHERE dentist_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Allow UPDATE to staff on patient_images" ON public.patient_images
FOR UPDATE
TO authenticated
USING (
  public.is_admin()
  OR (
    public.is_odontologo()
    AND (
      branch_id IS NULL
      OR branch_id IN (
        SELECT branch_id FROM public.dentist_branches WHERE dentist_id = auth.uid()
      )
    )
  )
);
