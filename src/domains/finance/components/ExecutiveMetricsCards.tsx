"use client"

import React from "react"
import { DollarSign, TrendingUp, TrendingDown, ShoppingBag, Clock, Percent } from "lucide-react"
import { ExecutiveFinancialOverview } from "../actions"

interface ExecutiveMetricsCardsProps {
  metrics: ExecutiveFinancialOverview
}

function formatCOP(amount: number) {
  return amount.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  })
}

export default function ExecutiveMetricsCards({ metrics }: ExecutiveMetricsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Ingresos Netos */}
      <div className="bg-white border border-border rounded-2xl p-5 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-teal-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Ingresos Netos
          </span>
          <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <p className="text-2xl font-extrabold tracking-tight text-foreground">
            {formatCOP(metrics.totalRevenue)}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
            <span className="text-teal-600 font-bold bg-teal-50 px-1.5 py-0.5 rounded text-[10px]">
              Mes: {formatCOP(metrics.monthlyRevenue)}
            </span>
            <span>• {metrics.totalPaymentsCount} cobros</span>
          </div>
        </div>
      </div>

      {/* 2. Gastos en Insumos */}
      <div className="bg-white border border-border rounded-2xl p-5 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-amber-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Gastos en Insumos
          </span>
          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <ShoppingBag className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <p className="text-2xl font-extrabold tracking-tight text-foreground">
            {formatCOP(metrics.totalExpenses)}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
            <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded text-[10px]">
              Mes: {formatCOP(metrics.monthlyExpenses)}
            </span>
            <span>• Stock & compras</span>
          </div>
        </div>
      </div>

      {/* 3. Utilidad Neta */}
      <div className="bg-white border border-border rounded-2xl p-5 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-emerald-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Utilidad Neta
          </span>
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
            metrics.netProfit >= 0 ? "bg-emerald-50 border border-emerald-100 text-emerald-600" : "bg-red-50 border border-red-100 text-red-600"
          }`}>
            {metrics.netProfit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          </div>
        </div>
        <div className="mt-3">
          <p className={`text-2xl font-extrabold tracking-tight ${metrics.netProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
            {formatCOP(metrics.netProfit)}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
            <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
              metrics.profitMargin >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
            }`}>
              Margen: {metrics.profitMargin.toFixed(1)}%
            </span>
            <span>• Ganancia libre</span>
          </div>
        </div>
      </div>

      {/* 4. Cartera / Saldos Pendientes */}
      <div className="bg-white border border-border rounded-2xl p-5 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-indigo-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Cartera Pendiente
          </span>
          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <p className="text-2xl font-extrabold tracking-tight text-indigo-950">
            {formatCOP(metrics.totalAccountsReceivable)}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
            <span className="text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.5 rounded text-[10px]">
              {metrics.pendingAppointmentsCount} citas
            </span>
            <span>• Por cobrar</span>
          </div>
        </div>
      </div>
    </div>
  )
}
