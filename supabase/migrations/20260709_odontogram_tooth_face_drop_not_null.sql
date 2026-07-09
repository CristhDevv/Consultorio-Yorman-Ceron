-- =============================================================================
-- Migración: 20260709_odontogram_tooth_face_drop_not_null
-- Descripción:
--   Elimina la restricción NOT NULL de la columna tooth_face en la tabla
--   odontogram_records, para permitir valores NULL en los registros que
--   corresponden a diagnósticos de pieza completa (estados generales como
--   sano, ausente, extraccion_indicada, endodoncia, corona, implante).
--   Esta modificación es necesaria para que el constraint de consistencia
--   odontogram_records_status_face_consistency_check (aplicado en la
--   migración 20260709_update_odontogram_records_constraints) pueda
--   funcionar correctamente, ya que dicho constraint exige tooth_face IS NULL
--   para los estados generales mencionados.
-- =============================================================================

ALTER TABLE public.odontogram_records
  ALTER COLUMN tooth_face DROP NOT NULL;
