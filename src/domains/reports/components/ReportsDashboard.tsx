"use client"

import React, { useState } from "react"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import type { ActionResult } from "../actions"
import type { FinancialReportResponse } from "../types"

interface ReportsDashboardProps {
  onFetchReport: (dateFrom: string, dateTo: string) => Promise<ActionResult<FinancialReportResponse>>
}

export default function ReportsDashboard({ onFetchReport }: ReportsDashboardProps) {
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [reportData, setReportData] = useState<FinancialReportResponse | null>(null)

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!dateFrom || !dateTo) {
      setError("Por favor seleccione ambas fechas.")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      // Add timezone boundaries or pass direct ISO strings
      const result = await onFetchReport(
        new Date(dateFrom).toISOString(),
        new Date(dateTo + "T23:59:59.999Z").toISOString()
      )

      if (result.success) {
        setReportData(result.data)
      } else {
        setError(result.error)
        setReportData(null)
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Ocurrió un error inesperado al generar el reporte."
      setError(errMsg)
      setReportData(null)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto">
      {/* Selector de rango de fechas */}
      <Card className="bg-white border-border text-foreground shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground text-lg font-bold">Rango de Consulta</CardTitle>
          <CardDescription className="text-muted-foreground">
            Seleccione el período de fechas para analizar la facturación y flujos de caja.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGenerate} className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex flex-col gap-1.5 flex-1">
              <label htmlFor="date-from-input" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Fecha Desde
              </label>
              <input
                id="date-from-input"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-white border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5 flex-1">
              <label htmlFor="date-to-input" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Fecha Hasta
              </label>
              <input
                id="date-to-input"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-white border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <Button
              id="btn-generar-reporte"
              type="submit"
              disabled={isLoading}
              className="bg-primary hover:bg-primary/90 text-white font-medium h-10 px-6 shrink-0 shadow-xs"
            >
              {isLoading ? "Generando..." : "Generar Reporte"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Mensaje de error */}
      {error && (
        <div id="report-error-banner" className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm shadow-xs">
          ✗ {error}
        </div>
      )}

      {/* Estado vacío explícito */}
      {reportData === null && !isLoading && !error && (
        <div id="report-empty-state" className="bg-white border border-border rounded-xl p-10 text-center text-muted-foreground shadow-sm">
          <span className="text-4xl block mb-2">📊</span>
          <p className="font-bold text-foreground mb-1">Ningún rango seleccionado</p>
          <p className="text-sm">Por favor, elija las fechas de inicio y fin para cargar los indicadores de agregación financiera.</p>
        </div>
      )}

      {/* Cargando */}
      {isLoading && (
        <div id="report-loading-state" className="text-center py-10 text-muted-foreground font-medium">
          Cargando datos agregados...
        </div>
      )}

      {/* Renderizado de Reportes si hay datos */}
      {reportData !== null && !isLoading && (
        <div id="report-content" className="flex flex-col gap-8">
          {/* Totales Globales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-white border-border text-foreground shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Total Recaudado</CardDescription>
                <CardTitle className="text-emerald-600 text-3xl font-extrabold" id="total-pagado-value">
                  ${reportData.totales.total_pagado.toLocaleString("es-CO", { minimumFractionDigits: 2 })}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className="bg-white border-border text-foreground shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Total Reversado</CardDescription>
                <CardTitle className="text-amber-600 text-3xl font-extrabold" id="total-reversado-value">
                  ${reportData.totales.total_reversado.toLocaleString("es-CO", { minimumFractionDigits: 2 })}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className="bg-white border-border text-foreground shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Ingreso Neto</CardDescription>
                <CardTitle className="text-foreground text-3xl font-extrabold" id="total-neto-value">
                  ${reportData.totales.neto.toLocaleString("es-CO", { minimumFractionDigits: 2 })}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Desglose por Odontólogo */}
          <Card className="bg-white border-border text-foreground shadow-sm overflow-hidden">
            <CardHeader>
              <CardTitle className="text-foreground text-lg font-bold">Desglose por Odontólogo</CardTitle>
              <CardDescription className="text-muted-foreground">
                Agrupación del flujo financiero según el profesional a cargo de la cita.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 border-t border-border">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground font-semibold">Odontólogo</TableHead>
                    <TableHead className="text-right text-muted-foreground font-semibold">Total Pagado</TableHead>
                    <TableHead className="text-right text-muted-foreground font-semibold">Total Reversado</TableHead>
                    <TableHead className="text-right text-muted-foreground font-semibold">Neto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.por_odontologo.length === 0 ? (
                    <TableRow className="border-b border-border hover:bg-transparent">
                      <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                        No hay movimientos registrados para ningún odontólogo en este rango.
                      </TableCell>
                    </TableRow>
                  ) : (
                    reportData.por_odontologo.map((item) => (
                      <TableRow key={item.dentist_id} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <TableCell className="font-semibold text-foreground">{item.dentist_name}</TableCell>
                        <TableCell className="text-right">${item.total_pagado.toLocaleString("es-CO", { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right text-red-650">${item.total_reversado.toLocaleString("es-CO", { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right font-bold text-foreground">${item.neto.toLocaleString("es-CO", { minimumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Desglose por Tipo de Cita */}
          <Card className="bg-white border-border text-foreground shadow-sm overflow-hidden">
            <CardHeader>
              <CardTitle className="text-foreground text-lg font-bold">Desglose por Tipo de Cita</CardTitle>
              <CardDescription className="text-muted-foreground">
                Distribución de ingresos y reversos según el tipo clínico de cita programada.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 border-t border-border">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground font-semibold">Tipo de Cita</TableHead>
                    <TableHead className="text-right text-muted-foreground font-semibold">Total Pagado</TableHead>
                    <TableHead className="text-right text-muted-foreground font-semibold">Total Reversado</TableHead>
                    <TableHead className="text-right text-muted-foreground font-semibold">Neto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.por_tipo_cita.length === 0 ? (
                    <TableRow className="border-b border-border hover:bg-transparent">
                      <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                        No hay movimientos asociados a ningún tipo de cita en este rango.
                      </TableCell>
                    </TableRow>
                  ) : (
                    reportData.por_tipo_cita.map((item, idx) => (
                      <TableRow key={idx} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <TableCell className="font-semibold text-foreground capitalize">{item.appointment_reason}</TableCell>
                        <TableCell className="text-right">${item.total_pagado.toLocaleString("es-CO", { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right text-red-650">${item.total_reversado.toLocaleString("es-CO", { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right font-bold text-foreground">${item.neto.toLocaleString("es-CO", { minimumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
