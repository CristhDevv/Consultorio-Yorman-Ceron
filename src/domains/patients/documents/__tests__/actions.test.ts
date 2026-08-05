import { vi, describe, it, expect, beforeEach } from 'vitest';
import { deletePatientDocument, getDocumentSignedUrl, getDeletedPatientDocuments, restorePatientDocument, getAllDeletedDocuments } from '../actions';
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
    expect(mockUpdate).toHaveBeenCalledWith({ deleted_at: expect.any(String), deleted_by: AUTHENTICATED_USER.id });
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
    expect(mockUpdate).toHaveBeenCalledWith({ deleted_at: expect.any(String), deleted_by: AUTHENTICATED_USER.id });
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

// ═══════════════════════════════════════════════════════════════════════════
// Suite de pruebas para getDocumentSignedUrl
// ═══════════════════════════════════════════════════════════════════════════
describe('getDocumentSignedUrl', () => {
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

  it('1. sin sesion activa: devuelve error', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Session error'),
    });

    const result = await getDocumentSignedUrl('some/file/path');

    expect(result).toEqual({
      success: false,
      error: 'No hay sesión activa. Por favor inicia sesión.',
    });
  });

  it('2. con sesion pero rol distinto de administrador: devuelve acceso denegado', async () => {
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

    const result = await getDocumentSignedUrl('some/file/path');

    expect(result).toEqual({
      success: false,
      error: 'Acceso denegado. Solo los administradores pueden generar URLs firmadas para ver o descargar documentos.',
    });
  });

  it('3. con rol administrador pero documento inexistente o deleted_at no nulo: devuelve error de no disponible', async () => {
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockIs = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockEq = vi.fn().mockReturnValue({ is: mockIs });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

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

    const result = await getDocumentSignedUrl('some/file/path');

    expect(result).toEqual({
      success: false,
      error: 'El documento no existe o no está disponible.',
    });

    expect(mockSelect).toHaveBeenCalledWith('id');
    expect(mockEq).toHaveBeenCalledWith('file_path', 'some/file/path');
    expect(mockIs).toHaveBeenCalledWith('deleted_at', null);
    expect(mockSupabase.storage.from).not.toHaveBeenCalled();
  });

  it('4. con rol administrador y documento activo: genera URL firmada exitosamente', async () => {
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: { id: 'doc-123' }, error: null });
    const mockIs = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockEq = vi.fn().mockReturnValue({ is: mockIs });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    const mockCreateSignedUrl = vi.fn().mockResolvedValue({ data: { signedUrl: 'https://supabase.signed.url' }, error: null });

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

    mockSupabase.storage.from.mockReturnValue({
      createSignedUrl: mockCreateSignedUrl,
    });

    const result = await getDocumentSignedUrl('some/file/path');

    expect(result).toEqual({
      success: true,
      data: { signedUrl: 'https://supabase.signed.url' },
    });

    expect(mockSelect).toHaveBeenCalledWith('id');
    expect(mockEq).toHaveBeenCalledWith('file_path', 'some/file/path');
    expect(mockIs).toHaveBeenCalledWith('deleted_at', null);
    expect(mockSupabase.storage.from).toHaveBeenCalledWith('patient-attachments');
    expect(mockCreateSignedUrl).toHaveBeenCalledWith('some/file/path', 60);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Suite de pruebas para getDeletedPatientDocuments
