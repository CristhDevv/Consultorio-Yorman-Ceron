import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { vi, describe, it, expect, beforeEach } from "vitest"
import "@testing-library/jest-dom/vitest"
import FinanceDashboard from "../FinanceDashboard"
import { getPatientPaymentHistory } from "../../actions"

// Setup actions mocks
vi.mock("../../actions", () => ({
  getPatientPaymentHistory: vi.fn(),
}))

describe("FinanceDashboard Component", () => {
  const mockPatients = [
    { id: "pat-1", full_name: "Arturo Prat", document_id: "11111111" },
    { id: "pat-2", full_name: "Bernardo O'Higgins", document_id: "22222222" },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("1. sin paciente seleccionado muestra el mensaje de placeholder inicial", () => {
    render(<FinanceDashboard patients={mockPatients} initialTab="pacientes" />)

    expect(
      screen.getByText(/Selecciona un paciente a la izquierda para ver su historial de transacciones/i)
    ).toBeInTheDocument()
  })

  it("2. escribir en el buscador filtra y muestra hasta 5 resultados coincidentes por nombre o documento", () => {
    render(<FinanceDashboard patients={mockPatients} initialTab="pacientes" />)

    const searchInput = screen.getByPlaceholderText(/Nombre o número de documento/i)

    // Buscar por nombre
    fireEvent.change(searchInput, { target: { value: "Artur" } })
    expect(screen.getByText("Arturo Prat")).toBeInTheDocument()
    expect(screen.queryByText("Bernardo O'Higgins")).not.toBeInTheDocument()

    // Buscar por cédula
    fireEvent.change(searchInput, { target: { value: "2222" } })
    expect(screen.getByText("Bernardo O'Higgins")).toBeInTheDocument()
    expect(screen.queryByText("Arturo Prat")).not.toBeInTheDocument()
  })

  it("3. seleccionar un paciente lo fija, oculta el buscador y muestra su tarjeta resumen con botón Cambiar", async () => {
    vi.mocked(getPatientPaymentHistory).mockResolvedValue({
      success: true,
      data: {
        movements: [],
        summary: { totalPagado: 0, totalReversado: 0, saldoNeto: 0 },
      },
    })

    render(<FinanceDashboard patients={mockPatients} initialTab="pacientes" />)

    const searchInput = screen.getByPlaceholderText(/Nombre o número de documento/i)
    fireEvent.change(searchInput, { target: { value: "Arturo" } })
    fireEvent.click(screen.getByText("Arturo Prat"))

    // Buscador oculto, tarjeta visible con Cambiar
    expect(screen.queryByPlaceholderText(/Nombre o número de documento/i)).not.toBeInTheDocument()
    expect(screen.getByText("Doc: 11111111")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Cambiar/i })).toBeInTheDocument()

    // Click en Cambiar → vuelve el buscador
    fireEvent.click(screen.getByRole("button", { name: /Cambiar/i }))
    expect(screen.getByPlaceholderText(/Nombre o número de documento/i)).toBeInTheDocument()
  })

  it("4. al cambiar de paciente, los datos residuales del primer paciente desaparecen del DOM inmediatamente durante el estado de carga", async () => {
    type HistoryResult = Awaited<ReturnType<typeof getPatientPaymentHistory>>
    type Resolver = (val: HistoryResult | PromiseLike<HistoryResult>) => void

    let resolveFirstQuery: Resolver = () => {}
    let resolveSecondQuery: Resolver = () => {}

    const firstPromise = new Promise((resolve) => { resolveFirstQuery = resolve })
    const secondPromise = new Promise((resolve) => { resolveSecondQuery = resolve })

    vi.mocked(getPatientPaymentHistory)
      .mockImplementationOnce(() => firstPromise)
      .mockImplementationOnce(() => secondPromise)

    render(<FinanceDashboard patients={mockPatients} initialTab="pacientes" />)

    // --- PASO A: Seleccionar el primer paciente ---
    const searchInput = screen.getByPlaceholderText(/Nombre o número de documento/i)
    fireEvent.change(searchInput, { target: { value: "Arturo" } })
    fireEvent.click(screen.getByText("Arturo Prat"))

    // Resolver con saldo de 200.000
    resolveFirstQuery({
      success: true,
      data: {
        movements: [],
        summary: { totalPagado: 200000, totalReversado: 0, saldoNeto: 200000 },
      },
    })

    // Esperar a que los datos del primer paciente aparezcan en algún card-title
    await waitFor(
      () => {
        const titles = Array.from(document.querySelectorAll("[data-slot='card-title']"))
        expect(titles.some((el) => el.textContent?.includes("200.000"))).toBe(true)
      },
      { timeout: 3000 }
    )

    // --- PASO B: Cambiar al segundo paciente ---
    fireEvent.click(screen.getByRole("button", { name: /Cambiar/i }))

    const newSearchInput = screen.getByPlaceholderText(/Nombre o número de documento/i)
    fireEvent.change(newSearchInput, { target: { value: "Bernardo" } })
    fireEvent.click(screen.getByText("Bernardo O'Higgins"))

    // ASERCIÓN DEL INSTANTE INTERMEDIO (segunda promesa aún sin resolver):
    // 1. Estado de carga del segundo paciente visible
    expect(screen.getByText(/Cargando información financiera de Bernardo O'Higgins/i)).toBeInTheDocument()
    // 2. Datos del primer paciente ya NO deben estar en el DOM (residualidad)
    const titlesAfterSwitch = Array.from(document.querySelectorAll("[data-slot='card-title']"))
    expect(titlesAfterSwitch.some((el) => el.textContent?.includes("200.000"))).toBe(false)

    // --- PASO C: Resolver la segunda promesa ---
    resolveSecondQuery({
      success: true,
      data: {
        movements: [],
        summary: { totalPagado: 500000, totalReversado: 0, saldoNeto: 500000 },
      },
    })

    await waitFor(
      () => {
        const titles = Array.from(document.querySelectorAll("[data-slot='card-title']"))
        expect(titles.some((el) => el.textContent?.includes("500.000"))).toBe(true)
        expect(screen.queryByText(/Cargando información/i)).not.toBeInTheDocument()
      },
      { timeout: 3000 }
    )
  })
})
