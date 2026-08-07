import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createPatient, getPatientById, type PatientInput } from '../actions';
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

describe('Patients Actions', () => {
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

  describe('createPatient', () => {
    const mockInput = {
      full_name: 'John Doe',
      document_id: '12345678',
      phone: '555-1234',
      email: 'john@example.com',
      birth_date: '1990-01-01',
      address: '123 St',
      allergies: 'None',
      diseases: 'None',
      current_medications: 'None',
      medical_observations: 'None',
    };

    it('should create a patient successfully with valid data', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });
      
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({ insert: mockInsert });

      // Act
      const result = await createPatient(mockInput);

      // Assert
      expect(result).toEqual({ success: true });
      expect(mockSupabase.from).toHaveBeenCalledWith('patients');
      expect(mockInsert).toHaveBeenCalledWith({
        full_name: 'John Doe',
        document_id: '12345678',
        phone: '555-1234',
        email: 'john@example.com',
        birth_date: '1990-01-01',
        address: '123 St',
        allergies: 'None',
        diseases: 'None',
        current_medications: 'None',
        medical_observations: 'None',
        created_by: 'user-123',
        branch_id: undefined,
      });
      expect(revalidatePath).toHaveBeenCalledWith('/patients');
    });

    it('should return a friendly error message when document_id is duplicated (PostgreSQL error 23505)', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      const mockInsert = vi.fn().mockResolvedValue({
        error: { code: '23505', message: 'duplicate key value violates unique constraint' },
      });
      mockSupabase.from.mockReturnValue({ insert: mockInsert });

      // Act
      const result = await createPatient(mockInput);

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Ya existe un paciente registrado con esta cédula o documento de identidad.',
      });
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it('should set created_by from authenticated user, not form input', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({ insert: mockInsert });

      // Even if input has extra fields (like created_by payload attempt),
      // verify it uses user.id from the authenticated user session.
      // We cast to PatientInput since created_by is not part of the public interface
      // but we want to ensure it's ignored by the server action.
      const inputWithCreatedBy: PatientInput & Record<string, unknown> = {
        ...mockInput,
        created_by: 'malicious-user-id',
      };

      // Act
      await createPatient(inputWithCreatedBy);

      // Assert
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        created_by: 'user-123',
      }));
    });
  });

  describe('getPatientById', () => {
    it('should handle non-existent patient and reject/throw a controlled error', async () => {
      // Arrange
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Row not found' },
      });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      // Act & Assert
      await expect(getPatientById('non-existent-id')).rejects.toThrow(
        'Error al obtener detalle del paciente: Row not found'
      );
      expect(mockSupabase.from).toHaveBeenCalledWith('patients');
      expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('branches'));
      expect(mockEq).toHaveBeenCalledWith('id', 'non-existent-id');
    });
  });
});
