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
import type { ImagingType, PatientImageWithUrl, DeletedPatientImageRow } from "../types"
import type { ActionResult } from "../actions"

// ─── Catálogo de tipos de imagen ─────────────────────────────────────────────
const IMAGING_TYPES: { value: ImagingType; label: string }[] = [
  { value: "panoramica", label: "Panorámica" },
  { value: "periapical", label: "Periapical" },
  { value: "aleta_mordida", label: "Aleta de mordida" },
  { value: "oclusal", label: "Oclusal" },
  { value: "tomografia", label: "Tomografía (CBCT)" },
  { value: "otra", label: "Otra" },
]

interface PatientImagingProps {
  patientId: string
  initialImages: PatientImageWithUrl[]
  canDelete: boolean
  onUpload: (formData: FormData) => Promise<ActionResult<{ id: string; file_path: string }>>
  onDelete: (imageId: string) => Promise<ActionResult<null>>
  onGetDeletedImages: (patientId: string) => Promise<ActionResult<DeletedPatientImageRow[]>>
  onRestore: (imageId: string) => Promise<ActionResult<null>>
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

export default function PatientImaging({
  patientId,
  initialImages,
  canDelete,
  onUpload,
  onDelete,
  onGetDeletedImages,
  onRestore,
}: PatientImagingProps) {
  // — Estado del formulario de subida ─────────────────────────────────────
  const [imageType, setImageType] = useState<ImagingType>("panoramica")
  const [description, setDescription] = useState("")
  const [uploadStatus, setUploadStatus] = useState<
    | { type: "idle" }
    | { type: "loading" }
    | { type: "success"; message: string }
    | { type: "error"; message: string }
  >({ type: "idle" })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // — Estado del visor de imágenes (lightbox) ──────────────────────────────
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null)

  // — Estado de "Eliminar" por imagen ─────────────────────────────────────
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({})
  const [deleteLoading, setDeleteLoading] = useState<Record<string, boolean>>({})
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // — Estados de la papelera ───────────────────────────────────────────────
  const [isTrashOpen, setIsTrashOpen] = useState(false)
  const [deletedImages, setDeletedImages] = useState<DeletedPatientImageRow[]>([])
  const [trashLoading, setTrashLoading] = useState(false)
  const [trashError, setTrashError] = useState<string | null>(null)

  // — Estados individuales de restauración ─────────────────────────────────
  const [restoreLoading, setRestoreLoading] = useState<Record<string, boolean>>({})
  const [restoreErrors, setRestoreErrors] = useState<Record<string, string>>({})

