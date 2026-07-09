"use client"

import React, { useState } from "react"
import { AlertCircle, CheckCircle2, Info } from "lucide-react"

// Tipado de registros que vienen de la base de datos
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

// Configuración de los dientes por cuadrante (de atrás hacia el centro, y del centro hacia atrás)
const QUADRANT_1 = [18, 17, 16, 15, 14, 13, 12, 11] // Superior Derecho
const QUADRANT_2 = [21, 22, 23, 24, 25, 26, 27, 28] // Superior Izquierdo
const QUADRANT_3 = [31, 32, 33, 34, 35, 36, 37, 38] // Inferior Izquierdo
const QUADRANT_4 = [48, 47, 46, 45, 44, 43, 42, 41] // Inferior Derecho (ordenado de molar a incisivo para alinear con Q1)

const TOOTH_FACES = ["Oclusal", "Mesial", "Distal", "Vestibular", "Palatina", "Lingual", "General"]
const STATUS_OPTIONS = [
  { value: "sano", label: "Sano", color: "border-green-500 bg-green-500/20 text-green-400" },
  { value: "caries", label: "Caries", color: "border-red-500 bg-red-500/20 text-red-400" },
  { value: "obturado", label: "Obturado (Resina)", color: "border-sky-500 bg-sky-500/20 text-sky-400" },
  { value: "sellante", label: "Sellante", color: "border-purple-500 bg-purple-500/20 text-purple-400" },
  { value: "corona", label: "Corona", color: "border-amber-500 bg-amber-500/20 text-amber-400" },
  { value: "endodoncia", label: "Endodoncia", color: "border-pink-500 bg-pink-500/20 text-pink-400" },
  { value: "implante", label: "Implante", color: "border-teal-500 bg-teal-500/20 text-teal-400" },
  { value: "ausente", label: "Ausente", color: "border-slate-500 bg-slate-500/20 text-slate-400" },
  { value: "extraccion_indicada", label: "Extracción Indicada", color: "border-rose-600 bg-rose-600/20 text-rose-400" },
  { value: "fracturado", label: "Fracturado", color: "border-orange-500 bg-orange-500/20 text-orange-400" },
]

