import React from "react"
import { getCurrentUserWithRole } from "@/shared/lib/supabase/auth"
import { redirect } from "next/navigation"
import { getAllDeletedDocuments, restorePatientDocument } from "@/domains/patients/documents/actions"
import TrashDashboard from "@/domains/patients/documents/components/TrashDashboard"

export const metadata = {
  title: "Papelera de Documentos - Consultorio Odontológico",
  description: "Auditoría general y recuperación de documentos clínicos.",
}

export default async function TrashPage() {
  const { user, profile, role } = await getCurrentUserWithRole()

  if (!user || !profile) {
    redirect("/login")
  }

  if (role !== "administrador") {
    redirect("/")
  }

  // — Cargar documentos eliminados ──────────────────────────────────────────
  const trashResult = await getAllDeletedDocuments()
  const initialDocuments = trashResult.success ? trashResult.data : []

  // — Wrapper para la acción de restauración del servidor ──────────────────
  async function handleRestore(documentId: string, patientId: string) {
    "use server"
    return restorePatientDocument(documentId, patientId)
  }

  return (
    <TrashDashboard
      initialDocuments={initialDocuments}
      onRestore={handleRestore}
    />
  )
}
