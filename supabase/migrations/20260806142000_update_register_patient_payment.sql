-- Migration: 20260806142000_update_register_patient_payment.sql
-- Description: Update register_patient_payment function to inherit branch_id from the affected appointment and fix latent FOR UPDATE aggregate query error

CREATE OR REPLACE FUNCTION public.register_patient_payment(
    p_appointment_id uuid,
    p_patient_id uuid,
    p_type text,
    p_amount numeric,
    p_user_id uuid,
    p_reason text DEFAULT NULL::text,
    p_reversed_payment_id uuid DEFAULT NULL::uuid
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_appointment_amount  numeric(10, 2);
    v_paid_total          numeric(10, 2);
    v_balance             numeric(10, 2);
    v_original_type       text;
    v_original_amount     numeric(10, 2);
    v_new_id              uuid;
    v_branch_id           uuid;
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
    SELECT amount, branch_id INTO v_appointment_amount, v_branch_id FROM public.appointments WHERE id = p_appointment_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'La cita con ID % no existe.', p_appointment_id;
    END IF;
    IF v_appointment_amount IS NULL THEN
        RAISE EXCEPTION 'La cita no tiene monto definido. Establezca appointments.amount antes de registrar pagos.';
    END IF;

    -- Corregido: FOR UPDATE no se permite con funciones de agregación. Bloqueamos primero las filas de pagos de la cita.
    PERFORM 1 FROM public.patient_payments WHERE appointment_id = p_appointment_id FOR UPDATE;

    SELECT COALESCE(SUM(CASE type WHEN 'pago' THEN amount WHEN 'reverso' THEN -amount END), 0)
    INTO v_paid_total FROM public.patient_payments WHERE appointment_id = p_appointment_id;

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
    INSERT INTO public.patient_payments (appointment_id, patient_id, type, amount, reason, reversed_payment_id, created_by, branch_id)
    VALUES (p_appointment_id, p_patient_id, p_type, p_amount, p_reason, p_reversed_payment_id, p_user_id, v_branch_id)
    RETURNING id INTO v_new_id;
    RETURN v_new_id;
END;
$function$;
