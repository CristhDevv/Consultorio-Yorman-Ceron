import React from "react"
import { createPatient, type PatientInput } from "@/domains/patients/actions"
import PatientForm from "@/domains/patients/components/PatientForm"
import { createClient } from "@/shared/lib/supabase/server"
import { resolveActiveBranch, getAllowedBranches } from "@/domains/branches/session"

export const metadata = {
  title: "Nuevo Paciente - Consultorio Odontológico",
  description: "Registrar una nueva ficha médica en el sistema.",
}

export default async function NewPatientPage() {
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

  const handleCreate = async (data: PatientInput) => {
    "use server"
    return await createPatient(data)
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Registrar Paciente</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Crea una nueva ficha clínica básica rellenando el siguiente expediente.
        </p>
      </div>

      <PatientForm
        onSubmit={handleCreate}
        allowedBranches={allowedBranches}
        defaultBranchId={resolvedBranch.activeBranchId}
      />
    </div>
  )
}
