import React from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/shared/lib/supabase/server"
import { getFinancialReport } from "@/domains/reports/actions"
import ReportsDashboard from "@/domains/reports/components/ReportsDashboard"

export const metadata = {
  title: "Reportes Financieros - Consultorio Odontológico",
  description: "Reporte consolidado de agregación financiera y desglose de cobros.",
}

export default async function ReportsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Consultar perfil para comprobar el rol en tiempo real (mismo patrón que inventory)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "administrador") {
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
