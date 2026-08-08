"use client"

import React, { useState, useTransition, useRef, useCallback } from "react"
import {
  registerPatientPayment,
  getAppointmentPayments,
  type PaymentSuccess,
  type AppointmentPaymentInfo,
} from "@/domains/finance/actions"
import { AlertCircle, CheckCircle2, DollarSign, RotateCcw, Trash2, ArrowRightLeft, FileText } from "lucide-react"

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

const QUICK_AMOUNTS = [20000, 50000, 100000, 200000, 500000]

export default function PaymentForm({ appointmentId, patientId }: PaymentFormProps) {
  const [state, setState] = useState<FormState>({ status: "idle" })
  const [isPending, startTransition] = useTransition()
  
  // Controlled POS States
  const [selectedType, setSelectedType] = useState<"pago" | "reverso">("pago")
  const [amount, setAmount] = useState<number>(0)
  const [reason, setReason] = useState<string>("")
  const [reversedPaymentId, setReversedPaymentId] = useState<string>("")

  const [payments, setPayments] = useState<AppointmentPaymentInfo[]>([])
  const [loadingPayments, setLoadingPayments] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const fetchPayments = useCallback(async () => {
    setLoadingPayments(true)
    const res = await getAppointmentPayments(appointmentId)
    if (res.success) {
      setPayments(res.data)
    }
    setLoadingPayments(false)
  }, [appointmentId])

  const handleTypeChange = (type: "pago" | "reverso") => {
    setSelectedType(type)
    setState({ status: "idle" })
    if (type === "reverso") {
      fetchPayments()
    } else {
      setReversedPaymentId("")
    }
  }

  const handleQuickAdd = (value: number) => {
    setAmount((prev) => prev + value)
  }

  const handleClear = () => {
    setAmount(0)
    setReason("")
    setReversedPaymentId("")
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    // ── Client-side validation ──
    if (!selectedType) {
      setState({ status: "error", message: "Debe seleccionar el tipo de transacción." })
      return
    }
    if (amount <= 0) {
      setState({ status: "error", message: "El monto debe ser un número positivo mayor que cero." })
      return
    }
    if (selectedType === "reverso" && !reversedPaymentId) {
      setState({ status: "error", message: "Un reverso debe referenciar el cobro original." })
      return
    }

    startTransition(async () => {
      const result = await registerPatientPayment({
        appointmentId,
        patientId,
        type: selectedType,
        amount,
        reason: reason.trim() || undefined,
        reversedPaymentId: selectedType === "reverso" ? reversedPaymentId : null,
      })

      if (result.success) {
        // Reset states
        handleClear()
        setState({ status: "success", confirmation: result.data })
        if (selectedType === "reverso") {
          fetchPayments()
        }
      } else {
        setState({
          status: "error",
          message: result.error,
          availableBalance: "availableBalance" in result ? result.availableBalance : undefined,
        })
      }
    })
  }

  const formatCurrency = (val: number) => {
    return val.toLocaleString("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    })
  }

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm p-6 max-w-4xl mx-auto w-full">
      {/* Encabezado */}
      <div className="mb-6 pb-4 border-b border-[#F1F5F9] flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#1E293B] tracking-tight">Terminal de Pago (POS)</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Registra abonos y reversos de saldo de forma ágil y visual.</p>
        </div>
        <div className="bg-[#F1F5F9] text-[#475569] text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Terminal Activa
        </div>
      </div>

      {/* Banners de Estado */}
      {state.status === "success" && (
        <div
          role="status"
          aria-live="polite"
          className="mb-6 flex items-start gap-3 bg-emerald-50 border border-emerald-250 text-emerald-800 p-4 rounded-xl shadow-2xs"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold">Transacción Registrada con Éxito</p>
            <p className="text-xs mt-1">
              Se ha aplicado un <span className="font-bold uppercase">{state.confirmation.type}</span> por{" "}
              <span className="font-bold text-emerald-700">{formatCurrency(state.confirmation.amount)}</span> para el paciente <span className="font-bold">{state.confirmation.patientName}</span>.
            </p>
          </div>
        </div>
      )}

      {state.status === "error" && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl shadow-2xs"
        >
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold">{state.message}</p>
            {state.availableBalance !== undefined && (
              <p className="text-xs mt-1">
                El saldo neto disponible en esta cita es de{" "}
                <span className="font-bold text-red-700">{formatCurrency(state.availableBalance)}</span>.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Formulario Estilo POS */}
      <form ref={formRef} onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Lado Izquierdo: Consola del Cajero (lg:col-span-7) */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          
          {/* Toggles grandes Pago / Reverso */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleTypeChange("pago")}
              className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border text-sm font-bold transition-all shadow-3xs cursor-pointer ${
                selectedType === "pago"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-400 ring-2 ring-emerald-500/10"
                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <DollarSign className="w-4 h-4" />
              REGISTRAR PAGO
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange("reverso")}
              className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border text-sm font-bold transition-all shadow-3xs cursor-pointer ${
                selectedType === "reverso"
                  ? "bg-amber-50 text-amber-700 border-amber-400 ring-2 ring-amber-500/10"
                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              REGISTRAR REVERSO
            </button>
          </div>

          {/* Pantalla Digital del Monto */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="payment-amount" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Monto a Registrar
            </label>
            <div className="relative rounded-2xl overflow-hidden shadow-inner border border-slate-950 bg-slate-900 p-4 flex items-center justify-between">
              <span className="text-2xl font-mono text-emerald-400 font-extrabold select-none">$</span>
              <input
                id="payment-amount"
                name="amount"
                type="number"
                min={0}
                required
                value={amount === 0 ? "" : amount}
                onChange={(e) => {
                  const val = parseFloat(e.target.value)
                  setAmount(isNaN(val) ? 0 : val)
                }}
                className="bg-transparent border-0 text-3xl font-mono text-emerald-400 font-extrabold text-right w-full focus:outline-none focus:ring-0 p-0"
                placeholder="0"
              />
            </div>
          </div>

          {/* Teclado rápido de COP */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Acceso Rápido de Efectivo</span>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {QUICK_AMOUNTS.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAdd(val)}
                  className="bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold py-2.5 px-1 rounded-xl text-xs transition-colors cursor-pointer shadow-3xs"
                >
                  +{val / 1000}K
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                className="bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 font-bold py-2.5 px-1 rounded-xl text-xs transition-colors cursor-pointer shadow-3xs"
              >
                Limpiar
              </button>
            </div>
          </div>

          {/* Si es Reverso: Selector de Cobro Original */}
          {selectedType === "reverso" && (
            <div className="flex flex-col gap-1.5 bg-amber-50/20 border border-amber-100 p-4 rounded-2xl">
              <label htmlFor="payment-reversed-id" className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600" />
                Seleccionar Pago a Reversar *
              </label>
              {loadingPayments ? (
                <p className="text-xs text-muted-foreground animate-pulse py-2">Cargando transacciones de la cita...</p>
              ) : payments.filter((p) => p.type === "pago").length === 0 ? (
                <p className="text-xs text-amber-700 font-medium py-1">No hay cobros activos registrados en esta cita.</p>
              ) : (
                <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
                  {payments
                    .filter((p) => p.type === "pago" && !p.isReversed)
                    .map((p) => {
                      const isSelected = reversedPaymentId === p.id
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setReversedPaymentId(p.id)
                            setAmount(p.amount)
                            setReason(`Reverso del cobro por ${formatCurrency(p.amount)}`)
                          }}
                          className={`w-full text-left p-2.5 rounded-xl border text-xs flex justify-between items-center transition-all cursor-pointer ${
                            isSelected
                              ? "bg-amber-100 border-amber-300 font-semibold text-amber-900"
                              : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div>
                            <p className="font-bold">{formatCurrency(p.amount)}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {new Date(p.createdAt).toLocaleDateString("es-CO", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${isSelected ? "bg-amber-200" : "bg-slate-100 text-slate-500"}`}>
                            {isSelected ? "Seleccionado" : "Clic para Reversar"}
                          </span>
                        </button>
                      )
                    })}
                </div>
              )}
              {/* Oculto pero con name para FormData */}
              <input type="hidden" name="reversedPaymentId" value={reversedPaymentId} />
            </div>
          )}

          {/* Motivo de la transacción */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="payment-reason" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Concepto / Motivo de la Transacción
            </label>
            <input
              id="payment-reason"
              name="reason"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={300}
              placeholder="Ej: Abono de tratamiento, reverso por error de digitación..."
              className="bg-white border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

        </div>

        {/* Lado Derecho: Recibo Térmico de Caja (lg:col-span-5) */}
        <div className="lg:col-span-5 w-full flex flex-col gap-4">
          
          {/* Recibo Térmico */}
          <div className="bg-[#FAF9F6] border-2 border-[#E2E8F0] shadow-sm rounded-xl p-5 font-mono text-[#334155] relative overflow-hidden">
            {/* Efecto de borde zigzag simulado */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-200 to-transparent bg-[length:12px_6px] bg-repeat-x" />
            
            <div className="text-center pb-4 border-b border-dashed border-slate-350 mt-1">
              <h4 className="text-xs font-bold tracking-wider uppercase">Consultorio Odontológico</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Yorman Cerón · Caja General</p>
            </div>

            <div className="py-4 flex flex-col gap-2.5 text-xs border-b border-dashed border-slate-350">
              <div className="flex justify-between">
                <span className="text-slate-450">ID CITA:</span>
                <span className="font-bold font-mono">{appointmentId.substring(0, 8).toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-450">PACIENTE:</span>
                <span className="font-bold truncate max-w-[160px] text-right">{patientId.substring(0, 8).toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-450">OPERACIÓN:</span>
                <span className={`font-bold uppercase ${selectedType === "pago" ? "text-emerald-600" : "text-amber-600"}`}>
                  {selectedType === "pago" ? "Abono / Pago" : "Reverso"}
                </span>
              </div>
              {reason.trim() && (
                <div className="flex flex-col gap-0.5 mt-1 bg-white/50 border border-slate-100 p-2 rounded">
                  <span className="text-[10px] text-slate-400">CONCEPTO:</span>
                  <span className="text-[10px] italic leading-relaxed break-words">{reason}</span>
                </div>
              )}
            </div>

            <div className="py-4 flex flex-col gap-1 text-right">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest">Total a Procesar</span>
              <span className={`text-2xl font-extrabold tracking-tight ${selectedType === "pago" ? "text-emerald-600" : "text-amber-600"}`}>
                {selectedType === "pago" ? "+" : "-"} {formatCurrency(amount)}
              </span>
            </div>

            <div className="pt-2 text-center text-[9px] text-slate-400 flex flex-col gap-0.5 items-center">
              <div className="w-full h-8 bg-slate-900 border border-slate-950 flex items-center justify-center text-emerald-400 font-mono tracking-widest text-xs font-semibold rounded select-none">
                |||||||| | || ||| | |||
              </div>
              <span className="mt-1">TICKET DE CONTROL INTERNO</span>
            </div>
            
            {/* Efecto de borde zigzag inferior simulado */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-slate-200 to-transparent bg-[length:12px_6px] bg-repeat-x" />
          </div>

          {/* Botón de Confirmación Principal */}
          <button
            id="payment-submit"
            type="submit"
            disabled={isPending || amount <= 0}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold shadow-md tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
              selectedType === "pago"
                ? "text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                : "text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
            }`}
          >
            {isPending ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                PROCESANDO TRANSACCIÓN…
              </>
            ) : selectedType === "pago" ? (
              "EFECTUAR COBRO (PAGO)"
            ) : (
              "EFECTUAR REVERSO"
            )}
          </button>

        </div>

      </form>
    </div>
  )
}
