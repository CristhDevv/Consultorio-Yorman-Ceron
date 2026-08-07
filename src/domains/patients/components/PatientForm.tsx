"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { PatientInput } from "../actions"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert"

import { BranchInfo } from "@/domains/branches/constants"

interface PatientFormProps {
  initialData?: PatientInput & { id: string }
  onSubmit: (data: PatientInput) => Promise<{ success: boolean; error?: string }>
  allowedBranches?: BranchInfo[]
  defaultBranchId?: string | null
}

export default function PatientForm({
  initialData,
  onSubmit,
  allowedBranches,
  defaultBranchId,
}: PatientFormProps) {
  const router = useRouter()
  
  const [fullName, setFullName] = useState(initialData?.full_name || "")
  const [documentId, setDocumentId] = useState(initialData?.document_id || "")
  const [phone, setPhone] = useState(initialData?.phone || "")
  const [email, setEmail] = useState(initialData?.email || "")
  const [birthDate, setBirthDate] = useState(initialData?.birth_date || "")
  const [address, setAddress] = useState(initialData?.address || "")
  
  // Clínicos
  const [allergies, setAllergies] = useState(initialData?.allergies || "")
  const [diseases, setDiseases] = useState(initialData?.diseases || "")
  const [currentMedications, setCurrentMedications] = useState(initialData?.current_medications || "")
  const [medicalObservations, setMedicalObservations] = useState(initialData?.medical_observations || "")
  
  // Sucursal (Solo para creación)
  const [branchId, setBranchId] = useState<string>(initialData?.branch_id || defaultBranchId || "")

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)

    const result = await onSubmit({
      full_name: fullName,
      document_id: documentId,
      phone,
      email,
      birth_date: birthDate,
      address,
      allergies,
      diseases,
      current_medications: currentMedications,
      medical_observations: medicalObservations,
      branch_id: branchId,
    })

    if (result.success) {
      router.push("/patients")
      router.refresh()
    } else {
      setErrorMsg(result.error || "Ocurrió un error al procesar el formulario.")
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-4xl mx-auto">
      {errorMsg && (
        <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-700">
          <AlertTitle>Error de validación</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Datos Personales */}
        <Card className="bg-white border-border text-foreground shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground text-lg">Información Personal</CardTitle>
            <CardDescription className="text-muted-foreground">
              Filiación básica y datos de contacto del paciente.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fullName" className="text-foreground font-medium">Nombre Completo *</Label>
              <Input
                id="fullName"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Juan Pérez"
                className="bg-white border-border text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="documentId" className="text-foreground font-medium">Cédula o Documento *</Label>
              <Input
                id="documentId"
                required
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                placeholder="1723456789"
                className="bg-white border-border text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="birthDate" className="text-foreground font-medium">Fecha de Nacimiento *</Label>
              <Input
                id="birthDate"
                type="date"
                required
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="bg-white border-border text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone" className="text-foreground font-medium">Teléfono de Contacto</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0998765432"
                className="bg-white border-border text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-foreground font-medium">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="juan@example.com"
                className="bg-white border-border text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="address" className="text-foreground font-medium">Dirección</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Av. 10 de Agosto y Colón"
                className="bg-white border-border text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {allowedBranches && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="branchId" className="text-foreground font-medium">Sucursal</Label>
                <select
                  id="branchId"
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full bg-white border border-border text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer font-medium"
                >
                  <option value="">Sin sucursal asignada</option>
                  {allowedBranches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Antecedentes Clínicos */}
        <Card className="bg-white border-border text-foreground shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground text-lg">Historial y Antecedentes Clínicos</CardTitle>
            <CardDescription className="text-muted-foreground">
              Datos críticos de salud obligatorios antes de realizar cualquier intervención.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="allergies" className="text-red-650 font-bold">Alergias conocidas</Label>
              <textarea
                id="allergies"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder="Ej: Alérgico a la Penicilina, látex, etc. Dejar vacío si no reporta."
                rows={3}
                className="w-full bg-white border border-border text-foreground rounded-lg p-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all placeholder-muted-foreground/60"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="diseases" className="text-amber-650 font-bold">Enfermedades crónicas / sistémicas</Label>
              <textarea
                id="diseases"
                value={diseases}
                onChange={(e) => setDiseases(e.target.value)}
                placeholder="Ej: Hipertensión arterial, Diabetes tipo 2, Hemofilia, etc."
                rows={3}
                className="w-full bg-white border border-border text-foreground rounded-lg p-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all placeholder-muted-foreground/60"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="currentMedications" className="text-teal-650 font-bold">Medicamentos Actuales</Label>
              <textarea
                id="currentMedications"
                value={currentMedications}
                onChange={(e) => setCurrentMedications(e.target.value)}
                placeholder="Medicamentos que toma actualmente con dosis."
                rows={2}
                className="w-full bg-white border border-border text-foreground rounded-lg p-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder-muted-foreground/60"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="medicalObservations" className="text-foreground font-medium">Observaciones Generales</Label>
              <textarea
                id="medicalObservations"
                value={medicalObservations}
                onChange={(e) => setMedicalObservations(e.target.value)}
                placeholder="Cualquier otra observación relevante para el expediente clínico."
                rows={2}
                className="w-full bg-white border border-border text-foreground rounded-lg p-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder-muted-foreground/60"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="border-border text-foreground hover:bg-muted"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="bg-primary hover:bg-primary/90 text-white font-medium shadow-xs"
        >
          {loading ? "Procesando..." : initialData ? "Guardar Cambios" : "Registrar Paciente"}
        </Button>
      </div>
    </form>
  )
}
