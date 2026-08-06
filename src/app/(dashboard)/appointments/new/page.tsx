import React from "react"
import { getPatients } from "@/domains/patients/actions"
import { createClient } from "@/shared/lib/supabase/server"
import { resolveActiveBranch, getAllowedBranches } from "@/domains/branches/session"
import AppointmentForm from "@/domains/appointments/components/AppointmentForm"

export const metadata = {
  title: "Nueva Cita - Consultorio Odontológico",
  description: "Programar una nueva cita odontológica.",
}

export default async function NewAppointmentPage() {
  const patients = await getPatients()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let role = ""
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()
    role = profile?.role || ""
  }

  const allowedBranches = user ? await getAllowedBranches(user.id, role) : []
  const resolvedBranch = user ? await resolveActiveBranch(user.id, role) : { activeBranchId: null }

  const { data: dentistsData, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "odontologo")
    .order("full_name")

  if (error) {
    console.error("Error fetching dentists:", error)
  }

  const dentists = dentistsData || []

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Programar Cita</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Completa el formulario secuencial para agendar una nueva cita médica.
        </p>
      </div>

      <AppointmentForm
        patients={patients}
        dentists={dentists}
        allowedBranches={allowedBranches}
        defaultBranchId={resolvedBranch.activeBranchId}
      />
    </div>
  )
}
