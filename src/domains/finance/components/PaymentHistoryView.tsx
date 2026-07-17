"use client"

import React, { useState, useEffect, useTransition } from "react"
import { getPatientPaymentHistory, type PaymentHistory, type PaymentRecord } from "@/domains/finance/actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert"

interface PaymentHistoryViewProps {
  patientId: string
  patientName: string
}

export default function PaymentHistoryView({ patientId, patientName }: PaymentHistoryViewProps) {
  const [history, setHistory] = useState<PaymentHistory | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!patientId) {
      return
    }

    startTransition(async () => {
      // Estado de carga explícito: limpiamos el historial anterior antes del fetch
      setHistory(null)
      setErrorMsg(null)
      try {
        const res = await getPatientPaymentHistory(patientId)
        if (res.success) {
          setHistory(res.data)
        } else {
          setErrorMsg(res.error)
        }
      } catch (err) {
        console.error("Error loading payment history:", err)
        setErrorMsg("Ocurrió un error inesperado al cargar el historial financiero.")
      }
    })
  }, [patientId])

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    })
  }

  const formatDateTime = (isoString: string): string => {
    try {
      const date = new Date(isoString)
      return date.toLocaleString("es-CO", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    } catch {
      return isoString
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {errorMsg && (
        <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 text-red-200">
          <AlertTitle>Error al cargar el historial</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      {isPending ? (
        <div className="flex flex-col items-center justify-center p-10 text-slate-400 text-sm border border-slate-800 rounded-xl bg-slate-900/50 min-h-[300px] gap-3">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <p>Cargando información financiera de {patientName}...</p>
        </div>
      ) : history ? (
        <>
          {/* Tarjetas de Resumen */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-slate-900 border-slate-800 text-slate-100">
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                  Total Pagado
                </CardDescription>
                <CardTitle className="text-emerald-400 text-xl font-extrabold mt-1">
                  {formatCurrency(history.summary.totalPagado)}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className="bg-slate-900 border-slate-800 text-slate-100">
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                  Total Reversado
                </CardDescription>
                <CardTitle className="text-amber-400 text-xl font-extrabold mt-1">
                  {formatCurrency(history.summary.totalReversado)}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className="bg-slate-900 border-slate-800 text-slate-100">
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                  Saldo Neto
                </CardDescription>
                <CardTitle className="text-white text-xl font-extrabold mt-1">
                  {formatCurrency(history.summary.saldoNeto)}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Lista Cronológica */}
          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardHeader>
              <CardTitle className="text-white text-lg">Historial de Transacciones</CardTitle>
              <CardDescription className="text-slate-400">
                Flujo de caja detallado (antiguo a reciente) para {patientName}.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {history.movements.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  No se han registrado transacciones financieras para este paciente.
                </div>
              ) : (
                <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-1">
                  {history.movements.map((move: PaymentRecord) => {
                    const isPago = move.type === "pago"
                    return (
                      <div
                        key={move.id}
                        className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-3.5 rounded-lg border transition-all ${
                          isPago
                            ? "bg-emerald-500/5 border-emerald-500/10 hover:border-emerald-500/20"
                            : "bg-amber-500/5 border-amber-500/10 hover:border-amber-500/20"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                                isPago
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              }`}
                            >
                              {move.type}
                            </span>
                            <span className="text-slate-500 text-[10px] font-mono">
                              ID: {move.id.substring(0, 8)}...
                            </span>
                          </div>
                          {move.reason && (
                            <p className="text-slate-300 text-xs mt-1.5 font-medium">
                              {move.reason}
                            </p>
                          )}
                          {move.reversed_payment_id && (
                            <p className="text-[10px] text-slate-500 mt-1 font-mono">
                              Rev: {move.reversed_payment_id.substring(0, 8)}...
                            </p>
                          )}
                          <p className="text-[10px] text-slate-500 mt-1">
                            {formatDateTime(move.created_at)}
                          </p>
                        </div>
                        <div className="text-right mt-2 sm:mt-0">
                          <span
                            className={`text-sm font-extrabold ${
                              isPago ? "text-emerald-400" : "text-amber-400"
                            }`}
                          >
                            {isPago ? "+" : "-"} {formatCurrency(move.amount)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
