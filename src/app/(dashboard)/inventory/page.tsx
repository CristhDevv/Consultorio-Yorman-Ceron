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
    <div className="flex flex-col gap-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Inventario</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Catálogo de productos e insumos médicos del consultorio.
        </p>
      </div>

      {/* ── Catálogo de productos ── */}
      <div className="bg-white border border-border rounded-xl overflow-hidden shadow-xs">
        <Table>
          <TableHeader className="bg-muted/40 border-b border-border">
            <TableRow className="border-b border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground font-semibold">Producto</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Unidad</TableHead>
              <TableHead className="text-center text-muted-foreground font-semibold">Stock Actual</TableHead>
              <TableHead className="text-center text-muted-foreground font-semibold">Stock Mínimo</TableHead>
              <TableHead className="text-center text-muted-foreground font-semibold">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  No hay productos registrados en el inventario.
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => {
                const isLowStock = product.current_stock <= product.min_stock

                return (
                  <TableRow
                    key={product.id}
                    className="border-b border-border/60 hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="font-semibold text-foreground">
                      {product.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {product.unit}
                    </TableCell>
                    <TableCell className="text-center font-semibold text-foreground">
                      {product.current_stock}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {product.min_stock}
                    </TableCell>
                    <TableCell className="text-center">
                      {isLowStock ? (
                        <span className="bg-red-50 border border-red-200 text-red-700 text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider inline-block">
                          Bajo Stock
                        </span>
                      ) : (
                        <span className="bg-emerald-50 border border-emerald-250 text-emerald-700 text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider inline-block">
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
