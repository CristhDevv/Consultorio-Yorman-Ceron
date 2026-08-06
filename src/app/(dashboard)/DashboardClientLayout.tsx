"use client"

import React, { useState, useEffect } from "react"
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
import { BranchInfo, ALL_BRANCHES_VALUE } from "@/domains/branches/constants"
import { setActiveBranchCookie } from "@/domains/branches/actions"

const NAV_ITEMS = [
  { href: "/patients",       label: "Pacientes",       icon: Users,          roles: ["administrador", "odontologo"] },
  { href: "/appointments",   label: "Citas",            icon: CalendarDays,   roles: ["administrador", "odontologo"] },
  { href: "/finance",        label: "Finanzas",         icon: DollarSign,     roles: ["administrador", "odontologo"] },
  { href: "/inventory",      label: "Inventario",       icon: Package,        roles: ["administrador"] },
  { href: "/staff",          label: "Personal",         icon: Stethoscope,    roles: ["administrador"] },
  { href: "/reports",        label: "Reportes",         icon: BarChart3,      roles: ["administrador"] },
  { href: "/communications", label: "Comunicaciones",   icon: MessageSquare,  roles: ["administrador"] },
  { href: "/trash",          label: "Papelera",         icon: Trash2,         roles: ["administrador"] },
]

interface SidebarProps {
  role: string | undefined
  fullName: string | undefined
  open: boolean
  onClose: () => void
  allowedBranches: BranchInfo[]
  activeBranchId: string | null
  onChangeBranch: (branchId: string) => void
}

function Sidebar({
  role,
  fullName,
  open,
  onClose,
  allowedBranches,
  activeBranchId,
  onChangeBranch,
}: SidebarProps) {
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
            <p className="text-sm font-bold text-[#1E293B] truncate leading-tight">Consultorio</p>
            <p className="text-[10px] text-[#64748B] font-medium uppercase tracking-wider">Odontológico</p>
          </div>
          <button
            className="ml-auto md:hidden text-[#64748B] hover:text-[#1E293B] transition-colors"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selector de Sucursal */}
        <div className="px-5 py-3 border-b border-[var(--sidebar-border)]">
          <label className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider block mb-1">
            Sucursal Activa
          </label>
          <select
            value={activeBranchId || ""}
            onChange={(e) => onChangeBranch(e.target.value)}
            className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-xs font-medium text-[#1E293B] focus:outline-none focus:ring-1 focus:ring-[#00C8B4] focus:border-[#00C8B4] transition-all cursor-pointer"
          >
            {role === "administrador" && (
              <option value={ALL_BRANCHES_VALUE}>Todas las sucursales</option>
            )}
            {allowedBranches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
            {allowedBranches.length === 0 && (
              <option value="">Sin sucursal asignada</option>
            )}
          </select>
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
  allowedBranches,
  activeBranchId,
  shouldSync,
  branchStatus,
}: {
  children: React.ReactNode
  role: string | undefined
  fullName: string | undefined
  email: string | undefined
  allowedBranches: BranchInfo[]
  activeBranchId: string | null
  shouldSync: boolean
  branchStatus: "success" | "no_branch"
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Automatic synchronization of the active_branch_id cookie if required
  useEffect(() => {
    if (shouldSync && activeBranchId) {
      setActiveBranchCookie(activeBranchId)
    }
  }, [shouldSync, activeBranchId])

  const handleBranchChange = async (branchId: string) => {
    await setActiveBranchCookie(branchId)
  }

  return (
    <div className="sidebar-layout">
      <Sidebar
        role={role}
        fullName={fullName}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        allowedBranches={allowedBranches}
        activeBranchId={activeBranchId}
        onChangeBranch={handleBranchChange}
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
          <div className="flex-1 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #00C8B4 0%, #00A896 100%)" }}>
                <Stethoscope className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold text-[#1E293B] hidden sm:inline">Consultorio</span>
            </div>

            {/* Mobile Branch Selector */}
            <select
              value={activeBranchId || ""}
              onChange={(e) => handleBranchChange(e.target.value)}
              className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-2 py-1 text-[11px] font-medium text-[#1E293B] max-w-[150px] focus:outline-none cursor-pointer"
            >
              {role === "administrador" && (
                <option value={ALL_BRANCHES_VALUE}>Todas</option>
              )}
              {allowedBranches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
              {allowedBranches.length === 0 && (
                <option value="">Sin sucursal</option>
              )}
            </select>
          </div>
        </div>

        {/* Warning panel if no branch is assigned and the role requires it */}
        {branchStatus === "no_branch" && role !== "paciente" ? (
          <div className="p-6 md:p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="max-w-md bg-white border border-red-100 rounded-2xl p-6 shadow-sm">
              <h2 className="text-base font-bold text-red-600 mb-2">Acceso Restringido</h2>
              <p className="text-sm text-[#64748B]">
                Su usuario no tiene ninguna sucursal activa asignada en el sistema. Comuníquese con el administrador para autorizar su acceso a una sucursal.
              </p>
            </div>
          </div>
        ) : (
          <main className="p-6 md:p-8">
            {children}
          </main>
        )}
      </div>
    </div>
  )
}
