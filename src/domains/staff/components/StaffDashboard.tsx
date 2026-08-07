"use client"

import React, { useState, useTransition, useRef } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/shared/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import {
  createStaffMember,
  demoteStaffMember,
  changeStaffRole,
  updateDentistBranches,
  type StaffProfile,
} from "../actions"

interface StaffDashboardProps {
  initialStaff: StaffProfile[]
  branches: Array<{ id: string; name: string }>
}

type DashboardState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string }

export default function StaffDashboard({ initialStaff, branches }: StaffDashboardProps) {
  const [staff, setStaff] = useState<StaffProfile[]>(initialStaff)
  const [state, setState] = useState<DashboardState>({ status: "idle" })
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  // Estados para asignación de sucursales
  const [editingDentist, setEditingDentist] = useState<StaffProfile | null>(null)
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([])
  const [branchUpdateError, setBranchUpdateError] = useState<string | null>(null)
  const [branchUpdatePending, setBranchUpdatePending] = useState(false)

  const handleOpenBranchModal = (member: StaffProfile) => {
    setEditingDentist(member)
    setBranchUpdateError(null)
    const activeIds = member.dentist_branches?.map((db) => db.branch_id) || []
    setSelectedBranchIds(activeIds)
  }

  const handleToggleBranch = (branchId: string) => {
    setSelectedBranchIds((prev) =>
      prev.includes(branchId) ? prev.filter((id) => id !== branchId) : [...prev, branchId]
    )
  }

  const handleSaveBranches = async () => {
    if (!editingDentist) return
    setBranchUpdatePending(true)
    setBranchUpdateError(null)

    const result = await updateDentistBranches(editingDentist.id, selectedBranchIds)
    setBranchUpdatePending(false)

    if (result.success) {
      const updatedDentistBranches = selectedBranchIds.map((id) => ({
        branch_id: id,
        branches: { name: branches.find((b) => b.id === id)?.name || "" },
      }))

      setStaff((prev) =>
        prev.map((s) =>
          s.id === editingDentist.id
            ? { ...s, dentist_branches: updatedDentistBranches }
            : s
        )
      )
      setEditingDentist(null)
      setState({
        status: "success",
        message: `Sucursales de ${editingDentist.full_name || "odontólogo"} actualizadas correctamente.`,
      })
    } else {
      setBranchUpdateError(result.error)
    }
  }

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setState({ status: "idle" })

    const formData = new FormData(e.currentTarget)
    const fullName = (formData.get("fullName") as string).trim()
    const email = (formData.get("email") as string).trim()
    const role = formData.get("role") as "odontologo" | "administrador"
    const phone = (formData.get("phone") as string).trim()

    if (!fullName || !email || !role) {
      setState({ status: "error", message: "Todos los campos obligatorios (*) deben ser completados." })
      return
    }

    startTransition(async () => {
      const result = await createStaffMember({ fullName, email, role, phone })
      if (result.success) {
        formRef.current?.reset()
        setStaff((prev) => [...prev, { ...result.data, dentist_branches: [] }].sort((a, b) => (a.full_name || "").localeCompare(b.full_name || "")))
        setState({
          status: "success",
          message: `El usuario ${fullName} ha sido registrado como ${role}. Contraseña por defecto: StaffPassword123!`,
        })
      } else {
        setState({ status: "error", message: result.error })
      }
    })
  }

  const handleDemote = async (id: string, name: string) => {
    if (!confirm(`¿Está seguro de que desea remover todos los accesos de personal para ${name}? Esto cambiará su rol a paciente.`)) {
      return
    }
    setState({ status: "idle" })

    startTransition(async () => {
      const result = await demoteStaffMember(id)
      if (result.success) {
        setStaff((prev) => prev.filter((s) => s.id !== id))
        setState({ status: "success", message: `Se removieron los accesos de personal para ${name} correctamente.` })
      } else {
        setState({ status: "error", message: result.error })
      }
    })
  }

  const handleRoleToggle = async (id: string, currentRole: string, name: string) => {
    const newRole = currentRole === "administrador" ? "odontologo" : "administrador"
    setState({ status: "idle" })

    startTransition(async () => {
      const result = await changeStaffRole(id, newRole)
      if (result.success) {
        setStaff((prev) =>
          prev.map((s) => (s.id === id ? { ...s, role: newRole, dentist_branches: [] } : s))
        )
        setState({ status: "success", message: `Rol de ${name} cambiado a ${newRole} exitosamente.` })
      } else {
        setState({ status: "error", message: result.error })
      }
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* Listado de Personal (Tabla) */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        <div className="bg-white border border-border rounded-xl overflow-hidden shadow-xs">
          <Table>
            <TableHeader className="bg-muted/40 border-b border-border">
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground font-semibold">Nombre</TableHead>
                <TableHead className="text-muted-foreground font-semibold">Rol</TableHead>
                <TableHead className="text-muted-foreground font-semibold">Sucursales</TableHead>
                <TableHead className="text-muted-foreground font-semibold">Teléfono</TableHead>
                <TableHead className="text-right text-muted-foreground font-semibold">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.length === 0 ? (
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    No hay personal médico o de administración registrado.
                  </TableCell>
                </TableRow>
              ) : (
                staff.map((member) => (
                  <TableRow key={member.id} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                    <TableCell className="font-semibold text-foreground">
                      {member.full_name || "—"}
                    </TableCell>
                    <TableCell>
                      {member.role === "administrador" ? (
                        <span className="bg-teal-50 border border-teal-200 text-teal-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider inline-block">
                          Administrador
                        </span>
                      ) : (
                        <span className="bg-sky-50 border border-sky-200 text-sky-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider inline-block">
                          Odontólogo
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {member.role === "administrador" ? (
                        <span className="text-xs text-muted-foreground italic font-medium">Acceso Global</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {member.dentist_branches && member.dentist_branches.length > 0 ? (
                            member.dentist_branches.map((db) => (
                              <span
                                key={db.branch_id}
                                className="bg-muted border border-border text-[#475569] text-[10px] px-1.5 py-0.5 rounded font-medium"
                              >
                                {db.branches?.name || "Sin Nombre"}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-red-500 font-medium">Sin sucursales</span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {member.phone || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {member.role === "odontologo" && (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => handleOpenBranchModal(member)}
                            className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 h-8 px-2.5 font-medium"
                          >
                            Sucursales
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => handleRoleToggle(member.id, member.role, member.full_name || "")}
                          disabled={isPending}
                          className="text-primary hover:text-primary/95 hover:bg-primary/10 h-8 px-2.5 font-medium"
                        >
                          Cambiar Rol
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => handleDemote(member.id, member.full_name || "")}
                          disabled={isPending}
                          className="text-red-655 hover:text-red-700 hover:bg-red-50 h-8 px-2.5 font-medium"
                        >
                          Degradar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Formulario para Crear Personal */}
      <div className="lg:col-span-1">
        <Card className="bg-white border border-border text-foreground shadow-sm overflow-visible">
          <CardHeader>
            <CardTitle className="text-foreground text-lg font-bold">Crear Cuenta de Personal</CardTitle>
            <CardDescription className="text-muted-foreground">
              Registra un odontólogo o administrador en el sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {state.status === "success" && (
              <div className="bg-teal-50 border border-teal-200 text-teal-700 text-xs p-3 rounded-lg shadow-xs">
                {state.message}
              </div>
            )}
            {state.status === "error" && (
              <div className="bg-red-50 border border-red-200 text-red-750 text-xs p-3 rounded-lg shadow-xs">
                {state.message}
              </div>
            )}

            <form ref={formRef} onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fullName" className="text-xs font-semibold text-muted-foreground">
                  Nombre Completo *
                </Label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  placeholder="Ej: Dr. Alejandro Díaz"
                  className="bg-white border-border text-foreground focus:border-primary text-sm"
                  disabled={isPending}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground">
                  Correo Electrónico *
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="ejemplo@correo.com"
                  className="bg-white border-border text-foreground focus:border-primary text-sm"
                  disabled={isPending}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone" className="text-xs font-semibold text-muted-foreground">
                  Teléfono (opcional)
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="text"
                  placeholder="Ej: 3001234567"
                  className="bg-white border-border text-foreground focus:border-primary text-sm"
                  disabled={isPending}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="role" className="text-xs font-semibold text-muted-foreground">
                  Rol *
                </Label>
                <select
                  id="role"
                  name="role"
                  required
                  defaultValue="odontologo"
                  className="w-full bg-white border border-border text-foreground rounded-lg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  disabled={isPending}
                >
                  <option value="odontologo">Odontólogo</option>
                  <option value="administrador">Administrador</option>
                </select>
              </div>

              <Button
                type="submit"
                disabled={isPending}
                className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2 rounded-lg mt-2 shadow-xs"
              >
                {isPending ? "Registrando..." : "Registrar Personal"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      {/* Modal para gestionar sucursales autorizadas */}
      <Dialog open={editingDentist !== null} onOpenChange={(open) => !open && setEditingDentist(null)}>
        <DialogContent className="bg-white border border-border sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-foreground">Asignar Sucursales</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Selecciona las sucursales donde el odontólogo <strong className="text-foreground">{editingDentist?.full_name}</strong> está autorizado a atender.
            </DialogDescription>
          </DialogHeader>

          {branchUpdateError && (
            <div className="bg-red-50 border border-red-200 text-red-750 text-xs p-3 rounded-lg">
              {branchUpdateError}
            </div>
          )}

          <div className="grid gap-3 py-4">
            {branches.map((branch) => {
              const isChecked = selectedBranchIds.includes(branch.id)
              return (
                <label
                  key={branch.id}
                  className="flex items-center gap-3 p-3 border border-border rounded-xl hover:bg-muted/40 transition-colors cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleBranch(branch.id)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary border-border cursor-pointer"
                    disabled={branchUpdatePending}
                  />
                  <div className="text-sm font-semibold text-foreground">{branch.name}</div>
                </label>
              )
            })}
            {branches.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                No hay sucursales activas en el sistema.
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={branchUpdatePending}
              onClick={() => setEditingDentist(null)}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={branchUpdatePending}
              onClick={handleSaveBranches}
              className="w-full sm:w-auto bg-primary hover:bg-primary/95 text-white"
            >
              {branchUpdatePending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
