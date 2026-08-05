import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { vi, describe, it, expect, beforeEach } from "vitest"
import "@testing-library/jest-dom/vitest"
import CommunicationLogsDashboard from "../CommunicationLogsDashboard"
import { CommunicationLogWithPatient, PatientWithLogs } from "../../actions"

describe("CommunicationLogsDashboard Component", () => {
  const mockLogs: CommunicationLogWithPatient[] = [
    {
      id: "log-1",
      appointment_id: "appt-1",
      patient_id: "pat-1",
      channel: "email",
      event_type: "confirmation",
      status: "sent",
      error_message: null,
      created_at: "2026-08-05T10:00:00Z",
      sent_at: "2026-08-05T10:01:00Z",
      patients: { full_name: "Juan Pérez" },
    },
    {
      id: "log-2",
      appointment_id: "appt-2",
      patient_id: "pat-2",
      channel: "email",
      event_type: "confirmation",
      status: "failed",
      error_message: "Invalid recipient email",
      created_at: "2026-08-05T11:00:00Z",
      sent_at: null,
      patients: { full_name: "María Gómez" },
    },
  ]

  const mockPatients: PatientWithLogs[] = [
    { id: "pat-1", full_name: "Juan Pérez" },
    { id: "pat-2", full_name: "María Gómez" },
  ]

  let onFetchLogsMock: ReturnType<typeof vi.fn>
  let onFetchPatientsMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onFetchLogsMock = vi.fn().mockResolvedValue({ success: true, data: mockLogs })
    onFetchPatientsMock = vi.fn().mockResolvedValue({ success: true, data: mockPatients })
  })

  it("should render table with sample logs and patients in filter", async () => {
    render(
      <CommunicationLogsDashboard
        onFetchLogs={onFetchLogsMock}
        onFetchPatients={onFetchPatientsMock}
      />
    )

    // Wait for data load
    await waitFor(() => {
      expect(screen.getAllByText("Juan Pérez")[0]).toBeDefined()
      expect(screen.getAllByText("María Gómez")[0]).toBeDefined()
    })

    // Verify channel and status
    expect(screen.getAllByText("email", { selector: "td" })[0]).toBeDefined()
    expect(screen.getByText("sent")).toBeDefined()
    expect(screen.getByText("failed")).toBeDefined()
    expect(screen.getByText("Invalid recipient email")).toBeDefined()

    // Verify filters populated
    const patientFilter = screen.getByLabelText("Filtrar por Paciente")
    expect(patientFilter).toHaveTextContent("Juan Pérez")
    expect(patientFilter).toHaveTextContent("María Gómez")
  })

  it("should recall onFetchLogs with correct parameters when status filter changes", async () => {
    render(
      <CommunicationLogsDashboard
        onFetchLogs={onFetchLogsMock}
        onFetchPatients={onFetchPatientsMock}
      />
    )

    await waitFor(() => {
      expect(screen.getAllByText("Juan Pérez")[0]).toBeDefined()
    })

    const statusFilter = screen.getByLabelText("Filtrar por Estado")
    fireEvent.change(statusFilter, { target: { value: "failed" } })

    await waitFor(() => {
      expect(onFetchLogsMock).toHaveBeenLastCalledWith({
        status: "failed",
        patientId: undefined,
      })
    })
  })

  it("should recall onFetchLogs with correct parameters when patient filter changes", async () => {
    render(
      <CommunicationLogsDashboard
        onFetchLogs={onFetchLogsMock}
        onFetchPatients={onFetchPatientsMock}
      />
    )

    await waitFor(() => {
      expect(screen.getAllByText("Juan Pérez")[0]).toBeDefined()
    })

    const patientFilter = screen.getByLabelText("Filtrar por Paciente")
    fireEvent.change(patientFilter, { target: { value: "pat-2" } })

    await waitFor(() => {
      expect(onFetchLogsMock).toHaveBeenLastCalledWith({
        status: undefined,
        patientId: "pat-2",
      })
    })
  })

  it("should show error message when query fails", async () => {
    onFetchLogsMock.mockResolvedValue({ success: false, error: "Database error querying logs" })

    render(
      <CommunicationLogsDashboard
        onFetchLogs={onFetchLogsMock}
        onFetchPatients={onFetchPatientsMock}
      />
    )

    await waitFor(() => {
      expect(screen.getByText("Error al cargar datos")).toBeDefined()
      expect(screen.getByText("Database error querying logs")).toBeDefined()
    })
  })
})
