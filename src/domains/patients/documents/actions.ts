"use server"

import { revalidatePath } from "next/cache"
import { randomUUID } from "crypto"
import { createClient } from "@/shared/lib/supabase/server"
import { getCurrentUserWithRole } from "@/shared/lib/supabase/auth"
import { resolveActiveBranch } from "@/domains/branches/session"

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

  // — Validar sesión y obtener sucursal activa ─────────────────────────────
  const { user, role } = await getCurrentUserWithRole()

  if (!user) {
    return { success: false, error: "No hay sesión activa. Por favor inicia sesión." }
  }

  const { activeBranchId } = await resolveActiveBranch(user.id, role ?? "")
  if (!activeBranchId) {
    return { success: false, error: "No tienes una sucursal activa asignada. Contacta al administrador." }
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
      file_name:     file.name,
      uploaded_by:   user.id,
      bucket_id:     BUCKET,
      branch_id:     activeBranchId,
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
    .is("deleted_at", null)
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

  // — Validar rol de administrador en tiempo real ──────────────────────────
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profileError || profile?.role !== "administrador") {
    return {
      success: false,
      error: "Acceso denegado. Solo los administradores pueden generar URLs firmadas para ver o descargar documentos.",
    }
  }

  // — Validar existencia y disponibilidad del archivo en la BD ─────────────
  // file_path no tiene constraint de unicidad en el esquema físico (se genera con UUID de forma única por lógica de negocio)
  const { data: docRow, error: fetchError } = await supabase
    .from("patient_documents")
    .select("id")
    .eq("file_path", filePath)
    .is("deleted_at", null)
    .maybeSingle()

  if (fetchError || !docRow) {
    return {
      success: false,
      error: "El documento no existe o no está disponible.",
    }
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

// ═══════════════════════════════════════════════════════════════════════════
// 4. deletePatientDocument
// ═══════════════════════════════════════════════════════════════════════════
export async function deletePatientDocument(
  documentId: string,
  patientId: string
): Promise<ActionResult<null>> {
  const supabase = await createClient()

  // — Validar sesión ────────────────────────────────────────────────────────
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: "No hay sesión activa. Por favor inicia sesión." }
  }

  // — Validar rol de administrador en tiempo real ──────────────────────────
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profileError || profile?.role !== "administrador") {
    return {
      success: false,
      error: "Acceso denegado. Solo los administradores pueden eliminar documentos.",
    }
  }

  // — Obtener la fila real de la BD ─────────────────────────────────────────
  // Nunca se confía en un id/path recibido del cliente.
  const { data: docRow, error: fetchError } = await supabase
    .from("patient_documents")
    .select("id")
    .eq("id", documentId)
    .is("deleted_at", null)
    .single()

  if (fetchError || !docRow) {
    return {
      success: false,
      error: "El documento no existe o no tienes permiso para eliminarlo.",
    }
  }

  // — Soft-delete: marcar la fila como eliminada en patient_documents ───────
  const { error: deleteError } = await supabase
    .from("patient_documents")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
    })
    .eq("id", documentId)

  if (deleteError) {
    return {
      success: false,
      error: `No se pudo marcar el documento como eliminado: ${deleteError.message}.`,
    }
  }

  revalidatePath(`/patients/${patientId}`)

  return { success: true, data: null }
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. getDeletedPatientDocuments
// ═══════════════════════════════════════════════════════════════════════════
export async function getDeletedPatientDocuments(
  patientId: string
): Promise<ActionResult<Array<{
  id: string
  document_type: string
  file_name: string
  file_path: string
  uploaded_by: string
  created_at: string
  bucket_id: string
  deleted_at: string | null
  deleted_by: string | null
  deleted_by_name: string | null
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

  // — Validar rol de administrador en tiempo real ──────────────────────────
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profileError || profile?.role !== "administrador") {
    return {
      success: false,
      error: "Acceso denegado. Solo los administradores pueden consultar documentos eliminados.",
    }
  }

  const { data, error } = await supabase
    .from("patient_documents")
    .select("id, document_type, file_name, file_path, uploaded_by, created_at, bucket_id, deleted_at, deleted_by")
    .eq("patient_id", patientId)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false })

  if (error) {
    return {
      success: false,
      error: `No se pudieron obtener los documentos eliminados: ${error.message}`,
    }
  }

  if (!data || data.length === 0) {
    return { success: true, data: [] }
  }

  // — Resolver nombres de perfiles evitando IN vacío ─────────────────────────
  const adminIds = Array.from(new Set(data.map(d => d.deleted_by).filter((id): id is string => !!id)))

  let profileMap = new Map<string, string | null>()
  if (adminIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", adminIds)

    profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) ?? [])
  }

  // — Mapear y retornar con tipo de retorno explícito ────────────────────────
  const mappedData = data.map(d => ({
    id: d.id,
    document_type: d.document_type,
    file_name: d.file_name,
    file_path: d.file_path,
    uploaded_by: d.uploaded_by,
    created_at: d.created_at,
    bucket_id: d.bucket_id,
    deleted_at: d.deleted_at,
    deleted_by: d.deleted_by,
    deleted_by_name: d.deleted_by ? (profileMap.get(d.deleted_by) ?? null) : null
  }))

  return { success: true, data: mappedData }
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. restorePatientDocument
// ═══════════════════════════════════════════════════════════════════════════
export async function restorePatientDocument(
  documentId: string,
  patientId: string
): Promise<ActionResult<null>> {
  const supabase = await createClient()

  // — Validar sesión ────────────────────────────────────────────────────────
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: "No hay sesión activa. Por favor inicia sesión." }
  }

  // — Validar rol de administrador en tiempo real ──────────────────────────
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profileError || profile?.role !== "administrador") {
    return {
      success: false,
      error: "Acceso denegado. Solo los administradores pueden restaurar documentos.",
    }
  }

  // — Verificar existencia del documento eliminado ─────────────────────────
  const { data: docRow, error: fetchError } = await supabase
    .from("patient_documents")
    .select("id")
    .eq("id", documentId)
    .not("deleted_at", "is", null)
    .single()

  if (fetchError || !docRow) {
    return {
      success: false,
      error: "El documento no existe o no está en la papelera para ser restaurado.",
    }
  }

  // — Restaurar documento: null en deleted_at, registrar restored_at ────────
  const { error: updateError } = await supabase
    .from("patient_documents")
    .update({
      deleted_at: null,
      restored_at: new Date().toISOString(),
    })
    .eq("id", documentId)

  if (updateError) {
    return {
      success: false,
      error: `No se pudo restaurar el documento: ${updateError.message}.`,
    }
  }

  revalidatePath(`/patients/${patientId}`)

  return { success: true, data: null }
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. getAllDeletedDocuments
// ═══════════════════════════════════════════════════════════════════════════
export async function getAllDeletedDocuments(): Promise<
  ActionResult<
    Array<{
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
    }>
  >
