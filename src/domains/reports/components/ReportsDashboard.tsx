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
    <div className="flex flex-col gap-8">
      {/* Selector de rango de fechas */}
      <Card className="bg-slate-900 border-slate-800 text-slate-100">
        <CardHeader>
          <CardTitle className="text-white text-lg">Rango de Consulta</CardTitle>
          <CardDescription className="text-slate-400">
            Seleccione el período de fechas para analizar la facturación y flujos de caja.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGenerate} className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex flex-col gap-1.5 flex-1">
              <label htmlFor="date-from-input" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Fecha Desde
              </label>
              <input
                id="date-from-input"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5 flex-1">
              <label htmlFor="date-to-input" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Fecha Hasta
              </label>
              <input
                id="date-to-input"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
              />
            </div>

            <Button
              id="btn-generar-reporte"
              type="submit"
              disabled={isLoading}
              className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-medium h-10 px-6 shrink-0"
            >
              {isLoading ? "Generando..." : "Generar Reporte"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Mensaje de error */}
      {error && (
        <div id="report-error-banner" className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-lg px-4 py-3 text-sm">
          ✗ {error}
        </div>
      )}

      {/* Estado vacío explícito */}
      {reportData === null && !isLoading && !error && (
        <div id="report-empty-state" className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center text-slate-400">
          <span className="text-4xl block mb-2">📊</span>
          <p className="font-semibold text-white mb-1">Ningún rango seleccionado</p>
          <p className="text-sm">Por favor, elija las fechas de inicio y fin para cargar los indicadores de agregación financiera.</p>
        </div>
      )}

      {/* Cargando */}
      {isLoading && (
        <div id="report-loading-state" className="text-center py-10 text-slate-400 font-medium">
          Cargando datos agregados...
        </div>
      )}

      {/* Renderizado de Reportes si hay datos */}
      {reportData !== null && !isLoading && (
        <div id="report-content" className="flex flex-col gap-8">
          {/* Totales Globales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-slate-900 border-slate-800 text-slate-100">
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Recaudado</CardDescription>
                <CardTitle className="text-white text-3xl font-extrabold" id="total-pagado-value">
                  ${reportData.totales.total_pagado.toLocaleString("es-CO", { minimumFractionDigits: 2 })}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className="bg-slate-900 border-slate-800 text-slate-100">
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Reversado</CardDescription>
                <CardTitle className="text-white text-3xl font-extrabold" id="total-reversado-value">
                  ${reportData.totales.total_reversado.toLocaleString("es-CO", { minimumFractionDigits: 2 })}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className="bg-slate-900 border-slate-800 text-slate-100">
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-400 text-xs font-bold uppercase tracking-wider">Ingreso Neto</CardDescription>
                <CardTitle className="text-white text-3xl font-extrabold" id="total-neto-value">
                  ${reportData.totales.neto.toLocaleString("es-CO", { minimumFractionDigits: 2 })}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Desglose por Odontólogo */}
          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardHeader>
              <CardTitle className="text-white text-lg">Desglose por Odontólogo</CardTitle>
              <CardDescription className="text-slate-400">
                Agrupación del flujo financiero según el profesional a cargo de la cita.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 border-t border-slate-800">
              <Table className="text-slate-200">
                <TableHeader className="bg-slate-950/50">
                  <TableRow className="border-b border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400 font-bold">Odontólogo</TableHead>
                    <TableHead className="text-right text-slate-400 font-bold">Total Pagado</TableHead>
                    <TableHead className="text-right text-slate-400 font-bold">Total Reversado</TableHead>
                    <TableHead className="text-right text-slate-400 font-bold">Neto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.por_odontologo.length === 0 ? (
                    <TableRow className="border-b border-slate-850 hover:bg-transparent">
                      <TableCell colSpan={4} className="text-center py-6 text-slate-500">
                        No hay movimientos registrados para ningún odontólogo en este rango.
                      </TableCell>
                    </TableRow>
                  ) : (
                    reportData.por_odontologo.map((item) => (
                      <TableRow key={item.dentist_id} className="border-b border-slate-800/60 hover:bg-slate-850/30">
                        <TableCell className="font-semibold text-white">{item.dentist_name}</TableCell>
                        <TableCell className="text-right">${item.total_pagado.toLocaleString("es-CO", { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right text-red-400">${item.total_reversado.toLocaleString("es-CO", { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right font-bold text-white">${item.neto.toLocaleString("es-CO", { minimumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Desglose por Tipo de Cita */}
          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardHeader>
              <CardTitle className="text-white text-lg">Desglose por Tipo de Cita</CardTitle>
              <CardDescription className="text-slate-400">
                Distribución de ingresos y reversos según el tipo clínico de cita programada.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 border-t border-slate-800">
              <Table className="text-slate-200">
                <TableHeader className="bg-slate-950/50">
                  <TableRow className="border-b border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400 font-bold">Tipo de Cita</TableHead>
                    <TableHead className="text-right text-slate-400 font-bold">Total Pagado</TableHead>
                    <TableHead className="text-right text-slate-400 font-bold">Total Reversado</TableHead>
                    <TableHead className="text-right text-slate-400 font-bold">Neto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.por_tipo_cita.length === 0 ? (
                    <TableRow className="border-b border-slate-850 hover:bg-transparent">
                      <TableCell colSpan={4} className="text-center py-6 text-slate-500">
                        No hay movimientos asociados a ningún tipo de cita en este rango.
                      </TableCell>
                    </TableRow>
                  ) : (
                    reportData.por_tipo_cita.map((item, idx) => (
                      <TableRow key={idx} className="border-b border-slate-800/60 hover:bg-slate-850/30">
                        <TableCell className="font-semibold text-white capitalize">{item.appointment_reason}</TableCell>
                        <TableCell className="text-right">${item.total_pagado.toLocaleString("es-CO", { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right text-red-400">${item.total_reversado.toLocaleString("es-CO", { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right font-bold text-white">${item.neto.toLocaleString("es-CO", { minimumFractionDigits: 2 })}</TableCell>
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
