import { createClient } from "@/shared/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Obtener perfil desde la base de datos (valida RLS y trigger)
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
          ¡Bienvenido de vuelta!
        </h1>
        
        <p className="text-slate-400 mb-6 text-sm">
          Has iniciado sesión correctamente en el sistema de gestión odontológica.
        </p>

        <div className="space-y-4 border-y border-slate-800 py-6 mb-6">
          <div className="flex justify-between">
            <span className="text-slate-400 text-sm">Correo:</span>
            <span className="text-white font-medium text-sm">{user.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 text-sm">Nombre:</span>
            <span className="text-white font-medium text-sm">{profile?.full_name || "Sin nombre"}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-sm">Rol actual:</span>
            <span className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
              {profile?.role || "Sin rol"}
            </span>
          </div>
        </div>

        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 font-semibold py-2.5 rounded-lg text-sm transition-colors"
          >
            Cerrar Sesión
          </button>
        </form>
      </div>
    </div>
  )
}
