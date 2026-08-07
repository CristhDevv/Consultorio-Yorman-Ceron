-- Migration: 20260806142500_patient_payments_rls.sql
-- Description: Replaces RLS policies on patient_payments with branch-aware policies

-- Drop existing policies on patient_payments
DROP POLICY IF EXISTS select_patient_payments ON public.patient_payments;
DROP POLICY IF EXISTS insert_patient_payments ON public.patient_payments;

-- RLS Policies for patient_payments
CREATE POLICY select_patient_payments ON public.patient_payments
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

CREATE POLICY insert_patient_payments ON public.patient_payments
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
  AND (
    branch_id IS NULL
    OR branch_id IN (
      SELECT id FROM public.branches WHERE is_active = true
    )
  )
);
