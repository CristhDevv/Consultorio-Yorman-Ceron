-- =============================================================================
-- Migración: 20260709_odontogram_unique_absent_extraccion
-- Descripción:
--   Crea un índice único parcial compuesto para impedir la coexistencia y
--   duplicación de los estados generales 'ausente' y 'extraccion_indicada'
--   en la misma pieza dental (tooth_number) para un paciente (patient_id).
--   Esto asegura coherencia lógica clínica en el odontograma.
-- =============================================================================

CREATE UNIQUE INDEX unique_patient_tooth_absent_extraccion_idx
  ON public.odontogram_records (patient_id, tooth_number)
  WHERE (status = 'ausente' OR status = 'extraccion_indicada');
