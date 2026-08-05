import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import TrashDashboard from '../TrashDashboard';

describe('TrashDashboard Component', () => {
  const mockOnRestore = vi.fn();

  const initialDocuments = [
    {
      id: 'doc-1',
      document_type: 'Radiografía',
      file_name: 'rx_paciente1.png',
      file_path: 'patient-1/rx_paciente1.png',
      uploaded_by: 'admin-1',
      created_at: '2026-08-05T12:00:00Z',
      bucket_id: 'patient-attachments',
      deleted_at: '2026-08-05T12:30:00Z',
      deleted_by: 'admin-1',
      deleted_by_name: 'Dr. Yorman Cerón',
      patient_id: 'patient-1',
      patient_name: 'Juan Pérez',
    },
    {
      id: 'doc-2',
      document_type: 'Consentimiento',
      file_name: 'consent_paciente2.pdf',
      file_path: 'patient-2/consent_paciente2.pdf',
      uploaded_by: 'admin-1',
      created_at: '2026-08-05T12:00:00Z',
      bucket_id: 'patient-attachments',
      deleted_at: '2026-08-05T12:40:00Z',
      deleted_by: 'admin-1',
      deleted_by_name: 'Dr. Yorman Cerón',
      patient_id: 'patient-2',
      patient_name: 'María Gómez',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. should show empty state when no deleted documents are provided', () => {
    render(<TrashDashboard initialDocuments={[]} onRestore={mockOnRestore} />);
    expect(
      screen.getByText('No se encontraron documentos eliminados que coincidan con los filtros de búsqueda.')
    ).toBeInTheDocument();
  });

  it('2. should render list of deleted documents with correct columns', () => {
    render(<TrashDashboard initialDocuments={initialDocuments} onRestore={mockOnRestore} />);

    expect(screen.getByText('rx_paciente1.png')).toBeInTheDocument();
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    expect(screen.getByText('Radiografía')).toBeInTheDocument();

    expect(screen.getByText('consent_paciente2.pdf')).toBeInTheDocument();
    expect(screen.getByText('María Gómez')).toBeInTheDocument();
    expect(screen.getByText('Consentimiento')).toBeInTheDocument();
  });

  it('3. should filter list reactively by patient name input', () => {
    render(<TrashDashboard initialDocuments={initialDocuments} onRestore={mockOnRestore} />);

    const patientInput = screen.getByLabelText(/Filtrar por Paciente/i);
    fireEvent.change(patientInput, { target: { value: 'María' } });

    expect(screen.queryByText('rx_paciente1.png')).not.toBeInTheDocument();
    expect(screen.getByText('consent_paciente2.pdf')).toBeInTheDocument();
  });

  it('4. should filter list reactively by file name input', () => {
    render(<TrashDashboard initialDocuments={initialDocuments} onRestore={mockOnRestore} />);

    const docInput = screen.getByLabelText(/Filtrar por Archivo/i);
    fireEvent.change(docInput, { target: { value: 'consent' } });

    expect(screen.queryByText('rx_paciente1.png')).not.toBeInTheDocument();
    expect(screen.getByText('consent_paciente2.pdf')).toBeInTheDocument();
  });

  it('5. clicking Restore should trigger onRestore and remove document from list', async () => {
    mockOnRestore.mockResolvedValue({ success: true, data: null });

    render(<TrashDashboard initialDocuments={initialDocuments} onRestore={mockOnRestore} />);

    const restoreButtons = screen.getAllByRole('button', { name: /Restaurar/i });
    fireEvent.click(restoreButtons[0]);

    await waitFor(() => {
      expect(mockOnRestore).toHaveBeenCalledWith('doc-1', 'patient-1');
    });

    await waitFor(() => {
      expect(screen.queryByText('rx_paciente1.png')).not.toBeInTheDocument();
    });

    expect(await screen.findByText(/Documento "rx_paciente1.png" restaurado exitosamente/i)).toBeInTheDocument();
  });
});
