-- Migration: 20260806141500_update_register_inventory_movement.sql
-- Description: Update register_inventory_movement function to inherit branch_id from the affected product

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
    v_branch_id uuid;
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

    -- Bloquear fila del producto y obtener stock actual y sucursal
    SELECT current_stock, branch_id INTO v_current_stock, v_branch_id
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

    -- Insertar el movimiento en la tabla con la sucursal heredada del producto
    INSERT INTO public.inventory_movements (
        product_id,
        type,
        quantity,
        reason,
        created_by,
        branch_id
    ) VALUES (
        p_product_id,
        p_type,
        p_quantity,
        p_reason,
        p_user_id,
        v_branch_id
    );
END;
$$;
