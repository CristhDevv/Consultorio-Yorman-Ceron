-- Migration: 20260807203000_fix_get_financial_report_types.sql
-- Description: Cast p_date_from and p_date_to to timestamptz in get_financial_report function

CREATE OR REPLACE FUNCTION public.get_financial_report(
    p_date_from text,
    p_date_to text,
    p_branch_id text DEFAULT NULL::text
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_totales       jsonb;
    v_por_dentista  jsonb;
    v_por_tipo      jsonb;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION
            'Acceso denegado. Solo los administradores pueden consultar reportes financieros.';
    END IF;

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
    WHERE created_at >= p_date_from::timestamptz
      AND created_at <= p_date_to::timestamptz
      AND (p_branch_id IS NULL OR p_branch_id = 'all' OR p_branch_id = 'ALL_BRANCHES' OR branch_id = p_branch_id::uuid);

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
    WHERE pp.created_at >= p_date_from::timestamptz
      AND pp.created_at <= p_date_to::timestamptz
      AND (p_branch_id IS NULL OR p_branch_id = 'all' OR p_branch_id = 'ALL_BRANCHES' OR pp.branch_id = p_branch_id::uuid)
    GROUP BY a.dentist_id, pr.full_name;

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
    WHERE pp.created_at >= p_date_from::timestamptz
      AND pp.created_at <= p_date_to::timestamptz
      AND (p_branch_id IS NULL OR p_branch_id = 'all' OR p_branch_id = 'ALL_BRANCHES' OR pp.branch_id = p_branch_id::uuid)
    GROUP BY a.reason;

    RETURN jsonb_build_object(
        'totales',          v_totales,
        'por_odontologo',   COALESCE(v_por_dentista, '[]'::jsonb),
        'por_tipo_cita',    COALESCE(v_por_tipo,     '[]'::jsonb)
    );
END;
$function$;
