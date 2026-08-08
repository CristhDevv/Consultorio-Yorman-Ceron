"use client"

import React, { useState } from "react"
import {
  ExecutiveFinancialOverview,
  AccountReceivableItem,
  InventoryExpenseItem,
} from "../actions"
import ExecutiveMetricsCards from "./ExecutiveMetricsCards"
import AccountsReceivableTable from "./AccountsReceivableTable"
import InventoryExpenseTable from "./InventoryExpenseTable"
import PaymentHistoryView from "./PaymentHistoryView"
import { Input } from "@/shared/components/ui/input"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { BarChart3, Users, DollarSign, ShoppingBag, Clock, ArrowUpRight, TrendingUp } from "lucide-react"

interface Patient {
  id: string
  full_name: string
  document_id: string
}

interface FinanceDashboardProps {
  metrics?: ExecutiveFinancialOverview
  accountsReceivable?: AccountReceivableItem[]
  inventoryExpenses?: InventoryExpenseItem[]
  patients: Patient[]
  initialTab?: TabType
}

type TabType = "resumen" | "cartera" | "gastos" | "pacientes"

const defaultMetrics: ExecutiveFinancialOverview = {
  totalRevenue: 0,
  monthlyRevenue: 0,
  totalExpenses: 0,
  monthlyExpenses: 0,
  netProfit: 0,
  monthlyNetProfit: 0,
  profitMargin: 0,
  totalAccountsReceivable: 0,
  pendingAppointmentsCount: 0,
  totalPaymentsCount: 0,
  cashFlow: 0,
}

function formatCOP(amount: number) {
  return amount.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  })
}

