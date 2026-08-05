"use client"

import React, { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Users,
  CalendarDays,
  Package,
  DollarSign,
  BarChart3,
  MessageSquare,
  Trash2,
  LogOut,
  Menu,
  X,
  Stethoscope,
} from "lucide-react"

const NAV_ITEMS = [
  { href: "/patients",       label: "Pacientes",       icon: Users,          roles: ["administrador", "odontologo"] },
  { href: "/appointments",   label: "Citas",            icon: CalendarDays,   roles: ["administrador", "odontologo"] },
  { href: "/finance",        label: "Finanzas",         icon: DollarSign,     roles: ["administrador", "odontologo"] },
  { href: "/inventory",      label: "Inventario",       icon: Package,        roles: ["administrador"] },
  { href: "/reports",        label: "Reportes",         icon: BarChart3,      roles: ["administrador"] },
  { href: "/communications", label: "Comunicaciones",   icon: MessageSquare,  roles: ["administrador"] },
  { href: "/trash",          label: "Papelera",         icon: Trash2,         roles: ["administrador"] },
]

interface SidebarProps {
  role: string | undefined
  fullName: string | undefined
  email: string | undefined
  open: boolean
  onClose: () => void
}

function Sidebar({ role, fullName, email, open, onClose }: SidebarProps) {
  const pathname = usePathname()

  const visibleItems = NAV_ITEMS.filter(item =>
    item.roles.includes(role ?? "")
  )

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={onClose}
        />
      )}

      <nav className={`sidebar-nav ${open ? "open" : ""}`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-[var(--sidebar-border)]">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #00C8B4 0%, #00A896 100%)" }}>
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#1E293B] truncate leading-tight">Yorman Cerón</p>
            <p className="text-[10px] text-[#64748B] font-medium uppercase tracking-wider">Odontología</p>
          </div>
          <button
            className="ml-auto md:hidden text-[#64748B] hover:text-[#1E293B] transition-colors"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation links */}
        <div className="flex-1 px-3 py-4">
          <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider px-3 mb-2">Menú Principal</p>
          {visibleItems.map(item => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`nav-link ${isActive ? "active" : ""}`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-[var(--sidebar-border)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #00C8B4 0%, #00A896 100%)" }}>
              {fullName?.charAt(0)?.toUpperCase() ?? "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[#1E293B] truncate">{fullName ?? "Usuario"}</p>
              <p className="text-[10px] text-[#64748B] capitalize truncate">{role ?? ""}</p>
            </div>
          </div>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="w-full flex items-center gap-2 text-xs font-medium text-[#64748B] hover:text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              Cerrar Sesión
            </button>
          </form>
        </div>
      </nav>
    </>
  )
}

export default function DashboardClientLayout({
  children,
  role,
  fullName,
  email,
}: {
  children: React.ReactNode
  role: string | undefined
  fullName: string | undefined
  email: string | undefined
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="sidebar-layout">
      <Sidebar
        role={role}
        fullName={fullName}
        email={email}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="sidebar-content">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-[#E2E8F0] sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-[#64748B] hover:text-[#1E293B] transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #00C8B4 0%, #00A896 100%)" }}>
              <Stethoscope className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-[#1E293B]">Yorman Cerón</span>
          </div>
        </div>
        <main className="p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
