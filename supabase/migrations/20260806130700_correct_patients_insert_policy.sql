-- Migration: 20260806130700_correct_patients_insert_policy.sql
-- Description: Correct insert_patients policy on public.patients by removing created_by = auth.uid() check for odontologo

DROP POLICY IF EXISTS insert_patients ON public.patients;

CREATE POLICY insert_patients ON public.patients
FOR INSERT
TO authenticated
WITH CHECK (
  (
    public.is_admin()
    AND (
      branch_id IS NULL
      OR branch_id IN (
        SELECT id FROM public.branches WHERE is_active = true
      )
    )
  )
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
