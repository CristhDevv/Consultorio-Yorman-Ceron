"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/shared/lib/supabase/client"
import { Button } from "@/shared/components/ui/button"

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("paciente")
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          },
        },
      })

      if (signUpError) throw signUpError

      setSuccess(true)
      setTimeout(() => {
        router.push("/login")
      }, 3000)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Ocurrió un error inesperado al registrar el usuario."
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-white">Crear Cuenta</h1>
        <p className="text-sm text-slate-400 mt-1">Regístrate para gestionar tus citas médicas</p>
      </div>

      {error && (
        <div className="bg-red-500/15 border border-red-500/30 text-red-200 text-sm p-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-sm p-3 rounded-lg">
          Registro exitoso. Redirigiendo al login...
        </div>
      )}

      <form onSubmit={handleRegister} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fullName" className="text-xs font-semibold text-slate-300">
            Nombre Completo
          </label>
          <input
            id="fullName"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Juan Pérez"
            className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-xs font-semibold text-slate-300">
            Correo Electrónico
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="juan.perez@example.com"
            className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-xs font-semibold text-slate-300">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="role" className="text-xs font-semibold text-slate-300">
            Rol en el Sistema
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-500 transition-colors"
          >
            <option value="paciente">Paciente</option>
            <option value="odontologo">Odontólogo</option>
            <option value="administrador">Administrador</option>
          </select>
        </div>

        <Button
          type="submit"
          disabled={loading}
          variant="default"
          className="w-full mt-2 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-medium py-2 rounded-lg"
        >
          {loading ? "Registrando..." : "Crear Cuenta"}
        </Button>
      </form>

      <div className="text-center text-sm text-slate-400">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-cyan-400 hover:underline">
          Inicia Sesión
        </Link>
      </div>
    </div>
  )
}
