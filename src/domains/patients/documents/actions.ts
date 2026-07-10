"use server"

import { revalidatePath } from "next/cache"
import { randomUUID } from "crypto"
import { createClient } from "@/shared/lib/supabase/server"

// ─── Blocklist de extensiones y mimetypes peligrosos ───────────────────────
const BLOCKED_EXTENSIONS = new Set([
  ".exe", ".sh", ".bat", ".cmd", ".msi", ".ps1",
  ".js",  ".vbs", ".jar", ".com", ".scr", ".hta",
  ".pif", ".reg", ".cpl", ".dll",
])

const BLOCKED_MIMETYPES = new Set([
  "application/x-msdownload",
  "application/x-msdos-program",
  "application/x-sh",
  "application/x-shellscript",
  "text/javascript",
  "application/javascript",
  "application/x-javascript",
  "application/x-jar",
  "application/java-archive",
  "application/vnd.microsoft.portable-executable",
  "application/x-ms-installer",
  "application/x-msi",
])

const BUCKET = "patient-attachments"
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

// ─── Utilidad: sanitizar nombre de archivo ──────────────────────────────────
function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9.\-_]/g, "")
    .replace(/-+/g, "-")
}

// ─── Tipos de retorno ────────────────────────────────────────────────────────
export type ActionResult<T = null> =
  | { success: true; data: T }
  | { success: false; error: string }

// ═══════════════════════════════════════════════════════════════════════════
// 1. uploadPatientDocument
// ═══════════════════════════════════════════════════════════════════════════
export async function uploadPatientDocument(
  formData: FormData
): Promise<ActionResult<{ id: string; file_path: string }>> {
  const supabase = await createClient()

  // — Validar sesión ────────────────────────────────────────────────────────
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: "No hay sesión activa. Por favor inicia sesión." }
  }

  // — Extraer campos del FormData ───────────────────────────────────────────
  const patientId    = formData.get("patient_id") as string | null
  const documentType = formData.get("document_type") as string | null
  const file         = formData.get("file") as File | null

  if (!patientId || !documentType || !file || file.size === 0) {
    return {
      success: false,
      error: "Faltan campos requeridos: patient_id, document_type y file.",
    }
  }

  // — Validar extensión ────────────────────────────────────────────────────
  const lastDot   = file.name.lastIndexOf(".")
  const extension = lastDot !== -1 ? file.name.slice(lastDot).toLowerCase() : ""

  if (BLOCKED_EXTENSIONS.has(extension)) {
    return {
      success: false,
      error: `El tipo de archivo "${extension}" no está permitido por razones de seguridad.`,
    }
  }

  // — Validar mimetype ─────────────────────────────────────────────────────
  const mimeType = file.type.toLowerCase()

  if (BLOCKED_MIMETYPES.has(mimeType)) {
    return {
      success: false,
      error: `El tipo MIME "${file.type}" no está permitido por razones de seguridad.`,
    }
  }

  // — Validar tamaño (5 MB) ────────────────────────────────────────────────
  if (file.size > MAX_SIZE_BYTES) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(2)
    return {
      success: false,
      error: `El archivo pesa ${sizeMB} MB. El tamaño máximo permitido es 5 MB.`,
    }
  }

  // — Generar file_path ────────────────────────────────────────────────────
  const sanitized = sanitizeFileName(file.name)
  const filePath  = `${patientId}/${randomUUID()}-${sanitized}`

  // — Subir a Storage ───────────────────────────────────────────────────────
  const arrayBuffer = await file.arrayBuffer()
  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    })

  if (storageError) {
    return {
      success: false,
      error: `Error al subir el archivo: ${storageError.message}`,
    }
  }

  // — Insertar fila en patient_documents ────────────────────────────────────
  const { data: doc, error: insertError } = await supabase
    .from("patient_documents")
    .insert({
      patient_id:    patientId,
      document_type: documentType,
      file_path:     filePath,
      file_name:     file.name,       // nombre original sin sanitizar, para mostrar al usuario
      uploaded_by:   user.id,
      bucket_id:     BUCKET,
    })
    .select("id, file_path")
    .single()

  if (insertError) {
    // — Rollback: eliminar archivo huérfano de Storage ──────────────────────
    await supabase.storage.from(BUCKET).remove([filePath])

    return {
      success: false,
      error: `El archivo se subió pero no se pudo registrar en la base de datos: ${insertError.message}. Se ha eliminado el archivo para evitar datos huérfanos.`,
    }
  }

  revalidatePath(`/patients/${patientId}`)

  return { success: true, data: { id: doc.id, file_path: doc.file_path } }
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. getPatientDocuments
// ═══════════════════════════════════════════════════════════════════════════
export async function getPatientDocuments(
  patientId: string
): Promise<ActionResult<Array<{
  id: string
  document_type: string
  file_name: string
  file_path: string
  uploaded_by: string
  created_at: string
  bucket_id: string
}>>> {
  const supabase = await createClient()

  // — Validar sesión ────────────────────────────────────────────────────────
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: "No hay sesión activa. Por favor inicia sesión." }
  }

  const { data, error } = await supabase
    .from("patient_documents")
    .select("id, document_type, file_name, file_path, uploaded_by, created_at, bucket_id")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })

  if (error) {
    return {
      success: false,
      error: `No se pudieron obtener los documentos: ${error.message}`,
    }
  }

  return { success: true, data: data ?? [] }
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. getDocumentSignedUrl
// ═══════════════════════════════════════════════════════════════════════════
export async function getDocumentSignedUrl(
  filePath: string
): Promise<ActionResult<{ signedUrl: string }>> {
  const supabase = await createClient()

  // — Validar sesión ────────────────────────────────────────────────────────
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: "No hay sesión activa. Por favor inicia sesión." }
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, 60) // 60 segundos de expiración

  if (error || !data?.signedUrl) {
    return {
      success: false,
      error: `No se pudo generar la URL firmada: ${error?.message ?? "respuesta vacía"}`,
    }
  }

  return { success: true, data: { signedUrl: data.signedUrl } }
}
