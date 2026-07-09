-- =============================================================================
-- Migración: 20260709_update_odontogram_records_constraints
-- Descripción:
--   1. Reestablece/Define la restricción CHECK para los estados válidos (10 en snake_case).
--   2. Agrega la restricción CHECK de consistencia de caras dentales (tooth_face)
--      según el estado del diente.
--
-- IMPORTANTE: Esta migración NO debe aplicarse contra la base de datos
-- hasta recibir autorización explícita del usuario.
-- =============================================================================

-- 1. Eliminar por seguridad y agregar la restricción de estados permitidos
ALTER TABLE public.odontogram_records 
  DROP CONSTRAINT IF EXISTS odontogram_records_status_check;

ALTER TABLE public.odontogram_records
  ADD CONSTRAINT odontogram_records_status_check
  CHECK (status IN (
    'sano',
    'caries',
    'obturado',
    'sellante',
    'corona',
    'endodoncia',
    'implante',
    'ausente',
    'extraccion_indicada',
    'fracturado'
  ));

-- 2. Eliminar por seguridad y agregar la restricción de consistencia lógica entre status y tooth_face
ALTER TABLE public.odontogram_records 
  DROP CONSTRAINT IF EXISTS odontogram_records_status_face_consistency_check;

ALTER TABLE public.odontogram_records
  ADD CONSTRAINT odontogram_records_status_face_consistency_check
  CHECK (
    (status IN (
      'sano',
      'ausente',
      'extraccion_indicada',
      'endodoncia',
      'corona',
      'implante'
    ) AND tooth_face IS NULL)
    OR
    (status IN (
      'caries',
      'obturado',
      'sellante',
      'fracturado'
    ) AND tooth_face IS NOT NULL)
  );
