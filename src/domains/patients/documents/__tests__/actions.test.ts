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

// ─── Tipos del mock ──────────────────────────────────────────────────────────
interface MockStorageBucket {
  remove: ReturnType<typeof vi.fn>;
}

interface MockSupabase {
  auth: { getUser: ReturnType<typeof vi.fn> };
  from: ReturnType<typeof vi.fn>;
  storage: { from: ReturnType<typeof vi.fn> };
}

// ─── Constantes ──────────────────────────────────────────────────────────────
const DOCUMENT_ID  = 'doc-uuid-1234';
const PATIENT_ID   = 'patient-uuid-5678';
const FILE_PATH    = `${PATIENT_ID}/some-uuid-sanitized.pdf`;
const DOC_ROW      = { id: DOCUMENT_ID, file_path: FILE_PATH };
const AUTHENTICATED_USER = { id: 'user-admin-001' };

// ─── Suite ───────────────────────────────────────────────────────────────────
describe('deletePatientDocument', () => {
  let mockSupabase: MockSupabase;
  let mockStorageBucket: MockStorageBucket;

  beforeEach(() => {
    vi.clearAllMocks();

    mockStorageBucket = {
      remove: vi.fn(),
    };

    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(),
      storage: {
        from: vi.fn().mockReturnValue(mockStorageBucket),
      },
    };

    // Es seguro hacer cast a la firma de retorno de createClient ya que en este contexto
    // de prueba unitaria solo necesitamos y validamos los métodos mockeados.
    vi.mocked(createClient).mockResolvedValue(
      mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>
    );

    // Por defecto: sesión autenticada
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: AUTHENTICATED_USER },
      error: null,
    });
  });

  // ---------------------------------------------------------------------------
  // 1. Éxito completo
  // ---------------------------------------------------------------------------
  it('1. éxito completo: fetch fila → remove Storage → delete BD → revalidatePath', async () => {
    // Arrange — cadena .from("patient_documents").select().eq().single()
    const mockSingle  = vi.fn().mockResolvedValue({ data: DOC_ROW, error: null });
    const mockEqFetch = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect  = vi.fn().mockReturnValue({ eq: mockEqFetch });

    // Cadena .from("patient_documents").delete().eq()
    const mockEqDelete = vi.fn().mockResolvedValue({ error: null });
    const mockDelete   = vi.fn().mockReturnValue({ eq: mockEqDelete });

    // mockSupabase.from es llamado dos veces con "patient_documents"
    mockSupabase.from
      .mockReturnValueOnce({ select: mockSelect })  // primera llamada: fetch fila
      .mockReturnValueOnce({ delete: mockDelete }); // segunda llamada: delete fila

    // Storage remove exitoso
    mockStorageBucket.remove.mockResolvedValue({ error: null });

    // Act
    const result = await deletePatientDocument(DOCUMENT_ID, PATIENT_ID);

    // Assert
    expect(result).toEqual({ success: true, data: null });

    // Verificar que se buscó la fila correctamente
    expect(mockSupabase.from).toHaveBeenNthCalledWith(1, 'patient_documents');
    expect(mockSelect).toHaveBeenCalledWith('id, file_path');
    expect(mockEqFetch).toHaveBeenCalledWith('id', DOCUMENT_ID);

    // Verificar que se llamó a Storage con el file_path obtenido de la BD
    expect(mockSupabase.storage.from).toHaveBeenCalledWith('patient-attachments');
    expect(mockStorageBucket.remove).toHaveBeenCalledWith([FILE_PATH]);

    // Verificar que se eliminó la fila de BD
    expect(mockSupabase.from).toHaveBeenNthCalledWith(2, 'patient_documents');
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEqDelete).toHaveBeenCalledWith('id', DOCUMENT_ID);

    // Verificar que se invalidó la caché de la ruta del paciente
    expect(revalidatePath).toHaveBeenCalledWith(`/patients/${PATIENT_ID}`);
  });

  // ---------------------------------------------------------------------------
  // 2. Fila inexistente (fetchError o docRow null)
  // ---------------------------------------------------------------------------
  it('2. fila inexistente: devuelve error, NO llama a Storage ni a delete de BD', async () => {
    // Arrange — .single() retorna fetchError (fila no encontrada / sin permiso)
    const mockSingle  = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'No rows found' },
    });
    const mockEqFetch = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect  = vi.fn().mockReturnValue({ eq: mockEqFetch });
    mockSupabase.from.mockReturnValue({ select: mockSelect });

    // Act
    const result = await deletePatientDocument(DOCUMENT_ID, PATIENT_ID);

    // Assert — error esperado
    expect(result).toEqual({
      success: false,
      error: 'El documento no existe o no tienes permiso para eliminarlo.',
    });

    // Storage.remove no debe haber sido invocado
    expect(mockStorageBucket.remove).not.toHaveBeenCalled();

    // Solo UNA llamada a .from() (la del fetch); nunca se llama al delete
    expect(mockSupabase.from).toHaveBeenCalledTimes(1);

    // revalidatePath no debe haber sido invocado
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('2b. fila inexistente (docRow null sin error): misma protección', async () => {
    // Arrange — edge case: error null pero data también null
    const mockSingle  = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockEqFetch = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect  = vi.fn().mockReturnValue({ eq: mockEqFetch });
    mockSupabase.from.mockReturnValue({ select: mockSelect });

    // Act
    const result = await deletePatientDocument(DOCUMENT_ID, PATIENT_ID);

    // Assert
    expect(result).toEqual({
      success: false,
      error: 'El documento no existe o no tienes permiso para eliminarlo.',
    });
    expect(mockStorageBucket.remove).not.toHaveBeenCalled();
    expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // 3. Fallo en Storage.remove
  // ---------------------------------------------------------------------------
  it('3. fallo en Storage: devuelve error con mención al almacenamiento, NO intenta borrar la fila de BD', async () => {
    // Arrange — fetch de fila exitoso
    const mockSingle  = vi.fn().mockResolvedValue({ data: DOC_ROW, error: null });
    const mockEqFetch = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect  = vi.fn().mockReturnValue({ eq: mockEqFetch });
    mockSupabase.from.mockReturnValue({ select: mockSelect });

    // Storage.remove falla
    mockStorageBucket.remove.mockResolvedValue({
      error: { message: 'Object not found' },
    });

    // Act
    const result = await deletePatientDocument(DOCUMENT_ID, PATIENT_ID);

    // Assert — mensaje de error debe mencionar almacenamiento y que la BD no fue modificada
    expect(result).toEqual({
      success: false,
      error: 'No se pudo eliminar el archivo de almacenamiento: Object not found. La fila de base de datos no fue modificada.',
    });

    // Storage.remove sí fue llamado
    expect(mockStorageBucket.remove).toHaveBeenCalledWith([FILE_PATH]);

    // Solo UNA llamada a .from() (la del fetch); el delete nunca se intenta
    expect(mockSupabase.from).toHaveBeenCalledTimes(1);

    // revalidatePath no debe haber sido invocado
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // 4. Storage exitoso pero fallo en delete de BD
  // ---------------------------------------------------------------------------
  it('4. fallo en delete de BD tras Storage exitoso: devuelve error indicando inconsistencia que requiere revisión manual', async () => {
    // Arrange — fetch de fila exitoso
    const mockSingle  = vi.fn().mockResolvedValue({ data: DOC_ROW, error: null });
    const mockEqFetch = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect  = vi.fn().mockReturnValue({ eq: mockEqFetch });

    // delete de BD falla
    const mockEqDelete = vi.fn().mockResolvedValue({
      error: { message: 'permission denied for table patient_documents' },
    });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEqDelete });

    mockSupabase.from
      .mockReturnValueOnce({ select: mockSelect }) // fetch fila
      .mockReturnValueOnce({ delete: mockDelete }); // delete fila

    // Storage.remove exitoso
    mockStorageBucket.remove.mockResolvedValue({ error: null });

    // Act
    const result = await deletePatientDocument(DOCUMENT_ID, PATIENT_ID);

    // Assert — mensaje debe mencionar la inconsistencia y la necesidad de revisión manual
    expect(result).toEqual({
      success: false,
      error: 'El archivo fue eliminado de Storage pero la fila de base de datos no pudo borrarse: permission denied for table patient_documents. Se requiere revisión manual para restaurar la consistencia.',
    });

    // Verificar que Storage.remove SÍ fue llamado (ya borró el archivo)
    expect(mockStorageBucket.remove).toHaveBeenCalledWith([FILE_PATH]);

    // Verificar que se intentó el delete de BD (dos llamadas a .from())
    expect(mockSupabase.from).toHaveBeenCalledTimes(2);
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEqDelete).toHaveBeenCalledWith('id', DOCUMENT_ID);

    // revalidatePath NO debe haberse invocado porque la operación falló
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