export default function OdontogramChart({ records = [], onSelectionSubmit }: OdontogramChartProps) {
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null)
  const [selectedFace, setSelectedFace] = useState<string>("Oclusal")
  const [selectedStatus, setSelectedStatus] = useState<string>("sano")
  const [notes, setNotes] = useState<string>("")
  
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Obtiene el estado o colores para pintar una cara o diente entero
  const getFaceColor = (toothNumber: number, faceName: string) => {
    // Buscar si hay algún registro en esa cara específica de ese diente
    const record = records.find(r => r.tooth_number === toothNumber && r.tooth_face === faceName)
    if (!record) return "fill-slate-800 stroke-slate-700 hover:fill-slate-700"

    switch (record.status) {
      case "caries": return "fill-red-600 stroke-red-500"
      case "obturado": return "fill-sky-500 stroke-sky-400"
      case "sellante": return "fill-purple-500 stroke-purple-400"
      case "fracturado": return "fill-orange-500 stroke-orange-400"
      default: return "fill-green-600 stroke-green-500"
    }
  }

  // Obtiene todos los diagnósticos de pieza completa (face === null)
  const getToothStatuses = (toothNumber: number) => {
    return records.filter(r => r.tooth_number === toothNumber && r.tooth_face === null)
  }

  const handleToothClick = (toothNumber: number) => {
    setSelectedTooth(toothNumber)
    setErrorMsg(null)
    setSuccessMsg(null)
    // Valores predeterminados por defecto al seleccionar
    setSelectedFace("Oclusal")
    setSelectedStatus("sano")
    setNotes("")
  }

  const handleConfirm = async () => {
    if (!selectedTooth) return
    setSubmitting(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    // Si el estado seleccionado exige cara NULL (sistémicos / pieza completa)
    const isGeneralStatus = [
      "sano",
      "ausente",
      "extraccion_indicada",
      "endodoncia",
      "corona",
      "implante"
    ].includes(selectedStatus)

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

  // Renderiza el SVG interactivo de un diente individual
  const renderToothSVG = (toothNumber: number) => {
    const isSelected = selectedTooth === toothNumber
    const generalStatuses = getToothStatuses(toothNumber)

    // Determinamos si el diente tiene estados generales que afecten toda la pieza
    let overlayColor = ""
    let borderStyles = ""

    generalStatuses.forEach(gs => {
      switch (gs.status) {
        case "ausente":
          overlayColor += " bg-slate-950/70"
          break
        case "corona":
          borderStyles += " ring-2 ring-amber-500 ring-offset-2 ring-offset-slate-900"
          break
        case "implante":
          borderStyles += " ring-2 ring-teal-500 ring-offset-2 ring-offset-slate-900"
          break
        case "endodoncia":
          overlayColor += " bg-pink-500/10 border border-pink-500/30"
          break
        case "sano":
          overlayColor += " bg-green-500/5"
          break
      }
    });

    // Prioridad explícita para la cruz: extraccion_indicada siempre gana sobre ausente,
    // sin importar el orden de llegada de los registros.
    const hasExtraccion = generalStatuses.some(gs => gs.status === "extraccion_indicada")
    const hasAusente = generalStatuses.some(gs => gs.status === "ausente")
    const hasCross = hasExtraccion || hasAusente
    const crossColor = hasExtraccion ? "stroke-rose-600" : "stroke-slate-500"

    // Configuración de caras mesial/distal según el lado
    // Mitad derecha (Q1, Q4): midline está a la derecha, por ende derecha=Mesial, izquierda=Distal
    // Mitad izquierda (Q2, Q3): midline está a la izquierda, por ende izquierda=Mesial, derecha=Distal
    const isRightSide = toothNumber >= 11 && toothNumber <= 18 || toothNumber >= 41 && toothNumber <= 48
    const leftFace = isRightSide ? "Distal" : "Mesial"
    const rightFace = isRightSide ? "Mesial" : "Distal"
    const isUpper = toothNumber < 30
    const bottomFace = isUpper ? "Palatina" : "Lingual"

    return (
      <div 
        key={toothNumber} 
        onClick={() => handleToothClick(toothNumber)}
        className={`relative flex flex-col items-center p-2 rounded-xl transition-all cursor-pointer select-none group 
          ${isSelected ? "bg-cyan-500/10 ring-2 ring-cyan-500/50" : "hover:bg-slate-900"} ${borderStyles}`}
      >
        {/* Número del Diente */}
        <span className={`text-xs font-bold mb-1 transition-colors ${isSelected ? "text-cyan-400" : "text-slate-400 group-hover:text-white"}`}>
          {toothNumber}
        </span>

        {/* Contenedor del diente SVG y overlays */}
        <div className="relative w-12 h-12 flex items-center justify-center">
          <svg viewBox="0 0 50 50" className="w-full h-full">
            {/* Oclusal (Centro) */}
            <polygon 
              points="15,15 35,15 35,35 15,35" 
              className={`transition-colors duration-150 ${getFaceColor(toothNumber, "Oclusal")}`}
            />
            {/* Vestibular (Arriba) */}
            <polygon 
              points="5,5 45,5 35,15 15,15" 
              className={`transition-colors duration-150 ${getFaceColor(toothNumber, "Vestibular")}`}
            />
            {/* Bottom: Palatina o Lingual (Abajo) */}
            <polygon 
              points="15,35 35,35 45,45 5,45" 
              className={`transition-colors duration-150 ${getFaceColor(toothNumber, bottomFace)}`}
            />
            {/* Left Face (Mesial / Distal) */}
            <polygon 
              points="5,5 15,15 15,35 5,45" 
              className={`transition-colors duration-150 ${getFaceColor(toothNumber, leftFace)}`}
            />
            {/* Right Face (Distal / Mesial) */}
            <polygon 
              points="35,15 45,5 45,45 35,35" 
              className={`transition-colors duration-150 ${getFaceColor(toothNumber, rightFace)}`}
            />
          </svg>

          {/* Overlay de estado de pieza completa */}
          {overlayColor && (
            <div className={`absolute inset-0 rounded-lg pointer-events-none ${overlayColor}`} />
          )}

          {/* Dibujo de cruz para Ausente o Extracción */}
          {hasCross && (
            <svg viewBox="0 0 50 50" className="absolute inset-0 w-full h-full pointer-events-none">
              <line x1="5" y1="5" x2="45" y2="45" strokeWidth="4" className={crossColor} strokeLinecap="round" />
              <line x1="45" y1="5" x2="5" y2="45" strokeWidth="4" className={crossColor} strokeLinecap="round" />
            </svg>
          )}
        </div>

        {/* Pequeño punto indicador si el diente tiene notas */}
        {records.some(r => r.tooth_number === toothNumber && r.notes) && (
          <span className="absolute bottom-0 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-500/50" />
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col xl:flex-row gap-6 w-full max-w-7xl mx-auto">
      {/* Panel del Odontograma */}
      <div className="flex-1 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          Odontograma Clínico Interactivo (FDI)
        </h2>

        {/* Mensajes informativos breves */}
        {successMsg && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 text-green-300 text-sm rounded-xl">
            <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Sección Superior (Cuadrantes 1 y 2) */}
        <div className="mb-8">
          <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-800">
            <div className="text-xs font-semibold text-slate-400 text-right uppercase tracking-wider">
              Cuadrante I (Superior Derecho)
            </div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Cuadrante II (Superior Izquierdo)
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6 mt-4">
            {/* Cuadrante 1: 18 a 11 */}
            <div className="flex justify-end gap-1.5 md:gap-3 flex-wrap">
              {QUADRANT_1.map(num => renderToothSVG(num))}
            </div>
            {/* Cuadrante 2: 21 a 28 */}
            <div className="flex justify-start gap-1.5 md:gap-3 flex-wrap">
              {QUADRANT_2.map(num => renderToothSVG(num))}
            </div>
          </div>
        </div>

        {/* Línea Divisoria Oclusal/Arcada */}
        <div className="h-0.5 bg-gradient-to-r from-transparent via-slate-700 to-transparent my-6" />

        {/* Sección Inferior (Cuadrantes 4 y 3) */}
        <div>
          <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-800">
            <div className="text-xs font-semibold text-slate-400 text-right uppercase tracking-wider">
              Cuadrante IV (Inferior Derecho)
            </div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Cuadrante III (Inferior Izquierdo)
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6 mt-4">
            {/* Cuadrante 4: 48 a 41 */}
            <div className="flex justify-end gap-1.5 md:gap-3 flex-wrap">
              {QUADRANT_4.map(num => renderToothSVG(num))}
            </div>
            {/* Cuadrante 3: 31 a 38 */}
            <div className="flex justify-start gap-1.5 md:gap-3 flex-wrap">
              {QUADRANT_3.map(num => renderToothSVG(num))}
            </div>
          </div>
        </div>

        {/* Leyenda de Diagnósticos */}
        <div className="mt-8 pt-6 border-t border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-3">
            Estados clínicos del gráfico
          </span>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map(opt => (
              <span 
                key={opt.value} 
                className={`text-xs px-2.5 py-1 rounded-full border ${opt.color}`}
              >
                {opt.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Panel de Selección y Registro */}
      <div className="w-full xl:w-80 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between backdrop-blur-sm">
        {selectedTooth ? (
          <div className="flex flex-col gap-5">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-1.5">
                Pieza Dental <span className="text-cyan-400">#{selectedTooth}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Registra un diagnóstico clínico o tratamiento para esta pieza dental.
              </p>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-sm rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Selector de Estado */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">Diagnóstico / Estado *</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 text-sm outline-none focus:border-cyan-500"
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Selector de Cara Dental (Oculto si el estado es sistémico / pieza completa) */}
            {![
              "sano",
              "ausente",
              "extraccion_indicada",
              "endodoncia",
              "corona",
              "implante"
            ].includes(selectedStatus) ? (
              <div className="flex flex-col gap-1.5 animate-fadeIn">
                <label className="text-xs font-semibold text-slate-300">Cara Dental *</label>
                <select
                  value={selectedFace}
                  onChange={(e) => setSelectedFace(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 text-sm outline-none focus:border-cyan-500"
                >
                  {/* Filtramos 'General' y otros si aplica, dejamos todos los de producción */}
                  {TOOTH_FACES.map(face => (
                    <option key={face} value={face}>
                      {face}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-400 text-xs">
                <Info className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>El diagnóstico seleccionado aplica a toda la pieza completa (cara general).</span>
              </div>
            )}

            {/* Notas clínicas */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">Notas u Observaciones</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas clínicas adicionales para el expediente..."
                rows={4}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 text-sm outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white py-2.5 px-4 rounded-xl text-sm font-bold shadow-md shadow-cyan-500/10 transition-all disabled:opacity-50"
              >
                {submitting ? "Guardando..." : "Confirmar y Guardar"}
              </button>
              <button
                onClick={() => setSelectedTooth(null)}
                disabled={submitting}
                className="w-full bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-300 py-2.5 px-4 rounded-xl text-sm font-medium transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center h-full">
            <div className="w-12 h-12 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center mb-4">
              <Info className="w-5 h-5 text-slate-500" />
            </div>
            <h3 className="text-sm font-semibold text-slate-300">Ninguna pieza seleccionada</h3>
            <p className="text-xs text-slate-500 max-w-xs mt-1.5 leading-relaxed">
              Haz clic en cualquier diente del odontograma para ver su historial o registrar un nuevo diagnóstico clínico.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
