import React from "react"
import { getAppointments } from "@/domains/appointments/actions"
import AppointmentsTable from "@/domains/appointments/components/AppointmentsTable"

export const metadata = {
  title: "Agenda de Citas - Consultorio Odontológico",
  description: "Visualiza y gestiona la agenda de citas del consultorio.",
}

export default async function AppointmentsPage() {
  const appointments = await getAppointments()

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Agenda</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Visualiza, busca y gestiona todas las citas del consultorio.
        </p>
      </div>

      <AppointmentsTable initialAppointments={appointments} />
    </div>
  )
}
