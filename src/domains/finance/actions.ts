"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/shared/lib/supabase/server"

// Shared Action Result type
export type ActionResult<T = null> =
  | { success: true; data: T }
  | { success: false; error: string; availableBalance?: number; originalAmount?: number }

export type PaymentInput = {
  appointmentId: string
  patientId: string
  type: "pago" | "reverso"
  amount: number
  reason?: string
  reversedPaymentId?: string | null
}

export type PaymentSuccess = {
  paymentId: string
  patientName: string
  appointmentDate: string
  type: "pago" | "reverso"
  amount: number
}

/**
 * Registers a patient payment (pago or reverso) via database RPC.
 * Validates session, real-time admin role, input parameters, and handles domain errors.
 */
export async function registerPatientPayment(
  input: PaymentInput
): Promise<ActionResult<PaymentSuccess>> {
  const supabase = await createClient()

  // 1. Session verification
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: "No hay sesión activa. Por favor inicia sesión." }
  }

  // 2. Real-time administrator role verification
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profileError || profile?.role !== "administrador") {
    return {
      success: false,
      error: "Acceso denegado. Solo los administradores pueden registrar pagos o reversos.",
    }
  }

  // 3. Input validation
  if (!input.appointmentId) {
    return { success: false, error: "Debe proporcionar el ID de la cita." }
  }
  if (!input.patientId) {
    return { success: false, error: "Debe proporcionar el ID del paciente." }
  }
  if (!input.type || !(["pago", "reverso"] as const).includes(input.type)) {
    return { success: false, error: "El tipo de transacción debe ser exactamente 'pago' o 'reverso'." }
  }
  if (typeof input.amount !== "number" || isNaN(input.amount) || input.amount <= 0) {
    return { success: false, error: "El monto debe ser un número positivo mayor que cero." }
  }
  if (input.type === "reverso" && !input.reversedPaymentId) {
    return { success: false, error: "Un reverso debe referenciar el pago original mediante reversedPaymentId." }
  }
  if (input.type === "pago" && input.reversedPaymentId) {
    return { success: false, error: "Un pago no debe contener un reversedPaymentId." }
  }

  // 4. Retrieve patient name and appointment date
  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .select("full_name")
    .eq("id", input.patientId)
    .single()

  if (patientError || !patient) {
    return { success: false, error: "El paciente seleccionado no existe." }
  }

  const { data: appointment, error: appointmentError } = await supabase
    .from("appointments")
    .select("starts_at")
    .eq("id", input.appointmentId)
    .single()

  if (appointmentError || !appointment) {
    return { success: false, error: "La cita seleccionada no existe." }
  }

  // 5. Call RPC register_patient_payment
  // Se envía undefined para que PostgREST omita la clave en el JSON,
  // activando así el DEFAULT NULL definido en la firma de la función SQL.
  const { data: newPaymentId, error: rpcError } = await supabase.rpc(
    "register_patient_payment",
    {
      p_appointment_id:      input.appointmentId,
      p_patient_id:          input.patientId,
      p_type:                input.type,
      p_amount:              input.amount,
      p_reason:              input.reason || undefined,
      p_reversed_payment_id: input.reversedPaymentId || undefined,
      p_user_id:             user.id,
    }
  )

  if (rpcError) {
    // Error mapping with regex and fallbacks

    // Case A: Insufficient balance on a payment
    // "El pago (%) excede el saldo pendiente de la cita (%)."
    const balanceMatch = rpcError.message.match(
      /excede el saldo pendiente de la cita\s*\((.*?)\)/i
    )
    if (balanceMatch) {
      const availableBalance = parseFloat(balanceMatch[1].replace(/[^0-9.]/g, ""))
      return {
        success: false,
        error: `El monto del pago excede el saldo pendiente disponible.`,
        availableBalance: isNaN(availableBalance) ? undefined : availableBalance,
      }
    }

    // Case B: Reversal amount exceeds original payment
    // "El monto del reverso (%) excede el monto del pago original (%)."
    const originalAmountMatch = rpcError.message.match(
      /excede el monto del pago original\s*\((.*?)\)/i
    )
    if (originalAmountMatch) {
      const originalAmount = parseFloat(originalAmountMatch[1].replace(/[^0-9.]/g, ""))
      return {
        success: false,
        error: `El monto del reverso excede el valor del pago original.`,
        originalAmount: isNaN(originalAmount) ? undefined : originalAmount,
      }
    }

    // Case C: Attempting to reverse a transaction that is not of type 'pago'
    // "El registro referenciado (ID %) no es un pago; no se puede revertir un reverso."
    const invalidReversalType = rpcError.message.includes("no es un pago; no se puede revertir un reverso")
    if (invalidReversalType) {
      return {
        success: false,
        error: "El registro de pago referenciado no es válido para reverso porque ya es un reverso o tipo inválido.",
      }
    }

    // Fallback: Default DB message
    return { success: false, error: rpcError.message }
  }

  // 6. Revalidate cache on success
  // Revalidate finance routes and the patient's record view since balances are displayed there
  revalidatePath("/finance")
  revalidatePath(`/patients/${input.patientId}`)

  return {
    success: true,
    data: {
      paymentId:       newPaymentId as string,
      patientName:     patient.full_name,
      appointmentDate: appointment.starts_at,
      type:            input.type,
      amount:          input.amount,
    },
  }
}

