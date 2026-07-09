"use server"

import { createClient } from "@/shared/lib/supabase/server"
import { revalidatePath } from "next/cache"

import { getAvailableSlots } from "./availability"

// Códigos de error de PostgreSQL relevantes para este dominio:
// 23505 → unique_violation      (llave duplicada)
// 23P01 → exclusion_violation   (restricción de exclusión de solapamiento)

export interface AppointmentInput {
  patient_id: string
  dentist_id: string
  starts_at: string           // ISO 8601 timestamptz
  duration_minutes: number
  status: "programada" | "confirmada" | "completada" | "cancelada" | "no_asistio"
  reason: string
  notes: string
}

// ---------------------------------------------------------------------------
// 1. Obtener listado de citas con datos del paciente y odontólogo
// ---------------------------------------------------------------------------
export async function getAppointments() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("appointments")
    .select(`
      *,
      patients (
        id,
        full_name,
        document_id
      ),
      profiles (
        id,
        full_name
      )
    `)
    .order("starts_at")

  if (error) {
    throw new Error(`Error al obtener citas: ${error.message}`)
  }

  return data || []
}

// ---------------------------------------------------------------------------
// 2. Obtener detalle de una cita específica
//    Maneja de forma controlada el caso en que la cita no exista,
//    retornando null en lugar de lanzar una excepción no capturada.
// ---------------------------------------------------------------------------
export async function getAppointmentById(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("appointments")
    .select(`
      *,
      patients (
        id,
        full_name,
        document_id
      ),
      profiles (
        id,
        full_name
      )
    `)
    .eq("id", id)
    .single()

  if (error) {
    // PGRST116 = "Row not found" (PostgREST code for .single() with no result)
    // Se trata de forma controlada retornando null en lugar de lanzar.
    if (error.code === "PGRST116") {
      return null
    }
    throw new Error(`Error al obtener detalle de la cita: ${error.message}`)
  }

  return data
}

// ---------------------------------------------------------------------------
// 3. Crear una cita nueva
//    created_by se asigna siempre desde el usuario autenticado en el servidor,
//    nunca desde el payload recibido en el formulario.
// ---------------------------------------------------------------------------
export async function createAppointment(input: AppointmentInput) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: "Sesión no iniciada" }
  }

  const { error } = await supabase.from("appointments").insert({
    patient_id: input.patient_id,
    dentist_id: input.dentist_id,
    starts_at: input.starts_at,
    duration_minutes: input.duration_minutes,
    status: input.status,
    reason: input.reason || null,
    notes: input.notes || null,
    created_by: user.id,
  })

  if (error) {
    // Error 23P01: exclusion_violation
    // Se produce cuando la restricción appointments_no_overlap detecta que el
    // dentista ya tiene otra cita activa en el mismo rango de tiempo.
    if (error.code === "23P01") {
      return {
        success: false,
        error: "El odontólogo ya tiene una cita programada en ese horario. Por favor selecciona otro horario o dentista.",
      }
    }
    return { success: false, error: error.message }
  }

  revalidatePath("/appointments")
  return { success: true }
}

// ---------------------------------------------------------------------------
// 4. Actualizar una cita existente
//    Permite modificar cualquier campo editable, incluido el cambio de status.
//    Maneja el mismo error de solapamiento (23P01) si el cambio de horario
//    genera conflicto con otra cita activa del mismo dentista.
// ---------------------------------------------------------------------------
export async function updateAppointment(id: string, input: Partial<AppointmentInput>) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("appointments")
    .update({
      ...(input.patient_id !== undefined && { patient_id: input.patient_id }),
      ...(input.dentist_id !== undefined && { dentist_id: input.dentist_id }),
      ...(input.starts_at !== undefined && { starts_at: input.starts_at }),
      ...(input.duration_minutes !== undefined && { duration_minutes: input.duration_minutes }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.reason !== undefined && { reason: input.reason || null }),
      ...(input.notes !== undefined && { notes: input.notes || null }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) {
    // Error 23P01: exclusion_violation
    // El cambio de horario genera un solapamiento con otra cita activa del dentista.
    if (error.code === "23P01") {
      return {
        success: false,
        error: "El odontólogo ya tiene una cita programada en ese horario. Por favor selecciona otro horario o dentista.",
      }
    }
    return { success: false, error: error.message }
  }

  revalidatePath("/appointments")
  revalidatePath(`/appointments/${id}`)
  return { success: true }
}

// ---------------------------------------------------------------------------
// 5. Obtener citas de un odontólogo en una fecha específica (YYYY-MM-DD)
//    excludeAppointmentId: excluye la cita con ese ID del resultado, útil al
//    editar para evitar falso conflicto de la cita consigo misma.
// ---------------------------------------------------------------------------
export async function getAppointmentsByDentistAndDate(
  dentistId: string,
  dateStr: string,
  excludeAppointmentId?: string
) {
  const supabase = await createClient()

  // Asumimos fechas en formato YYYY-MM-DD y las acotamos al día en UTC
  const startOfDay = `${dateStr}T00:00:00.000Z`
  const endOfDay = `${dateStr}T23:59:59.999Z`

  let query = supabase
    .from("appointments")
    .select("*")
    .eq("dentist_id", dentistId)
    .gte("starts_at", startOfDay)
    .lte("starts_at", endOfDay)
    .order("starts_at")

  if (excludeAppointmentId) {
    query = query.neq("id", excludeAppointmentId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Error al obtener citas por odontólogo y fecha: ${error.message}`)
  }

  return data || []
}

// ---------------------------------------------------------------------------
// 6. Obtener bloques de horario disponibles combinando citas y disponibilidad
//    excludeAppointmentId: pasa el ID de la cita a editar para excluirla del
//    cálculo de ocupación y evitar falso conflicto consigo misma.
// ---------------------------------------------------------------------------
export async function getAvailableSlotsForDentistAndDate(
  dentistId: string,
  dateStr: string,
  excludeAppointmentId?: string
) {
  const appointments = await getAppointmentsByDentistAndDate(dentistId, dateStr, excludeAppointmentId)
  return getAvailableSlots(dentistId, dateStr, appointments)
}
