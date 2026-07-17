"use client"

import React, { useState } from "react"
import { Input } from "@/shared/components/ui/input"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import PaymentHistoryView from "./PaymentHistoryView"

interface Patient {
  id: string
  full_name: string
  document_id: string
}

interface FinanceDashboardProps {
  patients: Patient[]
}

export default function FinanceDashboard({ patients }: FinanceDashboardProps) {
  // Selector de pacientes
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [patientSearch, setPatientSearch] = useState("")
  const [showPatientResults, setShowPatientResults] = useState(false)

  // Filtro de pacientes
  const filteredPatients = patientSearch.trim() === ""
    ? []
    : patients.filter(p =>
        p.full_name.toLowerCase().includes(patientSearch.toLowerCase()) ||
        p.document_id.includes(patientSearch)
      ).slice(0, 5)

  // Limpieza del estado al deseleccionar al paciente
  const handleClearPatient = () => {
    setSelectedPatient(null)
    setPatientSearch("")
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Cabecera */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Finanzas de Pacientes
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Consulta el historial de pagos y reversos y el saldo neto consolidado por paciente.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Selector de Paciente */}
        <div className="md:col-span-1 flex flex-col gap-4">
          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardHeader>
              <CardTitle className="text-white text-lg">Buscar Paciente</CardTitle>
              <CardDescription className="text-slate-400">
                Selecciona un paciente para ver su flujo de transacciones.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-1.5 relative">
                {selectedPatient ? (
                  <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-lg">
                    <div>
                      <p className="font-semibold text-white text-sm">{selectedPatient.full_name}</p>
                      <p className="text-xs text-slate-400">Doc: {selectedPatient.document_id}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleClearPatient}
                      className="text-slate-400 hover:text-white hover:bg-slate-800 text-xs px-2 h-7"
                    >
                      Cambiar
                    </Button>
                  </div>
                ) : (
                  <>
                    <Input
                      type="text"
                      placeholder="Nombre o número de documento..."
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
                            <span className="text-xs text-slate-400">Documento: {p.document_id}</span>
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
            </CardContent>
          </Card>
        </div>

        {/* Historial y Resumen */}
        <div className="md:col-span-2 flex flex-col gap-6">
          {!selectedPatient ? (
            <div className="flex flex-col items-center justify-center p-10 text-slate-500 text-sm border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/20 min-h-[300px]">
              Selecciona un paciente a la izquierda para ver su historial de transacciones.
            </div>
          ) : (
            <PaymentHistoryView
              patientId={selectedPatient.id}
              patientName={selectedPatient.full_name}
            />
          )}
        </div>
      </div>
    </div>
  )
}
