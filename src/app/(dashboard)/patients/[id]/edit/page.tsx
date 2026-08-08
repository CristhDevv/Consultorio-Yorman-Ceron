import React from "react"
import Link from "next/link"
import { getPatientById, updatePatient, type PatientInput } from "@/domains/patients/actions"
import PatientForm from "@/domains/patients/components/PatientForm"
import { getCurrentUserWithRole } from "@/shared/lib/supabase/auth"
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

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 max-w-md mx-auto">
        <div className="bg-white border border-border text-foreground text-center p-8 rounded-2xl shadow-sm w-full">
          <h2 className="text-xl font-bold text-foreground mb-2">Paciente No Encontrado</h2>
          <p className="text-sm text-muted-foreground mb-6">
            El expediente del paciente que intentas editar no existe o ha sido eliminado.
          </p>
          <Link href="/patients">
            <button className="bg-primary hover:bg-primary/90 text-white font-semibold px-4 py-2.5 rounded-lg text-sm w-full transition-colors">
              Volver al Directorio de Pacientes
            </button>
          </Link>
        </div>
      </div>
    )
  }

  const { user, role } = await getCurrentUserWithRole()

  const allowedBranches = user ? await getAllowedBranches(user.id, role || "") : []

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
