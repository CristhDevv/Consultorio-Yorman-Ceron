"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getAvailableSlotsForDentistAndDate, updateAppointment } from "../actions"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert"

interface Patient {
  id: string
  full_name: string
  document_id: string
}

interface Dentist {
  id: string
  full_name: string | null
}

interface Slot {
  starts_at: string
  duration_minutes: number
}

interface AppointmentEditFormProps {
  appointmentId: string
  patient: Patient
  dentists: Dentist[]
  initialDentistId: string
  initialDate: string        // YYYY-MM-DD
  initialStartsAt: string    // ISO 8601 UTC — el slot actual preseleccionado
  initialDurationMinutes: number
  initialReason: string
  initialNotes: string
}

export default function AppointmentEditForm({
  appointmentId,
  patient,
  dentists,
  initialDentistId,
  initialDate,
  initialStartsAt,
  initialDurationMinutes,
  initialReason,
  initialNotes,
}: AppointmentEditFormProps) {
  const router = useRouter()

  // Form State — pre-poblado con datos actuales
  const [selectedDentistId, setSelectedDentistId] = useState(initialDentistId)
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>({
    starts_at: initialStartsAt,
    duration_minutes: initialDurationMinutes,
  })
  const [reason, setReason] = useState(initialReason)
  const [notes, setNotes] = useState(initialNotes)

  // UI Control State
  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Fetch slots when dentist and date change, excluding the current appointment
  useEffect(() => {
    async function fetchSlots() {
      if (!selectedDentistId || !selectedDate) {
        setSlots([])
        setSelectedSlot(null)
        return
      }

      setLoadingSlots(true)
      setSelectedSlot(null)
      setErrorMsg(null)

      try {
        // Se pasa appointmentId para excluirla del cálculo y evitar falso conflicto
        const available = await getAvailableSlotsForDentistAndDate(
          selectedDentistId,
          selectedDate,
          appointmentId
        )
        setSlots(available)
      } catch (err) {
        console.error("Error loading available slots:", err)
        setErrorMsg("Ocurrió un error al cargar los horarios disponibles. Por favor, reintenta.")
        setSlots([])
      } finally {
        setLoadingSlots(false)
      }
    }

    fetchSlots()
  }, [selectedDentistId, selectedDate, appointmentId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDentistId || !selectedDate || !selectedSlot) return

    setSubmitting(true)
    setErrorMsg(null)

    try {
      const res = await updateAppointment(appointmentId, {
        dentist_id: selectedDentistId,
        starts_at: selectedSlot.starts_at,
        duration_minutes: selectedSlot.duration_minutes,
        reason,
        notes,
      })

      if (res.success) {
        router.push(`/appointments/${appointmentId}`)
        router.refresh()
      } else {
        setErrorMsg(res.error || "Error al actualizar la cita.")
        setSubmitting(false)
      }
    } catch (err) {
      console.error("Error updating appointment:", err)
      setErrorMsg("Ocurrió un error inesperado al intentar guardar los cambios.")
      setSubmitting(false)
    }
  }

  const formatSlotTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "UTC",
      })
    } catch {
      return isoString
    }
  }

  const todayStr = new Date().toISOString().split("T")[0]

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-4xl mx-auto">
      {errorMsg && (
        <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-750">
          <AlertTitle>Error al guardar los cambios</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Columna Izquierda */}
        <div className="flex flex-col gap-6">
          <Card className="bg-white border-border text-foreground shadow-sm">
            <CardHeader>
              <CardTitle className="text-foreground text-lg font-bold">Paciente y Profesional</CardTitle>
              <CardDescription className="text-muted-foreground">
                El paciente no es modificable en este formulario.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {/* Paciente — solo referencia visual, no editable */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-foreground font-medium">Paciente</Label>
                <div className="flex items-center gap-3 p-3 bg-muted/15 border border-border rounded-lg opacity-85">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-bold shrink-0">
                    {patient.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{patient.full_name}</p>
                    <p className="text-xs text-muted-foreground">Doc: {patient.document_id}</p>
                  </div>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    Fijo
                  </span>
                </div>
              </div>

              {/* Odontólogo — editable */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dentist" className="text-foreground font-medium">Odontólogo *</Label>
                <select
                  id="dentist"
                  value={selectedDentistId}
                  onChange={(e) => {
                    setSelectedDentistId(e.target.value)
                    setSelectedSlot(null)
                  }}
                  className="w-full bg-white border border-border text-foreground rounded-lg p-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                >
                  <option value="" disabled>Seleccione un odontólogo...</option>
                  {dentists.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.full_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fecha — editable */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="date" className="text-foreground font-medium">Fecha de la Cita *</Label>
                <Input
                  id="date"
                  type="date"
                  min={todayStr}
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value)
                    setSelectedSlot(null)
                  }}
                  className="bg-white border-border text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Columna Derecha: Selección de Horario */}
        <div className="flex flex-col gap-6">
          <Card className="bg-white border-border text-foreground h-full flex flex-col shadow-sm">
            <CardHeader>
              <CardTitle className="text-foreground text-lg font-bold">Horarios Disponibles</CardTitle>
              <CardDescription className="text-muted-foreground">
                El horario actual aparece disponible y preseleccionado al cargar.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center">
              {!selectedDentistId || !selectedDate ? (
                <div className="text-center py-10 text-muted-foreground text-sm border-2 border-dashed border-border rounded-xl">
                  Selecciona odontólogo y fecha para ver los horarios disponibles.
                </div>
              ) : loadingSlots ? (
                <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm">Buscando bloques de tiempo disponibles...</p>
                </div>
              ) : slots.length === 0 ? (
                <div className="text-center py-10 text-amber-700 text-sm border border-amber-250 bg-amber-50 rounded-xl px-4">
                  No hay horarios disponibles para esta fecha con el odontólogo seleccionado.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2.5 max-h-[280px] overflow-y-auto pr-1">
                  {slots.map((slot) => {
                    const isSelected = selectedSlot?.starts_at === slot.starts_at
                    return (
                      <button
                        key={slot.starts_at}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-2 px-3 text-xs font-semibold rounded-lg text-center transition-all ${
                          isSelected
                            ? "bg-primary text-white font-bold shadow-xs scale-[1.02]"
                            : "bg-white border border-border text-foreground hover:bg-muted"
                        }`}
                      >
                        {formatSlotTime(slot.starts_at)}
                      </button>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Detalles Médicos — Motivo y Notas, habilitados siempre en edición */}
      <Card className="bg-white border-border text-foreground shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground text-lg font-bold">Detalles Médicos</CardTitle>
          <CardDescription className="text-muted-foreground">
            Motivo y observaciones de la consulta. Ambos campos son opcionales.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reason" className="text-foreground font-medium">Motivo de la Cita</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Limpieza dental, dolor de muela, calza..."
              className="bg-white border-border text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes" className="text-foreground font-medium">Notas / Observaciones</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Cualquier información complementaria útil..."
              rows={3}
              className="w-full bg-white border border-border text-foreground rounded-lg p-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors placeholder-muted-foreground/60 resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Botones de Control */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="border-border text-foreground hover:bg-muted"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={submitting || !selectedDentistId || !selectedDate || !selectedSlot}
          className="bg-primary hover:bg-primary/90 text-white font-semibold shadow-xs"
        >
          {submitting ? "Guardando Cambios..." : "Guardar Cambios"}
        </Button>
      </div>
    </form>
  )
}
