import { redirect } from "next/navigation"
import DashboardClientLayout from "./DashboardClientLayout"
import { resolveActiveBranch, getAllowedBranches } from "@/domains/branches/session"
import { getCurrentUserWithRole } from "@/shared/lib/supabase/auth"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile, role } = await getCurrentUserWithRole()

  if (!user || !profile) {
    redirect("/login")
  }

  if (role === "paciente") {
    redirect("/portal")
  }

  const activeRole = role ?? ""
  const resolvedBranch = await resolveActiveBranch(user.id, activeRole)
  const allowedBranches = await getAllowedBranches(user.id, activeRole)

  return (
    <DashboardClientLayout
      role={profile?.role ?? undefined}
      fullName={profile?.full_name ?? undefined}
      email={user.email}
      allowedBranches={allowedBranches}
      activeBranchId={resolvedBranch.activeBranchId}
      shouldSync={resolvedBranch.shouldSync}
      branchStatus={resolvedBranch.status}
    >
      {children}
    </DashboardClientLayout>
  )
}
