import React from "react"
import { getPatients } from "@/domains/patients/actions"
import PatientTable from "@/domains/patients/components/PatientTable"

export const metadata = {
  title: "Listado de Pacientes - Consultorio Odontológico Yorman Cerón",
  description: "Búsqueda y gestión de fichas clínicas de pacientes.",
}

export default async function PatientsPage() {
  const patients = await getPatients()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Pacientes</h1>
        <p className="text-slate-400 text-sm mt-1">
          Busca, visualiza y gestiona las fichas clínicas de tus pacientes.
        </p>
      </div>

      <PatientTable initialPatients={patients} />
    </div>
  )
}
