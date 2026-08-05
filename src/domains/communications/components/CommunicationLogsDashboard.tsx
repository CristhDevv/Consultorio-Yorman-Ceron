"use client"

import React, { useState, useEffect, useCallback } from "react"
import { CommunicationLogWithPatient, PatientWithLogs } from "../actions"

interface CommunicationLogsDashboardProps {
  onFetchLogs: (filters?: { status?: string; patientId?: string }) => Promise<{ success: boolean; data?: CommunicationLogWithPatient[]; error?: string }>
  onFetchPatients: () => Promise<{ success: boolean; data?: PatientWithLogs[]; error?: string }>
}

export default function CommunicationLogsDashboard({
  onFetchLogs,
  onFetchPatients,
}: CommunicationLogsDashboardProps) {
  const [logs, setLogs] = useState<CommunicationLogWithPatient[]>([])
  const [patients, setPatients] = useState<PatientWithLogs[]>([])
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [patientFilter, setPatientFilter] = useState<string>("")
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Memoized fetch function
  const fetchLogs = useCallback(async (status: string, patientId: string) => {
    setIsLoading(true)
    setErrorMsg(null)
    try {
      const result = await onFetchLogs({
        status: status || undefined,
        patientId: patientId || undefined,
      })
      if (result.success && result.data) {
        setLogs(result.data)
      } else {
        setErrorMsg(result.error || "Ocurrió un error al cargar los logs.")
      }
    } catch {
      setErrorMsg("Ocurrió un error inesperado al consultar los logs.")
    } finally {
      setIsLoading(false)
    }
  }, [onFetchLogs])

  // Load initial data (patients and logs)
  useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true)
      try {
        const [patientsRes, logsRes] = await Promise.all([
          onFetchPatients(),
          onFetchLogs(),
        ])

        if (patientsRes.success && patientsRes.data) {
          setPatients(patientsRes.data)
        } else if (!patientsRes.success) {
          setErrorMsg(patientsRes.error || "Error al cargar la lista de pacientes.")
        }

        if (logsRes.success && logsRes.data) {
          setLogs(logsRes.data)
        } else if (!logsRes.success) {
          setErrorMsg(logsRes.error || "Error al cargar los logs de comunicación.")
        }
      } catch {
        setErrorMsg("Error al conectar con el servidor.")
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialData()
  }, [onFetchLogs, onFetchPatients])

  // Handle status filter change
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setStatusFilter(value)
    fetchLogs(value, patientFilter)
  }

  // Handle patient filter change
  const handlePatientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setPatientFilter(value)
    fetchLogs(statusFilter, value)
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-4">
        <div className="flex-1 flex flex-col gap-1.5">
          <label htmlFor="status-select" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Filtrar por Estado
          </label>
          <select
            id="status-select"
            value={statusFilter}
            onChange={handleStatusChange}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors w-full"
          >
            <option value="">Todos los estados</option>
            <option value="pending">Pendiente (pending)</option>
            <option value="sent">Enviado (sent)</option>
            <option value="failed">Fallido (failed)</option>
          </select>
        </div>

        <div className="flex-1 flex flex-col gap-1.5">
          <label htmlFor="patient-select" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Filtrar por Paciente
          </label>
          <select
            id="patient-select"
            value={patientFilter}
            onChange={handlePatientChange}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors w-full"
          >
            <option value="">Todos los pacientes</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error state */}
      {errorMsg && (
        <div className="bg-red-950/50 border border-red-800/80 rounded-xl p-4 text-red-200 text-sm">
          <p className="font-semibold">Error al cargar datos</p>
          <p className="text-red-300/80 mt-1">{errorMsg}</p>
        </div>
      )}

      {/* Main Table card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium">Cargando logs de comunicación...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p className="text-sm font-medium">No se encontraron logs de comunicación.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/50 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Paciente</th>
                  <th className="py-3.5 px-4">Canal</th>
                  <th className="py-3.5 px-4">Evento</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4">Fecha Creación</th>
                  <th className="py-3.5 px-4">Fecha Envío</th>
                  <th className="py-3.5 px-4">Detalle / Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-slate-300">
                {logs.map((log) => {
                  const createdDate = new Date(log.created_at).toLocaleString("es-CO", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                  const sentDate = log.sent_at
                    ? new Date(log.sent_at).toLocaleString("es-CO", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"

                  return (
                    <tr key={log.id} className="hover:bg-slate-950/20 transition-colors">
                      <td className="py-3 px-4 font-medium text-white">
                        {log.patients?.full_name || "Paciente Desconocido"}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono uppercase text-slate-400">
                        {log.channel}
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-slate-300 capitalize">
                        {log.event_type}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold tracking-wide ${
                            log.status === "sent"
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800/30"
                              : log.status === "failed"
                              ? "bg-red-950 text-red-400 border border-red-800/30"
                              : "bg-amber-950 text-amber-400 border border-amber-800/30"
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-400">
                        {createdDate}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-400">
                        {sentDate}
                      </td>
                      <td className="py-3 px-4 text-xs max-w-xs truncate">
                        {log.status === "failed" && log.error_message ? (
                          <span className="text-red-400 font-medium" title={log.error_message}>
                            {log.error_message}
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
