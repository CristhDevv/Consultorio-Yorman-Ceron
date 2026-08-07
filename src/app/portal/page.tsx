import { getCurrentUserWithRole } from "@/shared/lib/supabase/auth"
import { redirect } from "next/navigation"

export default async function PortalPage() {
  const { user, profile } = await getCurrentUserWithRole()

  if (!user || !profile) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-[#F7F9FA] text-foreground flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border border-border rounded-2xl p-8 shadow-sm relative overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        {/* Ícono de restricción */}
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-red-50 border border-red-250 mb-6">
          <span className="text-2xl">🚫</span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-foreground mb-3">
          Acceso restringido
        </h1>

        <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
          {profile?.full_name ? (
            <>
              <strong className="text-foreground">{profile.full_name}</strong>, este sistema es una herramienta interna de gestión clínica de uso exclusivo para personal autorizado del consultorio (Odontólogos y Administradores). Tu cuenta actual no cuenta con ese nivel de acceso.
            </>
          ) : (
            <>
              Este sistema es una herramienta interna de gestión clínica de uso exclusivo para personal autorizado del consultorio (Odontólogos y Administradores). Tu cuenta actual no cuenta con ese nivel de acceso.
            </>
          )}
        </p>

        <div className="bg-muted/15 border border-border rounded-xl p-4 mb-8 text-xs text-muted-foreground leading-relaxed">
          🔒 Las interfaces clínicas, el historial clínico de otros pacientes y el panel médico están reservados exclusivamente para el personal médico autorizado (Odontólogos y Administradores).
        </div>

        {/* Cerrar sesión como acción principal */}
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="w-full bg-red-650 hover:bg-red-700 text-white font-semibold py-3 rounded-lg text-sm transition-colors shadow-xs"
          >
            Cerrar Sesión
          </button>
        </form>
      </div>
    </div>
  )
}
