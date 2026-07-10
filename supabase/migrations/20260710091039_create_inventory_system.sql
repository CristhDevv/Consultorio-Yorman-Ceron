-- Migration: Create inventory tables, function and RLS policies
-- ─── 1. Crear Tablas ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.inventory_products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    unit text NOT NULL,
    min_stock integer NOT NULL DEFAULT 0,
    current_stock integer NOT NULL DEFAULT 0,
    created_by uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT inventory_products_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
    CONSTRAINT inventory_products_stock_check CHECK (min_stock >= 0 AND current_stock >= 0)
);

CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL,
    type text NOT NULL,
    quantity integer NOT NULL,
    reason text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT inventory_movements_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.inventory_products(id),
    CONSTRAINT inventory_movements_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
    CONSTRAINT inventory_movements_type_check CHECK (type IN ('entrada', 'salida')),
    CONSTRAINT inventory_movements_quantity_check CHECK (quantity > 0)
);

-- ─── 2. Habilitar RLS ──────────────────────────────────────────────────────────

ALTER TABLE public.inventory_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- ─── 3. Políticas RLS para inventory_products ─────────────────────────────────

CREATE POLICY select_inventory_products 
    ON public.inventory_products
    FOR SELECT 
    USING (is_admin() OR is_odontologo());

CREATE POLICY insert_inventory_products 
    ON public.inventory_products
    FOR INSERT 
    WITH CHECK (is_admin());

CREATE POLICY update_inventory_products 
    ON public.inventory_products
    FOR UPDATE 
    USING (is_admin());

CREATE POLICY delete_inventory_products 
    ON public.inventory_products
    FOR DELETE 
    USING (is_admin());

-- ─── 4. Políticas RLS para inventory_movements ────────────────────────────────

CREATE POLICY select_inventory_movements 
    ON public.inventory_movements
    FOR SELECT 
    USING (is_admin() OR is_odontologo());

CREATE POLICY insert_inventory_movements 
    ON public.inventory_movements
    FOR INSERT 
    WITH CHECK (is_admin() AND created_by = auth.uid());

-- ─── 5. Función de Registro de Movimientos ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.register_inventory_movement(
    p_product_id uuid,
    p_type text,
    p_quantity integer,
    p_reason text,
    p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_current_stock integer;
BEGIN
    -- Validar rol de administrador
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Solo un administrador puede registrar movimientos de inventario.';
    END IF;

    -- Validar cantidad
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'La cantidad debe ser mayor que cero.';
    END IF;

    -- Validar tipo de movimiento
    IF p_type NOT IN ('entrada', 'salida') THEN
        RAISE EXCEPTION 'Tipo de movimiento inválido: %. Debe ser "entrada" o "salida".', p_type;
    END IF;

    -- Bloquear fila del producto y obtener stock actual
    SELECT current_stock INTO v_current_stock
    FROM public.inventory_products
    WHERE id = p_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Producto con ID % no existe en el inventario.', p_product_id;
    END IF;

    -- Si es salida, verificar stock suficiente
    IF p_type = 'salida' THEN
        IF v_current_stock < p_quantity THEN
            RAISE EXCEPTION 'Stock insuficiente para realizar la salida. Disponible: %, Solicitado: %.', v_current_stock, p_quantity;
        END IF;

        -- Actualizar stock restando cantidad
        UPDATE public.inventory_products
        SET current_stock = current_stock - p_quantity,
            updated_at = now()
        WHERE id = p_product_id;
    ELSE
        -- Actualizar stock sumando cantidad
        UPDATE public.inventory_products
        SET current_stock = current_stock + p_quantity,
            updated_at = now()
        WHERE id = p_product_id;
    END IF;

    -- Insertar el movimiento en la tabla
    INSERT INTO public.inventory_movements (
        product_id,
        type,
        quantity,
        reason,
        created_by
    ) VALUES (
        p_product_id,
        p_type,
        p_quantity,
        p_reason,
        p_user_id
    );
END;
$$;

-- ─── 6. Permisos de Ejecución de la Función ───────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.register_inventory_movement FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_inventory_movement TO authenticated;
