import { createClient } from "@/shared/lib/supabase/server"
import { redirect } from "next/navigation"
import DashboardClientLayout from "./DashboardClientLayout"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single()

  if (profile?.role === "paciente") {
    redirect("/portal")
  }

  return (
    <DashboardClientLayout
      role={profile?.role ?? undefined}
      fullName={profile?.full_name ?? undefined}
      email={user.email}
    >
      {children}
    </DashboardClientLayout>
  )
}
