"use client"

import React, { useState } from "react"
import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { Input } from "@/shared/components/ui/input"
import { Button } from "@/shared/components/ui/button"

type AppointmentStatus = "programada" | "confirmada" | "completada" | "cancelada" | "no_asistio"

interface Appointment {
  id: string
  starts_at: string
  duration_minutes: number
  status: string
  reason: string | null
  notes: string | null
  dentist_id: string
  patients: {
    id: string
    full_name: string
    document_id: string
  } | null
  profiles: {
    id: string
    full_name: string | null
  } | null
}

interface AppointmentsTableProps {
  initialAppointments: Appointment[]
}

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
    <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wide ${config.className}`}>
      {config.label}
    </span>
  )
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleString("es-CO", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
}

export default function AppointmentsTable({ initialAppointments }: AppointmentsTableProps) {
  const [search, setSearch] = useState("")

  const filteredAppointments = initialAppointments.filter((a) => {
    const q = search.toLowerCase()
    const patientName = a.patients?.full_name?.toLowerCase() ?? ""
    const dentistName = a.profiles?.full_name?.toLowerCase() ?? ""
    return patientName.includes(q) || dentistName.includes(q)
  })

  return (
    <div className="flex flex-col gap-4">
      {/* Controles de Búsqueda y Acción */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre del paciente u odontólogo..."
          className="bg-slate-950 border-slate-800 text-white focus:border-cyan-500 w-full sm:max-w-md"
        />
        <Link href="/appointments/new">
          <Button className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white w-full sm:w-auto font-medium">
            + Nueva Cita
          </Button>
        </Link>
      </div>

      {/* Tabla de Citas */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <Table className="text-slate-200">
          <TableHeader className="bg-slate-950/50 border-b border-slate-800">
            <TableRow className="border-b border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400 font-bold">Fecha y Hora</TableHead>
              <TableHead className="text-slate-400 font-bold">Paciente</TableHead>
              <TableHead className="text-slate-400 font-bold">Odontólogo</TableHead>
              <TableHead className="text-slate-400 font-bold">Estado</TableHead>
              <TableHead className="text-slate-400 font-bold">Motivo</TableHead>
              <TableHead className="text-right text-slate-400 font-bold">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAppointments.length === 0 ? (
              <TableRow className="border-b border-slate-800 hover:bg-transparent">
                <TableCell colSpan={6} className="text-center py-10 text-slate-500">
                  {search
                    ? "No se encontraron citas que coincidan con la búsqueda."
                    : "No hay citas registradas en el sistema."}
                </TableCell>
              </TableRow>
            ) : (
              filteredAppointments.map((appointment) => (
                <TableRow
                  key={appointment.id}
                  className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors"
                >
                  <TableCell className="font-mono text-xs text-slate-300 whitespace-nowrap">
                    {formatDateTime(appointment.starts_at)}
                  </TableCell>
                  <TableCell className="font-semibold text-white">
                    {appointment.patients?.full_name ?? <span className="text-slate-500">—</span>}
                  </TableCell>
                  <TableCell className="text-slate-300">
                    {appointment.profiles?.full_name ?? <span className="text-slate-500">—</span>}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={appointment.status} />
                  </TableCell>
                  <TableCell className="text-slate-400 max-w-[200px] truncate">
                    {appointment.reason || <span className="text-slate-600">—</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/appointments/${appointment.id}`}>
                        <Button
                          variant="ghost"
                          className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 h-8 px-3"
                        >
                          Ver
                        </Button>
                      </Link>
                      <Link href={`/appointments/${appointment.id}/edit`}>
                        <Button
                          variant="ghost"
                          className="text-slate-400 hover:text-white hover:bg-slate-800 h-8 px-3"
                        >
                          Editar
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
