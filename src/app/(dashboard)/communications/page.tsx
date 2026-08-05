import React from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/shared/lib/supabase/server"
import { getCommunicationLogs, getPatientsWithCommunicationLogs } from "@/domains/communications/actions"
import CommunicationLogsDashboard from "@/domains/communications/components/CommunicationLogsDashboard"

export const metadata = {
  title: "Historial de Comunicaciones - Consultorio Odontológico Yorman Cerón",
  description: "Administración y seguimiento de notificaciones enviadas a pacientes.",
}

export default async function CommunicationsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Consultar perfil para comprobar el rol en tiempo real
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "administrador") {
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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Historial de Comunicaciones</h1>
        <p className="text-slate-400 text-sm mt-1">
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
