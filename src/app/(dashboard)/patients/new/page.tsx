import React from "react"
import { createPatient, type PatientInput } from "@/domains/patients/actions"
import PatientForm from "@/domains/patients/components/PatientForm"

export const metadata = {
  title: "Nuevo Paciente - Consultorio Odontológico Yorman Cerón",
  description: "Registrar una nueva ficha médica en el sistema.",
}

export default function NewPatientPage() {
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

      <PatientForm onSubmit={handleCreate} />
    </div>
  )
}
