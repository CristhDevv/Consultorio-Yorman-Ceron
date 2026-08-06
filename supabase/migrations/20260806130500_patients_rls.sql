-- Migration: 20260806130500_patients_rls.sql
-- Description: Drop existing read, insert, and update policies on public.patients and replace with branch-aware RLS policies

-- Drop existing policies
DROP POLICY IF EXISTS read_patients ON public.patients;
DROP POLICY IF EXISTS insert_patients ON public.patients;
DROP POLICY IF EXISTS update_patients ON public.patients;

-- SELECT policy: admin sees all; odontologo sees branch-less patients or patients belonging to their assigned branches
CREATE POLICY read_patients ON public.patients
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

-- INSERT policy: admin can insert with null or active branch; odontologo can insert with null or their assigned branches
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
    AND created_by = auth.uid()
    AND (
      branch_id IS NULL
      OR branch_id IN (
        SELECT branch_id FROM public.dentist_branches WHERE dentist_id = auth.uid()
      )
    )
  )
);

-- UPDATE policy: admin can update any row to null or active branch; odontologo can update rows they have access to and assign null or their assigned branches
CREATE POLICY update_patients ON public.patients
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
)
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
