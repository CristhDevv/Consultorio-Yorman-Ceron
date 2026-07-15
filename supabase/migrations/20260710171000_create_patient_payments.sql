-- Migration: Create patient_payments table, add appointments.amount, and RPC register_patient_payment

-- ─── 1. Tabla public.patient_payments ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.patient_payments (
    id                  uuid                     PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id      uuid                     NOT NULL,
    patient_id          uuid                     NOT NULL,
    type                text                     NOT NULL,
    amount              numeric(10, 2)           NOT NULL,
    reason              text,
    reversed_payment_id uuid,
    created_by          uuid                     NOT NULL,
    created_at          timestamp with time zone NOT NULL DEFAULT now(),

    CONSTRAINT patient_payments_appointment_id_fkey
        FOREIGN KEY (appointment_id)      REFERENCES public.appointments(id),

    CONSTRAINT patient_payments_patient_fkey
        FOREIGN KEY (patient_id)          REFERENCES public.patients(id),

    CONSTRAINT patient_payments_created_by_fkey
        FOREIGN KEY (created_by)          REFERENCES auth.users(id),

    CONSTRAINT patient_payments_reversed_payment_id_fkey
        FOREIGN KEY (reversed_payment_id) REFERENCES public.patient_payments(id),

    CONSTRAINT patient_payments_type_check
        CHECK (type IN ('pago', 'reverso')),

    CONSTRAINT patient_payments_amount_check
        CHECK (amount > 0)
);

-- Índice único parcial: solo puede haber un reverso por pago original
CREATE UNIQUE INDEX patient_payments_one_reverso_per_pago_idx
    ON public.patient_payments (reversed_payment_id)
    WHERE reversed_payment_id IS NOT NULL;

-- ─── 2. Columna amount en public.appointments (nullable) ─────────────────────

ALTER TABLE public.appointments
    ADD COLUMN IF NOT EXISTS amount numeric(10, 2);

-- ─── 3. Habilitar RLS ────────────────────────────────────────────────────────

ALTER TABLE public.patient_payments ENABLE ROW LEVEL SECURITY;

-- ─── 4. Políticas RLS para patient_payments ──────────────────────────────────

CREATE POLICY select_patient_payments
    ON public.patient_payments
    FOR SELECT
    USING (is_admin() OR is_odontologo());

CREATE POLICY insert_patient_payments
    ON public.patient_payments
    FOR INSERT
    WITH CHECK (is_admin());

-- ─── 5. Función RPC public.register_patient_payment ──────────────────────────

CREATE OR REPLACE FUNCTION public.register_patient_payment(
    p_appointment_id      uuid,
    p_patient_id          uuid,
    p_type                text,
    p_amount              numeric,
    p_reason              text,
    p_reversed_payment_id uuid,
    p_user_id             uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_appointment_amount  numeric(10, 2);
    v_paid_total          numeric(10, 2);
    v_balance             numeric(10, 2);
    v_original_type       text;
    v_original_amount     numeric(10, 2);
    v_new_id              uuid;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Solo un administrador puede registrar pagos.';
    END IF;
    IF p_type NOT IN ('pago', 'reverso') THEN
        RAISE EXCEPTION 'Tipo de pago inválido: %. Debe ser "pago" o "reverso".', p_type;
    END IF;
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'El monto debe ser mayor que cero.';
    END IF;
    SELECT amount INTO v_appointment_amount FROM public.appointments WHERE id = p_appointment_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'La cita con ID % no existe.', p_appointment_id;
    END IF;
    IF v_appointment_amount IS NULL THEN
        RAISE EXCEPTION 'La cita no tiene monto definido. Establezca appointments.amount antes de registrar pagos.';
    END IF;
    SELECT COALESCE(SUM(CASE type WHEN 'pago' THEN amount WHEN 'reverso' THEN -amount END), 0)
    INTO v_paid_total FROM public.patient_payments WHERE appointment_id = p_appointment_id FOR UPDATE;
    v_balance := v_appointment_amount - v_paid_total;
    IF p_type = 'pago' THEN
        IF p_amount > v_balance THEN
            RAISE EXCEPTION 'El pago (%) excede el saldo pendiente de la cita (%).', p_amount, v_balance;
        END IF;
    ELSIF p_type = 'reverso' THEN
        IF p_reversed_payment_id IS NULL THEN
            RAISE EXCEPTION 'Un reverso debe referenciar el pago original mediante reversed_payment_id.';
        END IF;
        SELECT type, amount INTO v_original_type, v_original_amount
        FROM public.patient_payments WHERE id = p_reversed_payment_id FOR UPDATE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'El pago original con ID % no existe.', p_reversed_payment_id;
        END IF;
        IF v_original_type <> 'pago' THEN
            RAISE EXCEPTION 'El registro referenciado (ID %) no es un pago; no se puede revertir un reverso.', p_reversed_payment_id;
        END IF;
        IF p_amount > v_original_amount THEN
            RAISE EXCEPTION 'El monto del reverso (%) excede el monto del pago original (%).', p_amount, v_original_amount;
        END IF;
    END IF;
    INSERT INTO public.patient_payments (appointment_id, patient_id, type, amount, reason, reversed_payment_id, created_by)
    VALUES (p_appointment_id, p_patient_id, p_type, p_amount, p_reason, p_reversed_payment_id, p_user_id)
    RETURNING id INTO v_new_id;
    RETURN v_new_id;
END;
$$;

-- ─── 6. Permisos de ejecución de la función ──────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.register_patient_payment FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.register_patient_payment TO   authenticated;
