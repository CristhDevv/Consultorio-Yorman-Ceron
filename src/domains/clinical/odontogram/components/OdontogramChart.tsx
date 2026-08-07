"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle2, Info, Trash2 } from "lucide-react"

export interface OdontogramRecord {
  id: string
  patient_id: string
  tooth_number: number
  tooth_face: string | null
  status: string
  notes: string | null
  created_at: string
}

interface OdontogramChartProps {
  records?: OdontogramRecord[]
  onSelectionSubmit: (data: {
    tooth_number: number
    tooth_face: string | null
    status: string
    notes?: string
  }) => Promise<{ success: boolean; error?: string }>
  onDeleteRecord?: (id: string) => Promise<{ success: boolean; error?: string }>
}

const QUADRANT_1 = [18, 17, 16, 15, 14, 13, 12, 11]
const QUADRANT_2 = [21, 22, 23, 24, 25, 26, 27, 28]
const QUADRANT_3 = [31, 32, 33, 34, 35, 36, 37, 38]
const QUADRANT_4 = [48, 47, 46, 45, 44, 43, 42, 41]

// ─── Tooth type classification ────────────────────────────────
function getToothType(n: number): "incisor" | "canine" | "premolar" | "molar" {
  const last = n % 10
  if (last === 1 || last === 2) return "incisor"
  if (last === 3)               return "canine"
  if (last === 4 || last === 5) return "premolar"
  return "molar"
}

// ─── Exact anatomical name per FDI tooth number ───────────────
const TOOTH_NAMES: Record<number, string> = {
  // Cuadrante I – Superior Derecho
  11: "Incisivo Central Superior Derecho",
  12: "Incisivo Lateral Superior Derecho",
  13: "Canino Superior Derecho",
  14: "Primer Premolar Superior Derecho",
  15: "Segundo Premolar Superior Derecho",
  16: "Primer Molar Superior Derecho",
  17: "Segundo Molar Superior Derecho",
  18: "Tercer Molar Superior Derecho (Muela del Juicio)",
  // Cuadrante II – Superior Izquierdo
  21: "Incisivo Central Superior Izquierdo",
  22: "Incisivo Lateral Superior Izquierdo",
  23: "Canino Superior Izquierdo",
  24: "Primer Premolar Superior Izquierdo",
  25: "Segundo Premolar Superior Izquierdo",
  26: "Primer Molar Superior Izquierdo",
  27: "Segundo Molar Superior Izquierdo",
  28: "Tercer Molar Superior Izquierdo (Muela del Juicio)",
  // Cuadrante III – Inferior Izquierdo
  31: "Incisivo Central Inferior Izquierdo",
  32: "Incisivo Lateral Inferior Izquierdo",
  33: "Canino Inferior Izquierdo",
  34: "Primer Premolar Inferior Izquierdo",
  35: "Segundo Premolar Inferior Izquierdo",
  36: "Primer Molar Inferior Izquierdo",
  37: "Segundo Molar Inferior Izquierdo",
  38: "Tercer Molar Inferior Izquierdo (Muela del Juicio)",
  // Cuadrante IV – Inferior Derecho
  41: "Incisivo Central Inferior Derecho",
  42: "Incisivo Lateral Inferior Derecho",
  43: "Canino Inferior Derecho",
  44: "Primer Premolar Inferior Derecho",
  45: "Segundo Premolar Inferior Derecho",
  46: "Primer Molar Inferior Derecho",
  47: "Segundo Molar Inferior Derecho",
  48: "Tercer Molar Inferior Derecho (Muela del Juicio)",
}

// All valid tooth numbers in a flat list
const ALL_TEETH_NUMBERS = [
  ...QUADRANT_1,
  ...QUADRANT_2,
  ...QUADRANT_3,
  ...QUADRANT_4
].sort()

