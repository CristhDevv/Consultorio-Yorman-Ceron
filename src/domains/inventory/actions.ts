"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/shared/lib/supabase/server"
import { Database } from "@/shared/types/database.types"
import { getCurrentUserWithRole } from "@/shared/lib/supabase/auth"
import { resolveActiveBranch } from "@/domains/branches/session"
import { ALL_BRANCHES_VALUE } from "@/domains/branches/constants"

export type InventoryProduct = Database["public"]["Tables"]["inventory_products"]["Row"]

// ─── Tipo de retorno compartido ───────────────────────────────────────────────
export type ActionResult<T = null> =
  | { success: true; data: T }
  | { success: false; error: string; availableStock?: number }

// ═══════════════════════════════════════════════════════════════════════════
// 1. getInventoryProducts
// ═══════════════════════════════════════════════════════════════════════════
export async function getInventoryProducts(): Promise<InventoryProduct[]> {
  const supabase = await createClient()

  const { user, role } = await getCurrentUserWithRole()

  let query = supabase
    .from("inventory_products")
    .select("*")

  if (user && role) {
    const { activeBranchId } = await resolveActiveBranch(user.id, role)
    if (activeBranchId && activeBranchId !== ALL_BRANCHES_VALUE) {
      query = query.eq("branch_id", activeBranchId)
    }
  }

  const { data, error } = await query.order("name", { ascending: true })

  if (error) {
    throw new Error(`Error al obtener productos del inventario: ${error.message}`)
  }

  return data || []
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. registerInventoryMovement
// ═══════════════════════════════════════════════════════════════════════════
export type MovementInput = {
  productId: string
  type: "entrada" | "salida"
  quantity: number
  reason: string // vacío permitido — motivo es opcional en la BD
}

export type MovementSuccess = {
  productName: string
  type: "entrada" | "salida"
  quantity: number
}

export async function registerInventoryMovement(
  input: MovementInput
): Promise<ActionResult<MovementSuccess>> {
  const supabase = await createClient()

  // — Validar sesión ─────────────────────────────────────────────────────────
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: "No hay sesión activa. Por favor inicia sesión." }
  }

  // — Validar rol administrador en tiempo real contra public.profiles ────────
  // Mismo patrón que deletePatientDocument: nunca se confía únicamente en RLS
  // ni en el guard interno de la función RPC.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profileError || profile?.role !== "administrador") {
    return {
      success: false,
      error: "Acceso denegado. Solo los administradores pueden registrar movimientos de inventario.",
    }
  }

  // — Validaciones de input client-side (defensa adicional) ──────────────────
  if (!input.productId) {
    return { success: false, error: "Debe seleccionar un producto." }
  }
  if (!input.type || !(["entrada", "salida"] as const).includes(input.type)) {
    return { success: false, error: "El tipo de movimiento debe ser \"entrada\" o \"salida\"." }
  }
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    return { success: false, error: "La cantidad debe ser un número entero mayor que cero." }
  }

  // — Obtener nombre del producto para la confirmación (solo SELECT, nunca mutación) ─
  const { data: product, error: productError } = await supabase
    .from("inventory_products")
    .select("name")
    .eq("id", input.productId)
    .single()

  if (productError || !product) {
    return { success: false, error: "El producto seleccionado no existe en el inventario." }
  }

  // — Invocar la función RPC exclusivamente. Nunca INSERT/UPDATE directo. ────
  const { error: rpcError } = await supabase.rpc("register_inventory_movement", {
    p_product_id: input.productId,
    p_type:       input.type,
    p_quantity:   input.quantity,
    p_reason:     input.reason || "",
    p_user_id:    user.id,
  })

  if (rpcError) {
    // Detectar error de stock insuficiente del RPC:
    // El mensaje es: "Stock insuficiente para realizar la salida. Disponible: X, Solicitado: Y."
    const insufficientMatch = rpcError.message.match(
      /Stock insuficiente.*Disponible:\s*(\d+)/i
    )
    if (insufficientMatch) {
      const availableStock = parseInt(insufficientMatch[1], 10)
      return {
        success: false,
        error: `Stock insuficiente. No se puede realizar la salida.`,
        availableStock,
      }
    }
    return { success: false, error: rpcError.message }
  }

  revalidatePath("/inventory")

  return {
    success: true,
    data: {
      productName: product.name,
      type:        input.type,
      quantity:    input.quantity,
    },
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. createInventoryProduct
// ═══════════════════════════════════════════════════════════════════════════
export type ProductInput = {
  name: string
  unit: string
  minStock: number
  currentStock: number
  branchId: string
}

export async function createInventoryProduct(
  input: ProductInput
): Promise<ActionResult<InventoryProduct>> {
  const supabase = await createClient()

  // — Validar sesión ─────────────────────────────────────────────────────────
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: "No hay sesión activa. Por favor inicia sesión." }
  }

  // — Validar rol administrador en tiempo real contra public.profiles ────────
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profileError || profile?.role !== "administrador") {
    return {
      success: false,
      error: "Acceso denegado. Solo los administradores pueden crear nuevos productos en el inventario.",
    }
  }

  // — Validaciones de input (defensa adicional) ──────────────────────────────
  if (!input.name || input.name.trim() === "") {
    return { success: false, error: "El nombre del producto no puede estar vacío." }
  }
  if (!input.unit || input.unit.trim() === "") {
    return { success: false, error: "Debe especificar una unidad de medida (ej: Unidades, Cajas)." }
  }
  if (!Number.isInteger(input.minStock) || input.minStock < 0) {
    return { success: false, error: "El stock mínimo debe ser un número entero mayor o igual a cero." }
  }
  if (!Number.isInteger(input.currentStock) || input.currentStock < 0) {
    return { success: false, error: "El stock inicial debe ser un número entero mayor o igual a cero." }
  }

  // — Insertar producto en la base de datos ──────────────────────────────────
  const { data, error } = await supabase
    .from("inventory_products")
    .insert({
      name: input.name.trim(),
      unit: input.unit.trim(),
      min_stock: input.minStock,
      current_stock: input.currentStock,
      created_by: user.id,
      branch_id: input.branchId,
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/inventory")

  return {
    success: true,
    data: data as InventoryProduct,
  }
}
