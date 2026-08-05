import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createAppointment, getAppointmentById, updateAppointment, getAvailableSlotsForDentistAndDate, type AppointmentInput } from '../actions';
import { createClient } from '@/shared/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sendConfirmationEmail } from '../../communications/email';

vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('../../communications/email', () => ({
  sendConfirmationEmail: vi.fn(),
}));

interface MockSupabase {
  auth: { getUser: ReturnType<typeof vi.fn> };
  from: ReturnType<typeof vi.fn>;
  rpc: ReturnType<typeof vi.fn>;
}

describe('Appointments Actions', () => {
  let mockSupabase: MockSupabase;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-789' } },
        }),
      },
      from: vi.fn(),
      rpc: vi.fn().mockResolvedValue({ data: 'log-123', error: null }),
    };

    // Configuración base universal para simular cadenas de consultas de Supabase (.select().eq().single())
    const defaultQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'new-appt-123',
          status: 'programada',
          starts_at: '2026-07-06T18:00:00Z',
          patient_id: 'patient-123',
          patients: {
            full_name: 'Juan Pérez',
            email: 'juan@example.com',
          },
          profiles: {
            full_name: 'Dr. Yorman Cerón',
          },
        },
        error: null,
      }),
    };
    mockSupabase.from.mockReturnValue(defaultQueryBuilder);

    vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);
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

      const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'new-appt-123' }, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
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

      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: '23P01', message: 'exclusion constraint violation' },
      });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
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

      const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'new-appt-123' }, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
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

    it('should send email and update log to sent when created directly with confirmed status', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-789' } },
      });

      // Configuración de mock Supabase para simular la secuencia de creación, consulta y rpc
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'appointments') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'new-appt-123' }, error: null }),
              }),
            }),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  starts_at: '2026-07-06T18:00:00Z',
                  patient_id: 'patient-123',
                  patients: {
                    full_name: 'Juan Pérez',
                    email: 'juan@example.com',
                  },
                  profiles: {
                    full_name: 'Dr. Yorman Cerón',
                  },
                },
                error: null,
              }),
            })),
          };
        }
        return {};
      });

      mockSupabase.rpc.mockResolvedValue({ data: 'log-789', error: null });
      vi.mocked(sendConfirmationEmail).mockResolvedValue({ success: true, messageId: 'msg-xyz' });

      // Act
      const result = await createAppointment({
        ...mockInput,
        status: 'confirmada',
      });

      // Assert
      expect(result).toEqual({ success: true });
      expect(mockSupabase.rpc).toHaveBeenCalledWith('insert_communication_log', {
        p_appointment_id: 'new-appt-123',
        p_patient_id: 'patient-123',
        p_channel: 'email',
        p_event_type: 'confirmation',
        p_created_by: 'user-789',
      });
      expect(sendConfirmationEmail).toHaveBeenCalledWith({
        to: 'juan@example.com',
        patientName: 'Juan Pérez',
        appointmentDate: expect.any(String),
        appointmentTime: expect.any(String),
        dentistName: 'Dr. Yorman Cerón',
      });
      expect(mockSupabase.rpc).toHaveBeenCalledWith('update_communication_log_status', {
        p_log_id: 'log-789',
        p_status: 'sent',
      });
    });

    it('should update log to failed but return success: true when Resend email sending fails on creation', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-789' } },
      });

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'appointments') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'new-appt-123' }, error: null }),
              }),
            }),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  starts_at: '2026-07-06T18:00:00Z',
                  patient_id: 'patient-123',
                  patients: {
                    full_name: 'Juan Pérez',
                    email: 'juan@example.com',
                  },
                  profiles: {
                    full_name: 'Dr. Yorman Cerón',
                  },
                },
                error: null,
              }),
            })),
          };
        }
        return {};
      });

      mockSupabase.rpc.mockResolvedValue({ data: 'log-failed-create', error: null });
      vi.mocked(sendConfirmationEmail).mockResolvedValue({ success: false, error: 'Email service down' });

      // Act
      const result = await createAppointment({
        ...mockInput,
        status: 'confirmada',
      });

      // Assert
      expect(result).toEqual({ success: true });
      expect(mockSupabase.rpc).toHaveBeenCalledWith('update_communication_log_status', {
        p_log_id: 'log-failed-create',
        p_status: 'failed',
        p_error_message: 'Email service down',
      });
    });

    it('should not send email or log when creating an appointment with a status other than confirmed', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-789' } },
      });

      const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'new-appt-123' }, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      mockSupabase.from.mockReturnValue({ insert: mockInsert });

      // Act
      const result = await createAppointment({
        ...mockInput,
        status: 'programada',
      });

      // Assert
      expect(result).toEqual({ success: true });
      expect(sendConfirmationEmail).not.toHaveBeenCalled();
      expect(mockSupabase.rpc).not.toHaveBeenCalled();
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
      const mockEq = vi.fn().mockResolvedValue({
        error: { code: '23P01', message: 'exclusion constraint violation' },
      });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'appointments') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation(() => ({
              single: vi.fn().mockResolvedValue({
                data: { status: 'programada' },
                error: null,
              }),
            })),
            update: mockUpdate,
          };
        }
        return {};
      });

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
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'appointments') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation(() => ({
              single: vi.fn().mockResolvedValue({
                data: { status: 'programada' },
                error: null,
              }),
            })),
            update: mockUpdate,
          };
        }
        return {};
      });

      vi.mocked(sendConfirmationEmail).mockResolvedValue({ success: true, messageId: 'msg-123' });

      // Act
      const result = await updateAppointment('appointment-123', {
        status: 'confirmada',
      });

      // Assert
      expect(result).toEqual({ success: true });
      expect(revalidatePath).toHaveBeenCalledWith('/appointments');
      expect(revalidatePath).toHaveBeenCalledWith('/appointments/appointment-123');
    });

    it('should send email and update log to sent when transitioned to confirmed status successfully', async () => {
      // Arrange
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'appointments') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation(() => ({
              single: vi.fn().mockImplementation(async () => {
                return {
                  data: {
                    status: 'programada',
                    starts_at: '2026-07-06T18:00:00Z',
                    patient_id: 'patient-123',
                    patients: {
                      full_name: 'Juan Pérez',
                      email: 'juan@example.com',
                    },
                    profiles: {
                      full_name: 'Dr. Yorman Cerón',
                    },
                  },
                  error: null,
                };
              }),
            })),
            update: mockUpdate,
          };
        }
        return {};
      });

      mockSupabase.rpc.mockResolvedValue({ data: 'log-123', error: null });
      vi.mocked(sendConfirmationEmail).mockResolvedValue({ success: true, messageId: 'msg-abc' });

      // Act
      const result = await updateAppointment('appointment-123', {
        status: 'confirmada',
      });

      // Assert
      expect(result).toEqual({ success: true });
      expect(mockSupabase.rpc).toHaveBeenCalledWith('insert_communication_log', {
        p_appointment_id: 'appointment-123',
        p_patient_id: 'patient-123',
        p_channel: 'email',
        p_event_type: 'confirmation',
        p_created_by: 'user-789',
      });
      expect(sendConfirmationEmail).toHaveBeenCalledWith({
        to: 'juan@example.com',
        patientName: 'Juan Pérez',
        appointmentDate: expect.any(String),
        appointmentTime: expect.any(String),
        dentistName: 'Dr. Yorman Cerón',
      });
      expect(mockSupabase.rpc).toHaveBeenCalledWith('update_communication_log_status', {
        p_log_id: 'log-123',
        p_status: 'sent',
      });
    });

    it('should update log to failed but return success: true when Resend email sending fails', async () => {
      // Arrange
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'appointments') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  status: 'programada',
                  starts_at: '2026-07-06T18:00:00Z',
                  patient_id: 'patient-123',
                  patients: {
                    full_name: 'Juan Pérez',
                    email: 'juan@example.com',
                  },
                  profiles: {
                    full_name: 'Dr. Yorman Cerón',
                  },
                },
                error: null,
              }),
            })),
            update: mockUpdate,
          };
        }
        return {};
      });

      mockSupabase.rpc.mockResolvedValue({ data: 'log-456', error: null });
      vi.mocked(sendConfirmationEmail).mockResolvedValue({ success: false, error: 'Resend limit reached' });

      // Act
      const result = await updateAppointment('appointment-123', {
        status: 'confirmada',
      });

      // Assert
      expect(result).toEqual({ success: true }); // Aún debe retornar true
      expect(mockSupabase.rpc).toHaveBeenCalledWith('insert_communication_log', expect.any(Object));
      expect(mockSupabase.rpc).toHaveBeenCalledWith('update_communication_log_status', {
        p_log_id: 'log-456',
        p_status: 'failed',
        p_error_message: 'Resend limit reached',
      });
    });

    it('should not send email or log when updating a confirmed appointment without changing status to confirmed', async () => {
      // Arrange
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'appointments') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation(() => ({
              single: vi.fn().mockResolvedValue({
                data: { status: 'confirmada' }, // Ya estaba confirmada
                error: null,
              }),
            })),
            update: mockUpdate,
          };
        }
        return {};
      });

      // Act
      const result = await updateAppointment('appointment-123', {
        notes: 'Comentarios adicionales',
        status: 'confirmada',
      });

      // Assert
      expect(result).toEqual({ success: true });
      expect(sendConfirmationEmail).not.toHaveBeenCalled();
      expect(mockSupabase.rpc).not.toHaveBeenCalled();
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
