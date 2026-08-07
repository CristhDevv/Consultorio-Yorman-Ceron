"use server"

import { createClient } from "@/shared/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface OdontogramRecordInput {
  patient_id: string
  tooth_number: number
  tooth_face: string | null
  status: string
  notes?: string | null
}

// 1. Obtener todos los registros del odontograma de un paciente específico
export async function getOdontogramByPatient(patientId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("odontogram_records")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: data || [] }
}

// 2. Crear o actualizar un registro en el odontograma del paciente
export async function createOdontogramRecord(input: OdontogramRecordInput) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: "Sesión no iniciada" }
  }

  // Usamos upsert para actualizar si ya existe el registro para ese diente y cara.
  // Los dos índices únicos parciales de la BD cubren:
  //   - (patient_id, tooth_number, tooth_face) WHERE tooth_face IS NOT NULL
  //   - (patient_id, tooth_number)             WHERE tooth_face IS NULL
  // Supabase no admite onConflict con índices parciales directamente, así que
  // primero intentamos eliminar el registro existente y luego insertamos el nuevo.
  // Esto garantiza que el estado visible sea siempre el último guardado.

  if (input.tooth_face === null) {
    // Registro general (sano, ausente, corona, etc.): eliminar el existente primero
    await supabase
      .from("odontogram_records")
      .delete()
      .eq("patient_id", input.patient_id)
      .eq("tooth_number", input.tooth_number)
      .is("tooth_face", null)
  } else {
    // Registro por cara (caries, obturado, etc.): eliminar el existente para esa cara
    await supabase
      .from("odontogram_records")
      .delete()
      .eq("patient_id", input.patient_id)
      .eq("tooth_number", input.tooth_number)
      .eq("tooth_face", input.tooth_face)
  }

  // Si es un estado 'sano' para una cara específica, solo queríamos eliminar el registro existente.
  // No insertamos nada porque la ausencia de registro representa 'sano' para esa cara.
  if (input.status === "sano" && input.tooth_face !== null) {
    revalidatePath(`/patients/${input.patient_id}`)
    return { success: true }
  }

  // Insertar el nuevo registro actualizado
  const { error } = await supabase.from("odontogram_records").insert({
    patient_id: input.patient_id,
    tooth_number: input.tooth_number,
    tooth_face: input.tooth_face,
    status: input.status,
    notes: input.notes || null,
    created_by: user.id,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(`/patients/${input.patient_id}`)
  return { success: true }
}
