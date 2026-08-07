import { vi, describe, it, expect, beforeEach } from 'vitest';
import { getFinancialReport } from '../actions';
import { createClient } from '@/shared/lib/supabase/server';
import { getCurrentUserWithRole } from '@/shared/lib/supabase/auth';
import { resolveActiveBranch } from '@/domains/branches/session';

vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/shared/lib/supabase/auth', () => ({
  getCurrentUserWithRole: vi.fn(),
}));

vi.mock('@/domains/branches/session', () => ({
  resolveActiveBranch: vi.fn(),
}));

describe('getFinancialReport Server Action', () => {
  let mockSupabase: {
    rpc: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      rpc: vi.fn(),
    };

    vi.mocked(createClient).mockResolvedValue(
      mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>
    );

    // Default to authenticated administrator
    vi.mocked(getCurrentUserWithRole).mockResolvedValue({
      user: { id: 'admin-user-id' } as never,
      profile: { role: 'administrador' } as never,
      role: 'administrador',
    });

    vi.mocked(resolveActiveBranch).mockResolvedValue({
      status: 'success',
      activeBranchId: 'ALL_BRANCHES',
      shouldSync: false,
    });
  });

  it('1. should return error if session is not active', async () => {
    vi.mocked(getCurrentUserWithRole).mockResolvedValue({
      user: null,
      profile: null,
      role: null,
    });

    const result = await getFinancialReport('2026-07-01', '2026-07-31');

    expect(result).toEqual({
      success: false,
      error: 'No hay sesión activa. Por favor inicia sesión.',
    });
    expect(mockSupabase.rpc).not.toHaveBeenCalled();
  });

  it('2. should succeed and return data when RPC call is successful', async () => {
    const mockReportData = {
      totales: { total_pagado: 1000, total_reversado: 200, neto: 800 },
      por_odontologo: [
        { dentist_id: 'dentist-1', dentist_name: 'Dr. Ceron', total_pagado: 1000, total_reversado: 200, neto: 800 },
      ],
      por_tipo_cita: [
        { appointment_reason: 'limpieza', total_pagado: 1000, total_reversado: 200, neto: 800 },
      ],
    };

    mockSupabase.rpc.mockResolvedValue({
      data: mockReportData,
      error: null,
    });

    const result = await getFinancialReport('2026-07-01', '2026-07-31');

    expect(result).toEqual({
      success: true,
      data: mockReportData,
    });
    expect(mockSupabase.rpc).toHaveBeenCalledWith('get_financial_report', {
      p_date_from: '2026-07-01',
      p_date_to: '2026-07-31',
      p_branch_id: 'ALL_BRANCHES',
    });
  });

  it('3. should return success with empty array placeholders when range has no data', async () => {
    const mockEmptyData = {
      totales: { total_pagado: 0, total_reversado: 0, neto: 0 },
      por_odontologo: [],
      por_tipo_cita: [],
    };

    mockSupabase.rpc.mockResolvedValue({
      data: mockEmptyData,
      error: null,
    });

    const result = await getFinancialReport('2026-07-01', '2026-07-02');

    expect(result).toEqual({
      success: true,
      data: mockEmptyData,
    });
  });

  it('4. should map and return access denied error when RPC throws permissions error', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: null,
      error: { message: 'Acceso denegado. Solo los administradores pueden consultar reportes financieros.' },
    });

    const result = await getFinancialReport('2026-07-01', '2026-07-31');

    expect(result).toEqual({
      success: false,
      error: 'Acceso denegado. Solo los administradores pueden consultar reportes financieros.',
    });
  });

  it('5. should propagate other RPC errors directly', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: null,
      error: { message: 'Some database connection failure' },
    });

    const result = await getFinancialReport('2026-07-01', '2026-07-31');

    expect(result).toEqual({
      success: false,
      error: 'Some database connection failure',
    });
  });
});
