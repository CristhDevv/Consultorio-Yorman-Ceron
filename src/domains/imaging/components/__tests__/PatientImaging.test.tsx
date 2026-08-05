import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import PatientImaging from '../PatientImaging';
import type { PatientImageWithUrl } from '../../types';

describe('PatientImaging Component', () => {
  const mockOnUpload = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnGetDeletedImages = vi.fn();
  const mockOnRestore = vi.fn();

  const initialImages: PatientImageWithUrl[] = [
    {
      id: 'img-1',
      patient_id: 'patient-1',
      image_type: 'panoramica',
      description: 'Radiografía panorámica inicial',
      file_path: 'patient-1/xray1.png',
      file_name: 'xray1.png',
      uploaded_by: 'admin-1',
      created_at: '2026-08-05T12:00:00Z',
      bucket_id: 'patient-images',
      deleted_at: null,
      deleted_by: null,
      signed_url: 'http://signed-url-xray1',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. should show empty state when no images are provided', () => {
    render(
      <PatientImaging
        patientId="patient-1"
        initialImages={[]}
        canDelete={false}
        onUpload={mockOnUpload}
        onDelete={mockOnDelete}
        onGetDeletedImages={mockOnGetDeletedImages}
        onRestore={mockOnRestore}
      />
    );

    expect(screen.getByText('No hay imágenes ni radiografías cargadas para este paciente.')).toBeInTheDocument();
  });

  it('2. should render list of images with badges and descriptions', () => {
    render(
      <PatientImaging
        patientId="patient-1"
        initialImages={initialImages}
        canDelete={false}
        onUpload={mockOnUpload}
        onDelete={mockOnDelete}
        onGetDeletedImages={mockOnGetDeletedImages}
        onRestore={mockOnRestore}
      />
    );

    expect(screen.getByText('xray1.png')).toBeInTheDocument();
    expect(screen.getAllByText('Panorámica')[0]).toBeInTheDocument();
    expect(screen.getByText('“Radiografía panorámica inicial”')).toBeInTheDocument();
  });

  it('3. should not show delete button if canDelete is false', () => {
    render(
      <PatientImaging
        patientId="patient-1"
        initialImages={initialImages}
        canDelete={false}
        onUpload={mockOnUpload}
        onDelete={mockOnDelete}
        onGetDeletedImages={mockOnGetDeletedImages}
        onRestore={mockOnRestore}
      />
    );

    expect(screen.queryByRole('button', { name: /Eliminar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Papelera/i })).not.toBeInTheDocument();
  });

  it('4. should show delete button if canDelete is true, and clicking it opens the confirmation dialog', () => {
    render(
      <PatientImaging
        patientId="patient-1"
        initialImages={initialImages}
        canDelete={true}
        onUpload={mockOnUpload}
        onDelete={mockOnDelete}
        onGetDeletedImages={mockOnGetDeletedImages}
        onRestore={mockOnRestore}
      />
    );

    const deleteBtn = screen.getByRole('button', { name: /Eliminar/i });
    expect(deleteBtn).toBeInTheDocument();

    fireEvent.click(deleteBtn);

    expect(screen.getByText('Confirmar Eliminación')).toBeInTheDocument();
    expect(
      screen.getByText('La imagen clínica se marcará como eliminada y dejará de estar disponible en el expediente clínico activo.')
    ).toBeInTheDocument();
  });

  it('5. clicking Confirmar/Eliminar in dialog should call onDelete', async () => {
    mockOnDelete.mockResolvedValue({ success: true, data: null });

    render(
      <PatientImaging
        patientId="patient-1"
        initialImages={initialImages}
        canDelete={true}
        onUpload={mockOnUpload}
        onDelete={mockOnDelete}
        onGetDeletedImages={mockOnGetDeletedImages}
        onRestore={mockOnRestore}
      />
    );

    // Open confirmation dialog
    fireEvent.click(screen.getByRole('button', { name: /Eliminar/i }));

    // Click confirm/delete button in dialog
    const confirmBtn = screen.getByRole('button', { name: 'Eliminar', id: 'btn-confirmar-eliminacion-imagen' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockOnDelete).toHaveBeenCalledWith('img-1');
    });

    // Dialog should close
    await waitFor(() => {
      expect(screen.queryByText('Confirmar Eliminación')).not.toBeInTheDocument();
    });
  });

  it('6. clicking Papelera button should open the dialog and trigger onGetDeletedImages', async () => {
    mockOnGetDeletedImages.mockResolvedValue({ success: true, data: [] });

    render(
      <PatientImaging
        patientId="patient-1"
        initialImages={initialImages}
        canDelete={true}
        onUpload={mockOnUpload}
        onDelete={mockOnDelete}
        onGetDeletedImages={mockOnGetDeletedImages}
        onRestore={mockOnRestore}
      />
    );

    const trashBtn = screen.getByRole('button', { name: /Papelera/i });
    fireEvent.click(trashBtn);

    expect(screen.getByText('Imágenes Eliminadas')).toBeInTheDocument();
    expect(mockOnGetDeletedImages).toHaveBeenCalledWith('patient-1');

    await waitFor(() => {
      expect(screen.queryByText('Cargando papelera…')).not.toBeInTheDocument();
    });
  });

  it('7. should handle successful restore and remove restored image from list', async () => {
    const deletedDocs = [
      {
        id: 'del-img-1',
        patient_id: 'patient-1',
        image_type: 'panoramica' as const,
        description: 'Deleted Radiografía',
        file_path: 'patient-1/rx_borrada.png',
        file_name: 'rx_borrada.png',
        uploaded_by: 'admin-1',
        created_at: '2026-07-26T12:00:00Z',
        bucket_id: 'patient-images',
        deleted_at: '2026-08-01T12:00:00Z',
        deleted_by: 'admin-1',
        deleted_by_name: 'Dr. Administrador',
      },
    ];
    mockOnGetDeletedImages.mockResolvedValue({ success: true, data: deletedDocs });
    mockOnRestore.mockResolvedValue({ success: true, data: null });

    render(
      <PatientImaging
        patientId="patient-1"
        initialImages={initialImages}
        canDelete={true}
        onUpload={mockOnUpload}
        onDelete={mockOnDelete}
        onGetDeletedImages={mockOnGetDeletedImages}
        onRestore={mockOnRestore}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Papelera/i }));

    const restoreBtn = await screen.findByRole('button', { name: 'Restaurar' });
    fireEvent.click(restoreBtn);

    await waitFor(() => {
      expect(mockOnRestore).toHaveBeenCalledWith('del-img-1');
    });

    await waitFor(() => {
      expect(screen.queryByText('rx_borrada.png')).not.toBeInTheDocument();
    });
  });
});
