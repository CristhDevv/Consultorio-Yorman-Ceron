-- Migration: 20260807204100_add_cost_price_to_inventory_products.sql
-- Description: Add cost_price column to inventory_products for expense calculations

ALTER TABLE public.inventory_products
ADD COLUMN IF NOT EXISTS cost_price numeric(12, 2) NOT NULL DEFAULT 0.00;
