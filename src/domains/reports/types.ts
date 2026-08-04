export interface FinancialReportTotales {
  total_pagado: number
  total_reversado: number
  neto: number
}

export interface FinancialReportPorOdontologo {
  dentist_id: string
  dentist_name: string
  total_pagado: number
  total_reversado: number
  neto: number
}

export interface FinancialReportPorTipoCita {
  appointment_reason: string
  total_pagado: number
  total_reversado: number
  neto: number
}

export interface FinancialReportResponse {
  totales: FinancialReportTotales
  por_odontologo: FinancialReportPorOdontologo[]
  por_tipo_cita: FinancialReportPorTipoCita[]
}
