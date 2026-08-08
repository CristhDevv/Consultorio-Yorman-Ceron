import { getCurrentUserWithRole } from "@/shared/lib/supabase/auth"
import { createClient } from "@/shared/lib/supabase/server"
import { redirect } from "next/navigation"
import {
  Users,
  CalendarDays,
  Package,
  DollarSign,
  BarChart3,
  MessageSquare,
  Inbox,
} from "lucide-react"
import Link from "next/link"

const QUICK_LINKS = [
  { href: "/patients/new",    label: "Nuevo Paciente",   icon: Users,        color: "bg-teal-50 text-teal-700 border-teal-200",    dot: "bg-teal-500" },
  { href: "/appointments/new", label: "Nueva Cita",      icon: CalendarDays, color: "bg-blue-50 text-blue-700 border-blue-200",   dot: "bg-blue-500" },
  { href: "/finance",         label: "Finanzas",          icon: DollarSign,   color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  { href: "/inventory",       label: "Inventario",        icon: Package,      color: "bg-amber-50 text-amber-700 border-amber-200",dot: "bg-amber-500" },
  { href: "/reports",         label: "Reportes",          icon: BarChart3,    color: "bg-violet-50 text-violet-700 border-violet-200", dot: "bg-violet-500" },
  { href: "/communications",  label: "Comunicaciones",    icon: MessageSquare,color: "bg-pink-50 text-pink-700 border-pink-200",   dot: "bg-pink-500" },
]

export default async function DashboardPage() {
  const { user, profile, role } = await getCurrentUserWithRole()

  if (!user || !profile) {
    redirect("/login")
  }

  const isAdmin = role === "administrador"
  const links = isAdmin ? QUICK_LINKS : QUICK_LINKS.slice(0, 2)

  const firstName = profile?.full_name?.split(" ")[0] ?? "Profesional"

  // — Consultas para KPIs en el Servidor ─────────────────────────────────────
  const supabase = await createClient()

  // 1. Total Pacientes
  const { count: totalPatients } = await supabase
    .from("patients")
    .select("*", { count: "exact", head: true })

  // 2. Citas de Hoy
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)
  const { count: todayAppointments } = await supabase
    .from("appointments")
    .select("*", { count: "exact", head: true })
    .gte("starts_at", todayStart.toISOString())
    .lte("starts_at", todayEnd.toISOString())

  // 3. KPIs de Ingresos (Solo Admin)
  let totalIncome = 0
  let monthlyIncome = 0

  if (isAdmin) {
    const { data: payments } = await supabase
      .from("patient_payments")
      .select("amount, type")
    
    for (const p of payments || []) {
      if (p.type === "pago") totalIncome += p.amount
      else if (p.type === "reverso") totalIncome -= p.amount
    }

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    const { data: monthlyPayments } = await supabase
      .from("patient_payments")
      .select("amount, type")
      .gte("created_at", startOfMonth.toISOString())

    for (const p of monthlyPayments || []) {
      if (p.type === "pago") monthlyIncome += p.amount
      else if (p.type === "reverso") monthlyIncome -= p.amount
    }
  }

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    })
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Welcome banner */}
      <div className="rounded-2xl overflow-hidden mb-8" style={{ background: "linear-gradient(135deg, #00C8B4 0%, #00A896 60%, #007A6E 100%)" }}>
        <div className="px-8 py-10 text-white">
          <p className="text-sm font-medium opacity-80 mb-1">Panel de control</p>
          <h1 className="text-3xl font-bold mb-2">¡Bienvenido, {firstName}! 👋</h1>
          <p className="text-sm opacity-75 max-w-md">
            Gestiona citas, pacientes y registros clínicos del consultorio desde un solo lugar.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/25 rounded-full px-4 py-1.5 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-white/90 animate-pulse" />
            {isAdmin ? "Administrador" : "Odontólogo"} · Sistema activo
          </div>
        </div>
      </div>

      {/* KPIs Section */}
      <div className={`grid grid-cols-2 ${isAdmin ? "md:grid-cols-4" : "md:grid-cols-2"} gap-4 mb-8`}>
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Citas de Hoy</p>
            <p className="text-2xl font-extrabold text-[#1E293B] mt-1.5">{todayAppointments || 0}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
            <CalendarDays className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Total Pacientes</p>
            <p className="text-2xl font-extrabold text-[#1E293B] mt-1.5">{totalPatients || 0}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100 shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {isAdmin && (
          <>
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Ingresos del Mes</p>
                <p className="text-lg font-extrabold text-emerald-600 mt-1.5">{formatCurrency(monthlyIncome)}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
                <BarChart3 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Total Neto</p>
                <p className="text-lg font-extrabold text-teal-700 mt-1.5">{formatCurrency(totalIncome)}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100 shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Quick access cards */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-[#64748B] uppercase tracking-wider mb-4">Acceso Rápido</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {links.map(link => {
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-4 p-5 bg-white rounded-xl border hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group ${link.color}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${link.color} border`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{link.label}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Info card */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center flex-shrink-0">
            <Inbox className="w-4 h-4 text-teal-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#1E293B]">Cuenta conectada</p>
            <p className="text-xs text-[#64748B] mt-0.5">{user.email}</p>
            <p className="text-xs text-[#94A3B8] mt-1">
              Rol: <span className="font-medium capitalize text-[#64748B]">{profile?.role}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
