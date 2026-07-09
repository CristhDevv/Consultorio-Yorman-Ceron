-- ============================================================
-- MIGRACIÓN: add_dentist_profiles_fkey
-- Fecha: 2026-07-06
-- Descripción: Agrega una foreign key adicional sobre la columna
--              dentist_id hacia la tabla public.profiles.id,
--              permitiendo que PostgREST resuelva el join
--              nativamente hacia los perfiles de los odontólogos.
-- ============================================================

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_dentist_id_profiles_fkey
  FOREIGN KEY (dentist_id)
  REFERENCES public.profiles(id);
