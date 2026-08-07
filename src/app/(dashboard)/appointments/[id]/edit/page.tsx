import React from "react"
import Link from "next/link"
import { getAppointmentById } from "@/domains/appointments/actions"
import { createClient } from "@/shared/lib/supabase/server"
import { getCurrentUserWithRole } from "@/shared/lib/supabase/auth"
import { getAllowedBranches } from "@/domains/branches/session"
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
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 max-w-5xl mx-auto">
        <Card className="bg-white border-border text-foreground max-w-md w-full text-center shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground text-xl font-bold">Cita No Encontrada</CardTitle>
            <CardDescription className="text-muted-foreground">
              La cita que intentas editar no existe o ha sido eliminada del sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/appointments">
              <Button className="bg-primary hover:bg-primary/90 text-white w-full shadow-xs">
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
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 max-w-5xl mx-auto">
        <Card className="bg-amber-50 border-amber-200 text-amber-900 max-w-md w-full text-center shadow-xs">
          <CardHeader>
            <CardTitle className="text-amber-800 text-xl font-bold">Edición No Disponible</CardTitle>
            <CardDescription className="text-amber-700">
              Solo pueden editarse citas con estado <span className="font-bold text-amber-900">Programada</span> o{" "}
              <span className="font-bold text-teal-800">Confirmada</span>. Esta cita tiene estado{" "}
              <span className="font-bold text-amber-950 capitalize">{appointment.status.replace("_", " ")}</span> y no puede modificarse.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Link href={`/appointments/${id}`}>
              <Button className="bg-white hover:bg-muted text-foreground border border-border w-full shadow-xs">
                Ver Detalle de la Cita
              </Button>
            </Link>
            <Link href="/appointments">
              <Button variant="outline" className="border-border text-foreground hover:bg-muted bg-transparent w-full">
                Volver a la Agenda
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Caso 3: Cita editable — obtener odontólogos y sucursales permitidas
  const supabase = await createClient()
  const { user, role } = await getCurrentUserWithRole()

  const allowedBranches = user ? await getAllowedBranches(user.id, role ?? "") : []

  const { data: dentistsData } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "odontologo")
    .order("full_name")

  const dentists = dentistsData || []

  // Derivar fecha (YYYY-MM-DD) desde el starts_at de la cita
  const initialDate = appointment.starts_at.split("T")[0]

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <Link
          href={`/appointments/${id}`}
          className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 mb-2"
        >
          ← Volver al detalle de la cita
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Editar Cita</h1>
        <p className="text-muted-foreground text-sm mt-1">
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
        allowedBranches={allowedBranches}
        initialBranchId={appointment.branch_id}
      />
    </div>
  )
}
