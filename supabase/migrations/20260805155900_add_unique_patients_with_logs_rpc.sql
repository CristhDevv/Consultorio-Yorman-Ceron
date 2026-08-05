-- ============================================================
-- MIGRACIÓN: add_unique_patients_with_logs_rpc
-- Fecha: 2026-08-05
-- Descripción: Crea una función RPC para obtener la lista de
--              pacientes únicos que tienen logs de comunicación,
--              evitando transferir miles de logs de auditoría
--              al servidor en memoria.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_unique_patients_with_logs()
RETURNS TABLE (id uuid, full_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT p.id, p.full_name
  FROM public.patients p
  JOIN public.communication_logs c ON c.patient_id = p.id
  ORDER BY p.full_name;
$$;

REVOKE EXECUTE ON FUNCTION public.get_unique_patients_with_logs() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_unique_patients_with_logs() TO   authenticated;
