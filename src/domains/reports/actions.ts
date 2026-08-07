"use server"

import { createClient } from "@/shared/lib/supabase/server"
import { FinancialReportResponse } from "./types"
import { getCurrentUserWithRole } from "@/shared/lib/supabase/auth"
import { resolveActiveBranch } from "@/domains/branches/session"

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
  const { user, role } = await getCurrentUserWithRole()

  if (!user) {
    return { success: false, error: "No hay sesión activa. Por favor inicia sesión." }
  }

  const { activeBranchId } = await resolveActiveBranch(user.id, role || "")

  // 2. Call RPC get_financial_report with branch filter
  const { data, error: rpcError } = await supabase.rpc("get_financial_report", {
    p_date_from: dateFrom,
    p_date_to: dateTo,
    p_branch_id: activeBranchId || null,
  })

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
    data: data as unknown as FinancialReportResponse,
  }
}
