import { createClient } from "./server"
import { User } from "@supabase/supabase-js"
import { Database } from "@/shared/types/database.types"

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"]

export interface UserWithRoleSession {
  user: User | null
  profile: ProfileRow | null
  role: ProfileRow["role"] | null
}

/**
 * Retrieves the current authenticated user and their profile/role from Supabase.
 * Useful in Server Components and Layouts to prevent duplicated query logic.
 */
export async function getCurrentUserWithRole(): Promise<UserWithRoleSession> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { user: null, profile: null, role: null }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  return {
    user,
    profile,
    role: profile?.role || null,
  }
}
