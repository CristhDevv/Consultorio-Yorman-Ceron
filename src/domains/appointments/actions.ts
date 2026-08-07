"use server"

import { createClient } from "@/shared/lib/supabase/server"
import { revalidatePath } from "next/cache"

import { getAvailableSlots } from "./availability"
import { sendConfirmationEmail } from "../communications/email"

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
  branch_id: string
}

// ---------------------------------------------------------------------------
// 1. Obtener listado de citas con datos del paciente y odontólogo
// ---------------------------------------------------------------------------
export async function getAppointments() {
  const supabase = await createClient()

  // Para evitar sobrecarga en la base de datos a largo plazo, acotamos
  // la búsqueda a partir de 90 días atrás.
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  const dateLimit = ninetyDaysAgo.toISOString()

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
    .gte("starts_at", dateLimit)
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

  const { data: newAppt, error } = await supabase
    .from("appointments")
    .insert({
      patient_id: input.patient_id,
      dentist_id: input.dentist_id,
      starts_at: input.starts_at,
      duration_minutes: input.duration_minutes,
      status: input.status,
      reason: input.reason || null,
      notes: input.notes || null,
      branch_id: input.branch_id,
      created_by: user.id,
    })
    .select("id")
    .single()

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

  // Si el insert fue exitoso y el estado es confirmada
  if (input.status === "confirmada" && newAppt?.id) {
    const id = newAppt.id
    const { data: apptWithDetails } = await supabase
      .from("appointments")
      .select(`
        starts_at,
        patient_id,
        patients (
          full_name,
          email
        ),
        profiles (
          full_name
        )
      `)
      .eq("id", id)
      .single()

    if (apptWithDetails) {
      let formattedDate = ""
      let formattedTime = ""
      try {
        const dateObj = new Date(apptWithDetails.starts_at)
        formattedDate = dateObj.toLocaleDateString("es-CO", {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        })
        formattedTime = dateObj.toLocaleTimeString("es-CO", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "UTC",
        })
      } catch {
        formattedDate = apptWithDetails.starts_at
      }

      // Crear log de comunicación con status pending
      const { data: logId, error: insertError } = await supabase.rpc("insert_communication_log", {
        p_appointment_id: id,
        p_patient_id: apptWithDetails.patient_id,
        p_channel: "email",
        p_event_type: "confirmation",
      })

      if (insertError) {
        console.error(`Error al insertar log de comunicación para cita ${id}:`, insertError)
      }

      // Enviar correo envolviendo en try/catch independiente (se ejecuta siempre)
      try {
        const patientsData = apptWithDetails.patients as { full_name: string; email: string | null } | null
        const profilesData = apptWithDetails.profiles as { full_name: string } | null

        const recipientEmail = patientsData?.email || ""
        const patientName = patientsData?.full_name || "Paciente"
        const dentistName = profilesData?.full_name || undefined

        const emailResult = await sendConfirmationEmail({
          to: recipientEmail,
          patientName,
          appointmentDate: formattedDate,
          appointmentTime: formattedTime,
          dentistName,
        })

        // Solo actualizamos el estado si logId fue creado con éxito
        if (logId) {
          if (emailResult.success) {
            const { error: updateError } = await supabase.rpc("update_communication_log_status", {
              p_log_id: logId,
              p_status: "sent",
            })
            if (updateError) {
              console.error(`Error al actualizar estado del log de comunicación a 'sent' para cita ${id}:`, updateError)
            }
          } else {
            const { error: updateError } = await supabase.rpc("update_communication_log_status", {
              p_log_id: logId,
              p_status: "failed",
              p_error_message: emailResult.error,
            })
            if (updateError) {
              console.error(`Error al actualizar estado del log de comunicación a 'failed' para cita ${id}:`, updateError)
            }
          }
        }
      } catch (emailError: unknown) {
        const errMessage = emailError instanceof Error ? emailError.message : "Error inesperado al enviar email"
        if (logId) {
          const { error: updateError } = await supabase.rpc("update_communication_log_status", {
            p_log_id: logId,
            p_status: "failed",
            p_error_message: errMessage,
          })
          if (updateError) {
            console.error(`Error al actualizar estado del log de comunicación a 'failed' (en catch) para cita ${id}:`, updateError)
          }
        }
      }
    }
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

  // 1. Obtener el estado actual de la cita antes de actualizarla
  const { data: oldAppointment } = await supabase
    .from("appointments")
    .select("status")
    .eq("id", id)
    .single()

  const isTransitionToConfirmed =
    input.status === "confirmada" &&
    oldAppointment?.status !== "confirmada"

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
      ...(input.branch_id !== undefined && { branch_id: input.branch_id }),
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

  // 2. Si el update fue exitoso y es transición a confirmada
  if (isTransitionToConfirmed) {
    const { data: apptWithDetails } = await supabase
      .from("appointments")
      .select(`
        starts_at,
        patient_id,
        patients (
          full_name,
          email
        ),
        profiles (
          full_name
        )
      `)
      .eq("id", id)
      .single()

    if (apptWithDetails) {
      let formattedDate = ""
      let formattedTime = ""
      try {
        const dateObj = new Date(apptWithDetails.starts_at)
        formattedDate = dateObj.toLocaleDateString("es-CO", {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        })
        formattedTime = dateObj.toLocaleTimeString("es-CO", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "UTC",
        })
      } catch {
        formattedDate = apptWithDetails.starts_at
      }

      // 3. Crear log de comunicación con status pending
      const { data: logId, error: insertError } = await supabase.rpc("insert_communication_log", {
        p_appointment_id: id,
        p_patient_id: apptWithDetails.patient_id,
        p_channel: "email",
        p_event_type: "confirmation",
      })

      if (insertError) {
        console.error(`Error al insertar log de comunicación para cita ${id}:`, insertError)
      }

      // 4. Enviar correo envolviendo en try/catch independiente (se ejecuta siempre)
      try {
        const patientsData = apptWithDetails.patients as { full_name: string; email: string | null } | null
        const profilesData = apptWithDetails.profiles as { full_name: string } | null

        const recipientEmail = patientsData?.email || ""
        const patientName = patientsData?.full_name || "Paciente"
        const dentistName = profilesData?.full_name || undefined

        const emailResult = await sendConfirmationEmail({
          to: recipientEmail,
          patientName,
          appointmentDate: formattedDate,
          appointmentTime: formattedTime,
          dentistName,
        })

        // 5. Actualizar estado de envío según resultado si logId fue creado con éxito
        if (logId) {
          if (emailResult.success) {
            const { error: updateError } = await supabase.rpc("update_communication_log_status", {
              p_log_id: logId,
              p_status: "sent",
            })
            if (updateError) {
              console.error(`Error al actualizar estado del log de comunicación a 'sent' para cita ${id}:`, updateError)
            }
          } else {
            const { error: updateError } = await supabase.rpc("update_communication_log_status", {
              p_log_id: logId,
              p_status: "failed",
              p_error_message: emailResult.error,
            })
            if (updateError) {
              console.error(`Error al actualizar estado del log de comunicación a 'failed' para cita ${id}:`, updateError)
            }
          }
        }
      } catch (emailError: unknown) {
        const errMessage = emailError instanceof Error ? emailError.message : "Error inesperado al enviar email"
        if (logId) {
          const { error: updateError } = await supabase.rpc("update_communication_log_status", {
            p_log_id: logId,
            p_status: "failed",
            p_error_message: errMessage,
          })
          if (updateError) {
            console.error(`Error al actualizar estado del log de comunicación a 'failed' (en catch) para cita ${id}:`, updateError)
          }
        }
      }
    }
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

// ---------------------------------------------------------------------------
// 7. Obtener sucursales activas donde atiende un odontólogo específico
//    Consulta dentist_branches join branches filtrando por is_active = true.
//    Consumible como Server Action desde Client Components (mismo patrón que
//    getAvailableSlotsForDentistAndDate).
// ---------------------------------------------------------------------------
export async function getBranchesForDentist(dentistId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("dentist_branches")
    .select(`
      branch_id,
      branches (
        id,
        name,
        is_active
      )
    `)
    .eq("dentist_id", dentistId)

  if (error) {
    throw new Error(`Error al obtener sucursales del odontólogo: ${error.message}`)
  }

  // Aplanar y filtrar: excluir filas huérfanas (branch null) y sucursales inactivas.
  // El cast a Branch | null es necesario porque Supabase tipifica la relación
  // embebida como objeto | null; el null check explícito aquí garantiza que
  // nunca accedemos a propiedades de un branch nulo.
  interface Branch { id: string; name: string; is_active: boolean }
  return (data || []).flatMap(row => {
    const branch = row.branches as Branch | null
    if (branch === null || !branch.is_active) return []
    return [{ id: branch.id, name: branch.name }]
  })
}
