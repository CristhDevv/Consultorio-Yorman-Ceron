import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  uploadPatientImage,
  getPatientImages,
  deletePatientImage,
  getDeletedPatientImages,
  restorePatientImage,
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
  storage: { from: ReturnType<typeof vi.fn> };
}

const IMAGE_ID = 'img-uuid-123';
const PATIENT_ID = 'patient-uuid-456';
const AUTHENTICATED_USER = { id: 'user-admin-001' };

describe('Imaging Actions', () => {
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

  describe('uploadPatientImage', () => {
    it('should fail if session is missing', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
      const formData = new FormData();
      const result = await uploadPatientImage(formData);
      expect(result.success).toBe(false);
      expect(result.error).toContain('inicia sesión');
    });

    it('should fail if required fields are missing', async () => {
      const formData = new FormData();
      const result = await uploadPatientImage(formData);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Faltan campos');
    });

    it('should reject blocked file extensions', async () => {
      const formData = new FormData();
      formData.set('patient_id', PATIENT_ID);
      formData.set('image_type', 'panoramica');
      const file = new File(['code'], 'malicious.exe', { type: 'application/x-msdownload' });
      formData.set('file', file);

      const result = await uploadPatientImage(formData);
      expect(result.success).toBe(false);
      expect(result.error).toContain('no está permitido');
    });

    it('should reject files exceeding 5MB', async () => {
      const formData = new FormData();
      formData.set('patient_id', PATIENT_ID);
      formData.set('image_type', 'panoramica');
      
      const hugeBuffer = new Uint8Array(6 * 1024 * 1024);
      const file = new File([hugeBuffer], 'huge_xray.png', { type: 'image/png' });
      formData.set('file', file);

      const result = await uploadPatientImage(formData);
      expect(result.success).toBe(false);
      expect(result.error).toContain('5 MB');
    });

    it('should upload successfully and insert row in database', async () => {
      const formData = new FormData();
      formData.set('patient_id', PATIENT_ID);
      formData.set('image_type', 'panoramica');
      formData.set('description', 'Radiografía lateral');
      const file = new File(['imagecontent'], 'xray.png', { type: 'image/png' });
      formData.set('file', file);

      // Storage mock
      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.storage.from.mockReturnValue({ upload: mockUpload });

      // Database mock
      const mockSingle = vi.fn().mockResolvedValue({ data: { id: IMAGE_ID, file_path: 'path/to/img' }, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      mockSupabase.from.mockReturnValue({ insert: mockInsert });

      const result = await uploadPatientImage(formData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: IMAGE_ID, file_path: 'path/to/img' });
      expect(mockUpload).toHaveBeenCalled();
      expect(mockInsert).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith(`/patients/${PATIENT_ID}`);
    });

    it('should delete uploaded storage file if DB insert fails', async () => {
      const formData = new FormData();
      formData.set('patient_id', PATIENT_ID);
      formData.set('image_type', 'panoramica');
      const file = new File(['imagecontent'], 'xray.png', { type: 'image/png' });
      formData.set('file', file);

      // Storage mock
      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      const mockRemove = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.storage.from.mockReturnValue({ upload: mockUpload, remove: mockRemove });

      // Database mock insert fails
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'DB Error' } });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      mockSupabase.from.mockReturnValue({ insert: mockInsert });

      const result = await uploadPatientImage(formData);
      expect(result.success).toBe(false);
      expect(result.error).toContain('DB Error');
      expect(mockRemove).toHaveBeenCalled();
    });
  });

  describe('getPatientImages', () => {
    it('should return mapped images with signed URLs', async () => {
      const imageRows = [
        {
          id: IMAGE_ID,
          patient_id: PATIENT_ID,
          image_type: 'panoramica',
          description: 'Panorámica 1',
          file_path: 'path/to/img1.png',
          file_name: 'img1.png',
          uploaded_by: 'admin-1',
          created_at: '2026-08-05T12:00:00Z',
          bucket_id: 'patient-images',
          deleted_at: null,
          deleted_by: null,
        },
      ];

      // Database query mock
      const mockOrder = vi.fn().mockResolvedValue({ data: imageRows, error: null });
      const mockIs = vi.fn().mockReturnValue({ order: mockOrder });
      const mockEq = vi.fn().mockReturnValue({ is: mockIs });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      // Storage signed URLs mock
      const mockSignedUrls = vi.fn().mockResolvedValue({ data: [{ path: 'path/to/img1.png', signedUrl: 'http://signed-url-1' }], error: null });
      mockSupabase.storage.from.mockReturnValue({ createSignedUrls: mockSignedUrls });

      const result = await getPatientImages(PATIENT_ID);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0]).toEqual({
        ...imageRows[0],
        signed_url: 'http://signed-url-1',
      });
    });
  });

  describe('deletePatientImage', () => {
    it('should reject non-admin users', async () => {
      // Mock user is odontologo
      mockSupabase.from.mockReturnValue({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: { role: 'odontologo' }, error: null }),
          }),
        }),
      });

      const result = await deletePatientImage(IMAGE_ID, PATIENT_ID);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Solo los administradores');
    });

    it('should soft delete image record if user is admin', async () => {
      // Profiles check
      const mockSingleProfile = vi.fn().mockResolvedValue({ data: { role: 'administrador' }, error: null });
      const mockEqProfile = vi.fn().mockReturnValue({ single: mockSingleProfile });
      const mockSelectProfile = vi.fn().mockReturnValue({ eq: mockEqProfile });

      // Image row check
      const mockSingleImg = vi.fn().mockResolvedValue({ data: { id: IMAGE_ID }, error: null });
      const mockIsImg = vi.fn().mockReturnValue({ single: mockSingleImg });
      const mockEqImg = vi.fn().mockReturnValue({ is: mockIsImg });
      const mockSelectImg = vi.fn().mockReturnValue({ eq: mockEqImg });

      // Image update mock
      const mockEqUpdate = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqUpdate });

      mockSupabase.from.mockImplementation((tableName) => {
        if (tableName === 'profiles') {
          return { select: mockSelectProfile };
        }
        if (tableName === 'patient_images') {
          return { select: mockSelectImg, update: mockUpdate };
        }
        return {};
      });

      const result = await deletePatientImage(IMAGE_ID, PATIENT_ID);
      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith(`/patients/${PATIENT_ID}`);
    });
  });

  describe('getDeletedPatientImages', () => {
    it('should return deleted images with deleted_by_name resolved', async () => {
      const deletedRows = [
        {
          id: IMAGE_ID,
          patient_id: PATIENT_ID,
          image_type: 'panoramica',
          description: 'Deleted Radiografía',
          file_path: 'path/to/img1.png',
          file_name: 'img1.png',
          uploaded_by: 'admin-1',
          created_at: '2026-08-05T12:00:00Z',
          bucket_id: 'patient-images',
          deleted_at: '2026-08-05T12:30:00Z',
          deleted_by: 'admin-1',
        },
      ];

      // Profiles select mock
      const mockProfilesIn = vi.fn().mockResolvedValue({ data: [{ id: 'admin-1', full_name: 'Dr. Yorman Cerón' }], error: null });

      // patient_images select mock
      const mockOrder = vi.fn().mockResolvedValue({ data: deletedRows, error: null });
      const mockNot = vi.fn().mockReturnValue({ order: mockOrder });
      const mockEq = vi.fn().mockReturnValue({ not: mockNot });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      mockSupabase.from.mockImplementation((tableName) => {
        if (tableName === 'profiles') {
          // Both permission check and profile resolver query this
          return {
            select: (query: string) => {
              if (query === 'role') {
                return { eq: () => ({ single: () => Promise.resolve({ data: { role: 'administrador' }, error: null }) }) };
              }
              return { in: mockProfilesIn };
            }
          };
        }
        if (tableName === 'patient_images') {
          return { select: mockSelect };
        }
        return {};
      });

      const result = await getDeletedPatientImages(PATIENT_ID);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].deleted_by_name).toBe('Dr. Yorman Cerón');
    });
  });

  describe('restorePatientImage', () => {
    it('should restore deleted image', async () => {
      // Permission check mock
      const mockSingleProfile = vi.fn().mockResolvedValue({ data: { role: 'administrador' }, error: null });
      const mockEqProfile = vi.fn().mockReturnValue({ single: mockSingleProfile });
      const mockSelectProfile = vi.fn().mockReturnValue({ eq: mockEqProfile });

      // Image row check mock
      const mockSingleImg = vi.fn().mockResolvedValue({ data: { id: IMAGE_ID }, error: null });
      const mockNotImg = vi.fn().mockReturnValue({ single: mockSingleImg });
      const mockEqImg = vi.fn().mockReturnValue({ not: mockNotImg });
      const mockSelectImg = vi.fn().mockReturnValue({ eq: mockEqImg });

      // Image restore update mock
      const mockEqUpdate = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqUpdate });

      mockSupabase.from.mockImplementation((tableName) => {
        if (tableName === 'profiles') {
          return { select: mockSelectProfile };
        }
        if (tableName === 'patient_images') {
          return { select: mockSelectImg, update: mockUpdate };
        }
        return {};
      });

      const result = await restorePatientImage(IMAGE_ID, PATIENT_ID);
      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith({ deleted_at: null, deleted_by: null });
      expect(revalidatePath).toHaveBeenCalledWith(`/patients/${PATIENT_ID}`);
    });
  });
});
