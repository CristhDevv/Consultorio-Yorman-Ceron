-- Migration: 20260807160000_branch_id_not_null.sql
-- Description: Create initial branches, associate dentist, clean null values, and alter branch_id to NOT NULL

-- 1. Insert branches
INSERT INTO public.branches (name, is_active)
VALUES ('Sucursal Timbio', true);

INSERT INTO public.branches (name, is_active)
VALUES ('Sucursal La Fonda', true);

-- 2. Associate dentist Gabriel Mosquera with both branches
INSERT INTO public.dentist_branches (dentist_id, branch_id)
SELECT '21b7f1ec-1661-45ec-a5a5-6f297518eac7', id
FROM public.branches
WHERE name IN ('Sucursal Timbio', 'Sucursal La Fonda');

-- 3. Update patients to Sucursal Timbio
UPDATE public.patients
SET branch_id = (SELECT id FROM public.branches WHERE name = 'Sucursal Timbio')
WHERE id IN ('e8f5e5cf-4658-47fa-a80a-6fa2345d7fea', 'b705b9bc-a988-4d90-9e5d-25dd49d92119');

-- 4. Update appointments to Sucursal Timbio
UPDATE public.appointments
SET branch_id = (SELECT id FROM public.branches WHERE name = 'Sucursal Timbio')
WHERE id = '10a3a9cf-89a6-4fc6-b221-a09fb4ec2ac1';

-- 5. Alter branch_id to NOT NULL in target tables
ALTER TABLE public.patients ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE public.appointments ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE public.inventory_products ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE public.inventory_movements ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE public.patient_payments ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE public.patient_documents ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE public.patient_images ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE public.communication_logs ALTER COLUMN branch_id SET NOT NULL;
