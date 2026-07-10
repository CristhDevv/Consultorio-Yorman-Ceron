import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import InventoryPage from '../page'
import { createClient } from '@/shared/lib/supabase/server'
import { getInventoryProducts } from '@/domains/inventory/actions'
import { redirect } from 'next/navigation'

// Mock next/navigation redirect
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

// Mock Supabase Server Client
vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Mock Inventory Actions
vi.mock('@/domains/inventory/actions', () => ({
  getInventoryProducts: vi.fn(),
}))

interface MockSupabase {
  auth: { getUser: ReturnType<typeof vi.fn> };
  from: ReturnType<typeof vi.fn>;
}

describe('InventoryPage Integration Tests', () => {
  let mockSupabase: MockSupabase

  beforeEach(() => {
    vi.clearAllMocks()

    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(),
    }

    vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>)
  })

  it('1. should allow access to administrators and display the inventory catalog', async () => {
    // Arrange
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'admin-user-id', email: 'admin@yormanceron.com' } },
    })

    const mockSingle = vi.fn().mockResolvedValue({
      data: { role: 'administrador' },
      error: null,
    })
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    mockSupabase.from.mockReturnValue({ select: mockSelect })

    const mockProducts = [
      {
        id: 'p1',
        name: 'Guantes de Látex',
        unit: 'Caja x 100',
        current_stock: 50,
        min_stock: 10,
        created_by: 'admin-user-id',
        created_at: '2026-07-10T00:00:00Z',
        updated_at: '2026-07-10T00:00:00Z',
      },
      {
        id: 'p2',
        name: 'Resina Dental A2',
        unit: 'Jeringa 4g',
        current_stock: 2,
        min_stock: 5,
        created_by: 'admin-user-id',
        created_at: '2026-07-10T00:00:00Z',
        updated_at: '2026-07-10T00:00:00Z',
      },
    ]
    vi.mocked(getInventoryProducts).mockResolvedValue(mockProducts)

    // Act
    const pageComponent = await InventoryPage()
    render(pageComponent)

    // Assert
    expect(redirect).not.toHaveBeenCalled()
    expect(screen.getByText('Inventario')).toBeInTheDocument()
    expect(screen.getByText('Guantes de Látex')).toBeInTheDocument()
    expect(screen.getByText('Resina Dental A2')).toBeInTheDocument()

    // Assert stock status visual indicator
    expect(screen.getByText('Normal')).toBeInTheDocument()
    expect(screen.getByText('Bajo Stock')).toBeInTheDocument()
  })

  it('2. should redirect non-administrator users to the dashboard home page', async () => {
    // Arrange
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'dentist-user-id', email: 'dentist@yormanceron.com' } },
    })

    const mockSingle = vi.fn().mockResolvedValue({
      data: { role: 'odontologo' },
      error: null,
    })
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    mockSupabase.from.mockReturnValue({ select: mockSelect })

    // Act
    const pageComponent = await InventoryPage()
    render(pageComponent)

    // Assert
    expect(redirect).toHaveBeenCalledWith('/')
  })
})