  // — Manejador: subir imagen ───────────────────────────────────────────────
  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      setUploadStatus({ type: "error", message: "Por favor selecciona un archivo." })
      return
    }

    const formData = new FormData()
    formData.set("patient_id", patientId)
    formData.set("image_type", imageType)
    formData.set("description", description.trim())
    formData.set("file", file)

    setUploadStatus({ type: "loading" })

    const result = await onUpload(formData)

    if (result.success) {
      setUploadStatus({ type: "success", message: "Estudio de imagen subido correctamente." })
      setDescription("")
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } else {
      setUploadStatus({ type: "error", message: result.error })
    }
  }

  // — Manejador: confirmar y eliminar imagen ───────────────────────────────
  function handleDelete(imageId: string) {
    setConfirmDeleteId(imageId)
  }

  async function handleConfirmDelete() {
    if (!confirmDeleteId) return
    const imgId = confirmDeleteId
    setConfirmDeleteId(null)

    setDeleteLoading((prev) => ({ ...prev, [imgId]: true }))
    setDeleteErrors((prev) => ({ ...prev, [imgId]: "" }))

    const result = await onDelete(imgId)

    setDeleteLoading((prev) => ({ ...prev, [imgId]: false }))

    if (!result.success) {
      setDeleteErrors((prev) => ({ ...prev, [imgId]: result.error }))
    }
  }

  // — Manejador: abrir y cargar papelera ────────────────────────────────────
  async function handleOpenTrash() {
    setIsTrashOpen(true)
    setTrashLoading(true)
    setTrashError(null)

    const result = await onGetDeletedImages(patientId)

    setTrashLoading(false)
    if (result.success) {
      setDeletedImages(result.data)
    } else {
      setTrashError(result.error)
    }
  }

  // — Manejador: restaurar imagen ───────────────────────────────────────────
  async function handleRestore(imgId: string) {
    setRestoreLoading((prev) => ({ ...prev, [imgId]: true }))
    setRestoreErrors((prev) => ({ ...prev, [imgId]: "" }))

    const result = await onRestore(imgId)

    setRestoreLoading((prev) => ({ ...prev, [imgId]: false }))

    if (result.success) {
      setDeletedImages((prev) => prev.filter((img) => img.id !== imgId))
    } else {
      setRestoreErrors((prev) => ({ ...prev, [imgId]: result.error }))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Galería de imágenes ───────────────────────────────────────────── */}
      <Card className="bg-slate-900 border-slate-800 text-slate-100">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="flex flex-col gap-1.5">
            <CardTitle className="text-white text-lg">Estudios de Imagenología</CardTitle>
            <CardDescription className="text-slate-400">
              Radiografías, tomografías y registros visuales del paciente.
            </CardDescription>
          </div>
          {canDelete && (
            <Button
              id="btn-abrir-papelera-imagenes"
              variant="outline"
              className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-cyan-400 hover:border-cyan-500/30 text-xs h-8 px-3 transition-all"
              onClick={handleOpenTrash}
            >
              Papelera
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {initialImages.length === 0 ? (
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 text-sm text-slate-400 text-center">
              No hay imágenes ni radiografías cargadas para este paciente.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {initialImages.map((img) => {
                const label = IMAGING_TYPES.find(t => t.value === img.image_type)?.label || img.image_type
                return (
                  <div
                    key={img.id}
                    className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col group hover:border-slate-700 transition-all duration-300"
                  >
                    {/* Visualización del estudio */}
                    <div
                      className="relative h-44 bg-slate-900 flex items-center justify-center overflow-hidden cursor-pointer"
                      onClick={() => setPreviewImage({ url: img.signed_url, title: `${label} - ${img.file_name}` })}
                    >
                      {img.file_name.toLowerCase().endsWith(".pdf") ? (
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-4xl">📄</span>
                          <span className="text-xs text-slate-400 font-mono px-2 truncate max-w-full">
                            {img.file_name}
                          </span>
                        </div>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={img.signed_url}
                          alt={img.file_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      )}
                      <div className="absolute top-2 left-2 bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full backdrop-blur-sm">
                        {label}
                      </div>
                    </div>

                    {/* Información y acciones */}
                    <div className="p-4 flex flex-col gap-2 flex-grow">
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="text-white text-xs font-semibold font-mono truncate" title={img.file_name}>
                          {img.file_name}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {formatDate(img.created_at)}
                        </span>
                        {img.description && (
                          <p className="text-xs text-slate-400 italic line-clamp-2 mt-1">
                            &ldquo;{img.description}&rdquo;
                          </p>
                        )}
                        {deleteErrors[img.id] && (
                          <span className="text-xs text-red-400 mt-1">
                            {deleteErrors[img.id]}
                          </span>
                        )}
                      </div>

                      <div className="flex gap-2 mt-auto pt-2 border-t border-slate-900">
                        <Button
                          id={`btn-ver-imagen-${img.id}`}
                          variant="outline"
                          size="sm"
                          className="flex-1 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-cyan-400 text-xs h-7"
                          onClick={() => setPreviewImage({ url: img.signed_url, title: `${label} - ${img.file_name}` })}
                        >
                          Ver
                        </Button>
                        {canDelete && (
                          <Button
                            id={`btn-eliminar-imagen-${img.id}`}
                            variant="outline"
                            size="sm"
                            className="border-red-950/50 text-red-400 hover:bg-red-950/50 text-xs h-7"
                            disabled={!!deleteLoading[img.id]}
                            onClick={() => handleDelete(img.id)}
                          >
                            {deleteLoading[img.id] ? "..." : "Eliminar"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Formulario de subida ─────────────────────────────────────────── */}
      <Card className="bg-slate-900 border-slate-800 text-slate-100">
        <CardHeader>
          <CardTitle className="text-white text-lg">Cargar Estudio de Imagenología</CardTitle>
          <CardDescription className="text-slate-400">
            Sube radiografías panorámicas, tomografías u otros estudios clínicos. PDF o imágenes. Máximo 5 MB.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Tipo de estudio */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="image-type-input"
                  className="text-xs font-bold uppercase tracking-wider text-slate-400"
                >
                  Tipo de estudio
                </label>
                <select
                  id="image-type-input"
                  value={imageType}
                  onChange={(e) => setImageType(e.target.value as ImagingType)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                >
                  {IMAGING_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Archivo */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="image-file-input"
                  className="text-xs font-bold uppercase tracking-wider text-slate-400"
                >
                  Archivo
                </label>
                <input
                  id="image-file-input"
                  type="file"
                  ref={fileInputRef}
                  accept="image/*,application/pdf"
                  className="text-sm text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-300 hover:file:bg-slate-700 file:transition-colors cursor-pointer"
                />
              </div>
            </div>

            {/* Descripción / Notas */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="image-description-input"
                className="text-xs font-bold uppercase tracking-wider text-slate-400"
              >
                Descripción / Notas clínicas
              </label>
              <textarea
                id="image-description-input"
                placeholder="Indica observaciones específicas, pieza dental o hallazgos notables..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-colors resize-none"
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
                id="btn-subir-imagen"
                type="submit"
                disabled={uploadStatus.type === "loading"}
                className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadStatus.type === "loading" ? "Subiendo…" : "Subir estudio"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Lightbox / Visor de imagen */}
      <Dialog open={previewImage !== null} onOpenChange={(open) => { if (!open) setPreviewImage(null) }}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-4xl p-6">
          <DialogHeader>
            <DialogTitle className="text-white text-lg">{previewImage?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center bg-slate-950 rounded-lg overflow-hidden border border-slate-800 p-2 min-h-96 max-h-[70vh]">
            {previewImage?.url.includes(".pdf") || previewImage?.url.includes("/patient-images") && previewImage?.title.endsWith(".pdf") ? (
              <iframe
                src={previewImage?.url}
                className="w-full h-[60vh] border-0"
                title="Visor de PDF"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewImage?.url}
                alt="Estudio ampliado"
                className="max-w-full max-h-[60vh] object-contain"
              />
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
              onClick={() => {
                if (previewImage) {
                  window.open(previewImage.url, "_blank", "noopener,noreferrer")
                }
              }}
            >
              Abrir en pestaña nueva
            </Button>
            <Button
              className="bg-slate-800 text-white hover:bg-slate-750"
              onClick={() => setPreviewImage(null)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación de eliminación */}
      <Dialog open={confirmDeleteId !== null} onOpenChange={(open) => { if (!open) setConfirmDeleteId(null) }}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-white">Confirmar Eliminación</DialogTitle>
            <DialogDescription className="text-slate-400">
              La imagen clínica se marcará como eliminada y dejará de estar disponible en el expediente clínico activo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              id="btn-cancelar-eliminacion-imagen"
              variant="outline"
              className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
              onClick={() => setConfirmDeleteId(null)}
            >
              Cancelar
            </Button>
            <Button
              id="btn-confirmar-eliminacion-imagen"
              className="bg-red-600 hover:bg-red-700 text-white font-medium"
              onClick={handleConfirmDelete}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de la papelera de imágenes */}
      <Dialog open={isTrashOpen} onOpenChange={(open) => { if (!open) setIsTrashOpen(false) }}>
        <DialogContent id="modal-papelera-imagenes" className="bg-slate-900 border-slate-800 text-slate-100 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Imágenes Eliminadas</DialogTitle>
            <DialogDescription className="text-slate-400">
              Historial de estudios de imagenología borrados. Puedes restaurarlos en cualquier momento.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4">
            {trashLoading && (
              <div className="text-center py-8 text-sm text-slate-400">
                Cargando papelera…
              </div>
            )}

            {trashError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-lg px-3 py-2 text-sm">
                ✗ {trashError}
              </div>
            )}

            {!trashLoading && !trashError && deletedImages.length === 0 && (
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 text-sm text-slate-400 text-center">
                No hay imágenes en la papelera.
              </div>
            )}

            {!trashLoading && !trashError && deletedImages.length > 0 && (
              <ul className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">
                {deletedImages.map((img) => {
                  const label = IMAGING_TYPES.find(t => t.value === img.image_type)?.label || img.image_type
                  return (
                    <li
                      key={img.id}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-white text-sm font-semibold font-mono truncate">
                          {img.file_name}
                        </span>
                        <span className="text-xs text-cyan-400 font-medium">
                          {label}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Eliminado el {formatDate(img.deleted_at || "")} por {img.deleted_by_name ?? "Administrador"}
                        </span>
                        {restoreErrors[img.id] && (
                          <span className="text-xs text-red-400 mt-1">
                            {restoreErrors[img.id]}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center shrink-0">
                        <Button
                          id={`btn-restaurar-imagen-${img.id}`}
                          variant="outline"
                          className="border-emerald-900/50 text-emerald-400 hover:bg-emerald-950 hover:text-emerald-300 hover:border-emerald-500/30 text-xs h-8 px-3 transition-all"
                          disabled={!!restoreLoading[img.id]}
                          onClick={() => handleRestore(img.id)}
                        >
                          {restoreLoading[img.id] ? "Restaurando…" : "Restaurar"}
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
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
