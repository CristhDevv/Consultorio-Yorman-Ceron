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
  getDeletedPatientDocuments,
  restorePatientDocument,
} from "@/domains/patients/documents/actions"
import PatientDocuments from "@/domains/patients/documents/components/PatientDocuments"
import {
  getPatientImages,
  uploadPatientImage,
  deletePatientImage,
  getDeletedPatientImages,
  restorePatientImage,
} from "@/domains/imaging/actions"
import PatientImaging from "@/domains/imaging/components/PatientImaging"
import PaymentHistoryView from "@/domains/finance/components/PaymentHistoryView"

export const metadata = {
  title: "Detalle del Paciente - Consultorio Odontológico",
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

  // — Imágenes del paciente ─────────────────────────────────────────────────
  const imagesResult = await getPatientImages(id)
  const initialImages = imagesResult.success ? imagesResult.data : []

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

  async function handleGetDeletedDocuments() {
    "use server"
    return getDeletedPatientDocuments(id)
  }

  async function handleRestore(documentId: string) {
    "use server"
    return restorePatientDocument(documentId, id)
  }

  async function handleUploadImage(formData: FormData) {
    "use server"
    return uploadPatientImage(formData)
  }

  async function handleDeleteImage(imageId: string) {
    "use server"
    return deletePatientImage(imageId, id)
  }

  async function handleGetDeletedImages() {
    "use server"
    return getDeletedPatientImages(id)
  }

  async function handleRestoreImage(imageId: string) {
    "use server"
    return restorePatientImage(imageId, id)
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
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Expediente Médico</h1>
        <p className="text-muted-foreground text-sm mt-1">
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
        onGetDeletedDocuments={handleGetDeletedDocuments}
        onRestore={handleRestore}
      />

      <PatientImaging
        patientId={id}
        initialImages={initialImages}
        canDelete={canDelete}
        onUpload={handleUploadImage}
        onDelete={handleDeleteImage}
        onGetDeletedImages={handleGetDeletedImages}
        onRestore={handleRestoreImage}
      />

      {/* Historial Financiero Consolidado */}
      <div className="border-t border-border pt-6">
        <h2 className="text-xl font-bold text-foreground mb-4">Expediente Financiero</h2>
        <PaymentHistoryView
          patientId={id}
          patientName={patient.full_name}
        />
      </div>
    </div>
  )
}
