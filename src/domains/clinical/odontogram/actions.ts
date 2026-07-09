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

// 2. Crear un nuevo registro en el odontograma del paciente
export async function createOdontogramRecord(input: OdontogramRecordInput) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: "Sesión no iniciada" }
  }

  const { error } = await supabase.from("odontogram_records").insert({
    patient_id: input.patient_id,
    tooth_number: input.tooth_number,
    tooth_face: input.tooth_face,
    status: input.status,
    notes: input.notes || null,
    created_by: user.id,
  })

  if (error) {
    if (error.code === "23505") {
      return {
        success: false,
        error: "No es posible registrar este estado clínico. La pieza dental ya cuenta con un diagnóstico de diente completo registrado (ausente o extracción indicada), o bien el nuevo estado entra en conflicto con el registro existente de esta pieza."
      }
    }
    return { success: false, error: error.message }
  }

  // Se revalida la ruta del detalle del paciente
  revalidatePath(`/patients/${input.patient_id}`)
  return { success: true }
}
