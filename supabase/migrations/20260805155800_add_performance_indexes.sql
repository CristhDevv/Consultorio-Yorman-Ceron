-- ============================================================
-- MIGRACIÓN: add_performance_indexes
-- Fecha: 2026-08-05
-- Descripción: Crea índices de base de datos en las claves
--              foráneas críticas para optimizar las consultas
--              de búsqueda y filtrado a gran escala.
-- ============================================================

-- 1. Índices para la tabla public.patient_documents
CREATE INDEX IF NOT EXISTS idx_patient_documents_patient_id 
    ON public.patient_documents(patient_id);

-- 2. Índices para la tabla public.patient_images
CREATE INDEX IF NOT EXISTS idx_patient_images_patient_id 
    ON public.patient_images(patient_id);

-- 3. Índices para la tabla public.patient_payments
CREATE INDEX IF NOT EXISTS idx_patient_payments_patient_id 
    ON public.patient_payments(patient_id);

CREATE INDEX IF NOT EXISTS idx_patient_payments_appointment_id 
    ON public.patient_payments(appointment_id);

-- 4. Índices para la tabla public.communication_logs
CREATE INDEX IF NOT EXISTS idx_communication_logs_patient_id 
    ON public.communication_logs(patient_id);

CREATE INDEX IF NOT EXISTS idx_communication_logs_appointment_id 
    ON public.communication_logs(appointment_id);
