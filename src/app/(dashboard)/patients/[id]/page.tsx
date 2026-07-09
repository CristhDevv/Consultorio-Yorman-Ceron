import React from "react"
import { getPatientById } from "@/domains/patients/actions"
import PatientDetailCard from "@/domains/patients/components/PatientDetailCard"

export const metadata = {
  title: "Detalle del Paciente - Consultorio Odontológico Yorman Cerón",
  description: "Ficha médica y expediente clínico de salud.",
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PatientDetailPage({ params }: PageProps) {
  const { id } = await params
  const patient = await getPatientById(id)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Expediente Médico</h1>
        <p className="text-slate-400 text-sm mt-1">
          Historial y ficha clínica detallada de salud.
        </p>
      </div>

      <PatientDetailCard patient={patient} />
    </div>
  )
}
