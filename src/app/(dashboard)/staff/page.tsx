import React from "react"
import { redirect } from "next/navigation"
import { getCurrentUserWithRole } from "@/shared/lib/supabase/auth"
import { getStaffMembers } from "@/domains/staff/actions"
import StaffDashboard from "@/domains/staff/components/StaffDashboard"

export const metadata = {
  title: "Gestión de Personal - Consultorio Odontológico",
  description: "Administración de odontólogos y administradores del consultorio.",
}

export default async function StaffPage() {
  const { user, profile, role } = await getCurrentUserWithRole()

  if (!user || !profile) {
    redirect("/login")
  }

  if (role !== "administrador") {
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
