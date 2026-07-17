import React from "react"
import { createClient } from "@/shared/lib/supabase/server"
import { redirect } from "next/navigation"
import { getPatients } from "@/domains/patients/actions"
import FinanceDashboard from "@/domains/finance/components/FinanceDashboard"

export default async function FinancePage() {
  const supabase = await createClient()

  // 1. Session verification
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // 2. Real-time role check (security block)
  // Permite acceso a administradores y odontólogos, pero no a pacientes.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const allowedRoles = ["administrador", "odontologo"]
  if (!profile || !allowedRoles.includes(profile.role)) {
    redirect("/portal")
  }

  // 3. Load all patients to populate the autocomplete filter
  const patientsData = await getPatients()

  // Mapear solo los campos necesarios para pasar un payload optimizado
  const patients = patientsData.map((p) => ({
    id: p.id,
    full_name: p.full_name,
    document_id: p.document_id,
  }))

  return (
    <FinanceDashboard
      patients={patients}
    />
  )
}
