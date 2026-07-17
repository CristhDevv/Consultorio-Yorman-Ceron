import React from "react"
import { createClient } from "@/shared/lib/supabase/server"
import { getPatientById } from "@/domains/patients/actions"
import PatientDetailCard from "@/domains/patients/components/PatientDetailCard"
import { getOdontogramByPatient, createOdontogramRecord } from "@/domains/clinical/odontogram/actions"
import OdontogramChart, { type OdontogramRecord } from "@/domains/clinical/odontogram/components/OdontogramChart"
import {
  getPatientDocuments,
  uploadPatientDocument,
  getDocumentSignedUrl,
  deletePatientDocument,
} from "@/domains/patients/documents/actions"
import PatientDocuments from "@/domains/patients/documents/components/PatientDocuments"
import PaymentHistoryView from "@/domains/finance/components/PaymentHistoryView"

export const metadata = {
  title: "Detalle del Paciente - Consultorio Odontológico Yorman Cerón",
  description: "Ficha médica y expediente clínico de salud.",
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PatientDetailPage({ params }: PageProps) {
  const { id } = await params

  // — Datos del paciente ────────────────────────────────────────────────────
  const patient = await getPatientById(id)

  // — Odontograma ───────────────────────────────────────────────────────────
  const odontogramResult = await getOdontogramByPatient(id)
  const records: OdontogramRecord[] = odontogramResult.success && odontogramResult.data
    ? (odontogramResult.data as OdontogramRecord[])
    : []

  // — Rol del usuario actual (mismo patrón que dashboard layout) ────────────
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()
    : { data: null }

  const canDelete = profile?.role === "administrador"

  // — Documentos del paciente ───────────────────────────────────────────────
  const documentsResult = await getPatientDocuments(id)
  const initialDocuments = documentsResult.success ? documentsResult.data : []

  // — Server Action wrappers inline ─────────────────────────────────────────
  async function handleUpload(formData: FormData) {
    "use server"
    return uploadPatientDocument(formData)
  }

  async function handleGetSignedUrl(filePath: string) {
    "use server"
    return getDocumentSignedUrl(filePath)
  }

  async function handleDelete(documentId: string) {
    "use server"
    return deletePatientDocument(documentId, id)
  }

  // — Server Action wrapper para el odontograma (sin cambios) ───────────────
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

      <PatientDocuments
        patientId={id}
        initialDocuments={initialDocuments}
        canDelete={canDelete}
        onUpload={handleUpload}
        onGetSignedUrl={handleGetSignedUrl}
        onDelete={handleDelete}
      />

      {/* Historial Financiero Consolidado */}
      <div className="border-t border-slate-800 pt-6">
        <h2 className="text-xl font-bold text-white mb-4">Expediente Financiero</h2>
        <PaymentHistoryView
          patientId={id}
          patientName={patient.full_name}
        />
      </div>
    </div>
  )
}
