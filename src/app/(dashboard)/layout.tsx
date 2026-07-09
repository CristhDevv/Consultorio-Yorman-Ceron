import { createClient } from "@/shared/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"

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

  // Consultar perfil para comprobar el rol en tiempo real (seguridad Opción A)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single()

  // Bloqueo de acceso clínico para pacientes
  if (profile?.role === "paciente") {
    // Redirigir al portal de pacientes
    redirect("/portal")
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header / Navbar Premium */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <span className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-teal-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                🦷
              </span>
              <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300">
                Yorman Cerón
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/patients"
                className="text-sm font-semibold text-slate-300 hover:text-cyan-400 transition-colors"
              >
                Pacientes
              </Link>
              <Link
                href="/appointments"
                className="text-sm font-semibold text-slate-300 hover:text-cyan-400 transition-colors"
              >
                Citas
              </Link>
              <span className="text-sm text-slate-500 cursor-not-allowed">Inventario</span>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-white">{profile?.full_name || "Profesional"}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                {profile?.role === "administrador" ? "Administrador" : "Odontólogo"}
              </p>
            </div>
            
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="text-xs bg-slate-800 hover:bg-red-500/10 hover:text-red-400 border border-slate-700 hover:border-red-500/20 text-slate-300 px-3 py-1.5 rounded-lg transition-all"
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
