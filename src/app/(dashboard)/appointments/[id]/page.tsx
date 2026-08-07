import React from "react"
import Link from "next/link"
import { getCurrentUserWithRole } from "@/shared/lib/supabase/auth"
import { getAppointmentById } from "@/domains/appointments/actions"
import AppointmentStatusControl from "@/domains/appointments/components/AppointmentStatusControl"
import PaymentForm from "@/domains/finance/components/PaymentForm"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"

interface PageProps {
  params: Promise<{ id: string }>
}

type AppointmentStatus = "programada" | "confirmada" | "completada" | "cancelada" | "no_asistio"

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; className: string }> = {
  programada: {
    label: "Programada",
    className: "bg-blue-50 border border-blue-200 text-blue-700",
  },
  confirmada: {
    label: "Confirmada",
    className: "bg-teal-50 border border-teal-250 text-teal-755",
  },
  completada: {
    label: "Completada",
    className: "bg-emerald-50 border border-emerald-250 text-emerald-700",
  },
  cancelada: {
    label: "Cancelada",
    className: "bg-red-50 border border-red-200 text-red-700",
  },
  no_asistio: {
    label: "No asistió",
    className: "bg-amber-50 border border-amber-200 text-amber-700",
  },
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as AppointmentStatus] ?? {
    label: status,
    className: "bg-gray-50 border border-gray-200 text-gray-700",
  }

  return (
    <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${config.className}`}>
      {config.label}
    </span>
  )
}

function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString)
    return date.toLocaleString("es-CO", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC",
    })
  } catch {
    return isoString
  }
}

export default async function AppointmentDetailPage({ params }: PageProps) {
  const { id } = await params

  // Consulta de rol en tiempo real — mismo patrón que el layout del dashboard.
  // No se reutiliza el valor del layout padre; se verifica de forma independiente
  // para mantener el principio de nunca confiar en un rol cacheado o heredado.
  const { role } = await getCurrentUserWithRole()
  const isAdmin = role === "administrador"

  const appointment = await getAppointmentById(id)

  if (!appointment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 max-w-3xl mx-auto">
        <Card className="bg-white border-border text-foreground max-w-md w-full text-center shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground text-xl font-bold">Cita No Encontrada</CardTitle>
            <CardDescription className="text-muted-foreground">
              La cita que buscas no existe o ha sido eliminada del sistema.
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

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      {/* Header con botón Volver y Editar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <Link href="/appointments" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 mb-2">
            ← Volver a la Agenda
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            Detalle de Cita
            <StatusBadge status={appointment.status} />
          </h1>
        </div>

        <Link href={`/appointments/${appointment.id}/edit`}>
          <Button className="bg-white hover:bg-muted text-foreground border border-border font-semibold shadow-xs">
            Editar Cita Completa
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-6">
        {/* Card de Información Básica */}
        <Card className="bg-white border-border text-foreground shadow-sm">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-foreground text-lg font-bold">Información de la Consulta</CardTitle>
            <CardDescription className="text-muted-foreground">
              Historial y planificación de la cita clínica.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 pt-5">
            {/* Paciente */}
            <div className="grid grid-cols-3 gap-2">
              <span className="text-sm font-semibold text-muted-foreground">Paciente:</span>
              <div className="col-span-2">
                {appointment.patients ? (
                  <Link
                    href={`/patients/${appointment.patients.id}`}
                    className="text-sm font-bold text-primary hover:underline"
                  >
                    {appointment.patients.full_name}
                  </Link>
                ) : (
                  <span className="text-sm text-muted-foreground/60">—</span>
                )}
                {appointment.patients?.document_id && (
                  <span className="text-xs text-muted-foreground block">Doc: {appointment.patients.document_id}</span>
                )}
              </div>
            </div>

            {/* Odontólogo */}
            <div className="grid grid-cols-3 gap-2">
              <span className="text-sm font-semibold text-muted-foreground">Odontólogo:</span>
              <span className="col-span-2 text-sm text-foreground">
                {appointment.profiles?.full_name ?? <span className="text-muted-foreground/60">—</span>}
              </span>
            </div>

            {/* Sucursal */}
            <div className="grid grid-cols-3 gap-2">
              <span className="text-sm font-semibold text-muted-foreground">Sucursal:</span>
              <span className="col-span-2 text-sm text-foreground font-semibold">
                {appointment.branches?.name ?? <span className="text-muted-foreground/60">—</span>}
              </span>
            </div>

            {/* Fecha y Hora */}
            <div className="grid grid-cols-3 gap-2">
              <span className="text-sm font-semibold text-muted-foreground">Fecha y Hora:</span>
              <span className="col-span-2 text-sm text-foreground capitalize">
                {formatDateTime(appointment.starts_at)}
              </span>
            </div>

            {/* Duración */}
            <div className="grid grid-cols-3 gap-2">
              <span className="text-sm font-semibold text-muted-foreground">Duración:</span>
              <span className="col-span-2 text-sm text-foreground">
                {appointment.duration_minutes} minutos
              </span>
            </div>

            {/* Motivo */}
            <div className="grid grid-cols-3 gap-2 border-t border-border/60 pt-4">
              <span className="text-sm font-semibold text-muted-foreground">Motivo:</span>
              <span className="col-span-2 text-sm text-foreground bg-muted/20 p-3 rounded-lg border border-border">
                {appointment.reason || <span className="text-muted-foreground/60 italic">No especificado</span>}
              </span>
            </div>

            {/* Notas */}
            <div className="grid grid-cols-3 gap-2">
              <span className="text-sm font-semibold text-muted-foreground">Notas / Observaciones:</span>
              <span className="col-span-2 text-sm text-foreground bg-muted/20 p-3 rounded-lg border border-border">
                {appointment.notes || <span className="text-muted-foreground/60 italic">Sin observaciones</span>}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Control Rápido de Estado */}
        <AppointmentStatusControl appointmentId={appointment.id} currentStatus={appointment.status} />

        {/* Registro de Pagos — solo visible para administradores */}
        {isAdmin && appointment.patients?.id && (
          <PaymentForm
            appointmentId={appointment.id}
            patientId={appointment.patients.id}
          />
        )}
      </div>
    </div>
  )
}
