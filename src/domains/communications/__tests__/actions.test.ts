import { vi, describe, it, expect, beforeEach } from "vitest"
import { getCommunicationLogs, getPatientsWithCommunicationLogs } from "../actions"
import { createClient } from "@/shared/lib/supabase/server"

vi.mock("@/shared/lib/supabase/server", () => ({
  createClient: vi.fn(),
}))

interface MockSupabase {
  auth: { getUser: ReturnType<typeof vi.fn> }
  from: ReturnType<typeof vi.fn>
}

describe("Communications Actions", () => {
  let mockSupabase: MockSupabase

  beforeEach(() => {
    vi.clearAllMocks()

    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-789" } },
          error: null,
        }),
      },
      from: vi.fn(),
    }

    vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>)
  })

  describe("getCommunicationLogs", () => {
    it("should fail if no active session", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error("No session"),
      })

      const result = await getCommunicationLogs()

      expect(result).toEqual({
        success: false,
        error: "No hay sesión activa. Por favor inicia sesión.",
      })
    })

    it("should fail if user role is not administrator", async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { role: "odontologo" },
        error: null,
      })
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockSupabase.from.mockReturnValue({ select: mockSelect })

      const result = await getCommunicationLogs()

      expect(result).toEqual({
        success: false,
        error: "Acceso denegado. Solo los administradores pueden consultar los logs de comunicación.",
      })
      expect(mockSupabase.from).toHaveBeenCalledWith("profiles")
    })

    it("should successfully fetch logs without filters", async () => {
      // Mock profile check
      const mockSingle = vi.fn().mockResolvedValue({
        data: { role: "administrador" },
        error: null,
      })
      
      // Mock logs query
      const mockLogs = [
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
      ]
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockLogs,
        error: null,
      })

      // Query chain mock helper
      mockSupabase.from.mockImplementation((table) => {
        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnValue({ single: mockSingle }),
          }
        }
        if (table === "communication_logs") {
          return {
            select: vi.fn().mockReturnThis(),
            order: mockOrder,
          }
        }
        return {}
      })

      const result = await getCommunicationLogs()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data[0].patients?.full_name).toBe("Juan Pérez")
      }
      expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false })
    })

    it("should apply status filter if provided", async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { role: "administrador" },
        error: null,
      })
      
      const mockEq = vi.fn().mockReturnThis()
      const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null })

      mockSupabase.from.mockImplementation((table) => {
        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnValue({ single: mockSingle }),
          }
        }
        if (table === "communication_logs") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: mockEq,
            order: mockOrder,
          }
        }
        return {}
      })

      const result = await getCommunicationLogs({ status: "failed" })

      expect(result.success).toBe(true)
      expect(mockEq).toHaveBeenCalledWith("status", "failed")
    })

    it("should apply patientId filter if provided", async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { role: "administrador" },
        error: null,
      })
      
      const mockEq = vi.fn().mockReturnThis()
      const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null })

      mockSupabase.from.mockImplementation((table) => {
        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnValue({ single: mockSingle }),
          }
        }
        if (table === "communication_logs") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: mockEq,
            order: mockOrder,
          }
        }
        return {}
      })

      const result = await getCommunicationLogs({ patientId: "pat-123" })

      expect(result.success).toBe(true)
      expect(mockEq).toHaveBeenCalledWith("patient_id", "pat-123")
    })
  })

  describe("getPatientsWithCommunicationLogs", () => {
    it("should fail if no active session", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error("No session"),
      })

      const result = await getPatientsWithCommunicationLogs()

      expect(result).toEqual({
        success: false,
        error: "No hay sesión activa. Por favor inicia sesión.",
      })
    })

    it("should fail if user is not administrator", async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { role: "odontologo" },
        error: null,
      })
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockSupabase.from.mockReturnValue({ select: mockSelect })

      const result = await getPatientsWithCommunicationLogs()

      expect(result).toEqual({
        success: false,
        error: "Acceso denegado. Solo los administradores pueden consultar pacientes con logs.",
      })
    })

    it("should return unique patients who have logs", async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { role: "administrador" },
        error: null,
      })

      const mockLogs = [
        {
          patient_id: "pat-1",
          patients: { id: "pat-1", full_name: "Juan Pérez" },
        },
        {
          patient_id: "pat-1",
          patients: { id: "pat-1", full_name: "Juan Pérez" },
        },
        {
          patient_id: "pat-2",
          patients: { id: "pat-2", full_name: "María Gómez" },
        },
      ]

      const mockSelectLogs = vi.fn().mockResolvedValue({
        data: mockLogs,
        error: null,
      })

      mockSupabase.from.mockImplementation((table) => {
        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnValue({ single: mockSingle }),
          }
        }
        if (table === "communication_logs") {
          return {
            select: mockSelectLogs,
          }
        }
        return {}
      })

      const result = await getPatientsWithCommunicationLogs()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data).toEqual([
          { id: "pat-1", full_name: "Juan Pérez" },
          { id: "pat-2", full_name: "María Gómez" },
        ])
      }
    })
  })
})