// ─── Anatomical tooth paths (SVG 0 0 44 54 viewBox) ──────────
function ToothShape({ type, fill = "#F8FAFC", stroke = "#94A3B8" }: { type: ReturnType<typeof getToothType>; isUpper: boolean; fill?: string; stroke?: string }) {
  if (type === "incisor") {
    // Rectangular with slightly rounded crown
    return (
      <g>
        {/* Root */}
        <path d="M17 30 Q16 48 22 54 Q28 48 27 30 Z" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="0.8" />
        {/* Crown */}
        <rect x="10" y="8" width="24" height="22" rx="4" fill={fill} stroke={stroke} strokeWidth="1.2" />
      </g>
    )
  }
  if (type === "canine") {
    // Pointed crown
    return (
      <g>
        <path d="M17 30 Q15 50 22 54 Q29 50 27 30 Z" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="0.8" />
        <path d="M10 28 L22 6 L34 28 Q31 32 22 32 Q13 32 10 28 Z" fill={fill} stroke={stroke} strokeWidth="1.2" />
      </g>
    )
  }
  if (type === "premolar") {
    // Two roots, bicuspid crown
    return (
      <g>
        <path d="M14 30 Q13 46 18 53 Q19 54 20 53 Q21 48 22 44 Q23 48 24 53 Q25 54 26 53 Q30 46 30 30 Z" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="0.8" />
        <rect x="9" y="9" width="26" height="21" rx="5" fill={fill} stroke={stroke} strokeWidth="1.2" />
        {/* Bicuspid line */}
        <line x1="22" y1="9" x2="22" y2="30" stroke="#CBD5E1" strokeWidth="0.6" />
      </g>
    )
  }
  // molar — three roots wide crown with cuspids
  return (
    <g>
      <path d="M9 30 Q8 46 14 53 Q15 54 16 53 Q17 47 22 44 Q27 47 28 53 Q29 54 30 53 Q36 46 35 30 Z" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="0.8" />
      <rect x="6" y="8" width="32" height="22" rx="5" fill={fill} stroke={stroke} strokeWidth="1.2" />
      {/* Crown grooves */}
      <line x1="22" y1="8" x2="22" y2="30" stroke="#CBD5E1" strokeWidth="0.6" />
      <line x1="6" y1="19" x2="38" y2="19" stroke="#CBD5E1" strokeWidth="0.5" />
    </g>
  )
}

