"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/shared/lib/supabase/client"
import { Button } from "@/shared/components/ui/button"

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) throw signInError

      router.push("/dashboard")
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Credenciales inválidas. Verifica tu correo y contraseña."
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-white">Iniciar Sesión</h1>
        <p className="text-sm text-slate-400 mt-1">Ingresa tus datos para acceder al sistema</p>
      </div>

      {error && (
        <div className="bg-red-500/15 border border-red-500/30 text-red-200 text-sm p-3 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="flex flex-col gap-4">
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

        <Button
          type="submit"
          disabled={loading}
          variant="default"
          className="w-full mt-2 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-medium py-2 rounded-lg"
        >
          {loading ? "Iniciando sesión..." : "Ingresar"}
        </Button>
      </form>

      <div className="text-center text-sm text-slate-400">
        ¿No tienes cuenta?{" "}
        <Link href="/register" className="text-cyan-400 hover:underline">
          Regístrate ahora
        </Link>
      </div>
    </div>
  )
}
