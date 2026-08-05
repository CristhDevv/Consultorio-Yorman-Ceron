import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { sendConfirmationEmail } from "../email"

// Mock Resend SDK
const mockSend = vi.fn()
vi.mock("resend", () => {
  return {
    Resend: class {
      emails = {
        send: mockSend,
      }
    },
  }
})

describe("sendConfirmationEmail", () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("1. should fail if RESEND_API_KEY is not defined", async () => {
    delete process.env.RESEND_API_KEY

    const result = await sendConfirmationEmail({
      to: "patient@example.com",
      patientName: "John Doe",
      appointmentDate: "2026-08-10",
      appointmentTime: "10:00",
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain("RESEND_API_KEY variable is missing or empty")
  })

  it("2. should fail if recipient is empty", async () => {
    process.env.RESEND_API_KEY = "test_key"

    const result = await sendConfirmationEmail({
      to: "",
      patientName: "John Doe",
      appointmentDate: "2026-08-10",
      appointmentTime: "10:00",
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain("Destinatario no especificado")
  })

  it("3. should successfully send email when SDK returns success", async () => {
    process.env.RESEND_API_KEY = "re_test_key_12345"
    mockSend.mockResolvedValue({
      data: { id: "msg_123abc" },
      error: null,
    })

    const result = await sendConfirmationEmail({
      to: "patient@example.com",
      patientName: "Juan Pérez",
      appointmentDate: "15 de Octubre de 2026",
      appointmentTime: "15:30",
      dentistName: "Dr. Yorman Cerón",
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.messageId).toBe("msg_123abc")
    }

    expect(mockSend).toHaveBeenCalledWith({
      from: "onboarding@resend.dev",
      to: ["patient@example.com"],
      subject: "Confirmación de Cita - Consultorio Yorman Cerón",
      html: expect.stringContaining("¡Hola, Juan Pérez!"),
    })
  })

  it("4. should return error if Resend SDK returns an error", async () => {
    process.env.RESEND_API_KEY = "re_test_key_12345"
    mockSend.mockResolvedValue({
      data: null,
      error: { message: "Invalid API key" },
    })

    const result = await sendConfirmationEmail({
      to: "patient@example.com",
      patientName: "Juan Pérez",
      appointmentDate: "15 de Octubre de 2026",
      appointmentTime: "15:30",
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe("Invalid API key")
    }
  })

  it("5. should handle exceptions thrown during sending", async () => {
    process.env.RESEND_API_KEY = "re_test_key_12345"
    mockSend.mockRejectedValue(new Error("Network Timeout"))

    const result = await sendConfirmationEmail({
      to: "patient@example.com",
      patientName: "Juan Pérez",
      appointmentDate: "15 de Octubre de 2026",
      appointmentTime: "15:30",
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain("Network Timeout")
    }
  })
})
