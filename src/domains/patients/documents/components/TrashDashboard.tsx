"use client"

import React, { useMemo, useState } from "react"
import { Button } from "@/shared/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"
import type { ActionResult } from "@/domains/patients/documents/actions"

interface DeletedDocument {
  id: string
  document_type: string
  file_name: string
  file_path: string
  uploaded_by: string
  created_at: string
  bucket_id: string
  deleted_at: string
  deleted_by: string
  deleted_by_name: string | null
  patient_id: string
  patient_name: string
}

interface TrashDashboardProps {
  initialDocuments: DeletedDocument[]
  onRestore: (documentId: string, patientId: string) => Promise<ActionResult<null>>
}

// ─── Utilidad: formatear fecha legible ──────────────────────────────────────
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}

export default function TrashDashboard({
  initialDocuments,
  onRestore,
}: TrashDashboardProps) {
  const [documents, setDocuments] = useState<DeletedDocument[]>(initialDocuments)
  const [searchPatient, setSearchPatient] = useState("")
  const [searchDoc, setSearchDoc] = useState("")
  const [restoreLoading, setRestoreLoading] = useState<Record<string, boolean>>({})
  const [restoreErrors, setRestoreErrors] = useState<Record<string, string>>({})
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // — Filtro local reactivo sin re-fetch ──────────────────────────────────
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchPatient = doc.patient_name.toLowerCase().includes(searchPatient.toLowerCase())
      const matchDocName = doc.file_name.toLowerCase().includes(searchDoc.toLowerCase())
      const matchDocType = doc.document_type.toLowerCase().includes(searchDoc.toLowerCase())
      return matchPatient && (matchDocName || matchDocType)
    })
  }, [documents, searchPatient, searchDoc])

  // — Manejador: restaurar documento ────────────────────────────────────────
  async function handleRestore(docId: string, patientId: string, fileName: string) {
    setRestoreLoading((prev) => ({ ...prev, [docId]: true }))
    setRestoreErrors((prev) => ({ ...prev, [docId]: "" }))
    setSuccessMessage(null)

    const result = await onRestore(docId, patientId)

    setRestoreLoading((prev) => ({ ...prev, [docId]: false }))

    if (result.success) {
      setDocuments((prev) => prev.filter((d) => d.id !== docId))
      setSuccessMessage(`Documento "${fileName}" restaurado exitosamente.`)
    } else {
      setRestoreErrors((prev) => ({ ...prev, [docId]: result.error }))
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Papelera Global</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Historial de documentos clínicos y archivos eliminados de forma lógica en la plataforma.
        </p>
      </div>

      {/* Mensaje de éxito global */}
      {successMessage && (
        <div className="bg-teal-50 border border-teal-200 text-teal-700 rounded-lg px-4 py-3 text-sm shadow-xs">
          ✓ {successMessage}
        </div>
      )}

      {/* Buscador y filtros */}
      <Card className="bg-white border-border text-foreground shadow-sm">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="search-patient" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Filtrar por Paciente
              </label>
              <input
                id="search-patient"
                type="text"
                placeholder="Escribe el nombre del paciente..."
                value={searchPatient}
                onChange={(e) => setSearchPatient(e.target.value)}
                className="bg-white border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="search-doc" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Filtrar por Archivo / Tipo
              </label>
              <input
                id="search-doc"
                type="text"
                placeholder="Ej: consentimiento, pdf, radiografia..."
                value={searchDoc}
                onChange={(e) => setSearchDoc(e.target.value)}
                className="bg-white border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Listado de eliminados */}
      <Card className="bg-white border-border text-foreground shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground text-lg font-bold">Documentos Eliminados</CardTitle>
          <CardDescription className="text-muted-foreground">
            Lista de archivos clínicos marcados con borrado lógico.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredDocuments.length === 0 ? (
            <div className="bg-muted/10 border border-border rounded-lg p-8 text-center text-muted-foreground text-sm">
              No se encontraron documentos eliminados que coincidan con los filtros de búsqueda.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border shadow-xs">
              <table className="w-full border-collapse bg-white text-left text-sm text-foreground">
                <thead className="bg-muted/40 text-muted-foreground uppercase text-xs font-semibold border-b border-border">
                  <tr>
                    <th scope="col" className="px-6 py-4">Archivo</th>
                    <th scope="col" className="px-6 py-4">Tipo</th>
                    <th scope="col" className="px-6 py-4">Paciente</th>
                    <th scope="col" className="px-6 py-4">Eliminado Por / Fecha</th>
                    <th scope="col" className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-medium">
                  {filteredDocuments.map((doc) => (
                    <tr key={doc.id} className="hover:bg-muted/30 border-b border-border transition-colors">
                      <td className="px-6 py-4 min-w-[200px]">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-foreground text-sm font-semibold truncate max-w-[250px]" title={doc.file_name}>
                            {doc.file_name}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono select-all">
                            ID: {doc.id}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full font-semibold">
                          {doc.document_type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-foreground">{doc.patient_name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-foreground">
                            {doc.deleted_by_name ?? "Administrador"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(doc.deleted_at)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          <Button
                            id={`btn-restaurar-doc-global-${doc.id}`}
                            variant="outline"
                            className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 text-xs h-8 px-3 transition-all"
                            disabled={!!restoreLoading[doc.id]}
                            onClick={() => handleRestore(doc.id, doc.patient_id, doc.file_name)}
                          >
                            {restoreLoading[doc.id] ? "Restaurando…" : "Restaurar"}
                          </Button>
                          {restoreErrors[doc.id] && (
                            <span className="text-[11px] text-red-600 mt-1 max-w-[150px] text-right truncate">
                              {restoreErrors[doc.id]}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
