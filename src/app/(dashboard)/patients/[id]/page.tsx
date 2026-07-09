import React from "react"
import { getPatientById } from "@/domains/patients/actions"
import PatientDetailCard from "@/domains/patients/components/PatientDetailCard"
import { getOdontogramByPatient, createOdontogramRecord } from "@/domains/clinical/odontogram/actions"
import OdontogramChart, { type OdontogramRecord } from "@/domains/clinical/odontogram/components/OdontogramChart"

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

  const odontogramResult = await getOdontogramByPatient(id)
  const records: OdontogramRecord[] = odontogramResult.success && odontogramResult.data
    ? (odontogramResult.data as OdontogramRecord[])
    : []

  async function handleOdontogramSubmit(data: {
    tooth_number: number
    tooth_face: string | null
    status: string
    notes?: string
  }): Promise<{ success: boolean; error?: string }> {
    "use server"
    const result = await createOdontogramRecord({
      patient_id: id,
      tooth_number: data.tooth_number,
      tooth_face: data.tooth_face,
      status: data.status,
      notes: data.notes ?? null,
    })
    if (result.success) {
      return { success: true }
    }
    return { success: false, error: result.error }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Expediente Médico</h1>
        <p className="text-slate-400 text-sm mt-1">
          Historial y ficha clínica detallada de salud.
        </p>
      </div>

      <PatientDetailCard patient={patient} />

      <OdontogramChart
        records={records}
        onSelectionSubmit={handleOdontogramSubmit}
      />
    </div>
  )
}
