"use client"

import React from "react"
import Link from "next/link"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"

interface Patient {
  id: string
  full_name: string
  document_id: string
  phone: string | null
  email: string | null
  birth_date: string
  address: string | null
  allergies: string | null
  diseases: string | null
  current_medications: string | null
  medical_observations: string | null
  created_at: string
}

interface PatientDetailCardProps {
  patient: Patient
}

export default function PatientDetailCard({ patient }: PatientDetailCardProps) {
  // Banderas de alertas críticas
  const hasAllergies = patient.allergies && patient.allergies.trim().length > 0
  const hasDiseases = patient.diseases && patient.diseases.trim().length > 0
  const hasMedications = patient.current_medications && patient.current_medications.trim().length > 0

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Botones de Cabecera */}
      <div className="flex justify-between items-center bg-slate-900 border border-slate-800 px-6 py-4 rounded-xl">
        <div>
          <h2 className="text-xl font-bold text-white">{patient.full_name}</h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">ID Paciente: {patient.id}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/patients">
            <Button variant="outline" className="border-slate-800 text-slate-300 hover:bg-slate-800">
              Atrás
            </Button>
          </Link>
          <Link href={`/patients/${patient.id}/edit`}>
            <Button className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-medium">
              Editar Ficha
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Ficha Personal e Identificación */}
        <Card className="bg-slate-900 border-slate-800 text-slate-100 md:col-span-1">
          <CardHeader>
            <CardTitle className="text-white text-lg">Ficha de Identidad</CardTitle>
            <CardDescription className="text-slate-400">Datos personales registrados.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm">
            <div className="flex flex-col gap-0.5 border-b border-slate-800/60 pb-3">
              <span className="text-xs text-slate-500">Documento o Cédula:</span>
              <span className="font-mono text-white font-semibold">{patient.document_id}</span>
            </div>
            
            <div className="flex flex-col gap-0.5 border-b border-slate-800/60 pb-3">
              <span className="text-xs text-slate-500">Fecha de Nacimiento:</span>
              <span className="text-white font-semibold">{patient.birth_date}</span>
            </div>

            <div className="flex flex-col gap-0.5 border-b border-slate-800/60 pb-3">
              <span className="text-xs text-slate-500">Teléfono:</span>
              <span className="text-white font-semibold">{patient.phone || "No registrado"}</span>
            </div>

            <div className="flex flex-col gap-0.5 border-b border-slate-800/60 pb-3">
              <span className="text-xs text-slate-500">Email:</span>
              <span className="text-white font-semibold truncate">{patient.email || "No registrado"}</span>
            </div>

            <div className="flex flex-col gap-0.5 pb-1">
              <span className="text-xs text-slate-500">Dirección:</span>
              <span className="text-white font-semibold">{patient.address || "No registrada"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Antecedentes Clínicos - Sección Destacada */}
        <div className="md:col-span-2 flex flex-col gap-6">
          {/* Bloque Alerta Roja si tiene alergias o enfermedades críticas */}
          {(hasAllergies || hasDiseases) && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-xl flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h4 className="font-bold text-red-400 text-sm">ALERTAS MÉDICAS ACTIVAS</h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Este paciente presenta antecedentes o alergias que requieren extrema precaución durante tratamientos invasivos o prescripción de medicamentos.
                </p>
              </div>
            </div>
          )}

          <Card className="bg-slate-900 border-slate-800 text-slate-100 flex-1">
            <CardHeader>
              <CardTitle className="text-white text-lg">Información de Salud y Antecedentes</CardTitle>
              <CardDescription className="text-slate-400">Expediente de salud general del paciente.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              {/* Alergias */}
              <div className="flex flex-col gap-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-red-400">Alergias</h4>
                <div className={`p-3 rounded-lg text-sm ${hasAllergies ? 'bg-red-950/20 border border-red-900/30 text-red-100 font-semibold' : 'bg-slate-950 border border-slate-850 text-slate-400'}`}>
                  {patient.allergies || "No reporta alergias conocidas."}
                </div>
              </div>

              {/* Enfermedades */}
              <div className="flex flex-col gap-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">Enfermedades crónicas / sistémicas</h4>
                <div className={`p-3 rounded-lg text-sm ${hasDiseases ? 'bg-amber-950/20 border border-amber-900/30 text-amber-100 font-semibold' : 'bg-slate-950 border border-slate-850 text-slate-400'}`}>
                  {patient.diseases || "No reporta enfermedades sistémicas."}
                </div>
              </div>

              {/* Medicación */}
              <div className="flex flex-col gap-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400">Medicamentos actuales</h4>
                <div className={`p-3 rounded-lg text-sm ${hasMedications ? 'bg-cyan-950/20 border border-cyan-900/30 text-cyan-100 font-semibold' : 'bg-slate-950 border border-slate-850 text-slate-400'}`}>
                  {patient.current_medications || "No toma ningún medicamento actualmente."}
                </div>
              </div>

              {/* Observaciones generales */}
              <div className="flex flex-col gap-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Observaciones y expedientes generales</h4>
                <div className="bg-slate-950 border border-slate-850 rounded-lg p-3 text-sm text-slate-300 min-h-[80px]">
                  {patient.medical_observations || "Sin observaciones adicionales."}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
