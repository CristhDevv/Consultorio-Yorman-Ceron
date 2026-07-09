-- ============================================================
-- MIGRACIÓN: alter_appointments_v2
-- Fecha: 2026-07-06
-- Descripción: Adapta la tabla public.appointments a la especificación
--              final del módulo Agenda:
--              - Renombra scheduled_at → starts_at
--              - Agrega columna reason (nullable)
--              - Habilita btree_gist y agrega restricción de exclusión
--                de solapamiento por dentista (excluyendo cancelada/no_asistio)
-- ============================================================

-- 1. Habilitar extensión btree_gist (necesaria para EXCLUDE con tstzrange)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. Renombrar scheduled_at → starts_at
ALTER TABLE public.appointments
  RENAME COLUMN scheduled_at TO starts_at;

-- 3. Agregar columna reason (nullable, antes de notes)
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS reason text;

-- 4. Restricción de exclusión: impide solapamiento de citas del mismo
--    dentista, exceptuando las citas canceladas o no_asistio.
--
--    La restricción compara el rango temporal [starts_at, starts_at + duration_minutes)
--    usando el operador && (solapamiento) de tstzrange.
--    La condición WHERE filtra fuera las citas inactivas para que no bloqueen el horario.
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_no_overlap
  EXCLUDE USING gist (
    dentist_id WITH =,
    tstzrange(
      starts_at,
      starts_at + (duration_minutes * interval '1 minute'),
      '[)'
    ) WITH &&
  )
  WHERE (status NOT IN ('cancelada', 'no_asistio'));
