import { vi, describe, it, expect, beforeEach } from 'vitest';
import { deletePatientDocument } from '../actions';
import { createClient } from '@/shared/lib/supabase/server';
import { revalidatePath } from 'next/cache';

vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// --- Tipos del mock -----------------------------------------------------------
interface MockSupabase {
  auth: { getUser: ReturnType<typeof vi.fn> };
  from: ReturnType<typeof vi.fn>;
  storage: { from: ReturnType<typeof vi.fn> };
}

// --- Constantes ---------------------------------------------------------------
const DOCUMENT_ID        = 'doc-uuid-1234';
const PATIENT_ID         = 'patient-uuid-5678';
const DOC_ROW            = { id: DOCUMENT_ID };
const AUTHENTICATED_USER = { id: 'user-admin-001' };

// --- Suite -------------------------------------------------------------------
describe('deletePatientDocument', () => {
  let mockSupabase: MockSupabase;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(),
      storage: {
        from: vi.fn(),
      },
    };

    vi.mocked(createClient).mockResolvedValue(
      mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>
    );

    // Por defecto: sesion autenticada
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: AUTHENTICATED_USER },
      error: null,
    });
  });

  // ---------------------------------------------------------------------------
  // 1. Exito completo (Soft Delete)
  // ---------------------------------------------------------------------------
  it('1. exito completo: fetch fila con deleted_at null -> update deleted_at -> revalidatePath', async () => {
    // Arrange — cadena .from("patient_documents").select().eq().is().single()
    const mockSingle  = vi.fn().mockResolvedValue({ data: DOC_ROW, error: null });
    const mockIs      = vi.fn().mockReturnValue({ single: mockSingle });
    const mockEqFetch = vi.fn().mockReturnValue({ is: mockIs });
    const mockSelect  = vi.fn().mockReturnValue({ eq: mockEqFetch });

    // Cadena .from("patient_documents").update().eq()
    const mockEqUpdate = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate   = vi.fn().mockReturnValue({ eq: mockEqUpdate });

    mockSupabase.from.mockImplementation((tableName: string) => {
      if (tableName === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { role: 'administrador' }, error: null }),
            }),
          }),
        };
      }
      if (tableName === 'patient_documents') {
        return {
          select: mockSelect,
          update: mockUpdate,
        };
      }
      return {};
    });

    // Act
    const result = await deletePatientDocument(DOCUMENT_ID, PATIENT_ID);

    // Assert
    expect(result).toEqual({ success: true, data: null });

    // Verificar cadena de fetch: select("id").eq().is("deleted_at", null).single()
    expect(mockSupabase.from).toHaveBeenCalledTimes(3);
    expect(mockSupabase.from).toHaveBeenNthCalledWith(1, 'profiles');
    expect(mockSupabase.from).toHaveBeenNthCalledWith(2, 'patient_documents');
    expect(mockSelect).toHaveBeenCalledWith('id');
    expect(mockEqFetch).toHaveBeenCalledWith('id', DOCUMENT_ID);
    expect(mockIs).toHaveBeenCalledWith('deleted_at', null);

    // Storage.from nunca debe ser invocado
    expect(mockSupabase.storage.from).not.toHaveBeenCalled();

    // Verificar que se aplico el soft-delete (UPDATE)
    expect(mockSupabase.from).toHaveBeenNthCalledWith(3, 'patient_documents');
    expect(mockUpdate).toHaveBeenCalledWith({ deleted_at: expect.any(String) });
    expect(mockEqUpdate).toHaveBeenCalledWith('id', DOCUMENT_ID);

    // Verificar revalidacion de cache
    expect(revalidatePath).toHaveBeenCalledWith(`/patients/${PATIENT_ID}`);
  });

  // ---------------------------------------------------------------------------
  // 2. Fila inexistente o ya borrada (fetchError)
  // ---------------------------------------------------------------------------
  it('2. fila inexistente o ya borrada: devuelve error, NO realiza update', async () => {
    const mockSingle  = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'No rows found' },
    });
    const mockIs      = vi.fn().mockReturnValue({ single: mockSingle });
    const mockEqFetch = vi.fn().mockReturnValue({ is: mockIs });
    const mockSelect  = vi.fn().mockReturnValue({ eq: mockEqFetch });

    mockSupabase.from.mockImplementation((tableName: string) => {
      if (tableName === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { role: 'administrador' }, error: null }),
            }),
          }),
        };
      }
      if (tableName === 'patient_documents') {
        return { select: mockSelect };
      }
      return {};
    });

    const result = await deletePatientDocument(DOCUMENT_ID, PATIENT_ID);

    expect(result).toEqual({
      success: false,
      error: 'El documento no existe o no tienes permiso para eliminarlo.',
    });

    // Solo dos llamadas: profiles y fetch de patient_documents
    expect(mockSupabase.from).toHaveBeenCalledTimes(2);
    expect(mockSupabase.from).toHaveBeenNthCalledWith(1, 'profiles');
    expect(mockSupabase.from).toHaveBeenNthCalledWith(2, 'patient_documents');

    // Sin llamadas a storage ni revalidacion
    expect(mockSupabase.storage.from).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // 2b. Fila inexistente — edge case: data null con error null
  // ---------------------------------------------------------------------------
  it('2b. fila inexistente (docRow null sin error): misma proteccion que 2', async () => {
    // Edge case: .single() retorna data: null y error: null simultaneamente.
    // La condicion `if (fetchError || !docRow)` debe capturar la rama !docRow.
    const mockSingle  = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockIs      = vi.fn().mockReturnValue({ single: mockSingle });
    const mockEqFetch = vi.fn().mockReturnValue({ is: mockIs });
    const mockSelect  = vi.fn().mockReturnValue({ eq: mockEqFetch });

    mockSupabase.from.mockImplementation((tableName: string) => {
      if (tableName === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { role: 'administrador' }, error: null }),
            }),
          }),
        };
      }
      if (tableName === 'patient_documents') {
        return { select: mockSelect };
      }
      return {};
    });

    const result = await deletePatientDocument(DOCUMENT_ID, PATIENT_ID);

    expect(result).toEqual({
      success: false,
      error: 'El documento no existe o no tienes permiso para eliminarlo.',
    });

    // Solo dos llamadas: profiles y fetch de patient_documents
    expect(mockSupabase.from).toHaveBeenCalledTimes(2);
    expect(mockSupabase.from).toHaveBeenNthCalledWith(1, 'profiles');
    expect(mockSupabase.from).toHaveBeenNthCalledWith(2, 'patient_documents');

    // Sin storage ni revalidacion — la rama !docRow se activo antes del UPDATE
    expect(mockSupabase.storage.from).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // 3. Fallo en el UPDATE de la BD
  // ---------------------------------------------------------------------------
  it('3. fallo en update de BD: devuelve error indicando que no se pudo marcar', async () => {
    const mockSingle  = vi.fn().mockResolvedValue({ data: DOC_ROW, error: null });
    const mockIs      = vi.fn().mockReturnValue({ single: mockSingle });
    const mockEqFetch = vi.fn().mockReturnValue({ is: mockIs });
    const mockSelect  = vi.fn().mockReturnValue({ eq: mockEqFetch });

    const mockEqUpdate = vi.fn().mockResolvedValue({
      error: { message: 'permission denied for table patient_documents' },
    });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqUpdate });

    mockSupabase.from.mockImplementation((tableName: string) => {
      if (tableName === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { role: 'administrador' }, error: null }),
            }),
          }),
        };
      }
      if (tableName === 'patient_documents') {
        return {
          select: mockSelect,
          update: mockUpdate,
        };
      }
      return {};
    });

    const result = await deletePatientDocument(DOCUMENT_ID, PATIENT_ID);

    expect(result).toEqual({
      success: false,
      error: 'No se pudo marcar el documento como eliminado: permission denied for table patient_documents.',
    });

    // Tres llamadas: profiles, fetch, update
    expect(mockSupabase.from).toHaveBeenCalledTimes(3);
    expect(mockUpdate).toHaveBeenCalledWith({ deleted_at: expect.any(String) });
    expect(mockEqUpdate).toHaveBeenCalledWith('id', DOCUMENT_ID);

    // Sin storage ni revalidacion
    expect(mockSupabase.storage.from).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // 4. Rol no administrador
  // ---------------------------------------------------------------------------
  it('4. rol no administrador: devuelve acceso denegado sin ninguna accion adicional', async () => {
    mockSupabase.from.mockImplementation((tableName: string) => {
      if (tableName === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { role: 'odontologo' }, error: null }),
            }),
          }),
        };
      }
      return {};
    });

    const result = await deletePatientDocument(DOCUMENT_ID, PATIENT_ID);

    expect(result).toEqual({
      success: false,
      error: 'Acceso denegado. Solo los administradores pueden eliminar documentos.',
    });

    // Solo una llamada: profiles
    expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
    expect(mockSupabase.storage.from).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
