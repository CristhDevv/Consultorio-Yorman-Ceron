"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getAvailableSlotsForDentistAndDate, createAppointment } from "../actions"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert"

interface Patient {
  id: string
  full_name: string
  document_id: string
  phone?: string | null
  email?: string | null
}

interface Dentist {
  id: string
  full_name: string | null
}

interface Slot {
  starts_at: string
  duration_minutes: number
}

interface AppointmentFormProps {
  patients: Patient[]
  dentists: Dentist[]
}

export default function AppointmentForm({ patients, dentists }: AppointmentFormProps) {
  const router = useRouter()

  // Form State
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [patientSearch, setPatientSearch] = useState("")
  const [selectedDentistId, setSelectedDentistId] = useState("")
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [reason, setReason] = useState("")
  const [notes, setNotes] = useState("")

  // UI Control State
  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [showPatientResults, setShowPatientResults] = useState(false)

  // Filter patients based on search text
  const filteredPatients = patientSearch.trim() === ""
    ? []
    : patients.filter(p => 
        p.full_name.toLowerCase().includes(patientSearch.toLowerCase()) ||
        p.document_id.includes(patientSearch)
      ).slice(0, 5)

  // Fetch slots when dentist and date change
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
        const available = await getAvailableSlotsForDentistAndDate(selectedDentistId, selectedDate)
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
  }, [selectedDentistId, selectedDate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPatient || !selectedDentistId || !selectedDate || !selectedSlot) return

    setSubmitting(true)
    setErrorMsg(null)

    try {
      const res = await createAppointment({
        patient_id: selectedPatient.id,
        dentist_id: selectedDentistId,
        starts_at: selectedSlot.starts_at,
        duration_minutes: selectedSlot.duration_minutes,
        status: "programada",
        reason,
        notes,
      })

      if (res.success) {
        router.push("/appointments")
        router.refresh()
      } else {
        setErrorMsg(res.error || "Error al programar la cita.")
        setSubmitting(false)
      }
    } catch (err) {
      console.error("Error creating appointment:", err)
      setErrorMsg("Ocurrió un error inesperado al intentar guardar la cita.")
      setSubmitting(false)
    }
  }

  const formatSlotTime = (isoString: string) => {
    try {
      const date = new Date(isoString)
      return date.toLocaleTimeString("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "UTC", // Slots are stored and returned in UTC
      })
    } catch {
      return isoString
    }
  }

  // Get current date string in YYYY-MM-DD format for min-date attribute
  const todayStr = new Date().toISOString().split("T")[0]

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-4xl mx-auto">
      {errorMsg && (
        <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 text-red-200">
          <AlertTitle>Error en la cita</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Columna Izquierda: Selección de Paciente, Odontólogo y Fecha */}
        <div className="flex flex-col gap-6">
          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardHeader>
              <CardTitle className="text-white text-lg">Paso 1: Paciente y Profesional</CardTitle>
              <CardDescription className="text-slate-400">
                Selecciona la persona que recibirá la atención y el profesional a cargo.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {/* Paciente */}
              <div className="flex flex-col gap-1.5 relative">
                <Label className="text-slate-300 font-medium">Paciente *</Label>
                {selectedPatient ? (
                  <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-lg">
                    <div>
                      <p className="font-semibold text-white text-sm">{selectedPatient.full_name}</p>
                      <p className="text-xs text-slate-400">Doc: {selectedPatient.document_id}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setSelectedPatient(null)
                        setPatientSearch("")
                        setSelectedSlot(null)
                      }}
                      className="text-slate-400 hover:text-white hover:bg-slate-800 text-xs px-2 h-7"
                    >
                      Cambiar
                    </Button>
                  </div>
                ) : (
                  <>
                    <Input
                      type="text"
                      placeholder="Buscar por nombre o número de cédula..."
                      value={patientSearch}
                      onChange={(e) => {
                        setPatientSearch(e.target.value)
                        setShowPatientResults(true)
                      }}
                      onFocus={() => setShowPatientResults(true)}
                      className="bg-slate-950 border-slate-800 text-white focus:border-cyan-500 text-sm"
                    />
                    {showPatientResults && filteredPatients.length > 0 && (
                      <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-slate-950 border border-slate-800 rounded-lg shadow-xl z-50 overflow-hidden">
                        {filteredPatients.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setSelectedPatient(p)
                              setShowPatientResults(false)
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white border-b border-slate-900 last:border-0 transition-colors"
                          >
                            <span className="font-medium text-white block">{p.full_name}</span>
                            <span className="text-xs text-slate-400">Cédula: {p.document_id}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {showPatientResults && patientSearch.trim() !== "" && filteredPatients.length === 0 && (
                      <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-slate-950 border border-slate-800 rounded-lg shadow-xl z-50 p-3 text-xs text-slate-400 text-center">
                        No se encontraron pacientes que coincidan.
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Odontólogo */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dentist" className="text-slate-300 font-medium">Odontólogo *</Label>
                <select
                  id="dentist"
                  value={selectedDentistId}
                  onChange={(e) => {
                    setSelectedDentistId(e.target.value)
                    setSelectedSlot(null)
                  }}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-2.5 text-sm outline-none focus:border-cyan-500 transition-colors"
                >
                  <option value="" disabled>Seleccione un odontólogo...</option>
                  {dentists.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.full_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fecha */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="date" className="text-slate-300 font-medium">Fecha de la Cita *</Label>
                <Input
                  id="date"
                  type="date"
                  min={todayStr}
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value)
                    setSelectedSlot(null)
                  }}
                  className="bg-slate-950 border-slate-800 text-white focus:border-cyan-500 text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Columna Derecha: Selección de Horario */}
        <div className="flex flex-col gap-6">
          <Card className="bg-slate-900 border-slate-800 text-slate-100 h-full flex flex-col">
            <CardHeader>
              <CardTitle className="text-white text-lg">Paso 2: Horarios Disponibles</CardTitle>
              <CardDescription className="text-slate-400">
                Selecciona la hora de la consulta según la disponibilidad.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center">
              {!selectedDentistId || !selectedDate ? (
                <div className="text-center py-10 text-slate-500 text-sm border-2 border-dashed border-slate-800 rounded-xl">
                  Selecciona odontólogo y fecha para ver los horarios disponibles.
                </div>
              ) : loadingSlots ? (
                <div className="flex flex-col items-center gap-3 py-10 text-slate-400">
                  <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm">Buscando bloques de tiempo disponibles...</p>
                </div>
              ) : slots.length === 0 ? (
                <div className="text-center py-10 text-amber-400/80 text-sm border border-amber-500/20 bg-amber-500/5 rounded-xl px-4">
                  No hay horarios disponibles para esta fecha con el odontólogo seleccionado. Por favor intenta con otro día u otro profesional.
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
                            ? "bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/25 scale-[1.02]"
                            : "bg-slate-950 border border-slate-800 text-slate-300 hover:border-cyan-500/50 hover:text-white"
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

      {/* Fila Inferior: Detalles de la Cita (Motivo y Notas) */}
      <Card className="bg-slate-900 border-slate-800 text-slate-100">
        <CardHeader>
          <CardTitle className="text-white text-lg">Paso 3: Detalles Médicos</CardTitle>
          <CardDescription className="text-slate-400">
            Añade el motivo de la consulta y observaciones iniciales.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reason" className="text-slate-300 font-medium">Motivo de la Cita</Label>
            <Input
              id="reason"
              disabled={!selectedSlot}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Limpieza dental, dolor de muela, calza..."
              className="bg-slate-950 border-slate-800 text-white focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes" className="text-slate-300 font-medium">Notas / Observaciones</Label>
            <textarea
              id="notes"
              disabled={!selectedSlot}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Cualquier información complementaria útil..."
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-2.5 text-sm outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
          className="border-slate-800 text-slate-300 hover:bg-slate-800"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={submitting || !selectedPatient || !selectedDentistId || !selectedDate || !selectedSlot}
          className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white"
        >
          {submitting ? "Programando Cita..." : "Programar Cita"}
        </Button>
      </div>
    </form>
  )
}
