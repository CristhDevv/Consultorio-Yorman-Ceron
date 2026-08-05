"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { updateAppointment } from "../actions"
import { Label } from "@/shared/components/ui/label"
import { Alert, AlertDescription } from "@/shared/components/ui/alert"

type AppointmentStatus = "programada" | "confirmada" | "completada" | "cancelada" | "no_asistio"

interface AppointmentStatusControlProps {
  appointmentId: string
  currentStatus: string
}

const STATUS_OPTIONS: { value: AppointmentStatus; label: string }[] = [
  { value: "programada", label: "Programada" },
  { value: "confirmada", label: "Confirmada" },
  { value: "completada", label: "Completada" },
  { value: "cancelada", label: "Cancelada" },
  { value: "no_asistio", label: "No asistió" },
]

export default function AppointmentStatusControl({ appointmentId, currentStatus }: AppointmentStatusControlProps) {
  const router = useRouter()
  const [status, setStatus] = useState<AppointmentStatus>(currentStatus as AppointmentStatus)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as AppointmentStatus
    setStatus(newStatus)
    setLoading(true)
    setErrorMsg(null)
    setSuccess(false)

    try {
      const res = await updateAppointment(appointmentId, { status: newStatus })
      if (res.success) {
        setSuccess(true)
        router.refresh()
        // Ocultar mensaje de éxito tras 3 segundos
        setTimeout(() => setSuccess(false), 3000)
      } else {
        setErrorMsg(res.error || "No se pudo actualizar el estado de la cita.")
        // Restaurar estado anterior
        setStatus(currentStatus as AppointmentStatus)
      }
    } catch (err) {
      console.error("Error updating status:", err)
      setErrorMsg("Ocurrió un error inesperado.")
      setStatus(currentStatus as AppointmentStatus)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 p-4 bg-muted/20 border border-border rounded-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="statusSelect" className="text-foreground font-semibold text-sm">Cambiar Estado Rápido</Label>
          <span className="text-xs text-muted-foreground">Actualiza el estado de la cita instantáneamente.</span>
        </div>

        <div className="flex items-center gap-3">
          {loading && (
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          )}
          {success && (
            <span className="text-xs font-semibold text-emerald-600">✓ Guardado</span>
          )}
          <select
            id="statusSelect"
            value={status}
            disabled={loading}
            onChange={handleStatusChange}
            className="bg-white border border-border text-foreground rounded-lg px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {errorMsg && (
        <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-750 py-2.5">
          <AlertDescription className="text-xs">{errorMsg}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
