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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import type { ActionResult } from "@/domains/patients/documents/actions"

// ─── Tipos ──────────────────────────────────────────────────────────────────
interface DocumentRow {
  id: string
  document_type: string
  file_name: string
  file_path: string
  created_at: string
}

interface DeletedDocumentRow {
  id: string
  document_type: string
  file_name: string
  file_path: string
  created_at: string
  deleted_at: string | null
  deleted_by: string | null
  deleted_by_name: string | null
}

interface PatientDocumentsProps {
  patientId: string
  initialDocuments: DocumentRow[]
  canDelete: boolean
  onUpload: (formData: FormData) => Promise<ActionResult<{ id: string; file_path: string }>>
  onGetSignedUrl: (filePath: string) => Promise<ActionResult<{ signedUrl: string }>>
  onDelete: (documentId: string) => Promise<ActionResult<null>>
  onGetDeletedDocuments: (patientId: string) => Promise<ActionResult<DeletedDocumentRow[]>>
  onRestore: (documentId: string) => Promise<ActionResult<null>>
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
  onDelete,
  onGetDeletedDocuments,
  onRestore,
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

  // — Estado de "Eliminar" por documento ───────────────────────────────────
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({})
  const [deleteLoading, setDeleteLoading] = useState<Record<string, boolean>>({})

  // — Estado de confirmación de eliminación ───────────────────────────────
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // — Estados de la papelera ───────────────────────────────────────────────
  const [isTrashOpen, setIsTrashOpen] = useState(false)
  const [deletedDocs, setDeletedDocs] = useState<DeletedDocumentRow[]>([])
  const [trashLoading, setTrashLoading] = useState(false)
  const [trashError, setTrashError] = useState<string | null>(null)

  // — Estados individuales de restauración ─────────────────────────────────
  const [restoreLoading, setRestoreLoading] = useState<Record<string, boolean>>({})
  const [restoreErrors, setRestoreErrors] = useState<Record<string, string>>({})

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

  // — Manejador: eliminar documento ─────────────────────────────────────────
  function handleDelete(docId: string) {
    setConfirmDeleteId(docId)
  }

  async function handleConfirmDelete() {
    if (!confirmDeleteId) return
    const docId = confirmDeleteId
    setConfirmDeleteId(null)

    setDeleteLoading((prev) => ({ ...prev, [docId]: true }))
    setDeleteErrors((prev) => ({ ...prev, [docId]: "" }))

    const result = await onDelete(docId)

    setDeleteLoading((prev) => ({ ...prev, [docId]: false }))

    if (!result.success) {
      setDeleteErrors((prev) => ({ ...prev, [docId]: result.error }))
    }
  }

  // — Manejador: abrir y cargar papelera ────────────────────────────────────
  async function handleOpenTrash() {
    setIsTrashOpen(true)
    setTrashLoading(true)
    setTrashError(null)

    const result = await onGetDeletedDocuments(patientId)

    setTrashLoading(false)
    if (result.success) {
      setDeletedDocs(result.data)
    } else {
      setTrashError(result.error)
    }
  }

