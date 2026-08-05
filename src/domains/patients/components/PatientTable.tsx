"use client"

import React, { useState } from "react"
import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { Input } from "@/shared/components/ui/input"
import { Button } from "@/shared/components/ui/button"

interface Patient {
  id: string
  full_name: string
  document_id: string
  phone: string | null
  email: string | null
  birth_date: string
  allergies: string | null
  diseases: string | null
}

interface PatientTableProps {
  initialPatients: Patient[]
}

export default function PatientTable({ initialPatients }: PatientTableProps) {
  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    setCurrentPage(1)
  }

  // Filtrado reactivo en el cliente para inmediatez absoluta
  const filteredPatients = initialPatients.filter((p) => {
    const q = search.toLowerCase()
    return (
      p.full_name.toLowerCase().includes(q) ||
      p.document_id.includes(q) ||
      (p.phone && p.phone.includes(q))
    )
  })

  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage)
  const paginatedPatients = filteredPatients.slice(
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
          placeholder="Buscar por nombre, documento o teléfono..."
          className="bg-white border-border text-foreground focus:border-primary w-full sm:max-w-md"
        />
        <Link href="/patients/new">
          <Button className="bg-primary hover:bg-primary/90 text-white w-full sm:w-auto font-medium shadow-xs">
            + Nuevo Paciente
          </Button>
        </Link>
      </div>

      {/* Tabla de Pacientes */}
      <div className="bg-white border border-border rounded-xl overflow-hidden shadow-xs">
        <Table>
          <TableHeader className="bg-muted/40 border-b border-border">
            <TableRow className="border-b border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground font-semibold">Paciente</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Documento</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Teléfono</TableHead>
              <TableHead className="text-muted-foreground font-semibold">F. Nacimiento</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Alertas Médicas</TableHead>
              <TableHead className="text-right text-muted-foreground font-semibold">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedPatients.length === 0 ? (
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  No se encontraron pacientes registrados en el sistema.
                </TableCell>
              </TableRow>
            ) : (
              paginatedPatients.map((patient) => {
                // Generar badges de alerta si tiene antecedentes
                const hasAllergies = patient.allergies && patient.allergies.trim().length > 0
                const hasDiseases = patient.diseases && patient.diseases.trim().length > 0

                return (
                  <TableRow key={patient.id} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                    <TableCell className="font-semibold text-foreground">
                      {patient.full_name}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {patient.document_id}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {patient.phone || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {patient.birth_date}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {hasAllergies && (
                          <span className="bg-red-50 border border-red-200 text-red-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase">
                            Alergia
                          </span>
                        )}
                        {hasDiseases && (
                          <span className="bg-amber-50 border border-amber-200 text-amber-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase">
                            Enfermedad
                          </span>
                        )}
                        {!hasAllergies && !hasDiseases && (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/patients/${patient.id}`}>
                          <Button variant="ghost" className="text-primary hover:text-primary/90 hover:bg-primary/10 h-8 px-3">
                            Ver
                          </Button>
                        </Link>
                        <Link href={`/patients/${patient.id}/edit`}>
                          <Button variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-muted h-8 px-3">
                            Editar
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Controles de Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white border border-border p-4 rounded-xl shadow-sm">
          <p className="text-sm text-muted-foreground">
            Mostrando <span className="font-semibold text-foreground">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredPatients.length)}</span> a <span className="font-semibold text-foreground">{Math.min(currentPage * itemsPerPage, filteredPatients.length)}</span> de <span className="font-semibold text-foreground">{filteredPatients.length}</span> pacientes
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
