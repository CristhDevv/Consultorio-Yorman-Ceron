import { vi, describe, it, expect, beforeEach } from "vitest"
import {
  getStaffMembers,
  createStaffMember,
  demoteStaffMember,
  changeStaffRole,
  getActiveBranches,
  updateDentistBranches
} from "../actions"
import { createClient } from "@/shared/lib/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

vi.mock("@/shared/lib/supabase/server", () => ({
  createClient: vi.fn(),
}))

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

vi.mock("@/domains/branches/session", () => ({
  resolveActiveBranch: vi.fn().mockResolvedValue({ activeBranchId: "all" }),
}))

interface MockSupabase {
  auth: { getUser: ReturnType<typeof vi.fn> }
  from: ReturnType<typeof vi.fn>
}

const ADMIN_USER = { id: "admin-uuid-001" }

describe("Staff Actions", () => {
  let mockSupabase: MockSupabase

  beforeEach(() => {
    vi.clearAllMocks()

    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: ADMIN_USER },
          error: null,
        }),
      },
      from: vi.fn(),
    }

    vi.mocked(createClient).mockResolvedValue(
      mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>
    )
  })

  describe("getStaffMembers", () => {
    it("debe obtener el personal exitosamente si es administrador", async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { role: "administrador" },
        error: null,
      })

      const mockProfiles = [
        { id: "staff-1", full_name: "Dr. Alejandro", role: "odontologo", phone: "123" },
      ]

      const mockIn = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: mockProfiles, error: null }),
      })

      mockSupabase.from.mockImplementation((tableName: string) => {
        if (tableName === "profiles") {
          return {
            select: vi.fn().mockImplementation((cols) => {
              if (cols === "role") {
                return {
                  eq: vi.fn().mockReturnValue({ single: mockSingle }),
                }
              }
              return {
                in: mockIn,
              }
            }),
          }
        }
        return {}
      })

      const result = await getStaffMembers()

      expect(result).toEqual(mockProfiles)
    })

    it("debe fallar si el usuario no es administrador", async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { role: "odontologo" },
        error: null,
      })

      mockSupabase.from.mockImplementation((tableName: string) => {
        if (tableName === "profiles") {
          return {
            select: () => ({
              eq: () => ({
                single: mockSingle,
              }),
            }),
          }
        }
        return {}
      })

      await expect(getStaffMembers()).rejects.toThrow("Acceso denegado. Solo administradores pueden listar personal.")
    })
  })

  describe("createStaffMember", () => {
    it("debe registrar un odontologo exitosamente si el correo no esta duplicado", async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { role: "administrador" },
        error: null,
      })

      mockSupabase.from.mockImplementation((tableName: string) => {
        if (tableName === "profiles") {
          return {
            select: () => ({
              eq: () => ({
                single: mockSingle,
              }),
            }),
            update: () => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        return {}
      })

      const mockSignUp = vi.fn().mockResolvedValue({
        data: {
          user: {
            id: "new-staff-id",
            identities: [{ id: "identity-1" }],
          },
        },
        error: null,
      })

      vi.mocked(createSupabaseClient).mockReturnValue({
        auth: { signUp: mockSignUp },
      } as unknown as ReturnType<typeof createSupabaseClient>)

      const result = await createStaffMember({
        fullName: "Dr. Alejandro Díaz",
        email: "alejandro@correo.com",
        role: "odontologo",
        phone: "3001234567",
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe("new-staff-id")
        expect(result.data.full_name).toBe("Dr. Alejandro Díaz")
      }
      expect(mockSignUp).toHaveBeenCalledWith({
        email: "alejandro@correo.com",
        password: "StaffPassword123!",
        options: {
          data: {
            full_name: "Dr. Alejandro Díaz",
            role: "odontologo",
          },
        },
      })
      expect(revalidatePath).toHaveBeenCalledWith("/staff")
    })

    it("debe fallar si el correo ya esta registrado en el sistema", async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { role: "administrador" },
        error: null,
      })

      mockSupabase.from.mockImplementation((tableName: string) => {
        if (tableName === "profiles") {
          return {
            select: () => ({
              eq: () => ({
                single: mockSingle,
              }),
            }),
          }
        }
        return {}
      })

      const mockSignUp = vi.fn().mockResolvedValue({
        data: {
          user: {
            id: "existing-id",
            identities: [], // Empty identities array = duplicate email
          },
        },
        error: null,
      })

      vi.mocked(createSupabaseClient).mockReturnValue({
        auth: { signUp: mockSignUp },
      } as unknown as ReturnType<typeof createSupabaseClient>)

      const result = await createStaffMember({
        fullName: "Dr. Alejandro Díaz",
        email: "alejandro@correo.com",
        role: "odontologo",
      })

      expect(result).toEqual({
        success: false,
        error: "El correo electrónico ya está registrado en el sistema.",
      })
    })
  })

  describe("demoteStaffMember", () => {
    it("debe degradar a un miembro del personal exitosamente", async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { role: "administrador" },
        error: null,
      })

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      mockSupabase.from.mockImplementation((tableName: string) => {
        if (tableName === "profiles") {
          return {
            select: () => ({
              eq: () => ({
                single: mockSingle,
              }),
            }),
            update: mockUpdate,
          }
        }
        return {}
      })

      const result = await demoteStaffMember("other-staff-id")

      expect(result.success).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ role: "paciente" })
      )
      expect(revalidatePath).toHaveBeenCalledWith("/staff")
    })

    it("debe impedir que el administrador se degrade a sí mismo", async () => {
      const result = await demoteStaffMember(ADMIN_USER.id)

      expect(result).toEqual({
        success: false,
        error: "No puedes degradar tu propia cuenta administradora.",
      })
    })
  })

  describe("changeStaffRole", () => {
    it("debe cambiar el rol del personal exitosamente", async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { role: "administrador" },
        error: null,
      })

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      mockSupabase.from.mockImplementation((tableName: string) => {
        if (tableName === "profiles") {
          return {
            select: () => ({
              eq: () => ({
                single: mockSingle,
              }),
            }),
            update: mockUpdate,
          }
        }
        return {}
      })

      const result = await changeStaffRole("other-staff-id", "administrador")

      expect(result.success).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ role: "administrador" })
      )
      expect(revalidatePath).toHaveBeenCalledWith("/staff")
    })
  })

  describe("getActiveBranches", () => {
    it("debe retornar listado de sucursales activas", async () => {
      const mockBranches = [{ id: "b-1", name: "Timbio" }]
      const mockOrder = vi.fn().mockResolvedValue({ data: mockBranches, error: null })
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })

      mockSupabase.from.mockImplementation((tableName) => {
        if (tableName === "branches") {
          return { select: mockSelect }
        }
        return {}
      })

      const result = await getActiveBranches()
      expect(result).toEqual(mockBranches)
    })
  })

  describe("updateDentistBranches", () => {
    it("debe actualizar las sucursales asociadas exitosamente", async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { role: "administrador" },
        error: null,
      })

      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      })

      const mockInsert = vi.fn().mockResolvedValue({ error: null })

      mockSupabase.from.mockImplementation((tableName) => {
        if (tableName === "profiles") {
          return {
            select: () => ({
              eq: () => ({ single: mockSingle })
            })
          }
        }
        if (tableName === "dentist_branches") {
          return {
            delete: mockDelete,
            insert: mockInsert
          }
        }
        return {}
      })

      const result = await updateDentistBranches("dentist-id", ["branch-1", "branch-2"])
      expect(result.success).toBe(true)
      expect(mockDelete).toHaveBeenCalled()
      expect(mockInsert).toHaveBeenCalledWith([
        { dentist_id: "dentist-id", branch_id: "branch-1" },
        { dentist_id: "dentist-id", branch_id: "branch-2" }
      ])
      expect(revalidatePath).toHaveBeenCalledWith("/staff")
    })
  })
})