export default function FinanceDashboard({
  metrics = defaultMetrics,
  accountsReceivable = [],
  inventoryExpenses = [],
  patients,
  initialTab = "resumen",
}: FinanceDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab)

  // Selector de pacientes para pestaña de historial individual
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [patientSearch, setPatientSearch] = useState("")
  const [showPatientResults, setShowPatientResults] = useState(false)

  const filteredPatients =
    patientSearch.trim() === ""
      ? []
      : patients
          .filter(
            (p) =>
              p.full_name.toLowerCase().includes(patientSearch.toLowerCase()) ||
              p.document_id.includes(patientSearch)
          )
          .slice(0, 5)

  const handleClearPatient = () => {
    setSelectedPatient(null)
    setPatientSearch("")
  }

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto">
      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            Gestión Financiera
            <span className="text-xs bg-teal-50 border border-teal-200 text-teal-700 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
              En Tiempo Real
            </span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Centro de control de ingresos, compras de insumos, utilidades netas y cartera de pacientes.
          </p>
        </div>
      </div>

      {/* Tarjetas Métricas Ejecutivas */}
      <ExecutiveMetricsCards metrics={metrics} />

      {/* Navegación por Pestañas */}
      <div className="flex border-b border-border gap-2 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab("resumen")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "resumen"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Resumen de Rentabilidad</span>
        </button>

        <button
          onClick={() => setActiveTab("cartera")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "cartera"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Cuentas por Cobrar</span>
          {accountsReceivable.length > 0 && (
            <span className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded-full font-extrabold">
              {accountsReceivable.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("gastos")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "gastos"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Gastos en Insumos</span>
          {inventoryExpenses.length > 0 && (
            <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded-full font-extrabold">
              {inventoryExpenses.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("pacientes")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "pacientes"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Historial por Paciente</span>
        </button>
      </div>

      {/* Contenido según Pestaña Activa */}
      {activeTab === "resumen" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tarjeta de Flujo y Estado de Resultados */}
          <Card className="bg-white border-border text-foreground shadow-sm md:col-span-2">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-lg font-bold">Estado de Resultados & Flujo Operativo</CardTitle>
              <CardDescription className="text-muted-foreground">
                Consolidación de entradas monetarias contra costos de aprovisionamiento de inventario.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex flex-col gap-6">
              {/* Desglose en Barras Comparativas */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block" />
                    Ingresos Netos por Tratamientos
                  </span>
                  <span className="font-mono font-bold text-teal-700">{formatCOP(metrics.totalRevenue)}</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
                  <div
                    className="bg-teal-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${metrics.totalRevenue > 0 ? 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                    Gastos en Compras de Insumos (Inventario)
                  </span>
                  <span className="font-mono font-bold text-amber-700">{formatCOP(metrics.totalExpenses)}</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        metrics.totalRevenue > 0
                          ? Math.min(100, (metrics.totalExpenses / metrics.totalRevenue) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                    Utilidad Neta (Ganancia Real)
                  </span>
                  <span className="font-mono font-bold text-emerald-700">{formatCOP(metrics.netProfit)}</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        metrics.totalRevenue > 0
                          ? Math.max(0, Math.min(100, (metrics.netProfit / metrics.totalRevenue) * 100))
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Resumen en Cuadrícula */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-border">
                <div className="bg-muted/30 p-3.5 rounded-xl">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Margen de Ganancia</span>
                  <p className="text-base font-extrabold text-emerald-700 mt-1">{metrics.profitMargin.toFixed(1)}%</p>
                </div>
                <div className="bg-muted/30 p-3.5 rounded-xl">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Flujo de Efectivo Neto</span>
                  <p className="text-base font-extrabold text-foreground mt-1">{formatCOP(metrics.cashFlow)}</p>
                </div>
                <div className="bg-muted/30 p-3.5 rounded-xl col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Utilidad del Mes Actual</span>
                  <p className="text-base font-extrabold text-teal-700 mt-1">{formatCOP(metrics.monthlyNetProfit)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tarjeta Lateral de Acciones Rápidas */}
          <Card className="bg-white border-border text-foreground shadow-sm flex flex-col justify-between">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-lg font-bold">Estado de Cartera</CardTitle>
              <CardDescription className="text-muted-foreground">
                Resumen de cuentas por cobrar a pacientes.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex flex-col gap-4">
              <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl flex flex-col gap-1 text-center">
                <span className="text-xs font-semibold text-indigo-700">Total por Cobrar</span>
                <p className="text-2xl font-black text-indigo-950">{formatCOP(metrics.totalAccountsReceivable)}</p>
                <p className="text-xs text-indigo-600/80 mt-1">{metrics.pendingAppointmentsCount} tratamientos con saldo pendiente</p>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Los saldos se calculan restando automáticamente los abonos de cada cita respecto a su valor total definido.
              </p>

              <Button
                onClick={() => setActiveTab("cartera")}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs"
              >
                Ver Cuentas por Cobrar
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "cartera" && (
        <AccountsReceivableTable items={accountsReceivable} />
      )}

      {activeTab === "gastos" && (
        <InventoryExpenseTable items={inventoryExpenses} />
      )}

      {activeTab === "pacientes" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Buscador de Paciente */}
          <div className="md:col-span-1 flex flex-col gap-4">
            <Card className="bg-white border-border text-foreground shadow-sm overflow-visible">
              <CardHeader>
                <CardTitle className="text-foreground text-lg font-bold">Buscar Paciente</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Selecciona un paciente para ver su extracto de cuenta.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-1.5 relative">
                  {selectedPatient ? (
                    <div className="flex items-center justify-between p-3 bg-muted/20 border border-border rounded-lg">
                      <div>
                        <p className="font-semibold text-foreground text-sm">{selectedPatient.full_name}</p>
                        <p className="text-xs text-muted-foreground font-mono">Doc: {selectedPatient.document_id}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleClearPatient}
                        className="text-muted-foreground hover:text-foreground hover:bg-muted text-xs px-2 h-7"
                      >
                        Cambiar
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Input
                        type="text"
                        placeholder="Nombre o número de documento..."
                        value={patientSearch}
                        onChange={(e) => {
                          setPatientSearch(e.target.value)
                          setShowPatientResults(true)
                        }}
                        onFocus={() => setShowPatientResults(true)}
                        className="bg-white border-border text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm"
                      />
                      {showPatientResults && filteredPatients.length > 0 && (
                        <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                          {filteredPatients.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setSelectedPatient(p)
                                setShowPatientResults(false)
                              }}
                              className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-muted border-b border-border last:border-0 transition-colors"
                            >
                              <span className="font-semibold text-foreground block">{p.full_name}</span>
                              <span className="text-xs text-muted-foreground font-mono">Documento: {p.document_id}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {showPatientResults && patientSearch.trim() !== "" && filteredPatients.length === 0 && (
                        <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border border-border rounded-lg shadow-lg z-50 p-3 text-xs text-muted-foreground text-center">
                          No se encontraron pacientes que coincidan.
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Historial y Resumen */}
          <div className="md:col-span-2 flex flex-col gap-6">
            {!selectedPatient ? (
              <div className="flex flex-col items-center justify-center p-10 text-muted-foreground text-sm border-2 border-dashed border-border rounded-xl bg-white min-h-[300px]">
                Selecciona un paciente a la izquierda para ver su historial de transacciones.
              </div>
            ) : (
              <PaymentHistoryView
                patientId={selectedPatient.id}
                patientName={selectedPatient.full_name}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
