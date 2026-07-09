import React from "react"
import { getPatients } from "@/domains/patients/actions"
import { createClient } from "@/shared/lib/supabase/server"
import AppointmentForm from "@/domains/appointments/components/AppointmentForm"

export const metadata = {
  title: "Nueva Cita - Consultorio Odontológico Yorman Cerón",
  description: "Programar una nueva cita odontológica.",
}

export default async function NewAppointmentPage() {
  const patients = await getPatients()

  const supabase = await createClient()
  const { data: dentistsData, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "odontologo")
    .order("full_name")

  if (error) {
    console.error("Error fetching dentists:", error)
  }

  const dentists = dentistsData || []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Programar Cita</h1>
        <p className="text-slate-400 text-sm mt-1">
          Completa el formulario secuencial para agendar una nueva cita médica.
        </p>
      </div>

      <AppointmentForm patients={patients} dentists={dentists} />
    </div>
  )
}
