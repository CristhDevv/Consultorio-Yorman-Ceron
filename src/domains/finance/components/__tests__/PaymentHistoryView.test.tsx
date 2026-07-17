import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import { vi, describe, it, expect, beforeEach } from "vitest"
import "@testing-library/jest-dom/vitest"
import PaymentHistoryView from "../PaymentHistoryView"
import { getPatientPaymentHistory } from "../../actions"

// Setup actions mocks
vi.mock("../../actions", () => ({
  getPatientPaymentHistory: vi.fn(),
}))

describe("PaymentHistoryView Component", () => {
  const PATIENT_ID = "pat-uuid-999"
  const PATIENT_NAME = "Esteban Muñoz"

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("1. muestra estado de carga mientras se resuelve la promesa de la Server Action", () => {
    // Promesa que nunca resuelve → componente queda en estado de carga (isLoading = true)
    vi.mocked(getPatientPaymentHistory).mockImplementationOnce(() => new Promise(() => {}))

    render(<PaymentHistoryView patientId={PATIENT_ID} patientName={PATIENT_NAME} />)

    // isLoading=true en el estado inicial → spinner visible
    expect(screen.getByText(/Cargando información financiera de Esteban Muñoz/i)).toBeInTheDocument()
  })

  it("2. muestra las tres tarjetas de resumen y la lista de movimientos con su signo e importes correctos tras cargar con éxito", async () => {
    const mockHistory = {
      success: true,
      data: {
        movements: [
          {
            id: "move-111",
            appointment_id: "appt-1",
            patient_id: PATIENT_ID,
            type: "pago" as const,
            amount: 300000,
            reason: "Pago consulta 1",
            reversed_payment_id: null,
            created_by: "user-1",
            created_at: "2026-07-10T12:00:00Z",
          },
          {
            id: "move-222",
            appointment_id: "appt-1",
            patient_id: PATIENT_ID,
            type: "reverso" as const,
            amount: 100000,
            reason: "Ajuste error cobro",
            reversed_payment_id: "move-111",
            created_by: "user-1",
            created_at: "2026-07-11T12:00:00Z",
          },
        ],
        summary: { totalPagado: 300000, totalReversado: 100000, saldoNeto: 200000 },
      },
    }
    vi.mocked(getPatientPaymentHistory).mockResolvedValue(mockHistory)

    render(<PaymentHistoryView patientId={PATIENT_ID} patientName={PATIENT_NAME} />)

    // Esperamos a que las tarjetas de resumen con data-slot="card-title" aparezcan
    await waitFor(
      () => {
        const cardTitles = document.querySelectorAll("[data-slot='card-title']")
        const texts = Array.from(cardTitles).map((el) => el.textContent ?? "")
        expect(texts.some((t) => t.includes("300.000"))).toBe(true) // Total Pagado
        expect(texts.some((t) => t.includes("100.000"))).toBe(true) // Total Reversado
        expect(texts.some((t) => t.includes("200.000"))).toBe(true) // Saldo Neto
      },
      { timeout: 3000 }
    )

    // Movimientos con su signo y razón
    expect(screen.getByText("Pago consulta 1")).toBeInTheDocument()
    expect(screen.getByText("Ajuste error cobro")).toBeInTheDocument()

    const allSpans = Array.from(document.querySelectorAll("span"))
    expect(allSpans.some((s) => s.textContent?.includes("+") && s.textContent?.includes("300.000"))).toBe(true)
    expect(allSpans.some((s) => s.textContent?.includes("-") && s.textContent?.includes("100.000"))).toBe(true)
  })

  it("3. historial vacío muestra un mensaje informativo en lugar de dar un error", async () => {
    vi.mocked(getPatientPaymentHistory).mockResolvedValue({
      success: true,
      data: { movements: [], summary: { totalPagado: 0, totalReversado: 0, saldoNeto: 0 } },
    })

    render(<PaymentHistoryView patientId={PATIENT_ID} patientName={PATIENT_NAME} />)

    await waitFor(
      () => {
        expect(
          screen.getByText(/No se han registrado transacciones financieras para este paciente/i)
        ).toBeInTheDocument()
      },
      { timeout: 3000 }
    )
  })

  it("4. un error en la Server Action muestra un banner con el error correspondiente", async () => {
    vi.mocked(getPatientPaymentHistory).mockResolvedValue({
      success: false,
      error: "Acceso denegado. Rol no calificado para leer.",
    })

    render(<PaymentHistoryView patientId={PATIENT_ID} patientName={PATIENT_NAME} />)

    await waitFor(
      () => {
        expect(screen.getByRole("alert")).toBeInTheDocument()
        expect(screen.getByText(/Acceso denegado. Rol no calificado para leer/i)).toBeInTheDocument()
      },
      { timeout: 3000 }
    )
  })
})
