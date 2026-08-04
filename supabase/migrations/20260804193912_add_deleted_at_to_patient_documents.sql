-- Migration: 20260804193912_add_deleted_at_to_patient_documents.sql
-- Agrega columna de borrado lógico (soft delete) a patient_documents.

ALTER TABLE public.patient_documents
ADD COLUMN deleted_at timestamptz NULL DEFAULT NULL;
