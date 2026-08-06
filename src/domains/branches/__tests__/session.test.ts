import { vi, describe, it, expect, beforeEach } from 'vitest';
import { getAllowedBranches, resolveActiveBranch } from '../session';
import { ALL_BRANCHES_VALUE } from '../constants';
import { createClient } from '@/shared/lib/supabase/server';

vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// Initialize the mock on next/headers using globalThis to prevent hoisting ReferenceError
vi.mock('next/headers', () => {
  const getFn = vi.fn();
  const setFn = vi.fn();
  (globalThis as any)._mockGet = getFn;
  (globalThis as any)._mockSet = setFn;
  return {
    cookies: vi.fn().mockReturnValue({
      get: getFn,
      set: setFn,
    }),
  };
});

describe('Branches Session Logic', () => {
  let mockSupabase: any;
  let mockGet: any;
  let mockSet: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGet = (globalThis as any)._mockGet;
    mockSet = (globalThis as any)._mockSet;
    mockGet.mockReset();
    mockSet.mockReset();

    mockSupabase = {
      from: vi.fn(),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
  });

  describe('getAllowedBranches', () => {
    it('should return all active branches for admin role', async () => {
      // Arrange
      const mockBranches = [
        { id: 'b1', name: 'Branch 1' },
        { id: 'b2', name: 'Branch 2' },
      ];
      const mockEq = vi.fn().mockResolvedValue({ data: mockBranches, error: null });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      // Act
      const result = await getAllowedBranches('user-admin', 'administrador');

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('branches');
      expect(mockSelect).toHaveBeenCalledWith('id, name');
      expect(mockEq).toHaveBeenCalledWith('is_active', true);
      expect(result).toEqual([
        { id: 'b1', name: 'Branch 1' },
        { id: 'b2', name: 'Branch 2' },
      ]);
    });

    it('should return only assigned active branches for odontologo role', async () => {
      // Arrange
      const mockDentistBranches = [
        { branch_id: 'b1', branches: { name: 'Branch 1', is_active: true } },
        { branch_id: 'b2', branches: { name: 'Branch 2', is_active: false } },
      ];
      const mockEq = vi.fn().mockResolvedValue({ data: mockDentistBranches, error: null });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      // Act
      const result = await getAllowedBranches('user-dentist', 'odontologo');

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('dentist_branches');
      expect(mockSelect).toHaveBeenCalledWith('branch_id, branches(name, is_active)');
      expect(mockEq).toHaveBeenCalledWith('dentist_id', 'user-dentist');
      expect(result).toEqual([
        { id: 'b1', name: 'Branch 1' },
      ]);
    });

    it('should return empty list for other roles', async () => {
      // Act
      const result = await getAllowedBranches('user-patient', 'paciente');

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('resolveActiveBranch', () => {
    it('should resolve and keep ALL_BRANCHES_VALUE for administrator', async () => {
      // Arrange
      const mockBranches = [
        { id: 'b1', name: 'Branch 1' },
      ];
      const mockEq = vi.fn().mockResolvedValue({ data: mockBranches, error: null });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      mockGet.mockReturnValue({ value: ALL_BRANCHES_VALUE });

      // Act
      const result = await resolveActiveBranch('user-admin', 'administrador');

      // Assert
      expect(result).toEqual({
        status: 'success',
        activeBranchId: ALL_BRANCHES_VALUE,
        shouldSync: false,
      });
    });

    it('should fallback and mark shouldSync=true if cookie is missing', async () => {
      // Arrange
      const mockBranches = [
        { id: 'b1', name: 'Branch 1' },
      ];
      const mockEq = vi.fn().mockResolvedValue({ data: mockBranches, error: null });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      mockGet.mockReturnValue(undefined);

      // Act
      const result = await resolveActiveBranch('user-admin', 'administrador');

      // Assert
      expect(result).toEqual({
        status: 'success',
        activeBranchId: 'b1',
        shouldSync: true,
      });
    });

    it('should fallback if cookie holds branch the user has no access to', async () => {
      // Arrange
      const mockDentistBranches = [
        { branch_id: 'b1', branches: { name: 'Branch 1', is_active: true } },
      ];
      const mockEq = vi.fn().mockResolvedValue({ data: mockDentistBranches, error: null });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      // Cookie says b2, but user only has access to b1
      mockGet.mockReturnValue({ value: 'b2' });

      // Act
      const result = await resolveActiveBranch('user-dentist', 'odontologo');

      // Assert
      expect(result).toEqual({
        status: 'success',
        activeBranchId: 'b1',
        shouldSync: true,
      });
    });

    it('should return no_branch if user has no branches assigned', async () => {
      // Arrange
      const mockEq = vi.fn().mockResolvedValue({ data: [], error: null });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      mockGet.mockReturnValue(undefined);

      // Act
      const result = await resolveActiveBranch('user-dentist', 'odontologo');

      // Assert
      expect(result).toEqual({
        status: 'no_branch',
        activeBranchId: null,
        shouldSync: false,
      });
    });

    it('should ignore ALL_BRANCHES_VALUE for odontologo role and fallback', async () => {
      // Arrange
      const mockDentistBranches = [
        { branch_id: 'b1', branches: { name: 'Branch 1', is_active: true } },
      ];
      const mockEq = vi.fn().mockResolvedValue({ data: mockDentistBranches, error: null });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      mockGet.mockReturnValue({ value: ALL_BRANCHES_VALUE });

      // Act
      const result = await resolveActiveBranch('user-dentist', 'odontologo');

      // Assert
      expect(result).toEqual({
        status: 'success',
        activeBranchId: 'b1',
        shouldSync: true,
      });
    });
  });
});
