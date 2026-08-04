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

  it("1. renderiza los campos base (tipo, monto, motivo) y no muestra el campo reversedPaymentId inicialmente", () => {
    render(<PaymentForm appointmentId={APPOINTMENT_ID} patientId={PATIENT_ID} />)

    expect(screen.getByLabelText(/Tipo/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Monto/i)).toBeInTheDocument()
    // El label de Motivo incluye el texto "(opcional)" en un <span> hijo — buscamos por id
    expect(document.getElementById("payment-reason")).toBeInTheDocument()
    // No hay campo reversedPaymentId visible
    expect(document.getElementById("payment-reversed-id")).not.toBeInTheDocument()
  })

  it("2. el campo reversedPaymentId aparece y desaparece condicionalmente según el tipo seleccionado", async () => {
    render(<PaymentForm appointmentId={APPOINTMENT_ID} patientId={PATIENT_ID} />)

    const typeSelect = screen.getByLabelText(/Tipo/i)

    // Act - Select 'reverso'
    fireEvent.change(typeSelect, { target: { value: "reverso" } })
    await waitFor(() => {
      expect(document.getElementById("payment-reversed-id")).toBeInTheDocument()
    })

    // Act - Select 'pago' → el campo debe desaparecer
    fireEvent.change(typeSelect, { target: { value: "pago" } })
    await waitFor(() => {
      expect(document.getElementById("payment-reversed-id")).not.toBeInTheDocument()
    })
  })

  it("3. validación de cliente bloquea el envío y muestra error si los campos requeridos no cumplen las restricciones", async () => {
    render(<PaymentForm appointmentId={APPOINTMENT_ID} patientId={PATIENT_ID} />)

    const form = screen.getByRole("button", { name: /Registrar pago/i }).closest("form")!

    // Caso A: Sin tipo seleccionado
    fireEvent.submit(form)
    await waitFor(() => {
      expect(screen.getByText(/Debe seleccionar el tipo de transacción/i)).toBeInTheDocument()
    })
    expect(registerPatientPayment).not.toHaveBeenCalled()

    // Caso B: Monto = 0
    const typeSelect = screen.getByLabelText(/Tipo/i)
    fireEvent.change(typeSelect, { target: { value: "pago" } })
    const amountInput = document.getElementById("payment-amount") as HTMLInputElement
    fireEvent.change(amountInput, { target: { value: "0" } })

    fireEvent.submit(form)
    await waitFor(() => {
      expect(screen.getByText(/El monto debe ser un número positivo mayor que cero/i)).toBeInTheDocument()
    })
    expect(registerPatientPayment).not.toHaveBeenCalled()

    // Caso C: Tipo reverso sin reversedPaymentId
    fireEvent.change(typeSelect, { target: { value: "reverso" } })
    fireEvent.change(amountInput, { target: { value: "100" } })

    fireEvent.submit(form)
    await waitFor(() => {
      expect(screen.getByText(/Un reverso debe referenciar el ID del pago original/i)).toBeInTheDocument()
    })
    expect(registerPatientPayment).not.toHaveBeenCalled()
  })

  it("4. envío exitoso llama a registerPatientPayment, resetea el formulario y muestra banner de confirmación", async () => {
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

    const typeSelect = document.getElementById("payment-type") as HTMLSelectElement
    const amountInput = document.getElementById("payment-amount") as HTMLInputElement
    const reasonInput = document.getElementById("payment-reason") as HTMLInputElement

    fireEvent.change(typeSelect, { target: { value: "pago" } })
    fireEvent.change(amountInput, { target: { value: "150000" } })
    fireEvent.change(reasonInput, { target: { value: "Abono a tratamiento" } })

    const form = screen.getByRole("button", { name: /Registrar pago/i }).closest("form")!
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

    // Banner de éxito y datos (usando textContent del DOM para evitar problemas con non-breaking space)
    await waitFor(() => {
      expect(screen.getByRole("status")).toBeInTheDocument()
      expect(document.body.textContent).toContain("Pago registrado correctamente")
      expect(document.body.textContent).toContain("Carlos Gómez")
      expect(document.body.textContent).toContain("150.000")
    })

    // Formulario reseteado
    expect(typeSelect.value).toBe("")
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

    const typeSelect = document.getElementById("payment-type") as HTMLSelectElement
    const amountInput = document.getElementById("payment-amount") as HTMLInputElement
    fireEvent.change(typeSelect, { target: { value: "pago" } })
    fireEvent.change(amountInput, { target: { value: "100000" } })

    const form = screen.getByRole("button", { name: /Registrar pago/i }).closest("form")!
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

  it("6. tipo reverso carga los cobros y permite seleccionar uno para el reverso", async () => {
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

    const typeSelect = document.getElementById("payment-type") as HTMLSelectElement
    fireEvent.change(typeSelect, { target: { value: "reverso" } })

    // Se debe llamar a getAppointmentPayments
    await waitFor(() => {
      expect(getAppointmentPayments).toHaveBeenCalledWith(APPOINTMENT_ID)
    })

    // El dropdown selector debe estar presente
    const selectReversed = document.getElementById("payment-reversed-id") as HTMLSelectElement
    expect(selectReversed).toBeInTheDocument()

    // Debería tener las opciones de cobro
    // Opción vacía de default, más los 2 cobros filtrados
    await waitFor(() => {
      const options = selectReversed.querySelectorAll("option")
      expect(options.length).toBe(3) // 1 placeholder + 2 payments
      
      // La segunda opción (pay-1) debe estar habilitada
      const option1 = options[1] as HTMLOptionElement
      expect(option1.value).toBe("pay-1")
      expect(option1.disabled).toBe(false)
      expect(option1.textContent).toContain("50.000")

      // La tercera opción (pay-2) debe estar deshabilitada ("Ya revertido")
      const option2 = options[2] as HTMLOptionElement
      expect(option2.value).toBe("pay-2")
      expect(option2.disabled).toBe(true)
      expect(option2.textContent).toContain("30.000")
      expect(option2.textContent).toContain("Ya revertido")
    })

    // Seleccionamos pay-1 y enviamos
    fireEvent.change(selectReversed, { target: { value: "pay-1" } })
    const amountInput = document.getElementById("payment-amount") as HTMLInputElement
    fireEvent.change(amountInput, { target: { value: "50000" } })

    const form = screen.getByRole("button", { name: /Registrar pago/i }).closest("form")!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(registerPatientPayment).toHaveBeenCalledWith({
        appointmentId: APPOINTMENT_ID,
        patientId: PATIENT_ID,
        type: "reverso",
        amount: 50000,
        reason: undefined,
        reversedPaymentId: "pay-1",
      })
    })
  })
})
