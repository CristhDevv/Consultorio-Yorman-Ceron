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

  // Filtrado reactivo en el cliente para inmediatez absoluta
  const filteredPatients = initialPatients.filter((p) => {
    const q = search.toLowerCase()
    return (
      p.full_name.toLowerCase().includes(q) ||
      p.document_id.includes(q) ||
      (p.phone && p.phone.includes(q))
    )
  })

  return (
    <div className="flex flex-col gap-4">
      {/* Controles de Búsqueda y Acción */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, documento o teléfono..."
          className="bg-slate-950 border-slate-800 text-white focus:border-cyan-500 w-full sm:max-w-md"
        />
        <Link href="/patients/new">
          <Button className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white w-full sm:w-auto font-medium">
            + Nuevo Paciente
          </Button>
        </Link>
      </div>

      {/* Tabla de Pacientes */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <Table className="text-slate-200">
          <TableHeader className="bg-slate-950/50 border-b border-slate-800">
            <TableRow className="border-b border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400 font-bold">Paciente</TableHead>
              <TableHead className="text-slate-400 font-bold">Documento</TableHead>
              <TableHead className="text-slate-400 font-bold">Teléfono</TableHead>
              <TableHead className="text-slate-400 font-bold">F. Nacimiento</TableHead>
              <TableHead className="text-slate-400 font-bold">Alertas Médicas</TableHead>
              <TableHead className="text-right text-slate-400 font-bold">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPatients.length === 0 ? (
              <TableRow className="border-b border-slate-850 hover:bg-transparent">
                <TableCell colSpan={6} className="text-center py-10 text-slate-500">
                  No se encontraron pacientes registrados en el sistema.
                </TableCell>
              </TableRow>
            ) : (
              filteredPatients.map((patient) => {
                // Generar badges de alerta si tiene antecedentes
                const hasAllergies = patient.allergies && patient.allergies.trim().length > 0
                const hasDiseases = patient.diseases && patient.diseases.trim().length > 0

                return (
                  <TableRow key={patient.id} className="border-b border-slate-800/60 hover:bg-slate-850/30 transition-colors">
                    <TableCell className="font-semibold text-white">
                      {patient.full_name}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-300">
                      {patient.document_id}
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {patient.phone || "—"}
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {patient.birth_date}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {hasAllergies && (
                          <span className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] px-2 py-0.5 rounded font-bold uppercase">
                            Alergia
                          </span>
                        )}
                        {hasDiseases && (
                          <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] px-2 py-0.5 rounded font-bold uppercase">
                            Enfermedad
                          </span>
                        )}
                        {!hasAllergies && !hasDiseases && (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/patients/${patient.id}`}>
                          <Button variant="ghost" className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 h-8 px-3">
                            Ver
                          </Button>
                        </Link>
                        <Link href={`/patients/${patient.id}/edit`}>
                          <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-800 h-8 px-3">
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
    </div>
  )
}