// ═══════════════════════════════════════════════════════════════════════════
describe('getDeletedPatientDocuments', () => {
  let mockSupabase: MockSupabase;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      auth: { getUser: vi.fn() },
      from: vi.fn(),
      storage: { from: vi.fn() },
    };

    vi.mocked(createClient).mockResolvedValue(
      mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>
    );

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: AUTHENTICATED_USER },
      error: null,
    });
  });

  // ---------------------------------------------------------------------------
  // 1. Sin sesión activa
  // ---------------------------------------------------------------------------
  it('1. sin sesion activa: devuelve error sin llamadas a from', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Session error'),
    });

    const result = await getDeletedPatientDocuments(PATIENT_ID);

    expect(result).toEqual({
      success: false,
      error: 'No hay sesión activa. Por favor inicia sesión.',
    });
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // 2. Rol distinto de administrador
  // ---------------------------------------------------------------------------
  it('2. rol no administrador: devuelve acceso denegado, solo una llamada a profiles', async () => {
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

    const result = await getDeletedPatientDocuments(PATIENT_ID);

    expect(result).toEqual({
      success: false,
      error: 'Acceso denegado. Solo los administradores pueden consultar documentos eliminados.',
    });
    expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
  });

  // ---------------------------------------------------------------------------
  // 3. Éxito: devuelve array con deleted_at, deleted_by y su respectivo deleted_by_name
  // ---------------------------------------------------------------------------
  it('3. exito: query filtra deleted_at not null, resuelve deleted_by_name mediante join profiles.in()', async () => {
    const DELETED_DOC = {
      id: DOCUMENT_ID,
      document_type: 'radiografia',
      file_name: 'rx.png',
      file_path: `${PATIENT_ID}/uuid-rx.png`,
      uploaded_by: AUTHENTICATED_USER.id,
      created_at: '2026-01-01T00:00:00Z',
      bucket_id: 'patient-attachments',
      deleted_at: '2026-08-01T12:00:00Z',
      deleted_by: AUTHENTICATED_USER.id,
    };

    const mockOrder  = vi.fn().mockResolvedValue({ data: [DELETED_DOC], error: null });
    const mockNot    = vi.fn().mockReturnValue({ order: mockOrder });
    const mockEq     = vi.fn().mockReturnValue({ not: mockNot });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    // Mocks para la segunda query de profiles
    const mockInProfiles = vi.fn().mockResolvedValue({
      data: [{ id: AUTHENTICATED_USER.id, full_name: 'Dr. Administrador Ficticio' }],
      error: null,
    });
    const mockSelectProfiles = vi.fn().mockReturnValue({ in: mockInProfiles });

    mockSupabase.from.mockImplementation((tableName: string) => {
      if (tableName === 'profiles') {
        return {
          select: (fields: string) => {
            if (fields === 'role') {
              return {
                eq: () => ({
                  single: () => Promise.resolve({ data: { role: 'administrador' }, error: null }),
                }),
              };
            }
            if (fields === 'id, full_name') {
              return mockSelectProfiles();
            }
            return {};
          },
        };
      }
      if (tableName === 'patient_documents') {
        return { select: mockSelect };
      }
      return {};
    });

    const result = await getDeletedPatientDocuments(PATIENT_ID);

    expect(result).toEqual({
      success: true,
      data: [
        {
          ...DELETED_DOC,
          deleted_by_name: 'Dr. Administrador Ficticio',
        },
      ],
    });
    expect(mockSelect).toHaveBeenCalledWith(
      'id, document_type, file_name, file_path, uploaded_by, created_at, bucket_id, deleted_at, deleted_by'
    );
    expect(mockEq).toHaveBeenCalledWith('patient_id', PATIENT_ID);
    expect(mockNot).toHaveBeenCalledWith('deleted_at', 'is', null);
    expect(mockOrder).toHaveBeenCalledWith('deleted_at', { ascending: false });
    
    // Validar que se llamó al IN de profiles con el ID correspondiente
    expect(mockInProfiles).toHaveBeenCalledWith('id', [AUTHENTICATED_USER.id]);
  });

  // ---------------------------------------------------------------------------
  // 4. Error de BD en el select
  // ---------------------------------------------------------------------------
  it('4. error de BD en select: devuelve error con mensaje de BD', async () => {
    const mockOrder  = vi.fn().mockResolvedValue({ data: null, error: { message: 'connection timeout' } });
    const mockNot    = vi.fn().mockReturnValue({ order: mockOrder });
    const mockEq     = vi.fn().mockReturnValue({ not: mockNot });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

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

    const result = await getDeletedPatientDocuments(PATIENT_ID);

    expect(result).toEqual({
      success: false,
      error: 'No se pudieron obtener los documentos eliminados: connection timeout',
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // 5. BD devuelve data: null sin error → data ?? [] → success con array vacío
  // ---------------------------------------------------------------------------
  it('5. BD devuelve data null sin error: devuelve success con array vacio', async () => {
    const mockOrder  = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockNot    = vi.fn().mockReturnValue({ order: mockOrder });
    const mockEq     = vi.fn().mockReturnValue({ not: mockNot });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

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

    const result = await getDeletedPatientDocuments(PATIENT_ID);

    expect(result).toEqual({ success: true, data: [] });
  });

  // ---------------------------------------------------------------------------
  // 6. Éxito con deleted_by null: salta la consulta in y retorna deleted_by_name null
  // ---------------------------------------------------------------------------
  it('6. exito con deleted_by null: salta la consulta in y retorna deleted_by_name null', async () => {
    const DELETED_DOC_NULL_BY = {
      id: DOCUMENT_ID,
      document_type: 'radiografia',
      file_name: 'rx.png',
      file_path: `${PATIENT_ID}/uuid-rx.png`,
      uploaded_by: AUTHENTICATED_USER.id,
      created_at: '2026-01-01T00:00:00Z',
      bucket_id: 'patient-attachments',
      deleted_at: '2026-08-01T12:00:00Z',
      deleted_by: null,
    };

    const mockOrder  = vi.fn().mockResolvedValue({ data: [DELETED_DOC_NULL_BY], error: null });
    const mockNot    = vi.fn().mockReturnValue({ order: mockOrder });
    const mockEq     = vi.fn().mockReturnValue({ not: mockNot });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    const mockInProfiles = vi.fn();
    const mockSelectProfiles = vi.fn().mockReturnValue({ in: mockInProfiles });

    mockSupabase.from.mockImplementation((tableName: string) => {
      if (tableName === 'profiles') {
        return {
          select: (fields: string) => {
            if (fields === 'role') {
              return {
                eq: () => ({
                  single: () => Promise.resolve({ data: { role: 'administrador' }, error: null }),
                }),
              };
            }
            if (fields === 'id, full_name') {
              return mockSelectProfiles();
            }
            return {};
          },
        };
      }
      if (tableName === 'patient_documents') {
        return { select: mockSelect };
      }
      return {};
    });

    const result = await getDeletedPatientDocuments(PATIENT_ID);

    expect(result).toEqual({
      success: true,
      data: [
        {
          ...DELETED_DOC_NULL_BY,
          deleted_by_name: null,
        },
      ],
    });
    // Verificar que NO se hizo la segunda query de profiles al no haber IDs
    expect(mockSelectProfiles).not.toHaveBeenCalled();
    expect(mockInProfiles).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Suite de pruebas para restorePatientDocument
// ═══════════════════════════════════════════════════════════════════════════
describe('restorePatientDocument', () => {
  let mockSupabase: MockSupabase;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      auth: { getUser: vi.fn() },
      from: vi.fn(),
      storage: { from: vi.fn() },
    };

    vi.mocked(createClient).mockResolvedValue(
      mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>
    );

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: AUTHENTICATED_USER },
      error: null,
    });
  });

  // ---------------------------------------------------------------------------
  // 1. Sin sesión activa
  // ---------------------------------------------------------------------------
  it('1. sin sesion activa: devuelve error sin llamadas a from', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Session error'),
    });

    const result = await restorePatientDocument(DOCUMENT_ID, PATIENT_ID);

    expect(result).toEqual({
      success: false,
      error: 'No hay sesión activa. Por favor inicia sesión.',
    });
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // 2. Rol distinto de administrador
  // ---------------------------------------------------------------------------
  it('2. rol no administrador: devuelve acceso denegado, solo una llamada a profiles', async () => {
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

    const result = await restorePatientDocument(DOCUMENT_ID, PATIENT_ID);

    expect(result).toEqual({
      success: false,
      error: 'Acceso denegado. Solo los administradores pueden restaurar documentos.',
    });
    expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // 3. Documento inexistente en papelera
  // ---------------------------------------------------------------------------
  it('3. documento no encontrado en papelera: devuelve error, sin update ni revalidatePath', async () => {
    const mockSingle  = vi.fn().mockResolvedValue({ data: null, error: { message: 'No rows found' } });
    const mockNot     = vi.fn().mockReturnValue({ single: mockSingle });
    const mockEqFetch = vi.fn().mockReturnValue({ not: mockNot });
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

    const result = await restorePatientDocument(DOCUMENT_ID, PATIENT_ID);

    expect(result).toEqual({
      success: false,
      error: 'El documento no existe o no está en la papelera para ser restaurado.',
    });
    expect(mockSupabase.from).toHaveBeenCalledTimes(2);
    expect(mockSupabase.from).toHaveBeenNthCalledWith(1, 'profiles');
    expect(mockSupabase.from).toHaveBeenNthCalledWith(2, 'patient_documents');
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // 4. Éxito completo
  // ---------------------------------------------------------------------------
  it('4. exito completo: fetch doc en papelera -> update deleted_at null y restored_at -> revalidatePath', async () => {
    const mockSingle  = vi.fn().mockResolvedValue({ data: DOC_ROW, error: null });
    const mockNot     = vi.fn().mockReturnValue({ single: mockSingle });
    const mockEqFetch = vi.fn().mockReturnValue({ not: mockNot });
    const mockSelect  = vi.fn().mockReturnValue({ eq: mockEqFetch });

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
        return { select: mockSelect, update: mockUpdate };
      }
      return {};
    });

    const result = await restorePatientDocument(DOCUMENT_ID, PATIENT_ID);

    expect(result).toEqual({ success: true, data: null });

    // Verificar cadena de fetch: select("id").eq().not("deleted_at", "is", null).single()
    expect(mockSelect).toHaveBeenCalledWith('id');
    expect(mockEqFetch).toHaveBeenCalledWith('id', DOCUMENT_ID);
    expect(mockNot).toHaveBeenCalledWith('deleted_at', 'is', null);

    // Verificar update con deleted_at: null y restored_at: string
    expect(mockUpdate).toHaveBeenCalledWith({
      deleted_at: null,
      restored_at: expect.any(String),
    });
    expect(mockEqUpdate).toHaveBeenCalledWith('id', DOCUMENT_ID);

    // revalidatePath con la ruta correcta
    expect(revalidatePath).toHaveBeenCalledWith(`/patients/${PATIENT_ID}`);

    // Storage nunca debe ser invocado
    expect(mockSupabase.storage.from).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // 5. Fallo en el update de BD
  // ---------------------------------------------------------------------------
  it('5. fallo en update de BD: devuelve error, sin revalidatePath', async () => {
    const mockSingle  = vi.fn().mockResolvedValue({ data: DOC_ROW, error: null });
    const mockNot     = vi.fn().mockReturnValue({ single: mockSingle });
    const mockEqFetch = vi.fn().mockReturnValue({ not: mockNot });
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
        return { select: mockSelect, update: mockUpdate };
      }
      return {};
    });

    const result = await restorePatientDocument(DOCUMENT_ID, PATIENT_ID);

    expect(result).toEqual({
      success: false,
      error: 'No se pudo restaurar el documento: permission denied for table patient_documents.',
    });

    expect(mockUpdate).toHaveBeenCalledWith({
      deleted_at: null,
      restored_at: expect.any(String),
    });
    expect(mockEqUpdate).toHaveBeenCalledWith('id', DOCUMENT_ID);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe('getAllDeletedDocuments', () => {
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

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: AUTHENTICATED_USER },
      error: null,
    });
  });

  it('1. should fail if no active session', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await getAllDeletedDocuments();
    expect(result.success).toBe(false);
    expect(result.error).toContain('inicia sesión');
  });

  it('2. should fail if user is not administrator', async () => {
    mockSupabase.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { role: 'odontologo' }, error: null }),
        }),
      }),
    });

    const result = await getAllDeletedDocuments();
    expect(result.success).toBe(false);
    expect(result.error).toContain('administradores');
  });

  it('3. should succeed and return joined data', async () => {
    const deletedDocs = [
      {
        id: 'doc-1',
        document_type: 'Consentimiento',
        file_name: 'consent.pdf',
        file_path: 'patient-1/consent.pdf',
        uploaded_by: 'user-admin-001',
        created_at: '2026-08-05T12:00:00Z',
        bucket_id: 'patient-attachments',
        deleted_at: '2026-08-05T12:30:00Z',
        deleted_by: 'user-admin-001',
        patient_id: 'patient-1',
        patients: {
          full_name: 'Juan Pérez',
        },
      },
    ];

    // Profiles mock for resolved deleted_by_name
    const mockProfilesIn = vi.fn().mockResolvedValue({ data: [{ id: 'user-admin-001', full_name: 'Dr. Yorman Cerón' }], error: null });

    // Documents query mock
    const mockOrder = vi.fn().mockResolvedValue({ data: deletedDocs, error: null });
    const mockNot = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ not: mockNot });

    mockSupabase.from.mockImplementation((tableName: string) => {
      if (tableName === 'profiles') {
        return {
          select: (query: string) => {
            if (query === 'role') {
              return { eq: () => ({ single: () => Promise.resolve({ data: { role: 'administrador' }, error: null }) }) };
            }
            return { in: mockProfilesIn };
          }
        };
      }
      if (tableName === 'patient_documents') {
        return { select: mockSelect };
      }
      return {};
    });

    const result = await getAllDeletedDocuments();
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0]).toEqual({
      id: 'doc-1',
      document_type: 'Consentimiento',
      file_name: 'consent.pdf',
      file_path: 'patient-1/consent.pdf',
      uploaded_by: 'user-admin-001',
      created_at: '2026-08-05T12:00:00Z',
      bucket_id: 'patient-attachments',
      deleted_at: '2026-08-05T12:30:00Z',
      deleted_by: 'user-admin-001',
      deleted_by_name: 'Dr. Yorman Cerón',
      patient_id: 'patient-1',
      patient_name: 'Juan Pérez',
    });
  });
});
