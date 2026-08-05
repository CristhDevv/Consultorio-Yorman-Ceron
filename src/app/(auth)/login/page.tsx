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
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError
      router.push("/")
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
      <div>
        <h1 className="text-2xl font-bold text-[#1E293B] tracking-tight">Iniciar Sesión</h1>
        <p className="text-sm text-[#64748B] mt-1">Ingresa tus datos para acceder al sistema</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-xs font-semibold text-[#475569]">
            Correo Electrónico
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="juan.perez@example.com"
            className="w-full border border-[#E2E8F0] text-[#1E293B] bg-white rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#00C8B4] focus:ring-2 focus:ring-[#00C8B4]/20 transition-all placeholder-[#94A3B8]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-xs font-semibold text-[#475569]">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full border border-[#E2E8F0] text-[#1E293B] bg-white rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#00C8B4] focus:ring-2 focus:ring-[#00C8B4]/20 transition-all placeholder-[#94A3B8]"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full mt-1 text-white font-semibold py-2.5 rounded-lg transition-all"
          style={{ background: loading ? "#94A3B8" : "linear-gradient(135deg, #00C8B4, #00A896)" }}
        >
          {loading ? "Iniciando sesión..." : "Ingresar"}
        </Button>
      </form>

      <p className="text-center text-sm text-[#64748B]">
        ¿No tienes cuenta?{" "}
        <Link href="/register" className="font-semibold" style={{ color: "#00A896" }}>
          Regístrate
        </Link>
      </p>
    </div>
  )
}
