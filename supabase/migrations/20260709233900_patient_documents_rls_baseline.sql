-- Migration: 20260709233900_patient_documents_rls_baseline.sql
-- Baseline retroactivo de seguridad para public.patient_documents.
-- Habilita RLS (idempotente: no falla si ya está habilitado) y crea
-- las cuatro políticas ya confirmadas en producción, protegidas contra
-- duplicados con bloques DO $$ ... EXCEPTION WHEN duplicate_object.

-- ─── Habilitar RLS ────────────────────────────────────────────────────────────
ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;

-- ─── Política: SELECT ─────────────────────────────────────────────────────────
DO $$
BEGIN
  CREATE POLICY read_documents
    ON public.patient_documents
    FOR SELECT
    USING (is_admin() OR is_odontologo());
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- La política ya existe en producción; se omite sin error.
END $$;

-- ─── Política: INSERT ─────────────────────────────────────────────────────────
DO $$
BEGIN
  CREATE POLICY insert_documents
    ON public.patient_documents
    FOR INSERT
    WITH CHECK (
      (is_admin() OR is_odontologo())
      AND (uploaded_by = auth.uid())
    );
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- ─── Política: UPDATE ─────────────────────────────────────────────────────────
DO $$
BEGIN
  CREATE POLICY update_documents
    ON public.patient_documents
    FOR UPDATE
    USING (is_admin() OR is_odontologo());
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- ─── Política: DELETE ─────────────────────────────────────────────────────────
DO $$
BEGIN
  CREATE POLICY delete_documents
    ON public.patient_documents
    FOR DELETE
    USING (is_admin());
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;
