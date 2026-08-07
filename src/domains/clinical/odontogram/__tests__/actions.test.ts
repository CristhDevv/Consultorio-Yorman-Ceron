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

    vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);
  });

  // ---------------------------------------------------------------------------
  // getOdontogramByPatient
  // ---------------------------------------------------------------------------
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

    it('should return { success: true, data: [] } when Supabase returns null data', async () => {
      const mockOrder  = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockEq     = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await getOdontogramByPatient('patient-abc');

      expect(result).toEqual({ success: true, data: [] });
    });

    it('should return { success: false, error } on Supabase error without throwing', async () => {
      const mockOrder  = vi.fn().mockResolvedValue({ data: null, error: { message: 'connection refused' } });
      const mockEq     = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await getOdontogramByPatient('patient-abc');

      expect(result).toEqual({ success: false, error: 'connection refused' });
      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // createOdontogramRecord — upsert pattern (delete-then-insert)
  // ---------------------------------------------------------------------------
  describe('createOdontogramRecord', () => {
    const faceInput: OdontogramRecordInput = {
      patient_id: 'patient-abc',
      tooth_number: 36,
      tooth_face: 'Oclusal',
      status: 'caries',
      notes: 'Caries profunda',
    };

    const generalInput: OdontogramRecordInput = {
      patient_id: 'patient-abc',
      tooth_number: 21,
      tooth_face: null,
      status: 'endodoncia',
      notes: null,
    };

    /**
     * Configura mockSupabase.from para que:
     *   - Primera llamada → cadena delete (delete + eqs)
     *   - Segunda llamada → cadena insert
     */
    function setupFromMock(insertResult: { error: null | { message: string; code?: string } }) {
      // Cadena de delete: delete().eq().eq().eq() para tooth_face no-null
      //                   delete().eq().eq().is() para tooth_face null
      const mockIs     = vi.fn().mockResolvedValue({ error: null });
      const mockEqD3   = vi.fn().mockResolvedValue({ error: null });
      const mockEqD2   = vi.fn().mockReturnValue({ eq: mockEqD3, is: mockIs });
      const mockEqD1   = vi.fn().mockReturnValue({ eq: mockEqD2 });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEqD1 });

      // Cadena de insert
      const mockInsert = vi.fn().mockResolvedValue(insertResult);

      mockSupabase.from
        .mockReturnValueOnce({ delete: mockDelete })
        .mockReturnValueOnce({ insert: mockInsert });

      return { mockDelete, mockInsert, mockIs, mockEqD1, mockEqD2, mockEqD3 };
    }

    it('should return { success: true } for a face-level status (caries, tooth_face non-null)', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-xyz' } } });
      const { mockInsert } = setupFromMock({ error: null });

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

    it('should return { success: true } for a general status (endodoncia, tooth_face null)', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-xyz' } } });
      const { mockInsert } = setupFromMock({ error: null });

      const result = await createOdontogramRecord(generalInput);

      expect(result).toEqual({ success: true });
      expect(mockInsert).toHaveBeenCalledWith({
        patient_id: 'patient-abc',
        tooth_number: 21,
        tooth_face: null,
        status: 'endodoncia',
        notes: null,
        created_by: 'user-xyz',
      });
      expect(revalidatePath).toHaveBeenCalledWith('/patients/patient-abc');
    });

    it('should delete the record and return success without inserting when status is "sano" for a face-level status', async () => {
      const inputSanoFace: OdontogramRecordInput = {
        patient_id: 'patient-abc',
        tooth_number: 36,
        tooth_face: 'Oclusal',
        status: 'sano',
        notes: null,
      };

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-xyz' } } });

      const mockEqD3   = vi.fn().mockResolvedValue({ error: null });
      const mockEqD2   = vi.fn().mockReturnValue({ eq: mockEqD3 });
      const mockEqD1   = vi.fn().mockReturnValue({ eq: mockEqD2 });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEqD1 });
      mockSupabase.from.mockReturnValue({ delete: mockDelete });

      const result = await createOdontogramRecord(inputSanoFace);

      expect(result).toEqual({ success: true });
      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
      expect(mockSupabase.from).toHaveBeenCalledWith('odontogram_records');
      expect(mockDelete).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith('/patients/patient-abc');
    });

    it('should return { success: false, error } on Supabase insert error without throwing', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-xyz' } } });
      const { mockInsert } = setupFromMock({
        error: { message: 'new row violates row-level security policy' },
      });

      const result = await createOdontogramRecord(faceInput);

      expect(result).toEqual({
        success: false,
        error: 'new row violates row-level security policy',
      });
      expect(revalidatePath).not.toHaveBeenCalled();
      expect(mockInsert).toHaveBeenCalledTimes(1);
    });

    it('should return { success: false, error: "Sesión no iniciada" } when no authenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const result = await createOdontogramRecord(faceInput);

      expect(result).toEqual({ success: false, error: 'Sesión no iniciada' });
      // No debe tocar la base de datos en absoluto
      expect(mockSupabase.from).not.toHaveBeenCalled();
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it('should assign created_by from the authenticated session, not from the input payload', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-xyz' } } });
      const { mockInsert } = setupFromMock({ error: null });

      await createOdontogramRecord(faceInput);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ created_by: 'user-xyz' })
      );
    });

    it('should normalize undefined notes to null in the insert payload', async () => {
      const inputWithoutNotes: OdontogramRecordInput = {
        patient_id: 'patient-abc',
        tooth_number: 11,
        tooth_face: null,
        status: 'sano',
      };

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-xyz' } } });
      const { mockInsert } = setupFromMock({ error: null });

      await createOdontogramRecord(inputWithoutNotes);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ notes: null })
      );
    });

    it('should call from("odontogram_records") twice: once for delete, once for insert', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-xyz' } } });
      setupFromMock({ error: null });

      await createOdontogramRecord(faceInput);

      // Primera llamada: delete; segunda llamada: insert
      expect(mockSupabase.from).toHaveBeenCalledTimes(2);
      expect(mockSupabase.from).toHaveBeenNthCalledWith(1, 'odontogram_records');
      expect(mockSupabase.from).toHaveBeenNthCalledWith(2, 'odontogram_records');
    });
  });
});
