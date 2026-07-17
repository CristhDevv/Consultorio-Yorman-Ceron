"use client"

import { useState, useTransition, useRef } from "react"
import {
  registerPatientPayment,
  type PaymentSuccess,
} from "@/domains/finance/actions"

// ─── Props ────────────────────────────────────────────────────────────────────
interface PaymentFormProps {
  appointmentId: string
  patientId: string
}

// ─── Estado de UI ─────────────────────────────────────────────────────────────
type FormState =
  | { status: "idle" }
  | { status: "success"; confirmation: PaymentSuccess }
  | { status: "error"; message: string; availableBalance?: number }

export default function PaymentForm({ appointmentId, patientId }: PaymentFormProps) {
  const [state, setState] = useState<FormState>({ status: "idle" })
  const [isPending, startTransition] = useTransition()
  // Controlled state to toggle the conditional reversedPaymentId field
  const [selectedType, setSelectedType] = useState<"pago" | "reverso" | "">("")
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const formData = new FormData(e.currentTarget)
    const type = formData.get("type") as "pago" | "reverso"
    const amountRaw = formData.get("amount") as string
    const reason = (formData.get("reason") as string).trim()
    const reversedPaymentIdRaw = (formData.get("reversedPaymentId") as string | null)?.trim()

    const amount = parseFloat(amountRaw)

    // ── Client-side validation (mirrors server-side for early feedback) ─────
    if (!type || !["pago", "reverso"].includes(type)) {
      setState({ status: "error", message: "Debe seleccionar el tipo de transacción." })
      return
    }
    if (!amountRaw || isNaN(amount) || amount <= 0) {
      setState({ status: "error", message: "El monto debe ser un número positivo mayor que cero." })
      return
    }
    if (type === "reverso" && !reversedPaymentIdRaw) {
      setState({ status: "error", message: "Un reverso debe referenciar el ID del pago original." })
      return
    }

    startTransition(async () => {
      const result = await registerPatientPayment({
        appointmentId,
        patientId,
        type,
        amount,
        reason: reason || undefined,
        reversedPaymentId: reversedPaymentIdRaw || null,
      })

      if (result.success) {
        // Éxito: limpiar formulario y mostrar confirmación detallada
        formRef.current?.reset()
        setSelectedType("")
        setState({ status: "success", confirmation: result.data })
      } else {
        // Error: mostrar mensaje. Si hay availableBalance, exponerlo explícitamente.
        setState({
          status: "error",
          message: result.error,
          availableBalance: "availableBalance" in result ? result.availableBalance : undefined,
        })
      }
    })
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl p-6">
      {/* Encabezado de sección */}
      <div className="mb-5">
        <h2 className="text-lg font-bold text-white tracking-tight">
          Registrar Pago
        </h2>
        <p className="text-slate-400 text-sm mt-0.5">
          Registra un pago o reverso asociado a esta cita clínica.
        </p>
      </div>

      {/* Banner de éxito */}
      {state.status === "success" && (
        <div
          role="status"
          aria-live="polite"
          className="mb-5 flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-3"
        >
          <span className="mt-0.5 text-emerald-400 text-base">✓</span>
          <div>
            <p className="text-emerald-300 text-sm font-semibold">
              Pago registrado correctamente
            </p>
            <p className="text-emerald-400/80 text-xs mt-0.5">
              <span className="capitalize">{state.confirmation.type}</span>
              {" de "}
              <span className="font-bold">
                {state.confirmation.amount.toLocaleString("es-CO", {
                  style: "currency",
                  currency: "COP",
                  minimumFractionDigits: 0,
                })}
              </span>
              {" para "}
              <span className="font-bold">{state.confirmation.patientName}</span>
              {" registrado exitosamente."}
            </p>
          </div>
        </div>
      )}

      {/* Banner de error */}
      {state.status === "error" && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-5 flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3"
        >
          <span className="mt-0.5 text-red-400 text-base">✕</span>
          <div>
            <p className="text-red-300 text-sm font-semibold">{state.message}</p>
            {state.availableBalance !== undefined && (
              <p className="text-red-400/80 text-xs mt-0.5">
                Saldo disponible en esta cita:{" "}
                <span className="font-bold text-red-300">
                  {state.availableBalance.toLocaleString("es-CO", {
                    style: "currency",
                    currency: "COP",
                    minimumFractionDigits: 0,
                  })}
                </span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Formulario */}
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        id="payment-form"
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        {/* Tipo de transacción */}
        <div className="sm:col-span-2 flex flex-col gap-1.5">
          <label
            htmlFor="payment-type"
            className="text-xs font-bold uppercase tracking-wider text-slate-400"
          >
            Tipo <span className="text-red-400">*</span>
          </label>
          <select
            id="payment-type"
            name="type"
            required
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as "pago" | "reverso" | "")}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100
                       focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:border-cyan-500
                       disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isPending}
          >
            <option value="" disabled>
              Seleccionar…
            </option>
            <option value="pago">Pago</option>
            <option value="reverso">Reverso</option>
          </select>
        </div>

        {/* Monto */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="payment-amount"
            className="text-xs font-bold uppercase tracking-wider text-slate-400"
          >
            Monto <span className="text-red-400">*</span>
          </label>
          <input
            id="payment-amount"
            name="amount"
            type="number"
            min={0.01}
            step={0.01}
            required
            placeholder="Ej: 150000"
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100
                       placeholder:text-slate-600
                       focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:border-cyan-500
                       disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isPending}
          />
        </div>

        {/* Motivo (opcional) */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="payment-reason"
            className="text-xs font-bold uppercase tracking-wider text-slate-400"
          >
            Motivo{" "}
            <span className="text-slate-600 normal-case font-normal">(opcional)</span>
          </label>
          <input
            id="payment-reason"
            name="reason"
            type="text"
            maxLength={300}
            placeholder="Descripción del pago…"
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100
                       placeholder:text-slate-600
                       focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:border-cyan-500
                       disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isPending}
          />
        </div>

        {/* ID del pago a reversar — visible solo cuando type === "reverso" */}
        {/*
         * MEJORA FUTURA PENDIENTE: Este campo de texto libre debe reemplazarse por un
         * selector inteligente que liste los pagos disponibles registrados para esta
         * cita, usando una función de lectura adicional aún no definida en el dominio
         * de finanzas. Por ahora, el administrador pega manualmente el UUID del pago
         * original que desea reversar.
         */}
        {selectedType === "reverso" && (
          <div className="sm:col-span-2 flex flex-col gap-1.5">
            <label
              htmlFor="payment-reversed-id"
              className="text-xs font-bold uppercase tracking-wider text-slate-400"
            >
              ID del pago a reversar <span className="text-red-400">*</span>
            </label>
            <input
              id="payment-reversed-id"
              name="reversedPaymentId"
              type="text"
              required
              placeholder="UUID del pago original…"
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100
                         placeholder:text-slate-600 font-mono text-xs
                         focus:outline-none focus:ring-2 focus:ring-amber-500/60 focus:border-amber-500
                         disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isPending}
            />
            <p className="text-amber-500/70 text-xs">
              Pega aquí el ID exacto del pago registrado que deseas reversar.
            </p>
          </div>
        )}

        {/* Botón de envío */}
        <div className="sm:col-span-2 flex justify-end mt-1">
          <button
            id="payment-submit"
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700
                       disabled:text-slate-500 disabled:cursor-not-allowed
                       text-white font-semibold text-sm px-5 py-2.5 rounded-lg
                       transition-colors shadow-lg shadow-cyan-500/10"
          >
            {isPending ? (
              <>
                <span
                  aria-hidden="true"
                  className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                />
                Registrando…
              </>
            ) : (
              "Registrar pago"
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
