-- =============================================================================
-- Migración: 20260708_alter_odontogram_records_constraints
-- Fecha: 2026-07-08
-- Descripción:
--   1. Permite valores NULL en la columna tooth_face.
--   2. Agrega restricción CHECK sobre la columna status para limitar sus valores.
--   3. Agrega restricción CHECK para validar consistencia lógica entre status
--      y tooth_face (status sistémicos/generales requieren tooth_face NULL;
--      status localizados/superficiales requieren tooth_face NOT NULL).
--   4. Crea un índice optimizado para consultas de historial clínico dental.
-- =============================================================================

-- 1. Alterar la columna tooth_face para permitir valores NULL
ALTER TABLE public.odontogram_records 
  ALTER COLUMN tooth_face DROP NOT NULL;

-- 2. Restricción CHECK para los valores válidos de la columna status
ALTER TABLE public.odontogram_records
  ADD CONSTRAINT odontogram_records_status_check
  CHECK (status IN (
    'sano',
    'ausente',
    'extraccion_indicada',
    'endodoncia',
    'corona',
    'implante',
    'protesis_fija',
    'protesis_removible',
    'movilidad',
    'sin_evaluar',
    'caries',
    'obturado',
    'sellante',
    'fractura'
  ));

-- 3. Restricción CHECK de consistencia entre status y tooth_face:
--    - Para diagnósticos generales de pieza completa (sano, ausente, etc.), tooth_face debe ser NULL.
--    - Para diagnósticos localizados en superficies (caries, obturado, etc.), tooth_face debe ser NOT NULL.
ALTER TABLE public.odontogram_records
  ADD CONSTRAINT odontogram_records_face_consistency_check
  CHECK (
    (status IN (
      'sano',
      'ausente',
      'extraccion_indicada',
      'endodoncia',
      'corona',
      'implante',
      'protesis_fija',
      'protesis_removible',
      'movilidad',
      'sin_evaluar'
    ) AND tooth_face IS NULL)
    OR
    (status IN (
      'caries',
      'obturado',
      'sellante',
      'fractura'
    ) AND tooth_face IS NOT NULL)
  );

-- 4. Índice optimizado para obtener eficientemente el último estado por pieza/cara de un paciente
CREATE INDEX idx_odontogram_records_patient_tooth_face_date
  ON public.odontogram_records (patient_id, tooth_number, tooth_face, created_at DESC);
