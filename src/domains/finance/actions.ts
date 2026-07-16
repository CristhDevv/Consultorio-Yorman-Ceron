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
