-- Migration: 20260806140500_appointments_dentist_branch_trigger.sql
-- Description: Trigger BEFORE INSERT OR UPDATE on public.appointments that validates,
-- when both dentist_id and branch_id are non-null, that a corresponding row exists
-- in public.dentist_branches. If not, raises an exception with a clear user-facing message.

-- 1. Create the trigger function
CREATE OR REPLACE FUNCTION public.check_dentist_branch_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only validate when both dentist_id and branch_id are provided
  IF NEW.dentist_id IS NOT NULL AND NEW.branch_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.dentist_branches
      WHERE dentist_id = NEW.dentist_id
        AND branch_id  = NEW.branch_id
    ) THEN
      RAISE EXCEPTION 'El odontólogo no atiende en la sucursal seleccionada';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Drop trigger if it already exists (idempotent)
DROP TRIGGER IF EXISTS trg_check_dentist_branch ON public.appointments;

-- 3. Create the trigger
CREATE TRIGGER trg_check_dentist_branch
  BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.check_dentist_branch_assignment();
