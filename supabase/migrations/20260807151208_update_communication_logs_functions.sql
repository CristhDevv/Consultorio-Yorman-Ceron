-- Migration: 20260807100000_update_communication_logs_functions.sql
-- Description: Update insert_communication_log (removing p_created_by from signature, inheriting branch_id from appointments, and checking ownership in a single query) and update_communication_log_status to allow access to the dentist assigned to the associated appointment.

-- Drop old function with 5 parameters to avoid overloading collision
DROP FUNCTION IF EXISTS public.insert_communication_log(uuid, uuid, text, text, uuid);

-- 1. Redefine insert_communication_log function with 4 parameters
CREATE OR REPLACE FUNCTION public.insert_communication_log(
    p_appointment_id uuid,
    p_patient_id uuid,
    p_channel text,
    p_event_type text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_new_id uuid;
    v_branch_id uuid;
BEGIN
    -- Validamos existencia y acceso de forma atómica y resolvemos branch_id
    SELECT branch_id INTO v_branch_id 
    FROM public.appointments 
    WHERE id = p_appointment_id 
      AND (
        is_admin() 
        OR dentist_id = auth.uid()
      );
      
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Solo un administrador o el odontólogo de la cita pueden crear registros de comunicación.';
    END IF;

    -- Inserción incluyendo el branch_id heredado de la cita
    INSERT INTO public.communication_logs (appointment_id, patient_id, channel, event_type, created_by, branch_id)
    VALUES (p_appointment_id, p_patient_id, p_channel, p_event_type, auth.uid(), v_branch_id)
    RETURNING id INTO v_new_id;
    
    RETURN v_new_id;
END;
$$;

-- 2. Redefine update_communication_log_status function
CREATE OR REPLACE FUNCTION public.update_communication_log_status(
    p_log_id uuid,
    p_status text,
    p_error_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Permit access if administrator OR the authenticated user is the assigned dentist of the appointment associated with the log
    IF NOT (
        is_admin()
        OR EXISTS (
            SELECT 1 
            FROM public.communication_logs c
            JOIN public.appointments a ON a.id = c.appointment_id
            WHERE c.id = p_log_id 
              AND a.dentist_id = auth.uid()
        )
    ) THEN
        RAISE EXCEPTION 'Solo un administrador o el odontólogo de la cita pueden actualizar estados.';
    END IF;

    IF p_status NOT IN ('pending', 'sent', 'failed') THEN
        RAISE EXCEPTION 'Estado inválido: %', p_status;
    END IF;

    UPDATE public.communication_logs
    SET status = p_status,
        sent_at = CASE WHEN p_status = 'sent' THEN now() ELSE sent_at END,
        error_message = p_error_message
    WHERE id = p_log_id;
END;
$$;
