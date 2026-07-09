import { createClient } from "@/shared/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()

  // Sign out de Supabase (limpia la sesión en el cliente y backend)
  await supabase.auth.signOut()

  const url = new URL(request.url)
  url.pathname = "/login"

  return NextResponse.redirect(url, {
    status: 303, // See Other para redireccionar correctamente una petición POST
  })
}
