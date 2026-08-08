import React from "react"
import { getCurrentUserWithRole } from "@/shared/lib/supabase/auth"
import { redirect } from "next/navigation"
import { getPatients } from "@/domains/patients/actions"
import {
  getExecutiveFinancialOverview,
  getAccountsReceivableList,
  getInventoryExpenseList,
} from "@/domains/finance/actions"
import FinanceDashboard from "@/domains/finance/components/FinanceDashboard"

export default async function FinancePage() {
  const { user, profile, role } = await getCurrentUserWithRole()

  if (!user || !profile) {
    redirect("/login")
  }

  const allowedRoles = ["administrador", "odontologo"]
  if (!role || !allowedRoles.includes(role)) {
    redirect("/portal")
  }

  // Cargar datos financieros en paralelo
  const [patientsData, metricsRes, receivableRes, expensesRes] = await Promise.all([
    getPatients(),
    getExecutiveFinancialOverview(),
    getAccountsReceivableList(),
    getInventoryExpenseList(),
  ])

  const defaultMetrics = {
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalExpenses: 0,
    monthlyExpenses: 0,
    netProfit: 0,
    monthlyNetProfit: 0,
    profitMargin: 0,
    totalAccountsReceivable: 0,
    pendingAppointmentsCount: 0,
    totalPaymentsCount: 0,
    cashFlow: 0,
  }

  const metrics = metricsRes.success ? metricsRes.data : defaultMetrics
  const accountsReceivable = receivableRes.success ? receivableRes.data : []
  const inventoryExpenses = expensesRes.success ? expensesRes.data : []

  const patients = patientsData.map((p) => ({
    id: p.id,
    full_name: p.full_name,
    document_id: p.document_id,
  }))

  return (
    <FinanceDashboard
      metrics={metrics}
      accountsReceivable={accountsReceivable}
      inventoryExpenses={inventoryExpenses}
      patients={patients}
    />
  )
}
