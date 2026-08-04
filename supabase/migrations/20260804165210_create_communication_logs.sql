-- ─── 1. Tabla public.communication_logs ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.communication_logs (
    id                  uuid                     PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id      uuid                     NOT NULL,
    patient_id          uuid                     NOT NULL,
    channel             text                     NOT NULL,
    event_type          text                     NOT NULL,
    status              text                     NOT NULL DEFAULT 'pending',
    created_at          timestamp with time zone NOT NULL DEFAULT now(),
    sent_at             timestamp with time zone,
    error_message       text,
    created_by          uuid                     NOT NULL,

    CONSTRAINT communication_logs_appointment_fkey
        FOREIGN KEY (appointment_id) REFERENCES public.appointments(id),

    CONSTRAINT communication_logs_patient_fkey
        FOREIGN KEY (patient_id) REFERENCES public.patients(id),

    CONSTRAINT communication_logs_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES auth.users(id),

    CONSTRAINT communication_logs_channel_check
        CHECK (channel IN ('email', 'sms', 'whatsapp')),

    CONSTRAINT communication_logs_event_type_check
        CHECK (event_type IN ('confirmation', 'reminder', 'manual')),

    CONSTRAINT communication_logs_status_check
        CHECK (status IN ('pending', 'sent', 'failed'))
);

-- ─── 2. Habilitar RLS ────────────────────────────────────────────────────────

ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;

-- Solo administrador puede leer
CREATE POLICY select_communication_logs
    ON public.communication_logs
    FOR SELECT
    USING (is_admin());

-- No se proveen políticas de INSERT o UPDATE para obligar el uso de SECURITY DEFINER.

-- ─── 3. Función controlada para actualizar el estado ─────────────────────────

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
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Solo un administrador puede actualizar estados.';
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

-- ─── 4. Función controlada para insertar ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.insert_communication_log(
    p_appointment_id uuid,
    p_patient_id uuid,
    p_channel text,
    p_event_type text,
    p_created_by uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_new_id uuid;
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Solo un administrador puede crear registros de comunicación.';
    END IF;

    INSERT INTO public.communication_logs (appointment_id, patient_id, channel, event_type, created_by)
    VALUES (p_appointment_id, p_patient_id, p_channel, p_event_type, p_created_by)
    RETURNING id INTO v_new_id;
    
    RETURN v_new_id;
END;
$$;
