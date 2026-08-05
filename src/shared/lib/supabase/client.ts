import { createBrowserClient } from "@supabase/ssr"
import { Database } from "@/shared/types/database.types"

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    if (typeof window === "undefined") {
      // Prevents crash during next build static generation if env variables are not present
      return {} as any
    }
  }

  return createBrowserClient<Database>(url!, key!)
}
