"use client"

import React, { useState } from "react"
import { AlertCircle, CheckCircle2, Info } from "lucide-react"

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
}

const QUADRANT_1 = [18, 17, 16, 15, 14, 13, 12, 11]
const QUADRANT_2 = [21, 22, 23, 24, 25, 26, 27, 28]
const QUADRANT_3 = [31, 32, 33, 34, 35, 36, 37, 38]
const QUADRANT_4 = [48, 47, 46, 45, 44, 43, 42, 41]

const TOOTH_FACES = ["Oclusal", "Mesial", "Distal", "Vestibular", "Palatina", "Lingual", "General"]
const STATUS_OPTIONS = [
  { value: "sano",               label: "Sano",               color: "bg-emerald-50 text-emerald-700 border-emerald-300",  fill: "#10B981" },
  { value: "caries",             label: "Caries",             color: "bg-red-50 text-red-700 border-red-300",              fill: "#EF4444" },
  { value: "obturado",           label: "Obturado (Resina)",  color: "bg-sky-50 text-sky-700 border-sky-300",              fill: "#0EA5E9" },
  { value: "sellante",           label: "Sellante",           color: "bg-violet-50 text-violet-700 border-violet-300",     fill: "#8B5CF6" },
  { value: "corona",             label: "Corona",             color: "bg-amber-50 text-amber-700 border-amber-300",        fill: "#F59E0B" },
  { value: "endodoncia",         label: "Endodoncia",         color: "bg-pink-50 text-pink-700 border-pink-300",           fill: "#EC4899" },
  { value: "implante",           label: "Implante",           color: "bg-teal-50 text-teal-700 border-teal-300",           fill: "#14B8A6" },
  { value: "ausente",            label: "Ausente",            color: "bg-slate-50 text-slate-600 border-slate-300",        fill: "#94A3B8" },
  { value: "extraccion_indicada",label: "Extracción Indicada",color: "bg-rose-50 text-rose-700 border-rose-300",          fill: "#F43F5E" },
  { value: "fracturado",         label: "Fracturado",         color: "bg-orange-50 text-orange-700 border-orange-300",     fill: "#F97316" },
]

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

// ─── Anatomical tooth paths (SVG 0 0 44 54 viewBox) ──────────
function ToothShape({ type, isUpper }: { type: ReturnType<typeof getToothType>; isUpper: boolean }) {
  const base = isUpper ? 0 : 0

  if (type === "incisor") {
    // Rectangular with slightly rounded crown
    return (
      <g>
        {/* Root */}
        <path d="M17 30 Q16 48 22 54 Q28 48 27 30 Z" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="0.8" />
        {/* Crown */}
        <rect x="10" y="8" width="24" height="22" rx="4" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="1" />
      </g>
    )
  }
  if (type === "canine") {
    // Pointed crown
    return (
      <g>
        <path d="M17 30 Q15 50 22 54 Q29 50 27 30 Z" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="0.8" />
        <path d="M10 28 L22 6 L34 28 Q31 32 22 32 Q13 32 10 28 Z" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="1" />
      </g>
    )
  }
  if (type === "premolar") {
    // Two roots, bicuspid crown
    return (
      <g>
        <path d="M14 30 Q13 46 18 53 Q19 54 20 53 Q21 48 22 44 Q23 48 24 53 Q25 54 26 53 Q30 46 30 30 Z" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="0.8" />
        <rect x="9" y="9" width="26" height="21" rx="5" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="1" />
        {/* Bicuspid line */}
        <line x1="22" y1="9" x2="22" y2="30" stroke="#CBD5E1" strokeWidth="0.6" />
      </g>
    )
  }
  // molar — three roots wide crown with cuspids
  return (
    <g>
      <path d="M9 30 Q8 46 14 53 Q15 54 16 53 Q17 47 22 44 Q27 47 28 53 Q29 54 30 53 Q36 46 35 30 Z" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="0.8" />
      <rect x="6" y="8" width="32" height="22" rx="5" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="1" />
      {/* Crown grooves */}
      <line x1="22" y1="8" x2="22" y2="30" stroke="#CBD5E1" strokeWidth="0.6" />
      <line x1="6" y1="19" x2="38" y2="19" stroke="#CBD5E1" strokeWidth="0.5" />
    </g>
  )
}

