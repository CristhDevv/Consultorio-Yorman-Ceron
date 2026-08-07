"use client"

import React, { useState, useTransition, useRef } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/shared/components/ui/card"
import {
  createStaffMember,
  demoteStaffMember,
  changeStaffRole,
  type StaffProfile,
} from "../actions"

interface StaffDashboardProps {
  initialStaff: StaffProfile[]
}

type DashboardState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string }

export default function StaffDashboard({ initialStaff }: StaffDashboardProps) {
  const [staff, setStaff] = useState<StaffProfile[]>(initialStaff)
  const [state, setState] = useState<DashboardState>({ status: "idle" })
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)


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
        setStaff((prev) => [...prev, result.data].sort((a, b) => (a.full_name || "").localeCompare(b.full_name || "")))
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
          prev.map((s) => (s.id === id ? { ...s, role: newRole } : s))
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
                <TableHead className="text-muted-foreground font-semibold">Teléfono</TableHead>
                <TableHead className="text-right text-muted-foreground font-semibold">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.length === 0 ? (
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
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
                    <TableCell className="text-muted-foreground text-sm">
                      {member.phone || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
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
                          className="text-red-650 hover:text-red-700 hover:bg-red-50 h-8 px-2.5 font-medium"
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
    </div>
  )
}
