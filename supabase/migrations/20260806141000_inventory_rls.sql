-- Migration: 20260806141000_inventory_rls.sql
-- Description: Replaces RLS policies on inventory_products and inventory_movements with branch-aware policies

-- Drop existing policies on inventory_products
DROP POLICY IF EXISTS select_inventory_products ON public.inventory_products;
DROP POLICY IF EXISTS insert_inventory_products ON public.inventory_products;
DROP POLICY IF EXISTS update_inventory_products ON public.inventory_products;
DROP POLICY IF EXISTS delete_inventory_products ON public.inventory_products;

-- Drop existing policies on inventory_movements
DROP POLICY IF EXISTS select_inventory_movements ON public.inventory_movements;
DROP POLICY IF EXISTS insert_inventory_movements ON public.inventory_movements;

-- RLS Policies for inventory_products
CREATE POLICY select_inventory_products ON public.inventory_products
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR (
    public.is_odontologo()
    AND (
      branch_id IS NULL
      OR branch_id IN (
        SELECT branch_id FROM public.dentist_branches WHERE dentist_id = auth.uid()
      )
    )
  )
);

CREATE POLICY insert_inventory_products ON public.inventory_products
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
  AND (
    branch_id IS NULL
    OR branch_id IN (
      SELECT id FROM public.branches WHERE is_active = true
    )
  )
);

CREATE POLICY update_inventory_products ON public.inventory_products
FOR UPDATE
TO authenticated
USING (
  public.is_admin()
)
WITH CHECK (
  public.is_admin()
  AND (
    branch_id IS NULL
    OR branch_id IN (
      SELECT id FROM public.branches WHERE is_active = true
    )
  )
);

CREATE POLICY delete_inventory_products ON public.inventory_products
FOR DELETE
TO authenticated
USING (
  public.is_admin()
);

-- RLS Policies for inventory_movements
CREATE POLICY select_inventory_movements ON public.inventory_movements
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR (
    public.is_odontologo()
    AND (
      branch_id IS NULL
      OR branch_id IN (
        SELECT branch_id FROM public.dentist_branches WHERE dentist_id = auth.uid()
      )
    )
  )
);

CREATE POLICY insert_inventory_movements ON public.inventory_movements
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
  AND created_by = auth.uid()
  AND (
    branch_id IS NULL
    OR branch_id IN (
      SELECT id FROM public.branches WHERE is_active = true
    )
  )
);
