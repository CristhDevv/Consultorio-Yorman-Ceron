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
      <div className="flex justify-between items-center bg-white border border-border px-6 py-4 rounded-xl shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-foreground">{patient.full_name}</h2>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">ID Paciente: {patient.id}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/patients">
            <Button variant="outline" className="border-border text-foreground hover:bg-muted">
              Atrás
            </Button>
          </Link>
          <Link href={`/patients/${patient.id}/edit`}>
            <Button className="bg-primary hover:bg-primary/90 text-white font-medium shadow-xs">
              Editar Ficha
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Ficha Personal e Identificación */}
        <Card className="bg-white border-border text-foreground md:col-span-1 shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground text-lg">Ficha de Identidad</CardTitle>
            <CardDescription className="text-muted-foreground">Datos personales registrados.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm">
            <div className="flex flex-col gap-0.5 border-b border-border/60 pb-3">
              <span className="text-xs text-muted-foreground">Documento o Cédula:</span>
              <span className="font-mono text-foreground font-semibold">{patient.document_id}</span>
            </div>
            
            <div className="flex flex-col gap-0.5 border-b border-border/60 pb-3">
              <span className="text-xs text-muted-foreground">Fecha de Nacimiento:</span>
              <span className="text-foreground font-semibold">{patient.birth_date}</span>
            </div>

            <div className="flex flex-col gap-0.5 border-b border-border/60 pb-3">
              <span className="text-xs text-muted-foreground">Teléfono:</span>
              <span className="text-foreground font-semibold">{patient.phone || "No registrado"}</span>
            </div>

            <div className="flex flex-col gap-0.5 border-b border-border/60 pb-3">
              <span className="text-xs text-muted-foreground">Email:</span>
              <span className="text-foreground font-semibold truncate">{patient.email || "No registrado"}</span>
            </div>

            <div className="flex flex-col gap-0.5 pb-1">
              <span className="text-xs text-muted-foreground">Dirección:</span>
              <span className="text-foreground font-semibold">{patient.address || "No registrada"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Antecedentes Clínicos - Sección Destacada */}
        <div className="md:col-span-2 flex flex-col gap-6">
          {/* Bloque Alerta Roja si tiene alergias o enfermedades críticas */}
          {(hasAllergies || hasDiseases) && (
            <div className="bg-red-50 border border-red-200 text-red-750 p-4 rounded-xl flex items-start gap-3 shadow-xs">
              <span className="text-2xl">⚠️</span>
              <div>
                <h4 className="font-bold text-red-700 text-sm">ALERTAS MÉDICAS ACTIVAS</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Este paciente presenta antecedentes o alergias que requieren extrema precaución durante tratamientos invasivos o prescripción de medicamentos.
                </p>
              </div>
            </div>
          )}

          <Card className="bg-white border-border text-foreground flex-1 shadow-sm">
            <CardHeader>
              <CardTitle className="text-foreground text-lg">Información de Salud y Antecedentes</CardTitle>
              <CardDescription className="text-muted-foreground">Expediente de salud general del paciente.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              {/* Alergias */}
              <div className="flex flex-col gap-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-red-600">Alergias</h4>
                <div className={`p-3 rounded-lg text-sm border ${hasAllergies ? 'bg-red-50 border-red-200 text-red-700 font-semibold' : 'bg-muted/30 border-border text-muted-foreground'}`}>
                  {patient.allergies || "No reporta alergias conocidas."}
                </div>
              </div>

              {/* Enfermedades */}
              <div className="flex flex-col gap-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600">Enfermedades crónicas / sistémicas</h4>
                <div className={`p-3 rounded-lg text-sm border ${hasDiseases ? 'bg-amber-50 border-amber-200 text-amber-700 font-semibold' : 'bg-muted/30 border-border text-muted-foreground'}`}>
                  {patient.diseases || "No reporta enfermedades sistémicas."}
                </div>
              </div>

              {/* Medicación */}
              <div className="flex flex-col gap-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-600">Medicamentos actuales</h4>
                <div className={`p-3 rounded-lg text-sm border ${hasMedications ? 'bg-teal-50 border-teal-200 text-teal-700 font-semibold' : 'bg-muted/30 border-border text-muted-foreground'}`}>
                  {patient.current_medications || "No toma ningún medicamento actualmente."}
                </div>
              </div>

              {/* Observaciones generales */}
              <div className="flex flex-col gap-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Observaciones y expedientes generales</h4>
                <div className="bg-muted/20 border border-border rounded-lg p-3 text-sm text-foreground min-h-[80px]">
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
