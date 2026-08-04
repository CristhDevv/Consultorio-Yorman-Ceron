"use server"

import { createClient } from "@/shared/lib/supabase/server"
import { FinancialReportResponse } from "./types"

export type ActionResult<T = null> =
  | { success: true; data: T }
  | { success: false; error: string }

/**
 * Server Action to fetch financial aggregation report by date range.
 * Validates session and calls the get_financial_report RPC.
 * Only administrators are authorized.
 */
export async function getFinancialReport(
  dateFrom: string,
  dateTo: string
): Promise<ActionResult<FinancialReportResponse>> {
  const supabase = await createClient()

  // 1. Session verification
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: "No hay sesión activa. Por favor inicia sesión." }
  }

  // Interfaz local para extender el tipado de supabase.rpc con la nueva función get_financial_report
  type SupabaseClientWithReport = Omit<typeof supabase, "rpc"> & {
    rpc(
      relation: "get_financial_report",
      args: { p_date_from: string; p_date_to: string }
    ): Promise<{ data: unknown; error: { message: string } | null }>
  }

  // 2. Call RPC get_financial_report
  // NOTA: Se castea temporalmente el cliente al tipo SupabaseClientWithReport para declarar
  // la firma de la nueva función RPC. Esto mantiene el tipado estático del resto del cliente,
  // evita el uso de 'any' y permite que el contrato sea seguro en TypeScript.
  const { data, error: rpcError } = await (supabase as unknown as SupabaseClientWithReport).rpc(
    "get_financial_report",
    {
      p_date_from: dateFrom,
      p_date_to: dateTo,
    }
  )

  if (rpcError) {
    if (
      rpcError.message.includes("Acceso denegado") ||
      rpcError.message.includes("permission denied")
    ) {
      return {
        success: false,
        error: "Acceso denegado. Solo los administradores pueden consultar reportes financieros.",
      }
    }
    return { success: false, error: rpcError.message }
  }

  return {
    success: true,
    data: data as FinancialReportResponse,
  }
}
