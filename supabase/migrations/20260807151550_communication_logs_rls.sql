-- Migration: 20260807101000_communication_logs_rls.sql
-- Description: Replace SELECT policy and enforce strict no-direct-write policies on public.communication_logs

-- 1. Drop existing SELECT policy
DROP POLICY IF EXISTS select_communication_logs ON public.communication_logs;

-- 2. Create new SELECT policy allowing admin and dentist owner of appointment
CREATE POLICY select_communication_logs ON public.communication_logs
FOR SELECT
TO authenticated
USING (
    is_admin()
    OR EXISTS (
        SELECT 1 
        FROM public.appointments 
        WHERE id = appointment_id 
          AND dentist_id = auth.uid()
    )
);

-- 3. Create defensive INSERT policy (direct writes are blocked, must use insert_communication_log RPC)
-- Defense in depth: Explicitly block direct insert writes for authenticated users
CREATE POLICY insert_communication_logs_defensive ON public.communication_logs
FOR INSERT
TO authenticated
WITH CHECK (false);

-- 4. Create defensive UPDATE policy (direct writes are blocked, must use update_communication_log_status RPC)
-- Defense in depth: Explicitly block direct update writes for authenticated users
CREATE POLICY update_communication_logs_defensive ON public.communication_logs
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);
