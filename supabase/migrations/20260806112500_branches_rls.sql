-- Migration: 20260806112500_branches_rls.sql
-- Description: Define RLS policies for branches and dentist_branches tables

-- RLS policies for public.branches
CREATE POLICY "Allow SELECT to staff on branches"
ON public.branches FOR SELECT
TO authenticated
USING (
    public.is_admin() OR public.is_odontologo()
);

CREATE POLICY "Allow INSERT to admins on branches"
ON public.branches FOR INSERT
TO authenticated
WITH CHECK (
    public.is_admin()
);

CREATE POLICY "Allow UPDATE to admins on branches"
ON public.branches FOR UPDATE
TO authenticated
USING (
    public.is_admin()
)
WITH CHECK (
    public.is_admin()
);

CREATE POLICY "Allow DELETE to admins on branches"
ON public.branches FOR DELETE
TO authenticated
USING (
    public.is_admin()
);

-- RLS policies for public.dentist_branches
CREATE POLICY "Allow SELECT to admins and self on dentist_branches"
ON public.dentist_branches FOR SELECT
TO authenticated
USING (
    public.is_admin() OR dentist_id = auth.uid()
);

CREATE POLICY "Allow INSERT to admins on dentist_branches"
ON public.dentist_branches FOR INSERT
TO authenticated
WITH CHECK (
    public.is_admin()
);

CREATE POLICY "Allow UPDATE to admins on dentist_branches"
ON public.dentist_branches FOR UPDATE
TO authenticated
USING (
    public.is_admin()
)
WITH CHECK (
    public.is_admin()
);

CREATE POLICY "Allow DELETE to admins on dentist_branches"
ON public.dentist_branches FOR DELETE
TO authenticated
USING (
    public.is_admin()
);
