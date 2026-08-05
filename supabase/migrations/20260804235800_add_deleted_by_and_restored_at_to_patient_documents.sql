-- Migration: 20260804235800_add_deleted_by_and_restored_at_to_patient_documents.sql
-- Agrega columnas deleted_by (quien eliminó) y restored_at (fecha de restauración) a patient_documents.

ALTER TABLE public.patient_documents
ADD COLUMN deleted_by uuid NULL DEFAULT NULL,
ADD COLUMN restored_at timestamp with time zone NULL DEFAULT NULL,
ADD CONSTRAINT patient_documents_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES auth.users(id);
