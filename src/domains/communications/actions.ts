"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/shared/lib/supabase/server"
import {
  CommunicationLog,
  CommunicationLogInput,
  UpdateCommunicationStatusInput,
} from "./types"

export type ActionResult<T = null> =
  | { success: true; data: T }
  | { success: false; error: string }

/**
 * Creates a new communication log.
 * Only administrative staff (odontologo or administrador) can initiate communications.
 * Inserts directly to the communication_logs table.
 */
export async function createCommunicationLog(
  input: CommunicationLogInput
): Promise<ActionResult<CommunicationLog>> {
  const supabase = await createClient()

  // 1. Session verification
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: "No hay sesión activa. Por favor inicia sesión." }
  }

  // 2. Role verification
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const allowedRoles = ["administrador", "odontologo"] as const
  if (profileError || !profile || !(allowedRoles as readonly string[]).includes(profile.role)) {
    return {
      success: false,
      error: "Acceso denegado. No tiene permisos para registrar logs de comunicación.",
    }
  }

  // 3. Insert record via RPC
  const { data: newLogId, error: insertError } = await supabase.rpc("insert_communication_log", {
    p_appointment_id: input.appointmentId,
    p_patient_id: input.patientId,
    p_channel: input.channel,
    p_event_type: input.eventType,
  })

  if (insertError) {
    return { success: false, error: insertError.message }
  }

  revalidatePath("/appointments") // In case communications list is visible in appointments

  return {
    success: true,
    data: { 
      id: newLogId as string, 
      appointment_id: input.appointmentId, 
      patient_id: input.patientId, 
      channel: input.channel, 
      event_type: input.eventType, 
      status: "pending", 
      created_at: new Date().toISOString(),
      sent_at: null,
      error_message: null,
      created_by: user.id 
    } as CommunicationLog,
  }
}

/**
 * Updates a communication log status using the controlled SECURITY DEFINER function.
 * Accessible to authenticated users.
 */
export async function updateCommunicationLogStatus(
  input: UpdateCommunicationStatusInput
): Promise<ActionResult> {
  const supabase = await createClient()

  // 1. Session verification
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: "No hay sesión activa. Por favor inicia sesión." }
  }

  // 2. Invoke RPC update_communication_log_status
  const { error: rpcError } = await supabase.rpc("update_communication_log_status", {
    p_log_id: input.logId,
    p_status: input.status,
    p_error_message: input.errorMessage || undefined,
  })

  if (rpcError) {
    return { success: false, error: rpcError.message }
  }

  return { success: true, data: null }
}

export interface CommunicationLogWithPatient {
  id: string
  appointment_id: string
  patient_id: string
  channel: string
  event_type: string
  status: string
  error_message: string | null
  created_at: string
  sent_at: string | null
  patients: {
    full_name: string
  } | null
}

export type CommunicationLogsFilter = {
  status?: string
  patientId?: string
}

export type PatientWithLogs = {
  id: string
  full_name: string
}

/**
 * Retrieves communication logs for administrative display, ordered by created_at descending.
 * Requires active session and administrator role.
 */
export async function getCommunicationLogs(
  filters?: CommunicationLogsFilter
): Promise<ActionResult<CommunicationLogWithPatient[]>> {
  const supabase = await createClient()

  // 1. Session verification
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: "No hay sesión activa. Por favor inicia sesión." }
  }

  // 2. Role verification (strictly administrator)
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profileError || !profile || profile.role !== "administrador") {
    return {
      success: false,
      error: "Acceso denegado. Solo los administradores pueden consultar los logs de comunicación.",
    }
  }

  // 3. Query communication logs
  let query = supabase
    .from("communication_logs")
    .select(`
      id,
      appointment_id,
      patient_id,
      channel,
      event_type,
      status,
      error_message,
      created_at,
      sent_at,
      patients (
        full_name
      )
    `)

  if (filters?.status) {
    query = query.eq("status", filters.status)
  }
  if (filters?.patientId) {
    query = query.eq("patient_id", filters.patientId)
  }

  const { data, error: queryError } = await query.order("created_at", {
    ascending: false,
  })

  if (queryError) {
    return { success: false, error: queryError.message }
  }

  const typedData = (data as unknown as {
    id: string
    appointment_id: string
    patient_id: string
    channel: string
    event_type: string
    status: string
    error_message: string | null
    created_at: string
    sent_at: string | null
    patients: {
      full_name: string
    } | null
  }[] || []).map((row) => ({
    id: row.id,
    appointment_id: row.appointment_id,
    patient_id: row.patient_id,
    channel: row.channel,
    event_type: row.event_type,
    status: row.status,
    error_message: row.error_message,
    created_at: row.created_at,
    sent_at: row.sent_at,
    patients: row.patients ? { full_name: row.patients.full_name } : null,
  }))

  return { success: true, data: typedData }
}

/**
 * Retrieves unique list of patients who have at least one communication log.
 * Requires active session and administrator role.
 * Optimized using database-level RPC to prevent scaling memory issues on server.
 */
export async function getPatientsWithCommunicationLogs(): Promise<
  ActionResult<PatientWithLogs[]>
> {
  const supabase = await createClient()

  // 1. Session verification
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: "No hay sesión activa. Por favor inicia sesión." }
  }

  // 2. Role verification (strictly administrator)
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profileError || !profile || profile.role !== "administrador") {
    return {
      success: false,
      error: "Acceso denegado. Solo los administradores pueden consultar pacientes con logs.",
    }
  }

  // 3. Query unique patients from logs using RPC
  const { data, error: queryError } = await supabase
    .rpc("get_unique_patients_with_logs")

  if (queryError) {
    return { success: false, error: queryError.message }
  }

  const resultList = (data as unknown as { id: string; full_name: string }[] || []).map((row) => ({
    id: row.id,
    full_name: row.full_name,
  }))

  return { success: true, data: resultList }
}

