import React from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/shared/lib/supabase/server"
import { getInventoryProducts } from "@/domains/inventory/actions"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import MovementForm from "@/domains/inventory/components/MovementForm"

export const metadata = {
  title: "Catálogo de Inventario - Consultorio Odontológico Yorman Cerón",
  description: "Visualización y gestión del stock del consultorio.",
}

export default async function InventoryPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Consultar perfil para comprobar el rol en tiempo real
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  // Solo administradores pueden ver el catálogo de inventario
  if (profile?.role !== "administrador") {
    redirect("/")
  }

  const products = await getInventoryProducts()

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Inventario</h1>
        <p className="text-slate-400 text-sm mt-1">
          Catálogo de productos e insumos médicos del consultorio.
        </p>
      </div>

      {/* ── Catálogo de productos ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <Table className="text-slate-200">
          <TableHeader className="bg-slate-950/50 border-b border-slate-800">
            <TableRow className="border-b border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400 font-bold">Producto</TableHead>
              <TableHead className="text-slate-400 font-bold">Unidad</TableHead>
              <TableHead className="text-center text-slate-400 font-bold">Stock Actual</TableHead>
              <TableHead className="text-center text-slate-400 font-bold">Stock Mínimo</TableHead>
              <TableHead className="text-center text-slate-400 font-bold">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow className="border-b border-slate-850 hover:bg-transparent">
                <TableCell colSpan={5} className="text-center py-10 text-slate-500">
                  No hay productos registrados en el inventario.
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => {
                const isLowStock = product.current_stock <= product.min_stock

                return (
                  <TableRow
                    key={product.id}
                    className="border-b border-slate-800/60 hover:bg-slate-850/30 transition-colors"
                  >
                    <TableCell className="font-semibold text-white">
                      {product.name}
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {product.unit}
                    </TableCell>
                    <TableCell className="text-center font-semibold text-white">
                      {product.current_stock}
                    </TableCell>
                    <TableCell className="text-center text-slate-300">
                      {product.min_stock}
                    </TableCell>
                    <TableCell className="text-center">
                      {isLowStock ? (
                        <span className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider inline-block">
                          Bajo Stock
                        </span>
                      ) : (
                        <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider inline-block">
                          Normal
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Formulario de registro de movimientos ── */}
      <MovementForm products={products} />
    </div>
  )
}
