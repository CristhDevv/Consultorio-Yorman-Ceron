"use client"

import React, { useRef, useState } from "react"
import { Button } from "@/shared/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"
import type { ActionResult } from "@/domains/patients/documents/actions"

// ─── Tipos ──────────────────────────────────────────────────────────────────
interface DocumentRow {
  id: string
  document_type: string
  file_name: string
  file_path: string
  created_at: string
}

interface PatientDocumentsProps {
  patientId: string
  initialDocuments: DocumentRow[]
  canDelete: boolean
  onUpload: (formData: FormData) => Promise<ActionResult<{ id: string; file_path: string }>>
  onGetSignedUrl: (filePath: string) => Promise<ActionResult<{ signedUrl: string }>>
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

// ═══════════════════════════════════════════════════════════════════════════
// PatientDocuments
// ═══════════════════════════════════════════════════════════════════════════
export default function PatientDocuments({
  patientId,
  initialDocuments,
  canDelete,
  onUpload,
  onGetSignedUrl,
}: PatientDocumentsProps) {
  // — Estado del formulario de subida ─────────────────────────────────────
  const [documentType, setDocumentType] = useState("")
  const [uploadStatus, setUploadStatus] = useState<
    | { type: "idle" }
    | { type: "loading" }
    | { type: "success"; message: string }
    | { type: "error"; message: string }
  >({ type: "idle" })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // — Estado de "Ver" por documento ────────────────────────────────────────
  const [viewErrors, setViewErrors] = useState<Record<string, string>>({})
  const [viewLoading, setViewLoading] = useState<Record<string, boolean>>({})

  // — Manejador: subir documento ────────────────────────────────────────────
  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      setUploadStatus({ type: "error", message: "Por favor selecciona un archivo." })
      return
    }
    if (!documentType.trim()) {
      setUploadStatus({ type: "error", message: "Por favor ingresa el tipo de documento." })
      return
    }

    const formData = new FormData()
    formData.set("patient_id", patientId)
    formData.set("document_type", documentType.trim())
    formData.set("file", file)

    setUploadStatus({ type: "loading" })

    const result = await onUpload(formData)

    if (result.success) {
      setUploadStatus({ type: "success", message: "Documento subido correctamente." })
      setDocumentType("")
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } else {
      setUploadStatus({ type: "error", message: result.error })
    }
  }

  // — Manejador: ver documento (URL firmada) ─────────────────────────────
  async function handleView(doc: DocumentRow) {
    setViewLoading((prev) => ({ ...prev, [doc.id]: true }))
    setViewErrors((prev) => ({ ...prev, [doc.id]: "" }))

    const result = await onGetSignedUrl(doc.file_path)

    setViewLoading((prev) => ({ ...prev, [doc.id]: false }))

    if (result.success) {
      window.open(result.data.signedUrl, "_blank", "noopener,noreferrer")
    } else {
      setViewErrors((prev) => ({ ...prev, [doc.id]: result.error }))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Lista de documentos ──────────────────────────────────────────── */}
      <Card className="bg-slate-900 border-slate-800 text-slate-100">
        <CardHeader>
          <CardTitle className="text-white text-lg">Documentos Adjuntos</CardTitle>
          <CardDescription className="text-slate-400">
            Archivos clínicos y administrativos vinculados al paciente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {initialDocuments.length === 0 ? (
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-sm text-slate-400 text-center">
              No hay documentos adjuntos para este paciente.
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {initialDocuments.map((doc) => (
                <li
                  key={doc.id}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  {/* Información del documento */}
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-white text-sm font-semibold truncate">
                      {doc.file_name}
                    </span>
                    <span className="text-xs text-cyan-400 font-medium">
                      {doc.document_type}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {formatDate(doc.created_at)}
                    </span>
                    {/* Error inline de "Ver" */}
                    {viewErrors[doc.id] && (
                      <span className="text-xs text-red-400 mt-1">
                        {viewErrors[doc.id]}
                      </span>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      id={`btn-ver-doc-${doc.id}`}
                      variant="outline"
                      className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-cyan-400 hover:border-cyan-500/30 text-xs h-8 px-3 transition-all"
                      disabled={!!viewLoading[doc.id]}
                      onClick={() => handleView(doc)}
                    >
                      {viewLoading[doc.id] ? "Cargando…" : "Ver"}
                    </Button>

                    {canDelete && (
                      <Button
                        id={`btn-eliminar-doc-${doc.id}`}
                        variant="outline"
                        className="border-slate-800 text-slate-600 text-xs h-8 px-3 cursor-not-allowed"
                        disabled
                        title="Función no disponible aún"
                      >
                        Próximamente
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── Formulario de subida ─────────────────────────────────────────── */}
      <Card className="bg-slate-900 border-slate-800 text-slate-100">
        <CardHeader>
          <CardTitle className="text-white text-lg">Subir Nuevo Documento</CardTitle>
          <CardDescription className="text-slate-400">
            Formatos permitidos: PDF, imágenes, Word, Excel y similares. Máximo 5 MB.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="flex flex-col gap-4">
            {/* Tipo de documento */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="document-type-input"
                className="text-xs font-bold uppercase tracking-wider text-slate-400"
              >
                Tipo de documento
              </label>
              <input
                id="document-type-input"
                type="text"
                placeholder="Ej: Radiografía, Consentimiento, Historia clínica…"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
              />
            </div>

            {/* Archivo */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="document-file-input"
                className="text-xs font-bold uppercase tracking-wider text-slate-400"
              >
                Archivo
              </label>
              <input
                id="document-file-input"
                type="file"
                ref={fileInputRef}
                className="text-sm text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-300 hover:file:bg-slate-700 file:transition-colors cursor-pointer"
              />
            </div>

            {/* Feedback de estado */}
            {uploadStatus.type === "success" && (
              <div className="bg-teal-500/10 border border-teal-500/20 text-teal-300 rounded-lg px-3 py-2 text-sm">
                ✓ {uploadStatus.message}
              </div>
            )}
            {uploadStatus.type === "error" && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-lg px-3 py-2 text-sm">
                ✗ {uploadStatus.message}
              </div>
            )}

            {/* Botón de envío */}
            <div className="flex justify-end">
              <Button
                id="btn-subir-documento"
                type="submit"
                disabled={uploadStatus.type === "loading"}
                className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadStatus.type === "loading" ? "Subiendo…" : "Subir documento"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
