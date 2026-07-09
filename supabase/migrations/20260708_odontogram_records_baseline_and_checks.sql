-- =============================================================================
-- Migración: 20260708_odontogram_records_baseline_and_checks
-- Descripción:
--   1. Documenta como baseline la tabla odontogram_records tal como existe
--      en producción (CREATE TABLE IF NOT EXISTS — no falla si ya existe).
--   2. Agrega tres restricciones CHECK nuevas sobre las columnas status,
--      tooth_face y tooth_number.
--   3. Habilita RLS y define las políticas de acceso de odontólogos y admins.
--
-- IMPORTANTE: Esta migración NO debe aplicarse contra la base de datos
-- hasta recibir autorización explícita del usuario.
-- =============================================================================

-- ─── 1. Baseline de la tabla (creación condicional) ───────────────────────────

CREATE TABLE IF NOT EXISTS public.odontogram_records (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  uuid        NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  tooth_number integer    NOT NULL,
  tooth_face  text        NOT NULL,
  status      text        NOT NULL,
  notes       text,
  created_by  uuid        NOT NULL REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS si no estaba habilitado (idempotente)
ALTER TABLE public.odontogram_records ENABLE ROW LEVEL SECURITY;

-- ─── 2. CHECK constraint: status ─────────────────────────────────────────────
-- Doce valores clínicos válidos para el estado de un diente/cara aplicados
-- mediante restricción CHECK directa a nivel de base de datos.

ALTER TABLE public.odontogram_records
  ADD CONSTRAINT odontogram_records_status_check
  CHECK (status IN (
    'sano',
    'caries',
    'obturado',
    'corona',
    'extraido',
    'ausente',
    'implante',
    'endodoncia',
    'sellante',
    'fracturado',
    'puente_pontico',
    'protesis_removible'
  ));

-- ─── 3. CHECK constraint: tooth_face ─────────────────────────────────────────
-- Cinco caras anatómicas válidas según nomenclatura estándar.

ALTER TABLE public.odontogram_records
  ADD CONSTRAINT odontogram_records_tooth_face_check
  CHECK (tooth_face IN (
    'mesial',
    'distal',
    'vestibular',
    'lingual',
    'oclusal'
  ));

-- ─── 4. CHECK constraint: tooth_number (sistema FDI dentición permanente) ────
-- Permite únicamente los 32 códigos del sistema FDI para dentición permanente:
--   Cuadrante 1 (sup. derecho): 11–18
--   Cuadrante 2 (sup. izquierdo): 21–28
--   Cuadrante 3 (inf. izquierdo): 31–38
--   Cuadrante 4 (inf. derecho): 41–48
-- No se aceptan valores fuera de estos cuatro rangos de ocho dientes.

ALTER TABLE public.odontogram_records
  ADD CONSTRAINT odontogram_records_tooth_number_fdi_check
  CHECK (
    (tooth_number BETWEEN 11 AND 18)
    OR (tooth_number BETWEEN 21 AND 28)
    OR (tooth_number BETWEEN 31 AND 38)
    OR (tooth_number BETWEEN 41 AND 48)
  );

-- ─── 5. Políticas RLS (Odontólogos y Administradores) ─────────────────────────

-- SELECT: odontólogos y administradores pueden leer todos los registros de odontogramas
DROP POLICY IF EXISTS odontogram_records_select ON public.odontogram_records;
CREATE POLICY odontogram_records_select
  ON public.odontogram_records
  FOR SELECT
  USING (public.is_admin() OR public.is_odontologo());

-- INSERT: odontólogos y administradores pueden insertar registros de odontogramas
DROP POLICY IF EXISTS odontogram_records_insert ON public.odontogram_records;
CREATE POLICY odontogram_records_insert
  ON public.odontogram_records
  FOR INSERT
  WITH CHECK (
    (public.is_admin() OR public.is_odontologo())
    AND created_by = auth.uid()
  );

-- UPDATE: odontólogos y administradores pueden actualizar registros
DROP POLICY IF EXISTS odontogram_records_update ON public.odontogram_records;
CREATE POLICY odontogram_records_update
  ON public.odontogram_records
  FOR UPDATE
  USING (public.is_admin() OR public.is_odontologo());

-- DELETE: solo administradores pueden eliminar permanentemente registros del odontograma
DROP POLICY IF EXISTS odontogram_records_delete ON public.odontogram_records;
CREATE POLICY odontogram_records_delete
  ON public.odontogram_records
  FOR DELETE
  USING (public.is_admin());
