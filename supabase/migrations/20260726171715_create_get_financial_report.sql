-- Migration: 20260726171715_create_get_financial_report.sql
-- Función de solo lectura para el módulo de Reportes Financieros.
-- Solo administradores. No toca ni llama a register_patient_payment.
-- Retorna jsonb con tres claves independientes:
--   totales        → objeto plano con totales globales del rango
--   por_odontologo → array de filas, un GROUP BY por dentist_id
--   por_tipo_cita  → array de filas, un GROUP BY por appointments.reason

CREATE OR REPLACE FUNCTION public.get_financial_report(
    p_date_from timestamptz,   -- inicio del rango, filtrado por patient_payments.created_at (inclusive)
    p_date_to   timestamptz    -- fin del rango (inclusive)
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_totales       jsonb;
    v_por_dentista  jsonb;
    v_por_tipo      jsonb;
BEGIN
    -- ─── Control de acceso: exclusivamente administrador ─────────────────────
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION
            'Acceso denegado. Solo los administradores pueden consultar reportes financieros.';
    END IF;

    -- ─── 1. Totales globales del rango ───────────────────────────────────────
    -- Sin GROUP BY: siempre devuelve exactamente una fila.
    -- SUM sobre conjunto vacío retorna NULL; COALESCE lo convierte en 0.
    SELECT jsonb_build_object(
        'total_pagado',
            COALESCE(SUM(CASE WHEN type = 'pago'    THEN amount ELSE 0 END), 0),
        'total_reversado',
            COALESCE(SUM(CASE WHEN type = 'reverso' THEN amount ELSE 0 END), 0),
        'neto',
            COALESCE(SUM(CASE WHEN type = 'pago'    THEN  amount
                              WHEN type = 'reverso' THEN -amount
                              ELSE 0 END), 0)
    )
    INTO v_totales
    FROM public.patient_payments
    WHERE created_at >= p_date_from
      AND created_at <= p_date_to;

    -- ─── 2. Desglose por odontólogo ──────────────────────────────────────────
    -- GROUP BY independiente sobre dentist_id y full_name del perfil.
    -- Sin pagos en el rango: jsonb_agg retorna NULL → COALESCE → '[]'.
    SELECT jsonb_agg(
        jsonb_build_object(
            'dentist_id',       a.dentist_id,
            'dentist_name',     pr.full_name,
            'total_pagado',
                COALESCE(SUM(CASE WHEN pp.type = 'pago'    THEN pp.amount ELSE 0 END), 0),
            'total_reversado',
                COALESCE(SUM(CASE WHEN pp.type = 'reverso' THEN pp.amount ELSE 0 END), 0),
            'neto',
                COALESCE(SUM(CASE WHEN pp.type = 'pago'    THEN  pp.amount
                                  WHEN pp.type = 'reverso' THEN -pp.amount
                                  ELSE 0 END), 0)
        )
        ORDER BY pr.full_name ASC
    )
    INTO v_por_dentista
    FROM public.patient_payments pp
    JOIN public.appointments a  ON a.id  = pp.appointment_id
    JOIN public.profiles     pr ON pr.id = a.dentist_id
    WHERE pp.created_at >= p_date_from
      AND pp.created_at <= p_date_to
    GROUP BY a.dentist_id, pr.full_name;

    -- ─── 3. Desglose por tipo de cita (appointments.reason) ─────────────────
    -- GROUP BY independiente sobre appointments.reason (valor crudo de BD).
    -- NULLs agrupan juntos en PostgreSQL; se etiquetan 'Sin tipo' en el output.
    -- Sin pagos en el rango: jsonb_agg retorna NULL → COALESCE → '[]'.
    SELECT jsonb_agg(
        jsonb_build_object(
            'appointment_reason', COALESCE(a.reason, 'Sin tipo'),
            'total_pagado',
                COALESCE(SUM(CASE WHEN pp.type = 'pago'    THEN pp.amount ELSE 0 END), 0),
            'total_reversado',
                COALESCE(SUM(CASE WHEN pp.type = 'reverso' THEN pp.amount ELSE 0 END), 0),
            'neto',
                COALESCE(SUM(CASE WHEN pp.type = 'pago'    THEN  pp.amount
                                  WHEN pp.type = 'reverso' THEN -pp.amount
                                  ELSE 0 END), 0)
        )
        ORDER BY COALESCE(a.reason, 'Sin tipo') ASC
    )
    INTO v_por_tipo
    FROM public.patient_payments pp
    JOIN public.appointments a ON a.id = pp.appointment_id
    WHERE pp.created_at >= p_date_from
      AND pp.created_at <= p_date_to
    GROUP BY a.reason;

    -- ─── Retorno: JSON estructurado con tres claves independientes ───────────
    RETURN jsonb_build_object(
        'totales',          v_totales,
        'por_odontologo',   COALESCE(v_por_dentista, '[]'::jsonb),
        'por_tipo_cita',    COALESCE(v_por_tipo,     '[]'::jsonb)
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_financial_report FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_financial_report TO authenticated;