// ---------------------------------------------------------------------------
// getPatientPaymentHistory
// ---------------------------------------------------------------------------

export type PaymentRecord = {
  id: string
  appointment_id: string
  patient_id: string
  type: "pago" | "reverso"
  amount: number
  reason: string | null
  reversed_payment_id: string | null
  created_by: string
  created_at: string
}

export type PaymentHistorySummary = {
  totalPagado: number
  totalReversado: number
  saldoNeto: number
}

export type PaymentHistory = {
  movements: PaymentRecord[]
  summary: PaymentHistorySummary
}

/**
 * Returns the full chronological payment history for a given patient.
 * Accessible to both "administrador" and "odontologo" roles (read-only).
 * No revalidatePath because this is a pure read — no cache mutation occurs.
 *
 * @param patientId - UUID of the patient whose history is requested.
 */
export async function getPatientPaymentHistory(
  patientId: string
): Promise<ActionResult<PaymentHistory>> {
  const supabase = await createClient()

  // 1. Session verification
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: "No hay sesión activa. Por favor inicia sesión." }
  }

  // 2. Real-time role verification — administrador OR odontologo may read
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const allowedRoles = ["administrador", "odontologo"] as const
  if (profileError || !profile || !(allowedRoles as readonly string[]).includes(profile.role)) {
    return {
      success: false,
      error: "Acceso denegado. Solo administradores y odontólogos pueden consultar el historial de pagos.",
    }
  }

  // 3. Input guard
  if (!patientId) {
    return { success: false, error: "Debe proporcionar el ID del paciente." }
  }

  // 4. Query all payment records for the patient, oldest-first
  const { data: movements, error: queryError } = await supabase
    .from("patient_payments")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: true })

  if (queryError) {
    return { success: false, error: queryError.message }
  }

  const records: PaymentRecord[] = []
  for (const row of movements ?? []) {
    if (row.type !== "pago" && row.type !== "reverso") {
      return {
        success: false,
        error: `Inconsistencia de datos: se encontró un registro de pago con tipo inválido '${row.type}' para el paciente.`,
      }
    }
    records.push({
      id: row.id,
      appointment_id: row.appointment_id,
      patient_id: row.patient_id,
      type: row.type,
      amount: row.amount,
      reason: row.reason,
      reversed_payment_id: row.reversed_payment_id,
      created_by: row.created_by,
      created_at: row.created_at,
    })
  }

  // 5. Compute summary
  let totalPagado = 0
  let totalReversado = 0

  for (const record of records) {
    if (record.type === "pago") {
      totalPagado += record.amount
    } else if (record.type === "reverso") {
      totalReversado += record.amount
    }
  }

  const saldoNeto = totalPagado - totalReversado

  return {
    success: true,
    data: {
      movements: records,
      summary: {
        totalPagado,
        totalReversado,
        saldoNeto,
      },
    },
  }
}

// ---------------------------------------------------------------------------
// getAppointmentPayments
// ---------------------------------------------------------------------------

export type AppointmentPaymentInfo = {
  id: string
  amount: number
  createdAt: string
  type: "pago" | "reverso"
  isReversed: boolean
}

/**
  * Returns the list of payments associated with an appointment.
  * For each payment, determines if it has already been reversed.
  * Accessible to both "administrador" and "odontologo" roles (read-only).
  */
export async function getAppointmentPayments(
  appointmentId: string
): Promise<ActionResult<AppointmentPaymentInfo[]>> {
  const supabase = await createClient()

  // 1. Session verification
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: "No hay sesión activa. Por favor inicia sesión." }
  }

  // 2. Real-time role verification — administrador OR odontologo may read
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const allowedRoles = ["administrador", "odontologo"] as const
  if (profileError || !profile || !(allowedRoles as readonly string[]).includes(profile.role)) {
    return {
      success: false,
      error: "Acceso denegado. Solo administradores y odontólogos pueden consultar pagos.",
    }
  }

  // 3. Input guard
  if (!appointmentId) {
    return { success: false, error: "Debe proporcionar el ID de la cita." }
  }

  // 4. Query all payments for this appointment
  const { data: payments, error: queryError } = await supabase
    .from("patient_payments")
    .select("id, amount, created_at, type, reversed_payment_id")
    .eq("appointment_id", appointmentId)
    .order("created_at", { ascending: true })

  if (queryError) {
    return { success: false, error: queryError.message }
  }

  // 5. Identify reversed payments
  const reversedIds = new Set<string>()
  for (const payment of payments ?? []) {
    if (payment.type === "reverso" && payment.reversed_payment_id) {
      reversedIds.add(payment.reversed_payment_id)
    }
  }

  const result: AppointmentPaymentInfo[] = (payments ?? []).map((p) => ({
    id: p.id,
    amount: p.amount,
    createdAt: p.created_at,
    type: p.type as "pago" | "reverso",
    isReversed: reversedIds.has(p.id),
  }))

  return {
    success: true,
    data: result,
  }
}

