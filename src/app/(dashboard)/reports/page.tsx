import React from "react"
import { redirect } from "next/navigation"
import { getCurrentUserWithRole } from "@/shared/lib/supabase/auth"
import { getFinancialReport } from "@/domains/reports/actions"
import ReportsDashboard from "@/domains/reports/components/ReportsDashboard"

export const metadata = {
  title: "Reportes Financieros - Consultorio Odontológico",
  description: "Reporte consolidado de agregación financiera y desglose de cobros.",
}

export default async function ReportsPage() {
  const { user, profile, role } = await getCurrentUserWithRole()

  if (!user || !profile) {
    redirect("/login")
  }

  if (role !== "administrador") {
    redirect("/")
  }

  // Server Action wrapper inline
  async function handleFetchReport(dateFrom: string, dateTo: string) {
    "use server"
    return getFinancialReport(dateFrom, dateTo)
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Reportes Financieros</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Indicadores globales de agregación, facturación y reverso de cobros.
        </p>
      </div>

      <ReportsDashboard onFetchReport={handleFetchReport} />
    </div>
  )
}
