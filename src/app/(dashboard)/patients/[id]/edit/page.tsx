import React from "react"
import { getPatientById, updatePatient, type PatientInput } from "@/domains/patients/actions"
import PatientForm from "@/domains/patients/components/PatientForm"
import { createClient } from "@/shared/lib/supabase/server"
import { getAllowedBranches } from "@/domains/branches/session"

export const metadata = {
  title: "Editar Ficha de Paciente - Consultorio Odontológico",
  description: "Modificar los antecedentes e información de contacto.",
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditPatientPage({ params }: PageProps) {
  const { id } = await params
  const patient = await getPatientById(id)

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

  const handleUpdate = async (data: Partial<PatientInput>) => {
    "use server"
    return await updatePatient(id, data)
  }

  // Mapeamos para cumplir estrictamente con el tipo PatientInput
  const formInitialData = {
    id: patient.id,
    full_name: patient.full_name,
    document_id: patient.document_id,
    phone: patient.phone || "",
    email: patient.email || "",
    birth_date: patient.birth_date,
    address: patient.address || "",
    allergies: patient.allergies || "",
    diseases: patient.diseases || "",
    current_medications: patient.current_medications || "",
    medical_observations: patient.medical_observations || "",
    branch_id: patient.branch_id || "",
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Editar Paciente</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Modifica los antecedentes médicos o datos personales de la ficha.
        </p>
      </div>

      <PatientForm
        initialData={formInitialData}
        onSubmit={handleUpdate}
        allowedBranches={allowedBranches}
      />
    </div>
  )
}
