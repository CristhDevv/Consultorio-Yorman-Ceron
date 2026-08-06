-- Migration: 20260806140000_appointments_rls.sql
-- Description: Drop existing read, insert, and update policies on public.appointments and replace with branch-aware RLS policies

-- Drop existing policies
DROP POLICY IF EXISTS appointments_select ON public.appointments;
DROP POLICY IF EXISTS appointments_insert ON public.appointments;
DROP POLICY IF EXISTS appointments_update ON public.appointments;

-- SELECT policy: admin sees all; odontologo sees branch-less appointments or appointments belonging to their assigned branches
CREATE POLICY appointments_select ON public.appointments
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
CREATE POLICY appointments_insert ON public.appointments
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

-- UPDATE policy: admin can update any row to null or active branch; odontologo can update rows they have access to and assign null or their assigned branches
CREATE POLICY appointments_update ON public.appointments
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
