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
        
        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
          Portal del Paciente
        </h1>
        
        <p className="text-slate-400 mb-6 text-sm">
          Hola, <strong className="text-white">{profile?.full_name || "Paciente"}</strong>. Tu cuenta está registrada como Paciente.
        </p>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-6 text-xs text-slate-400 leading-relaxed">
          🔒 Las interfaces clínicas, el historial clínico de otros pacientes y el panel médico están reservados exclusivamente para el personal médico autorizado (Odontólogos y Administradores).
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
