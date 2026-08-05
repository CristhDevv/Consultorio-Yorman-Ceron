"use client"

import React, { useState, useEffect } from "react"
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
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!patientId) {
      return
    }

    let cancelled = false

    // Función async interna para que los setState no queden directamente en el cuerpo del effect
    async function loadHistory() {
      setHistory(null)
      setErrorMsg(null)
      setIsLoading(true)
      try {
        const res = await getPatientPaymentHistory(patientId)
        if (cancelled) return
        if (res.success) {
          setHistory(res.data)
        } else {
          setErrorMsg(res.error)
        }
      } catch (err) {
        if (cancelled) return
        console.error("Error loading payment history:", err)
        setErrorMsg("Ocurrió un error inesperado al cargar el historial financiero.")
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadHistory()

    return () => {
      cancelled = true
    }
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
        <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-750">
          <AlertTitle>Error al cargar el historial</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-10 text-muted-foreground text-sm border border-border rounded-xl bg-white min-h-[300px] gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p>Cargando información financiera de {patientName}...</p>
        </div>
      ) : history ? (
        <>
          {/* Tarjetas de Resumen */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-white border-border text-foreground shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="text-muted-foreground text-xs font-bold uppercase tracking-wider">
                  Total Pagado
                </CardDescription>
                <CardTitle className="text-emerald-600 text-xl font-extrabold mt-1">
                  {formatCurrency(history.summary.totalPagado)}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className="bg-white border-border text-foreground shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="text-muted-foreground text-xs font-bold uppercase tracking-wider">
                  Total Reversado
                </CardDescription>
                <CardTitle className="text-amber-600 text-xl font-extrabold mt-1">
                  {formatCurrency(history.summary.totalReversado)}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className="bg-white border-border text-foreground shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="text-muted-foreground text-xs font-bold uppercase tracking-wider">
                  Saldo Neto
                </CardDescription>
                <CardTitle className="text-foreground text-xl font-extrabold mt-1">
                  {formatCurrency(history.summary.saldoNeto)}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Lista Cronológica */}
          <Card className="bg-white border-border text-foreground shadow-sm">
            <CardHeader>
              <CardTitle className="text-foreground text-lg font-bold">Historial de Transacciones</CardTitle>
              <CardDescription className="text-muted-foreground">
                Flujo de caja detallado (antiguo a reciente) para {patientName}.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {history.movements.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
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
                            ? "bg-emerald-50/10 border-emerald-100 hover:border-emerald-200"
                            : "bg-amber-50/10 border-amber-100 hover:border-amber-200"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                                isPago
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}
                            >
                              {move.type}
                            </span>
                            <span className="text-muted-foreground text-[10px] font-mono">
                              ID: {move.id.substring(0, 8)}...
                            </span>
                          </div>
                          {move.reason && (
                            <p className="text-foreground text-xs mt-1.5 font-medium">
                              {move.reason}
                            </p>
                          )}
                          {move.reversed_payment_id && (
                            <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                              Rev: {move.reversed_payment_id.substring(0, 8)}...
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {formatDateTime(move.created_at)}
                          </p>
                        </div>
                        <div className="text-right mt-2 sm:mt-0">
                          <span
                            className={`text-sm font-extrabold ${
                              isPago ? "text-emerald-600" : "text-amber-600"
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