export default function OdontogramChart({ records = [], onSelectionSubmit }: OdontogramChartProps) {
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null)
  const [selectedFace, setSelectedFace] = useState<string>("Oclusal")
  const [selectedStatus, setSelectedStatus] = useState<string>("sano")
  const [notes, setNotes] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const getStatusFill = (toothNumber: number, faceName: string): string => {
    const record = records.find(r => r.tooth_number === toothNumber && r.tooth_face === faceName)
    if (!record) return "transparent"
    return STATUS_OPTIONS.find(s => s.value === record.status)?.fill ?? "#10B981"
  }

  const getToothStatuses = (toothNumber: number) =>
    records.filter(r => r.tooth_number === toothNumber && r.tooth_face === null)

  const handleToothClick = (toothNumber: number) => {
    setSelectedTooth(toothNumber)
    setErrorMsg(null)
    setSuccessMsg(null)
    setSelectedFace("Oclusal")
    setSelectedStatus("sano")
    setNotes("")
  }

  const handleConfirm = async () => {
    if (!selectedTooth) return
    setSubmitting(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    const isGeneralStatus = ["sano","ausente","extraccion_indicada","endodoncia","corona","implante"].includes(selectedStatus)
    const payload = {
      tooth_number: selectedTooth,
      tooth_face: isGeneralStatus ? null : selectedFace,
      status: selectedStatus,
      notes: notes.trim() || undefined,
    }

    try {
      const res = await onSelectionSubmit(payload)
      if (res.success) {
        setSuccessMsg("¡Registro guardado correctamente!")
        setSelectedTooth(null)
        setNotes("")
      } else {
        setErrorMsg(res.error || "Ocurrió un error al persistir el registro.")
      }
    } catch {
      setErrorMsg("Ocurrió un error inesperado al procesar la solicitud.")
    } finally {
      setSubmitting(false)
    }
  }

  const GENERAL_STATUSES = ["sano","ausente","extraccion_indicada","endodoncia","corona","implante"]

  const renderTooth = (toothNumber: number) => {
    const isSelected = selectedTooth === toothNumber
    const type = getToothType(toothNumber)
    const isUpper = toothNumber < 30
    const generalStatuses = getToothStatuses(toothNumber)
    const hasExtraccion = generalStatuses.some(g => g.status === "extraccion_indicada")
    const hasAusente = generalStatuses.some(g => g.status === "ausente")
    const hasCross = hasExtraccion || hasAusente
    const crossColor = hasExtraccion ? "#F43F5E" : "#94A3B8"

    // Overlay fill for general statuses (corona, implante, endodoncia etc)
    let toothFill = "#F8FAFC"
    let toothStroke = "#94A3B8"
    const generalStatus = generalStatuses.find(g => ["corona","implante","endodoncia","sano"].includes(g.status))
    if (generalStatus) {
      const opt = STATUS_OPTIONS.find(o => o.value === generalStatus.status)
      if (opt) { toothFill = opt.fill + "22"; toothStroke = opt.fill }
    }

    const isRightSide = (toothNumber >= 11 && toothNumber <= 18) || (toothNumber >= 41 && toothNumber <= 48)
    const leftFace = isRightSide ? "Distal" : "Mesial"
    const rightFace = isRightSide ? "Mesial" : "Distal"
    const bottomFace = isUpper ? "Palatina" : "Lingual"

    return (
      <div
        key={toothNumber}
        onClick={() => handleToothClick(toothNumber)}
        className="tooth-container flex flex-col items-center gap-0.5 p-1 rounded-lg select-none"
        style={{
          background: isSelected ? "#E6FAF8" : "transparent",
          outline: isSelected ? "2px solid #00C8B4" : "2px solid transparent",
          outlineOffset: "1px",
        }}
      >
        {/* Tooth number */}
        <span className="text-[9px] font-bold" style={{ color: isSelected ? "#00A896" : "#94A3B8" }}>
          {toothNumber}
        </span>

        {/* Tooth SVG */}
        <svg
          viewBox="0 0 44 54"
          className="w-8 h-10"
          style={{ transform: isUpper ? "none" : "scaleY(-1)" }}
        >
          {/* Faces overlaid as colored zones */}
          {/* Oclusal face (center circle) */}
          <circle cx="22" cy="19" r="7"
            fill={getStatusFill(toothNumber, "Oclusal") || toothFill}
            stroke={toothStroke}
            strokeWidth="0.8"
            opacity={getStatusFill(toothNumber, "Oclusal") !== "transparent" ? 0.9 : 0}
          />
          {/* Vestibular top strip */}
          <rect x="9" y="8" width="26" height="7" rx="3"
            fill={getStatusFill(toothNumber, "Vestibular")}
            opacity={getStatusFill(toothNumber, "Vestibular") !== "transparent" ? 0.85 : 0}
          />
          {/* Palatina/Lingual bottom strip */}
          <rect x="9" y="24" width="26" height="7" rx="3"
            fill={getStatusFill(toothNumber, bottomFace)}
            opacity={getStatusFill(toothNumber, bottomFace) !== "transparent" ? 0.85 : 0}
          />
          {/* Left face (Mesial/Distal) */}
          <rect x="6" y="9" width="7" height="22" rx="3"
            fill={getStatusFill(toothNumber, leftFace)}
            opacity={getStatusFill(toothNumber, leftFace) !== "transparent" ? 0.85 : 0}
          />
          {/* Right face */}
          <rect x="31" y="9" width="7" height="22" rx="3"
            fill={getStatusFill(toothNumber, rightFace)}
            opacity={getStatusFill(toothNumber, rightFace) !== "transparent" ? 0.85 : 0}
          />

          {/* Anatomic tooth shape */}
          <ToothShape type={type} isUpper={isUpper} />

          {/* Crown ring for corona/implante */}
          {generalStatuses.some(g => g.status === "corona") && (
            <rect x="7" y="7" width="30" height="24" rx="5" fill="none" stroke="#F59E0B" strokeWidth="2" />
          )}
          {generalStatuses.some(g => g.status === "implante") && (
            <rect x="7" y="7" width="30" height="24" rx="5" fill="none" stroke="#14B8A6" strokeWidth="2" strokeDasharray="3,2" />
          )}
          {generalStatuses.some(g => g.status === "endodoncia") && (
            <line x1="22" y1="30" x2="22" y2="52" stroke="#EC4899" strokeWidth="1.5" strokeLinecap="round" />
          )}

          {/* X cross for ausente / extraccion */}
          {hasCross && (
            <>
              <line x1="10" y1="10" x2="34" y2="30" stroke={crossColor} strokeWidth="2.5" strokeLinecap="round" />
              <line x1="34" y1="10" x2="10" y2="30" stroke={crossColor} strokeWidth="2.5" strokeLinecap="round" />
            </>
          )}
        </svg>

        {/* Note indicator dot */}
        {records.some(r => r.tooth_number === toothNumber && r.notes) && (
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#00C8B4" }} />
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col xl:flex-row gap-5 w-full">
      {/* Odontogram panel */}
      <div className="flex-1 bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-[#1E293B]">Odontograma Clínico</h2>
          <span className="text-xs font-medium text-[#64748B] bg-[#F1F5F9] px-3 py-1 rounded-full">
            Haz clic en un diente para registrar diagnóstico
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

        {/* Legend */}
        <div className="mt-8 pt-5 border-t border-[#E2E8F0]">
          <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-3">Leyenda de diagnósticos</p>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map(opt => (
              <span
                key={opt.value}
                className={`text-xs px-2.5 py-1 rounded-full border font-medium ${opt.color}`}
              >
                {opt.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Selection panel */}
      <div className="w-full xl:w-76 bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm flex flex-col">
        {selectedTooth ? (
          <div className="flex flex-col gap-5">
            <div>
              <div className="inline-flex items-center gap-2 mb-3">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #00C8B4, #00A896)" }}>
                  {selectedTooth}
                </span>
                <h3 className="text-base font-bold text-[#1E293B]">
                  {TOOTH_NAMES[selectedTooth] ?? `Pieza #${selectedTooth}`}
                </h3>
              </div>
              <p className="text-xs font-medium text-[#64748B]">
                Diente #{selectedTooth} — Registra un diagnóstico clínico o tratamiento.
              </p>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#475569]">Diagnóstico / Estado *</label>
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="w-full border border-[#E2E8F0] text-[#1E293B] bg-white rounded-lg p-2.5 text-sm outline-none focus:border-[#00C8B4] focus:ring-2 focus:ring-[#00C8B4]/20 transition-all"
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {!GENERAL_STATUSES.includes(selectedStatus) ? (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#475569]">Cara Dental *</label>
                <select
                  value={selectedFace}
                  onChange={e => setSelectedFace(e.target.value)}
                  className="w-full border border-[#E2E8F0] text-[#1E293B] bg-white rounded-lg p-2.5 text-sm outline-none focus:border-[#00C8B4] focus:ring-2 focus:ring-[#00C8B4]/20 transition-all"
                >
                  {TOOTH_FACES.map(face => (
                    <option key={face} value={face}>{face}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl text-[#64748B] text-xs">
                <Info className="w-4 h-4 text-[#00C8B4] shrink-0" />
                <span>El diagnóstico seleccionado aplica a toda la pieza completa (cara general).</span>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#475569]">Notas clínicas</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Notas clínicas adicionales para el expediente..."
                rows={3}
                className="w-full border border-[#E2E8F0] text-[#1E293B] bg-white rounded-lg p-2.5 text-sm outline-none focus:border-[#00C8B4] focus:ring-2 focus:ring-[#00C8B4]/20 transition-all resize-none"
              />
            </div>

            <div className="flex flex-col gap-2 mt-1">
              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="w-full text-white py-2.5 px-4 rounded-xl text-sm font-bold shadow-sm transition-all disabled:opacity-50"
                style={{ background: submitting ? "#94A3B8" : "linear-gradient(135deg, #00C8B4, #00A896)" }}
              >
                {submitting ? "Guardando..." : "Confirmar y Guardar"}
              </button>
              <button
                onClick={() => setSelectedTooth(null)}
                disabled={submitting}
                className="w-full bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#64748B] py-2.5 px-4 rounded-xl text-sm font-medium transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center h-full gap-3">
            <div className="w-14 h-14 rounded-2xl bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center">
              <Info className="w-6 h-6 text-[#94A3B8]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#475569]">Ninguna pieza seleccionada</h3>
              <p className="text-xs text-[#94A3B8] max-w-xs mt-1.5 leading-relaxed">
                Haz clic en cualquier diente del odontograma para registrar un diagnóstico clínico.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
