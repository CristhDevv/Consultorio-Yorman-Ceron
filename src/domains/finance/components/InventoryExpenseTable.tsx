"use client"

import React, { useState } from "react"
import { InventoryExpenseItem } from "../actions"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { Input } from "@/shared/components/ui/input"
import { Search, ShoppingBag } from "lucide-react"

interface InventoryExpenseTableProps {
  items: InventoryExpenseItem[]
}

function formatCOP(amount: number) {
  return amount.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  })
}

export default function InventoryExpenseTable({ items }: InventoryExpenseTableProps) {
  const [search, setSearch] = useState("")

  const filteredItems = items.filter(
    (i) =>
      i.productName.toLowerCase().includes(search.toLowerCase()) ||
      (i.reason && i.reason.toLowerCase().includes(search.toLowerCase()))
  )

  const totalExpense = filteredItems.reduce((acc, i) => acc + i.totalCost, 0)

  return (
    <div className="flex flex-col gap-4">
      {/* Barra de Filtro y Total de Gastos Filtrados */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por insumo o motivo de compra..."
            className="pl-9 bg-white border-border text-sm"
          />
        </div>

        <div className="bg-amber-50/70 border border-amber-100 px-4 py-2 rounded-xl flex items-center gap-3">
          <span className="text-xs font-semibold text-amber-700">Total Inversión Insumos:</span>
          <span className="text-sm font-extrabold text-amber-950">{formatCOP(totalExpense)}</span>
        </div>
      </div>

      {/* Tabla de Gastos de Insumos */}
      <div className="bg-white border border-border rounded-xl overflow-hidden shadow-xs">
        <Table>
          <TableHeader className="bg-muted/40 border-b border-border">
            <TableRow className="border-b border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground font-semibold">Insumo / Producto</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Fecha</TableHead>
              <TableHead className="text-center text-muted-foreground font-semibold">Cantidad</TableHead>
              <TableHead className="text-right text-muted-foreground font-semibold">Costo Unit.</TableHead>
              <TableHead className="text-right text-amber-700 font-bold">Gasto Total</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Observación / Motivo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  <div className="flex flex-col items-center gap-1.5">
                    <ShoppingBag className="w-5 h-5 text-muted-foreground/60" />
                    <span>No hay registros de compras o abastecimiento de inventario.</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => (
                <TableRow
                  key={item.id}
                  className="border-b border-border/60 hover:bg-muted/30 transition-colors"
                >
                  <TableCell className="font-semibold text-foreground text-sm">
                    {item.productName}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {new Date(item.date).toLocaleDateString("es-CO", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="text-center text-xs font-semibold text-foreground">
                    {item.quantity} {item.productUnit}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-foreground">
                    {formatCOP(item.unitCost)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs font-extrabold text-amber-950 bg-amber-50/20">
                    {formatCOP(item.totalCost)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                    {item.reason || "Compra / Reabastecimiento inicial"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
