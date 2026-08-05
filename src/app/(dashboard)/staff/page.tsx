import React from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/shared/lib/supabase/server"
import { getStaffMembers } from "@/domains/staff/actions"
import StaffDashboard from "@/domains/staff/components/StaffDashboard"

export const metadata = {
  title: "Gestión de Personal - Consultorio Odontológico Yorman Cerón",
  description: "Administración de odontólogos y administradores del consultorio.",
}

export default async function StaffPage() {
  const supabase = await createClient()

  // 1. Verificar sesión activa
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // 2. Verificar rol administrador en tiempo real
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "administrador") {
    redirect("/")
  }

  // 3. Obtener listado de miembros del personal
  const staff = await getStaffMembers()

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Personal y Odontólogos</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Administración y registro del personal médico y de administración del consultorio.
        </p>
      </div>

      <StaffDashboard initialStaff={staff} />
    </div>
  )
}
