import { Stethoscope } from "lucide-react"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex" style={{ background: "#F7F9FC" }}>
      {/* Left panel - branding */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 text-white"
        style={{ background: "linear-gradient(145deg, #00C8B4 0%, #00A896 50%, #007A6E 100%)" }}
      >
        <div className="max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center mx-auto mb-6">
            <Stethoscope className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold mb-3 tracking-tight">Consultorio Odontológico</h1>
          <p className="text-xl font-semibold opacity-90 mb-6">Yorman Cerón</p>
          <p className="text-sm opacity-75 leading-relaxed">
            Sistema integral de gestión clínica. Administra citas, expedientes de pacientes, odontograma, imagenología y finanzas en un solo lugar.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4 text-center">
            {[["Pacientes", "Gestión completa"], ["Citas", "Agenda digital"], ["Odontograma", "Clínico FDI"], ["Finanzas", "Control de pagos"]].map(([t, s]) => (
              <div key={t} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                <p className="font-bold text-sm">{t}</p>
                <p className="text-xs opacity-70">{s}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #00C8B4, #00A896)" }}>
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#1E293B]">Yorman Cerón</p>
              <p className="text-[10px] text-[#64748B] uppercase tracking-wider">Odontología</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