> {
  const supabase = await createClient()

  // — Validar sesión ────────────────────────────────────────────────────────
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: "No hay sesión activa. Por favor inicia sesión." }
  }

  // — Validar rol de administrador en tiempo real ──────────────────────────
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profileError || profile?.role !== "administrador") {
    return {
      success: false,
      error: "Acceso denegado. Solo los administradores pueden consultar la papelera global.",
    }
  }

  const { data, error } = await supabase
    .from("patient_documents")
    .select(`
      id,
      document_type,
      file_name,
      file_path,
      uploaded_by,
      created_at,
      bucket_id,
      deleted_at,
      deleted_by,
      patient_id,
      patients (
        full_name
      )
    `)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false })

  if (error) {
    return {
      success: false,
      error: `No se pudieron obtener los documentos eliminados: ${error.message}`,
    }
  }

  if (!data || data.length === 0) {
    return { success: true, data: [] }
  }

  // Resolver nombres de perfiles
  const adminIds = Array.from(new Set(data.map(d => d.deleted_by).filter((id): id is string => !!id)))

  let profileMap = new Map<string, string | null>()
  if (adminIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", adminIds)

    profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) ?? [])
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mappedData = data.map((d: any) => {
    const patientName = d.patients?.full_name || "Paciente desconocido"
    return {
      id: d.id,
      document_type: d.document_type,
      file_name: d.file_name,
      file_path: d.file_path,
      uploaded_by: d.uploaded_by,
      created_at: d.created_at,
      bucket_id: d.bucket_id,
      deleted_at: d.deleted_at,
      deleted_by: d.deleted_by,
      deleted_by_name: d.deleted_by ? (profileMap.get(d.deleted_by) ?? null) : null,
      patient_id: d.patient_id,
      patient_name: patientName,
    }
  })

  return { success: true, data: mappedData }
}

