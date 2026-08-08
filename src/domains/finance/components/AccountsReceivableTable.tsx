"use client"

import React, { useState } from "react"
import Link from "next/link"
import { AccountReceivableItem } from "../actions"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { ArrowRight, Search, AlertCircle } from "lucide-react"

interface AccountsReceivableTableProps {
  items: AccountReceivableItem[]
}

function formatCOP(amount: number) {
  return amount.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  })
}

export default function AccountsReceivableTable({ items }: AccountsReceivableTableProps) {
  const [search, setSearch] = useState("")

  const filteredItems = items.filter(
    (i) =>
      i.patientName.toLowerCase().includes(search.toLowerCase()) ||
      i.patientDocument.includes(search) ||
      i.reason.toLowerCase().includes(search.toLowerCase())
  )

  const totalPending = filteredItems.reduce((acc, i) => acc + i.pendingBalance, 0)

  return (
    <div className="flex flex-col gap-4">
      {/* Barra de Filtro y Total de Cartera Filtrada */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por paciente, cédula o motivo..."
            className="pl-9 bg-white border-border text-sm"
          />
        </div>

        <div className="bg-indigo-50/70 border border-indigo-100 px-4 py-2 rounded-xl flex items-center gap-3">
          <span className="text-xs font-semibold text-indigo-700">Total en Cartera:</span>
          <span className="text-sm font-extrabold text-indigo-950">{formatCOP(totalPending)}</span>
        </div>
      </div>

      {/* Tabla de Cuentas por Cobrar */}
      <div className="bg-white border border-border rounded-xl overflow-hidden shadow-xs">
        <Table>
          <TableHeader className="bg-muted/40 border-b border-border">
            <TableRow className="border-b border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground font-semibold">Paciente</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Fecha Cita</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Procedimiento</TableHead>
              <TableHead className="text-right text-muted-foreground font-semibold">Valor Total</TableHead>
              <TableHead className="text-right text-muted-foreground font-semibold">Abonado</TableHead>
              <TableHead className="text-right text-indigo-700 font-bold">Saldo Pendiente</TableHead>
              <TableHead className="text-center text-muted-foreground font-semibold">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  <div className="flex flex-col items-center gap-1.5">
                    <AlertCircle className="w-5 h-5 text-muted-foreground/60" />
                    <span>No hay saldos pendientes o cuentas por cobrar registradas.</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => (
                <TableRow
                  key={item.appointmentId}
                  className="border-b border-border/60 hover:bg-muted/30 transition-colors"
                >
                  <TableCell>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{item.patientName}</p>
                      <p className="text-xs text-muted-foreground font-mono">Doc: {item.patientDocument}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {new Date(item.appointmentDate).toLocaleDateString("es-CO", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="text-xs text-foreground max-w-[180px] truncate">
                    {item.reason}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-foreground">
                    {formatCOP(item.totalAmount)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-emerald-600 font-semibold">
                    {formatCOP(item.paidAmount)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs font-extrabold text-indigo-950 bg-indigo-50/20">
                    {formatCOP(item.pendingBalance)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Link href={`/appointments/${item.appointmentId}`}>
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary/90 text-white text-xs h-7 px-2.5 font-semibold shadow-xs flex items-center gap-1"
                      >
                        <span>Cobrar</span>
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </Link>
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
