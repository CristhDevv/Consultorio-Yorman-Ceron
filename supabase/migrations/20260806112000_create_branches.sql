-- Migration: 20260806112000_create_branches.sql
-- Description: Create branches and dentist_branches tables, and add branch_id column to existing tables

CREATE TABLE IF NOT EXISTS public.branches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    address text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dentist_branches (
    dentist_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    PRIMARY KEY (dentist_id, branch_id)
);

-- Enable RLS on branches and dentist_branches
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dentist_branches ENABLE ROW LEVEL SECURITY;

-- Add branch_id uuid column referencing public.branches(id) to target tables
ALTER TABLE public.patients ADD COLUMN branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.appointments ADD COLUMN branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.inventory_products ADD COLUMN branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.inventory_movements ADD COLUMN branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.patient_payments ADD COLUMN branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.patient_images ADD COLUMN branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.patient_documents ADD COLUMN branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.communication_logs ADD COLUMN branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