  // — Manejador: restaurar documento ────────────────────────────────────────
  async function handleRestore(docId: string) {
    setRestoreLoading((prev) => ({ ...prev, [docId]: true }))
    setRestoreErrors((prev) => ({ ...prev, [docId]: "" }))

    const result = await onRestore(docId)

    setRestoreLoading((prev) => ({ ...prev, [docId]: false }))

    if (result.success) {
      setDeletedDocs((prev) => prev.filter((d) => d.id !== docId))
    } else {
      setRestoreErrors((prev) => ({ ...prev, [docId]: result.error }))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Lista de documentos ──────────────────────────────────────────── */}
      <Card className="bg-white border-border text-foreground shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex flex-col gap-1.5">
            <CardTitle className="text-foreground text-lg font-bold">Documentos Adjuntos</CardTitle>
            <CardDescription className="text-muted-foreground">
              Archivos clínicos y administrativos vinculados al paciente.
            </CardDescription>
          </div>
          {canDelete && (
            <Button
              id="btn-abrir-papelera"
              variant="outline"
              className="border-border text-foreground hover:bg-muted text-xs h-8 px-3 transition-all"
              onClick={handleOpenTrash}
            >
              Papelera
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {initialDocuments.length === 0 ? (
            <div className="bg-muted/10 border border-border rounded-lg p-4 text-sm text-muted-foreground text-center">
              No hay documentos adjuntos para este paciente.
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {initialDocuments.map((doc) => (
                <li
                  key={doc.id}
                  className="bg-white border border-border rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs"
                >
                  {/* Información del documento */}
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-foreground text-sm font-semibold truncate">
                      {doc.file_name}
                    </span>
                    <span className="text-xs text-primary font-semibold">
                      {doc.document_type}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {formatDate(doc.created_at)}
                    </span>
                    {/* Error inline de "Ver" */}
                    {viewErrors[doc.id] && (
                      <span className="text-xs text-red-600 mt-1 font-medium">
                        {viewErrors[doc.id]}
                      </span>
                    )}
                    {/* Error inline de "Eliminar" */}
                    {deleteErrors[doc.id] && (
                      <span className="text-xs text-red-600 mt-1 font-medium">
                        {deleteErrors[doc.id]}
                      </span>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      id={`btn-ver-doc-${doc.id}`}
                      variant="outline"
                      className="border-border text-foreground hover:bg-muted text-xs h-8 px-3 transition-all"
                      disabled={!!viewLoading[doc.id]}
                      onClick={() => handleView(doc)}
                    >
                      {viewLoading[doc.id] ? "Cargando…" : "Ver"}
                    </Button>

                    {canDelete && (
                      <Button
                        id={`btn-eliminar-doc-${doc.id}`}
                        variant="outline"
                        className="border-red-200 text-red-655 hover:bg-red-50 hover:text-red-700 text-xs h-8 px-3 transition-all"
                        disabled={!!deleteLoading[doc.id]}
                        onClick={() => handleDelete(doc.id)}
                      >
                        {deleteLoading[doc.id] ? "Eliminando…" : "Eliminar"}
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
      <Card className="bg-white border-border text-foreground shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground text-lg font-bold">Subir Nuevo Documento</CardTitle>
          <CardDescription className="text-muted-foreground">
            Formatos permitidos: PDF, imágenes, Word, Excel y similares. Máximo 5 MB.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="flex flex-col gap-4">
            {/* Tipo de documento */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="document-type-input"
                className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
              >
                Tipo de documento
              </label>
              <input
                id="document-type-input"
                type="text"
                placeholder="Ej: Radiografía, Consentimiento, Historia clínica…"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="bg-white border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
              />
            </div>

            {/* Archivo */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="document-file-input"
                className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
              >
                Archivo
              </label>
              <input
                id="document-file-input"
                type="file"
                ref={fileInputRef}
                className="text-sm text-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-border file:text-xs file:font-semibold file:bg-white file:text-foreground hover:file:bg-muted file:transition-colors cursor-pointer"
              />
            </div>

            {/* Feedback de estado */}
            {uploadStatus.type === "success" && (
              <div className="bg-teal-50 border border-teal-200 text-teal-700 rounded-lg px-3 py-2 text-sm">
                ✓ {uploadStatus.message}
              </div>
            )}
            {uploadStatus.type === "error" && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
                ✗ {uploadStatus.message}
              </div>
            )}

            {/* Botón de envío */}
            <div className="flex justify-end">
              <Button
                id="btn-subir-documento"
                type="submit"
                disabled={uploadStatus.type === "loading"}
                className="bg-primary hover:bg-primary/90 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
              >
                {uploadStatus.type === "loading" ? "Subiendo…" : "Subir documento"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Modal de confirmación de eliminación */}
      <Dialog open={confirmDeleteId !== null} onOpenChange={(open) => { if (!open) setConfirmDeleteId(null) }}>
        <DialogContent className="bg-white border-border text-foreground shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground font-bold text-lg">Confirmar Eliminación</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              El documento dejará de estar disponible en el sistema de forma permanente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              id="btn-cancelar-eliminacion"
              variant="outline"
              className="border-border text-foreground hover:bg-muted"
              onClick={() => setConfirmDeleteId(null)}
            >
              Cancelar
            </Button>
            <Button
              id="btn-confirmar-eliminacion"
              className="bg-red-600 hover:bg-red-700 text-white font-medium"
              onClick={handleConfirmDelete}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de la papelera */}
      <Dialog open={isTrashOpen} onOpenChange={(open) => { if (!open) setIsTrashOpen(false) }}>
        <DialogContent id="modal-papelera" className="bg-white border-border text-foreground max-w-2xl shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground font-bold text-lg">Documentos Eliminados</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Historial de archivos borrados. Puedes restaurar cualquier documento de esta lista.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4">
            {trashLoading && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Cargando papelera…
              </div>
            )}

            {trashError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
                ✗ {trashError}
              </div>
            )}

            {!trashLoading && !trashError && deletedDocs.length === 0 && (
              <div className="bg-muted/10 border border-border rounded-lg p-6 text-sm text-muted-foreground text-center">
                No hay documentos en la papelera.
              </div>
            )}

            {!trashLoading && !trashError && deletedDocs.length > 0 && (
              <ul className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">
                {deletedDocs.map((doc) => (
                  <li
                    key={doc.id}
                    className="bg-white border border-border rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-foreground text-sm font-semibold truncate">
                        {doc.file_name}
                      </span>
                      <span className="text-xs text-primary font-medium">
                        {doc.document_type}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Eliminado el {formatDate(doc.deleted_at || "")} por {doc.deleted_by_name ?? "Administrador"}
                      </span>
                      {restoreErrors[doc.id] && (
                        <span className="text-xs text-red-650 mt-1 font-medium">
                          {restoreErrors[doc.id]}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center shrink-0">
                      <Button
                        id={`btn-restaurar-doc-${doc.id}`}
                        variant="outline"
                        className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 text-xs h-8 px-3 transition-all"
                        disabled={!!restoreLoading[doc.id]}
                        onClick={() => handleRestore(doc.id)}
                      >
                        {restoreLoading[doc.id] ? "Restaurando…" : "Restaurar"}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-border text-foreground hover:bg-muted"
              onClick={() => setIsTrashOpen(false)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
