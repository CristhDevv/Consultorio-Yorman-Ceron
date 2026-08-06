import { cookies } from "next/headers"
import { createClient } from "@/shared/lib/supabase/server"
import { ACTIVE_BRANCH_COOKIE_NAME, ALL_BRANCHES_VALUE, BranchInfo } from "./constants"

export type ResolveBranchResult =
  | { status: "success"; activeBranchId: string; shouldSync: boolean }
  | { status: "no_branch"; activeBranchId: null; shouldSync: boolean }

/**
 * Fetches all allowed active branches for a user based on their role.
 * This is the single source of truth for branch permissions.
 */
export async function getAllowedBranches(
  userId: string,
  role: string
): Promise<BranchInfo[]> {
  const supabase = await createClient()

  if (role === "administrador") {
    // Admin has access to all active branches
    const { data: branches, error } = await supabase
      .from("branches")
      .select("id, name")
      .eq("is_active", true)

    if (error) {
      console.error("Error fetching branches for admin:", error)
      return []
    }
    return branches || []
  } else if (role === "odontologo") {
    // Odontologo only has access to branches mapped in dentist_branches (and must be active)
    const { data: dentistBranches, error } = await supabase
      .from("dentist_branches")
      .select("branch_id, branches(name, is_active)")
      .eq("dentist_id", userId)

    if (error) {
      console.error("Error fetching dentist branches:", error)
      return []
    }

    // Filter and map active branches safely with type assertions
    const typedBranches = (dentistBranches as unknown as { 
      branch_id: string; 
      branches: { name: string; is_active: boolean } | null 
    }[]) || []

    return typedBranches
      .filter((db) => db.branches !== null && db.branches.is_active === true)
      .map((db) => ({
        id: db.branch_id,
        name: db.branches!.name,
      }))
  }

  // Other roles have no branch access
  return []
}

/**
 * Resolves the active branch for a given user and role, verifying permissions against the DB.
 */
export async function resolveActiveBranch(
  userId: string,
  role: string
): Promise<ResolveBranchResult> {
  const cookieStore = await cookies()
  const currentCookieValue = cookieStore.get(ACTIVE_BRANCH_COOKIE_NAME)?.value

  // Fetch allowed branches using the single source of truth
  const allowedBranches = await getAllowedBranches(userId, role)
  const allowedBranchIds = allowedBranches.map((b) => b.id)

  if (allowedBranchIds.length === 0) {
    // Clear cookie if no branches are accessible
    const shouldClear = !!currentCookieValue
    return { status: "no_branch", activeBranchId: null, shouldSync: shouldClear }
  }

  // Validate current cookie value
  if (currentCookieValue) {
    if (role === "administrador" && currentCookieValue === ALL_BRANCHES_VALUE) {
      return { status: "success", activeBranchId: ALL_BRANCHES_VALUE, shouldSync: false }
    }

    if (allowedBranchIds.includes(currentCookieValue)) {
      return { status: "success", activeBranchId: currentCookieValue, shouldSync: false }
    }
  }

  // Fallback: Assign the first allowed branch
  const fallbackBranchId = allowedBranchIds[0]
  return { status: "success", activeBranchId: fallbackBranchId, shouldSync: true }
}
