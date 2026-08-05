"use client"

import { useState, useTransition, useRef } from "react"
import { createInventoryProduct, type ProductInput, type InventoryProduct } from "@/domains/inventory/actions"

type FormState =
  | { status: "idle" }
  | { status: "success"; product: InventoryProduct }
  | { status: "error"; message: string }

export default function ProductForm() {
  const [state, setState] = useState<FormState>({ status: "idle" })
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const formData = new FormData(e.currentTarget)
    const name = (formData.get("name") as string).trim()
    const unit = (formData.get("unit") as string).trim()
    const minStockRaw = formData.get("minStock") as string
    const currentStockRaw = formData.get("currentStock") as string

    const minStock = parseInt(minStockRaw, 10)
    const currentStock = parseInt(currentStockRaw, 10)

    if (!name) {
      setState({ status: "error", message: "El nombre del producto no puede estar vacío." })
      return
    }
    if (!unit) {
      setState({ status: "error", message: "Debe especificar una unidad de medida (ej: Unidades, Cajas)." })
      return
    }
    if (!minStockRaw || isNaN(minStock) || minStock < 0) {
      setState({ status: "error", message: "El stock mínimo debe ser un número entero mayor o igual a cero." })
      return
    }
    if (!currentStockRaw || isNaN(currentStock) || currentStock < 0) {
      setState({ status: "error", message: "El stock inicial debe ser un número entero mayor o igual a cero." })
      return
    }

    startTransition(async () => {
      const result = await createInventoryProduct({ name, unit, minStock, currentStock })

      if (result.success) {
        formRef.current?.reset()
        setState({ status: "success", product: result.data })
      } else {
        setState({ status: "error", message: result.error })
      }
    })
  }

  return (
    <div className="bg-white border border-border rounded-xl shadow-sm p-6">
      {/* Encabezado de sección */}
      <div className="mb-5">
        <h2 className="text-lg font-bold text-foreground tracking-tight">
          Agregar Nuevo Producto / Insumo
        </h2>
        <p className="text-muted-foreground text-sm mt-0.5">
          Registra un nuevo insumo médico o producto en el catálogo de inventario.
        </p>
      </div>

      {/* Banner de éxito */}
      {state.status === "success" && (
        <div
          role="status"
          aria-live="polite"
          className="mb-5 flex items-start gap-3 bg-teal-50 border border-teal-200 rounded-lg px-4 py-3 shadow-xs"
        >
          <span className="mt-0.5 text-teal-700 text-base">✓</span>
          <div>
            <p className="text-teal-750 text-sm font-semibold">
              Producto agregado correctamente
            </p>
            <p className="text-teal-705/90 text-xs mt-0.5">
              El producto <span className="font-bold">{state.product.name}</span> se ha creado en el catálogo con un stock inicial de <span className="font-bold">{state.product.current_stock} {state.product.unit}</span>.
            </p>
          </div>
        </div>
      )}

      {/* Banner de error */}
      {state.status === "error" && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 shadow-xs"
        >
          <span className="mt-0.5 text-red-750 text-base">✕</span>
          <div>
            <p className="text-red-700 text-sm font-semibold">{state.message}</p>
          </div>
        </div>
      )}

      {/* Formulario */}
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        id="product-form"
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        {/* Nombre del Producto */}
        <div className="sm:col-span-2 flex flex-col gap-1.5">
          <label
            htmlFor="product-name"
            className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
          >
            Nombre del Producto <span className="text-red-650">*</span>
          </label>
          <input
            id="product-name"
            name="name"
            type="text"
            required
            placeholder="Ej: Anestesia dental 2%, Guantes de látex..."
            className="bg-white border border-border rounded-lg px-3 py-2.5 text-sm text-foreground
                       placeholder:text-muted-foreground/60
                       focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                       disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            disabled={isPending}
          />
        </div>

        {/* Unidad de medida */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="product-unit"
            className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
          >
            Unidad de Medida <span className="text-red-650">*</span>
          </label>
          <select
            id="product-unit"
            name="unit"
            required
            defaultValue="Unidades"
            className="bg-white border border-border rounded-lg px-3 py-2.5 text-sm text-foreground
                       focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                       disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            disabled={isPending}
          >
            <option value="Unidades">Unidades</option>
            <option value="Cajas">Cajas</option>
            <option value="Frascos">Frascos</option>
            <option value="Tubos">Tubos</option>
            <option value="Gramos">Gramos</option>
            <option value="Mililitros">Mililitros</option>
          </select>
        </div>

        {/* Stock inicial */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="product-current-stock"
            className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
          >
            Stock Inicial <span className="text-red-650">*</span>
          </label>
          <input
            id="product-current-stock"
            name="currentStock"
            type="number"
            min={0}
            step={1}
            required
            placeholder="Ej: 50"
            className="bg-white border border-border rounded-lg px-3 py-2.5 text-sm text-foreground
                       placeholder:text-muted-foreground/60
                       focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                       disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            disabled={isPending}
          />
        </div>

        {/* Stock mínimo */}
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label
            htmlFor="product-min-stock"
            className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
          >
            Stock Mínimo (Alerta de Stock Bajo) <span className="text-red-650">*</span>
          </label>
          <input
            id="product-min-stock"
            name="minStock"
            type="number"
            min={0}
            step={1}
            required
            placeholder="Ej: 5"
            className="bg-white border border-border rounded-lg px-3 py-2.5 text-sm text-foreground
                       placeholder:text-muted-foreground/60
                       focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                       disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            disabled={isPending}
          />
        </div>

        {/* Botón de envío */}
        <div className="sm:col-span-2 flex justify-end mt-2">
          <button
            id="product-submit"
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed
                       text-white font-semibold text-sm px-5 py-2.5 rounded-lg
                       transition-colors shadow-xs"
          >
            {isPending ? (
              <>
                <span
                  aria-hidden="true"
                  className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                />
                Creando producto…
              </>
            ) : (
              "Agregar Producto"
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
