import React from "react"
import Link from "next/link"
import { getAppointmentById } from "@/domains/appointments/actions"
import { createClient } from "@/shared/lib/supabase/server"
import AppointmentEditForm from "@/domains/appointments/components/AppointmentEditForm"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"

interface PageProps {
  params: Promise<{ id: string }>
}

// Solo citas en estos estados pueden editarse
const EDITABLE_STATUSES = ["programada", "confirmada"]

export default async function EditAppointmentPage({ params }: PageProps) {
  const { id } = await params
  const appointment = await getAppointmentById(id)

  // Caso 1: Cita no encontrada
  if (!appointment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Card className="bg-slate-900 border-slate-800 text-slate-100 max-w-md w-full text-center">
          <CardHeader>
            <CardTitle className="text-white text-xl">Cita No Encontrada</CardTitle>
            <CardDescription className="text-slate-400">
              La cita que intentas editar no existe o ha sido eliminada del sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/appointments">
              <Button className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white w-full">
                Volver a la Agenda
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Caso 2: Cita existe pero no es editable por su estado
  if (!EDITABLE_STATUSES.includes(appointment.status)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Card className="bg-slate-900 border-amber-500/20 text-slate-100 max-w-md w-full text-center">
          <CardHeader>
            <CardTitle className="text-white text-xl">Edición No Disponible</CardTitle>
            <CardDescription className="text-slate-400">
              Solo pueden editarse citas con estado <span className="font-semibold text-amber-400">Programada</span> o{" "}
              <span className="font-semibold text-cyan-400">Confirmada</span>. Esta cita tiene estado{" "}
              <span className="font-semibold text-white capitalize">{appointment.status.replace("_", " ")}</span> y no puede modificarse.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Link href={`/appointments/${id}`}>
              <Button className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white w-full">
                Ver Detalle de la Cita
              </Button>
            </Link>
            <Link href="/appointments">
              <Button variant="outline" className="border-slate-800 text-slate-300 hover:bg-slate-800 w-full">
                Volver a la Agenda
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Caso 3: Cita editable — obtener odontólogos para el selector
  const supabase = await createClient()
  const { data: dentistsData } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "odontologo")
    .order("full_name")

  const dentists = dentistsData || []

  // Derivar fecha (YYYY-MM-DD) desde el starts_at de la cita
  const initialDate = appointment.starts_at.split("T")[0]

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <Link
          href={`/appointments/${id}`}
          className="text-xs text-cyan-400 hover:underline flex items-center gap-1 mb-2"
        >
          ← Volver al detalle de la cita
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Editar Cita</h1>
        <p className="text-slate-400 text-sm mt-1">
          Modifica la fecha, horario, odontólogo, motivo u observaciones de la cita. El paciente no puede cambiarse desde aquí.
        </p>
      </div>

      <AppointmentEditForm
        appointmentId={appointment.id}
        patient={{
          id: appointment.patients?.id ?? "",
          full_name: appointment.patients?.full_name ?? "—",
          document_id: appointment.patients?.document_id ?? "—",
        }}
        dentists={dentists}
        initialDentistId={appointment.dentist_id}
        initialDate={initialDate}
        initialStartsAt={appointment.starts_at}
        initialDurationMinutes={appointment.duration_minutes}
        initialReason={appointment.reason ?? ""}
        initialNotes={appointment.notes ?? ""}
      />
    </div>
  )
}
