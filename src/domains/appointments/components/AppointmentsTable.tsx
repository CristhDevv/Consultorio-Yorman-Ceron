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
    className: "bg-blue-50 border border-blue-200 text-blue-700",
  },
  confirmada: {
    label: "Confirmada",
    className: "bg-teal-50 border border-teal-200 text-teal-750",
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
    <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wide ${config.className}`}>
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
    timeZone: "UTC",
  })
}

export default function AppointmentsTable({ initialAppointments }: AppointmentsTableProps) {
  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    setCurrentPage(1)
  }

  const filteredAppointments = initialAppointments.filter((a) => {
    const q = search.toLowerCase()
    const patientName = a.patients?.full_name?.toLowerCase() ?? ""
    const dentistName = a.profiles?.full_name?.toLowerCase() ?? ""
    return patientName.includes(q) || dentistName.includes(q)
  })

  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage)
  const paginatedAppointments = filteredAppointments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Controles de Búsqueda y Acción */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white border border-border p-4 rounded-xl shadow-sm">
        <Input
          type="text"
          value={search}
          onChange={handleSearchChange}
          placeholder="Buscar por nombre del paciente u odontólogo..."
          className="bg-white border-border text-foreground focus:border-primary w-full sm:max-w-md"
        />
        <Link href="/appointments/new">
          <Button className="bg-primary hover:bg-primary/90 text-white w-full sm:w-auto font-medium shadow-xs">
            + Nueva Cita
          </Button>
        </Link>
      </div>

      {/* Tabla de Citas */}
      <div className="bg-white border border-border rounded-xl overflow-hidden shadow-xs">
        <Table>
          <TableHeader className="bg-muted/40 border-b border-border">
            <TableRow className="border-b border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground font-semibold">Fecha y Hora</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Paciente</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Odontólogo</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Estado</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Motivo</TableHead>
              <TableHead className="text-right text-muted-foreground font-semibold">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedAppointments.length === 0 ? (
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  {search
                    ? "No se encontraron citas que coincidan con la búsqueda."
                    : "No hay citas registradas en el sistema."}
                </TableCell>
              </TableRow>
            ) : (
              paginatedAppointments.map((appointment) => (
                <TableRow
                  key={appointment.id}
                  className="border-b border-border/60 hover:bg-muted/30 transition-colors"
                >
                  <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateTime(appointment.starts_at)}
                  </TableCell>
                  <TableCell className="font-semibold text-foreground">
                    {appointment.patients?.full_name ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {appointment.profiles?.full_name ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={appointment.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                    {appointment.reason || <span className="text-muted-foreground/60">—</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/appointments/${appointment.id}`}>
                        <Button
                          type="button"
                          variant="ghost"
                          className="text-primary hover:text-primary/90 hover:bg-primary/10 h-8 px-3"
                        >
                          Ver
                        </Button>
                      </Link>
                      <Link href={`/appointments/${appointment.id}/edit`}>
                        <Button
                          type="button"
                          variant="ghost"
                          className="text-muted-foreground hover:text-foreground hover:bg-muted h-8 px-3"
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

      {/* Controles de Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white border border-border p-4 rounded-xl shadow-sm">
          <p className="text-sm text-muted-foreground">
            Mostrando <span className="font-semibold text-foreground">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredAppointments.length)}</span> a <span className="font-semibold text-foreground">{Math.min(currentPage * itemsPerPage, filteredAppointments.length)}</span> de <span className="font-semibold text-foreground">{filteredAppointments.length}</span> citas
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="text-foreground border-border hover:bg-muted font-medium"
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="text-foreground border-border hover:bg-muted font-medium"
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
