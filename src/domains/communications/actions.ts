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
    p_created_by: user.id,
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
