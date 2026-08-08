import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { vi, describe, it, expect, beforeEach } from "vitest"
import "@testing-library/jest-dom/vitest"
import PaymentForm from "../PaymentForm"
import { registerPatientPayment, getAppointmentPayments } from "../../actions"

// Setup actions mocks
vi.mock("../../actions", () => ({
  registerPatientPayment: vi.fn(),
  getAppointmentPayments: vi.fn(),
}))

describe("PaymentForm Component", () => {
  const APPOINTMENT_ID = "appt-uuid-123"
  const PATIENT_ID = "pat-uuid-456"

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAppointmentPayments).mockResolvedValue({
      success: true,
      data: [],
    })
  })

  it("1. renderiza los elementos base del POS (toggles, input monto digital, motivo) y no muestra el área de reverso inicialmente", () => {
    render(<PaymentForm appointmentId={APPOINTMENT_ID} patientId={PATIENT_ID} />)

    expect(screen.getByText(/REGISTRAR PAGO/i)).toBeInTheDocument()
    expect(screen.getByText(/REGISTRAR REVERSO/i)).toBeInTheDocument()
    expect(document.getElementById("payment-amount")).toBeInTheDocument()
    expect(document.getElementById("payment-reason")).toBeInTheDocument()
    
    // No debe haber textos de reverso inicialmente
    expect(screen.queryByText(/Seleccionar Pago a Reversar/i)).not.toBeInTheDocument()
  })

  it("2. el área de reverso aparece y desaparece condicionalmente según el toggle activo", async () => {
    render(<PaymentForm appointmentId={APPOINTMENT_ID} patientId={PATIENT_ID} />)

    const reversoButton = screen.getByText(/REGISTRAR REVERSO/i)
    const pagoButton = screen.getByText(/REGISTRAR PAGO/i)

    // Act - Click Registrar Reverso
    fireEvent.click(reversoButton)
    await waitFor(() => {
      expect(screen.getByText(/Seleccionar Pago a Reversar/i)).toBeInTheDocument()
    })

    // Act - Click Registrar Pago → debe ocultarse
    fireEvent.click(pagoButton)
    await waitFor(() => {
      expect(screen.queryByText(/Seleccionar Pago a Reversar/i)).not.toBeInTheDocument()
    })
  })

  it("3. validación de cliente bloquea el envío si el monto es 0 o si falta el pago a revertir en reverso", async () => {
    render(<PaymentForm appointmentId={APPOINTMENT_ID} patientId={PATIENT_ID} />)

    const submitButton = screen.getByRole("button", { name: /EFECTUAR COBRO/i })
    const form = submitButton.closest("form")!

    // Caso A: Monto = 0 por defecto
    fireEvent.submit(form)
    await waitFor(() => {
      expect(screen.getByText(/El monto debe ser un número positivo mayor que cero/i)).toBeInTheDocument()
    })
    expect(registerPatientPayment).not.toHaveBeenCalled()

    // Caso B: Tipo reverso sin seleccionar pago original
    const reversoButton = screen.getByText(/REGISTRAR REVERSO/i)
    fireEvent.click(reversoButton)
    
    const amountInput = document.getElementById("payment-amount") as HTMLInputElement
    fireEvent.change(amountInput, { target: { value: "100" } })

    const reversoSubmitButton = screen.getByRole("button", { name: /EFECTUAR REVERSO/i })
    fireEvent.submit(form)
    
    await waitFor(() => {
      expect(screen.getByText(/Un reverso debe referenciar el cobro original/i)).toBeInTheDocument()
    })
    expect(registerPatientPayment).not.toHaveBeenCalled()
  })

  it("4. envío exitoso llama a registerPatientPayment, limpia campos y muestra banner de confirmación", async () => {
    const mockSuccessResponse = {
      success: true,
      data: {
        paymentId: "pay-new-uuid",
        patientName: "Carlos Gómez",
        appointmentDate: "2026-07-16T12:00:00Z",
        type: "pago" as const,
        amount: 150000,
      },
    }
    vi.mocked(registerPatientPayment).mockResolvedValue(mockSuccessResponse)

    render(<PaymentForm appointmentId={APPOINTMENT_ID} patientId={PATIENT_ID} />)

    const amountInput = document.getElementById("payment-amount") as HTMLInputElement
    const reasonInput = document.getElementById("payment-reason") as HTMLInputElement

    fireEvent.change(amountInput, { target: { value: "150000" } })
    fireEvent.change(reasonInput, { target: { value: "Abono a tratamiento" } })

    const submitButton = screen.getByRole("button", { name: /EFECTUAR COBRO/i })
    const form = submitButton.closest("form")!
    fireEvent.submit(form)

    // Verifica llamada a Server Action
    await waitFor(() => {
      expect(registerPatientPayment).toHaveBeenCalledWith({
        appointmentId: APPOINTMENT_ID,
        patientId: PATIENT_ID,
        type: "pago",
        amount: 150000,
        reason: "Abono a tratamiento",
        reversedPaymentId: null,
      })
    })

    // Banner de éxito y datos
    await waitFor(() => {
      expect(screen.getByRole("status")).toBeInTheDocument()
      expect(document.body.textContent).toContain("Transacción Registrada con Éxito")
      expect(document.body.textContent).toContain("Carlos Gómez")
      expect(document.body.textContent).toContain("150.000")
    })

    // Formulario reseteado
    expect(amountInput.value).toBe("")
    expect(reasonInput.value).toBe("")
  })

  it("5. envío fallido por saldo insuficiente muestra banner de error exponiendo el availableBalance", async () => {
    const mockErrorResponse = {
      success: false,
      error: "El monto del pago excede el saldo pendiente disponible.",
      availableBalance: 80000,
    }
    vi.mocked(registerPatientPayment).mockResolvedValue(mockErrorResponse)

    render(<PaymentForm appointmentId={APPOINTMENT_ID} patientId={PATIENT_ID} />)

    const amountInput = document.getElementById("payment-amount") as HTMLInputElement
    fireEvent.change(amountInput, { target: { value: "100000" } })

    const submitButton = screen.getByRole("button", { name: /EFECTUAR COBRO/i })
    const form = submitButton.closest("form")!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(registerPatientPayment).toHaveBeenCalledOnce()
    })

    // Banner de error con saldo disponible
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument()
      expect(document.body.textContent).toContain("El monto del pago excede el saldo pendiente disponible")
      expect(document.body.textContent).toContain("80.000")
    })
  })

  it("6. tipo reverso carga los cobros y permite seleccionar uno haciendo click", async () => {
    const mockPayments = [
      {
        id: "pay-1",
        amount: 50000,
        createdAt: "2026-07-26T12:00:00Z",
        type: "pago" as const,
        isReversed: false,
      },
      {
        id: "pay-2",
        amount: 30000,
        createdAt: "2026-07-26T13:00:00Z",
        type: "pago" as const,
        isReversed: true,
      },
    ]

    vi.mocked(getAppointmentPayments).mockResolvedValue({
      success: true,
      data: mockPayments,
    })

    const mockSuccessResponse = {
      success: true,
      data: {
        paymentId: "pay-new-reverso-uuid",
        patientName: "Carlos Gómez",
        appointmentDate: "2026-07-16T12:00:00Z",
        type: "reverso" as const,
        amount: 50000,
      },
    }
    vi.mocked(registerPatientPayment).mockResolvedValue(mockSuccessResponse)

    render(<PaymentForm appointmentId={APPOINTMENT_ID} patientId={PATIENT_ID} />)

    const reversoButton = screen.getByText(/REGISTRAR REVERSO/i)
    fireEvent.click(reversoButton)

    // Se debe llamar a getAppointmentPayments
    await waitFor(() => {
      expect(getAppointmentPayments).toHaveBeenCalledWith(APPOINTMENT_ID)
    })

    // Deberían listarse los cobros activos no revertidos
    await waitFor(() => {
      // El cobro 'pay-1' no está revertido, debería ser visible
      expect(screen.getByText(/50\.000/)).toBeInTheDocument()
      // El cobro 'pay-2' ya está revertido, no debería ofrecerse para reversión
      expect(screen.queryByText(/30\.000/)).not.toBeInTheDocument()
    })

    // Hacer click en el cobro a revertir
    const selectButton = screen.getByRole("button", { name: /Clic para Reversar/i })
    fireEvent.click(selectButton)

    // Al hacer click, el monto debe autocompletarse en 50000 y el motivo debe sugerirse
    const amountInput = document.getElementById("payment-amount") as HTMLInputElement
    const reasonInput = document.getElementById("payment-reason") as HTMLInputElement
    expect(amountInput.value).toBe("50000")
    expect(reasonInput.value).toContain("Reverso del cobro por")

    const submitButton = screen.getByRole("button", { name: /EFECTUAR REVERSO/i })
    const form = submitButton.closest("form")!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(registerPatientPayment).toHaveBeenCalledWith({
        appointmentId: APPOINTMENT_ID,
        patientId: PATIENT_ID,
        type: "reverso",
        amount: 50000,
        reason: reasonInput.value,
        reversedPaymentId: "pay-1",
      })
    })
  })
})
