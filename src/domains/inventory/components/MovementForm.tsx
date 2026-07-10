"use client"

import { useState, useTransition, useRef } from "react"
import {
  registerInventoryMovement,
  type InventoryProduct,
  type MovementSuccess,
} from "@/domains/inventory/actions"

// ─── Props ────────────────────────────────────────────────────────────────────
interface MovementFormProps {
  products: InventoryProduct[]
}

// ─── Estado de UI ─────────────────────────────────────────────────────────────
type FormState =
  | { status: "idle" }
  | { status: "success"; confirmation: MovementSuccess }
  | { status: "error"; message: string; availableStock?: number }

export default function MovementForm({ products }: MovementFormProps) {
  const [state, setState] = useState<FormState>({ status: "idle" })
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const formData = new FormData(e.currentTarget)
    const productId = formData.get("productId") as string
    const type = formData.get("type") as "entrada" | "salida"
    const quantityRaw = formData.get("quantity") as string
    const reason = (formData.get("reason") as string).trim()

    const quantity = parseInt(quantityRaw, 10)

    // Validación básica client-side antes de llamar al servidor
    if (!productId) {
      setState({ status: "error", message: "Debe seleccionar un producto." })
      return
    }
    if (!type) {
      setState({ status: "error", message: "Debe seleccionar el tipo de movimiento." })
      return
    }
    if (!quantityRaw || isNaN(quantity) || quantity <= 0) {
      setState({ status: "error", message: "La cantidad debe ser un número entero mayor que cero." })
      return
    }

    startTransition(async () => {
      const result = await registerInventoryMovement({ productId, type, quantity, reason })

      if (result.success) {
        // Éxito: limpiar formulario y mostrar confirmación
        formRef.current?.reset()
        setState({ status: "success", confirmation: result.data })
      } else {
        // Error: mostrar mensaje. Si hay availableStock, lo incluimos.
        setState({
          status: "error",
          message: result.error,
          availableStock: "availableStock" in result ? result.availableStock : undefined,
        })
      }
    })
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl p-6">
      {/* Encabezado de sección */}
      <div className="mb-5">
        <h2 className="text-lg font-bold text-white tracking-tight">
          Registrar Movimiento
        </h2>
        <p className="text-slate-400 text-sm mt-0.5">
          Registra una entrada o salida de stock de un producto.
        </p>
      </div>

      {/* Banner de éxito */}
      {state.status === "success" && (
        <div
          role="status"
          aria-live="polite"
          className="mb-5 flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-3"
        >
          <span className="mt-0.5 text-emerald-400 text-base">✓</span>
          <div>
            <p className="text-emerald-300 text-sm font-semibold">
              Movimiento registrado correctamente
            </p>
            <p className="text-emerald-400/80 text-xs mt-0.5">
              <span className="capitalize">{state.confirmation.type}</span>
              {" de "}
              <span className="font-bold">{state.confirmation.quantity}</span>
              {" unidad(es) de "}
              <span className="font-bold">{state.confirmation.productName}</span>
              {" registrada exitosamente."}
            </p>
          </div>
        </div>
      )}

      {/* Banner de error */}
      {state.status === "error" && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-5 flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3"
        >
          <span className="mt-0.5 text-red-400 text-base">✕</span>
          <div>
            <p className="text-red-300 text-sm font-semibold">{state.message}</p>
            {state.availableStock !== undefined && (
              <p className="text-red-400/80 text-xs mt-0.5">
                Stock disponible actual:{" "}
                <span className="font-bold text-red-300">{state.availableStock}</span>{" "}
                unidad(es).
              </p>
            )}
          </div>
        </div>
      )}

      {/* Formulario */}
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        id="movement-form"
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        {/* Producto */}
        <div className="sm:col-span-2 flex flex-col gap-1.5">
          <label
            htmlFor="movement-product"
            className="text-xs font-bold uppercase tracking-wider text-slate-400"
          >
            Producto <span className="text-red-400">*</span>
          </label>
          <select
            id="movement-product"
            name="productId"
            required
            defaultValue=""
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100
                       focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:border-cyan-500
                       disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isPending}
          >
            <option value="" disabled>
              Seleccionar producto…
            </option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — Stock actual: {p.current_stock} {p.unit}
              </option>
            ))}
          </select>
        </div>

        {/* Tipo de movimiento */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="movement-type"
            className="text-xs font-bold uppercase tracking-wider text-slate-400"
          >
            Tipo <span className="text-red-400">*</span>
          </label>
          <select
            id="movement-type"
            name="type"
            required
            defaultValue=""
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100
                       focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:border-cyan-500
                       disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isPending}
          >
            <option value="" disabled>
              Seleccionar…
            </option>
            <option value="entrada">Entrada</option>
            <option value="salida">Salida</option>
          </select>
        </div>

        {/* Cantidad */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="movement-quantity"
            className="text-xs font-bold uppercase tracking-wider text-slate-400"
          >
            Cantidad <span className="text-red-400">*</span>
          </label>
          <input
            id="movement-quantity"
            name="quantity"
            type="number"
            min={1}
            step={1}
            required
            placeholder="Ej: 10"
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100
                       placeholder:text-slate-600
                       focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:border-cyan-500
                       disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isPending}
          />
        </div>

        {/* Motivo (opcional) */}
        <div className="sm:col-span-2 flex flex-col gap-1.5">
          <label
            htmlFor="movement-reason"
            className="text-xs font-bold uppercase tracking-wider text-slate-400"
          >
            Motivo{" "}
            <span className="text-slate-600 normal-case font-normal">(opcional)</span>
          </label>
          <input
            id="movement-reason"
            name="reason"
            type="text"
            maxLength={300}
            placeholder="Descripción del movimiento…"
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100
                       placeholder:text-slate-600
                       focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:border-cyan-500
                       disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isPending}
          />
        </div>

        {/* Botón de envío */}
        <div className="sm:col-span-2 flex justify-end mt-1">
          <button
            id="movement-submit"
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700
                       disabled:text-slate-500 disabled:cursor-not-allowed
                       text-white font-semibold text-sm px-5 py-2.5 rounded-lg
                       transition-colors shadow-lg shadow-cyan-500/10"
          >
            {isPending ? (
              <>
                <span
                  aria-hidden="true"
                  className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                />
                Registrando…
              </>
            ) : (
              "Registrar movimiento"
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
