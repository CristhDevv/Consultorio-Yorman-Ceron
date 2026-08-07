import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  getOdontogramByPatient,
  createOdontogramRecord,
  deleteOdontogramRecord,
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

    vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);
  });

  describe('getOdontogramByPatient', () => {
    it('should return { success: true, data } with the records on success', async () => {
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
      ];

      const mockOrder  = vi.fn().mockResolvedValue({ data: mockRecords, error: null });
      const mockEq     = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await getOdontogramByPatient('patient-abc');

      expect(result).toEqual({ success: true, data: mockRecords });
      expect(mockSupabase.from).toHaveBeenCalledWith('odontogram_records');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('patient_id', 'patient-abc');
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
    });
  });

  describe('createOdontogramRecord', () => {
    const faceInput: OdontogramRecordInput = {
      patient_id: 'patient-abc',
      tooth_number: 36,
      tooth_face: 'Oclusal',
      status: 'caries',
      notes: 'Caries profunda',
    };

    it('should return { success: true } for a face-level status', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-xyz' } } });
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({ insert: mockInsert });

      const result = await createOdontogramRecord(faceInput);

      expect(result).toEqual({ success: true });
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

    it('should return { success: false, error: "Sesión no iniciada" } when no authenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const result = await createOdontogramRecord(faceInput);

      expect(result).toEqual({ success: false, error: 'Sesión no iniciada' });
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should return { success: false, error } on Supabase insert error without throwing', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-xyz' } } });
      const mockInsert = vi.fn().mockResolvedValue({ error: { message: 'RLS violation' } });
      mockSupabase.from.mockReturnValue({ insert: mockInsert });

      const result = await createOdontogramRecord(faceInput);

      expect(result).toEqual({ success: false, error: 'RLS violation' });
    });
  });

  describe('deleteOdontogramRecord', () => {
    it('should delete the record and return success', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ delete: mockDelete });

      const result = await deleteOdontogramRecord('rec-123', 'patient-abc');

      expect(result).toEqual({ success: true });
      expect(mockSupabase.from).toHaveBeenCalledWith('odontogram_records');
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'rec-123');
      expect(revalidatePath).toHaveBeenCalledWith('/patients/patient-abc');
    });

    it('should return success false on Supabase error', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: { message: 'Database error' } });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ delete: mockDelete });

      const result = await deleteOdontogramRecord('rec-123', 'patient-abc');

      expect(result).toEqual({ success: false, error: 'Database error' });
    });
  });
});
