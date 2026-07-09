import React from "react"
import Link from "next/link"
import { getAppointmentById } from "@/domains/appointments/actions"
import AppointmentStatusControl from "@/domains/appointments/components/AppointmentStatusControl"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"

interface PageProps {
  params: Promise<{ id: string }>
}

type AppointmentStatus = "programada" | "confirmada" | "completada" | "cancelada" | "no_asistio"

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; className: string }> = {
  programada: {
    label: "Programada",
    className: "bg-blue-500/10 border border-blue-500/20 text-blue-400",
  },
  confirmada: {
    label: "Confirmada",
    className: "bg-cyan-500/10 border border-cyan-500/20 text-cyan-400",
  },
  completada: {
    label: "Completada",
    className: "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400",
  },
  cancelada: {
    label: "Cancelada",
    className: "bg-red-500/10 border border-red-500/20 text-red-400",
  },
  no_asistio: {
    label: "No asistió",
    className: "bg-amber-500/10 border border-amber-500/20 text-amber-400",
  },
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as AppointmentStatus] ?? {
    label: status,
    className: "bg-slate-500/10 border border-slate-500/20 text-slate-400",
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
    })
  } catch {
    return isoString
  }
}

export default async function AppointmentDetailPage({ params }: PageProps) {
  const { id } = await params
  const appointment = await getAppointmentById(id)

  if (!appointment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Card className="bg-slate-900 border-slate-800 text-slate-100 max-w-md w-full text-center">
          <CardHeader>
            <CardTitle className="text-white text-xl">Cita No Encontrada</CardTitle>
            <CardDescription className="text-slate-400">
              La cita que buscas no existe o ha sido eliminada del sistema.
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

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      {/* Header con botón Volver y Editar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <Link href="/appointments" className="text-xs text-cyan-400 hover:underline flex items-center gap-1 mb-2">
            ← Volver a la Agenda
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            Detalle de Cita
            <StatusBadge status={appointment.status} />
          </h1>
        </div>

        <Link href={`/appointments/${appointment.id}/edit`}>
          <Button className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-medium">
            Editar Cita Completa
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-6">
        {/* Card de Información Básica */}
        <Card className="bg-slate-900 border-slate-800 text-slate-100">
          <CardHeader className="border-b border-slate-800/60">
            <CardTitle className="text-white text-lg">Información de la Consulta</CardTitle>
            <CardDescription className="text-slate-400">
              Historial y planificación de la cita clínica.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 pt-5">
            {/* Paciente */}
            <div className="grid grid-cols-3 gap-2">
              <span className="text-sm font-semibold text-slate-400">Paciente:</span>
              <div className="col-span-2">
                {appointment.patients ? (
                  <Link
                    href={`/patients/${appointment.patients.id}`}
                    className="text-sm font-bold text-cyan-400 hover:underline"
                  >
                    {appointment.patients.full_name}
                  </Link>
                ) : (
                  <span className="text-sm text-slate-500">—</span>
                )}
                {appointment.patients?.document_id && (
                  <span className="text-xs text-slate-500 block">Doc: {appointment.patients.document_id}</span>
                )}
              </div>
            </div>

            {/* Odontólogo */}
            <div className="grid grid-cols-3 gap-2">
              <span className="text-sm font-semibold text-slate-400">Odontólogo:</span>
              <span className="col-span-2 text-sm text-slate-200">
                {appointment.profiles?.full_name ?? <span className="text-slate-500">—</span>}
              </span>
            </div>

            {/* Fecha y Hora */}
            <div className="grid grid-cols-3 gap-2">
              <span className="text-sm font-semibold text-slate-400">Fecha y Hora:</span>
              <span className="col-span-2 text-sm text-slate-200 capitalize">
                {formatDateTime(appointment.starts_at)}
              </span>
            </div>

            {/* Duración */}
            <div className="grid grid-cols-3 gap-2">
              <span className="text-sm font-semibold text-slate-400">Duración:</span>
              <span className="col-span-2 text-sm text-slate-200">
                {appointment.duration_minutes} minutos
              </span>
            </div>

            {/* Motivo */}
            <div className="grid grid-cols-3 gap-2 border-t border-slate-800/40 pt-4">
              <span className="text-sm font-semibold text-slate-400">Motivo:</span>
              <span className="col-span-2 text-sm text-slate-200 bg-slate-950 p-3 rounded-lg border border-slate-850">
                {appointment.reason || <span className="text-slate-500 italic">No especificado</span>}
              </span>
            </div>

            {/* Notas */}
            <div className="grid grid-cols-3 gap-2">
              <span className="text-sm font-semibold text-slate-400">Notas / Observaciones:</span>
              <span className="col-span-2 text-sm text-slate-200 bg-slate-950 p-3 rounded-lg border border-slate-850">
                {appointment.notes || <span className="text-slate-500 italic">Sin observaciones</span>}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Control Rápido de Estado */}
        <AppointmentStatusControl appointmentId={appointment.id} currentStatus={appointment.status} />
      </div>
    </div>
  )
}
