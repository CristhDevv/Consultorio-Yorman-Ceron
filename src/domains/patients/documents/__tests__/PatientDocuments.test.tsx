import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import PatientDocuments from '../components/PatientDocuments';

describe('PatientDocuments Component', () => {
  const mockOnUpload = vi.fn();
  const mockOnGetSignedUrl = vi.fn();
  const mockOnDelete = vi.fn();

  const initialDocuments = [
    {
      id: 'doc-1',
      document_type: 'Radiografía',
      file_name: 'radiografia.png',
      file_path: 'patient-1/radiografia.png',
      created_at: '2026-07-26T12:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. should not show delete button if canDelete is false', () => {
    render(
      <PatientDocuments
        patientId="patient-1"
        initialDocuments={initialDocuments}
        canDelete={false}
        onUpload={mockOnUpload}
        onGetSignedUrl={mockOnGetSignedUrl}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.queryByRole('button', { name: /Eliminar/i })).not.toBeInTheDocument();
  });

  it('2. should show delete button if canDelete is true, and clicking it opens the confirmation dialog', async () => {
    render(
      <PatientDocuments
        patientId="patient-1"
        initialDocuments={initialDocuments}
        canDelete={true}
        onUpload={mockOnUpload}
        onGetSignedUrl={mockOnGetSignedUrl}
        onDelete={mockOnDelete}
      />
    );

    const deleteBtn = screen.getByRole('button', { name: /Eliminar/i });
    expect(deleteBtn).toBeInTheDocument();

    // Click delete button
    fireEvent.click(deleteBtn);

    // Confirmation dialog should be opened
    expect(screen.getByText('Confirmar Eliminación')).toBeInTheDocument();
    expect(
      screen.getByText('¿Está seguro de que desea eliminar este documento? Esta acción no se puede deshacer.')
    ).toBeInTheDocument();
  });

  it('3. clicking Cancelar in dialog should close the dialog and NOT execute deletion', async () => {
    render(
      <PatientDocuments
        patientId="patient-1"
        initialDocuments={initialDocuments}
        canDelete={true}
        onUpload={mockOnUpload}
        onGetSignedUrl={mockOnGetSignedUrl}
        onDelete={mockOnDelete}
      />
    );

    // Open dialog
    fireEvent.click(screen.getByRole('button', { name: /Eliminar/i }));
    expect(screen.getByText('Confirmar Eliminación')).toBeInTheDocument();

    // Click Cancelar
    const cancelBtn = screen.getByRole('button', { name: /Cancelar/i });
    fireEvent.click(cancelBtn);

    // Dialog should close
    await waitFor(() => {
      expect(screen.queryByText('Confirmar Eliminación')).not.toBeInTheDocument();
    });

    expect(mockOnDelete).not.toHaveBeenCalled();
  });

  it('4. clicking Confirmar/Eliminar in dialog should call onDelete and handle success', async () => {
    mockOnDelete.mockResolvedValue({ success: true, data: null });

    render(
      <PatientDocuments
        patientId="patient-1"
        initialDocuments={initialDocuments}
        canDelete={true}
        onUpload={mockOnUpload}
        onGetSignedUrl={mockOnGetSignedUrl}
        onDelete={mockOnDelete}
      />
    );

    // Open dialog
    fireEvent.click(screen.getByRole('button', { name: /Eliminar/i }));

    // Click confirm/delete button in dialog
    const confirmBtn = screen.getByRole('button', { name: 'Eliminar', id: 'btn-confirmar-eliminacion' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockOnDelete).toHaveBeenCalledWith('doc-1');
    });

    // Dialog should close
    await waitFor(() => {
      expect(screen.queryByText('Confirmar Eliminación')).not.toBeInTheDocument();
    });
  });

  it('5. clicking Confirmar/Eliminar in dialog should call onDelete and show error message if it fails', async () => {
    mockOnDelete.mockResolvedValue({ success: false, error: 'No se pudo eliminar el archivo' });

    render(
      <PatientDocuments
        patientId="patient-1"
        initialDocuments={initialDocuments}
        canDelete={true}
        onUpload={mockOnUpload}
        onGetSignedUrl={mockOnGetSignedUrl}
        onDelete={mockOnDelete}
      />
    );

    // Open dialog
    fireEvent.click(screen.getByRole('button', { name: /Eliminar/i }));

    // Click confirm/delete button in dialog
    const confirmBtn = screen.getByRole('button', { name: 'Eliminar', id: 'btn-confirmar-eliminacion' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockOnDelete).toHaveBeenCalledWith('doc-1');
    });

    // Error message should be rendered under document info
    expect(await screen.findByText('No se pudo eliminar el archivo')).toBeInTheDocument();
  });
});
