import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  getOdontogramByPatient,
  createOdontogramRecord,
  type OdontogramRecordInput,
} from '../actions';
import { createClient } from '@/shared/lib/supabase/server';
import { revalidatePath } from 'next/cache';

vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

interface MockSupabase {
  auth: { getUser: ReturnType<typeof vi.fn> };
  from: ReturnType<typeof vi.fn>;
}

describe('Odontogram Actions', () => {
  let mockSupabase: MockSupabase;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(),
    };

    // Es seguro hacer cast a la firma de retorno de createClient ya que en este contexto
    // de prueba unitaria solo necesitamos y validamos los métodos mockeados ('auth' y 'from'),
    // evitando simular innecesariamente todo el cliente completo de Supabase.
    vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);
  });

  // ---------------------------------------------------------------------------
  // getOdontogramByPatient
  // ---------------------------------------------------------------------------
  describe('getOdontogramByPatient', () => {
    it('should return { success: true, data } with the records on success', async () => {
      // Arrange
      const mockRecords = [
        {
          id: 'rec-1',
          patient_id: 'patient-abc',
          tooth_number: 21,
          tooth_face: null,
          status: 'endodoncia',
          notes: null,
          created_by: 'user-xyz',
          created_at: '2026-07-09T15:00:00Z',
        },
        {
          id: 'rec-2',
          patient_id: 'patient-abc',
          tooth_number: 36,
          tooth_face: 'Oclusal',
          status: 'caries',
          notes: 'Caries profunda',
          created_by: 'user-xyz',
          created_at: '2026-07-09T14:00:00Z',
        },
      ];

      const mockOrder = vi.fn().mockResolvedValue({ data: mockRecords, error: null });
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      // Act
      const result = await getOdontogramByPatient('patient-abc');

      // Assert
      expect(result).toEqual({ success: true, data: mockRecords });
      expect(mockSupabase.from).toHaveBeenCalledWith('odontogram_records');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('patient_id', 'patient-abc');
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should return { success: true, data: [] } when Supabase returns null data', async () => {
      // Arrange — Supabase may return data: null on an empty result
      const mockOrder = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      // Act
      const result = await getOdontogramByPatient('patient-abc');

      // Assert — actions.ts normalizes null → []
      expect(result).toEqual({ success: true, data: [] });
    });

    it('should return { success: false, error } on Supabase error without throwing', async () => {
      // Arrange
      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'connection refused' },
      });
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      // Act
      const result = await getOdontogramByPatient('patient-abc');

      // Assert — the action returns the error, never throws
      expect(result).toEqual({ success: false, error: 'connection refused' });
      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // createOdontogramRecord
  // ---------------------------------------------------------------------------
  describe('createOdontogramRecord', () => {
    const baseInput: OdontogramRecordInput = {
      patient_id: 'patient-abc',
      tooth_number: 36,
      tooth_face: 'Oclusal',
      status: 'caries',
      notes: 'Caries profunda',
    };

    it('should return { success: true } for a localized status (caries, tooth_face non-null)', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-xyz' } },
      });

      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({ insert: mockInsert });

      // Act
      const result = await createOdontogramRecord(baseInput);

      // Assert
      expect(result).toEqual({ success: true });
      expect(mockSupabase.from).toHaveBeenCalledWith('odontogram_records');
      expect(mockInsert).toHaveBeenCalledWith({
        patient_id: 'patient-abc',
        tooth_number: 36,
        tooth_face: 'Oclusal',
        status: 'caries',
        notes: 'Caries profunda',
        created_by: 'user-xyz',
      });
      expect(revalidatePath).toHaveBeenCalledWith('/patients/patient-abc');
    });

    it('should return { success: true } for a general status (endodoncia, tooth_face null)', async () => {
      // Arrange
      const generalInput: OdontogramRecordInput = {
        patient_id: 'patient-abc',
        tooth_number: 21,
        tooth_face: null,
        status: 'endodoncia',
        notes: null,
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-xyz' } },
      });

      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({ insert: mockInsert });

      // Act
      const result = await createOdontogramRecord(generalInput);

      // Assert
      expect(result).toEqual({ success: true });
      expect(mockInsert).toHaveBeenCalledWith({
        patient_id: 'patient-abc',
        tooth_number: 21,
        tooth_face: null,
        status: 'endodoncia',
        notes: null,         // actions.ts: input.notes || null → null || null = null
        created_by: 'user-xyz',
      });
      expect(revalidatePath).toHaveBeenCalledWith('/patients/patient-abc');
    });

    it('should return { success: false, error } on Supabase insert error without throwing', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-xyz' } },
      });

      const mockInsert = vi.fn().mockResolvedValue({
        error: { message: 'new row violates row-level security policy' },
      });
      mockSupabase.from.mockReturnValue({ insert: mockInsert });

      // Act
      const result = await createOdontogramRecord(baseInput);

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'new row violates row-level security policy',
      });
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it('should return { success: false, error: "Sesión no iniciada" } when no authenticated user', async () => {
      // Arrange — getUser returns null user (no active session)
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      // Act
      const result = await createOdontogramRecord(baseInput);

      // Assert
      expect(result).toEqual({ success: false, error: 'Sesión no iniciada' });
      expect(mockSupabase.from).not.toHaveBeenCalled();
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it('should assign created_by from the authenticated session, not from the input payload', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-xyz' } },
      });

      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({ insert: mockInsert });

      // Act
      await createOdontogramRecord(baseInput);

      // Assert — created_by must always come from auth, never from input
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ created_by: 'user-xyz' })
      );
    });

    it('should normalize undefined notes to null in the insert payload', async () => {
      // Arrange — notes omitted from input (optional field)
      const inputWithoutNotes: OdontogramRecordInput = {
        patient_id: 'patient-abc',
        tooth_number: 11,
        tooth_face: null,
        status: 'sano',
        // notes not provided
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-xyz' } },
      });

      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({ insert: mockInsert });

      // Act
      await createOdontogramRecord(inputWithoutNotes);

      // Assert — actions.ts: input.notes || null → undefined || null = null
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ notes: null })
      );
    });

    it('should return a friendly error message when a unique violation occurs on whole-tooth states (PostgreSQL error 23505)', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-xyz' } },
      });

      const mockInsert = vi.fn().mockResolvedValue({
        error: { code: '23505', message: 'duplicate key value violates unique constraint' },
      });
      mockSupabase.from.mockReturnValue({ insert: mockInsert });

      // Act
      const result = await createOdontogramRecord(baseInput);

      // Assert
      expect(result).toEqual({
        success: false,
        error: "No es posible registrar este estado clínico. La pieza dental ya cuenta con un diagnóstico de diente completo registrado (ausente o extracción indicada), o bien el nuevo estado entra en conflicto con el registro existente de esta pieza.",
      });
      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });
});
