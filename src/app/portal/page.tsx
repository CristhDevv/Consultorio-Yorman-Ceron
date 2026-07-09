import { createClient } from "@/shared/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function PortalPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Ícono de restricción */}
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 mb-6">
          <span className="text-2xl">🚫</span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white mb-3">
          Acceso restringido
        </h1>

        <p className="text-slate-400 mb-6 text-sm leading-relaxed">
          {profile?.full_name ? (
            <>
              <strong className="text-white">{profile.full_name}</strong>, este sistema es una herramienta interna de gestión clínica de uso exclusivo para personal autorizado del consultorio (Odontólogos y Administradores). Tu cuenta actual no cuenta con ese nivel de acceso.
            </>
          ) : (
            <>
              Este sistema es una herramienta interna de gestión clínica de uso exclusivo para personal autorizado del consultorio (Odontólogos y Administradores). Tu cuenta actual no cuenta con ese nivel de acceso.
            </>
          )}
        </p>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-8 text-xs text-slate-400 leading-relaxed">
          🔒 Las interfaces clínicas, el historial clínico de otros pacientes y el panel médico están reservados exclusivamente para el personal médico autorizado (Odontólogos y Administradores).
        </div>

        {/* Cerrar sesión como acción principal */}
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-lg text-sm transition-colors shadow-lg shadow-red-500/20"
          >
            Cerrar Sesión
          </button>
        </form>
      </div>
    </div>
  )
}