export default function OdontogramChart({ records = [], onSelectionSubmit, onDeleteRecord }: OdontogramChartProps) {
  const router = useRouter()
  const [selectedTooth, setSelectedTooth] = useState<number>(11)
  const [selectedFace, setSelectedFace] = useState<string>("General")
  const [selectedStatus, setSelectedStatus] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleConfirm = async () => {
    if (!selectedStatus.trim()) {
      setErrorMsg("Debe ingresar una observación o diagnóstico.")
      return
    }

    setSubmitting(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    const payload = {
      tooth_number: selectedTooth,
      tooth_face: selectedFace.trim() || null,
      status: selectedStatus.trim(),
    }

    try {
      const res = await onSelectionSubmit(payload)
      if (res.success) {
        setSuccessMsg("¡Observación registrada correctamente!")
        setSelectedStatus("")
        router.refresh()
      } else {
        setErrorMsg(res.error || "Ocurrió un error al guardar el registro.")
      }
    } catch {
      setErrorMsg("Ocurrió un error inesperado al procesar la solicitud.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (recordId: string) => {
    if (!onDeleteRecord) return
    if (!window.confirm("¿Está seguro de que desea eliminar esta observación del historial?")) return

    setDeletingId(recordId)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const res = await onDeleteRecord(recordId)
      if (res.success) {
        setSuccessMsg("Registro eliminado correctamente.")
        router.refresh()
      } else {
        setErrorMsg(res.error || "No se pudo eliminar el registro.")
      }
    } catch {
      setErrorMsg("Error inesperado al intentar eliminar el registro.")
    } finally {
      setDeletingId(null)
    }
  }

  const renderTooth = (toothNumber: number) => {
    const isSelected = selectedTooth === toothNumber
    const type = getToothType(toothNumber)
    const isUpper = toothNumber < 30

    // Si tiene observaciones registradas, coloreamos la pieza en verde suave
    const hasObservations = records.some(r => r.tooth_number === toothNumber)
    const toothFill = isSelected ? "#CCFBF1" : (hasObservations ? "#F0FDF4" : "#F8FAFC")
    const toothStroke = isSelected ? "#00C8B4" : (hasObservations ? "#15803D" : "#94A3B8")

    return (
      <div
        key={toothNumber}
        onClick={() => {
          setSelectedTooth(toothNumber)
          setErrorMsg(null)
          setSuccessMsg(null)
        }}
        className="tooth-container flex flex-col items-center gap-0.5 p-1 rounded-lg select-none cursor-pointer hover:bg-slate-50 transition-colors"
        style={{
          background: isSelected ? "#E6FAF8" : "transparent",
          outline: isSelected ? "2px solid #00C8B4" : "2px solid transparent",
          outlineOffset: "1px",
        }}
      >
        {/* Tooth number */}
        <span className="text-[10px] font-bold" style={{ color: isSelected ? "#00A896" : (hasObservations ? "#166534" : "#94A3B8") }}>
          {toothNumber}
        </span>

        {/* Tooth SVG */}
        <svg
          viewBox="0 0 44 54"
          className="w-8 h-10"
          style={{ transform: isUpper ? "none" : "scaleY(-1)" }}
        >
          <ToothShape type={type} isUpper={isUpper} fill={toothFill} stroke={toothStroke} />
        </svg>

        {/* Indicators */}
        {hasObservations && (
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-0.5" title="Tiene observaciones clínicas" />
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 w-full">
      
      {/* Sección Superior: Odontograma y Panel de Edición Libre */}
      <div className="flex flex-col xl:flex-row gap-6 w-full items-start">
        
        {/* Odontograma Clínico */}
        <div className="flex-1 bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm w-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-[#1E293B]">Odontograma de Referencia</h2>
            <span className="text-xs font-medium text-[#64748B] bg-[#F1F5F9] px-3 py-1 rounded-full">
              Selecciona una pieza en el gráfico o búscala en la lista
            </span>
          </div>

          {successMsg && (
            <div className="mb-4 flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Upper jaw */}
          <div className="mb-6">
            <div className="grid grid-cols-2 gap-4 pb-3 border-b border-[#E2E8F0] mb-4">
              <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider text-right">Cuadrante I — Superior Derecho</p>
              <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Cuadrante II — Superior Izquierdo</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex justify-end gap-0.5 md:gap-1 flex-wrap">
                {QUADRANT_1.map(n => renderTooth(n))}
              </div>
              <div className="flex justify-start gap-0.5 md:gap-1 flex-wrap">
                {QUADRANT_2.map(n => renderTooth(n))}
              </div>
            </div>
          </div>

          {/* Jaw divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-[#E2E8F0]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">Línea Oclusal</span>
            <div className="flex-1 h-px bg-[#E2E8F0]" />
          </div>

          {/* Lower jaw */}
          <div>
            <div className="grid grid-cols-2 gap-4 pb-3 border-b border-[#E2E8F0] mb-4">
              <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider text-right">Cuadrante IV — Inferior Derecho</p>
              <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Cuadrante III — Inferior Izquierdo</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex justify-end gap-0.5 md:gap-1 flex-wrap">
                {QUADRANT_4.map(n => renderTooth(n))}
              </div>
              <div className="flex justify-start gap-0.5 md:gap-1 flex-wrap">
                {QUADRANT_3.map(n => renderTooth(n))}
              </div>
            </div>
          </div>
        </div>

        {/* Panel de Observación Libre */}
        <div className="w-full xl:w-80 bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm flex flex-col shrink-0">
          <div className="flex flex-col gap-5">
            <div>
              <div className="inline-flex items-center gap-2 mb-2">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #00C8B4, #00A896)" }}>
                  {selectedTooth}
                </span>
                <h3 className="text-base font-bold text-[#1E293B]">
                  {TOOTH_NAMES[selectedTooth] ?? `Pieza #${selectedTooth}`}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Escribe libremente observaciones o diagnósticos clínicos para esta pieza.
              </p>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Diente Selector Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#475569]">Pieza Dental *</label>
              <select
                value={selectedTooth}
                onChange={e => {
                  setSelectedTooth(Number(e.target.value))
                  setErrorMsg(null)
                  setSuccessMsg(null)
                }}
                className="w-full border border-[#E2E8F0] text-[#1E293B] bg-white rounded-lg p-2.5 text-sm outline-none focus:border-[#00C8B4] focus:ring-2 focus:ring-[#00C8B4]/20 transition-all cursor-pointer"
              >
                {ALL_TEETH_NUMBERS.map(n => (
                  <option key={n} value={n}>Pieza #{n} - {TOOTH_NAMES[n]?.split(" ")[0]} ({n < 30 ? "Sup" : "Inf"})</option>
                ))}
              </select>
            </div>

            {/* Cara Dental */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cara-dental" className="text-xs font-semibold text-[#475569]">Cara Dental (Opcional / Libre)</label>
              <input
                id="cara-dental"
                type="text"
                value={selectedFace}
                onChange={e => setSelectedFace(e.target.value)}
                placeholder="ej: Vestibular, Oclusal, General..."
                className="w-full border border-[#E2E8F0] text-[#1E293B] bg-white rounded-lg p-2.5 text-sm outline-none focus:border-[#00C8B4] focus:ring-2 focus:ring-[#00C8B4]/20 transition-all"
              />
            </div>

            {/* Diagnóstico / Observación */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="observacion-diagnostico" className="text-xs font-semibold text-[#475569]">Observación / Diagnóstico *</label>
              <textarea
                id="observacion-diagnostico"
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                placeholder="ej: Caries dentinaria activa, corona en buen estado, etc..."
                rows={4}
                className="w-full border border-[#E2E8F0] text-[#1E293B] bg-white rounded-lg p-2.5 text-sm outline-none focus:border-[#00C8B4] focus:ring-2 focus:ring-[#00C8B4]/20 transition-all resize-none"
              />
            </div>

            <button
              onClick={handleConfirm}
              disabled={submitting}
              className="w-full text-white py-2.5 px-4 rounded-xl text-sm font-bold shadow-sm transition-all disabled:opacity-50 mt-2"
              style={{ background: submitting ? "#94A3B8" : "linear-gradient(135deg, #00C8B4, #00A896)" }}
            >
              {submitting ? "Guardando..." : "Guardar Observación"}
            </button>
          </div>
        </div>

      </div>

      {/* Sección Inferior: Historial Clínico a Ancho Completo (Full Width) */}
      <div className="w-full border-t border-[#E2E8F0] pt-6">
        <h3 className="text-lg font-bold text-[#1E293B] mb-4">Historial de Observaciones Clínicas</h3>
        {records.length === 0 ? (
          <div className="bg-[#F8FAFC] border border-dashed border-[#E2E8F0] rounded-xl p-8 text-center text-muted-foreground text-sm">
            No hay observaciones registradas en el odontograma del paciente.
          </div>
        ) : (
          <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl shadow-xs">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  <th className="px-4 py-3 font-bold text-[#64748B]">Fecha</th>
                  <th className="px-4 py-3 font-bold text-[#64748B]">Pieza Dental</th>
                  <th className="px-4 py-3 font-bold text-[#64748B]">Cara</th>
                  <th className="px-4 py-3 font-bold text-[#64748B]">Observación / Diagnóstico</th>
                  {onDeleteRecord && <th className="px-4 py-3 font-bold text-[#64748B] text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {records.map((r) => {
                  const dateStr = new Date(r.created_at).toLocaleDateString("es-CO", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })
                  const toothName = TOOTH_NAMES[r.tooth_number] || `Diente #${r.tooth_number}`
                  return (
                    <tr key={r.id} className="hover:bg-[#F8FAFC]/50 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{dateStr}</td>
                      <td className="px-4 py-3 font-semibold text-[#1E293B]">
                        Pieza {r.tooth_number} <span className="text-xs text-muted-foreground font-normal">({toothName})</span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {r.tooth_face || <span className="text-muted-foreground/60 italic">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-900 font-medium max-w-lg break-words">
                        {r.status}
                      </td>
                      {onDeleteRecord && (
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleDelete(r.id)}
                            disabled={deletingId === r.id}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors inline-flex items-center disabled:opacity-50"
                            title="Eliminar observación"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
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
