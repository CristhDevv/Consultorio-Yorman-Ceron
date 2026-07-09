-- ============================================================
-- MIGRACIÓN: create_appointments_table
-- Fecha: 2026-07-06
-- Descripción: Tabla de citas odontológicas con RLS, índices
--              y trigger de updated_at
-- ============================================================

-- 1. Función genérica reutilizable para actualizar updated_at
--    (SECURITY DEFINER no necesario aquí — solo manipula NEW)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 2. Tabla de citas
CREATE TABLE public.appointments (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       uuid        NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  dentist_id       uuid        NOT NULL REFERENCES auth.users(id),
  scheduled_at     timestamptz NOT NULL,
  duration_minutes integer     NOT NULL DEFAULT 30,
  status           text        NOT NULL DEFAULT 'programada'
                               CHECK (status IN ('programada','confirmada','completada','cancelada','no_asistio')),
  notes            text,
  created_by       uuid        NOT NULL REFERENCES auth.users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- 3. Índices de rendimiento
CREATE INDEX idx_appointments_patient_id   ON public.appointments(patient_id);
CREATE INDEX idx_appointments_dentist_id   ON public.appointments(dentist_id);
CREATE INDEX idx_appointments_scheduled_at ON public.appointments(scheduled_at);

-- 4. Trigger para actualizar updated_at automáticamente en cada UPDATE
CREATE TRIGGER trg_appointments_set_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 5. Habilitar RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS (mismo patrón que patients, usando funciones SECURITY DEFINER)

-- SELECT: odontólogos y administradores pueden leer todas las citas
-- Riesgo RLS: ninguno — is_admin() e is_odontologo() usan SECURITY DEFINER,
-- no recursividad ni lectura de datos mutables por el cliente.
CREATE POLICY appointments_select
  ON public.appointments
  FOR SELECT
  USING (public.is_admin() OR public.is_odontologo());

-- INSERT: odontólogos y administradores pueden crear citas
-- WITH CHECK: created_by debe ser el usuario autenticado (anti-suplantación de auditoría)
CREATE POLICY appointments_insert
  ON public.appointments
  FOR INSERT
  WITH CHECK (
    (public.is_admin() OR public.is_odontologo())
    AND created_by = auth.uid()
  );

-- UPDATE: odontólogos y administradores pueden modificar citas existentes
CREATE POLICY appointments_update
  ON public.appointments
  FOR UPDATE
  USING (public.is_admin() OR public.is_odontologo());

-- DELETE: solo administradores pueden eliminar citas permanentemente
CREATE POLICY appointments_delete
  ON public.appointments
  FOR DELETE
  USING (public.is_admin());
