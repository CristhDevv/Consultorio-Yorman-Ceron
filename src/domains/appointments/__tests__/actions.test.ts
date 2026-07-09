import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createAppointment, getAppointmentById, updateAppointment, getAvailableSlotsForDentistAndDate, type AppointmentInput } from '../actions';
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

describe('Appointments Actions', () => {
  let mockSupabase: MockSupabase;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase);
  });

  const mockInput: AppointmentInput = {
    patient_id: 'patient-123',
    dentist_id: 'dentist-456',
    starts_at: '2026-07-06T18:00:00Z',
    duration_minutes: 30,
    status: 'programada',
    reason: 'Consulta general',
    notes: 'Primer control dental',
  };

  describe('createAppointment', () => {
    it('should create an appointment successfully with valid data', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-789' } },
      });

      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({ insert: mockInsert });

      // Act
      const result = await createAppointment(mockInput);

      // Assert
      expect(result).toEqual({ success: true });
      expect(mockSupabase.from).toHaveBeenCalledWith('appointments');
      expect(mockInsert).toHaveBeenCalledWith({
        patient_id: 'patient-123',
        dentist_id: 'dentist-456',
        starts_at: '2026-07-06T18:00:00Z',
        duration_minutes: 30,
        status: 'programada',
        reason: 'Consulta general',
        notes: 'Primer control dental',
        created_by: 'user-789',
      });
      expect(revalidatePath).toHaveBeenCalledWith('/appointments');
    });

    it('should return a friendly error message when a schedule overlap occurs (PostgreSQL error 23P01)', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-789' } },
      });

      const mockInsert = vi.fn().mockResolvedValue({
        error: { code: '23P01', message: 'exclusion constraint violation' },
      });
      mockSupabase.from.mockReturnValue({ insert: mockInsert });

      // Act
      const result = await createAppointment(mockInput);

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'El odontólogo ya tiene una cita programada en ese horario. Por favor selecciona otro horario o dentista.',
      });
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it('should assign created_by from authenticated user, ignoring any created_by in input payload', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-789' } },
      });

      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({ insert: mockInsert });

      const inputWithCreatedBy: AppointmentInput & Record<string, unknown> = {
        ...mockInput,
        created_by: 'injected-user-id',
      };

      // Act
      await createAppointment(inputWithCreatedBy);

      // Assert
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        created_by: 'user-789',
      }));
    });
  });

  describe('getAppointmentById', () => {
    it('should return null controlled-fashion when the appointment does not exist', async () => {
      // Arrange
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Row not found' },
      });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      // Act
      const result = await getAppointmentById('non-existent-id');

      // Assert
      expect(result).toBeNull();
      expect(mockSupabase.from).toHaveBeenCalledWith('appointments');
    });

    it('should throw an error for generic errors from Supabase', async () => {
      // Arrange
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'OTHER_CODE', message: 'Database connection failed' },
      });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      // Act & Assert
      await expect(getAppointmentById('some-id')).rejects.toThrow(
        'Error al obtener detalle de la cita: Database connection failed'
      );
    });
  });

  describe('updateAppointment', () => {
    it('should return a friendly error message when updating leads to an overlap (PostgreSQL error 23P01)', async () => {
      // Arrange
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: { code: '23P01', message: 'exclusion constraint violation' },
        }),
      });
      mockSupabase.from.mockReturnValue({ update: mockUpdate });

      // Act
      const result = await updateAppointment('appointment-123', {
        starts_at: '2026-07-06T19:00:00Z',
      });

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'El odontólogo ya tiene una cita programada en ese horario. Por favor selecciona otro horario o dentista.',
      });
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it('should successfully update and revalidate paths upon success', async () => {
      // Arrange
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ update: mockUpdate });

      // Act
      const result = await updateAppointment('appointment-123', {
        status: 'confirmada',
      });

      // Assert
      expect(result).toEqual({ success: true });
      expect(mockSupabase.from).toHaveBeenCalledWith('appointments');
      expect(revalidatePath).toHaveBeenCalledWith('/appointments');
      expect(revalidatePath).toHaveBeenCalledWith('/appointments/appointment-123');
    });
  });

  describe('getAvailableSlotsForDentistAndDate', () => {
    it('should query appointments and calculate available slots for a dentist on a specific date', async () => {
      // Arrange
      const dentistId = 'dentist-456';
      const dateStr = '2026-07-06';
      
      const mockOrder = vi.fn().mockResolvedValue({
        data: [
          {
            starts_at: '2026-07-06T14:00:00.000Z', // 2:00 PM UTC
            duration_minutes: 30,
            status: 'programada',
          }
        ],
        error: null,
      });
      const mockLte = vi.fn().mockReturnValue({ order: mockOrder });
      const mockGte = vi.fn().mockReturnValue({ lte: mockLte });
      const mockEq = vi.fn().mockReturnValue({ gte: mockGte });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      // Act
      const slots = await getAvailableSlotsForDentistAndDate(dentistId, dateStr);

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('appointments');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('dentist_id', dentistId);
      expect(mockGte).toHaveBeenCalledWith('starts_at', '2026-07-06T00:00:00.000Z');
      expect(mockLte).toHaveBeenCalledWith('starts_at', '2026-07-06T23:59:59.999Z');
      expect(mockOrder).toHaveBeenCalledWith('starts_at');
      
      // The slot at 14:00 should be filtered out
      const hasOverlapSlot = slots.some(slot => slot.starts_at === '2026-07-06T14:00:00.000Z');
      expect(hasOverlapSlot).toBe(false);
      expect(slots.length).toBeGreaterThan(0);
    });
  });
});
