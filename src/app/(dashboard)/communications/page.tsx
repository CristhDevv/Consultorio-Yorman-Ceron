import React from "react"
import { redirect } from "next/navigation"
import { getCurrentUserWithRole } from "@/shared/lib/supabase/auth"
import { getCommunicationLogs, getPatientsWithCommunicationLogs } from "@/domains/communications/actions"
import CommunicationLogsDashboard from "@/domains/communications/components/CommunicationLogsDashboard"

export const metadata = {
  title: "Historial de Comunicaciones - Consultorio Odontológico",
  description: "Administración y seguimiento de notificaciones enviadas a pacientes.",
}

export default async function CommunicationsPage() {
  const { user, profile, role } = await getCurrentUserWithRole()

  if (!user || !profile) {
    redirect("/login")
  }

  if (role !== "administrador") {
    redirect("/")
  }

  // Server Action wrappers inline
  async function handleFetchLogs(filters?: { status?: string; patientId?: string }) {
    "use server"
    return getCommunicationLogs(filters)
  }

  async function handleFetchPatients() {
    "use server"
    return getPatientsWithCommunicationLogs()
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Historial de Comunicaciones</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Registro de auditoría y seguimiento de correos y notificaciones automáticas enviadas a los pacientes.
        </p>
      </div>

      <CommunicationLogsDashboard
        onFetchLogs={handleFetchLogs}
        onFetchPatients={handleFetchPatients}
      />
    </div>
  )
}
