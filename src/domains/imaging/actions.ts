"use server"

import { revalidatePath } from "next/cache"
import { randomUUID } from "crypto"
import { createClient } from "@/shared/lib/supabase/server"
import { getCurrentUserWithRole } from "@/shared/lib/supabase/auth"
import type { ImagingType, DeletedPatientImageRow, PatientImageWithUrl } from "./types"

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

const BUCKET = "patient-images"
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
// 1. uploadPatientImage
// ═══════════════════════════════════════════════════════════════════════════
export async function uploadPatientImage(
  formData: FormData
): Promise<ActionResult<{ id: string; file_path: string }>> {
  const supabase = await createClient()

  // — Validar sesión y obtener sucursal activa ─────────────────────────────
  const { user } = await getCurrentUserWithRole()

  if (!user) {
    return { success: false, error: "No hay sesión activa. Por favor inicia sesión." }
  }

  // — Extraer campos del FormData ───────────────────────────────────────────
  const patientId   = formData.get("patient_id") as string | null
  const imageType   = formData.get("image_type") as ImagingType | null
  const description = formData.get("description") as string | null
  const file        = formData.get("file") as File | null

  if (!patientId || !imageType || !file || file.size === 0) {
    return {
      success: false,
      error: "Faltan campos requeridos: patient_id, image_type y file.",
    }
  }

  // — Obtener la sucursal del paciente directamente de la base de datos ─────
  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .select("branch_id")
    .eq("id", patientId)
    .single()

  if (patientError || !patient) {
    return {
      success: false,
      error: `No se pudo obtener la información del paciente: ${patientError?.message || "Paciente no encontrado"}.`,
    }
  }

  const activeBranchId = patient.branch_id

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
      error: `Error al subir la imagen: ${storageError.message}`,
    }
  }

  // — Insertar fila en patient_images ────────────────────────────────────
  const { data: img, error: insertError } = await supabase
    .from("patient_images")
    .insert({
      patient_id:   patientId,
      image_type:   imageType,
      description:  description ? description.trim() : null,
      file_path:    filePath,
      file_name:    file.name,
      uploaded_by:  user.id,
      bucket_id:    BUCKET,
      branch_id:    activeBranchId,
    })
    .select("id, file_path")
    .single()

  if (insertError) {
    // — Rollback: eliminar archivo huérfano de Storage ──────────────────────
    await supabase.storage.from(BUCKET).remove([filePath])

    return {
      success: false,
      error: `La imagen se subió pero no se pudo registrar en la base de datos: ${insertError.message}. Se ha eliminado el archivo para evitar datos huérfanos.`,
    }
  }

  revalidatePath(`/patients/${patientId}`)

  return { success: true, data: { id: img.id, file_path: img.file_path } }
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. getPatientImages
// ═══════════════════════════════════════════════════════════════════════════
export async function getPatientImages(
  patientId: string
): Promise<ActionResult<PatientImageWithUrl[]>> {
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
    .from("patient_images")
    .select("id, patient_id, image_type, description, file_path, file_name, uploaded_by, created_at, bucket_id, deleted_at, deleted_by")
    .eq("patient_id", patientId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })

  if (error) {
    return {
      success: false,
      error: `No se pudieron obtener las imágenes: ${error.message}`,
    }
  }

  if (!data || data.length === 0) {
    return { success: true, data: [] }
  }

  // Generar URLs firmadas en lote para evitar múltiples viajes
  const paths = data.map(img => img.file_path)
  const { data: signedUrls, error: signedError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, 300) // 5 minutos de validez

  if (signedError || !signedUrls) {
    return {
      success: false,
      error: `Error al generar URLs firmadas: ${signedError?.message ?? "respuesta vacía"}`,
    }
  }

  const urlMap = new Map<string, string>(
    signedUrls.map(item => [item.path || "", item.signedUrl || ""])
  )

  const mappedData: PatientImageWithUrl[] = data.map(img => ({
    ...img,
    image_type: img.image_type as ImagingType,
    signed_url: urlMap.get(img.file_path) || "",
  }))

  return { success: true, data: mappedData }
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. deletePatientImage
// ═══════════════════════════════════════════════════════════════════════════
export async function deletePatientImage(
  imageId: string,
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
      error: "Acceso denegado. Solo los administradores pueden eliminar imágenes.",
    }
  }

  // — Obtener la fila real de la BD ─────────────────────────────────────────
  const { data: imgRow, error: fetchError } = await supabase
    .from("patient_images")
    .select("id")
    .eq("id", imageId)
    .is("deleted_at", null)
    .single()

  if (fetchError || !imgRow) {
    return {
      success: false,
      error: "La imagen no existe o no tienes permiso para eliminarla.",
    }
  }

  // — Soft-delete: marcar la fila como eliminada en patient_images ───────
  const { error: deleteError } = await supabase
    .from("patient_images")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
    })
    .eq("id", imageId)

  if (deleteError) {
    return {
      success: false,
      error: `No se pudo marcar la imagen como eliminada: ${deleteError.message}.`,
    }
  }

  revalidatePath(`/patients/${patientId}`)

  return { success: true, data: null }
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. getDeletedPatientImages
// ═══════════════════════════════════════════════════════════════════════════
export async function getDeletedPatientImages(
  patientId: string
): Promise<ActionResult<DeletedPatientImageRow[]>> {
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
      error: "Acceso denegado. Solo los administradores pueden consultar imágenes eliminadas.",
    }
  }

  const { data, error } = await supabase
    .from("patient_images")
    .select("id, patient_id, image_type, description, file_path, file_name, uploaded_by, created_at, bucket_id, deleted_at, deleted_by")
    .eq("patient_id", patientId)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false })

  if (error) {
    return {
      success: false,
      error: `No se pudieron obtener las imágenes eliminadas: ${error.message}`,
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

  const mappedData: DeletedPatientImageRow[] = data.map(d => ({
    id: d.id,
    patient_id: d.patient_id,
    image_type: d.image_type as ImagingType,
    description: d.description,
    file_path: d.file_path,
    file_name: d.file_name,
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
// 5. restorePatientImage
// ═══════════════════════════════════════════════════════════════════════════
export async function restorePatientImage(
  imageId: string,
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
      error: "Acceso denegado. Solo los administradores pueden restaurar imágenes.",
    }
  }

  // — Verificar existencia de la imagen eliminada ─────────────────────────
  const { data: imgRow, error: fetchError } = await supabase
    .from("patient_images")
    .select("id")
    .eq("id", imageId)
    .not("deleted_at", "is", null)
    .single()

  if (fetchError || !imgRow) {
    return {
      success: false,
      error: "La imagen no existe o no está en la papelera para ser restaurada.",
    }
  }

  // — Restaurar imagen: null en deleted_at
  const { error: updateError } = await supabase
    .from("patient_images")
    .update({
      deleted_at: null,
      deleted_by: null,
    })
    .eq("id", imageId)

  if (updateError) {
    return {
      success: false,
      error: `No se pudo restaurar la imagen: ${updateError.message}.`,
    }
  }

  revalidatePath(`/patients/${patientId}`)

  return { success: true, data: null }
}
