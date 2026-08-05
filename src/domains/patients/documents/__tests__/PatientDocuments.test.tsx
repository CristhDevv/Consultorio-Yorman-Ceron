import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import PatientDocuments from '../components/PatientDocuments';

describe('PatientDocuments Component', () => {
  const mockOnUpload = vi.fn();
  const mockOnGetSignedUrl = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnGetDeletedDocuments = vi.fn();
  const mockOnRestore = vi.fn();

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
        onGetDeletedDocuments={mockOnGetDeletedDocuments}
        onRestore={mockOnRestore}
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
        onGetDeletedDocuments={mockOnGetDeletedDocuments}
        onRestore={mockOnRestore}
      />
    );

    const deleteBtn = screen.getByRole('button', { name: /Eliminar/i });
    expect(deleteBtn).toBeInTheDocument();

    // Click delete button
    fireEvent.click(deleteBtn);

    // Confirmation dialog should be opened
    expect(screen.getByText('Confirmar Eliminación')).toBeInTheDocument();
    expect(
      screen.getByText('El documento dejará de estar disponible en el sistema de forma permanente.')
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
        onGetDeletedDocuments={mockOnGetDeletedDocuments}
        onRestore={mockOnRestore}
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
        onGetDeletedDocuments={mockOnGetDeletedDocuments}
        onRestore={mockOnRestore}
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
        onGetDeletedDocuments={mockOnGetDeletedDocuments}
        onRestore={mockOnRestore}
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

  // ═══════════════════════════════════════════════════════════════════════════
  // Nuevos tests para la funcionalidad de Papelera y Restaurar (8 tests)
  // ═══════════════════════════════════════════════════════════════════════════

  it('6. should render the Papelera button if canDelete is true', () => {
    render(
      <PatientDocuments
        patientId="patient-1"
        initialDocuments={initialDocuments}
        canDelete={true}
        onUpload={mockOnUpload}
        onGetSignedUrl={mockOnGetSignedUrl}
        onDelete={mockOnDelete}
        onGetDeletedDocuments={mockOnGetDeletedDocuments}
        onRestore={mockOnRestore}
      />
    );

    expect(screen.getByRole('button', { name: /Papelera/i })).toBeInTheDocument();
  });

  it('7. clicking Papelera button should open the dialog and trigger onGetDeletedDocuments with patientId', async () => {
    mockOnGetDeletedDocuments.mockResolvedValue({ success: true, data: [] });

    render(
      <PatientDocuments
        patientId="patient-1"
        initialDocuments={initialDocuments}
        canDelete={true}
        onUpload={mockOnUpload}
        onGetSignedUrl={mockOnGetSignedUrl}
        onDelete={mockOnDelete}
        onGetDeletedDocuments={mockOnGetDeletedDocuments}
        onRestore={mockOnRestore}
      />
    );

    const trashBtn = screen.getByRole('button', { name: /Papelera/i });
    fireEvent.click(trashBtn);

    expect(screen.getByText('Documentos Eliminados')).toBeInTheDocument();
    expect(mockOnGetDeletedDocuments).toHaveBeenCalledWith('patient-1');

    await waitFor(() => {
      expect(screen.queryByText('Cargando papelera…')).not.toBeInTheDocument();
    });
  });

  it('8. should display loading message while fetching deleted documents', async () => {
    // Retorna una promesa pendiente para evaluar el estado loading
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let resolvePromise: any;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockOnGetDeletedDocuments.mockReturnValue(pendingPromise);

    render(
      <PatientDocuments
        patientId="patient-1"
        initialDocuments={initialDocuments}
        canDelete={true}
        onUpload={mockOnUpload}
        onGetSignedUrl={mockOnGetSignedUrl}
        onDelete={mockOnDelete}
        onGetDeletedDocuments={mockOnGetDeletedDocuments}
        onRestore={mockOnRestore}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Papelera/i }));
    expect(screen.getByText('Cargando papelera…')).toBeInTheDocument();

    // Limpieza
    await act(async () => {
      resolvePromise({ success: true, data: [] });
    });

    await waitFor(() => {
      expect(screen.queryByText('Cargando papelera…')).not.toBeInTheDocument();
    });
  });

  it('9. should display error message if fetching deleted documents fails', async () => {
    mockOnGetDeletedDocuments.mockResolvedValue({ success: false, error: 'Fallo al conectar con el servidor' });

    render(
      <PatientDocuments
        patientId="patient-1"
        initialDocuments={initialDocuments}
        canDelete={true}
        onUpload={mockOnUpload}
        onGetSignedUrl={mockOnGetSignedUrl}
        onDelete={mockOnDelete}
        onGetDeletedDocuments={mockOnGetDeletedDocuments}
        onRestore={mockOnRestore}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Papelera/i }));

    expect(await screen.findByText(/Fallo al conectar con el servidor/i)).toBeInTheDocument();
  });

  it('10. should show empty state message if no deleted documents are returned', async () => {
    mockOnGetDeletedDocuments.mockResolvedValue({ success: true, data: [] });

    render(
      <PatientDocuments
        patientId="patient-1"
        initialDocuments={initialDocuments}
        canDelete={true}
        onUpload={mockOnUpload}
        onGetSignedUrl={mockOnGetSignedUrl}
        onDelete={mockOnDelete}
        onGetDeletedDocuments={mockOnGetDeletedDocuments}
        onRestore={mockOnRestore}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Papelera/i }));

    expect(await screen.findByText('No hay documentos en la papelera.')).toBeInTheDocument();
  });

  it('11. should render deleted documents list when fetched successfully', async () => {
    const deletedDocs = [
      {
        id: 'del-1',
        document_type: 'Radiografía',
        file_name: 'rx_borrada.png',
        file_path: 'patient-1/rx_borrada.png',
        created_at: '2026-07-26T12:00:00Z',
        deleted_at: '2026-08-01T12:00:00Z',
        deleted_by: 'admin-1',
        deleted_by_name: 'Dr. Administrador',
      },
    ];
    mockOnGetDeletedDocuments.mockResolvedValue({ success: true, data: deletedDocs });

    render(
      <PatientDocuments
        patientId="patient-1"
        initialDocuments={initialDocuments}
        canDelete={true}
        onUpload={mockOnUpload}
        onGetSignedUrl={mockOnGetSignedUrl}
        onDelete={mockOnDelete}
        onGetDeletedDocuments={mockOnGetDeletedDocuments}
        onRestore={mockOnRestore}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Papelera/i }));

    expect(await screen.findByText('rx_borrada.png')).toBeInTheDocument();
    expect(screen.getAllByText('Radiografía')[0]).toBeInTheDocument();
    expect(screen.getByText(/por Dr. Administrador/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Restaurar' })).toBeInTheDocument();
  });

  it('12. should handle successful restore and remove document from list', async () => {
    const deletedDocs = [
      {
        id: 'del-1',
        document_type: 'Radiografía',
        file_name: 'rx_borrada.png',
        file_path: 'patient-1/rx_borrada.png',
        created_at: '2026-07-26T12:00:00Z',
        deleted_at: '2026-08-01T12:00:00Z',
        deleted_by: 'admin-1',
        deleted_by_name: 'Dr. Administrador',
      },
    ];
    mockOnGetDeletedDocuments.mockResolvedValue({ success: true, data: deletedDocs });
    mockOnRestore.mockResolvedValue({ success: true, data: null });

    render(
      <PatientDocuments
        patientId="patient-1"
        initialDocuments={initialDocuments}
        canDelete={true}
        onUpload={mockOnUpload}
        onGetSignedUrl={mockOnGetSignedUrl}
        onDelete={mockOnDelete}
        onGetDeletedDocuments={mockOnGetDeletedDocuments}
        onRestore={mockOnRestore}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Papelera/i }));

    const restoreBtn = await screen.findByRole('button', { name: 'Restaurar' });
    fireEvent.click(restoreBtn);

    await waitFor(() => {
      expect(mockOnRestore).toHaveBeenCalledWith('del-1');
    });

    await waitFor(() => {
      expect(screen.queryByText('rx_borrada.png')).not.toBeInTheDocument();
    });
  });

  it('13. should display error message next to the document if restoring fails', async () => {
    const deletedDocs = [
      {
        id: 'del-1',
        document_type: 'Radiografía',
        file_name: 'rx_borrada.png',
        file_path: 'patient-1/rx_borrada.png',
        created_at: '2026-07-26T12:00:00Z',
        deleted_at: '2026-08-01T12:00:00Z',
        deleted_by: 'admin-1',
        deleted_by_name: 'Dr. Administrador',
      },
    ];
    mockOnGetDeletedDocuments.mockResolvedValue({ success: true, data: deletedDocs });
    mockOnRestore.mockResolvedValue({ success: false, error: 'Error al restaurar archivo' });

    render(
      <PatientDocuments
        patientId="patient-1"
        initialDocuments={initialDocuments}
        canDelete={true}
        onUpload={mockOnUpload}
        onGetSignedUrl={mockOnGetSignedUrl}
        onDelete={mockOnDelete}
        onGetDeletedDocuments={mockOnGetDeletedDocuments}
        onRestore={mockOnRestore}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Papelera/i }));

    const restoreBtn = await screen.findByRole('button', { name: 'Restaurar' });
    fireEvent.click(restoreBtn);

    await waitFor(() => {
      expect(mockOnRestore).toHaveBeenCalledWith('del-1');
    });

    expect(await screen.findByText('Error al restaurar archivo')).toBeInTheDocument();
    expect(screen.getByText('rx_borrada.png')).toBeInTheDocument(); // Sigue en la lista
  });
});
